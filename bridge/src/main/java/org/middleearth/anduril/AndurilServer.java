package org.middleearth.anduril;

import net.fabricmc.api.DedicatedServerModInitializer;
import net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerChunkEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerLifecycleEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.minecraft.server.MinecraftServer;
import org.middleearth.anduril.link.LinkCodeRepository;
import org.middleearth.anduril.link.LinkCommands;
import org.middleearth.anduril.scan.ConfigReader;
import org.middleearth.anduril.scan.MapTileStore;
import org.middleearth.anduril.scan.WorldMapStore;
import org.middleearth.anduril.scan.PlotRepository;
import org.middleearth.anduril.scan.PlotScanner;
import org.middleearth.anduril.scan.ScanCommands;
import org.middleearth.anduril.scan.ScanService;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

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
    private ConfigReader configReader;
    private ExecutorService scanIo;
    private MapTileStore mapTiles;
    private WorldMapStore worldMap;
    /** Resolved lazily by the command handlers; populated in onStarting. */
    private volatile ScanCommands scanCommands;
    /** Resolved lazily by the /anduril link handler; populated in onStarting. */
    private volatile LinkCommands linkCommands;

    @Override
    public void onInitializeServer() {
        Anduril.LOGGER.info("Andúril server module — registering lifecycle hooks.");

        ServerLifecycleEvents.SERVER_STARTING.register(this::onStarting);
        ServerLifecycleEvents.SERVER_STARTED.register(this::onStarted);
        ServerLifecycleEvents.SERVER_STOPPING.register(this::onStopping);

        // The /anduril command tree must be built at mod-init: a dedicated
        // server constructs its command tree BEFORE SERVER_STARTING fires, so
        // registering the callback in onStarting misses it entirely. Building
        // the tree needs no DB; the handlers resolve the live ScanCommands
        // (created in onStarting) at command-run time.
        CommandRegistrationCallback.EVENT.register(
            (dispatcher, registryAccess, environment) -> {
                ScanCommands.register(dispatcher, () -> scanCommands);
                // Merges /anduril link onto the same root ScanCommands builds.
                LinkCommands.register(dispatcher, () -> linkCommands);
            });
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
        // Decoration scanner components — shared by the in-game /anduril
        // command and the HTTP /plots/{id}/scan endpoint. A dedicated IO pool
        // keeps Neon writes off the tick; a cached ConfigReader keeps the hot
        // path in memory; the /anduril command registers during world load
        // (after this event).
        scanIo = Executors.newFixedThreadPool(2, r -> {
            Thread t = new Thread(r, "anduril-scan-io");
            t.setDaemon(true);
            return t;
        });
        configReader = new ConfigReader(database);
        ScanService scanService = new ScanService();
        PlotScanner plotScanner = new PlotScanner();
        PlotRepository plotRepository = new PlotRepository(database);
        // Publish the live instance for the already-registered command tree.
        this.scanCommands = new ScanCommands(
            server, configReader, scanService, plotScanner, plotRepository, scanIo);
        Anduril.LOGGER.info("Andúril scan command handler ready.");

        // Account-linking: the /anduril link command mints codes; the HTTP
        // /mc-links/redeem endpoint consumes them. Both go through one repo.
        LinkCodeRepository linkCodes = new LinkCodeRepository(database);
        this.linkCommands = new LinkCommands(server, linkCodes, scanIo);
        Anduril.LOGGER.info("Andúril link command handler ready.");

        // World-map tile store (the Xaero's-style website map): every chunk
        // that loads — normal play or the backfill pump — gets its surface
        // captured into PNG tiles; the tick pump drives backfill + flushes.
        mapTiles = new MapTileStore(server.getRunDirectory().resolve("anduril-map"));

        // Canonical world-gen map (biome + height pyramid from the Middle-earth
        // jar). Extracted once on a background thread so it never blocks start
        // or the tick; the HTTP layer serves it read-only once ready.
        worldMap = new WorldMapStore(server.getRunDirectory().resolve("anduril-worldmap"));
        Thread wmExtract = new Thread(worldMap::ensureExtracted, "anduril-worldmap-extract");
        wmExtract.setDaemon(true);
        wmExtract.start();
        ServerChunkEvents.CHUNK_LOAD.register((world, chunk) -> {
            MapTileStore store = mapTiles;
            if (store == null) return;
            try {
                store.onChunkLoaded(world, chunk);
            } catch (Exception e) {
                // Never let map capture interfere with chunk loading.
                Anduril.LOGGER.debug("Map capture failed: {}", e.getMessage());
            }
        });
        ServerTickEvents.END_SERVER_TICK.register(s -> {
            MapTileStore store = mapTiles;
            if (store != null) store.tick(s);
        });

        try {
            httpApi = new HttpApi(server, database, configReader, scanService, plotScanner, plotRepository, linkCodes, mapTiles, worldMap);
            httpApi.start();
        } catch (Exception e) {
            Anduril.LOGGER.error("Failed to start Andúril HTTP API: {}", e.getMessage(), e);
            // HTTP failure is non-fatal: the MC server keeps running and
            // the website will see "bridge offline" until we restart.
        }

        // Warm the config cache off-thread so the first scan never blocks.
        scanIo.submit(() -> {
            try {
                configReader.refresh();
            } catch (Exception e) {
                Anduril.LOGGER.warn("Initial scan-config warm failed: {}", e.getMessage());
            }
        });

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
        // Stop capturing first (events guard on null), then flush tiles.
        if (mapTiles != null) {
            MapTileStore store = mapTiles;
            mapTiles = null;
            store.shutdown();
        }
        // Drain in-flight scan persists before the DB pool closes under them.
        if (scanIo != null) {
            scanIo.shutdown();
            try {
                if (!scanIo.awaitTermination(5, TimeUnit.SECONDS)) {
                    Anduril.LOGGER.warn("Scan IO pool did not drain in 5s; forcing shutdown.");
                    scanIo.shutdownNow();
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            scanIo = null;
            configReader = null;
            scanCommands = null;
        }
        if (database != null) {
            database.close();
            database = null;
        }
    }
}
