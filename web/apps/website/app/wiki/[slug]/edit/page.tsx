import { notFound, forbidden } from "next/navigation";
import Link from "next/link";
import { getPage, isAdmin } from "@/lib/data/wiki";
import { safeAuth } from "@/lib/auth-helpers";
import { saveWikiPage } from "./actions";

type Params = { slug: string };

export default async function WikiEditPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const session = await safeAuth();
  if (!isAdmin(session?.user?.discordId)) {
    // Next 15.2+ exposes forbidden() — fall back to notFound() if your
    // version doesn't have it. Either way: don't reveal page existence.
    try {
      forbidden();
    } catch {
      notFound();
    }
  }

  const existing = await getPage(slug);
  const category =
    existing && existing.metadata && typeof (existing.metadata as Record<string, unknown>).category === "string"
      ? ((existing.metadata as Record<string, unknown>).category as string)
      : "";

  const save = saveWikiPage.bind(null, slug);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 space-y-6">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
          <Link href={{ pathname: "/wiki" }} className="hover:underline">
            Wiki
          </Link>
          {existing && (
            <>
              {" · "}
              <Link
                href={{ pathname: `/wiki/${slug}` }}
                className="hover:underline"
              >
                {existing.title}
              </Link>
            </>
          )}
        </p>
        <h1 className="text-2xl font-semibold">
          {existing ? "Edit page" : "New page"}: <code className="font-mono">{slug}</code>
        </h1>
      </header>

      <form action={save} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5">Title</label>
          <input
            name="title"
            required
            defaultValue={existing?.title ?? ""}
            className="w-full rounded border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Category</label>
          <input
            name="category"
            defaultValue={category}
            className="w-full rounded border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm"
          />
          <p className="text-xs opacity-50 mt-1">
            Getting Started · Mechanics · Factions · Lore · or any other
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Body (Markdown)</label>
          <textarea
            name="body"
            defaultValue={existing?.body ?? ""}
            rows={24}
            className="w-full font-mono text-sm rounded border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-3"
            spellCheck={false}
          />
          <p className="text-xs opacity-50 mt-1">
            Standard Markdown. GitHub-flavoured extras (tables, strikethrough) supported.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="published"
            defaultChecked={existing?.published ?? false}
          />
          Published (visible to everyone, not just admins)
        </label>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded border border-current px-4 py-2 text-sm hover:opacity-80"
          >
            Save page
          </button>
          {existing && (
            <Link
              href={{ pathname: `/wiki/${slug}` }}
              className="rounded border border-current px-4 py-2 text-sm hover:opacity-80"
            >
              Cancel
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
