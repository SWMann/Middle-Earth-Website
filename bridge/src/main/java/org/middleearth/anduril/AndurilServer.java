package org.middleearth.anduril;

import net.fabricmc.api.DedicatedServerModInitializer;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerLifecycleEvents;
import net.minecraft.server.MinecraftServer;

/**
 * Server-side Andúril.
 *
 * <p>Owns the Postgres connection, the HTTP API, and (eventually) the
 * daily-tick scheduler. Everything in here runs only on dedicated servers
 * (not on the integrated client server).
 *
 * <p>Failure modes are intentionally split:
 * <ul>
 *   <li>DB connection failure → the mod fails to start. Without DB we
 *       can't do our job; running a degraded bridge would silently lose
 *       writes.</li>
 *   <li>HTTP API failure → log and continue. The MC server stays usable
 *       and the website degrades to its "mod offline" state instead of
 *       taking the whole world down.</li>
 * </ul>
 */
public class AndurilServer implements DedicatedServerModInitializer {
    private Database database;
    private HttpApi httpApi;

    @Override
    public void onInitializeServer() {
        Anduril.LOGGER.info("Andúril server module — registering lifecycle hooks.");

        ServerLifecycleEvents.SERVER_STARTING.register(this::onStarting);
        ServerLifecycleEvents.SERVER_STARTED.register(this::onStarted);
        ServerLifecycleEvents.SERVER_STOPPING.register(this::onStopping);
    }

    private void onStarting(MinecraftServer server) {
        Anduril.LOGGER.info("Server starting; Andúril attaching.");
        try {
            database = new Database();
        } catch (Exception e) {
            Anduril.LOGGER.error(
                "Failed to connect to Postgres: {}. Andúril will not start.",
                e.getMessage(), e
            );
            // Propagate — without DB the mod is useless and silent failure
            // is worse than refusing to boot.
            throw new RuntimeException("Andúril DB init failed", e);
        }
        try {
            httpApi = new HttpApi(server, database);
            httpApi.start();
        } catch (Exception e) {
            Anduril.LOGGER.error("Failed to start Andúril HTTP API: {}", e.getMessage(), e);
            // HTTP failure is non-fatal: the MC server keeps running and
            // the website will see "bridge offline" until we restart.
        }
        // TODO: register tick scheduler.
    }

    private void onStarted(MinecraftServer server) {
        Anduril.LOGGER.info("Server started; Andúril ready.");
    }

    private void onStopping(MinecraftServer server) {
        Anduril.LOGGER.info("Server stopping; Andúril detaching.");
        if (httpApi != null) {
            httpApi.stop();
            httpApi = null;
        }
        if (database != null) {
            database.close();
            database = null;
        }
    }
}
