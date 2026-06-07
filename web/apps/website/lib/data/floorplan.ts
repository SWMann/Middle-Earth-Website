import "server-only";
import { cache } from "react";
import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/**
 * Trimmed one-shot catalogue for the web floorplanner (app/admin/floorplan).
 * Just enough to pick a district + faction + settlement and place building
 * footprints labelled by their catalogue id. The heavy economic catalogue
 * (the planner's bundle) isn't needed here — the floorplanner only authors
 * geometry + a layout, which Phase E later scans.
 */
export const getFloorplanCatalogue = cache(async () => {
  const [districtTypes, buildingTypes, factions, settlements] = await Promise.all([
    db
      .select({
        id: schema.districtTypes.id,
        displayName: schema.districtTypes.displayName,
        category: schema.districtTypes.category,
        minFootprintBlocks: schema.districtTypes.minFootprintBlocks,
        maxFootprintBlocks: schema.districtTypes.maxFootprintBlocks,
        minHeightBlocks: schema.districtTypes.minHeightBlocks,
      })
      .from(schema.districtTypes)
      .orderBy(asc(schema.districtTypes.category), asc(schema.districtTypes.displayName)),
    db
      .select({
        id: schema.buildingTypes.id,
        displayName: schema.buildingTypes.displayName,
        category: schema.buildingTypes.category,
        minFootprintBlocks: schema.buildingTypes.minFootprintBlocks,
        maxFootprintBlocks: schema.buildingTypes.maxFootprintBlocks,
      })
      .from(schema.buildingTypes)
      .orderBy(asc(schema.buildingTypes.category), asc(schema.buildingTypes.displayName)),
    db
      .select({
        id: schema.factions.id,
        displayName: schema.factions.displayName,
        cultureId: schema.factions.cultureId,
        bannerHex: schema.factions.bannerHex,
      })
      .from(schema.factions)
      .orderBy(asc(schema.factions.displayName)),
    db
      .select({
        id: schema.settlements.id,
        name: schema.settlements.name,
        tier: schema.settlements.tier,
        factionId: schema.settlements.factionId,
      })
      .from(schema.settlements)
      .orderBy(asc(schema.settlements.name)),
  ]);

  return { districtTypes, buildingTypes, factions, settlements };
});

export type FloorplanCatalogue = Awaited<ReturnType<typeof getFloorplanCatalogue>>;
