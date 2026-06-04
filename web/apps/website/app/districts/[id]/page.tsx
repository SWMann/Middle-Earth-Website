import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getDistrictType,
  getAllDistrictTypes,
  getDistrictConsumes,
  getDistrictProduces,
  getResourcesForTag,
  getDistrictStaffing,
  getDistrictEffects,
  getDistrictBiomeOutputs,
  getDistrictPrerequisites,
  getDistrictUpgradeTargets,
  getDistrictAdjacencyBonuses,
  getFactionRulesForDistrict,
  getDistrictProductionBonuses,
  getDistrictTierOutput,
  getDistrictRecipes,
  getDistrictRequiredBuildings,
  getDistrictRequiredComponents,
  getTierDecorationThresholds,
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
    staffing,
    effects,
    biomeOutputs,
    prereqs,
    upgradeTargets,
    adjacency,
    factionRules,
    productionBonuses,
    tierOutput,
    recipes,
    reqBuildings,
    reqComponents,
    tierThresholds,
  ] = await Promise.all([
    getDistrictConsumes(district.id),
    getDistrictProduces(district.id),
    getDistrictStaffing(district.id),
    getDistrictEffects(district.id),
    getDistrictBiomeOutputs(district.id),
    getDistrictPrerequisites(district.id),
    getDistrictUpgradeTargets(district.id),
    getDistrictAdjacencyBonuses(district.id),
    getFactionRulesForDistrict(district.id),
    getDistrictProductionBonuses(district.id),
    getDistrictTierOutput(district.id),
    getDistrictRecipes(district.id),
    getDistrictRequiredBuildings(district.id),
    getDistrictRequiredComponents(district.id),
    getTierDecorationThresholds(),
  ]);

  const decoThreshold =
    district.decorationThreshold != null
      ? tierThresholds.find((t) => t.minScore === district.decorationThreshold)
      : null;
  const hasFootprint =
    district.minFootprintBlocks != null ||
    district.maxFootprintBlocks != null ||
    district.minHeightBlocks != null;
  const hasConstruction =
    hasFootprint ||
    reqBuildings.length > 0 ||
    reqComponents.length > 0 ||
    district.decorationThreshold != null;

  // Collapse rows sharing a groupKey into a single "any one of" slot,
  // preserving first-seen order. Standalone rows (null groupKey) stay alone.
  type ReqBuilding = (typeof reqBuildings)[number];
  type Slot = { key: string; rows: [ReqBuilding, ...ReqBuilding[]] };
  const buildingSlots: Slot[] = [];
  const slotByKey = new Map<string, Slot>();
  for (const b of reqBuildings) {
    if (b.groupKey) {
      const existing = slotByKey.get(b.groupKey);
      if (existing) {
        existing.rows.push(b);
        continue;
      }
      const slot: Slot = { key: `g:${b.groupKey}`, rows: [b] };
      slotByKey.set(b.groupKey, slot);
      buildingSlots.push(slot);
    } else {
      buildingSlots.push({ key: `r:${b.id}`, rows: [b] });
    }
  }

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
            value={
              district.capFromHousing
                ? "housing"
                : district.populationCapProvided.toString()
            }
          />
        </dl>
        {district.capFromHousing && (
          <p className="mt-3 text-xs opacity-60 max-w-xl">
            This is a residential quarter — its population cap is the total of
            the beds in the housing buildings you raise inside it, not a fixed
            number.
          </p>
        )}
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
        <p className="text-xs opacity-50 max-w-xl">
          Building materials aren&apos;t prescribed — the bill of resources is
          whatever blocks you actually place. Only the coin/DP commissioning
          cost above is fixed.
        </p>
      </section>

      {/* ----- Construction requirements ----- */}
      {hasConstruction && (
        <section>
          <h2 className="text-lg font-semibold mb-1">
            Construction requirements
          </h2>
          <p className="text-xs opacity-60 mb-4 max-w-2xl">
            What a player must physically build for this district to count as
            complete and start producing. The plot is graded against these once
            and on every later edit.
          </p>

          {hasFootprint && (
            <div className="mb-5">
              <p className="text-xs uppercase tracking-widest opacity-60 mb-2">
                Footprint
              </p>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm">
                {(district.minFootprintBlocks != null ||
                  district.maxFootprintBlocks != null) && (
                  <Stat
                    label="Floor area"
                    value={footprintRange(
                      district.minFootprintBlocks,
                      district.maxFootprintBlocks,
                    )}
                  />
                )}
                {district.minHeightBlocks != null && (
                  <Stat
                    label="Min height"
                    value={`${district.minHeightBlocks} blk`}
                  />
                )}
              </dl>
            </div>
          )}

          {reqBuildings.length > 0 && (
            <div className="mb-5">
              <p className="text-xs uppercase tracking-widest opacity-60 mb-2">
                Required buildings
              </p>
              <ul className="text-sm space-y-1.5">
                {buildingSlots.map((slot) => {
                  // "Any one of" group.
                  if (slot.rows.length > 1) {
                    const count = slot.rows[0].count;
                    return (
                      <li
                        key={slot.key}
                        className="flex items-baseline gap-2 flex-wrap"
                      >
                        <span className="tabular-nums text-stone-500 w-7">
                          {count}×
                        </span>
                        <span className="flex items-baseline gap-1.5 flex-wrap">
                          {slot.rows.map((r, i) => (
                            <span key={r.id} className="flex items-baseline gap-1.5">
                              {i > 0 && (
                                <span className="text-xs text-stone-400">
                                  or
                                </span>
                              )}
                              {r.buildingTypeId ? (
                                <Link
                                  href={{
                                    pathname: `/buildings`,
                                    hash: r.buildingTypeId,
                                  }}
                                  className="font-medium hover:underline"
                                >
                                  {r.buildingName}
                                </Link>
                              ) : (
                                <span className="font-medium italic">
                                  {r.themeNote ?? "themed"}
                                </span>
                              )}
                            </span>
                          ))}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400">
                          any one of
                        </span>
                      </li>
                    );
                  }
                  // Single row (specific or themed).
                  const b = slot.rows[0];
                  return (
                    <li
                      key={slot.key}
                      className="flex items-baseline gap-2 flex-wrap"
                    >
                      <span className="tabular-nums text-stone-500 w-7">
                        {b.count}×
                      </span>
                      {b.kind === "specific" && b.buildingTypeId ? (
                        <Link
                          href={{
                            pathname: `/buildings`,
                            hash: b.buildingTypeId,
                          }}
                          className="font-medium hover:underline"
                        >
                          {b.buildingName}
                        </Link>
                      ) : (
                        <span className="font-medium italic">
                          {b.themeNote ?? "themed building"}
                        </span>
                      )}
                      {b.kind === "themed" && (
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                          any matching
                        </span>
                      )}
                      {b.themeTag && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-900 text-stone-500 font-mono">
                          {b.themeTag}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {reqComponents.length > 0 && (
            <div className="mb-5">
              <p className="text-xs uppercase tracking-widest opacity-60 mb-2">
                Required components
              </p>
              <p className="text-[11px] opacity-50 mb-2 max-w-xl">
                Functional fittings the buildings must collectively provide —
                regardless of which building supplies them.
              </p>
              <ul className="text-sm flex flex-wrap gap-x-4 gap-y-1.5">
                {reqComponents.map((c) => (
                  <li key={c.componentId} className="flex items-baseline gap-1.5">
                    <span className="tabular-nums text-stone-500">
                      {c.count}×
                    </span>
                    <span className="font-medium">{c.componentName}</span>
                    {c.perCap && (
                      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-900 text-stone-500">
                        per pop cap
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {district.decorationThreshold != null && (
            <div className="rounded border border-stone-200 dark:border-stone-800 p-3 text-sm flex items-baseline gap-3 flex-wrap">
              <span className="opacity-70">Decoration quality gate</span>
              <span className="font-semibold tabular-nums">
                ≥ {district.decorationThreshold}/100
              </span>
              {decoThreshold && (
                <span className="text-xs text-stone-500">
                  {reviewModeLabel(decoThreshold.reviewMode)}
                </span>
              )}
              <Link
                href={{ pathname: "/decoration" }}
                className="ml-auto text-xs hover:underline opacity-70"
              >
                How scoring works →
              </Link>
            </div>
          )}
        </section>
      )}

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
                  {c.consumptionPeriod !== "daily" && (
                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                      {c.consumptionPeriod} · catalyst
                    </span>
                  )}
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
                {p.outputKind === "byproduct" && (
                  <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-900 text-stone-500">
                    byproduct
                  </span>
                )}
                <span className="ml-auto text-xs tabular-nums opacity-70">
                  {p.dailyAmount}/day
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ----- Conditional production bonuses ----- */}
      {productionBonuses.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Production bonuses</h2>
          <ul className="space-y-2 text-sm">
            {productionBonuses.map((b) => (
              <li
                key={b.id}
                className="rounded border border-emerald-700/30 bg-emerald-700/5 p-3"
              >
                <div className="flex items-baseline gap-2 flex-wrap font-medium">
                  <span>{formatCondition(b.condition)}</span>
                  <span aria-hidden>→</span>
                  <span className="text-emerald-700 dark:text-emerald-400">
                    {formatProdEffect(b.effect)}
                  </span>
                </div>
                {b.description && (
                  <p className="text-xs opacity-70 mt-1">{b.description}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ----- Alternate recipes ----- */}
      {recipes.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Alternate modes</h2>
          <p className="text-xs opacity-60 mb-3">
            The supply chain above is the default. An instance can be switched
            to one of these instead.
          </p>
          <ul className="space-y-3">
            {recipes.map((r) => (
              <li
                key={r.id}
                className="rounded border border-stone-200 dark:border-stone-800 p-4"
              >
                <p className="font-medium mb-1">{r.displayName}</p>
                {r.description && (
                  <p className="text-xs opacity-70 mb-2">{r.description}</p>
                )}
                <div className="text-xs flex flex-wrap gap-x-6 gap-y-1">
                  {r.consumes.length > 0 && (
                    <span>
                      <span className="opacity-50">in: </span>
                      {r.consumes
                        .map((c) => `${c.dailyAmount}× ${c.tagName}`)
                        .join(", ")}
                    </span>
                  )}
                  <span>
                    <span className="opacity-50">out: </span>
                    {r.produces
                      .map(
                        (p) =>
                          `${p.dailyAmount}× ${p.resourceName}${p.outputKind === "byproduct" ? " (byproduct)" : ""}`,
                      )
                      .join(", ")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ----- Tier-scaled output ----- */}
      {tierOutput.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Output by settlement tier</h2>
          <ul className="text-sm flex flex-wrap gap-x-6 gap-y-1">
            {tierOutput.map((t) => (
              <li key={t.tier} className="flex items-baseline gap-2">
                <span className="text-stone-500">{prettyTerm(t.tier)}</span>
                <span className="tabular-nums font-medium">
                  {t.multiplierPct}%
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs opacity-50 mt-1">
            Multiplier on this district&apos;s output. Tiers not listed produce
            at 100%.
          </p>
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

function formatCondition(cond: Record<string, unknown>): string {
  if (typeof cond.input_tag === "string" && typeof cond.min_weight === "number") {
    return `Input ${cond.input_tag} at weight ≥ ${cond.min_weight}`;
  }
  if (typeof cond.adjacent === "string") {
    return `Next to a ${prettyTerm(cond.adjacent)}`;
  }
  if (typeof cond.tier_min === "string") {
    return `Settlement at ${cond.tier_min}+ tier`;
  }
  if (typeof cond.biome === "string") {
    return `On a ${prettyTerm(cond.biome)} tile`;
  }
  return JSON.stringify(cond);
}

function formatProdEffect(eff: Record<string, unknown>): string {
  if (typeof eff.output_all_pct === "number") {
    return `+${eff.output_all_pct}% to all output`;
  }
  if (typeof eff.output_resource === "string" && typeof eff.pct === "number") {
    return `+${eff.pct}% ${eff.output_resource.replace(/^R:/, "").replace(/_/g, " ")}`;
  }
  return JSON.stringify(eff);
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

function footprintRange(
  min: number | null,
  max: number | null,
): string {
  if (min != null && max != null) return `${min}–${max} blk²`;
  if (min != null) return `≥ ${min} blk²`;
  if (max != null) return `≤ ${max} blk²`;
  return "—";
}

function reviewModeLabel(mode: string): string {
  switch (mode) {
    case "light":
      return "auto-scored (light review)";
    case "spot":
      return "auto-scored + spot review";
    case "full":
      return "staff review required";
    default:
      return prettyTerm(mode);
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest opacity-60">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
