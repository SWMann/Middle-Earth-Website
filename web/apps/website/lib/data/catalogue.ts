import "server-only";
import { cache } from "react";
import { eq, desc, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";

// --- Resources ------------------------------------------------------------

export const getAllResources = cache(async () => {
  return await db
    .select()
    .from(schema.resources)
    .orderBy(schema.resources.displayName);
});

export const getResource = cache(async (id: string) => {
  const rows = await db
    .select()
    .from(schema.resources)
    .where(eq(schema.resources.id, id))
    .limit(1);
  return rows[0] ?? null;
});

/** What tags this resource satisfies and at what weight. */
export const getResourceTagWeights = cache(async (resourceId: string) => {
  return await db
    .select({
      tagId: schema.resourceTags.tagId,
      tagName: schema.tags.displayName,
      weight: schema.resourceTags.weight,
    })
    .from(schema.resourceTags)
    .innerJoin(schema.tags, eq(schema.resourceTags.tagId, schema.tags.id))
    .where(eq(schema.resourceTags.resourceId, resourceId))
    .orderBy(desc(schema.resourceTags.weight));
});

/** Which district types produce this resource. */
export const getDistrictTypesProducing = cache(async (resourceId: string) => {
  return await db
    .select({
      districtId: schema.districtTypes.id,
      districtName: schema.districtTypes.displayName,
      category: schema.districtTypes.category,
      dailyAmount: schema.districtProduces.dailyAmount,
    })
    .from(schema.districtProduces)
    .innerJoin(
      schema.districtTypes,
      eq(schema.districtProduces.districtTypeId, schema.districtTypes.id),
    )
    .where(eq(schema.districtProduces.resourceId, resourceId))
    .orderBy(desc(schema.districtProduces.dailyAmount));
});

/** Which unit types require this resource for recruitment. */
export const getUnitTypesRequiring = cache(async (resourceId: string) => {
  return await db
    .select({
      unitId: schema.unitTypes.id,
      unitName: schema.unitTypes.displayName,
      factionId: schema.unitTypes.factionId,
      amount: schema.unitRecruitmentCost.amount,
    })
    .from(schema.unitRecruitmentCost)
    .innerJoin(
      schema.unitTypes,
      eq(schema.unitRecruitmentCost.unitTypeId, schema.unitTypes.id),
    )
    .where(eq(schema.unitRecruitmentCost.resourceId, resourceId));
});

// --- Tags ---------------------------------------------------------------

export const getAllTags = cache(async () => {
  return await db
    .select()
    .from(schema.tags)
    .orderBy(schema.tags.displayName);
});

export const getTag = cache(async (id: string) => {
  const rows = await db
    .select()
    .from(schema.tags)
    .where(eq(schema.tags.id, id))
    .limit(1);
  return rows[0] ?? null;
});

/** Which resources satisfy this tag, ordered by weight (best first). */
export const getResourcesForTag = cache(async (tagId: string) => {
  return await db
    .select({
      resourceId: schema.resources.id,
      resourceName: schema.resources.displayName,
      weight: schema.resourceTags.weight,
    })
    .from(schema.resourceTags)
    .innerJoin(
      schema.resources,
      eq(schema.resourceTags.resourceId, schema.resources.id),
    )
    .where(eq(schema.resourceTags.tagId, tagId))
    .orderBy(desc(schema.resourceTags.weight));
});

// --- District types -----------------------------------------------------

export const getAllDistrictTypes = cache(async () => {
  return await db
    .select()
    .from(schema.districtTypes)
    .orderBy(schema.districtTypes.category, schema.districtTypes.displayName);
});

export const getDistrictType = cache(async (id: string) => {
  const rows = await db
    .select()
    .from(schema.districtTypes)
    .where(eq(schema.districtTypes.id, id))
    .limit(1);
  return rows[0] ?? null;
});

export const getDistrictConsumes = cache(async (districtTypeId: string) => {
  return await db
    .select({
      tagId: schema.districtConsumes.tagId,
      tagName: schema.tags.displayName,
      weightMin: schema.districtConsumes.weightMin,
      dailyAmount: schema.districtConsumes.dailyAmount,
      consumptionPeriod: schema.districtConsumes.consumptionPeriod,
    })
    .from(schema.districtConsumes)
    .innerJoin(schema.tags, eq(schema.districtConsumes.tagId, schema.tags.id))
    .where(eq(schema.districtConsumes.districtTypeId, districtTypeId));
});

export const getDistrictProduces = cache(async (districtTypeId: string) => {
  return await db
    .select({
      resourceId: schema.districtProduces.resourceId,
      resourceName: schema.resources.displayName,
      dailyAmount: schema.districtProduces.dailyAmount,
      outputKind: schema.districtProduces.outputKind,
    })
    .from(schema.districtProduces)
    .innerJoin(
      schema.resources,
      eq(schema.districtProduces.resourceId, schema.resources.id),
    )
    .where(eq(schema.districtProduces.districtTypeId, districtTypeId));
});

export const getDistrictBuildCost = cache(async (districtTypeId: string) => {
  return await db
    .select({
      resourceId: schema.districtBuildCost.resourceId,
      resourceName: schema.resources.displayName,
      amount: schema.districtBuildCost.amount,
    })
    .from(schema.districtBuildCost)
    .innerJoin(
      schema.resources,
      eq(schema.districtBuildCost.resourceId, schema.resources.id),
    )
    .where(eq(schema.districtBuildCost.districtTypeId, districtTypeId));
});

export const getDistrictStaffing = cache(async (districtTypeId: string) => {
  return await db
    .select({
      classId: schema.districtStaffing.classId,
      className: schema.occupationClasses.displayName,
      rank: schema.occupationClasses.rank,
      count: schema.districtStaffing.count,
    })
    .from(schema.districtStaffing)
    .innerJoin(
      schema.occupationClasses,
      eq(schema.districtStaffing.classId, schema.occupationClasses.id),
    )
    .where(eq(schema.districtStaffing.districtTypeId, districtTypeId));
});

export const getDistrictEffects = cache(async (districtTypeId: string) => {
  return await db
    .select()
    .from(schema.districtEffects)
    .where(eq(schema.districtEffects.districtTypeId, districtTypeId));
});

export const getDistrictBiomeOutputs = cache(async (districtTypeId: string) => {
  return await db
    .select({
      biome: schema.districtBiomeOutputs.biome,
      resourceId: schema.districtBiomeOutputs.resourceId,
      resourceName: schema.resources.displayName,
      dailyAmount: schema.districtBiomeOutputs.dailyAmount,
    })
    .from(schema.districtBiomeOutputs)
    .innerJoin(
      schema.resources,
      eq(schema.districtBiomeOutputs.resourceId, schema.resources.id),
    )
    .where(eq(schema.districtBiomeOutputs.districtTypeId, districtTypeId))
    .orderBy(desc(schema.districtBiomeOutputs.dailyAmount));
});

/** Districts that must exist before this one can be built. */
export const getDistrictPrerequisites = cache(async (districtTypeId: string) => {
  return await db
    .select({
      id: schema.districtTypes.id,
      displayName: schema.districtTypes.displayName,
    })
    .from(schema.districtPrerequisites)
    .innerJoin(
      schema.districtTypes,
      eq(
        schema.districtPrerequisites.prerequisiteDistrictTypeId,
        schema.districtTypes.id,
      ),
    )
    .where(eq(schema.districtPrerequisites.districtTypeId, districtTypeId));
});

/** What upgrades into this district (children) — the inverse of upgradesFrom. */
export const getDistrictUpgradeTargets = cache(async (districtTypeId: string) => {
  return await db
    .select({
      id: schema.districtTypes.id,
      displayName: schema.districtTypes.displayName,
    })
    .from(schema.districtTypes)
    .where(eq(schema.districtTypes.upgradesFrom, districtTypeId));
});

export const getDistrictAdjacencyBonuses = cache(
  async (districtTypeId: string) => {
    return await db
      .select({
        adjacentId: schema.districtTypes.id,
        adjacentName: schema.districtTypes.displayName,
        bonusType: schema.districtAdjacencyBonuses.bonusType,
        bonusValue: schema.districtAdjacencyBonuses.bonusValue,
      })
      .from(schema.districtAdjacencyBonuses)
      .innerJoin(
        schema.districtTypes,
        eq(
          schema.districtAdjacencyBonuses.adjacentDistrictTypeId,
          schema.districtTypes.id,
        ),
      )
      .where(eq(schema.districtAdjacencyBonuses.districtTypeId, districtTypeId));
  },
);

/** Per-faction rules affecting this district (restrict/unlock/override/modify). */
export const getFactionRulesForDistrict = cache(
  async (districtTypeId: string) => {
    // Match rules where this district is the subject OR the override target.
    return await db
      .select()
      .from(schema.factionDistrictRules)
      .where(
        or(
          eq(schema.factionDistrictRules.districtTypeId, districtTypeId),
        ),
      );
  },
);

export const getDistrictProductionBonuses = cache(
  async (districtTypeId: string) => {
    return await db
      .select()
      .from(schema.districtProductionBonuses)
      .where(eq(schema.districtProductionBonuses.districtTypeId, districtTypeId));
  },
);

export const getDistrictTierOutput = cache(async (districtTypeId: string) => {
  return await db
    .select()
    .from(schema.districtTierOutput)
    .where(eq(schema.districtTierOutput.districtTypeId, districtTypeId));
});

/** Alternate recipes (modes) with their nested consumes + produces. */
export const getDistrictRecipes = cache(async (districtTypeId: string) => {
  const recipes = await db
    .select()
    .from(schema.districtRecipes)
    .where(eq(schema.districtRecipes.districtTypeId, districtTypeId));

  return await Promise.all(
    recipes.map(async (r) => {
      const [consumes, produces] = await Promise.all([
        db
          .select({
            tagId: schema.recipeConsumes.tagId,
            tagName: schema.tags.displayName,
            weightMin: schema.recipeConsumes.weightMin,
            dailyAmount: schema.recipeConsumes.dailyAmount,
          })
          .from(schema.recipeConsumes)
          .innerJoin(schema.tags, eq(schema.recipeConsumes.tagId, schema.tags.id))
          .where(eq(schema.recipeConsumes.recipeId, r.id)),
        db
          .select({
            resourceId: schema.recipeProduces.resourceId,
            resourceName: schema.resources.displayName,
            dailyAmount: schema.recipeProduces.dailyAmount,
            outputKind: schema.recipeProduces.outputKind,
          })
          .from(schema.recipeProduces)
          .innerJoin(
            schema.resources,
            eq(schema.recipeProduces.resourceId, schema.resources.id),
          )
          .where(eq(schema.recipeProduces.recipeId, r.id)),
      ]);
      return { ...r, consumes, produces };
    }),
  );
});

// --- Unit types --------------------------------------------------------

export const getAllUnitTypes = cache(async () => {
  return await db
    .select()
    .from(schema.unitTypes)
    .orderBy(schema.unitTypes.factionId, schema.unitTypes.displayName);
});

export const getUnitType = cache(async (id: string) => {
  const rows = await db
    .select()
    .from(schema.unitTypes)
    .where(eq(schema.unitTypes.id, id))
    .limit(1);
  return rows[0] ?? null;
});

export const getUnitRecruitmentCost = cache(async (unitTypeId: string) => {
  return await db
    .select({
      resourceId: schema.unitRecruitmentCost.resourceId,
      resourceName: schema.resources.displayName,
      amount: schema.unitRecruitmentCost.amount,
    })
    .from(schema.unitRecruitmentCost)
    .innerJoin(
      schema.resources,
      eq(schema.unitRecruitmentCost.resourceId, schema.resources.id),
    )
    .where(eq(schema.unitRecruitmentCost.unitTypeId, unitTypeId));
});

export const getUnitAttacks = cache(async (unitTypeId: string) => {
  return await db
    .select()
    .from(schema.unitAttacks)
    .where(eq(schema.unitAttacks.unitTypeId, unitTypeId));
});

export const getUnitTraits = cache(async (unitTypeId: string) => {
  return await db
    .select({
      id: schema.combatTraits.id,
      displayName: schema.combatTraits.displayName,
      description: schema.combatTraits.description,
      effect: schema.combatTraits.effect,
    })
    .from(schema.unitTraits)
    .innerJoin(
      schema.combatTraits,
      eq(schema.unitTraits.traitId, schema.combatTraits.id),
    )
    .where(eq(schema.unitTraits.unitTypeId, unitTypeId));
});

export const getUnitAbilities = cache(async (unitTypeId: string) => {
  return await db
    .select()
    .from(schema.unitAbilities)
    .where(eq(schema.unitAbilities.unitTypeId, unitTypeId));
});

/** Counter matchups where this unit's category is the attacker. */
export const getCountersForCategory = cache(async (category: string) => {
  return await db
    .select()
    .from(schema.unitCounters)
    .where(eq(schema.unitCounters.attackerCategory, category))
    .orderBy(desc(schema.unitCounters.modifierPct));
});

/** Terrain modifiers for a unit's category. */
export const getTerrainModifiersForCategory = cache(async (category: string) => {
  return await db
    .select()
    .from(schema.unitTerrainModifiers)
    .where(eq(schema.unitTerrainModifiers.category, category))
    .orderBy(desc(schema.unitTerrainModifiers.modifierPct));
});

/** The global veterancy ladder (shared by all units). */
export const getRankLadder = cache(async () => {
  return await db
    .select()
    .from(schema.unitRanks)
    .orderBy(schema.unitRanks.level);
});

// --- Buildings & composition --------------------------------------------

export const getAllBuildingTypes = cache(async () => {
  return await db
    .select()
    .from(schema.buildingTypes)
    .orderBy(schema.buildingTypes.category, schema.buildingTypes.displayName);
});

export const getAllFunctionalComponents = cache(async () => {
  return await db
    .select()
    .from(schema.functionalComponents)
    .orderBy(schema.functionalComponents.displayName);
});

export const getBuildingComponents = cache(async (buildingTypeId: string) => {
  return await db
    .select({
      id: schema.functionalComponents.id,
      displayName: schema.functionalComponents.displayName,
    })
    .from(schema.buildingProvidesComponents)
    .innerJoin(
      schema.functionalComponents,
      eq(schema.buildingProvidesComponents.componentId, schema.functionalComponents.id),
    )
    .where(eq(schema.buildingProvidesComponents.buildingTypeId, buildingTypeId));
});

export const getDistrictRequiredBuildings = cache(
  async (districtTypeId: string) => {
    return await db
      .select({
        id: schema.districtRequiredBuildings.id,
        kind: schema.districtRequiredBuildings.kind,
        buildingTypeId: schema.districtRequiredBuildings.buildingTypeId,
        buildingName: schema.buildingTypes.displayName,
        count: schema.districtRequiredBuildings.count,
        themeNote: schema.districtRequiredBuildings.themeNote,
      })
      .from(schema.districtRequiredBuildings)
      .leftJoin(
        schema.buildingTypes,
        eq(schema.districtRequiredBuildings.buildingTypeId, schema.buildingTypes.id),
      )
      .where(eq(schema.districtRequiredBuildings.districtTypeId, districtTypeId));
  },
);

export const getDistrictRequiredComponents = cache(
  async (districtTypeId: string) => {
    return await db
      .select({
        componentId: schema.districtRequiredComponents.componentId,
        componentName: schema.functionalComponents.displayName,
        count: schema.districtRequiredComponents.count,
        perCap: schema.districtRequiredComponents.perCap,
      })
      .from(schema.districtRequiredComponents)
      .innerJoin(
        schema.functionalComponents,
        eq(
          schema.districtRequiredComponents.componentId,
          schema.functionalComponents.id,
        ),
      )
      .where(eq(schema.districtRequiredComponents.districtTypeId, districtTypeId));
  },
);

/** All building→component links in one shot, for the buildings index. */
export const getAllBuildingComponentLinks = cache(async () => {
  return await db
    .select({
      buildingTypeId: schema.buildingProvidesComponents.buildingTypeId,
      componentId: schema.buildingProvidesComponents.componentId,
      componentName: schema.functionalComponents.displayName,
    })
    .from(schema.buildingProvidesComponents)
    .innerJoin(
      schema.functionalComponents,
      eq(
        schema.buildingProvidesComponents.componentId,
        schema.functionalComponents.id,
      ),
    );
});

/** Reverse index: which districts require each specific building. */
export const getBuildingDistrictUsage = cache(async () => {
  return await db
    .select({
      buildingTypeId: schema.districtRequiredBuildings.buildingTypeId,
      districtTypeId: schema.districtRequiredBuildings.districtTypeId,
      districtName: schema.districtTypes.displayName,
      count: schema.districtRequiredBuildings.count,
    })
    .from(schema.districtRequiredBuildings)
    .innerJoin(
      schema.districtTypes,
      eq(
        schema.districtRequiredBuildings.districtTypeId,
        schema.districtTypes.id,
      ),
    )
    .where(eq(schema.districtRequiredBuildings.kind, "specific"));
});

export const getDecorationCriteria = cache(async () => {
  return await db
    .select()
    .from(schema.decorationCriteria)
    .orderBy(desc(schema.decorationCriteria.weightPct));
});

export const getTierDecorationThresholds = cache(async () => {
  return await db.select().from(schema.tierDecorationThresholds);
});
