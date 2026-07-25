package org.middleearth.anduril.scan;

import net.fabricmc.loader.api.FabricLoader;
import net.fabricmc.loader.api.ModContainer;
import org.middleearth.anduril.Anduril;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Optional;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Serves the upstream Middle-earth mod's <b>canonical world-gen map</b> — the
 * biome and height image pyramid the mod itself renders terrain from — as web
 * map tiles. Unlike {@link MapTileStore} (which renders only chunks players
 * have actually generated), this covers <em>all</em> of Middle-earth, so the
 * website's world map shows the whole world regardless of what's been visited.
 *
 * <p>The mod ships the pyramid as a nested zip inside its jar at
 * {@code assets/middle-earth/textures/map_data/<version>.zip}, containing
 * {@code <version>/{biomes,heights}/i_<level>/<col>_<row>.png}. On first run we
 * extract it once (off the server thread) to
 * {@code <runDir>/anduril-worldmap/{biomes,heights}/i_<level>/<col>_<row>.png}
 * and thereafter serve those files straight off disk — no mod access on the
 * request path.
 *
 * <p><b>Coordinate system</b> (from the mod's {@code MiddleEarthMapConfigs} /
 * {@code MiddleEarthMapUtils}): tiles are {@value #TILE_PX}px square
 * ({@code REGION_SIZE}); there are {@code MAP_ITERATION}+1 levels
 * ({@code i_0}..{@code i_}{@value #MAX_LEVEL}); the finest level is
 * {@value #BLOCKS_PER_PX_FINEST} blocks/px ({@code PIXEL_WEIGHT}). World
 * {@code (0,0)} is the map's top-left corner and the full map is
 * {@value #WORLD_SIZE} blocks square. At level {@code L} the grid is
 * {@code 2^L}×{@code 2^L} tiles, one pixel is {@code 32 / 2^L} blocks, and one
 * tile spans {@code TILE_PX} px. {@code +x} is east, {@code +z} is south —
 * matching image right/down.
 */
public final class WorldMapStore {
    /** Pixels per tile image ({@code REGION_SIZE}). */
    public static final int TILE_PX = 3000;
    /** Finest zoom level index ({@code MAP_ITERATION}); levels are 0..MAX_LEVEL. */
    public static final int MAX_LEVEL = 3;
    /** Blocks per pixel at the finest level ({@code PIXEL_WEIGHT}). */
    public static final int BLOCKS_PER_PX_FINEST = 4;
    /** Full map edge in blocks: TILE_PX * 2^MAX_LEVEL * BLOCKS_PER_PX_FINEST = 96000. */
    public static final int WORLD_SIZE = TILE_PX * (1 << MAX_LEVEL) * BLOCKS_PER_PX_FINEST;

    private final Path cacheDir;
    private volatile boolean ready = false;

    public WorldMapStore(Path cacheDir) {
        this.cacheDir = cacheDir;
    }

    /**
     * Extract the pyramid from the Middle-earth jar if not already cached.
     * Idempotent and safe to call on a background thread; never touches the
     * server thread or the tick.
     */
    public void ensureExtracted() {
        try {
            Path marker = cacheDir.resolve(".extracted");
            if (Files.exists(marker)) {
                ready = true;
                Anduril.LOGGER.info("World-gen map: using cached tiles at {}.", cacheDir);
                return;
            }
            Optional<ModContainer> me = FabricLoader.getInstance().getModContainer("middle-earth");
            if (me.isEmpty()) {
                Anduril.LOGGER.warn("World-gen map: 'middle-earth' mod not present; world map layer unavailable.");
                return;
            }
            Path zip = findMapDataZip(me.get());
            if (zip == null) {
                Anduril.LOGGER.warn("World-gen map: no map_data zip found in the Middle-earth jar.");
                return;
            }
            Files.createDirectories(cacheDir);
            int n = extract(zip);
            Files.writeString(marker, "tiles=" + n + "\n");
            ready = true;
            Anduril.LOGGER.info("World-gen map: extracted {} tiles from {} to {}.",
                n, zip.getFileName(), cacheDir);
        } catch (Exception e) {
            Anduril.LOGGER.error("World-gen map extraction failed: {}", e.getMessage(), e);
        }
    }

    /** Locate the map_data/*.zip inside the mod jar's resource roots. */
    private Path findMapDataZip(ModContainer mc) throws IOException {
        for (Path root : mc.getRootPaths()) {
            Path dir = root.resolve("assets/middle-earth/textures/map_data");
            if (!Files.isDirectory(dir)) continue;
            try (var s = Files.list(dir)) {
                Optional<Path> zip = s
                    .filter(p -> p.getFileName().toString().toLowerCase().endsWith(".zip"))
                    .findFirst();
                if (zip.isPresent()) return zip.get();
            }
        }
        return null;
    }

    /**
     * Extract the nested zip to {@code cacheDir}, stripping the leading
     * {@code <version>/} folder so paths become {@code <layer>/i_<n>/c_r.png}.
     * Guards against zip-slip.
     */
    private int extract(Path zip) throws IOException {
        int count = 0;
        try (InputStream in = Files.newInputStream(zip);
             ZipInputStream zin = new ZipInputStream(in)) {
            ZipEntry e;
            while ((e = zin.getNextEntry()) != null) {
                if (e.isDirectory()) continue;
                String name = e.getName();                 // <version>/biomes/i_0/0_0.png
                int slash = name.indexOf('/');
                String rel = slash >= 0 ? name.substring(slash + 1) : name;
                if (!rel.endsWith(".png")) continue;
                Path out = cacheDir.resolve(rel).normalize();
                if (!out.startsWith(cacheDir)) continue;   // zip-slip guard
                Path parent = out.getParent();
                if (parent != null) Files.createDirectories(parent);
                Files.copy(zin, out, StandardCopyOption.REPLACE_EXISTING);
                count++;
            }
        }
        return count;
    }

    public boolean isReady() {
        return ready;
    }

    /**
     * Return the PNG bytes of one world-gen tile, or {@code null} if the layer
     * is unknown, the level/col/row is out of range, the tile is absent, or
     * extraction hasn't completed. {@code layer} is {@code biomes} or
     * {@code heights}; grid at level {@code L} is {@code 2^L}×{@code 2^L}.
     */
    public byte[] tile(String layer, int level, int col, int row) throws IOException {
        if (!ready) return null;
        if (!("biomes".equals(layer) || "heights".equals(layer))) return null;
        if (level < 0 || level > MAX_LEVEL) return null;
        int perAxis = 1 << level;
        if (col < 0 || row < 0 || col >= perAxis || row >= perAxis) return null;
        Path f = cacheDir.resolve(layer)
            .resolve("i_" + level)
            .resolve(col + "_" + row + ".png")
            .normalize();
        if (!f.startsWith(cacheDir) || !Files.isRegularFile(f)) return null;
        return Files.readAllBytes(f);
    }
}
