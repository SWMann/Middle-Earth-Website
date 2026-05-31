package org.middleearth.anduril;

import io.javalin.Javalin;
import io.javalin.http.UnauthorizedResponse;
import net.minecraft.SharedConstants;
import net.minecraft.server.MinecraftServer;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

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

    private final MinecraftServer server;
    private final byte[] expectedToken; // empty array if not configured
    private final boolean tokenConfigured;
    private Javalin app;

    public HttpApi(MinecraftServer server) {
        this.server = server;
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
}
