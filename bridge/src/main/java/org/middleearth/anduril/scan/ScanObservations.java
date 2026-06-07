package org.middleearth.anduril.scan;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * The immutable plain-data summary of one world scan — every figure the
 * scorer and validators need, with <b>no Minecraft references</b>. This is
 * the object that crosses the server-thread → IO-thread boundary: the world
 * is read into one of these on the tick, then scoring/validation/persistence
 * run on it anywhere.
 *
 * <p>Built incrementally by {@link Accumulator} during the block pass, then
 * frozen via {@link Accumulator#build}.
 */
public record ScanObservations(
    int minX, int minY, int minZ, int maxX, int maxY, int maxZ,
    /** Footprint columns scanned = width × depth (XZ). */
    int areaBlocks,
    /** maxY − minY + 1. */
    int heightBlocks,
    /** Non-air blocks seen. */
    int nonAirCount,
    /** Distinct non-air block ids. */
    int distinctBlockCount,
    /** Blocks with a light luminance > 0. */
    int lightEmitterCount,
    /** Blocks in the decorative set. */
    int decorativeCount,
    /** Non-air, non-decorative blocks (the denominator for theme/material). */
    int structuralCount,
    int lowTierCount,
    int midTierCount,
    int highTierCount,
    /** Structural blocks whose id is in the faction culture's palette. */
    int themedBlockCount,
    /** Whether a culture was resolved (else theme_adherence is N/A). */
    boolean cultureKnown,
    /** Columns with at least one non-air block. */
    int columnCount,
    /** Standard deviation of per-column top-surface heights. */
    double topHeightStdev,
    /** Distinct block ids appearing as a column's top surface (roof variety). */
    int distinctTopBlockCount,
    /** componentId → count (composites resolved to 0/1). */
    Map<String, Integer> componentCounts,
    /** Components detected with low confidence (composites, proxies). */
    Set<String> uncertainComponents,
    /** True if the iteration budget was hit and the box was not fully read. */
    boolean truncated
) {
    /**
     * Mutable accumulator for the single block pass. Not thread-safe — built
     * and consumed entirely on the server thread inside {@link PlotScanner}.
     */
    public static final class Accumulator {
        final int minX, minY, minZ, maxX, maxY, maxZ;
        final boolean cultureKnown;

        int nonAir = 0;
        int lightEmitters = 0;
        int decorative = 0;
        int structural = 0;
        int low = 0, mid = 0, high = 0;
        int themed = 0;
        boolean truncated = false;

        private final Set<String> distinctIds = new HashSet<>();
        // (x,z) packed → highest non-air Y and that block's id.
        private final Map<Long, Integer> columnTopY = new HashMap<>();
        private final Map<Long, String> columnTopId = new HashMap<>();
        private final Map<String, Integer> componentCounts = new HashMap<>();
        private final Set<String> uncertain = new HashSet<>();

        public Accumulator(int minX, int minY, int minZ, int maxX, int maxY, int maxZ,
                           boolean cultureKnown) {
            this.minX = minX; this.minY = minY; this.minZ = minZ;
            this.maxX = maxX; this.maxY = maxY; this.maxZ = maxZ;
            this.cultureKnown = cultureKnown;
        }

        public void addDistinct(String id) { distinctIds.add(id); }
        public void countNonAir() { nonAir++; }
        public void countLightEmitter() { lightEmitters++; }
        public void countDecorative() { decorative++; }
        public void countStructural() { structural++; }
        public void countLow() { low++; }
        public void countMid() { mid++; }
        public void countHigh() { high++; }
        public void countThemed() { themed++; }
        public void markTruncated() { truncated = true; }

        public void addComponent(String componentId, int n) {
            componentCounts.merge(componentId, n, Integer::sum);
        }
        public void setComponent(String componentId, int n) {
            componentCounts.put(componentId, n);
        }
        public void markUncertain(String componentId) { uncertain.add(componentId); }

        public void observeColumnTop(int x, int z, int y, String id) {
            long key = ((long) x << 32) ^ (z & 0xffffffffL);
            Integer cur = columnTopY.get(key);
            if (cur == null || y > cur) {
                columnTopY.put(key, y);
                columnTopId.put(key, id);
            }
        }

        public ScanObservations build() {
            int area = (maxX - minX + 1) * (maxZ - minZ + 1);
            int height = maxY - minY + 1;

            int n = columnTopY.size();
            double stdev = 0.0;
            if (n > 0) {
                double sum = 0, sumSq = 0;
                for (int v : columnTopY.values()) { sum += v; sumSq += (double) v * v; }
                double mean = sum / n;
                double var = Math.max(0.0, sumSq / n - mean * mean);
                stdev = Math.sqrt(var);
            }
            int distinctTop = new HashSet<>(columnTopId.values()).size();

            return new ScanObservations(
                minX, minY, minZ, maxX, maxY, maxZ,
                area, height, nonAir, distinctIds.size(), lightEmitters,
                decorative, structural, low, mid, high, themed, cultureKnown,
                n, stdev, distinctTop,
                Map.copyOf(componentCounts), Set.copyOf(uncertain), truncated
            );
        }
    }
}
