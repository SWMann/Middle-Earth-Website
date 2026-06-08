"use server";

import { revalidatePath } from "next/cache";
import { safeAuth } from "@/lib/auth-helpers";
import { isAdmin } from "@/lib/data/wiki";
import { savePlot, requestPlotScan, ModApiError } from "@/lib/mod-api/client";
import type { SavePlotRequest } from "@modspec/api-types";

export type SaveResult = { ok?: true; plotId?: number; auditEventId?: number; error?: string };
export type ScanResult = { ok?: true; score?: number; status?: string; error?: string };

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

export async function scanPlotAction(plotId: number): Promise<ScanResult> {
  const session = await safeAuth();
  if (!isAdmin(session?.user?.discordId)) {
    return { error: "Not authorised." };
  }
  try {
    const res = await requestPlotScan(plotId);
    // A scan may leave the plot pending in the review queue.
    revalidatePath("/admin/reviews");
    return { ok: true, score: res.decorationScore, status: res.reviewStatus };
  } catch (err) {
    if (err instanceof ModApiError) {
      return { error: err.problem.detail ?? err.problem.title };
    }
    console.error("Plot scan failed:", err);
    return {
      error:
        err instanceof Error
          ? `Bridge unreachable: ${err.message}`
          : "Unknown error talking to the bridge.",
    };
  }
}
