import Link from "next/link";

export const metadata = {
  title: "About — Middle-earth",
  description: "What the server is, in one page.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 space-y-8 leading-relaxed">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
          About
        </p>
        <h1 className="text-3xl font-semibold">
          Canon is a starting point, not a cage.
        </h1>
      </header>

      <section className="space-y-4 opacity-90">
        <p>
          A modded Minecraft server set in the <strong>late Third Age</strong>{" "}
          of Middle-earth. Players belong to factions &mdash; major canon
          ones (Gondor, Rohan, Mordor, Isengard, Lothl&oacute;rien,
          Erebor, Dale, Rivendell, the Shire, plus Harad, Rh&ucirc;n,
          Dunland) and player-founded minor ones &mdash; and build, trade,
          fight, and tell stories together.
        </p>
        <p>
          The experience is a <strong>4X civ-builder with strong RP
          scaffolding</strong>: prosperity, conquest, and diplomacy are
          the engines; character and lore are the texture.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What we&apos;re known for</h2>
        <p className="opacity-90">
          Mechanical depth, accessibly delivered. The systems are the draw.
          They are deep, interlocking, and rewarding to master &mdash; but
          they do not require a wiki binder and three staff approvals to
          engage with. The mod does the bookkeeping; the website shows the
          state; the player makes the decisions.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Pillars (in priority order)</h2>
        <ol className="list-decimal pl-6 space-y-1 opacity-90">
          <li>
            <strong>Economy and building</strong> &mdash; settlements,
            districts, supply chains, trade.
          </li>
          <li>
            <strong>Combat and conquest</strong> &mdash; wars are real,
            consequential, resolved through both mechanical and RP systems.
          </li>
          <li>
            <strong>Diplomacy</strong> &mdash; alliances, councils, treaties.
          </li>
          <li>
            <strong>Story</strong> &mdash; character arcs and written lore
            give the mechanics meaning.
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What we&apos;re not</h2>
        <ul className="list-disc pl-6 space-y-1 opacity-90">
          <li>Not a recreation of the reference server.</li>
          <li>Not a hardcore-only experience.</li>
          <li>Not staff-driven (staff adjudicate, they don&apos;t bottleneck).</li>
          <li>Not lore-purists.</li>
          <li>Not a PvP arena.</li>
        </ul>
      </section>

      <section className="border-t border-stone-200 dark:border-stone-800 pt-6 text-sm opacity-70 space-y-2">
        <p>
          See also:{" "}
          <Link
            href={{ pathname: "/wiki/getting-started" }}
            className="underline"
          >
            Getting started
          </Link>
          {" · "}
          <Link href={{ pathname: "/rules" }} className="underline">
            Server rules
          </Link>
          {" · "}
          <Link href={{ pathname: "/factions" }} className="underline">
            Factions
          </Link>
        </p>
      </section>
    </div>
  );
}
