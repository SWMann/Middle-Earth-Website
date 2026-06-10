package org.middleearth.anduril.scan;

import net.minecraft.block.BlockState;
import net.minecraft.block.MapColor;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.Heightmap;

import java.awt.image.BufferedImage;

/**
 * Renders a top-down, 1-pixel-per-block image of a world region — the same
 * idea as an in-game filled map, used as a crisp underlay for the web
 * floorplanner. Each pixel is the {@link MapColor} of that column's top
 * surface block, shaded by the north-south height step for relief.
 *
 * <p><b>Server-thread only</b> — it reads the live world (heightmaps,
 * block states, map colours). The output {@link BufferedImage} is plain pixel
 * data, so PNG encoding happens off-thread on the HTTP worker.
 */
public final class TopDownRenderer {
    /** Cap the rendered area so a huge request can't stall the tick. */
    public static final long MAX_PIXELS = 1_048_576L; // 1024 × 1024 blocks

    // Relief shading factors (mirrors vanilla map brightness ratios).
    private static final double SHADE_UP = 1.00;   // surface higher than its north neighbour
    private static final double SHADE_FLAT = 0.86;
    private static final double SHADE_DOWN = 0.71; // surface lower than its north neighbour

    /**
     * @throws IllegalArgumentException if the region exceeds {@link #MAX_PIXELS}.
     */
    public BufferedImage render(ServerWorld world, int minX, int minZ, int maxX, int maxZ) {
        int w = maxX - minX + 1;
        int h = maxZ - minZ + 1;
        if ((long) w * h > MAX_PIXELS) {
            throw new IllegalArgumentException(
                "Region is " + ((long) w * h) + " px; the maximum is " + MAX_PIXELS + ".");
        }

        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        BlockPos.Mutable pos = new BlockPos.Mutable();

        for (int z = minZ; z <= maxZ; z++) {
            for (int x = minX; x <= maxX; x++) {
                int topY = world.getTopY(Heightmap.Type.WORLD_SURFACE, x, z);
                int northY = world.getTopY(Heightmap.Type.WORLD_SURFACE, x, z - 1);

                pos.set(x, topY - 1, z);
                BlockState state = world.getBlockState(pos);
                MapColor mapColor = state.getMapColor(world, pos);
                int base = mapColor == null ? 0 : mapColor.color; // 0xRRGGBB

                double shade = topY > northY ? SHADE_UP : (topY < northY ? SHADE_DOWN : SHADE_FLAT);
                img.setRGB(x - minX, z - minZ, shade(base, shade));
            }
        }
        return img;
    }

    private static int shade(int rgb, double factor) {
        int r = clamp((int) (((rgb >> 16) & 0xFF) * factor));
        int g = clamp((int) (((rgb >> 8) & 0xFF) * factor));
        int b = clamp((int) ((rgb & 0xFF) * factor));
        return (r << 16) | (g << 8) | b;
    }

    private static int clamp(int v) {
        return v < 0 ? 0 : (v > 255 ? 255 : v);
    }
}
