import "server-only";
import { cache } from "react";
import { eq, desc } from "drizzle-orm";
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
    })
    .from(schema.districtProduces)
    .innerJoin(
      schema.resources,
      eq(schema.districtProduces.resourceId, schema.resources.id),
    )
    .where(eq(schema.districtProduces.districtTypeId, districtTypeId));
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
