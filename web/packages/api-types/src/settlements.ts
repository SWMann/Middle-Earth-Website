/**
 * Settlement operations exposed by the mod's HTTP API.
 *
 * Mirrors the bridge's Java records 1:1. Keep these in sync if either
 * side changes a field — the bridge is the source of truth for the
 * wire shape; this file is what the website compiles against.
 */

export type RecruitUnitsRequest = {
  /** Unit type id, e.g. "citadel_guard", "rohirrim". Matches [a-z0-9_]{2,64}. */
  unitType: string;
  /** Number of units to recruit. 1..1000. */
  count: number;
  /** Required, non-empty. Recorded in the audit event. */
  reason: string;
};

export type RecruitUnitsResponse = {
  settlementId: number;
  unitType: string;
  /** The settlement's stack count for this unit type AFTER the add. */
  unitStackCount: number;
  /** Faction treasury Coin after the cost was debited. */
  treasuryCoin: number;
  auditEventId: number;
};
