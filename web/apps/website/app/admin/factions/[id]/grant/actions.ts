"use server";

import { revalidatePath } from "next/cache";
import { safeAuth } from "@/lib/auth-helpers";
import { isAdmin } from "@/lib/data/wiki";
import { grantTreasury, ModApiError } from "@/lib/mod-api/client";

export type GrantState = {
  ok?: boolean;
  error?: string;
  result?: {
    treasuryCoin: number;
    treasuryDp: number;
    auditEventId: number;
  };
};

export async function submitGrant(
  factionId: string,
  _prev: GrantState,
  formData: FormData,
): Promise<GrantState> {
  const session = await safeAuth();
  if (!isAdmin(session?.user?.discordId)) {
    return { error: "Not authorised." };
  }

  const currency = String(formData.get("currency") ?? "").toLowerCase();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (currency !== "coin" && currency !== "dp") {
    return { error: "Currency must be 'coin' or 'dp'." };
  }
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
    return { error: "Amount must be a positive integer." };
  }
  if (!reason) return { error: "Reason is required." };

  try {
    const res = await grantTreasury(factionId, { currency, amount, reason });
    // Invalidate every page that reads the faction's treasury.
    revalidatePath(`/factions/${factionId}`);
    revalidatePath(`/factions/${factionId}/dashboard`);
    revalidatePath("/dashboard");
    revalidatePath("/");
    return {
      ok: true,
      result: {
        treasuryCoin: res.treasuryCoin,
        treasuryDp: res.treasuryDp,
        auditEventId: res.auditEventId,
      },
    };
  } catch (err) {
    if (err instanceof ModApiError) {
      return { error: err.problem.detail ?? err.problem.title };
    }
    console.error("Grant failed:", err);
    return {
      error:
        err instanceof Error
          ? `Bridge unreachable: ${err.message}`
          : "Unknown error talking to the bridge.",
    };
  }
}
