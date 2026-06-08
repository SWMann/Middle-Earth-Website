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

/**
 * Save a plot authored in the web floorplanner. The geometry AABB is computed
 * web-side via lib/plots/geometry.ts; the transform + layout + footprint cells
 * are stored verbatim as jsonb. review_status starts 'unscanned' — Phase E
 * (or an in-game scan) fills the score/validation later.
 */
export type SavePlotRequest = {
  districtType: string;
  factionId: string | null;
  settlementId: number | null;
  label: string;
  source: string;
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  /** Plot outline in world block columns (grid-cell footprint expanded). */
  footprintCells: [number, number][];
  /** The image/grid↔block transform (PlotTransform). */
  transform: Record<string, unknown>;
  /** The planned building layout (PlotLayout). */
  layout: Record<string, unknown>;
};

export type SavePlotResponse = {
  plotId: number;
  auditEventId: number;
};

/**
 * Trigger an in-world scan of a saved plot (no request body — the plot id is
 * in the path). The bridge reads the plot's world box on the server thread,
 * scores + validates it (verifying building count from the saved layout), and
 * writes the result back to game.plots.
 */
export type ScanPlotResponse = {
  plotId: number;
  decorationScore: number;
  reviewStatus: string;
  reviewMode: string;
  auditEventId: number;
};
