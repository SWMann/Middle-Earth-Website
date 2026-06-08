package org.middleearth.anduril.scan;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;

/**
 * The Java twin of {@code lib/plots/geometry.ts}: the image/grid↔block
 * projection and the layout shapes the floorplanner saves. Kept in lockstep
 * with the TS module (90°-snapped rotation → exact integer math) so a plot
 * authored on the web projects to the same world blocks the scanner reads.
 */
public final class PlotGeometry {
    private PlotGeometry() {}

    /** Mirrors PlotTransform: grid cell → world block. */
    public record Transform(int originBlockX, int originBlockZ, int baseY, int blocksPerCell, int rotationDeg) {
        /** Grid cell (min corner) → world block (X, Z). */
        public int[] cellToBlock(int cx, int cz) {
            int[] r = rotate(cx, cz, rotationDeg);
            return new int[]{ originBlockX + r[0] * blocksPerCell, originBlockZ + r[1] * blocksPerCell };
        }

        static int[] rotate(int cx, int cz, int deg) {
            int d = ((deg % 360) + 360) % 360;
            return switch (d) {
                case 90 -> new int[]{ -cz, cx };
                case 180 -> new int[]{ -cx, -cz };
                case 270 -> new int[]{ cz, -cx };
                default -> new int[]{ cx, cz };
            };
        }

        public static Transform from(JsonNode n) {
            if (n == null || n.isNull()) return null;
            return new Transform(
                n.path("originBlockX").asInt(0),
                n.path("originBlockZ").asInt(0),
                n.path("baseY").asInt(64),
                Math.max(1, n.path("blocksPerCell").asInt(1)),
                n.path("rotationDeg").asInt(0));
        }
    }

    /** A building footprint in grid-cell space (rect form). */
    public record LayoutBuilding(String uid, String buildingTypeId, int cx, int cz, int w, int h) {
        /** World block AABB of this building's footprint under a transform. */
        public int[] worldBox(Transform t) {
            // Project all four corner cells (rotation may swap axes), then expand
            // each by blocksPerCell so the box covers full cells.
            int[][] corners = {
                t.cellToBlock(cx, cz),
                t.cellToBlock(cx + w - 1, cz),
                t.cellToBlock(cx, cz + h - 1),
                t.cellToBlock(cx + w - 1, cz + h - 1),
            };
            int minX = Integer.MAX_VALUE, minZ = Integer.MAX_VALUE, maxX = Integer.MIN_VALUE, maxZ = Integer.MIN_VALUE;
            for (int[] c : corners) {
                minX = Math.min(minX, c[0]);
                minZ = Math.min(minZ, c[1]);
                maxX = Math.max(maxX, c[0]);
                maxZ = Math.max(maxZ, c[1]);
            }
            return new int[]{ minX, minZ, maxX + t.blocksPerCell() - 1, maxZ + t.blocksPerCell() - 1 };
        }
    }

    /** Extract the rect buildings from a saved layout jsonb (skips non-rect). */
    public static List<LayoutBuilding> buildingsFrom(JsonNode layout) {
        List<LayoutBuilding> out = new ArrayList<>();
        if (layout == null || layout.isNull()) return out;
        JsonNode buildings = layout.path("buildings");
        if (!buildings.isArray()) return out;
        for (JsonNode b : buildings) {
            if (!"rect".equals(b.path("shape").asText("")) || !b.has("rect")) continue;
            JsonNode r = b.get("rect");
            out.add(new LayoutBuilding(
                b.path("uid").asText(""),
                b.path("buildingTypeId").asText(""),
                r.path("cx").asInt(0),
                r.path("cz").asInt(0),
                Math.max(1, r.path("w").asInt(1)),
                Math.max(1, r.path("h").asInt(1))));
        }
        return out;
    }
}
