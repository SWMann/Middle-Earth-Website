/**
 * Plot review operations exposed by the mod's HTTP API.
 *
 * A plot is a scanned build (see game.plots): the Andúril scanner scores it,
 * validates its components + footprint, and gates it by settlement tier. Plots
 * that don't auto-approve land in the website's review queue; staff approve or
 * reject them here, which the bridge writes back to game.plots.
 *
 * Mirrors the bridge's Java records 1:1. Keep these in sync.
 */

export type PlotReviewRequest = {
  /** 'approve' → review_status 'approved' (+ activate a linked district);
   *  'reject' → 'rejected'. */
  decision: "approve" | "reject";
  /** Discord id / handle of the reviewing staff member. */
  reviewedBy: string;
  /** Free-text note recorded on the plot and in the audit row. */
  note: string;
};

export type PlotReviewResponse = {
  plotId: number;
  /** The new review_status after the decision. */
  reviewStatus: string;
  /** The linked district that was activated on approval, if any. */
  districtId: number | null;
  auditEventId: number;
};
