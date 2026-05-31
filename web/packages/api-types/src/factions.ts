/**
 * Faction operations exposed by the mod's HTTP API.
 *
 * Mirrors the bridge's Java records 1:1 — keep these in sync if either
 * side changes a field. The bridge is the source of truth for the wire
 * shape; this file is what the website compiles against.
 */

export type GrantTreasuryRequest = {
  /** "coin" or "dp". Case-insensitive on the wire but normalise here. */
  currency: "coin" | "dp";
  /** Positive integer. The bridge rejects ≤ 0. */
  amount: number;
  /** Required, non-empty. Recorded in the audit event. */
  reason: string;
};

export type GrantTreasuryResponse = {
  id: string;
  displayName: string;
  treasuryCoin: number;
  treasuryDp: number;
  /** The audit.events row id created in the same transaction as the grant. */
  auditEventId: number;
};
