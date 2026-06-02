import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getUnitType,
  getAllUnitTypes,
  getUnitRecruitmentCost,
  getUnitAttacks,
  getUnitTraits,
  getUnitAbilities,
  getCountersForCategory,
  getTerrainModifiersForCategory,
  getRankLadder,
} from "@/lib/data/catalogue";
import { getFaction } from "@/lib/data/factions";
import { FactionTag } from "@/components/tags/faction-tag";

export const revalidate = 600;

export async function generateStaticParams() {
  const all = await getAllUnitTypes();
  return all.map((u) => ({ id: u.id }));
}

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const u = await getUnitType(id);
  if (!u) return { title: "Unit not found" };
  return {
    title: `${u.displayName} — Middle-earth`,
    description: u.description,
  };
}

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const unit = await getUnitType(id);
  if (!unit) notFound();

  const [costs, faction, attacks, traits, abilities, counters, terrain, ranks] =
    await Promise.all([
      getUnitRecruitmentCost(unit.id),
      unit.factionId ? getFaction(unit.factionId) : Promise.resolve(null),
      getUnitAttacks(unit.id),
      getUnitTraits(unit.id),
      getUnitAbilities(unit.id),
      getCountersForCategory(unit.category),
      getTerrainModifiersForCategory(unit.category),
      getRankLadder(),
    ]);

  const totalUpkeep =
    unit.upkeepFoodDaily > 0 || unit.upkeepCoinDaily > 0
      ? `${unit.upkeepFoodDaily} food + ${unit.upkeepCoinDaily} coin / day`
      : "none";

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 space-y-10">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60 flex items-center gap-2">
          <Link href={{ pathname: "/units" }} className="hover:underline">
            Units
          </Link>{" "}
          · {unit.category}
          {faction && (
            <>
              <span aria-hidden>·</span>
              <FactionTag factionId={faction.id} />
            </>
          )}
        </p>
        <div className="flex items-baseline gap-3 mb-2">
          <h1 className="text-3xl font-semibold">{unit.displayName}</h1>
          <span className="font-mono text-sm text-stone-500">{unit.id}</span>
        </div>
        {unit.description && (
          <p className="text-sm opacity-80 max-w-2xl">{unit.description}</p>
        )}
      </header>

      <section className="border-y border-stone-200 dark:border-stone-800 py-6">
        <h2 className="text-xs uppercase tracking-widest opacity-60 mb-3">
          Combat profile (Regular rank)
        </h2>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <Stat label="Health" value={unit.health.toString()} />
          <Stat label="Armor" value={unit.armor.toString()} />
          <Stat label="Morale" value={unit.morale.toString()} />
          <Stat label="Speed" value={unit.speed.toFixed(1)} />
        </dl>
      </section>

      {/* ----- Weapons ----- */}
      {attacks.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Weapons</h2>
          <ul className="space-y-2 text-sm">
            {attacks.map((a) => (
              <li
                key={a.id}
                className="flex items-baseline gap-3 flex-wrap border-b border-stone-100 dark:border-stone-900 py-1.5"
              >
                <span className="font-medium">{a.weaponName}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-900 text-stone-500">
                  {a.rangeType}
                  {a.rangeType === "ranged" && a.rangeBlocks
                    ? ` · ${a.rangeBlocks} blk`
                    : ""}
                </span>
                {a.ammo != null && (
                  <span className="text-xs text-stone-500">{a.ammo} ammo</span>
                )}
                <span className="ml-auto text-sm tabular-nums">
                  {a.damage} dmg
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ----- Traits ----- */}
      {traits.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Traits</h2>
          <ul className="space-y-2 text-sm">
            {traits.map((t) => (
              <li key={t.id}>
                <span className="font-medium">{t.displayName}</span>
                {t.description && (
                  <span className="opacity-70"> — {t.description}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ----- Abilities ----- */}
      {abilities.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Battle abilities</h2>
          <ul className="space-y-2 text-sm">
            {abilities.map((ab) => (
              <li
                key={ab.id}
                className="rounded border border-stone-200 dark:border-stone-800 p-3"
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-medium">{ab.name}</span>
                  {ab.cooldownTurns > 0 && (
                    <span className="text-xs text-stone-500">
                      {ab.cooldownTurns}-turn cooldown
                    </span>
                  )}
                </div>
                {ab.description && (
                  <p className="text-xs opacity-70 mt-1">{ab.description}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ----- Counters ----- */}
      {counters.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">
            Matchups{" "}
            <span className="text-xs text-stone-500 font-normal">
              (as {unit.category})
            </span>
          </h2>
          <ul className="space-y-1.5 text-sm">
            {counters.map((c) => (
              <li
                key={c.defenderCategory}
                className="flex items-baseline gap-3 flex-wrap"
              >
                <span>vs {c.defenderCategory}</span>
                <span
                  className={`tabular-nums font-medium ${c.modifierPct >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}
                >
                  {c.modifierPct >= 0 ? "+" : ""}
                  {c.modifierPct}%
                </span>
                {c.note && <span className="text-xs opacity-60">— {c.note}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ----- Terrain ----- */}
      {terrain.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Terrain</h2>
          <ul className="space-y-1.5 text-sm">
            {terrain.map((t) => (
              <li key={t.biome} className="flex items-baseline gap-3 flex-wrap">
                <span className="w-20 text-stone-500">{capitalise(t.biome)}</span>
                <span
                  className={`tabular-nums font-medium ${t.modifierPct >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}
                >
                  {t.modifierPct >= 0 ? "+" : ""}
                  {t.modifierPct}%
                </span>
                {t.note && <span className="text-xs opacity-60">— {t.note}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ----- Veterancy ladder ----- */}
      {ranks.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Veterancy</h2>
          <p className="text-xs opacity-60 mb-2">
            Surviving units climb this shared ladder by fighting battles. The
            profile above is the Regular baseline.
          </p>
          <ul className="space-y-1.5 text-sm">
            {ranks.map((r) => (
              <li
                key={r.rankKey}
                className="flex items-baseline gap-3 flex-wrap border-b border-stone-100 dark:border-stone-900 py-1.5"
              >
                <span className="w-16 font-medium">{r.displayName}</span>
                <span className="text-xs text-stone-500">
                  {r.xpRequired === 0 ? "start" : `${r.xpRequired} battles`}
                </span>
                <span className="ml-auto text-xs tabular-nums opacity-70">
                  hp ×{r.healthMultPct}% · dmg ×{r.damageMultPct}% ·{" "}
                  {r.moraleBonus >= 0 ? "+" : ""}
                  {r.moraleBonus} morale
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">Recruitment</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm mb-4">
          <Stat label="Min tier" value={unit.tierRequired} />
          <Stat label="Time" value={`${unit.recruitmentTimeDays} day${unit.recruitmentTimeDays === 1 ? "" : "s"}`} />
          <Stat label="Pop cost" value={unit.popCost.toString()} />
          <Stat label="Coin cost" value={unit.coinCost.toString()} />
        </dl>

        {costs.length > 0 ? (
          <div>
            <p className="text-xs uppercase tracking-widest opacity-60 mb-2">
              Plus material costs
            </p>
            <ul className="text-sm space-y-1.5">
              {costs.map((c) => (
                <li key={c.resourceId} className="flex items-baseline gap-3">
                  <Link
                    href={{ pathname: `/resources/${encodeURIComponent(c.resourceId)}` }}
                    className="font-medium hover:underline"
                  >
                    {c.resourceName}
                  </Link>
                  <span className="ml-auto text-xs tabular-nums opacity-70">
                    {c.amount} per recruit
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs opacity-60 italic">
            No material cost — coin and population only.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Upkeep</h2>
        <p className="text-sm opacity-80">{totalUpkeep}</p>
        <p className="text-xs opacity-50 mt-1">
          Drawn from the settlement&apos;s food production and the
          faction&apos;s treasury daily while the unit is garrisoned or
          mobilised.
        </p>
      </section>
    </div>
  );
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest opacity-60">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
