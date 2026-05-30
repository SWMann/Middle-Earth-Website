package org.middleearth.anduril;

import net.fabricmc.api.ModInitializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Andúril — the Middle-earth server's bridge mod.
 *
 * <p>Runs on both client and server. Server-side functionality (HTTP API,
 * daily tick, DB persistence) is registered in {@link AndurilServer} via
 * the "server" entrypoint. This common initializer just announces presence
 * so we know the mod loaded before any side-specific code runs.
 */
public class Anduril implements ModInitializer {
    public static final String MOD_ID = "anduril";
    public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

    @Override
    public void onInitialize() {
        LOGGER.info("Andúril loading — bridge mod for the Middle-earth server.");
    }
}
