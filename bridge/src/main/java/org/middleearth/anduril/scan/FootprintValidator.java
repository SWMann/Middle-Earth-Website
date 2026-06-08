package org.middleearth.anduril.scan;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Validates a plot's size envelope (footprint area + height) and, when a
 * building layout was verified in-world, its required-building slots.
 *
 * <p><b>Building-count honesty (plan B.5):</b> a declared building is only
 * trusted once its components are verified present in its sub-region — which
 * needs a floorplanner layout (Phase E reads each building's box). On the
 * command/box path there is no layout, so {@code buildingsVerified} is false,
 * every required-building slot reports {@code found = null}, and the gate
 * routes the plot to staff review rather than guessing a count.
 */
public final class FootprintValidator {

    /**
     * The outcome of verifying a layout's buildings against the world.
     * {@code verifiedByType} counts verified buildings per catalogue id so
     * specific required slots can be matched; {@code verifiedCount} is the
     * total. A {@code null} BuildingVerification means "no layout" (command
     * path) — building count stays unverifiable.
     */
    public record BuildingVerification(int verifiedCount, Map<String, Integer> verifiedByType) {}

    public ScanResult.FootprintValidation validate(
            ScanObservations o, ScanConfig.DistrictSpec spec, BuildingVerification bv) {
        Integer minF = spec != null ? spec.minFootprintBlocks() : null;
        Integer maxF = spec != null ? spec.maxFootprintBlocks() : null;
        Integer minH = spec != null ? spec.minHeightBlocks() : null;

        int area = o.areaBlocks();
        int height = o.heightBlocks();

        boolean footprintOk = (minF == null || area >= minF) && (maxF == null || area <= maxF);
        boolean heightOk = (minH == null) || height >= minH;

        boolean buildingsVerified = bv != null;
        int buildingCount = bv != null ? bv.verifiedCount() : 0;

        List<ScanResult.ReqBuildingResult> rows = new ArrayList<>();
        boolean buildingsOk = true;
        if (spec != null) {
            for (ScanConfig.ReqBuilding rb : spec.requiredBuildings()) {
                if (rb.optional()) continue;
                Integer found;
                boolean ok;
                if (bv == null) {
                    found = null;       // unverifiable without a layout
                    ok = false;
                } else {
                    found = rb.buildingTypeId() != null
                        ? bv.verifiedByType().getOrDefault(rb.buildingTypeId(), 0)
                        : bv.verifiedCount();   // group/themed slot: any verified building
                    ok = found >= rb.count();
                    if (!ok) buildingsOk = false;
                }
                rows.add(new ScanResult.ReqBuildingResult(
                    rb.slotKey(), rb.count(), rb.maxCount(), found, ok));
            }
        }

        // Geometry pass folds in building satisfaction ONLY when we could
        // verify it; on the command path building count never blocks the
        // geometry pass (the gate already forces review via buildingsVerified).
        boolean pass = footprintOk && heightOk && (bv == null || buildingsOk);

        return new ScanResult.FootprintValidation(
            area, minF, maxF, height, minH, buildingCount, rows, buildingsVerified, pass);
    }
}
