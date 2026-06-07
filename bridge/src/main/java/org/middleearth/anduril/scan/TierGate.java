package org.middleearth.anduril.scan;

/**
 * Decides what happens to a scanned plot: auto-approve, spot-check, or full
 * staff review. The threshold is the district's own
 * {@code decoration_threshold} override if set, else the settlement tier's
 * {@code config.tier_decoration_thresholds} entry. The review <i>mode</i>
 * (light/spot/full) likewise comes from the tier.
 *
 * <p>Auto-approval is deliberately strict: it requires a numeric threshold,
 * a score that meets it, passing component <i>and</i> footprint validation,
 * a <b>verified</b> building count, and no uncertain (composite/proxy)
 * detections. Anything short of that lands in a review queue — the honest
 * outcome, never a false green light. A build with no settlement tier (an
 * unanchored command scan) defaults to full review.
 */
public final class TierGate {
    public static final String AUTO_APPROVED = "auto_approved";
    public static final String PENDING_SPOT = "pending_spot";
    public static final String PENDING_FULL = "pending_full";

    public record GateResult(String reviewStatus, String reviewMode, Integer thresholdUsed) {}

    public GateResult resolve(int score, String tier, ScanConfig cfg,
                              ScanConfig.DistrictSpec spec,
                              ScanResult.ComponentValidation comp,
                              ScanResult.FootprintValidation foot) {
        ScanConfig.TierThreshold tt = tier != null ? cfg.tierThresholds().get(tier) : null;
        String reviewMode = tt != null ? tt.reviewMode() : "full";

        Integer minScore = (spec != null && spec.decorationThreshold() != null)
            ? spec.decorationThreshold()
            : (tt != null ? tt.minScore() : null);

        boolean eligibleAuto = minScore != null
            && score >= minScore
            && comp.pass()
            && foot.pass()
            && foot.buildingsVerified()
            && !comp.uncertain();

        String status;
        if ("full".equals(reviewMode)) {
            status = PENDING_FULL;                 // great_city / capital, or unanchored
        } else if (eligibleAuto) {
            status = AUTO_APPROVED;
        } else if ("spot".equals(reviewMode)) {
            status = PENDING_SPOT;                 // town / city
        } else if ("light".equals(reviewMode)) {
            status = PENDING_SPOT;                 // hamlet…burgh: a light staff look
        } else {
            status = PENDING_FULL;                 // 'auto' mode that failed auto, or unknown
        }

        return new GateResult(status, reviewMode, minScore);
    }
}
