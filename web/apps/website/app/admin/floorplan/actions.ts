"use server";

import { revalidatePath } from "next/cache";
import { safeAuth } from "@/lib/auth-helpers";
import { isAdmin } from "@/lib/data/wiki";
import { savePlot, ModApiError } from "@/lib/mod-api/client";
import type { SavePlotRequest } from "@modspec/api-types";

export type SaveResult = { ok?: true; plotId?: number; auditEventId?: number; error?: string };

export async function savePlotAction(req: SavePlotRequest): Promise<SaveResult> {
  const session = await safeAuth();
  if (!isAdmin(session?.user?.discordId)) {
    return { error: "Not authorised." };
  }
  if (!req.districtType) return { error: "Pick a district type." };
  if (!req.footprintCells || req.footprintCells.length === 0) {
    return { error: "Paint a plot footprint first." };
  }

  try {
    const res = await savePlot(req);
    // The new plot shows up nowhere staff-facing until scanned, but keep the
    // review queue fresh in case a later scan flips it pending.
    revalidatePath("/admin/reviews");
    return { ok: true, plotId: res.plotId, auditEventId: res.auditEventId };
  } catch (err) {
    if (err instanceof ModApiError) {
      return { error: err.problem.detail ?? err.problem.title };
    }
    console.error("Plot save failed:", err);
    return {
      error:
        err instanceof Error
          ? `Bridge unreachable: ${err.message}`
          : "Unknown error talking to the bridge.",
    };
  }
}
