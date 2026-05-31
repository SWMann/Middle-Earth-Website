package org.middleearth.anduril;

import net.fabricmc.api.DedicatedServerModInitializer;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerLifecycleEvents;
import net.minecraft.server.MinecraftServer;

/**
 * Server-side Andúril.
 *
 * <p>Owns the HTTP API lifecycle, and eventually the Postgres connection
 * and daily-tick scheduler. Everything in here runs only on dedicated
 * servers (not on the integrated client server).
 */
public class AndurilServer implements DedicatedServerModInitializer {
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
            httpApi = new HttpApi(server);
            httpApi.start();
        } catch (Exception e) {
            Anduril.LOGGER.error("Failed to start Andúril HTTP API: {}", e.getMessage(), e);
            // We deliberately don't rethrow — the MC server can still run
            // without the bridge API, and partial-availability is better
            // than crashing the whole world.
        }
        // TODO: connect to Postgres, register tick scheduler.
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
        // TODO: drain HTTP requests, close DB pool, write final audit event.
    }
}
