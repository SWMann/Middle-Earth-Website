package org.middleearth.anduril.scan;

import java.util.ArrayList;
import java.util.List;

/**
 * Checks a district's required functional components against what the scan
 * found. Per-cap requirements (e.g. 1 BED per population cap) can't be fully
 * verified without a settlement cap, so when {@code perCap} is set and no cap
 * is known the row is marked uncertain and the build is routed to review.
 */
public final class ComponentValidator {

    /**
     * @param popCap the settlement's population cap for per-cap requirements,
     *               or {@code null} if unknown (command path).
     */
    public ScanResult.ComponentValidation validate(
            ScanObservations o, ScanConfig.DistrictSpec spec, Integer popCap) {
        List<ScanResult.ReqComponentResult> rows = new ArrayList<>();
        boolean pass = true;
        boolean uncertain = false;

        if (spec != null) {
            for (ScanConfig.ReqComponent rc : spec.requiredComponents()) {
                int found = o.componentCounts().getOrDefault(rc.componentId(), 0);
                int need;
                boolean rowUncertain = o.uncertainComponents().contains(rc.componentId());
                if (rc.perCap()) {
                    if (popCap != null) {
                        need = Math.max(1, rc.count() * popCap);
                    } else {
                        need = Math.max(1, rc.count()); // base only; can't verify the per-cap total
                        rowUncertain = true;
                    }
                } else {
                    need = rc.count();
                }
                boolean ok = found >= need;
                if (!ok) pass = false;
                if (rowUncertain) uncertain = true;
                rows.add(new ScanResult.ReqComponentResult(
                    rc.componentId(), need, found, ok, rowUncertain));
            }
        }

        return new ScanResult.ComponentValidation(rows, pass, uncertain);
    }
}
