import "server-only";
import { cache } from "react";
import { db, schema } from "@/lib/db";

/**
 * One-shot loader for the settlement planner. Pulls the whole (small)
 * catalogue the client-side calculator needs into a single serialisable
 * bundle so the preview can be computed entirely in the browser as the
 * user edits the plan. Admin-only tool; see app/admin/planner.
 */
export const getPlannerCatalogue = cache(async () => {
  const [
    factions,
    cultures,
    occupationClasses,
    resources,
    tags,
    districtTypes,
    consumes,
    produces,
    staffing,
    effects,
    scaleBonuses,
    tierOutput,
    requiredBuildings,
    requiredComponents,
    buildingTypes,
    provides,
    buildingOutputs,
    buildingEffects,
    functionalComponents,
    buildingVariants,
    buildingTags,
    resourceTags,
    tierThresholds,
    factionRules,
    unitTypes,
  ] = await Promise.all([
    db
      .select({
        id: schema.factions.id,
        displayName: schema.factions.displayName,
        alignment: schema.factions.alignment,
        cultureId: schema.factions.cultureId,
        bannerHex: schema.factions.bannerHex,
        parentFactionId: schema.factions.parentFactionId,
      })
      .from(schema.factions),
    db
      .select({ id: schema.cultures.id, displayName: schema.cultures.displayName })
      .from(schema.cultures),
    db.select().from(schema.occupationClasses),
    db
      .select({
        id: schema.resources.id,
        displayName: schema.resources.displayName,
        foodValue: schema.resources.foodValue,
      })
      .from(schema.resources),
    db.select({ id: schema.tags.id, displayName: schema.tags.displayName }).from(schema.tags),
    db.select().from(schema.districtTypes),
    db.select().from(schema.districtConsumes),
    db.select().from(schema.districtProduces),
    db.select().from(schema.districtStaffing),
    db.select().from(schema.districtEffects),
    db.select().from(schema.districtScaleBonuses),
    db.select().from(schema.districtTierOutput),
    db.select().from(schema.districtRequiredBuildings),
    db.select().from(schema.districtRequiredComponents),
    db.select().from(schema.buildingTypes),
    db.select().from(schema.buildingProvidesComponents),
    db.select().from(schema.buildingOutputs),
    db.select().from(schema.buildingEffects),
    db
      .select({
        id: schema.functionalComponents.id,
        displayName: schema.functionalComponents.displayName,
      })
      .from(schema.functionalComponents),
    db
      .select({
        buildingTypeId: schema.buildingVariants.buildingTypeId,
        cultureId: schema.buildingVariants.cultureId,
        variantName: schema.buildingVariants.variantName,
      })
      .from(schema.buildingVariants),
    db.select().from(schema.buildingTags),
    db.select().from(schema.resourceTags),
    db.select().from(schema.tierDecorationThresholds),
    db.select().from(schema.factionDistrictRules),
    db
      .select({
        id: schema.unitTypes.id,
        displayName: schema.unitTypes.displayName,
        factionId: schema.unitTypes.factionId,
        category: schema.unitTypes.category,
        tierRequired: schema.unitTypes.tierRequired,
        popCost: schema.unitTypes.popCost,
        coinCost: schema.unitTypes.coinCost,
        upkeepFoodDaily: schema.unitTypes.upkeepFoodDaily,
        upkeepCoinDaily: schema.unitTypes.upkeepCoinDaily,
      })
      .from(schema.unitTypes),
  ]);

  const bedsByBuilding = new Map<string, number>();
  for (const p of provides) {
    if (p.componentId === "BED") bedsByBuilding.set(p.buildingTypeId, p.quantity);
  }

  return {
    factions,
    cultures,
    occupationClasses,
    resources,
    tags,
    districtTypes,
    consumes,
    produces,
    staffing,
    effects,
    scaleBonuses,
    tierOutput,
    requiredBuildings,
    requiredComponents,
    buildingTypes: buildingTypes.map((b) => ({
      id: b.id,
      displayName: b.displayName,
      category: b.category,
      housingClass: b.housingClass,
      tierMin: b.tierMin,
      minFootprintBlocks: b.minFootprintBlocks,
      maxFootprintBlocks: b.maxFootprintBlocks,
      minHeightBlocks: b.minHeightBlocks,
      level: b.level,
      upgradesFrom: b.upgradesFrom,
      beds: bedsByBuilding.get(b.id) ?? 0,
    })),
    provides,
    buildingOutputs,
    buildingEffects,
    functionalComponents,
    buildingVariants,
    buildingTags,
    resourceTags,
    tierThresholds,
    factionRules,
    unitTypes,
  };
});

export type PlannerCatalogue = Awaited<ReturnType<typeof getPlannerCatalogue>>;
