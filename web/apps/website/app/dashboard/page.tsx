import Link from "next/link";
import { redirect } from "next/navigation";
import { safeAuth, lookupMcLink } from "@/lib/auth-helpers";
import { getActiveCharacterForPlayer } from "@/lib/data/characters";
import { getFaction, getSettlementsByFaction } from "@/lib/data/factions";
import { getRecentEvents } from "@/lib/data/events";
import { FactionTag } from "@/components/tags/faction-tag";
import { RegionTag } from "@/components/tags/region-tag";
import { SettlementTag } from "@/components/tags/settlement-tag";
import { AuditFeed } from "@/components/audit-feed";

// Auth-gated, per-user. Never prerender.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard — Middle-earth",
};

export default async function DashboardPage() {
  const session = await safeAuth();
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/dashboard");
  const user = session.user;

  const [mcLink, character] = await Promise.all([
    lookupMcLink(user.discordId),
    getActiveCharacterForPlayer(user.discordId),
  ]);

  // No character yet → onboarding-style empty state.
  if (!character) {
    return <DashboardEmpty user={user} mcLink={mcLink} />;
  }

  // Character exists → real dashboard.
  const [faction, settlements, events] = await Promise.all([
    getFaction(character.factionId),
    getSettlementsByFaction(character.factionId),
    getRecentEvents({
      visibility: ["public"],
      factionId: character.factionId,
      touching: true,
      limit: 8,
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 space-y-10">
      {/* ----- Greeting ----- */}
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
          Welcome back, {user.discordUsername}
        </p>
        <div className="flex flex-wrap items-baseline gap-3 mb-1">
          <h1 className="text-3xl font-semibold">{character.name}</h1>
          {character.title && (
            <span className="text-sm text-stone-500">{character.title}</span>
          )}
        </div>
        {faction && (
          <p className="text-sm opacity-70 flex items-baseline gap-1.5">
            <FactionTag factionId={faction.id} />
            {character.currentRegionId && (
              <>
                <span aria-hidden>·</span>
                <RegionTag regionId={character.currentRegionId} />
              </>
            )}
          </p>
        )}
      </header>

      {/* ----- Quick stats ----- */}
      <section className="border-y border-stone-200 dark:border-stone-800 py-6">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <Stat
            label="Treasury (Coin)"
            value={faction?.treasuryCoin.toLocaleString() ?? "—"}
          />
          <Stat
            label="Treasury (DP)"
            value={faction?.treasuryDp.toLocaleString() ?? "—"}
          />
          <Stat label="Your Influence" value={character.influence.toString()} />
          <Stat
            label="Wound Score"
            value={character.woundScore.toString()}
            sub={woundDescriptor(character.woundScore)}
          />
        </dl>
      </section>

      {/* ----- Two columns ----- */}
      <section className="grid md:grid-cols-2 gap-10">
        {/* Settlements */}
        <div>
          <h2 className="text-lg font-semibold mb-4">
            {faction?.displayName ?? "Your"} settlements
          </h2>
          {settlements.length === 0 ? (
            <p className="text-sm opacity-60 italic">
              Your faction hasn&apos;t founded any settlements yet.
            </p>
          ) : (
            <ul className="space-y-3 text-sm">
              {settlements.map((s) => (
                <li
                  key={s.id}
                  className="flex items-baseline justify-between gap-2 border-b border-stone-100 dark:border-stone-900 py-2"
                >
                  <SettlementTag settlementId={s.id} withTier />
                  <span className="text-xs text-stone-500 tabular-nums">
                    {s.population} / {s.populationCap}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Action queue placeholder */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Action queue</h2>
          <p className="text-sm opacity-60 italic">
            Nothing needs your attention.
          </p>
          <p className="text-xs opacity-50 mt-2">
            Pending build plan reviews, council invitations, and recruitment
            ready to collect will appear here once player actions ship in
            Phase 5.
          </p>
        </div>
      </section>

      {/* ----- Recent events ----- */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          Recent {faction?.displayName ?? "faction"} events
        </h2>
        <AuditFeed events={events} empty="Quiet days. Nothing to report." />
      </section>

      {/* ----- Account footer ----- */}
      <section className="border-t border-stone-200 dark:border-stone-800 pt-4 text-xs opacity-60 flex flex-wrap gap-x-4 gap-y-1">
        <span>
          Discord: <code className="font-mono">{user.discordId}</code>
        </span>
        {mcLink ? (
          <span>
            Minecraft:{" "}
            <strong className="font-mono">{mcLink.mcUsername}</strong>
          </span>
        ) : (
          <Link href={{ pathname: "/link" }} className="underline">
            Link Minecraft account &rarr;
          </Link>
        )}
      </section>
    </div>
  );
}

function DashboardEmpty({
  user,
  mcLink,
}: {
  user: { discordId: string; discordUsername: string };
  mcLink: { mcUuid: string; mcUsername: string } | null;
}) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 space-y-6">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
          Welcome, {user.discordUsername}
        </p>
        <h1 className="text-3xl font-semibold">No character yet</h1>
      </header>
      <p className="opacity-90 leading-relaxed">
        Your dashboard becomes your command centre once your character is in
        play &mdash; faction treasury, settlements, the action queue. For
        now, two things to set up:
      </p>
      <ol className="list-decimal pl-6 space-y-3 text-sm">
        <li>
          {mcLink ? (
            <>
              Minecraft account linked:{" "}
              <strong className="font-mono">{mcLink.mcUsername}</strong> ✓
            </>
          ) : (
            <>
              <Link href={{ pathname: "/link" }} className="underline font-medium">
                Link your Minecraft account
              </Link>{" "}
              &mdash; needed before you can join a faction in-world.
            </>
          )}
        </li>
        <li>
          <Link href={{ pathname: "/factions" }} className="underline font-medium">
            Pick a faction
          </Link>{" "}
          &mdash; browse the canon powers and choose where to belong. Talk
          to that faction&apos;s officers on Discord to get a character
          assigned.
        </li>
      </ol>
      <p className="text-sm opacity-70 pt-4 border-t border-stone-200 dark:border-stone-800">
        Character creation through the website is a Phase 5 player action.
        For now, your faction&apos;s officers create the character on your
        behalf via the admin tools, and it appears here next time you load
        this page.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest opacity-60">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
      {sub && <dd className="text-xs opacity-50">{sub}</dd>}
    </div>
  );
}

function woundDescriptor(score: number): string {
  if (score < 10) return "Hale";
  if (score < 25) return "Scarred";
  if (score < 50) return "Battered";
  if (score < 75) return "Broken";
  if (score < 90) return "Walking wounded";
  return "Death's threshold";
}
