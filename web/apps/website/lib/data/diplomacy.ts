import "server-only";
import { cache } from "react";
import { eq, or, and } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/**
 * All active diplomatic states involving the given faction. Symmetric
 * relationships are stored as a single row; this query checks both
 * directions so the caller doesn't have to.
 */
export const getDiplomaticStatesFor = cache(async (factionId: string) => {
  return await db
    .select()
    .from(schema.diplomaticStates)
    .where(
      and(
        eq(schema.diplomaticStates.status, "active"),
        or(
          eq(schema.diplomaticStates.factionAId, factionId),
          eq(schema.diplomaticStates.factionBId, factionId),
        ),
      ),
    )
    .orderBy(schema.diplomaticStates.stateType);
});

/**
 * Convenience: given a state and a viewing faction, return "the other
 * faction in the relationship." Used by UI components that want to show
 * "at war with Mordor" rather than "war state between Gondor and Mordor."
 */
export function otherFaction(
  state: typeof schema.diplomaticStates.$inferSelect,
  viewingFactionId: string,
): string {
  return state.factionAId === viewingFactionId
    ? state.factionBId
    : state.factionAId;
}

/**
 * Human label for a state type. Used in UI headers.
 */
export function diplomaticStateLabel(stateType: string): string {
  switch (stateType) {
    case "war":
      return "At war with";
    case "alliance_basic":
      return "Allied with";
    case "alliance_military":
      return "Military allied with";
    case "trade_deal":
      return "Trade deal with";
    case "non_aggression":
      return "Non-aggression with";
    case "truce":
      return "Truce with";
    case "vassalage":
      return "Suzerain over"; // for factionA; flip for factionB
    case "joint_operation":
      return "Joint op with";
    default:
      return stateType;
  }
}

/**
 * Tone for visual styling. Wars get a red banner, alliances get a green
 * one, neutral arrangements a grey one.
 */
export function diplomaticStateTone(stateType: string): "hostile" | "friendly" | "neutral" {
  if (stateType === "war") return "hostile";
  if (
    stateType === "alliance_basic" ||
    stateType === "alliance_military" ||
    stateType === "joint_operation"
  )
    return "friendly";
  return "neutral";
}
