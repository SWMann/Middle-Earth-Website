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
}
