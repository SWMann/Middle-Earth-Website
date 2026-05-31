package org.middleearth.anduril;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.javalin.Javalin;
import io.javalin.http.BadRequestResponse;
import io.javalin.http.NotFoundResponse;
import io.javalin.http.UnauthorizedResponse;
import net.minecraft.SharedConstants;
import net.minecraft.server.MinecraftServer;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Embedded HTTP API for the Andúril bridge mod.
 *
 * <p>Lifecycle is owned by {@link AndurilServer}: start on
 * SERVER_STARTING, stop on SERVER_STOPPING. The HTTP server runs on its
 * own thread pool (Jetty under the hood) so the Minecraft main thread is
 * never blocked by inbound requests.
 *
 * <p>Port: read from the {@code ANDURIL_PORT} environment variable;
 * defaults to {@value #DEFAULT_PORT}. Bind to {@code 0.0.0.0} so the
 * website on Vercel can reach us; production deployments should
 * additionally firewall the port to known callers.
 *
 * <p>Auth: every {@code /api/v1/*} endpoint except {@code /api/v1/health}
 * requires the {@code X-Mod-Token} header. The expected value is read
 * from the {@code ANDURIL_TOKEN} env at startup; if unset, the gate
 * fails closed (all protected endpoints return 401). Comparison is
 * constant-time to avoid timing-based token leaks.
 */
public class HttpApi {
    public static final int DEFAULT_PORT = 8080;
    public static final String PORT_ENV = "ANDURIL_PORT";
    public static final String TOKEN_ENV = "ANDURIL_TOKEN";

    /** Flat-cost recruitment model for Phase 4. Move to per-unit-type later. */
    private static final int COIN_PER_UNIT = 10;

    /** Per mechanics_spec.md §6.4 — flat 240 DP per claim, regardless of value. */
    private static final int DP_PER_REGION_CLAIM = 240;

    private static final ObjectMapper JSON = new ObjectMapper();

    private final MinecraftServer server;
    private final Database database;
    private final byte[] expectedToken; // empty array if not configured
    private final boolean tokenConfigured;
    private Javalin app;

    public HttpApi(MinecraftServer server, Database database) {
        this.server = server;
        this.database = database;
        String fromEnv = System.getenv(TOKEN_ENV);
        if (fromEnv == null || fromEnv.isBlank()) {
            this.expectedToken = new byte[0];
            this.tokenConfigured = false;
        } else {
            this.expectedToken = fromEnv.trim().getBytes(StandardCharsets.UTF_8);
            this.tokenConfigured = true;
        }
    }

    public void start() {
        int port = resolvePort();
        app = Javalin.create(config -> {
            // Silence Javalin's default startup banner — we log our own.
            config.showJavalinBanner = false;
        });

        registerAuthGate(app);
        registerRoutes(app);

        app.start("0.0.0.0", port);
        Anduril.LOGGER.info("Andúril HTTP API listening on 0.0.0.0:{}", port);
        if (!tokenConfigured) {
            Anduril.LOGGER.warn(
                "{} is not set — all protected endpoints will return 401. " +
                "Set it before any non-health endpoint can be reached.",
                TOKEN_ENV
            );
        }
    }

    public void stop() {
        if (app != null) {
            app.stop();
            Anduril.LOGGER.info("Andúril HTTP API stopped.");
        }
    }

    /**
     * Reject any /api/v1/* request without a matching X-Mod-Token, except
     * /api/v1/health which is intentionally open for liveness probes.
     */
    private void registerAuthGate(Javalin app) {
        app.before("/api/v1/*", ctx -> {
            if ("/api/v1/health".equals(ctx.path())) return;
            if (!tokenConfigured) {
                throw new UnauthorizedResponse("ANDURIL_TOKEN not configured");
            }
            String header = ctx.header("X-Mod-Token");
            if (header == null || header.isEmpty()) {
                throw new UnauthorizedResponse("Missing X-Mod-Token header");
            }
            byte[] presented = header.getBytes(StandardCharsets.UTF_8);
            if (!MessageDigest.isEqual(presented, expectedToken)) {
                throw new UnauthorizedResponse("Invalid X-Mod-Token");
            }
        });
    }

    private void registerRoutes(Javalin app) {
        // Open: liveness / readiness check.
        app.get("/api/v1/health", ctx -> {
            String mcVersion = SharedConstants.getGameVersion().getName();
            int playerCount = server.getCurrentPlayerCount();
            int maxPlayers = server.getMaxPlayerCount();
            String body = String.format(
                "{\"status\":\"ok\",\"mc_version\":\"%s\",\"players\":{\"online\":%d,\"max\":%d}}",
                escape(mcVersion), playerCount, maxPlayers
            );
            ctx.contentType("application/json").result(body);
        });

        // Protected: bridge metadata for ops + sanity-checking the auth gate.
        app.get("/api/v1/admin/info", ctx -> {
            String body = String.format(
                "{\"mod\":\"anduril\",\"version\":\"%s\",\"mc_version\":\"%s\",\"auth\":\"ok\"}",
                escape(Anduril.MOD_VERSION),
                escape(SharedConstants.getGameVersion().getName())
            );
            ctx.contentType("application/json").result(body);
        });

        // Protected: admin grant of coin or DP to a faction. The first
        // real mutating endpoint — every later write follows this shape:
        //   1. Parse + validate (auth gate already cleared by .before)
        //   2. Open a DB transaction
        //   3. UPDATE game.* + INSERT audit.events in the same tx
        //   4. Commit, return the new state
        app.post("/api/v1/admin/factions/{id}/grant", ctx -> {
            String factionId = ctx.pathParam("id");
            GrantRequest req = ctx.bodyAsClass(GrantRequest.class);
            validateGrant(req);

            try (Connection conn = database.getConnection()) {
                conn.setAutoCommit(false);
                try {
                    // Lock the row so concurrent grants serialise.
                    long newCoin, newDp;
                    String displayName;
                    try (PreparedStatement select = conn.prepareStatement(
                            "SELECT display_name, treasury_coin, treasury_dp " +
                            "FROM game.factions WHERE id = ? FOR UPDATE")) {
                        select.setString(1, factionId);
                        try (ResultSet rs = select.executeQuery()) {
                            if (!rs.next()) {
                                throw new NotFoundResponse("Faction not found: " + factionId);
                            }
                            displayName = rs.getString("display_name");
                            newCoin = rs.getLong("treasury_coin");
                            newDp = rs.getLong("treasury_dp");
                        }
                    }

                    if ("coin".equalsIgnoreCase(req.currency())) {
                        newCoin += req.amount();
                    } else {
                        newDp += req.amount();
                    }

                    try (PreparedStatement update = conn.prepareStatement(
                            "UPDATE game.factions SET treasury_coin = ?, treasury_dp = ? WHERE id = ?")) {
                        update.setLong(1, newCoin);
                        update.setLong(2, newDp);
                        update.setString(3, factionId);
                        update.executeUpdate();
                    }

                    Map<String, Object> payload = new LinkedHashMap<>();
                    payload.put("currency", req.currency().toLowerCase());
                    payload.put("amount", req.amount());
                    payload.put("reason", req.reason());
                    payload.put("new_coin_balance", newCoin);
                    payload.put("new_dp_balance", newDp);
                    String payloadJson = JSON.writeValueAsString(payload);

                    long eventId;
                    try (PreparedStatement insert = conn.prepareStatement(
                            "INSERT INTO audit.events " +
                            "(event_type, faction_id, visibility, payload, occurred_at) " +
                            "VALUES (?, ?, ?, CAST(? AS jsonb), NOW()) RETURNING id")) {
                        insert.setString(1, "ADMIN_GRANT");
                        insert.setString(2, factionId);
                        insert.setString(3, "admin");
                        insert.setString(4, payloadJson);
                        try (ResultSet rs = insert.executeQuery()) {
                            rs.next();
                            eventId = rs.getLong(1);
                        }
                    }

                    conn.commit();
                    Anduril.LOGGER.info(
                        "ADMIN_GRANT: {} {} {} → {} (event {})",
                        req.currency(), req.amount(), factionId, req.reason(), eventId
                    );

                    ctx.json(new GrantResponse(
                        factionId, displayName, newCoin, newDp, eventId
                    ));
                } catch (Exception e) {
                    conn.rollback();
                    throw e;
                }
            } catch (SQLException e) {
                Anduril.LOGGER.error("DB error during grant: {}", e.getMessage(), e);
                throw new RuntimeException("Database error", e);
            }
        });

        // Protected: recruit units at a settlement. Templates from the
        // grant endpoint but exercises the multi-row write shape every
        // future Phase 5 player action will follow:
        //   1. Lock the affected rows in deterministic order
        //   2. Cross-table validation (does X exist, does Y satisfy Z)
        //   3. Conditional insert-vs-update for the entity being added to
        //   4. Decrement-from + add-to in the same transaction
        //   5. Audit event with the full delta
        app.post("/api/v1/settlements/{id}/recruitments", ctx -> {
            long settlementId = parseLongOr400(ctx.pathParam("id"));
            RecruitRequest req = ctx.bodyAsClass(RecruitRequest.class);
            validateRecruit(req);

            long coinCost = req.count() * (long) COIN_PER_UNIT;

            try (Connection conn = database.getConnection()) {
                conn.setAutoCommit(false);
                try {
                    // 1a. Lock the settlement.
                    String factionId;
                    int population;
                    try (PreparedStatement select = conn.prepareStatement(
                            "SELECT faction_id, population FROM game.settlements " +
                            "WHERE id = ? FOR UPDATE")) {
                        select.setLong(1, settlementId);
                        try (ResultSet rs = select.executeQuery()) {
                            if (!rs.next()) {
                                throw new NotFoundResponse("Settlement not found: " + settlementId);
                            }
                            factionId = rs.getString("faction_id");
                            population = rs.getInt("population");
                        }
                    }

                    // 1b. Lock the faction so concurrent grants/recruits serialise.
                    long treasuryCoin;
                    try (PreparedStatement select = conn.prepareStatement(
                            "SELECT treasury_coin FROM game.factions WHERE id = ? FOR UPDATE")) {
                        select.setString(1, factionId);
                        try (ResultSet rs = select.executeQuery()) {
                            rs.next();
                            treasuryCoin = rs.getLong("treasury_coin");
                        }
                    }

                    // 2. Cross-table validation.
                    if (treasuryCoin < coinCost) {
                        throw new BadRequestResponse(String.format(
                            "Insufficient Coin: need %d, have %d.", coinCost, treasuryCoin
                        ));
                    }
                    int popInUse;
                    try (PreparedStatement select = conn.prepareStatement(
                            "SELECT COALESCE(SUM(pop_cost), 0)::INT AS used " +
                            "FROM game.districts WHERE settlement_id = ? AND active = 'true'")) {
                        select.setLong(1, settlementId);
                        try (ResultSet rs = select.executeQuery()) {
                            rs.next();
                            popInUse = rs.getInt("used");
                        }
                    }
                    int popAvailable = population - popInUse;
                    if (popAvailable < req.count()) {
                        throw new BadRequestResponse(String.format(
                            "Insufficient available population: need %d, have %d.",
                            req.count(), popAvailable
                        ));
                    }

                    // 3. Upsert the unit stack. We don't have a unique
                    // constraint on (unit_type, faction_id, garrisoned_at)
                    // so do this as select-then-update/insert under the
                    // existing row locks.
                    Long existingStackId = null;
                    int existingCount = 0;
                    try (PreparedStatement select = conn.prepareStatement(
                            "SELECT id, count FROM game.units " +
                            "WHERE unit_type = ? AND faction_id = ? AND garrisoned_at = ? FOR UPDATE")) {
                        select.setString(1, req.unitType());
                        select.setString(2, factionId);
                        select.setLong(3, settlementId);
                        try (ResultSet rs = select.executeQuery()) {
                            if (rs.next()) {
                                existingStackId = rs.getLong("id");
                                existingCount = rs.getInt("count");
                            }
                        }
                    }
                    int newStackCount;
                    if (existingStackId != null) {
                        newStackCount = existingCount + req.count();
                        try (PreparedStatement update = conn.prepareStatement(
                                "UPDATE game.units SET count = ? WHERE id = ?")) {
                            update.setInt(1, newStackCount);
                            update.setLong(2, existingStackId);
                            update.executeUpdate();
                        }
                    } else {
                        newStackCount = req.count();
                        try (PreparedStatement insert = conn.prepareStatement(
                                "INSERT INTO game.units " +
                                "(unit_type, faction_id, count, garrisoned_at) VALUES (?, ?, ?, ?)")) {
                            insert.setString(1, req.unitType());
                            insert.setString(2, factionId);
                            insert.setInt(3, req.count());
                            insert.setLong(4, settlementId);
                            insert.executeUpdate();
                        }
                    }

                    // 4. Debit the treasury.
                    long newCoin = treasuryCoin - coinCost;
                    try (PreparedStatement update = conn.prepareStatement(
                            "UPDATE game.factions SET treasury_coin = ? WHERE id = ?")) {
                        update.setLong(1, newCoin);
                        update.setString(2, factionId);
                        update.executeUpdate();
                    }

                    // 5. Audit.
                    Map<String, Object> payload = new LinkedHashMap<>();
                    payload.put("settlement_id", settlementId);
                    payload.put("unit_type", req.unitType());
                    payload.put("count", req.count());
                    payload.put("coin_cost", coinCost);
                    payload.put("new_stack_count", newStackCount);
                    payload.put("new_coin_balance", newCoin);
                    payload.put("reason", req.reason());

                    long eventId;
                    try (PreparedStatement insert = conn.prepareStatement(
                            "INSERT INTO audit.events " +
                            "(event_type, faction_id, visibility, payload, occurred_at) " +
                            "VALUES (?, ?, ?, CAST(? AS jsonb), NOW()) RETURNING id")) {
                        insert.setString(1, "UNITS_RECRUITED");
                        insert.setString(2, factionId);
                        insert.setString(3, "faction");
                        insert.setString(4, JSON.writeValueAsString(payload));
                        try (ResultSet rs = insert.executeQuery()) {
                            rs.next();
                            eventId = rs.getLong(1);
                        }
                    }

                    conn.commit();
                    Anduril.LOGGER.info(
                        "UNITS_RECRUITED: {} {} at settlement #{} (faction {}, -{} coin, event {})",
                        req.count(), req.unitType(), settlementId, factionId, coinCost, eventId
                    );

                    ctx.json(new RecruitResponse(
                        settlementId, req.unitType(), newStackCount, newCoin, eventId
                    ));
                } catch (Exception e) {
                    conn.rollback();
                    throw e;
                }
            } catch (SQLException e) {
                Anduril.LOGGER.error("DB error during recruit: {}", e.getMessage(), e);
                throw new RuntimeException("Database error", e);
            }
        });

        // Protected: claim a region for a faction.
        //   Cost: 240 DP per mechanics_spec.md §6.4.
        //   Requires: region exists, region currently unclaimed, faction
        //   has enough DP.
        //   Contiguity check is deferred to Phase 5 — needs region
        //   adjacency data and the faction-trait exception ruleset.
        app.post("/api/v1/claims", ctx -> {
            ClaimRequest req = ctx.bodyAsClass(ClaimRequest.class);
            validateClaim(req);

            try (Connection conn = database.getConnection()) {
                conn.setAutoCommit(false);
                try {
                    // 1a. Region must exist; lock for the rest of the tx.
                    String regionDisplayName;
                    try (PreparedStatement select = conn.prepareStatement(
                            "SELECT display_name FROM game.regions WHERE id = ? FOR UPDATE")) {
                        select.setString(1, req.regionId());
                        try (ResultSet rs = select.executeQuery()) {
                            if (!rs.next()) {
                                throw new NotFoundResponse("Region not found: " + req.regionId());
                            }
                            regionDisplayName = rs.getString("display_name");
                        }
                    }

                    // 1b. Existing claim → 409. Cleaner than 400 because the
                    // request itself was well-formed; the world's state
                    // rejects it.
                    try (PreparedStatement select = conn.prepareStatement(
                            "SELECT faction_id FROM game.region_claims WHERE region_id = ?")) {
                        select.setString(1, req.regionId());
                        try (ResultSet rs = select.executeQuery()) {
                            if (rs.next()) {
                                String byWhom = rs.getString("faction_id");
                                ctx.status(409).result(
                                    "Region " + req.regionId() + " already claimed by " + byWhom
                                );
                                return;
                            }
                        }
                    }

                    // 1c. Lock the faction.
                    long treasuryDp;
                    String factionDisplayName;
                    try (PreparedStatement select = conn.prepareStatement(
                            "SELECT display_name, treasury_dp FROM game.factions " +
                            "WHERE id = ? FOR UPDATE")) {
                        select.setString(1, req.factionId());
                        try (ResultSet rs = select.executeQuery()) {
                            if (!rs.next()) {
                                throw new NotFoundResponse("Faction not found: " + req.factionId());
                            }
                            factionDisplayName = rs.getString("display_name");
                            treasuryDp = rs.getLong("treasury_dp");
                        }
                    }

                    // 2. Cost gate.
                    if (treasuryDp < DP_PER_REGION_CLAIM) {
                        throw new BadRequestResponse(String.format(
                            "Insufficient DP: need %d, have %d.", DP_PER_REGION_CLAIM, treasuryDp
                        ));
                    }

                    // 3. Insert claim, debit DP.
                    try (PreparedStatement insert = conn.prepareStatement(
                            "INSERT INTO game.region_claims " +
                            "(region_id, faction_id, claimed_at, claim_dp_cost) " +
                            "VALUES (?, ?, NOW(), ?)")) {
                        insert.setString(1, req.regionId());
                        insert.setString(2, req.factionId());
                        insert.setInt(3, DP_PER_REGION_CLAIM);
                        insert.executeUpdate();
                    }

                    long newDp = treasuryDp - DP_PER_REGION_CLAIM;
                    try (PreparedStatement update = conn.prepareStatement(
                            "UPDATE game.factions SET treasury_dp = ? WHERE id = ?")) {
                        update.setLong(1, newDp);
                        update.setString(2, req.factionId());
                        update.executeUpdate();
                    }

                    // 4. Audit. Visibility 'public' — claims are world-state
                    // facts and belong in the public feed.
                    Map<String, Object> payload = new LinkedHashMap<>();
                    payload.put("region_id", req.regionId());
                    payload.put("region_name", regionDisplayName);
                    payload.put("dp_cost", DP_PER_REGION_CLAIM);
                    payload.put("new_dp_balance", newDp);
                    payload.put("reason", req.reason());

                    long eventId;
                    try (PreparedStatement insert = conn.prepareStatement(
                            "INSERT INTO audit.events " +
                            "(event_type, faction_id, visibility, payload, occurred_at) " +
                            "VALUES (?, ?, ?, CAST(? AS jsonb), NOW()) RETURNING id")) {
                        insert.setString(1, "REGION_CLAIMED");
                        insert.setString(2, req.factionId());
                        insert.setString(3, "public");
                        insert.setString(4, JSON.writeValueAsString(payload));
                        try (ResultSet rs = insert.executeQuery()) {
                            rs.next();
                            eventId = rs.getLong(1);
                        }
                    }

                    conn.commit();
                    Anduril.LOGGER.info(
                        "REGION_CLAIMED: {} → {} (-{} DP, event {})",
                        req.regionId(), req.factionId(), DP_PER_REGION_CLAIM, eventId
                    );

                    ctx.json(new ClaimResponse(
                        req.regionId(), regionDisplayName,
                        req.factionId(), factionDisplayName,
                        newDp, eventId
                    ));
                } catch (Exception e) {
                    conn.rollback();
                    throw e;
                }
            } catch (SQLException e) {
                Anduril.LOGGER.error("DB error during claim: {}", e.getMessage(), e);
                throw new RuntimeException("Database error", e);
            }
        });

        // Protected: Postgres connectivity status. Useful for ops to confirm
        // the bridge has DB without needing to read server logs.
        app.get("/api/v1/admin/db-info", ctx -> {
            var pool = database.poolStats();
            String body = String.format(
                "{\"postgres_version\":\"%s\",\"pool\":{\"active\":%d,\"idle\":%d,\"total\":%d,\"max\":8}}",
                escape(database.postgresVersion()),
                pool.getActiveConnections(),
                pool.getIdleConnections(),
                pool.getTotalConnections()
            );
            ctx.contentType("application/json").result(body);
        });
    }

    private static int resolvePort() {
        String fromEnv = System.getenv(PORT_ENV);
        if (fromEnv == null || fromEnv.isBlank()) return DEFAULT_PORT;
        try {
            return Integer.parseInt(fromEnv.trim());
        } catch (NumberFormatException e) {
            Anduril.LOGGER.warn(
                "Invalid {}={} — using default port {}.", PORT_ENV, fromEnv, DEFAULT_PORT
            );
            return DEFAULT_PORT;
        }
    }

    private static String escape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private static long parseLongOr400(String s) {
        try {
            return Long.parseLong(s);
        } catch (NumberFormatException e) {
            throw new BadRequestResponse("Invalid id: " + s);
        }
    }

    private static void validateClaim(ClaimRequest req) {
        if (req == null) throw new BadRequestResponse("Body required");
        if (req.regionId() == null || req.regionId().isBlank()) {
            throw new BadRequestResponse("regionId is required");
        }
        // Region IDs are short alphanumeric codes like 'AR43'. Tighten if
        // we add other forms later.
        if (!req.regionId().matches("[A-Za-z0-9_-]{2,16}")) {
            throw new BadRequestResponse("regionId must match [A-Za-z0-9_-]{2,16}");
        }
        if (req.factionId() == null || req.factionId().isBlank()) {
            throw new BadRequestResponse("factionId is required");
        }
        if (!req.factionId().matches("[a-z0-9_]{2,32}")) {
            throw new BadRequestResponse("factionId must match [a-z0-9_]{2,32}");
        }
        if (req.reason() == null || req.reason().isBlank()) {
            throw new BadRequestResponse("reason is required");
        }
    }

    private static void validateRecruit(RecruitRequest req) {
        if (req == null) {
            throw new BadRequestResponse("Body required");
        }
        if (req.unitType() == null || req.unitType().isBlank()) {
            throw new BadRequestResponse("unit_type is required");
        }
        // Cheap shape check so we don't write whatever the caller passed.
        if (!req.unitType().matches("[a-z0-9_]{2,64}")) {
            throw new BadRequestResponse(
                "unit_type must match [a-z0-9_]{2,64} (e.g. 'citadel_guard')"
            );
        }
        if (req.count() == null || req.count() <= 0 || req.count() > 1000) {
            throw new BadRequestResponse("count must be 1..1000");
        }
        if (req.reason() == null || req.reason().isBlank()) {
            throw new BadRequestResponse("reason is required");
        }
    }

    private static void validateGrant(GrantRequest req) {
        if (req == null) {
            throw new BadRequestResponse("Body required");
        }
        if (req.currency() == null
            || (!"coin".equalsIgnoreCase(req.currency()) && !"dp".equalsIgnoreCase(req.currency()))) {
            throw new BadRequestResponse("currency must be 'coin' or 'dp'");
        }
        if (req.amount() == null || req.amount() <= 0) {
            throw new BadRequestResponse("amount must be a positive integer");
        }
        if (req.reason() == null || req.reason().isBlank()) {
            throw new BadRequestResponse("reason is required");
        }
    }

    /** Request body for POST /api/v1/admin/factions/{id}/grant. */
    public record GrantRequest(String currency, Long amount, String reason) {}

    /** Response body — the updated faction state plus the audit row id. */
    public record GrantResponse(
        String id,
        String displayName,
        long treasuryCoin,
        long treasuryDp,
        long auditEventId
    ) {}

    /** Request body for POST /api/v1/claims. */
    public record ClaimRequest(String regionId, String factionId, String reason) {}

    /** Response body — what got claimed, by whom, and the new DP balance. */
    public record ClaimResponse(
        String regionId,
        String regionDisplayName,
        String factionId,
        String factionDisplayName,
        long treasuryDp,
        long auditEventId
    ) {}

    /** Request body for POST /api/v1/settlements/{id}/recruitments. */
    public record RecruitRequest(String unitType, Integer count, String reason) {}

    /** Response body — the unit-stack count after the add, plus new treasury. */
    public record RecruitResponse(
        long settlementId,
        String unitType,
        int unitStackCount,
        long treasuryCoin,
        long auditEventId
    ) {}
}
