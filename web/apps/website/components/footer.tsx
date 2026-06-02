import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-black/10 dark:border-white/10">
      <div className="mx-auto max-w-6xl px-6 py-6 text-xs opacity-70 space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <span className="font-medium">Middle-earth modded server</span>
          <span className="italic ml-auto">
            Canon is a starting point, not a cage.
          </span>
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href={{ pathname: "/about" }} className="hover:underline">
            About
          </Link>
          <Link href={{ pathname: "/rules" }} className="hover:underline">
            Rules
          </Link>
          <Link href={{ pathname: "/wiki" }} className="hover:underline">
            Wiki
          </Link>
          <Link href={{ pathname: "/recruit" }} className="hover:underline">
            Recruit
          </Link>
          <span aria-hidden className="opacity-30">
            ·
          </span>
          <Link href={{ pathname: "/resources" }} className="hover:underline">
            Resources
          </Link>
          <Link href={{ pathname: "/districts" }} className="hover:underline">
            Districts
          </Link>
          <Link href={{ pathname: "/buildings" }} className="hover:underline">
            Buildings
          </Link>
          <Link href={{ pathname: "/units" }} className="hover:underline">
            Units
          </Link>
          <Link href={{ pathname: "/decoration" }} className="hover:underline">
            Decoration
          </Link>
        </nav>
      </div>
    </footer>
  );
}
