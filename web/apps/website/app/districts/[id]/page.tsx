import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getDistrictType,
  getAllDistrictTypes,
  getDistrictConsumes,
  getDistrictProduces,
  getResourcesForTag,
  getDistrictBuildCost,
  getDistrictStaffing,
  getDistrictEffects,
  getDistrictBiomeOutputs,
  getDistrictPrerequisites,
  getDistrictUpgradeTargets,
  getDistrictAdjacencyBonuses,
  getFactionRulesForDistrict,
} from "@/lib/data/catalogue";
import { getFaction } from "@/lib/data/factions";
import { FactionTag } from "@/components/tags/faction-tag";

export const revalidate = 600;

export async function generateStaticParams() {
  const all = await getAllDistrictTypes();
  return all.map((d) => ({ id: d.id }));
}

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const d = await getDistrictType(id);
  if (!d) return { title: "District not found" };
  return { title: `${d.displayName} — Middle-earth`, description: d.description };
}

export default async function DistrictDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const district = await getDistrictType(id);
  if (!district) notFound();

  const [
    consumes,
    produces,
    buildCost,
    staffing,
    effects,
    biomeOutputs,
    prereqs,
    upgradeTargets,
    adjacency,
    factionRules,
  ] = await Promise.all([
    getDistrictConsumes(district.id),
    getDistrictProduces(district.id),
    getDistrictBuildCost(district.id),
    getDistrictStaffing(district.id),
    getDistrictEffects(district.id),
    getDistrictBiomeOutputs(district.id),
    getDistrictPrerequisites(district.id),
    getDistrictUpgradeTargets(district.id),
    getDistrictAdjacencyBonuses(district.id),
    getFactionRulesForDistrict(district.id),
  ]);

  const upgradesFrom = district.upgradesFrom
    ? await getDistrictType(district.upgradesFrom)
    : null;

  const consumesWithResources = await Promise.all(
    consumes.map(async (c) => ({
      ...c,
      candidates: (await getResourcesForTag(c.tagId)).filter(
        (r) => r.weight >= c.weightMin,
      ),
    })),
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 space-y-10">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
          <Link href={{ pathname: "/districts" }} className="hover:underline">
            Districts
          </Link>{" "}
          · {district.category}
        </p>
        <div className="flex items-baseline gap-3 mb-2">
          <h1 className="text-3xl font-semibold">{district.displayName}</h1>
          <span className="font-mono text-sm text-stone-500">{district.id}</span>
        </div>
        {district.description && (
          <p className="text-sm opacity-80 max-w-2xl">{district.description}</p>
        )}
      </header>

      {/* ----- Core stats ----- */}
      <section className="border-y border-stone-200 dark:border-stone-800 py-6">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <Stat label="Min tier" value={district.tierMin} />
          <Stat label="Pop cost" value={district.popCost.toString()} />
          <Stat label="Build time" value={district.buildTimeDays > 0 ? `${district.buildTimeDays}d` : "instant"} />
          <Stat
            label="Pop cap +"
            value={district.populationCapProvided.toString()}
          />
        </dl>
      </section>

      {/* ----- Build cost ----- */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Cost to build</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm mb-3">
          {district.buildCoinCost > 0 && (
            <Stat label="Coin" value={district.buildCoinCost.toLocaleString()} />
          )}
          {district.buildDpCost > 0 && (
            <Stat label="DP" value={district.buildDpCost.toLocaleString()} />
          )}
          {district.upkeepCoinDaily > 0 && (
            <Stat label="Upkeep" value={`${district.upkeepCoinDaily} coin/day`} />
          )}
          {district.buildCoinCost === 0 && district.buildDpCost === 0 && (
            <Stat label="Coin" value="free" />
          )}
        </dl>
        {buildCost.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-widest opacity-60 mb-1">
              Materials
            </p>
            <ul className="text-sm flex flex-wrap gap-x-4 gap-y-1">
              {buildCost.map((b) => (
                <li key={b.resourceId}>
                  <Link
                    href={{ pathname: `/resources/${encodeURIComponent(b.resourceId)}` }}
                    className="hover:underline"
                  >
                    {b.amount}× {b.resourceName}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ----- Location & limits ----- */}
      {(district.requiredBiomes ||
        district.requiresDiscovery ||
        district.terrainRequirement ||
        district.maxPerSettlement !== null ||
        district.uniqueScope ||
        district.mandatoryAtTier) && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Placement rules</h2>
          <ul className="text-sm space-y-1.5 opacity-90">
            {district.requiredBiomes && (
              <li>
                • Buildable only in:{" "}
                <strong>
                  {district.requiredBiomes.map((b) => prettyTerm(b)).join(", ")}
                </strong>{" "}
                tiles
              </li>
            )}
            {district.requiresDiscovery && (
              <li>
                • Requires a confirmed{" "}
                <strong>{prettyTerm(district.requiresDiscovery)}</strong>{" "}
                discovery in the region
              </li>
            )}
            {district.terrainRequirement && (
              <li>
                • Requires <strong>{prettyTerm(district.terrainRequirement)}</strong>{" "}
                terrain
              </li>
            )}
            {district.maxPerSettlement !== null && (
              <li>
                • Maximum <strong>{district.maxPerSettlement}</strong> per
                settlement
              </li>
            )}
            {district.uniqueScope && (
              <li>
                • Unique per <strong>{district.uniqueScope}</strong>
              </li>
            )}
            {district.mandatoryAtTier && (
              <li>
                • <strong>Mandatory</strong> for settlements at{" "}
                {district.mandatoryAtTier}+ tier
              </li>
            )}
          </ul>
        </section>
      )}

      <WallMetadata district={district} />

      {/* ----- Staffing ----- */}
      {staffing.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Staffing</h2>
          <ul className="text-sm space-y-1.5">
            {staffing.map((s) => (
              <li key={s.classId} className="flex items-baseline gap-3">
                <span className="font-medium">
                  {s.count}× {s.className}
                </span>
                <span className="text-xs text-stone-500">{s.rank}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs opacity-50 mt-2">
            Drawn from the settlement&apos;s population of these classes — not
            generic bodies.
          </p>
        </section>
      )}

      {/* ----- Consumes ----- */}
      {consumesWithResources.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Consumes daily</h2>
          <ul className="space-y-4">
            {consumesWithResources.map((c) => (
              <li
                key={c.tagId}
                className="rounded border border-stone-200 dark:border-stone-800 p-4"
              >
                <div className="flex items-baseline gap-3 flex-wrap mb-2">
                  <span className="font-medium">
                    {c.dailyAmount}× {c.tagName}
                  </span>
                  <span className="font-mono text-xs text-stone-500">{c.tagId}</span>
                  <span className="text-xs text-stone-500">
                    requires weight ≥ {c.weightMin}
                  </span>
                </div>
                {c.candidates.length === 0 ? (
                  <p className="text-xs opacity-60 italic">
                    No resource currently satisfies this.
                  </p>
                ) : (
                  <div className="text-xs flex flex-wrap gap-x-3 gap-y-1 opacity-80">
                    {c.candidates.map((r) => (
                      <Link
                        key={r.resourceId}
                        href={{ pathname: `/resources/${encodeURIComponent(r.resourceId)}` }}
                        className="hover:underline"
                      >
                        {r.resourceName} <span className="opacity-60">w{r.weight}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ----- Produces ----- */}
      {produces.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Produces daily</h2>
          <ul className="space-y-1.5 text-sm">
            {produces.map((p) => (
              <li key={p.resourceId} className="flex items-baseline gap-3">
                <Link
                  href={{ pathname: `/resources/${encodeURIComponent(p.resourceId)}` }}
                  className="font-medium hover:underline"
                >
                  {p.resourceName}
                </Link>
                <span className="ml-auto text-xs tabular-nums opacity-70">
                  {p.dailyAmount}/day
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ----- Biome-modified output ----- */}
      {biomeOutputs.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Output by biome</h2>
          <p className="text-xs opacity-60 mb-2">
            The same district yields differently depending on the tile it sits
            on. These override the base production above.
          </p>
          <ul className="text-sm space-y-1.5">
            {biomeOutputs.map((b) => (
              <li
                key={`${b.biome}-${b.resourceId}`}
                className="flex items-baseline gap-3"
              >
                <span className="w-20 text-stone-500">{prettyTerm(b.biome)}</span>
                <Link
                  href={{ pathname: `/resources/${encodeURIComponent(b.resourceId)}` }}
                  className="hover:underline"
                >
                  {b.resourceName}
                </Link>
                <span className="ml-auto text-xs tabular-nums opacity-70">
                  {b.dailyAmount}/day
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ----- Effects ----- */}
      {effects.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Effects</h2>
          <ul className="text-sm space-y-1.5">
            {effects.map((e) => (
              <li key={e.id}>• {formatEffect(e.effectType, e.params)}</li>
            ))}
          </ul>
        </section>
      )}

      {/* ----- Prerequisites + upgrade chain ----- */}
      {(prereqs.length > 0 || upgradesFrom || upgradeTargets.length > 0) && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Progression</h2>
          <ul className="text-sm space-y-1.5 opacity-90">
            {prereqs.map((p) => (
              <li key={p.id}>
                • Requires a{" "}
                <Link
                  href={{ pathname: `/districts/${p.id}` }}
                  className="font-medium hover:underline"
                >
                  {p.displayName}
                </Link>{" "}
                in the settlement first
              </li>
            ))}
            {upgradesFrom && (
              <li>
                • Upgrades from{" "}
                <Link
                  href={{ pathname: `/districts/${upgradesFrom.id}` }}
                  className="font-medium hover:underline"
                >
                  {upgradesFrom.displayName}
                </Link>
              </li>
            )}
            {upgradeTargets.map((u) => (
              <li key={u.id}>
                • Upgrades into{" "}
                <Link
                  href={{ pathname: `/districts/${u.id}` }}
                  className="font-medium hover:underline"
                >
                  {u.displayName}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ----- Adjacency bonuses ----- */}
      {adjacency.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Adjacency bonuses</h2>
          <ul className="text-sm space-y-1.5">
            {adjacency.map((a) => (
              <li key={`${a.adjacentId}-${a.bonusType}`}>
                • Near a{" "}
                <Link
                  href={{ pathname: `/districts/${a.adjacentId}` }}
                  className="font-medium hover:underline"
                >
                  {a.adjacentName}
                </Link>
                : {formatBonus(a.bonusType, a.bonusValue)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ----- Faction availability ----- */}
      {factionRules.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Faction availability</h2>
          <ul className="text-sm space-y-1.5">
            {factionRules.map(async (r) => {
              const f = await getFaction(r.factionId);
              return (
                <li
                  key={`${r.factionId}-${r.ruleType}`}
                  className="flex items-baseline gap-2 flex-wrap"
                >
                  {f ? <FactionTag factionId={f.id} /> : r.factionId}
                  <span className="opacity-80">
                    {formatFactionRule(r.ruleType, r.params)}
                  </span>
                </li>
              );
            })}
          </ul>
          {factionRules.some((r) => r.ruleType === "unlock") && (
            <p className="text-xs opacity-50 mt-2">
              This district is faction-exclusive — only the factions listed with
              &ldquo;unlock&rdquo; may build it.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

// --- Formatters ----------------------------------------------------------

function formatEffect(type: string, params: Record<string, unknown>): string {
  const n = (k: string) => (typeof params[k] === "number" ? (params[k] as number) : null);
  switch (type) {
    case "coin_per_day":
      return `Generates ${n("amount")} Coin per day`;
    case "dp_per_day":
      return `Generates ${n("amount")} Diplomacy Points per day`;
    case "garrison_cap_bonus":
      return `+${n("amount")} garrison capacity${params.unit_filter ? ` (${params.unit_filter} only)` : ""}`;
    case "unlocks_unit_category":
      return `Unlocks recruitment of ${params.category} units`;
    case "recruit_time_modifier":
      return `Recruitment time ${n("days")! < 0 ? "" : "+"}${n("days")} days`;
    case "sight_range":
      return `Reveals movement within ${n("blocks")} blocks`;
    case "claim_block":
      return `Reserves its region from rival claims`;
    case "morale_modifier":
      return `${n("amount")! >= 0 ? "+" : ""}${n("amount")} settlement morale`;
    case "growth_modifier":
      return `${n("pct")! >= 0 ? "+" : ""}${n("pct")}% population growth`;
    case "health_bonus":
      return `+${n("amount")} healing (reduces wound scores)`;
    case "trade_capacity":
      return `Trade capacity: ${params.berths ? `${params.berths} ship berths` : ""}${params.routes ? `${params.routes} routes` : ""}`;
    case "tax_modifier":
      return `${n("pct")! >= 0 ? "+" : ""}${n("pct")}% settlement tax`;
    default:
      return `${type} ${JSON.stringify(params)}`;
  }
}

function formatBonus(type: string, value: number): string {
  switch (type) {
    case "output_pct":
      return `+${value}% production`;
    case "upkeep_pct":
      return `−${value}% upkeep`;
    case "build_time_pct":
      return `−${value}% build time`;
    default:
      return `${type} ${value}`;
  }
}

function formatFactionRule(type: string, params: Record<string, unknown>): string {
  switch (type) {
    case "restrict":
      return "cannot build this";
    case "unlock":
      return "can build this (exclusive)";
    case "override":
      return `builds ${params.with} instead`;
    case "modify": {
      const parts = Object.entries(params).map(([k, v]) => `${k.replace(/_/g, " ")} → ${v}`);
      return `builds under modified rules (${parts.join(", ")})`;
    }
    default:
      return type;
  }
}

function WallMetadata({
  district,
}: {
  district: { category: string; metadata: unknown };
}) {
  if (district.category !== "defensive") return null;
  const m = (district.metadata ?? {}) as Record<string, unknown>;
  const defense = typeof m.defense_bonus_pct === "number" ? m.defense_bonus_pct : null;
  if (defense === null) return null; // watchtower is 'defensive' but not a wall
  const delayH =
    typeof m.delay_of_engagement_hours === "number" ? m.delay_of_engagement_hours : null;
  const breach = typeof m.breach_difficulty === "string" ? m.breach_difficulty : null;
  const requires = Array.isArray(m.breach_requires) ? (m.breach_requires as string[]) : [];
  const archerCover = m.archer_cover === true;
  const rangedRetaliation = m.ranged_retaliation === true;
  const defenderWaves = typeof m.defender_waves === "number" ? m.defender_waves : 0;

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">Wall properties</h2>
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
        <Stat label="Defense bonus" value={`+${defense}%`} />
        {delayH !== null && (
          <Stat
            label="Delay of engagement"
            value={delayH >= 24 ? `${Math.round(delayH / 24)} day${delayH >= 48 ? "s" : ""}` : `${delayH} h`}
          />
        )}
        {breach && <Stat label="Breach" value={prettyTerm(breach)} />}
      </dl>
      {(archerCover || rangedRetaliation || defenderWaves > 0) && (
        <ul className="text-sm mt-4 space-y-1 opacity-80">
          {archerCover && <li>• Archer cover from the parapet</li>}
          {rangedRetaliation && <li>• Defender ranged retaliation during breach attempts</li>}
          {defenderWaves > 0 && (
            <li>• {defenderWaves} reserve garrison{defenderWaves === 1 ? "" : "s"} as fallback wave{defenderWaves === 1 ? "" : "s"}</li>
          )}
        </ul>
      )}
      {requires.length > 0 && (
        <p className="text-xs opacity-60 mt-4">
          Breach requires: {requires.map((r) => prettyTerm(r)).join(", ")}.
        </p>
      )}
    </section>
  );
}

function prettyTerm(s: string): string {
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest opacity-60">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
