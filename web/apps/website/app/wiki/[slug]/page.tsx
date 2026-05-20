import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPage, getPublishedPages, isAdmin } from "@/lib/data/wiki";
import { safeAuth } from "@/lib/auth-helpers";

export const revalidate = 60;

export async function generateStaticParams() {
  const pages = await getPublishedPages();
  return pages.map((p) => ({ slug: p.slug }));
}

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return { title: "Not found" };
  return {
    title: `${page.title} — Middle-earth Wiki`,
    description: page.body.slice(0, 160),
  };
}

export default async function WikiPageDetail({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const [page, session] = await Promise.all([getPage(slug), safeAuth()]);
  if (!page || (!page.published && !isAdmin(session?.user?.discordId))) {
    notFound();
  }
  const admin = isAdmin(session?.user?.discordId);

  return (
    <article className="mx-auto max-w-3xl px-6 py-16 space-y-6">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
          <Link href={{ pathname: "/wiki" }} className="hover:underline">
            Wiki
          </Link>
        </p>
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-3xl font-semibold">{page.title}</h1>
          {admin && (
            <Link
              href={{ pathname: `/wiki/${page.slug}/edit` }}
              className="text-sm underline opacity-80 hover:opacity-100"
            >
              Edit
            </Link>
          )}
        </div>
        {!page.published && (
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
            Draft &mdash; not visible to other readers.
          </p>
        )}
      </header>

      <div className="wiki-prose space-y-4 leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-3xl font-semibold mt-8 mb-4">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-semibold mt-8 mb-3 border-b border-stone-200 dark:border-stone-800 pb-2">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-semibold mt-6 mb-2">{children}</h3>
            ),
            p: ({ children }) => <p className="opacity-90">{children}</p>,
            ul: ({ children }) => (
              <ul className="list-disc pl-6 space-y-1 opacity-90">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-6 space-y-1 opacity-90">
                {children}
              </ol>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-stone-300 dark:border-stone-700 pl-4 italic opacity-80">
                {children}
              </blockquote>
            ),
            code: ({ children, ...props }) => (
              <code
                className="font-mono text-sm rounded bg-stone-100 dark:bg-stone-900 px-1.5 py-0.5"
                {...props}
              >
                {children}
              </code>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                className="underline hover:opacity-80"
              >
                {children}
              </a>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold">{children}</strong>
            ),
          }}
        >
          {page.body}
        </ReactMarkdown>
      </div>

      <footer className="text-xs opacity-50 pt-6 border-t border-stone-200 dark:border-stone-800">
        Last updated{" "}
        {page.updatedAt.toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
        .
      </footer>
    </article>
  );
}
