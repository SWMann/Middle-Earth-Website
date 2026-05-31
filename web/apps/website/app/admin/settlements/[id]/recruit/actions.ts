"use server";

import { revalidatePath } from "next/cache";
import { safeAuth } from "@/lib/auth-helpers";
import { isAdmin } from "@/lib/data/wiki";
import { recruitUnits, ModApiError } from "@/lib/mod-api/client";

export type RecruitState = {
  ok?: boolean;
  error?: string;
  result?: {
    unitStackCount: number;
    treasuryCoin: number;
    auditEventId: number;
  };
};

export async function submitRecruit(
  settlementId: number,
  _prev: RecruitState,
  formData: FormData,
): Promise<RecruitState> {
  const session = await safeAuth();
  if (!isAdmin(session?.user?.discordId)) {
    return { error: "Not authorised." };
  }

  const unitType = String(formData.get("unitType") ?? "").trim();
  const count = Number(formData.get("count") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim();

  if (!unitType) return { error: "Unit type is required." };
  if (!Number.isInteger(count) || count <= 0 || count > 1000) {
    return { error: "Count must be a whole number between 1 and 1000." };
  }
  if (!reason) return { error: "Reason is required." };

  try {
    const res = await recruitUnits(settlementId, { unitType, count, reason });
    revalidatePath(`/settlements/${settlementId}`);
    // The faction's treasury changed too — invalidate every page that reads it.
    revalidatePath("/dashboard");
    revalidatePath("/");
    return {
      ok: true,
      result: {
        unitStackCount: res.unitStackCount,
        treasuryCoin: res.treasuryCoin,
        auditEventId: res.auditEventId,
      },
    };
  } catch (err) {
    if (err instanceof ModApiError) {
      return { error: err.problem.detail ?? err.problem.title };
    }
    console.error("Recruit failed:", err);
    return {
      error:
        err instanceof Error
          ? `Bridge unreachable: ${err.message}`
          : "Unknown error talking to the bridge.",
    };
  }
}
