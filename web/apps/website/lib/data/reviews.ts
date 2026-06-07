import "server-only";
import { cache } from "react";
import { desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/**
 * Data for the admin build-review surface (app/admin/reviews). Reads
 * game.plots that the in-game scanner left pending — i.e. builds that scored
 * below their tier threshold, failed validation, or couldn't be auto-verified
 * (composite components, unverified building count). Staff approve/reject them;
 * the write goes back through the bridge (game.plots is SELECT-only here).
 */

/** The two statuses that mean "a human needs to look". */
export const PENDING_STATUSES = ["pending_spot", "pending_full"] as const;

export const getReviewQueue = cache(async () => {
  return db
    .select({
      id: schema.plots.id,
      districtType: schema.plots.districtType,
      districtName: schema.districtTypes.displayName,
      label: schema.plots.label,
      source: schema.plots.source,
      factionId: schema.plots.factionId,
      factionName: schema.factions.displayName,
      bannerHex: schema.factions.bannerHex,
      settlementId: schema.plots.settlementId,
      settlementName: schema.settlements.name,
      settlementTier: schema.settlements.tier,
      decorationScore: schema.plots.decorationScore,
      reviewStatus: schema.plots.reviewStatus,
      reviewMode: schema.plots.reviewMode,
      scannedAt: schema.plots.scannedAt,
      minX: schema.plots.minX,
      minY: schema.plots.minY,
      minZ: schema.plots.minZ,
      maxX: schema.plots.maxX,
      maxY: schema.plots.maxY,
      maxZ: schema.plots.maxZ,
      componentResult: schema.plots.componentResult,
      footprintResult: schema.plots.footprintResult,
    })
    .from(schema.plots)
    .leftJoin(schema.districtTypes, eq(schema.districtTypes.id, schema.plots.districtType))
    .leftJoin(schema.factions, eq(schema.factions.id, schema.plots.factionId))
    .leftJoin(schema.settlements, eq(schema.settlements.id, schema.plots.settlementId))
    .where(inArray(schema.plots.reviewStatus, [...PENDING_STATUSES]))
    .orderBy(desc(schema.plots.scannedAt));
});

export type ReviewQueueItem = Awaited<ReturnType<typeof getReviewQueue>>[number];

export const getPlotForReview = cache(async (id: number) => {
  const [plot] = await db
    .select({
      id: schema.plots.id,
      districtType: schema.plots.districtType,
      districtName: schema.districtTypes.displayName,
      label: schema.plots.label,
      source: schema.plots.source,
      factionId: schema.plots.factionId,
      factionName: schema.factions.displayName,
      bannerHex: schema.factions.bannerHex,
      cultureId: schema.factions.cultureId,
      settlementId: schema.plots.settlementId,
      settlementName: schema.settlements.name,
      settlementTier: schema.settlements.tier,
      districtId: schema.plots.districtId,
      decorationScore: schema.plots.decorationScore,
      reviewStatus: schema.plots.reviewStatus,
      reviewMode: schema.plots.reviewMode,
      reviewedBy: schema.plots.reviewedBy,
      reviewNote: schema.plots.reviewNote,
      scannedAt: schema.plots.scannedAt,
      scanAuditEventId: schema.plots.scanAuditEventId,
      minX: schema.plots.minX,
      minY: schema.plots.minY,
      minZ: schema.plots.minZ,
      maxX: schema.plots.maxX,
      maxY: schema.plots.maxY,
      maxZ: schema.plots.maxZ,
      criteriaBreakdown: schema.plots.criteriaBreakdown,
      componentResult: schema.plots.componentResult,
      footprintResult: schema.plots.footprintResult,
      footprintCells: schema.plots.footprintCells,
      transform: schema.plots.transform,
      layout: schema.plots.layout,
    })
    .from(schema.plots)
    .leftJoin(schema.districtTypes, eq(schema.districtTypes.id, schema.plots.districtType))
    .leftJoin(schema.factions, eq(schema.factions.id, schema.plots.factionId))
    .leftJoin(schema.settlements, eq(schema.settlements.id, schema.plots.settlementId))
    .where(eq(schema.plots.id, id))
    .limit(1);

  if (!plot) return null;

  const criteria = await db
    .select({
      id: schema.decorationCriteria.id,
      displayName: schema.decorationCriteria.displayName,
      weightPct: schema.decorationCriteria.weightPct,
    })
    .from(schema.decorationCriteria);

  return { plot, criteria };
});

export type PlotReviewDetail = NonNullable<Awaited<ReturnType<typeof getPlotForReview>>>;
