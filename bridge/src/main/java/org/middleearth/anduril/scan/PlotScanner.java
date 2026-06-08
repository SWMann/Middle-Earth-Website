package org.middleearth.anduril.scan;

import net.minecraft.block.Block;
import net.minecraft.block.BlockState;
import net.minecraft.registry.Registries;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.util.math.BlockPos;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Reads a plot's blocks into a {@link ScanObservations}. <b>Must run on the
 * server thread</b> — it touches the live world via {@code getBlockState} /
 * {@code getLuminance}. The output is pure plain data, so everything after
 * this (scoring, validation, persistence) can run off-thread without ever
 * crossing the world-access boundary.
 *
 * <p>The box is normalised and clamped to the world's build height by the
 * caller; a hard volume budget guards against a runaway selection stalling
 * the tick.
 */
public final class PlotScanner {
    /** Reject selections larger than this many block positions. */
    public static final long MAX_VOLUME = 4_000_000L;

    /**
     * Read the inclusive box [min..max] into observations.
     *
     * @throws IllegalArgumentException if the box exceeds {@link #MAX_VOLUME}.
     */
    public ScanObservations observe(ServerWorld world,
                                    int minX, int minY, int minZ,
                                    int maxX, int maxY, int maxZ,
                                    ScanConfig config, ComponentDetector detector,
                                    Set<String> cultureBlocks) {
        long volume = (long) (maxX - minX + 1) * (maxY - minY + 1) * (maxZ - minZ + 1);
        if (volume > MAX_VOLUME) {
            throw new IllegalArgumentException(
                "Selection is " + volume + " blocks; the maximum is " + MAX_VOLUME + ".");
        }

        boolean cultureKnown = cultureBlocks != null && !cultureBlocks.isEmpty();
        ScanObservations.Accumulator acc = new ScanObservations.Accumulator(
            minX, minY, minZ, maxX, maxY, maxZ, cultureKnown);

        Set<String> compositeSeen = new HashSet<>();
        Set<String> compositeConfirmed = new HashSet<>();

        for (BlockPos pos : BlockPos.iterate(minX, minY, minZ, maxX, maxY, maxZ)) {
            BlockState state = world.getBlockState(pos);
            if (state.isAir()) continue;

            Block block = state.getBlock();
            String id = Registries.BLOCK.getId(block).toString();

            acc.countNonAir();
            acc.addDistinct(id);
            acc.observeColumnTop(pos.getX(), pos.getZ(), pos.getY(), id);
            if (state.getLuminance() > 0) acc.countLightEmitter();

            if (config.decorativeBlocks().contains(id)) {
                acc.countDecorative();
            } else {
                acc.countStructural();
                String tier = config.blockTier().getOrDefault(id, "mid");
                switch (tier) {
                    case "low" -> acc.countLow();
                    case "high" -> acc.countHigh();
                    default -> acc.countMid();
                }
                if (cultureKnown && cultureBlocks.contains(id)) acc.countThemed();
            }

            Set<String> matched = detector.match(block, state, id);
            for (String c : matched) {
                if (detector.isComposite(c)) {
                    compositeSeen.add(c);
                    acc.markUncertain(c);
                    if (!compositeConfirmed.contains(c)
                            && detector.confirmComposite(world, pos, c, id)) {
                        compositeConfirmed.add(c);
                    }
                } else {
                    acc.addComponent(c, 1);
                }
            }
        }

        // Resolve composites: present (1) only if a neighbourhood check passed.
        for (String c : compositeSeen) {
            acc.setComponent(c, compositeConfirmed.contains(c) ? 1 : 0);
        }

        return acc.build();
    }

    /**
     * Per-building component counts (B.5): for each declared building in a
     * floorplanner layout, read its world sub-region and tally the components
     * found, so {@link FootprintValidator} can confirm the building is really
     * there before counting it. Server-thread only, same as {@link #observe}.
     *
     * @return building uid → (componentId → count)
     */
    public Map<String, Map<String, Integer>> observeBuildings(
            ServerWorld world, List<PlotGeometry.LayoutBuilding> buildings,
            PlotGeometry.Transform t, int minY, int maxY, ComponentDetector detector) {
        Map<String, Map<String, Integer>> out = new HashMap<>();
        for (PlotGeometry.LayoutBuilding b : buildings) {
            int[] box = b.worldBox(t); // minX, minZ, maxX, maxZ
            Map<String, Integer> counts = new HashMap<>();
            long vol = (long) (box[2] - box[0] + 1) * (maxY - minY + 1) * (box[3] - box[1] + 1);
            if (vol <= MAX_VOLUME) {
                for (BlockPos pos : BlockPos.iterate(box[0], minY, box[1], box[2], maxY, box[3])) {
                    BlockState state = world.getBlockState(pos);
                    if (state.isAir()) continue;
                    Block block = state.getBlock();
                    String id = Registries.BLOCK.getId(block).toString();
                    for (String c : detector.match(block, state, id)) {
                        counts.merge(c, 1, Integer::sum);
                    }
                }
            }
            out.put(b.uid(), counts);
        }
        return out;
    }
}
