package org.middleearth.anduril.scan;

import java.util.ArrayList;
import java.util.List;

/**
 * Validates a plot's size envelope (footprint area + height) and, when a
 * building layout is available, its required-building slots.
 *
 * <p><b>Building-count honesty (plan B.5):</b> a declared building is only
 * trusted once its components are verified present in its sub-region — which
 * needs a floorplanner layout. On the command/box path there is no layout, so
 * {@code buildingsVerified} is false, every required-building slot reports
 * {@code found = null}, and the gate routes the plot to staff review rather
 * than guessing a count from block clusters.
 */
public final class FootprintValidator {

    public ScanResult.FootprintValidation validate(
            ScanObservations o, ScanConfig.DistrictSpec spec, boolean hasLayout) {
        Integer minF = spec != null ? spec.minFootprintBlocks() : null;
        Integer maxF = spec != null ? spec.maxFootprintBlocks() : null;
        Integer minH = spec != null ? spec.minHeightBlocks() : null;

        int area = o.areaBlocks();
        int height = o.heightBlocks();

        boolean footprintOk = (minF == null || area >= minF) && (maxF == null || area <= maxF);
        boolean heightOk = (minH == null) || height >= minH;

        // Building-count: unverifiable without a layout. List the required
        // (non-optional) slots so the reviewer sees them, but found = null.
        List<ScanResult.ReqBuildingResult> rows = new ArrayList<>();
        boolean buildingsVerified = false; // command/box path; Phase D/E sets true
        if (spec != null) {
            for (ScanConfig.ReqBuilding rb : spec.requiredBuildings()) {
                if (rb.optional()) continue;
                boolean ok = false; // unverified → not ok (forces review)
                rows.add(new ScanResult.ReqBuildingResult(
                    rb.slotKey(), rb.count(), rb.maxCount(), null, ok));
            }
        }

        // Geometry-level pass (size only). Building-count feeds the gate
        // separately via buildingsVerified.
        boolean pass = footprintOk && heightOk;

        return new ScanResult.FootprintValidation(
            area, minF, maxF, height, minH, 0, rows, buildingsVerified, pass);
    }
}
