"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/lib/db";
import { safeAuth } from "@/lib/auth-helpers";
import { isAdmin } from "@/lib/data/wiki";

/**
 * Server action: upsert a wiki page. Admin-gated.
 *
 * Called as a form action after binding the slug from the route:
 *   const save = saveWikiPage.bind(null, slug);
 *   <form action={save}>...</form>
 *
 * The slug in the path is the canonical identifier; rename is not
 * supported in Phase 2.
 */
export async function saveWikiPage(
  pathSlug: string,
  formData: FormData,
): Promise<void> {
  const session = await safeAuth();
  if (!isAdmin(session?.user?.discordId)) {
    throw new Error("Not authorised.");
  }

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "");
  const category = String(formData.get("category") ?? "").trim();
  const published = formData.get("published") === "on";

  if (!title) throw new Error("Title is required.");

  await db
    .insert(schema.wikiPages)
    .values({
      slug: pathSlug,
      title,
      body,
      visibility: "public",
      published,
      metadata: { category: category || "Uncategorised" },
      updatedBy: session!.user!.discordId,
    })
    .onConflictDoUpdate({
      target: schema.wikiPages.slug,
      set: {
        title,
        body,
        published,
        metadata: { category: category || "Uncategorised" },
        updatedAt: new Date(),
        updatedBy: session!.user!.discordId,
      },
    });

  revalidatePath(`/wiki/${pathSlug}`);
  revalidatePath("/wiki");
  redirect(`/wiki/${pathSlug}`);
}
