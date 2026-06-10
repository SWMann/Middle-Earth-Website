package org.middleearth.anduril.scan;

import net.minecraft.block.BlockState;
import net.minecraft.block.MapColor;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.ChunkPos;
import net.minecraft.world.Heightmap;
import net.minecraft.world.chunk.WorldChunk;
import org.middleearth.anduril.Anduril;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The website's world-map imagery — a server-side take on how Xaero's World
 * Map works. Whenever a chunk is loaded (normal play, or the backfill pump),
 * its 16×16 surface is rendered to map colours <b>on the server thread</b>
 * (microseconds: heightmap + MapColor reads of an already-loaded chunk) and
 * blitted into a 512×512px scale-0 PNG tile (1px per block, 32×32 chunks per
 * tile). Zoom-out tiles compose lazily from scale-0 tiles. HTTP tile requests
 * are served straight from this store — <b>no world access on the request
 * path</b>, so the website can never stall the tick or generate terrain.
 *
 * <p>Threading: captures cross to a single-threaded IO executor as plain
 * {@code int[]} pixels; that one thread does all blits, flushes, and pyramid
 * composition, so no image is ever touched concurrently.
 */
public final class MapTileStore {
    public static final int TILE_PX = 512;
    public static final int CHUNKS_PER_TILE = TILE_PX / 16; // 32
    public static final int MAX_SCALE = 6;

    /**
     * Backfill is fully ASYNC and the pump NEVER reads chunks: it only places
     * FORCED tickets; the chunk system loads on its own workers; the
     * CHUNK_LOAD event both captures the chunk and releases its ticket.
     *
     * <p>Hard-learned rules encoded here: (1) synchronous
     * {@code getChunk(create=true)} loads stalled ticks 5–17s behind and at
     * 16/tick tripped the watchdog; (2) even {@code create=false} getChunk
     * polling is NOT non-blocking under this modpack — VMP's chunk-manager
     * rewrite parked the server thread on an in-progress chunk
     * (getChunkBlocking) until the watchdog killed it. So: tickets out,
     * events in, zero chunk reads from the tick.
     */
    private static final int MAX_INFLIGHT = 32;
    /** New tickets placed per tick (also bounded by MAX_INFLIGHT). */
    private static final int TICKETS_PER_TICK = 8;
    /**
     * Recycle a ticket whose chunk never fired CHUNK_LOAD (e.g. it was
     * already loaded when the ticket was placed — no event will come; its
     * capture already happened at its own load).
     */
    private static final int INFLIGHT_TIMEOUT_TICKS = 200;
    /** Flush dirty tiles every N ticks (~10s). */
    private static final int FLUSH_INTERVAL_TICKS = 200;

    private static final double SHADE_UP = 1.00, SHADE_FLAT = 0.86, SHADE_DOWN = 0.71;
    private static final Pattern REGION_FILE = Pattern.compile("r\\.(-?\\d+)\\.(-?\\d+)\\.mca");

    private final Path baseDir;
    private final ExecutorService io = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "anduril-map-io");
        t.setDaemon(true);
        return t;
    });

    /** Dirty scale-0 tiles, keyed "dimSafe/tx/tz". Touched only on the io thread. */
    private final Map<String, BufferedImage> dirty = new HashMap<>();

    // Backfill queue + in-flight tickets (server thread only).
    private final Deque<ChunkPos> backfillQueue = new ArrayDeque<>();
    private final Map<Long, Integer> inFlight = new HashMap<>(); // packed pos → ticks waited
    private String backfillDim = null;
    private final AtomicLong capturedChunks = new AtomicLong();
    private final AtomicLong backfillRemaining = new AtomicLong();
    private int tickCounter = 0;

    public MapTileStore(Path baseDir) {
        this.baseDir = baseDir;
    }

    // ------------------------------------------------------------------
    // Capture (server thread → io thread)
    // ------------------------------------------------------------------

    /**
     * The CHUNK_LOAD entry point: capture the chunk and, if it was one of the
     * backfill's in-flight requests, release its ticket. Server thread.
     */
    public void onChunkLoaded(ServerWorld world, WorldChunk chunk) {
        captureChunk(world, chunk);
        ChunkPos cp = chunk.getPos();
        if (world.getRegistryKey().getValue().toString().equals(backfillDim)
                && inFlight.remove(cp.toLong()) != null) {
            world.getChunkManager().removeTicket(
                net.minecraft.server.world.ChunkTicketType.FORCED, cp, 0, cp);
        }
    }

    /** Render a loaded chunk's surface and queue the blit. Server thread. */
    public void captureChunk(ServerWorld world, WorldChunk chunk) {
        ChunkPos cp = chunk.getPos();
        int[] argb = renderChunkColors(chunk);
        String dimSafe = safeDim(world.getRegistryKey().getValue().toString());
        long n = capturedChunks.incrementAndGet();
        if (n % 25_600 == 0) {
            Anduril.LOGGER.info("Map capture: {} chunks captured (queue {}).", n, backfillRemaining.get());
        }
        io.submit(() -> blit(dimSafe, cp.x, cp.z, argb));
    }

    /**
     * 16×16 ARGB surface colours of one chunk: each column's top-block
     * MapColor, shaded by the north height step (vanilla-map style). Columns
     * with no blocks are transparent.
     *
     * <p><b>Reads only the chunk it was given</b> — never the world or a
     * neighbouring chunk. CHUNK_LOAD fires while the chunk system is mid-load
     * (including spawn preparation at boot), and any call back into
     * {@code world.getChunk} from there can deadlock the server thread.
     * The cost is flat shading on each chunk's northernmost row.
     */
    private static int[] renderChunkColors(WorldChunk chunk) {
        int[] out = new int[256];
        BlockPos.Mutable pos = new BlockPos.Mutable();
        ChunkPos cp = chunk.getPos();
        int bottom = chunk.getBottomY();

        int[] prevRow = new int[16]; // heights of row z-1; MIN_VALUE = unknown
        java.util.Arrays.fill(prevRow, Integer.MIN_VALUE);

        for (int lz = 0; lz < 16; lz++) {
            for (int lx = 0; lx < 16; lx++) {
                int top = chunk.sampleHeightmap(Heightmap.Type.WORLD_SURFACE, lx, lz);
                if (top < bottom) { // empty column
                    prevRow[lx] = top;
                    continue;
                }
                pos.set(cp.getStartX() + lx, top, cp.getStartZ() + lz);
                BlockState state = chunk.getBlockState(pos);
                MapColor color = state.getMapColor(chunk, pos);
                int base = color == null ? 0 : color.color;
                if (base == 0) { // MapColor.CLEAR (air-ish) — try one below
                    pos.setY(top - 1);
                    if (top - 1 >= bottom) {
                        state = chunk.getBlockState(pos);
                        color = state.getMapColor(chunk, pos);
                        base = color == null ? 0 : color.color;
                    }
                }

                int prev = prevRow[lx];
                double shade = prev == Integer.MIN_VALUE ? SHADE_FLAT
                    : (top > prev ? SHADE_UP : (top < prev ? SHADE_DOWN : SHADE_FLAT));
                out[lz * 16 + lx] = base == 0 ? 0 : (0xFF000000 | shadeRgb(base, shade));
                prevRow[lx] = top;
            }
        }
        return out;
    }

    /** Blit one chunk's 16×16 pixels into its scale-0 tile. IO thread only. */
    private void blit(String dimSafe, int chunkX, int chunkZ, int[] argb) {
        int tx = Math.floorDiv(chunkX, CHUNKS_PER_TILE);
        int tz = Math.floorDiv(chunkZ, CHUNKS_PER_TILE);
        int ox = Math.floorMod(chunkX, CHUNKS_PER_TILE) * 16;
        int oz = Math.floorMod(chunkZ, CHUNKS_PER_TILE) * 16;
        String key = dimSafe + "/" + tx + "/" + tz;

        BufferedImage tile = dirty.get(key);
        if (tile == null) {
            tile = loadTile(tilePath(dimSafe, 0, tx, tz));
            if (tile == null) {
                tile = new BufferedImage(TILE_PX, TILE_PX, BufferedImage.TYPE_INT_ARGB);
            }
            dirty.put(key, tile);
        }
        tile.setRGB(ox, oz, 16, 16, argb, 0, 16);
    }

    // ------------------------------------------------------------------
    // Tick pump: backfill + periodic flush (server thread)
    // ------------------------------------------------------------------

    public void tick(MinecraftServer server) {
        tickCounter++;
        if (tickCounter % FLUSH_INTERVAL_TICKS == 0) {
            io.submit(this::flushDirty);
        }
        if (backfillQueue.isEmpty() || backfillDim == null) return;

        ServerWorld world = null;
        for (ServerWorld w : server.getWorlds()) {
            if (w.getRegistryKey().getValue().toString().equals(backfillDim)) {
                world = w;
                break;
            }
        }
        if (world == null) {
            backfillQueue.clear();
            inFlight.clear();
            backfillRemaining.set(0);
            return;
        }

        // 1) Timeout sweep — counters only; NEVER read chunks here (see class
        //    note: getChunk from the tick parks the server thread under VMP).
        //    CHUNK_LOAD (onChunkLoaded) is what normally clears in-flight.
        var it = inFlight.entrySet().iterator();
        while (it.hasNext()) {
            var e = it.next();
            int waited = e.getValue() + 1;
            e.setValue(waited);
            if (waited > INFLIGHT_TIMEOUT_TICKS) {
                ChunkPos cp = new ChunkPos(e.getKey());
                world.getChunkManager().removeTicket(
                    net.minecraft.server.world.ChunkTicketType.FORCED, cp, 0, cp);
                it.remove();
            }
        }

        // 2) Fill: place new tickets; the chunk system loads them async.
        for (int i = 0; i < TICKETS_PER_TICK && inFlight.size() < MAX_INFLIGHT && !backfillQueue.isEmpty(); i++) {
            ChunkPos cp = backfillQueue.poll();
            backfillRemaining.decrementAndGet();
            world.getChunkManager().addTicket(net.minecraft.server.world.ChunkTicketType.FORCED, cp, 0, cp);
            inFlight.put(cp.toLong(), 0);
        }

        if (backfillQueue.isEmpty() && inFlight.isEmpty() && backfillDim != null) {
            backfillDim = null;
            Anduril.LOGGER.info("Map backfill complete ({} chunks captured total).", capturedChunks.get());
            io.submit(this::flushDirty);
        }
    }

    /**
     * Enumerate every chunk position of every EXISTING region file — the
     * backfill never generates terrain beyond region-file extents. Pure file
     * IO; call on any worker thread. Returns null if the dir is missing.
     */
    public static List<ChunkPos> listRegionChunks(Path regionDir) {
        if (!Files.isDirectory(regionDir)) return null;
        List<ChunkPos> all = new ArrayList<>();
        try (var stream = Files.list(regionDir)) {
            stream.forEach(p -> {
                Matcher m = REGION_FILE.matcher(p.getFileName().toString());
                if (!m.matches()) return;
                int rx = Integer.parseInt(m.group(1));
                int rz = Integer.parseInt(m.group(2));
                for (int cz = 0; cz < 32; cz++) {
                    for (int cx = 0; cx < 32; cx++) {
                        all.add(new ChunkPos(rx * 32 + cx, rz * 32 + cz));
                    }
                }
            });
        } catch (IOException e) {
            Anduril.LOGGER.error("Backfill region listing failed: {}", e.getMessage(), e);
            return null;
        }
        return all;
    }

    /** Adopt a prepared chunk list as the backfill queue. Server thread. */
    public void adoptBackfill(ServerWorld world, List<ChunkPos> chunks) {
        backfillQueue.clear();
        backfillQueue.addAll(chunks);
        backfillDim = world.getRegistryKey().getValue().toString();
        backfillRemaining.set(chunks.size());
        Anduril.LOGGER.info("Map backfill queued: {} chunks of {} ({} regions).",
            chunks.size(), backfillDim, chunks.size() / 1024);
    }

    public void cancelBackfill() {
        backfillQueue.clear();
        backfillRemaining.set(0);
    }

    public long backfillRemaining() {
        return backfillRemaining.get();
    }

    public long capturedChunks() {
        return capturedChunks.get();
    }

    // ------------------------------------------------------------------
    // Serving (HTTP worker → io thread)
    // ------------------------------------------------------------------

    /**
     * PNG bytes for a tile, composing zoom-out levels as needed. Runs on the
     * io thread (serialised with blits); returns null when nothing is mapped
     * there. Call from an HTTP worker via {@link #requestTile}.
     */
    public Future<byte[]> requestTile(String dim, int scale, int tx, int tz) {
        String dimSafe = safeDim(dim);
        return io.submit(() -> {
            flushDirty(); // make pending captures visible to composition
            Path p = ensureTile(dimSafe, scale, tx, tz);
            if (p == null) return null;
            return Files.readAllBytes(p);
        });
    }

    /** Ensure the tile file exists and is current; null if empty area. IO thread. */
    private Path ensureTile(String dimSafe, int scale, int tx, int tz) throws IOException {
        Path path = tilePath(dimSafe, scale, tx, tz);
        if (scale == 0) {
            return Files.exists(path) ? path : null;
        }
        // Compose from the four scale-1 children, recursively.
        Path[] children = new Path[4];
        long newestChild = -1;
        boolean any = false;
        for (int i = 0; i < 4; i++) {
            int cx = tx * 2 + (i & 1);
            int cz = tz * 2 + (i >> 1);
            Path c = ensureTile(dimSafe, scale - 1, cx, cz);
            children[i] = c;
            if (c != null) {
                any = true;
                long mt = Files.getLastModifiedTime(c).toMillis();
                if (mt > newestChild) newestChild = mt;
            }
        }
        if (!any) return null;
        if (Files.exists(path) && Files.getLastModifiedTime(path).toMillis() >= newestChild) {
            return path;
        }
        BufferedImage out = new BufferedImage(TILE_PX, TILE_PX, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = out.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        for (int i = 0; i < 4; i++) {
            if (children[i] == null) continue;
            BufferedImage child = loadTile(children[i]);
            if (child == null) continue;
            int half = TILE_PX / 2;
            g.drawImage(child, (i & 1) * half, (i >> 1) * half, half, half, null);
        }
        g.dispose();
        writeTile(path, out);
        return path;
    }

    // ------------------------------------------------------------------
    // IO helpers (io thread only)
    // ------------------------------------------------------------------

    private void flushDirty() {
        if (dirty.isEmpty()) return;
        int n = 0;
        for (Map.Entry<String, BufferedImage> e : dirty.entrySet()) {
            String[] parts = e.getKey().split("/");
            try {
                writeTile(tilePath(parts[0], 0, Integer.parseInt(parts[1]), Integer.parseInt(parts[2])), e.getValue());
                n++;
            } catch (IOException ex) {
                Anduril.LOGGER.error("Tile flush failed for {}: {}", e.getKey(), ex.getMessage());
            }
        }
        dirty.clear();
        Anduril.LOGGER.debug("Flushed {} map tiles.", n);
    }

    private Path tilePath(String dimSafe, int scale, int tx, int tz) {
        return baseDir.resolve(dimSafe).resolve(String.valueOf(scale)).resolve(tx + "_" + tz + ".png");
    }

    private static BufferedImage loadTile(Path p) {
        if (p == null || !Files.exists(p)) return null;
        try {
            BufferedImage img = ImageIO.read(p.toFile());
            if (img == null) return null;
            // Normalise to ARGB so setRGB/compose keep alpha.
            if (img.getType() != BufferedImage.TYPE_INT_ARGB) {
                BufferedImage copy = new BufferedImage(TILE_PX, TILE_PX, BufferedImage.TYPE_INT_ARGB);
                Graphics2D g = copy.createGraphics();
                g.drawImage(img, 0, 0, null);
                g.dispose();
                return copy;
            }
            return img;
        } catch (IOException e) {
            return null;
        }
    }

    private static void writeTile(Path path, BufferedImage img) throws IOException {
        Files.createDirectories(path.getParent());
        Path tmp = path.resolveSibling(path.getFileName() + ".tmp");
        ByteArrayOutputStream baos = new ByteArrayOutputStream(64 * 1024);
        ImageIO.write(img, "png", baos);
        Files.write(tmp, baos.toByteArray());
        Files.move(tmp, path, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
    }

    public void shutdown() {
        io.submit(this::flushDirty);
        io.shutdown();
        try {
            if (!io.awaitTermination(10, TimeUnit.SECONDS)) {
                Anduril.LOGGER.warn("Map tile IO did not drain in 10s.");
                io.shutdownNow();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    static String safeDim(String dim) {
        return dim.replace(':', '_').replace('/', '_');
    }

    private static int shadeRgb(int rgb, double f) {
        int r = Math.min(255, (int) (((rgb >> 16) & 0xFF) * f));
        int g = Math.min(255, (int) (((rgb >> 8) & 0xFF) * f));
        int b = Math.min(255, (int) ((rgb & 0xFF) * f));
        return (r << 16) | (g << 8) | b;
    }
}
