"use server";

import { revalidatePath } from "next/cache";
import { safeAuth } from "@/lib/auth-helpers";
import { isAdmin } from "@/lib/data/wiki";
import { saveRegionBoundary, ModApiError } from "@/lib/mod-api/client";

export type SaveBoundaryResult = { ok?: true; vertices?: number; error?: string };

/**
 * Persist a region's polygon boundary (or clear it with boundary=null). Admin
 * only; the write itself goes through the bridge, which owns game.* writes.
 */
export async function saveRegionBoundaryAction(
  regionId: string,
  boundary: [number, number][] | null,
): Promise<SaveBoundaryResult> {
  const session = await safeAuth();
  if (!isAdmin(session?.user?.discordId)) {
    return { error: "Not authorised." };
  }
  if (boundary && boundary.length < 3) {
    return { error: "A boundary needs at least 3 points." };
  }
  try {
    const res = await saveRegionBoundary(regionId, boundary);
    revalidatePath("/map");
    revalidatePath("/admin/regions");
    return { ok: true, vertices: res.vertices };
  } catch (err) {
    if (err instanceof ModApiError) {
      return { error: err.problem.detail ?? err.problem.title };
    }
    console.error("Region boundary save failed:", err);
    return {
      error:
        err instanceof Error
          ? `Bridge unreachable: ${err.message}`
          : "Unknown error talking to the bridge.",
    };
  }
}
