import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getUnitType,
  getAllUnitTypes,
  getUnitRecruitmentCost,
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

  const [costs, faction] = await Promise.all([
    getUnitRecruitmentCost(unit.id),
    unit.factionId ? getFaction(unit.factionId) : Promise.resolve(null),
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
          Combat profile
        </h2>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <Stat label="Health" value={unit.health.toString()} />
          <Stat label="Armor" value={unit.armor.toString()} />
          <Stat label="Morale" value={unit.morale.toString()} />
          <Stat label="Speed" value={unit.speed.toFixed(1)} />
        </dl>
      </section>

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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest opacity-60">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
