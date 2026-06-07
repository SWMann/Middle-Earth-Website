package org.middleearth.anduril.scan;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * An immutable snapshot of every tuning input the scanner needs, read from
 * the {@code config.*} catalogue by {@link ConfigReader}. Held in memory and
 * refreshed on a TTL so a scan never blocks the tick on a Neon round-trip.
 *
 * <p>Keeping all of this in the DB (not hardcoded in Java) is the whole point:
 * staff retune component detection, block tiers, criteria weights, and tier
 * gates without a mod redeploy — exactly how {@code decoration_criteria} and
 * {@code tier_decoration_thresholds} already work for the website.
 */
public record ScanConfig(
    /** criterionId → weight percent (config.decoration_criteria). Sums ~100. */
    Map<String, Integer> criteriaWeights,
    /** settlement tier → gate (config.tier_decoration_thresholds). */
    Map<String, TierThreshold> tierThresholds,
    /** Component detection rules (config.component_blocks). */
    List<ComponentRule> componentRules,
    /** blockId → material tier 'low'|'mid'|'high' (config.block_tiers). */
    Map<String, String> blockTier,
    /** The decorative-block set (config.block_tiers.decorative = true). */
    Set<String> decorativeBlocks,
    /** cultureId → union of all approved palette blocks (config.culture_palettes). */
    Map<String, Set<String>> culturePalettes,
    /** factionId → cultureId (game.factions.culture_id). */
    Map<String, String> factionCulture,
    /** districtTypeId → its validation spec (config.district_types + children). */
    Map<String, DistrictSpec> districts
) {
    /** A row of config.tier_decoration_thresholds. */
    public record TierThreshold(Integer minScore, String reviewMode) {}

    /** A row of config.component_blocks. */
    public record ComponentRule(String componentId, String matchType, String matchValue) {}

    /** A required functional component for a district. */
    public record ReqComponent(String componentId, int count, boolean perCap) {}

    /** A required-building slot for a district (the non-optional ones gate completion). */
    public record ReqBuilding(String slotKey, int count, Integer maxCount, boolean optional) {}

    /**
     * Everything the scorer + validators need about one district type:
     * its size envelope, decoration override, and component/building rules.
     */
    public record DistrictSpec(
        String id,
        Integer minFootprintBlocks,
        Integer maxFootprintBlocks,
        Integer minHeightBlocks,
        Integer decorationThreshold,
        List<ReqComponent> requiredComponents,
        List<ReqBuilding> requiredBuildings
    ) {}

    public boolean isEmpty() {
        return criteriaWeights.isEmpty() && componentRules.isEmpty();
    }
}
