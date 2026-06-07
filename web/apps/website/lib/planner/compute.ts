import type { PlannerCatalogue } from "@/lib/data/planner";

// Settlement tiers, smallest → largest.
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

// The canonical class mix a settlement of each tier tends toward.
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

export const HOUSING_CLASS_ORDER = ["peasant", "artisan", "merchant", "scholar", "noble"];

/** The flexible building slot of a district (the one with a range), if any. */
export function primarySlot(
  cat: PlannerCatalogue,
  districtTypeId: string,
): { min: number; max: number } | null {
  const rows = cat.requiredBuildings.filter((r) => r.districtTypeId === districtTypeId);
  const themed = rows.find((r) => r.kind === "themed");
  const ranged = themed ?? rows.find((r) => r.maxCount != null && r.maxCount > r.count);
  if (!ranged) return null;
  return { min: ranged.count, max: ranged.maxCount ?? ranged.count };
}

/** Housing buildings whose class is ≤ the quarter's class ceiling. */
export function allowedHousing(cat: PlannerCatalogue, populationClass: string | null) {
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
export type DistrictContribution = Preview["perDistrict"][number];

export function computePreview(plan: Plan, cat: PlannerCatalogue) {
  const dtById = new Map(cat.districtTypes.map((d) => [d.id, d]));
  const occById = new Map(cat.occupationClasses.map((c) => [c.id, c]));
  const resById = new Map(cat.resources.map((r) => [r.id, r]));
  const bedsById = new Map(cat.buildingTypes.map((b) => [b.id, b.beds]));
  const classOf = new Map(cat.buildingTypes.map((b) => [b.id, b.housingClass]));
  const unitById = new Map(cat.unitTypes.map((u) => [u.id, u]));
  const tagName = (id: string) => cat.tags.find((t) => t.id === id)?.displayName ?? id;
  const resName = (id: string) => resById.get(id)?.displayName ?? id;
  const occMeta = (id: string, key: string): number => {
    const m = (occById.get(id)?.metadata ?? {}) as Record<string, unknown>;
    const v = m[key];
    return typeof v === "number" ? v : 0;
  };

  // Per-building production outputs (the building-driven economy model).
  const outputsByBuilding = new Map<string, typeof cat.buildingOutputs>();
  for (const o of cat.buildingOutputs) {
    if (!outputsByBuilding.has(o.buildingTypeId)) outputsByBuilding.set(o.buildingTypeId, []);
    outputsByBuilding.get(o.buildingTypeId)!.push(o);
  }
  const hasOutput = new Set(cat.buildingOutputs.map((o) => o.buildingTypeId));

  // resourceId -> the tags it satisfies (for supply-chain reconciliation).
  const tagsByResource = new Map<string, Set<string>>();
  for (const rt of cat.resourceTags) {
    if (!tagsByResource.has(rt.resourceId)) tagsByResource.set(rt.resourceId, new Set());
    tagsByResource.get(rt.resourceId)!.add(rt.tagId);
  }

  const tier = plan.tier;

  // ---- Per-district contributions ----
  const perDistrict = plan.districts
    .map((inst) => {
      const dt = dtById.get(inst.districtTypeId);
      if (!dt) return null;

      const totalBuildings = inst.buildings.reduce((s, b) => s + b.count, 0);
      const slot = primarySlot(cat, dt.id);
      const minBuildings = slot?.min ?? 0;
      const extra = Math.max(0, totalBuildings - minBuildings);

      const bonuses = cat.scaleBonuses.filter((s) => s.districtTypeId === dt.id);
      const bonusPct = (type: string): number => {
        const b = bonuses.find((x) => x.bonusType === type);
        if (!b) return 0;
        const cap = b.maxBuildings ?? (slot ? slot.max - slot.min : extra);
        return b.perBuilding * Math.min(extra, cap);
      };
      const taxScalePct = bonusPct("tax_yield_pct");
      const outputScalePct = bonusPct("output_pct");
      const upkeepRedPct = bonusPct("upkeep_reduction_pct");
      const dpMultPct = bonusPct("dp_yield_pct");
      const prestige = bonusPct("prestige");
      const scale = bonuses
        .map((b) => ({ bonusType: b.bonusType, totalPct: bonusPct(b.bonusType) }))
        .filter((s) => s.totalPct !== 0);

      const dPop: Num = {};
      let dPopCap = 0;
      let dTax = 0;
      let dTaxBase = 0;
      if (dt.capFromHousing) {
        for (const b of inst.buildings) {
          const beds = (bedsById.get(b.buildingTypeId) ?? 0) * b.count;
          const cls = classOf.get(b.buildingTypeId);
          dPopCap += beds;
          if (cls) {
            add(dPop, cls, beds);
            const base = beds * occMeta(cls, "tax_yield_per_capita");
            dTaxBase += base;
            dTax += base * (1 + taxScalePct / 100);
          }
        }
      } else {
        dPopCap += dt.populationCapProvided;
      }

      const staffDemand: Num = {};
      for (const s of cat.staffing.filter((x) => x.districtTypeId === dt.id))
        add(staffDemand, s.classId, s.count);

      const tierMultRow = cat.tierOutput.find(
        (t) => t.districtTypeId === dt.id && t.tier === tier,
      );
      const tierMult = (tierMultRow?.multiplierPct ?? 100) / 100;
      const outMult = tierMult * (1 + outputScalePct / 100);
      const dProd: Num = {};
      let dEffectCoin = 0;

      // Output buildings raised in this instance (those carrying outputs).
      const outputBuildingCount = inst.buildings
        .filter((b) => hasOutput.has(b.buildingTypeId))
        .reduce((s, b) => s + b.count, 0);

      if (dt.outputFromBuildings) {
        // Output is the SUM of the production buildings' yields.
        for (const b of inst.buildings) {
          for (const o of outputsByBuilding.get(b.buildingTypeId) ?? []) {
            if (o.outputKind === "coin") dEffectCoin += o.dailyAmount * b.count * outMult;
            else if (o.resourceId) add(dProd, o.resourceId, o.dailyAmount * b.count * outMult);
          }
        }
      } else {
        // Flat per-district yield (tile-based extraction / agriculture).
        for (const p of cat.produces.filter((x) => x.districtTypeId === dt.id))
          add(dProd, p.resourceId, p.dailyAmount * outMult);
      }

      // Consumption: for output-from-buildings districts the input recipe is
      // PER production building, so input scales with output.
      const consumeMult = dt.outputFromBuildings ? outputBuildingCount : 1;
      const dCons: Num = {};
      for (const c of cat.consumes.filter((x) => x.districtTypeId === dt.id))
        if (c.consumptionPeriod === "daily") add(dCons, c.tagId, c.dailyAmount * consumeMult);

      let dDpBase = 0;
      for (const e of cat.effects.filter((x) => x.districtTypeId === dt.id)) {
        const amount = Number((e.params as Record<string, unknown>)?.amount ?? 0);
        if (e.effectType === "coin_per_day") dEffectCoin += amount;
        if (e.effectType === "dp_per_day") dDpBase += amount;
      }

      let dFood = 0;
      for (const [resId, amt] of Object.entries(dProd))
        dFood += amt * (resById.get(resId)?.foodValue ?? 0);

      return {
        uid: inst.uid,
        districtTypeId: dt.id,
        name: dt.displayName,
        category: dt.category,
        popCap: dPopCap,
        popByClass: dPop,
        totalBuildings,
        slotMin: slot?.min ?? null,
        slotMax: slot?.max ?? null,
        taxCoin: dTax,
        taxCoinBase: dTaxBase,
        effectCoin: dEffectCoin,
        upkeepCoin: dt.upkeepCoinDaily * (1 - upkeepRedPct / 100),
        foodProduced: dFood,
        dpBase: dDpBase,
        dpMultPct,
        prestige,
        production: Object.entries(dProd)
          .map(([resourceId, amount]) => ({ resourceId, name: resName(resourceId), amount }))
          .sort((a, b) => b.amount - a.amount),
        consumption: Object.entries(dCons)
          .map(([tagId, amount]) => ({ tagId, name: tagName(tagId), amount }))
          .sort((a, b) => b.amount - a.amount),
        staffDemand,
        scale,
        coinNet: dTax + dEffectCoin - dt.upkeepCoinDaily * (1 - upkeepRedPct / 100),
        buildCoin: dt.buildCoinCost,
        buildDp: dt.buildDpCost,
        footMin: dt.minFootprintBlocks ?? 0,
        footMax: dt.maxFootprintBlocks ?? dt.minFootprintBlocks ?? 0,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  // ---- Aggregate ----
  const popByClass: Num = {};
  const staffDemandAgg: Num = {};
  const production: Num = {};
  const consumption: Num = {};
  let popCap = 0,
    taxIncome = 0,
    taxIncomeBase = 0,
    coinFromEffects = 0,
    dpBase = 0,
    dpMultPct = 0,
    upkeepCoin = 0,
    prestige = 0,
    buildCoin = 0,
    buildDp = 0,
    footMin = 0,
    footMax = 0,
    foodProduced = 0;

  for (const d of perDistrict) {
    popCap += d.popCap;
    for (const [c, n] of Object.entries(d.popByClass)) add(popByClass, c, n);
    for (const [c, n] of Object.entries(d.staffDemand)) add(staffDemandAgg, c, n);
    for (const p of d.production) add(production, p.resourceId, p.amount);
    for (const c of d.consumption) add(consumption, c.tagId, c.amount);
    taxIncome += d.taxCoin;
    taxIncomeBase += d.taxCoinBase;
    coinFromEffects += d.effectCoin;
    upkeepCoin += d.upkeepCoin;
    dpBase += d.dpBase;
    dpMultPct += d.dpMultPct;
    prestige += d.prestige;
    buildCoin += d.buildCoin;
    buildDp += d.buildDp;
    footMin += d.footMin;
    footMax += d.footMax;
    foodProduced += d.foodProduced;
  }

  // Food eaten.
  let foodConsumedCiv = 0;
  for (const [cls, n] of Object.entries(popByClass))
    foodConsumedCiv += n * occMeta(cls, "food_cost_per_capita");

  // Garrison.
  let garrisonCoin = 0,
    garrisonFood = 0,
    soldiers = 0;
  for (const g of plan.garrison) {
    const u = unitById.get(g.unitTypeId);
    if (!u) continue;
    garrisonCoin += u.upkeepCoinDaily * g.count;
    garrisonFood += u.upkeepFoodDaily * g.count;
    soldiers += g.count;
  }
  const foodConsumed = foodConsumedCiv + garrisonFood;

  // Garrison cap from district effects (barracks etc.).
  let garrisonCap = 0;
  for (const inst of plan.districts) {
    for (const e of cat.effects.filter(
      (x) => x.districtTypeId === inst.districtTypeId && x.effectType === "garrison_cap_bonus",
    ))
      garrisonCap += Number((e.params as Record<string, unknown>)?.amount ?? 0);
  }

  const dpIncome = dpBase * (1 + dpMultPct / 100);
  const coinNet = taxIncome + coinFromEffects - upkeepCoin - garrisonCoin;
  const foodNet = foodProduced - foodConsumed;
  const grossCoin = taxIncome + coinFromEffects;

  // Composition (incl. garrison soldiers).
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

  const target = POPULATION_COMPOSITION_BY_TIER[tier] ?? {};
  const allClasses = new Set([...Object.keys(target), ...composition.map((c) => c.classId)]);
  const compositionDeviation = [...allClasses]
    .map((classId) => {
      const planPct = composition.find((c) => c.classId === classId)?.pct ?? 0;
      const targetPct = target[classId] ?? 0;
      return { classId, planPct, targetPct, delta: planPct - targetPct };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  // Staffing supply = housed working population of each class.
  const staffing = Object.keys(staffDemandAgg).map((classId) => ({
    classId,
    demand: staffDemandAgg[classId] ?? 0,
    supply: popByClass[classId] ?? 0,
  }));

  // Supply-chain reconciliation: for each input tag, what the plan produces
  // that satisfies it vs. what it demands.
  const inputBalance = Object.entries(consumption)
    .map(([tagId, demand]) => {
      const satisfying = Object.entries(production)
        .filter(([resId]) => tagsByResource.get(resId)?.has(tagId))
        .map(([resId, amount]) => ({ resourceId: resId, name: resName(resId), amount }));
      const supply = satisfying.reduce((s, r) => s + r.amount, 0);
      return { tagId, name: tagName(tagId), demand, supply, net: supply - demand, satisfying };
    })
    .sort((a, b) => a.net - b.net);

  // Efficiency ratios.
  const ratios = {
    coinPerPop: popCap > 0 ? coinNet / popCap : 0,
    coinPerDistrict: perDistrict.length > 0 ? coinNet / perDistrict.length : 0,
    taxPerCapita: popCap > 0 ? taxIncome / popCap : 0,
    foodSelfSufficiencyPct: foodConsumed > 0 ? (foodProduced / foodConsumed) * 100 : foodProduced > 0 ? 999 : 0,
    upkeepRatioPct: grossCoin > 0 ? ((upkeepCoin + garrisonCoin) / grossCoin) * 100 : 0,
    buildRoiDays: coinNet > 0 ? buildCoin / coinNet : null,
    scaleCoinBonus: taxIncome - taxIncomeBase,
    scaleCoinBonusPct: taxIncomeBase > 0 ? ((taxIncome - taxIncomeBase) / taxIncomeBase) * 100 : 0,
  };

  // Warnings.
  const warnings: string[] = [];
  if (foodNet < 0) warnings.push(`Food deficit: ${foodNet.toFixed(0)}/day — the settlement starves.`);
  if (coinNet < 0) warnings.push(`Coin deficit: ${coinNet.toFixed(0)}/day — the treasury bleeds.`);
  for (const s of staffing)
    if (s.demand > s.supply)
      warnings.push(
        `Understaffed: needs ${s.demand} ${occById.get(s.classId)?.displayName ?? s.classId}, only ${s.supply} housed.`,
      );
  for (const b of inputBalance)
    if (b.net < 0)
      warnings.push(`Short of ${b.name}: demand ${b.demand}, local supply ${b.supply.toFixed(1)}/day.`);
  if (soldiers > garrisonCap && soldiers > 0)
    warnings.push(`Garrison ${soldiers} exceeds cap ${garrisonCap} — build more barracks.`);
  if (popCap === 0 && plan.districts.length > 0)
    warnings.push("No housing yet — add a residential quarter to seat a population.");

  return {
    popCap,
    popByClass,
    composition,
    compositionDeviation,
    target,
    staffing,
    production: Object.entries(production)
      .map(([resourceId, amount]) => ({ resourceId, name: resName(resourceId), amount }))
      .sort((a, b) => b.amount - a.amount),
    consumption: Object.entries(consumption)
      .map(([tagId, amount]) => ({ tagId, name: tagName(tagId), amount }))
      .sort((a, b) => b.amount - a.amount),
    inputBalance,
    foodProduced,
    foodConsumed,
    foodConsumedCiv,
    foodNet,
    taxIncome,
    coinFromEffects,
    upkeepCoin,
    garrisonCoin,
    garrisonFood,
    grossCoin,
    coinNet,
    dpIncome,
    dpMultPct,
    prestige,
    soldiers,
    garrisonCap,
    buildCoin,
    buildDp,
    footMin,
    footMax,
    districtCount: plan.districts.length,
    ratios,
    perDistrict,
    warnings,
  };
}
