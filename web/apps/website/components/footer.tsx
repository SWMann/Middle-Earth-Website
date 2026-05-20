import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-xs opacity-70 sm:flex-row sm:items-center sm:justify-between">
        <span>Middle-earth modded server</span>
        <nav className="flex gap-4">
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
        </nav>
        <span className="italic">Canon is a starting point, not a cage.</span>
      </div>
    </footer>
  );
}
