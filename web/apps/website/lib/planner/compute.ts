import type { PlannerCatalogue } from "@/lib/data/planner";

// Settlement tiers, smallest → largest. Index gives the ordering used for
// "available at this tier" gates and tier-output scaling.
export const TIER_ORDER = [
  "hamlet",
  "steading",
  "village",
  "burgh",
  "town",
  "city",
  "great_city",
  "capital",
] as const;

export function tierIndex(tier: string): number {
  const i = TIER_ORDER.indexOf(tier as (typeof TIER_ORDER)[number]);
  return i < 0 ? 0 : i;
}

export function prettyTier(t: string): string {
  return t
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// The canonical class mix a settlement of each tier tends toward — shown as
// a reference target next to the plan's own (housing-derived) composition.
export const POPULATION_COMPOSITION_BY_TIER: Record<
  string,
  Record<string, number>
> = {
  hamlet: { peasant: 88, artisan: 6, merchant: 2, soldier: 3, scholar: 1, noble: 0 },
  steading: { peasant: 82, artisan: 10, merchant: 3, soldier: 4, scholar: 1, noble: 0 },
  village: { peasant: 75, artisan: 13, merchant: 4, soldier: 5, scholar: 2, noble: 1 },
  burgh: { peasant: 65, artisan: 16, merchant: 6, soldier: 8, scholar: 3, noble: 2 },
  town: { peasant: 55, artisan: 18, merchant: 8, soldier: 11, scholar: 5, noble: 3 },
  city: { peasant: 50, artisan: 18, merchant: 9, soldier: 14, scholar: 6, noble: 3 },
  great_city: { peasant: 45, artisan: 18, merchant: 10, soldier: 16, scholar: 7, noble: 4 },
  capital: { peasant: 42, artisan: 18, merchant: 11, soldier: 16, scholar: 7, noble: 6 },
};

// --- Plan shape ----------------------------------------------------------

export type PlanDistrictBuilding = { buildingTypeId: string; count: number };
export type PlanDistrict = {
  uid: string;
  districtTypeId: string;
  buildings: PlanDistrictBuilding[];
};
export type PlanUnit = { unitTypeId: string; count: number };
export type Plan = {
  name: string;
  factionId: string | null;
  tier: string;
  districts: PlanDistrict[];
  garrison: PlanUnit[];
};

export function emptyPlan(): Plan {
  return { name: "Untitled plan", factionId: null, tier: "village", districts: [], garrison: [] };
}

// --- Helpers -------------------------------------------------------------

type Num = Record<string, number>;
const add = (m: Num, k: string, v: number) => {
  m[k] = (m[k] ?? 0) + v;
};

/** The flexible building slot of a district (the one with a range), if any. */
export function primarySlot(
  cat: PlannerCatalogue,
  districtTypeId: string,
): { min: number; max: number } | null {
  const rows = cat.requiredBuildings.filter(
    (r) => r.districtTypeId === districtTypeId,
  );
  // Prefer a themed (residential) slot, else any row with a maxCount range.
  const themed = rows.find((r) => r.kind === "themed");
  const ranged =
    themed ?? rows.find((r) => r.maxCount != null && r.maxCount > r.count);
  if (!ranged) return null;
  return { min: ranged.count, max: ranged.maxCount ?? ranged.count };
}

/** Housing buildings whose class is ≤ the quarter's class ceiling. */
const HOUSING_CLASS_ORDER = ["peasant", "artisan", "merchant", "scholar", "noble"];
export function allowedHousing(
  cat: PlannerCatalogue,
  populationClass: string | null,
) {
  const ceiling = populationClass
    ? HOUSING_CLASS_ORDER.indexOf(populationClass)
    : HOUSING_CLASS_ORDER.length - 1;
  return cat.buildingTypes.filter(
    (b) =>
      b.category === "residential" &&
      b.housingClass != null &&
      HOUSING_CLASS_ORDER.indexOf(b.housingClass) <= ceiling,
  );
}

// --- The preview computation --------------------------------------------

export type Preview = ReturnType<typeof computePreview>;

export function computePreview(plan: Plan, cat: PlannerCatalogue) {
  const dtById = new Map(cat.districtTypes.map((d) => [d.id, d]));
  const occById = new Map(cat.occupationClasses.map((c) => [c.id, c]));
  const resById = new Map(cat.resources.map((r) => [r.id, r]));
  const bedsById = new Map(cat.buildingTypes.map((b) => [b.id, b.beds]));
  const classOf = new Map(cat.buildingTypes.map((b) => [b.id, b.housingClass]));
  const unitById = new Map(cat.unitTypes.map((u) => [u.id, u]));

  const occMeta = (id: string, key: string): number => {
    const m = (occById.get(id)?.metadata ?? {}) as Record<string, unknown>;
    const v = m[key];
    return typeof v === "number" ? v : 0;
  };

  let popCap = 0;
  const popByClass: Num = {};
  const staffDemand: Num = {};
  const production: Num = {}; // resourceId -> per day
  const consumption: Num = {}; // tagId -> per day
  let taxIncome = 0;
  let coinFromEffects = 0;
  let dpBase = 0;
  let dpMultPct = 0; // from scholar scale bonuses
  let upkeepCoin = 0;
  let prestige = 0;
  let buildCoin = 0;
  let buildDp = 0;
  let footMin = 0;
  let footMax = 0;

  const tier = plan.tier;

  for (const inst of plan.districts) {
    const dt = dtById.get(inst.districtTypeId);
    if (!dt) continue;

    buildCoin += dt.buildCoinCost;
    buildDp += dt.buildDpCost;
    footMin += dt.minFootprintBlocks ?? 0;
    footMax += dt.maxFootprintBlocks ?? dt.minFootprintBlocks ?? 0;

    const totalBuildings = inst.buildings.reduce((s, b) => s + b.count, 0);
    const slot = primarySlot(cat, dt.id);
    const minBuildings = slot?.min ?? 0;
    const extra = Math.max(0, totalBuildings - minBuildings);

    // Scale dividend factors for this instance.
    const bonuses = cat.scaleBonuses.filter((s) => s.districtTypeId === dt.id);
    const bonusPct = (type: string): number => {
      const b = bonuses.find((x) => x.bonusType === type);
      if (!b) return 0;
      const cap = b.maxBuildings ?? (slot ? slot.max - slot.min : extra);
      return b.perBuilding * Math.min(extra, cap);
    };
    const taxScale = 1 + bonusPct("tax_yield_pct") / 100;
    const outputScale = 1 + bonusPct("output_pct") / 100;
    const upkeepScale = 1 - bonusPct("upkeep_reduction_pct") / 100;
    dpMultPct += bonusPct("dp_yield_pct");
    prestige += bonusPct("prestige");

    // Population from housing.
    if (dt.capFromHousing) {
      for (const b of inst.buildings) {
        const beds = (bedsById.get(b.buildingTypeId) ?? 0) * b.count;
        popCap += beds;
        const cls = classOf.get(b.buildingTypeId);
        if (cls) add(popByClass, cls, beds);
      }
    } else {
      popCap += dt.populationCapProvided;
    }

    // Tax from this district's housed population (with its density dividend).
    if (dt.capFromHousing) {
      for (const b of inst.buildings) {
        const beds = (bedsById.get(b.buildingTypeId) ?? 0) * b.count;
        const cls = classOf.get(b.buildingTypeId);
        if (cls) taxIncome += beds * occMeta(cls, "tax_yield_per_capita") * taxScale;
      }
    }

    // Staffing demand (skilled bodies the district needs to run).
    const staff = cat.staffing.filter((s) => s.districtTypeId === dt.id);
    for (const s of staff) add(staffDemand, s.classId, s.count);

    // Production (tier-scaled, density-scaled).
    const tierMultRow = cat.tierOutput.find(
      (t) => t.districtTypeId === dt.id && t.tier === tier,
    );
    const tierMult = (tierMultRow?.multiplierPct ?? 100) / 100;
    for (const p of cat.produces.filter((x) => x.districtTypeId === dt.id)) {
      add(production, p.resourceId, p.dailyAmount * tierMult * outputScale);
    }

    // Consumption (input demand, by tag).
    for (const c of cat.consumes.filter((x) => x.districtTypeId === dt.id)) {
      if (c.consumptionPeriod === "daily") add(consumption, c.tagId, c.dailyAmount);
    }

    // Flat effects.
    for (const e of cat.effects.filter((x) => x.districtTypeId === dt.id)) {
      const amount = Number((e.params as Record<string, unknown>)?.amount ?? 0);
      if (e.effectType === "coin_per_day") coinFromEffects += amount;
      if (e.effectType === "dp_per_day") dpBase += amount;
    }

    upkeepCoin += dt.upkeepCoinDaily * upkeepScale;
  }

  // Food: production of food-valued resources vs. what the population eats.
  let foodProduced = 0;
  for (const [resId, amt] of Object.entries(production)) {
    foodProduced += amt * (resById.get(resId)?.foodValue ?? 0);
  }
  let foodConsumed = 0;
  for (const [cls, n] of Object.entries(popByClass)) {
    foodConsumed += n * occMeta(cls, "food_cost_per_capita");
  }

  // Garrison.
  let garrisonCoin = 0;
  let garrisonFood = 0;
  let soldiers = 0;
  for (const g of plan.garrison) {
    const u = unitById.get(g.unitTypeId);
    if (!u) continue;
    garrisonCoin += u.upkeepCoinDaily * g.count;
    garrisonFood += u.upkeepFoodDaily * g.count;
    soldiers += g.count;
  }
  foodConsumed += garrisonFood;

  const dpIncome = dpBase * (1 + dpMultPct / 100);
  const coinNet = taxIncome + coinFromEffects - upkeepCoin - garrisonCoin;
  const foodNet = foodProduced - foodConsumed;

  // Composition incl. soldiers (housed civilians + garrison).
  const compClasses: Num = { ...popByClass };
  if (soldiers > 0) add(compClasses, "soldier", soldiers);
  const compTotal = Object.values(compClasses).reduce((s, v) => s + v, 0);
  const composition = Object.entries(compClasses)
    .map(([classId, count]) => ({
      classId,
      count,
      pct: compTotal > 0 ? Math.round((count / compTotal) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Staffing supply = the housed working population of each class.
  const staffing = Object.keys(staffDemand).map((classId) => ({
    classId,
    demand: staffDemand[classId] ?? 0,
    supply: popByClass[classId] ?? 0,
  }));

  // Warnings.
  const warnings: string[] = [];
  if (foodNet < 0) warnings.push(`Food deficit: ${foodNet.toFixed(0)}/day — the settlement starves.`);
  if (coinNet < 0) warnings.push(`Coin deficit: ${coinNet.toFixed(0)}/day — the treasury bleeds.`);
  for (const s of staffing) {
    if (s.demand > s.supply)
      warnings.push(
        `Understaffed: needs ${s.demand} ${occById.get(s.classId)?.displayName ?? s.classId}, only ${s.supply} housed.`,
      );
  }
  if (popCap === 0 && plan.districts.length > 0)
    warnings.push("No housing yet — add a residential quarter to seat a population.");

  return {
    popCap,
    popByClass,
    composition,
    target: POPULATION_COMPOSITION_BY_TIER[tier] ?? {},
    staffing,
    production: Object.entries(production)
      .map(([resourceId, amount]) => ({
        resourceId,
        name: resById.get(resourceId)?.displayName ?? resourceId,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount),
    consumption: Object.entries(consumption)
      .map(([tagId, amount]) => ({
        tagId,
        name: cat.tags.find((t) => t.id === tagId)?.displayName ?? tagId,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount),
    foodProduced,
    foodConsumed,
    foodNet,
    taxIncome,
    coinFromEffects,
    upkeepCoin,
    garrisonCoin,
    garrisonFood,
    coinNet,
    dpIncome,
    prestige,
    soldiers,
    buildCoin,
    buildDp,
    footMin,
    footMax,
    districtCount: plan.districts.length,
    warnings,
  };
}
