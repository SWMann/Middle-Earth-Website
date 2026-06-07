package org.middleearth.anduril.scan;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Turns {@link ScanObservations} into a 0–100 decoration score and a
 * per-criterion breakdown. Pure and primitive-in — no world, no DB — so it is
 * trivially unit-testable and identical on the command and HTTP paths.
 *
 * <p>The eight criteria mirror {@code config.decoration_criteria}; their
 * <b>weights</b> come from that table (live-tunable). A criterion that doesn't
 * apply to this build (no culture for theme, no requirements for furnishing,
 * no size envelope for scale, no structural blocks for material) returns
 * {@code null} and is dropped from the weighted average, which is renormalised
 * over the criteria that do apply.
 *
 * <p>The response-curve constants below are the one thing still hardcoded; they
 * are conservative defaults and can migrate to a {@code config.scan_tuning}
 * table later without touching callers.
 */
public final class DecorationScorer {
    // Response curves (tunable; see class note).
    private static final double VARIETY_K = 2.5;             // distinct types per √area for full marks
    private static final double LIGHT_AREA_PER_EMITTER = 25; // 1 emitter / 25 footprint blocks
    private static final double VERT_TARGET_STDEV = 4.0;     // 4-block height spread = full
    private static final double ROOF_VARIETY_K = 1.5;        // distinct roof blocks per √area
    private static final double DECOR_AREA_PER_BLOCK = 20;   // 1 decorative / 20 footprint blocks
    private static final double TIER_LOW = 0.30, TIER_MID = 0.65, TIER_HIGH = 1.00;

    /** Canonical criterion order for a stable breakdown. */
    private static final String[] CRITERIA = {
        "block_variety", "light_density", "vertical_interest", "decoration_density",
        "theme_adherence", "furnishing_completeness", "scale_appropriateness", "material_quality"
    };

    /** The scored output: a per-criterion 0–100 map plus the weighted total. */
    public record Scored(Map<String, Integer> breakdown, int total) {}

    public Scored score(ScanObservations o, ScanConfig cfg, ScanConfig.DistrictSpec spec) {
        Map<String, Double> raw = new LinkedHashMap<>();
        for (String id : CRITERIA) {
            Double v = switch (id) {
                case "block_variety" -> blockVariety(o);
                case "light_density" -> lightDensity(o);
                case "vertical_interest" -> verticalInterest(o);
                case "decoration_density" -> decorationDensity(o);
                case "theme_adherence" -> themeAdherence(o);
                case "furnishing_completeness" -> furnishing(o, spec);
                case "scale_appropriateness" -> scale(o, spec);
                case "material_quality" -> materialQuality(o);
                default -> null;
            };
            if (v != null) raw.put(id, clamp(v));
        }

        Map<String, Integer> breakdown = new LinkedHashMap<>();
        double weighted = 0, weightSum = 0;
        for (Map.Entry<String, Double> e : raw.entrySet()) {
            int w = cfg.criteriaWeights().getOrDefault(e.getKey(), 0);
            breakdown.put(e.getKey(), (int) Math.round(e.getValue()));
            weighted += w * e.getValue();
            weightSum += w;
        }
        int total = weightSum > 0 ? (int) Math.round(weighted / weightSum) : 0;
        return new Scored(breakdown, total);
    }

    private static double area(ScanObservations o) { return Math.max(1, o.areaBlocks()); }

    private Double blockVariety(ScanObservations o) {
        if (o.nonAirCount() == 0) return 0.0;
        double expected = VARIETY_K * Math.sqrt(area(o));
        return o.distinctBlockCount() / expected * 100.0;
    }

    private Double lightDensity(ScanObservations o) {
        double target = Math.max(1.0, area(o) / LIGHT_AREA_PER_EMITTER);
        return o.lightEmitterCount() / target * 100.0;
    }

    private Double verticalInterest(ScanObservations o) {
        if (o.columnCount() == 0) return 0.0;
        double stdevComp = clamp(o.topHeightStdev() / VERT_TARGET_STDEV * 100.0);
        double roofExpected = ROOF_VARIETY_K * Math.sqrt(area(o));
        double roofComp = clamp(o.distinctTopBlockCount() / roofExpected * 100.0);
        return 0.6 * stdevComp + 0.4 * roofComp;
    }

    private Double decorationDensity(ScanObservations o) {
        double target = Math.max(1.0, area(o) / DECOR_AREA_PER_BLOCK);
        return o.decorativeCount() / target * 100.0;
    }

    private Double themeAdherence(ScanObservations o) {
        if (!o.cultureKnown() || o.structuralCount() == 0) return null;
        return (double) o.themedBlockCount() / o.structuralCount() * 100.0;
    }

    private Double furnishing(ScanObservations o, ScanConfig.DistrictSpec spec) {
        if (spec == null || spec.requiredComponents().isEmpty()) return null;
        int satisfied = 0;
        for (ScanConfig.ReqComponent rc : spec.requiredComponents()) {
            int need = Math.max(1, rc.count()); // per-cap cap is unknown here; base count
            if (o.componentCounts().getOrDefault(rc.componentId(), 0) >= need) satisfied++;
        }
        return (double) satisfied / spec.requiredComponents().size() * 100.0;
    }

    private Double scale(ScanObservations o, ScanConfig.DistrictSpec spec) {
        if (spec == null) return null;
        boolean hasArea = spec.minFootprintBlocks() != null || spec.maxFootprintBlocks() != null;
        boolean hasHeight = spec.minHeightBlocks() != null;
        if (!hasArea && !hasHeight) return null;

        double sum = 0; int parts = 0;
        if (hasArea) {
            int a = o.areaBlocks();
            double s;
            Integer min = spec.minFootprintBlocks(), max = spec.maxFootprintBlocks();
            if (min != null && a < min) {
                s = (double) a / min * 100.0;
            } else if (max != null && a > max) {
                s = 100.0 - (double) (a - max) / max * 100.0;
            } else {
                s = 100.0;
            }
            sum += clamp(s); parts++;
        }
        if (hasHeight) {
            int h = o.heightBlocks();
            int min = spec.minHeightBlocks();
            double s = h >= min ? 100.0 : (double) h / min * 100.0;
            sum += clamp(s); parts++;
        }
        return parts == 0 ? null : sum / parts;
    }

    private Double materialQuality(ScanObservations o) {
        int s = o.structuralCount();
        if (s == 0) return null;
        double quality = (TIER_LOW * o.lowTierCount()
            + TIER_MID * o.midTierCount()
            + TIER_HIGH * o.highTierCount()) / s;
        return quality * 100.0;
    }

    private static double clamp(double v) { return Math.max(0.0, Math.min(100.0, v)); }
}
