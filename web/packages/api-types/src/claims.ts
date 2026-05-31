/**
 * Region claim operations exposed by the mod's HTTP API.
 *
 * Mirrors the bridge's Java records 1:1. Keep these in sync.
 */

export type ClaimRegionRequest = {
  regionId: string;
  factionId: string;
  reason: string;
};

export type ClaimRegionResponse = {
  regionId: string;
  regionDisplayName: string;
  factionId: string;
  factionDisplayName: string;
  /** Faction DP balance after the 240 DP cost was debited. */
  treasuryDp: number;
  auditEventId: number;
};
