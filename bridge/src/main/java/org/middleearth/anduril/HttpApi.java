package org.middleearth.anduril;

import io.javalin.Javalin;
import net.minecraft.SharedConstants;
import net.minecraft.server.MinecraftServer;

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
 * <p>Phase-1 scope: a single unauthenticated health endpoint.
 * Authentication via {@code X-Mod-Token} and the rest of the verb
 * surface (per {@code mod_spec.md} §5) come in subsequent commits.
 */
public class HttpApi {
    public static final int DEFAULT_PORT = 8080;
    public static final String PORT_ENV = "ANDURIL_PORT";

    private final MinecraftServer server;
    private Javalin app;

    public HttpApi(MinecraftServer server) {
        this.server = server;
    }

    public void start() {
        int port = resolvePort();
        app = Javalin.create(config -> {
            // Silence Javalin's default startup banner — we log our own.
            config.showJavalinBanner = false;
        });

        registerRoutes(app);

        app.start("0.0.0.0", port);
        Anduril.LOGGER.info("Andúril HTTP API listening on 0.0.0.0:{}", port);
    }

    public void stop() {
        if (app != null) {
            app.stop();
            Anduril.LOGGER.info("Andúril HTTP API stopped.");
        }
    }

    private void registerRoutes(Javalin app) {
        // Lightweight liveness/readiness check. Used by the website to
        // confirm the mod is reachable and by ops for health monitoring.
        app.get("/api/v1/health", ctx -> {
            String mcVersion = SharedConstants.getGameVersion().getName();
            int playerCount = server.getCurrentPlayerCount();
            int maxPlayers = server.getMaxPlayerCount();
            // Hand-rolled JSON — no Jackson dep needed for one endpoint. We'll
            // bring in a JSON binder when the API surface grows.
            String body = String.format(
                "{\"status\":\"ok\",\"mc_version\":\"%s\",\"players\":{\"online\":%d,\"max\":%d}}",
                escape(mcVersion), playerCount, maxPlayers
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
