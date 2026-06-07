"use server";

import { revalidatePath } from "next/cache";
import { safeAuth } from "@/lib/auth-helpers";
import { isAdmin } from "@/lib/data/wiki";
import { reviewPlot, ModApiError } from "@/lib/mod-api/client";

export type ReviewState = {
  ok?: boolean;
  error?: string;
  result?: {
    plotId: number;
    reviewStatus: string;
    districtId: number | null;
    auditEventId: number;
  };
};

export async function submitReview(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const session = await safeAuth();
  if (!isAdmin(session?.user?.discordId)) {
    return { error: "Not authorised." };
  }

  const plotId = Number(formData.get("plotId"));
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  // The reviewer identity is taken from the session, never the client.
  const reviewedBy = session?.user?.discordId ?? "admin";

  if (!Number.isFinite(plotId) || plotId <= 0) {
    return { error: "Bad plot id." };
  }
  if (decision !== "approve" && decision !== "reject") {
    return { error: "Pick Approve or Reject." };
  }

  try {
    const res = await reviewPlot(plotId, { decision, reviewedBy, note });
    revalidatePath("/admin/reviews");
    revalidatePath(`/admin/reviews/${plotId}`);
    return { ok: true, result: res };
  } catch (err) {
    if (err instanceof ModApiError) {
      return { error: err.problem.detail ?? err.problem.title };
    }
    console.error("Plot review failed:", err);
    return {
      error:
        err instanceof Error
          ? `Bridge unreachable: ${err.message}`
          : "Unknown error talking to the bridge.",
    };
  }
}
