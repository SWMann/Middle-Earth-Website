"use server";

import { revalidatePath } from "next/cache";
import { safeAuth } from "@/lib/auth-helpers";
import { isAdmin } from "@/lib/data/wiki";
import { claimRegion, ModApiError } from "@/lib/mod-api/client";

export type ClaimState = {
  ok?: boolean;
  error?: string;
  result?: {
    regionId: string;
    regionDisplayName: string;
    factionDisplayName: string;
    treasuryDp: number;
    auditEventId: number;
  };
};

export async function submitClaim(
  _prev: ClaimState,
  formData: FormData,
): Promise<ClaimState> {
  const session = await safeAuth();
  if (!isAdmin(session?.user?.discordId)) {
    return { error: "Not authorised." };
  }

  const regionId = String(formData.get("regionId") ?? "").trim();
  const factionId = String(formData.get("factionId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!regionId) return { error: "Region is required." };
  if (!factionId) return { error: "Faction is required." };
  if (!reason) return { error: "Reason is required." };

  try {
    const res = await claimRegion({ regionId, factionId, reason });
    // Region claims affect the map, the faction page, and the new
    // claiming faction's dashboard.
    revalidatePath("/map");
    revalidatePath(`/factions/${factionId}`);
    revalidatePath(`/factions/${factionId}/dashboard`);
    revalidatePath("/");
    return {
      ok: true,
      result: {
        regionId: res.regionId,
        regionDisplayName: res.regionDisplayName,
        factionDisplayName: res.factionDisplayName,
        treasuryDp: res.treasuryDp,
        auditEventId: res.auditEventId,
      },
    };
  } catch (err) {
    if (err instanceof ModApiError) {
      return { error: err.problem.detail ?? err.problem.title };
    }
    console.error("Claim failed:", err);
    return {
      error:
        err instanceof Error
          ? `Bridge unreachable: ${err.message}`
          : "Unknown error talking to the bridge.",
    };
  }
}
