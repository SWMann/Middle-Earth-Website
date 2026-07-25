package org.middleearth.anduril;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.javalin.Javalin;
import io.javalin.http.BadRequestResponse;
import io.javalin.http.GoneResponse;
import io.javalin.http.NotFoundResponse;
import io.javalin.http.UnauthorizedResponse;
import net.minecraft.SharedConstants;
import net.minecraft.registry.RegistryKey;
import net.minecraft.registry.RegistryKeys;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.util.Identifier;
import net.minecraft.world.World;
import net.minecraft.util.WorldSavePath;
import org.middleearth.anduril.link.LinkCodeRepository;
import org.middleearth.anduril.scan.ComponentDetector;
import org.middleearth.anduril.scan.ConfigReader;
import org.middleearth.anduril.scan.FootprintValidator;
import org.middleearth.anduril.scan.MapTileStore;
import org.middleearth.anduril.scan.WorldMapStore;
import org.middleearth.anduril.scan.PlotGeometry;
import org.middleearth.anduril.scan.PlotRepository;
import org.middleearth.anduril.scan.PlotScanner;
import org.middleearth.anduril.scan.ScanConfig;
import org.middleearth.anduril.scan.ScanContext;
import org.middleearth.anduril.scan.ScanObservations;
import org.middleearth.anduril.scan.ScanResult;
import org.middleearth.anduril.scan.ScanService;
import org.middleearth.anduril.scan.TopDownRenderer;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

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
    private final ConfigReader configReader;
    private final ScanService scanService;
    private final PlotScanner plotScanner;
    private final PlotRepository plotRepository;
    private final LinkCodeRepository linkCodes;
    private final MapTileStore mapTiles;
    private final WorldMapStore worldMap;
    private final byte[] expectedToken; // empty array if not configured
    private final boolean tokenConfigured;
    private Javalin app;

    public HttpApi(MinecraftServer server, Database database, ConfigReader configReader,
                   ScanService scanService, PlotScanner plotScanner, PlotRepository plotRepository,
                   LinkCodeRepository linkCodes, MapTileStore mapTiles, WorldMapStore worldMap) {
        this.server = server;
        this.database = database;
        this.configReader = configReader;
        this.scanService = scanService;
        this.plotScanner = plotScanner;
        this.plotRepository = plotRepository;
        this.linkCodes = linkCodes;
        this.mapTiles = mapTiles;
        this.worldMap = worldMap;
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
            String mcVersion = SharedConstants.getGameVersion().name();
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
                escape(SharedConstants.getGameVersion().name())
            );
            ctx.contentType("application/json").result(body);
        });

        // Protected: redeem a Minecraft-link code. The in-game `/anduril link`
        // command wrote the code into web.mc_link_codes; here we consume it and
        // return the identity the website needs to write its own web.mc_links
        // row. This closes the account-linking loop that the Phase 1 mock stood
        // in for. Snake_case wire shape (code/discord_id → mc_uuid/mc_username/
        // linked_at) predates the camelCase DTO convention and is kept verbatim
        // so the existing website link flow and its mock stay untouched.
        app.post("/api/v1/mc-links/redeem", ctx -> {
            LinkRedeemRequest req = ctx.bodyAsClass(LinkRedeemRequest.class);
            if (req == null || req.code() == null || req.code().isBlank()) {
                throw new BadRequestResponse("Missing link code.");
            }
            // Codes are stored uppercase; normalise so lower/mixed-case input
            // (or a copy-paste with stray spaces) still matches.
            String code = req.code().trim().toUpperCase();
            try {
                LinkCodeRepository.RedeemResult result = linkCodes.redeem(code);
                switch (result.status()) {
                    case NOT_FOUND -> throw new NotFoundResponse("Unknown or expired link code.");
                    case EXPIRED -> throw new GoneResponse("Link code has expired.");
                    case OK -> {
                        Anduril.LOGGER.info(
                            "MC_LINK_REDEEMED: {} ({}) → discord {}",
                            result.mcUsername(), result.mcUuid(), req.discordId());
                        ctx.json(new LinkRedeemResponse(
                            result.mcUuid().toString(),
                            result.mcUsername(),
                            Instant.now().toString()));
                    }
                }
            } catch (SQLException e) {
                Anduril.LOGGER.error("DB error during mc-link redeem: {}", e.getMessage(), e);
                throw new RuntimeException("Database error", e);
            }
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

        // Protected: save a plot authored in the web floorplanner. A pure
        // insert into game.plots (source 'floorplanner', review_status
        // 'unscanned') carrying the image↔block transform + planned layout; the
        // geometry AABB is computed web-side by the shared lib/plots/geometry.ts
        // projection, so the bridge stays a thin writer. Phase E scans it later.
        app.post("/api/v1/plots", ctx -> {
            SavePlotRequest req = ctx.bodyAsClass(SavePlotRequest.class);
            validateSavePlot(req);

            try (Connection conn = database.getConnection()) {
                conn.setAutoCommit(false);
                try {
                    long plotId;
                    try (PreparedStatement ins = conn.prepareStatement(
                            "INSERT INTO game.plots (" +
                            "settlement_id, district_id, district_type, faction_id, source, label, " +
                            "dimension, min_x, min_y, min_z, max_x, max_y, max_z, " +
                            "footprint_cells, transform, layout, review_status, updated_at) " +
                            "VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, " +
                            "CAST(? AS jsonb), CAST(? AS jsonb), CAST(? AS jsonb), 'unscanned', NOW()) " +
                            "RETURNING id")) {
                        setNullableLong(ins, 1, req.settlementId());
                        ins.setString(2, req.districtType());
                        ins.setString(3, req.factionId());
                        ins.setString(4, req.source() == null || req.source().isBlank() ? "floorplanner" : req.source());
                        ins.setString(5, req.label() == null ? "" : req.label());
                        ins.setString(6, req.dimension() == null || req.dimension().isBlank() ? "minecraft:overworld" : req.dimension());
                        ins.setInt(7, req.minX());
                        ins.setInt(8, req.minY());
                        ins.setInt(9, req.minZ());
                        ins.setInt(10, req.maxX());
                        ins.setInt(11, req.maxY());
                        ins.setInt(12, req.maxZ());
                        ins.setString(13, nodeToJson(req.footprintCells()));
                        ins.setString(14, nodeToJson(req.transform()));
                        ins.setString(15, nodeToJson(req.layout()));
                        try (ResultSet rs = ins.executeQuery()) {
                            rs.next();
                            plotId = rs.getLong(1);
                        }
                    }

                    Map<String, Object> payload = new LinkedHashMap<>();
                    payload.put("plot_id", plotId);
                    payload.put("district_type", req.districtType());
                    payload.put("faction_id", req.factionId());
                    payload.put("settlement_id", req.settlementId());
                    payload.put("source", "floorplanner");
                    payload.put("box", Map.of(
                        "min", new int[]{req.minX(), req.minY(), req.minZ()},
                        "max", new int[]{req.maxX(), req.maxY(), req.maxZ()}));

                    long eventId;
                    try (PreparedStatement insert = conn.prepareStatement(
                            "INSERT INTO audit.events " +
                            "(event_type, faction_id, visibility, payload, occurred_at) " +
                            "VALUES (?, ?, ?, CAST(? AS jsonb), NOW()) RETURNING id")) {
                        insert.setString(1, "PLOT_SAVED");
                        insert.setString(2, req.factionId());
                        insert.setString(3, "admin");
                        insert.setString(4, JSON.writeValueAsString(payload));
                        try (ResultSet rs = insert.executeQuery()) {
                            rs.next();
                            eventId = rs.getLong(1);
                        }
                    }

                    conn.commit();
                    Anduril.LOGGER.info(
                        "PLOT_SAVED: plot #{} ({} floorplan, event {})",
                        plotId, req.districtType(), eventId);
                    ctx.json(new SavePlotResponse(plotId, eventId));
                } catch (Exception e) {
                    conn.rollback();
                    throw e;
                }
            } catch (SQLException e) {
                Anduril.LOGGER.error("DB error during plot save: {}", e.getMessage(), e);
                throw new RuntimeException("Database error", e);
            }
        });

        // Protected: staff approve/reject a scanned plot. The companion to the
        // in-game scanner (scan/ package): a plot that didn't auto-approve sits
        // pending in the website's review queue until a reviewer decides here.
        //   approve → review_status 'approved' (+ activate a linked district)
        //   reject  → review_status 'rejected'
        // Only pending plots may be reviewed; anything else is a 409.
        app.post("/api/v1/plots/{id}/review", ctx -> {
            long plotId = parseLongOr400(ctx.pathParam("id"));
            PlotReviewRequest req = ctx.bodyAsClass(PlotReviewRequest.class);
            validateReview(req);
            boolean approve = "approve".equalsIgnoreCase(req.decision());
            String newStatus = approve ? "approved" : "rejected";

            try (Connection conn = database.getConnection()) {
                conn.setAutoCommit(false);
                try {
                    String currentStatus, factionId, districtType;
                    Long districtId;
                    int score;
                    try (PreparedStatement select = conn.prepareStatement(
                            "SELECT review_status, faction_id, district_id, district_type, " +
                            "COALESCE(decoration_score, 0) AS score " +
                            "FROM game.plots WHERE id = ? FOR UPDATE")) {
                        select.setLong(1, plotId);
                        try (ResultSet rs = select.executeQuery()) {
                            if (!rs.next()) {
                                throw new NotFoundResponse("Plot not found: " + plotId);
                            }
                            currentStatus = rs.getString("review_status");
                            factionId = rs.getString("faction_id");
                            long d = rs.getLong("district_id");
                            districtId = rs.wasNull() ? null : d;
                            districtType = rs.getString("district_type");
                            score = rs.getInt("score");
                        }
                    }

                    if (!"pending_spot".equals(currentStatus) && !"pending_full".equals(currentStatus)) {
                        ctx.status(409).result(
                            "Plot " + plotId + " is not pending review (status: " + currentStatus + ")");
                        return;
                    }

                    try (PreparedStatement update = conn.prepareStatement(
                            "UPDATE game.plots SET review_status = ?, review_note = ?, " +
                            "reviewed_by = ?, updated_at = NOW() WHERE id = ?")) {
                        update.setString(1, newStatus);
                        update.setString(2, req.note() == null ? "" : req.note());
                        update.setString(3, req.reviewedBy());
                        update.setLong(4, plotId);
                        update.executeUpdate();
                    }

                    if (approve && districtId != null) {
                        try (PreparedStatement update = conn.prepareStatement(
                                "UPDATE game.districts SET active = 'true' WHERE id = ?")) {
                            update.setLong(1, districtId);
                            update.executeUpdate();
                        }
                    }

                    Map<String, Object> payload = new LinkedHashMap<>();
                    payload.put("plot_id", plotId);
                    payload.put("decision", approve ? "approve" : "reject");
                    payload.put("from_status", currentStatus);
                    payload.put("to_status", newStatus);
                    payload.put("district_type", districtType);
                    payload.put("district_id", districtId);
                    payload.put("decoration_score", score);
                    payload.put("reviewed_by", req.reviewedBy());
                    payload.put("note", req.note());

                    long eventId;
                    try (PreparedStatement insert = conn.prepareStatement(
                            "INSERT INTO audit.events " +
                            "(event_type, faction_id, visibility, payload, occurred_at) " +
                            "VALUES (?, ?, ?, CAST(? AS jsonb), NOW()) RETURNING id")) {
                        insert.setString(1, "PLOT_REVIEWED");
                        insert.setString(2, factionId);
                        insert.setString(3, "admin");
                        insert.setString(4, JSON.writeValueAsString(payload));
                        try (ResultSet rs = insert.executeQuery()) {
                            rs.next();
                            eventId = rs.getLong(1);
                        }
                    }

                    conn.commit();
                    Anduril.LOGGER.info(
                        "PLOT_REVIEWED: plot #{} {} → {} by {} (event {})",
                        plotId, currentStatus, newStatus, req.reviewedBy(), eventId);

                    ctx.json(new PlotReviewResponse(plotId, newStatus, districtId, eventId));
                } catch (Exception e) {
                    conn.rollback();
                    throw e;
                }
            } catch (SQLException e) {
                Anduril.LOGGER.error("DB error during plot review: {}", e.getMessage(), e);
                throw new RuntimeException("Database error", e);
            }
        });

        // Protected: scan a saved plot (the floorplanner's companion to the
        // in-game /anduril scan). Inverted threading vs the command path: load
        // the plot + config on this Jetty worker (DB is fine off-thread), read
        // the world on the SERVER thread via server.execute (force-loading the
        // box's chunks, since the author may be absent), block this worker on a
        // BOUNDED future.get (Jetty may block; the tick must not), then score /
        // validate / persist back here. Reuses every scan/ class unchanged.
        app.post("/api/v1/plots/{id}/scan", ctx -> {
            long plotId = parseLongOr400(ctx.pathParam("id"));

            String districtType, factionId, label, tier, transformJson, layoutJson, dimension;
            Long settlementId, districtId;
            Integer popCap;
            int minX, minY, minZ, maxX, maxY, maxZ;
            try (Connection conn = database.getConnection()) {
                try (PreparedStatement ps = conn.prepareStatement(
                        "SELECT p.district_type, p.faction_id, p.settlement_id, p.district_id, p.label, " +
                        "p.dimension, p.min_x, p.min_y, p.min_z, p.max_x, p.max_y, p.max_z, " +
                        "p.transform::text AS transform, p.layout::text AS layout, " +
                        "s.tier AS tier, s.population_cap AS pop_cap " +
                        "FROM game.plots p LEFT JOIN game.settlements s ON s.id = p.settlement_id " +
                        "WHERE p.id = ?")) {
                    ps.setLong(1, plotId);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (!rs.next()) throw new NotFoundResponse("Plot not found: " + plotId);
                        districtType = rs.getString("district_type");
                        factionId = rs.getString("faction_id");
                        dimension = rs.getString("dimension");
                        long sid = rs.getLong("settlement_id");
                        settlementId = rs.wasNull() ? null : sid;
                        long did = rs.getLong("district_id");
                        districtId = rs.wasNull() ? null : did;
                        label = rs.getString("label");
                        minX = rs.getInt("min_x"); minY = rs.getInt("min_y"); minZ = rs.getInt("min_z");
                        maxX = rs.getInt("max_x"); maxY = rs.getInt("max_y"); maxZ = rs.getInt("max_z");
                        transformJson = rs.getString("transform");
                        layoutJson = rs.getString("layout");
                        tier = rs.getString("tier");
                        int pc = rs.getInt("pop_cap");
                        popCap = rs.wasNull() ? null : pc;
                    }
                }
            } catch (SQLException e) {
                Anduril.LOGGER.error("DB error loading plot for scan: {}", e.getMessage(), e);
                throw new RuntimeException("Database error", e);
            }

            ScanConfig config = configReader.get();
            String cultureId = factionId != null ? config.factionCulture().get(factionId) : null;
            Set<String> cultureBlocks = cultureId != null ? config.culturePalettes().get(cultureId) : null;
            ComponentDetector detector = new ComponentDetector(config);

            PlotGeometry.Transform transform;
            List<PlotGeometry.LayoutBuilding> buildings;
            try {
                transform = transformJson == null ? null : PlotGeometry.Transform.from(JSON.readTree(transformJson));
                buildings = layoutJson == null ? List.of() : PlotGeometry.buildingsFrom(JSON.readTree(layoutJson));
            } catch (Exception e) {
                throw new BadRequestResponse("Stored transform/layout is not valid JSON: " + e.getMessage());
            }
            final boolean verifyBuildings = transform != null && !buildings.isEmpty();

            // Read the world on the server thread.
            final int fMinX = minX, fMinY = minY, fMinZ = minZ, fMaxX = maxX, fMaxY = maxY, fMaxZ = maxZ;
            final PlotGeometry.Transform fTransform = transform;
            final List<PlotGeometry.LayoutBuilding> fBuildings = buildings;
            final String fDimension = dimension;
            CompletableFuture<Observed> future = new CompletableFuture<>();
            server.execute(() -> {
                try {
                    ServerWorld world = resolveWorld(server, fDimension);
                    if (world == null) {
                        throw new IllegalStateException("Dimension not loaded: " + fDimension);
                    }
                    forceLoadChunks(world, fMinX, fMinZ, fMaxX, fMaxZ);
                    ScanObservations obs = plotScanner.observe(
                        world, fMinX, fMinY, fMinZ, fMaxX, fMaxY, fMaxZ, config, detector, cultureBlocks);
                    Map<String, Map<String, Integer>> perBuilding = verifyBuildings
                        ? plotScanner.observeBuildings(world, fBuildings, fTransform, fMinY, fMaxY, detector)
                        : null;
                    future.complete(new Observed(obs, perBuilding));
                } catch (Throwable t) {
                    future.completeExceptionally(t);
                }
            });

            Observed observed;
            try {
                observed = future.get(15, TimeUnit.SECONDS);
            } catch (TimeoutException te) {
                ctx.status(504).result("Scan timed out — server thread busy. Try again.");
                return;
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Scan interrupted", ie);
            } catch (ExecutionException ee) {
                Throwable cause = ee.getCause();
                if (cause instanceof IllegalArgumentException || cause instanceof IllegalStateException) {
                    throw new BadRequestResponse(cause.getMessage());
                }
                Anduril.LOGGER.error("World read failed during scan: {}", String.valueOf(cause), cause);
                throw new RuntimeException("Scan failed during world read", cause);
            }

            FootprintValidator.BuildingVerification bv = observed.perBuilding() == null
                ? null
                : buildVerification(fBuildings, observed.perBuilding(), config.buildingProvides());

            ScanContext sctx = new ScanContext(
                districtType, factionId, cultureId, settlementId, districtId, tier,
                "http", label == null ? "" : label, "http", bv != null);
            ScanResult result = scanService.compute(observed.obs(), sctx, config, popCap, bv);

            try {
                PlotRepository.PersistResult pr = plotRepository.updateScan(plotId, result);
                ctx.json(new ScanPlotResponse(
                    plotId, result.decorationScore(), result.reviewStatus(),
                    result.reviewMode(), pr.auditEventId()));
            } catch (SQLException e) {
                Anduril.LOGGER.error("DB error saving scan: {}", e.getMessage(), e);
                throw new RuntimeException("Database error", e);
            }
        });

        // Protected: a top-down, 1-pixel-per-block render of a world region —
        // the floorplanner's terrain underlay. Same threading contract as the
        // scan: read the world on the server thread (force-loaded), bounded
        // future, then PNG-encode off-thread.
        app.get("/api/v1/render/topdown", ctx -> {
            String dim = ctx.queryParam("dim");
            int minX = parseIntParam(ctx, "minX");
            int minZ = parseIntParam(ctx, "minZ");
            int maxX = parseIntParam(ctx, "maxX");
            int maxZ = parseIntParam(ctx, "maxZ");
            if (minX > maxX || minZ > maxZ) {
                throw new BadRequestResponse("min coords must be ≤ max coords");
            }
            if (resolveWorld(server, dim) == null) {
                throw new BadRequestResponse("Dimension not loaded: " + dim);
            }

            final int fMinX = minX, fMinZ = minZ, fMaxX = maxX, fMaxZ = maxZ;
            CompletableFuture<BufferedImage> future = new CompletableFuture<>();
            server.execute(() -> {
                try {
                    ServerWorld world = resolveWorld(server, dim);
                    if (world == null) {
                        throw new IllegalStateException("Dimension not loaded: " + dim);
                    }
                    forceLoadChunks(world, fMinX, fMinZ, fMaxX, fMaxZ);
                    future.complete(new TopDownRenderer().render(world, fMinX, fMinZ, fMaxX, fMaxZ));
                } catch (Throwable t) {
                    future.completeExceptionally(t);
                }
            });

            BufferedImage img;
            try {
                img = future.get(15, TimeUnit.SECONDS);
            } catch (TimeoutException te) {
                ctx.status(504).result("Render timed out — server thread busy. Try again.");
                return;
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Render interrupted", ie);
            } catch (ExecutionException ee) {
                Throwable cause = ee.getCause();
                if (cause instanceof IllegalArgumentException || cause instanceof IllegalStateException) {
                    throw new BadRequestResponse(cause.getMessage());
                }
                Anduril.LOGGER.error("World render failed: {}", String.valueOf(cause), cause);
                throw new RuntimeException("Render failed during world read", cause);
            }

            try {
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ImageIO.write(img, "png", baos);
                ctx.contentType("image/png").header("Cache-Control", "no-store").result(baos.toByteArray());
            } catch (Exception e) {
                Anduril.LOGGER.error("PNG encode failed: {}", e.getMessage(), e);
                throw new RuntimeException("PNG encode failed", e);
            }
        });

        // Protected: the loaded world/dimension ids, for the floorplanner's
        // dimension selector (e.g. 'minecraft:overworld', 'middle-earth:middle_earth').
        app.get("/api/v1/dimensions", ctx -> {
            java.util.List<String> dims = new java.util.ArrayList<>();
            for (ServerWorld w : server.getWorlds()) {
                dims.add(w.getRegistryKey().getValue().toString());
            }
            ctx.json(dims);
        });

        // Protected: one world-map tile (512×512 PNG; scale 0 = 1px/block,
        // each level up covers 2× the area). Served from the MapTileStore's
        // disk/memory pyramid — NO world access on this path, so the website
        // can hammer it without touching the tick. 404 = nothing mapped there.
        app.get("/api/v1/map/tile", ctx -> {
            String dim = requireDim(ctx.queryParam("dim"));
            int scale = parseIntParam(ctx, "scale");
            int tx = parseIntParam(ctx, "tx");
            int tz = parseIntParam(ctx, "tz");
            if (scale < 0 || scale > MapTileStore.MAX_SCALE) {
                throw new BadRequestResponse("scale must be 0.." + MapTileStore.MAX_SCALE);
            }
            if (Math.abs(tx) > 4096 || Math.abs(tz) > 4096) {
                throw new BadRequestResponse("tile index out of range");
            }
            byte[] png;
            try {
                png = mapTiles.requestTile(dim, scale, tx, tz).get(10, TimeUnit.SECONDS);
            } catch (TimeoutException te) {
                ctx.status(504).result("Tile composition timed out.");
                return;
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Tile request interrupted", ie);
            } catch (ExecutionException ee) {
                Anduril.LOGGER.error("Tile request failed: {}", String.valueOf(ee.getCause()), ee.getCause());
                throw new RuntimeException("Tile request failed", ee.getCause());
            }
            if (png == null) {
                ctx.status(404).header("Cache-Control", "public, max-age=30").result("");
                return;
            }
            ctx.contentType("image/png").header("Cache-Control", "public, max-age=60").result(png);
        });

        // Protected: one tile of the mod's canonical world-gen map (the biome
        // or height pyramid the mod generates terrain from). Covers ALL of
        // Middle-earth, not just visited chunks. Served straight off the
        // extracted on-disk cache — no world access. layer=biomes|heights,
        // level 0..MAX_LEVEL, grid 2^level per axis. See WorldMapStore.
        app.get("/api/v1/worldmap/tile", ctx -> {
            String layer = ctx.queryParam("layer");
            if (!"biomes".equals(layer) && !"heights".equals(layer)) {
                throw new BadRequestResponse("layer must be biomes or heights");
            }
            int level = parseIntParam(ctx, "level");
            int col = parseIntParam(ctx, "col");
            int row = parseIntParam(ctx, "row");
            byte[] png;
            try {
                png = worldMap.tile(layer, level, col, row);
            } catch (java.io.IOException e) {
                Anduril.LOGGER.error("World-gen tile read failed: {}", e.getMessage(), e);
                throw new RuntimeException("World-gen tile read failed", e);
            }
            if (png == null) {
                ctx.status(404).header("Cache-Control", "public, max-age=60").result("");
                return;
            }
            // Canonical map is static; cache hard.
            ctx.contentType("image/png").header("Cache-Control", "public, max-age=86400").result(png);
        });

        // Protected: world-gen map metadata — the image↔world transform the
        // web client needs to project markers/polygons onto the map.
        app.get("/api/v1/worldmap/meta", ctx -> ctx.json(Map.of(
            "ready", worldMap.isReady(),
            "tilePx", WorldMapStore.TILE_PX,
            "maxLevel", WorldMapStore.MAX_LEVEL,
            "blocksPerPixelFinest", WorldMapStore.BLOCKS_PER_PX_FINEST,
            "worldSize", WorldMapStore.WORLD_SIZE,
            "layers", List.of("biomes", "heights")
        )));

        // Protected: set (or clear) a region's polygon boundary — the admin
        // region editor's save. Per mod_spec §4 all game.* writes go through
        // the mod. Body: {"boundary": [[x,z],...]} (>=3 points) or
        // {"boundary": null} to clear and fall back to the centre+radius circle.
        app.put("/api/v1/regions/{id}/boundary", ctx -> {
            String regionId = ctx.pathParam("id");
            if (!regionId.matches("[A-Za-z0-9_-]{1,32}")) {
                throw new BadRequestResponse("Invalid region id.");
            }
            BoundaryRequest req = ctx.bodyAsClass(BoundaryRequest.class);
            String json = boundaryToJson(req == null ? null : req.boundary()); // null = clear
            try (Connection conn = database.getConnection();
                 PreparedStatement up = conn.prepareStatement(
                     "UPDATE game.regions SET boundary = CAST(? AS jsonb) WHERE id = ? RETURNING id")) {
                if (json == null) {
                    up.setNull(1, java.sql.Types.VARCHAR);
                } else {
                    up.setString(1, json);
                }
                up.setString(2, regionId);
                try (ResultSet rs = up.executeQuery()) {
                    if (!rs.next()) throw new NotFoundResponse("Region not found: " + regionId);
                }
                Anduril.LOGGER.info("Region {} boundary set to {} vertices.",
                    regionId, req == null || req.boundary() == null ? 0 : req.boundary().size());
                ctx.json(Map.of(
                    "id", regionId,
                    "vertices", req == null || req.boundary() == null ? 0 : req.boundary().size()));
            } catch (SQLException e) {
                Anduril.LOGGER.error("Region boundary write failed: {}", e.getMessage(), e);
                throw new RuntimeException("Database error", e);
            }
        });

        // Protected: queue a map backfill — every chunk of every EXISTING
        // region file of the dimension is loaded through the tick pump
        // (throttled) and captured. Fills the map without waiting for players
        // to roam. cancel=1 clears the queue.
        app.post("/api/v1/map/backfill", ctx -> {
            String dim = requireDim(ctx.queryParam("dim"));
            if ("1".equals(ctx.queryParam("cancel"))) {
                mapTiles.cancelBackfill();
                ctx.json(Map.of("cancelled", true));
                return;
            }
            ServerWorld world = resolveWorld(server, dim);
            if (world == null) throw new BadRequestResponse("Dimension not loaded: " + dim);
            java.nio.file.Path regionDir = dimensionDir(server, world).resolve("region");

            // Region listing is plain file IO — do it HERE on the Jetty
            // worker; only the cheap queue swap crosses to the server thread.
            // Fire-and-forget: progress is visible via /map/status.
            List<net.minecraft.util.math.ChunkPos> chunks = MapTileStore.listRegionChunks(regionDir);
            if (chunks == null) {
                throw new BadRequestResponse("No region directory at " + regionDir);
            }
            final ServerWorld fWorld = world;
            server.execute(() -> mapTiles.adoptBackfill(fWorld, chunks));
            Anduril.LOGGER.info("Map backfill requested for {} ({} chunks).", dim, chunks.size());
            ctx.json(Map.of("dim", dim, "chunksQueued", chunks.size()));
        });

        // Protected: capture/backfill progress for ops + the website.
        app.get("/api/v1/map/status", ctx -> {
            ctx.json(Map.of(
                "capturedChunks", mapTiles.capturedChunks(),
                "backfillRemaining", mapTiles.backfillRemaining()
            ));
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

    private static String nodeToJson(JsonNode node) {
        return (node == null || node.isNull()) ? null : node.toString();
    }

    private static void setNullableLong(PreparedStatement ps, int idx, Long v) throws SQLException {
        if (v == null) ps.setNull(idx, java.sql.Types.BIGINT);
        else ps.setLong(idx, v);
    }

    private static void validateSavePlot(SavePlotRequest req) {
        if (req == null) {
            throw new BadRequestResponse("Body required");
        }
        if (req.districtType() == null || !req.districtType().matches("[a-z0-9_]{2,64}")) {
            throw new BadRequestResponse("districtType must match [a-z0-9_]{2,64}");
        }
        if (req.minX() > req.maxX() || req.minY() > req.maxY() || req.minZ() > req.maxZ()) {
            throw new BadRequestResponse("min coords must be ≤ max coords on every axis");
        }
    }

    /**
     * Validate a dimension id query param. Strict charset (no dots or
     * slashes) so the sanitised form can never traverse the tile directory.
     */
    private static String requireDim(String dim) {
        // Minecraft identifiers allow [a-z0-9_.-] in the namespace and
        // [a-z0-9_.-/] in the path. The namespace hyphen matters here: the
        // upstream mod's dimension is 'middle-earth:middle_earth' (renamed
        // from 'me:middle_earth' in 1.0.0-1.21.8), and the old [a-z0-9_]
        // pattern rejected it — silently breaking every map tile request.
        if (dim == null || !dim.matches("[a-z0-9_.-]+:[a-z0-9_./-]+")) {
            throw new BadRequestResponse("dim must be a dimension id like middle-earth:middle_earth");
        }
        return dim;
    }

    /** The on-disk save directory of a world (vanilla DIM mapping + datapack dims). */
    private static java.nio.file.Path dimensionDir(MinecraftServer server, ServerWorld world) {
        java.nio.file.Path root = server.getSavePath(WorldSavePath.ROOT);
        Identifier id = world.getRegistryKey().getValue();
        if (id.equals(Identifier.of("minecraft", "overworld"))) return root;
        if (id.equals(Identifier.of("minecraft", "the_nether"))) return root.resolve("DIM-1");
        if (id.equals(Identifier.of("minecraft", "the_end"))) return root.resolve("DIM1");
        return root.resolve("dimensions").resolve(id.getNamespace()).resolve(id.getPath());
    }

    /** Resolve a ServerWorld from a dimension id; blank → overworld, bad → null. */
    private static ServerWorld resolveWorld(MinecraftServer server, String dim) {
        if (dim == null || dim.isBlank()) return server.getOverworld();
        Identifier id = Identifier.tryParse(dim);
        if (id == null) return null;
        return server.getWorld(RegistryKey.of(RegistryKeys.WORLD, id));
    }

    /**
     * Validate a region boundary and serialise it to a compact integer JSON
     * ring like {@code [[x,z],[x,z],...]}. Returns null when {@code pts} is null
     * (a request to clear the boundary). Throws {@link BadRequestResponse} for a
     * malformed ring (fewer than 3 points, more than 512, or a vertex that
     * isn't a pair of finite numbers within the 0..WORLD_SIZE map bounds).
     */
    private static String boundaryToJson(java.util.List<java.util.List<Double>> pts) {
        if (pts == null) return null;
        if (pts.size() < 3) throw new BadRequestResponse("A boundary needs at least 3 points.");
        if (pts.size() > 512) throw new BadRequestResponse("Boundary has too many points (max 512).");
        int max = WorldMapStore.WORLD_SIZE;
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < pts.size(); i++) {
            java.util.List<Double> p = pts.get(i);
            if (p == null || p.size() != 2 || p.get(0) == null || p.get(1) == null) {
                throw new BadRequestResponse("Each vertex must be [x, z].");
            }
            double x = p.get(0), z = p.get(1);
            if (!Double.isFinite(x) || !Double.isFinite(z) || x < 0 || z < 0 || x > max || z > max) {
                throw new BadRequestResponse("Vertex out of map bounds (0.." + max + ").");
            }
            if (i > 0) sb.append(',');
            sb.append('[').append(Math.round(x)).append(',').append(Math.round(z)).append(']');
        }
        return sb.append(']').toString();
    }

    private static int parseIntParam(io.javalin.http.Context ctx, String name) {
        String v = ctx.queryParam(name);
        if (v == null) throw new BadRequestResponse("Missing query param: " + name);
        try {
            return Integer.parseInt(v.trim());
        } catch (NumberFormatException e) {
            throw new BadRequestResponse("Invalid integer for " + name + ": " + v);
        }
    }

    /** Force-load every chunk the scan box touches (the author may be absent). */
    private static void forceLoadChunks(ServerWorld world, int minX, int minZ, int maxX, int maxZ) {
        int cx0 = minX >> 4, cx1 = maxX >> 4, cz0 = minZ >> 4, cz1 = maxZ >> 4;
        for (int cx = cx0; cx <= cx1; cx++) {
            for (int cz = cz0; cz <= cz1; cz++) {
                world.getChunk(cx, cz);
            }
        }
    }

    /**
     * A declared building is verified iff every component it should provide
     * (config.building_provides_components) was actually found in its
     * sub-region. Buildings with no declared components are trusted as placed.
     */
    private static FootprintValidator.BuildingVerification buildVerification(
            List<PlotGeometry.LayoutBuilding> buildings,
            Map<String, Map<String, Integer>> perBuilding,
            Map<String, Map<String, Integer>> buildingProvides) {
        int verified = 0;
        Map<String, Integer> byType = new HashMap<>();
        for (PlotGeometry.LayoutBuilding b : buildings) {
            Map<String, Integer> found = perBuilding.getOrDefault(b.uid(), Map.of());
            Map<String, Integer> req = buildingProvides.getOrDefault(b.buildingTypeId(), Map.of());
            boolean ok = true;
            for (Map.Entry<String, Integer> e : req.entrySet()) {
                if (found.getOrDefault(e.getKey(), 0) < e.getValue()) {
                    ok = false;
                    break;
                }
            }
            if (ok) {
                verified++;
                byType.merge(b.buildingTypeId(), 1, Integer::sum);
            }
        }
        return new FootprintValidator.BuildingVerification(verified, byType);
    }

    private static void validateReview(PlotReviewRequest req) {
        if (req == null) {
            throw new BadRequestResponse("Body required");
        }
        if (req.decision() == null
            || (!"approve".equalsIgnoreCase(req.decision()) && !"reject".equalsIgnoreCase(req.decision()))) {
            throw new BadRequestResponse("decision must be 'approve' or 'reject'");
        }
        if (req.reviewedBy() == null || req.reviewedBy().isBlank()) {
            throw new BadRequestResponse("reviewedBy is required");
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
    /**
     * Request body for POST /api/v1/mc-links/redeem. Snake_case on the wire to
     * match the website's Phase 1 contract (@modspec/api-types mc-links.ts);
     * @JsonProperty maps it onto camelCase record components.
     */
    public record LinkRedeemRequest(
        String code,
        @JsonProperty("discord_id") String discordId
    ) {}

    /** Response body — the identity the website binds to the Discord account. */
    public record LinkRedeemResponse(
        @JsonProperty("mc_uuid") String mcUuid,
        @JsonProperty("mc_username") String mcUsername,
        @JsonProperty("linked_at") String linkedAt
    ) {}

    public record GrantRequest(String currency, Long amount, String reason) {}

    /** Body for PUT /regions/{id}/boundary: an [x,z] ring, or null to clear. */
    public record BoundaryRequest(java.util.List<java.util.List<Double>> boundary) {}

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

    /**
     * Request body for POST /api/v1/plots (web floorplanner save). The
     * geometry AABB is computed web-side; the jsonb blobs are stored verbatim.
     */
    public record SavePlotRequest(
        String districtType,
        String factionId,
        Long settlementId,
        String label,
        String source,
        String dimension,
        int minX, int minY, int minZ,
        int maxX, int maxY, int maxZ,
        JsonNode footprintCells,
        JsonNode transform,
        JsonNode layout
    ) {}

    /** Response body — the new plot id and the audit row id. */
    public record SavePlotResponse(long plotId, long auditEventId) {}

    /** Internal carrier across the server-thread → worker boundary. */
    private record Observed(ScanObservations obs, Map<String, Map<String, Integer>> perBuilding) {}

    /** Response body for POST /api/v1/plots/{id}/scan. */
    public record ScanPlotResponse(
        long plotId,
        int decorationScore,
        String reviewStatus,
        String reviewMode,
        long auditEventId
    ) {}

    /** Request body for POST /api/v1/plots/{id}/review. */
    public record PlotReviewRequest(String decision, String reviewedBy, String note) {}

    /** Response body — the plot's new status and the audit row id. */
    public record PlotReviewResponse(
        long plotId,
        String reviewStatus,
        Long districtId,
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
