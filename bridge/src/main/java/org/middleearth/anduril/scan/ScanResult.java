package org.middleearth.anduril.scan;

import java.util.List;
import java.util.Map;

/**
 * The full computed outcome of a scan: the score, per-criterion breakdown,
 * component + footprint validation, and the resolved review status. Pure plain
 * data — produced by {@link ScanService} and consumed by {@link PlotRepository}
 * (and serialised into {@code game.plots} / the audit row).
 *
 * <p>The validation records mirror {@code lib/plots/geometry.ts}'s
 * {@code ComponentValidation} / {@code FootprintValidation} 1:1 so the web side
 * reads them without a translation layer.
 */
public record ScanResult(
    ScanContext ctx,
    ScanObservations observations,
    int decorationScore,
    Map<String, Integer> criteriaBreakdown,
    ComponentValidation componentValidation,
    FootprintValidation footprintValidation,
    String reviewStatus,
    String reviewMode
) {
    /** One required-component row: how many were needed vs found. */
    public record ReqComponentResult(
        String componentId, int need, int found, boolean ok, boolean uncertain) {}

    /** Required-component validation: every row + the overall pass/uncertain. */
    public record ComponentValidation(
        List<ReqComponentResult> required, boolean pass, boolean uncertain) {}

    /** One required-building slot: need/max vs found (found null when unverified). */
    public record ReqBuildingResult(
        String slotKey, int need, Integer max, Integer found, boolean ok) {}

    /** Footprint/height/building validation. */
    public record FootprintValidation(
        int areaBlocks, Integer minFootprint, Integer maxFootprint,
        int heightBlocks, Integer minHeight,
        int buildingCount, List<ReqBuildingResult> requiredBuildings,
        boolean buildingsVerified, boolean pass) {}
}
