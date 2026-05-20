import Link from "next/link";
import { signIn, signOut } from "@/auth";
import { safeAuth, lookupMcLink } from "@/lib/auth-helpers";
import { ThemeToggle } from "./theme-toggle";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/map", label: "Map" },
  { href: "/wiki", label: "Wiki" },
  { href: "/factions", label: "Factions" },
] as const;

const authedLinks = [
  { href: "/dashboard", label: "Dashboard" },
] as const;

export async function Nav() {
  const session = await safeAuth();
  const user = session?.user;
  const mcLink = user?.discordId ? await lookupMcLink(user.discordId) : null;
  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="font-semibold tracking-wide">
          Middle-earth
        </Link>
        <ul className="flex items-center gap-5 text-sm">
          {publicLinks.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="hover:underline">
                {l.label}
              </Link>
            </li>
          ))}
          {user && authedLinks.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="hover:underline">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <form action="/search" method="get" className="hidden md:flex">
          <input
            type="text"
            name="q"
            placeholder="Search…"
            aria-label="Search"
            className="rounded border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-2 py-1 text-xs w-40"
          />
        </form>
        <div className="flex items-center gap-4 text-sm">
          <ThemeToggle />
          {user ? (
            <>
              {!mcLink && (
                <Link href="/link" className="rounded border border-current px-2 py-1 text-xs">
                  Link Minecraft
                </Link>
              )}
              <span className="text-xs opacity-70">{user.discordUsername}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button type="submit" className="text-xs hover:underline">
                  sign out
                </button>
              </form>
            </>
          ) : (
            <form
              action={async () => {
                "use server";
                await signIn("discord");
              }}
            >
              <button type="submit" className="text-xs hover:underline">
                sign in with Discord
              </button>
            </form>
          )}
        </div>
      </nav>
    </header>
  );
}
