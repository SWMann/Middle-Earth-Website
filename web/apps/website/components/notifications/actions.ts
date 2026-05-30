"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { safeAuth } from "@/lib/auth-helpers";

export async function markNotificationsRead() {
  const session = await safeAuth();
  if (!session?.user?.discordId) return;
  await db
    .update(schema.accounts)
    .set({ lastNotificationsViewedAt: new Date() })
    .where(eq(schema.accounts.discordId, session.user.discordId));
  // Invalidate the layout so the bell re-renders with zero unread.
  revalidatePath("/", "layout");
}
