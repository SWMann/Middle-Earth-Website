"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import { redeemLinkCode, ModApiError } from "@/lib/mod-api/client";
import { devSeedLinkCode } from "@/lib/mod-api/mock";

const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(4, "Code is too short.")
  .max(12, "Code is too long.")
  .regex(/^[A-Z0-9]+$/, "Codes are uppercase letters and digits only.");

export type LinkState = {
  error?: string;
  success?: { mcUsername: string };
};

export async function redeemLinkCodeAction(
  _prev: LinkState,
  formData: FormData,
): Promise<LinkState> {
  const session = await auth();
  if (!session?.user?.discordId) {
    redirect("/api/auth/signin?callbackUrl=/link");
  }
  const discordId = session.user.discordId;

  const parsed = codeSchema.safeParse(formData.get("code"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid code." };
  }

  try {
    const result = await redeemLinkCode({
      code: parsed.data,
      discord_id: discordId,
    });

    await db
      .insert(schema.mcLinks)
      .values({
        mcUuid: result.mc_uuid,
        discordId,
        mcUsername: result.mc_username,
        linkedAt: new Date(result.linked_at),
      })
      .onConflictDoUpdate({
        target: schema.mcLinks.mcUuid,
        set: {
          discordId,
          mcUsername: result.mc_username,
          linkedAt: new Date(result.linked_at),
          unlinkedAt: null,
        },
      });

    revalidatePath("/link");
    revalidatePath("/dashboard");
    return { success: { mcUsername: result.mc_username } };
  } catch (err) {
    if (err instanceof ModApiError) {
      return { error: err.problem.detail ?? err.problem.title };
    }
    console.error("link redemption failed", err);
    return { error: "Something went wrong talking to the mod. Try again." };
  }
}

/**
 * Dev-only seeder. Only runs when the mod-api mock is active. Returns the
 * freshly issued code (and what the redemption would resolve to) so the
 * developer can paste it into the form on the same page.
 */
export async function devSeedAction(): Promise<{ code: string; mcUsername: string } | null> {
  const useMock = process.env.MOD_API_MOCK === "1" || !process.env.MOD_API_URL;
  if (!useMock) return null;
  const link = devSeedLinkCode();
  return { code: link.code, mcUsername: link.mcUsername };
}

export async function existingLink(): Promise<{ mcUsername: string; mcUuid: string } | null> {
  const session = await auth();
  if (!session?.user?.discordId) return null;
  const rows = await db
    .select({
      mcUuid: schema.mcLinks.mcUuid,
      mcUsername: schema.mcLinks.mcUsername,
    })
    .from(schema.mcLinks)
    .where(eq(schema.mcLinks.discordId, session.user.discordId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { mcUuid: row.mcUuid, mcUsername: row.mcUsername };
}
