package org.middleearth.anduril.scan;

import net.minecraft.block.AbstractFurnaceBlock;
import net.minecraft.block.AnvilBlock;
import net.minecraft.block.AbstractBannerBlock;
import net.minecraft.block.BedBlock;
import net.minecraft.block.Block;
import net.minecraft.block.BlockState;
import net.minecraft.block.CampfireBlock;
import net.minecraft.block.DoorBlock;
import net.minecraft.block.FenceGateBlock;
import net.minecraft.block.LecternBlock;
import net.minecraft.registry.RegistryKeys;
import net.minecraft.registry.tag.TagKey;
import net.minecraft.util.Identifier;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Direction;
import net.minecraft.world.World;
import org.middleearth.anduril.Anduril;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Resolves which {@link ScanConfig.ComponentRule}s a block satisfies. Three
 * match kinds:
 * <ul>
 *   <li><b>block_id</b> — exact registry id (fully data-driven).</li>
 *   <li><b>block_tag</b> — a block tag id (data-driven via the tag registry).</li>
 *   <li><b>block_class</b> — a Yarn class name resolved against a fixed
 *       allow-list ({@link #CLASS_REGISTRY}); the only place the scanner names
 *       concrete block classes. A config class outside the list is skipped
 *       (logged), since runtime classes are intermediary-mapped and can't be
 *       reflected by Yarn name.</li>
 * </ul>
 *
 * <p>{@code WELL} and {@code STABLE_STALL} are <i>composite</i>: their trigger
 * block alone is ambiguous (hay bales roof Rohirric houses; water edges a
 * pond), so a neighbourhood check in {@link #confirmComposite} must pass, and
 * the component is always flagged uncertain to bias the plot toward review.
 */
public final class ComponentDetector {
    /** Components whose trigger block needs neighbourhood confirmation. */
    public static final Set<String> COMPOSITE = Set.of("WELL", "STABLE_STALL");

    /** The fixed Yarn-class allow-list for {@code block_class} rules. */
    private static final Map<String, Class<? extends Block>> CLASS_REGISTRY = Map.of(
        "BedBlock", BedBlock.class,
        "DoorBlock", DoorBlock.class,
        "AnvilBlock", AnvilBlock.class,
        "LecternBlock", LecternBlock.class,
        "AbstractBannerBlock", AbstractBannerBlock.class,
        "CampfireBlock", CampfireBlock.class,
        "AbstractFurnaceBlock", AbstractFurnaceBlock.class,
        "FenceGateBlock", FenceGateBlock.class
    );

    private static final String HAY = "minecraft:hay_block";

    private final Map<String, List<String>> byBlockId = new HashMap<>();
    private final List<ClassRule> classRules = new ArrayList<>();
    private final List<TagRule> tagRules = new ArrayList<>();

    private record ClassRule(Class<? extends Block> cls, String componentId) {}
    private record TagRule(TagKey<Block> tag, String componentId) {}

    public ComponentDetector(ScanConfig config) {
        for (ScanConfig.ComponentRule r : config.componentRules()) {
            switch (r.matchType()) {
                case "block_id" ->
                    byBlockId.computeIfAbsent(r.matchValue(), k -> new ArrayList<>())
                        .add(r.componentId());
                case "block_class" -> {
                    Class<? extends Block> cls = CLASS_REGISTRY.get(r.matchValue());
                    if (cls == null) {
                        Anduril.LOGGER.warn(
                            "Scan: unknown block_class '{}' for component {} — skipping. " +
                            "Add it to ComponentDetector.CLASS_REGISTRY to enable.",
                            r.matchValue(), r.componentId());
                    } else {
                        classRules.add(new ClassRule(cls, r.componentId()));
                    }
                }
                case "block_tag" -> {
                    Identifier id = Identifier.tryParse(r.matchValue());
                    if (id == null) {
                        Anduril.LOGGER.warn("Scan: bad block_tag '{}' — skipping.", r.matchValue());
                    } else {
                        tagRules.add(new TagRule(TagKey.of(RegistryKeys.BLOCK, id), r.componentId()));
                    }
                }
                default -> Anduril.LOGGER.warn("Scan: unknown match_type '{}' — skipping.", r.matchType());
            }
        }
    }

    /** Every component id this block satisfies by a simple (non-composite) rule. */
    public Set<String> match(Block block, BlockState state, String blockId) {
        Set<String> out = new HashSet<>();
        List<String> ids = byBlockId.get(blockId);
        if (ids != null) out.addAll(ids);
        for (ClassRule cr : classRules) {
            if (cr.cls.isInstance(block)) out.add(cr.componentId);
        }
        for (TagRule tr : tagRules) {
            if (state.isIn(tr.tag)) out.add(tr.componentId);
        }
        return out;
    }

    public boolean isComposite(String componentId) {
        return COMPOSITE.contains(componentId);
    }

    /**
     * Neighbourhood confirmation for a composite component at {@code pos}.
     * Conservative by design — a false negative routes to staff review, which
     * is the safe failure for an ambiguous structure.
     */
    public boolean confirmComposite(World world, BlockPos pos, String componentId, String blockId) {
        return switch (componentId) {
            case "WELL" -> confirmWell(world, pos);
            case "STABLE_STALL" -> confirmStall(world, pos, blockId);
            default -> false;
        };
    }

    /** A water column framed on (most of) its four sides by solid walls. */
    private boolean confirmWell(World world, BlockPos pos) {
        int walls = 0;
        for (Direction d : Direction.Type.HORIZONTAL) {
            BlockState ns = world.getBlockState(pos.offset(d));
            boolean wall = !ns.isAir() && ns.getFluidState().isEmpty();
            if (wall) walls++;
        }
        return walls >= 3;
    }

    /** A hay bale adjacent to a fence gate (a fenced bay with bedding). */
    private boolean confirmStall(World world, BlockPos pos, String blockId) {
        boolean triggerIsHay = HAY.equals(blockId);
        for (Direction d : Direction.values()) {
            BlockPos np = pos.offset(d);
            BlockState ns = world.getBlockState(np);
            Block nb = ns.getBlock();
            String nid = net.minecraft.registry.Registries.BLOCK.getId(nb).toString();
            if (triggerIsHay) {
                if (nb instanceof FenceGateBlock) return true;
            } else { // trigger is the fence gate
                if (HAY.equals(nid)) return true;
            }
        }
        return false;
    }
}
