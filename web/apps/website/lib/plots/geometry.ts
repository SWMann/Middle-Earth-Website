/**
 * The shared plot/floorplan geometry contract — the single source of truth
 * for the image/grid ↔ block-space relation, used by the web floorplanner
 * (authoring), server actions (persisting), and the read-only review preview.
 * The Java scanner mirrors the result shapes (ComponentValidation /
 * FootprintValidation) 1:1.
 *
 * Pure module — no `server-only`, no DB — so the `use client` floorplanner can
 * import it. Native TS execution needs explicit `.ts` import extensions
 * elsewhere, but this file has no imports.
 */

/**
 * The image/grid ↔ block-space relation. A floorplanner "cell" is the grid
 * unit; blocksPerCell scales it to the world. Rotation is constrained to 90°
 * multiples so the projection is exact integer block math.
 */
export type PlotTransform = {
  /** World X of grid cell (0,0)'s min corner. */
  originBlockX: number;
  /** World Z of grid cell (0,0)'s min corner. */
  originBlockZ: number;
  /** World Y the floor sits at (the plot's minY for scans). */
  baseY: number;
  /** Scale: e.g. 4 → each grid cell is 4×4 blocks. */
  blocksPerCell: number;
  /** Grid→world rotation about the origin. */
  rotationDeg: 0 | 90 | 180 | 270;
};

/**
 * Optional 2-point georeference used to DERIVE a transform from an underlay
 * image: the user clicks two pixels and types the world coord each maps to;
 * we solve for scale + rotation + origin. Stored so it can be re-edited.
 */
export type Georeference = {
  imageWidthPx: number;
  imageHeightPx: number;
  p1: { px: number; py: number; blockX: number; blockZ: number };
  p2: { px: number; py: number; blockX: number; blockZ: number };
};

/** A building footprint in GRID-CELL coords (authoring space). */
export type PlotBuilding = {
  uid: string;
  /** config.building_types.id — the catalogue building this footprint is. */
  buildingTypeId: string;
  shape: "rect" | "cells";
  rect?: { cx: number; cz: number; w: number; h: number };
  cells?: [number, number][];
};

export type PlotLayout = {
  /** The plot outline in GRID-CELL coords. */
  footprintCells: [number, number][];
  buildings: PlotBuilding[];
};

// --- Scan-result shapes (mirror the Java records) ------------------------

export type ComponentValidation = {
  required: {
    componentId: string;
    need: number;
    found: number;
    ok: boolean;
  }[];
  pass: boolean;
};

export type FootprintValidation = {
  areaBlocks: number;
  minFootprint: number | null;
  maxFootprint: number | null;
  heightBlocks: number;
  minHeight: number | null;
  buildingCount: number;
  requiredBuildings: {
    slotKey: string;
    need: number;
    max: number | null;
    found: number;
    ok: boolean;
  }[];
  /** Whether building-count was actually verifiable (false → defer to review). */
  buildingsVerified: boolean;
  pass: boolean;
};

// --- Projection: the one transform used everywhere -----------------------

/** Rotate a grid cell (cx, cz) by the transform's 90°-snapped rotation. */
function rotateCell(
  cx: number,
  cz: number,
  rotationDeg: number,
): [number, number] {
  switch (((rotationDeg % 360) + 360) % 360) {
    case 90:
      return [-cz, cx];
    case 180:
      return [-cx, -cz];
    case 270:
      return [cz, -cx];
    default:
      return [cx, cz];
  }
}

/** Grid cell (min corner) → world block (X, Z). */
export function cellToBlock(
  cx: number,
  cz: number,
  t: PlotTransform,
): [number, number] {
  const [rx, rz] = rotateCell(cx, cz, t.rotationDeg);
  return [
    t.originBlockX + rx * t.blocksPerCell,
    t.originBlockZ + rz * t.blocksPerCell,
  ];
}

/**
 * Expand a layout's grid-cell footprint to the set of world block columns it
 * covers, and the enclosing AABB (XZ). minY/maxY come from baseY + a height.
 */
export function projectFootprint(
  layout: PlotLayout,
  t: PlotTransform,
): { cells: [number, number][]; minX: number; minZ: number; maxX: number; maxZ: number } {
  const cells: [number, number][] = [];
  let minX = Infinity,
    minZ = Infinity,
    maxX = -Infinity,
    maxZ = -Infinity;
  for (const [cx, cz] of layout.footprintCells) {
    const [bx, bz] = cellToBlock(cx, cz, t);
    for (let dx = 0; dx < t.blocksPerCell; dx++) {
      for (let dz = 0; dz < t.blocksPerCell; dz++) {
        const x = bx + dx;
        const z = bz + dz;
        cells.push([x, z]);
        if (x < minX) minX = x;
        if (z < minZ) minZ = z;
        if (x > maxX) maxX = x;
        if (z > maxZ) maxZ = z;
      }
    }
  }
  return { cells, minX, minZ, maxX, maxZ };
}

/**
 * Solve a PlotTransform from a 2-point georeference. Rotation is snapped to
 * the nearest 90°; scale to the nearest whole blocks-per-cell ≥ 1.
 */
export function solveTransform(
  geo: Georeference,
  baseY: number,
  imagePxPerCell: number,
): PlotTransform {
  const dpx = geo.p2.px - geo.p1.px;
  const dpy = geo.p2.py - geo.p1.py;
  const dbx = geo.p2.blockX - geo.p1.blockX;
  const dbz = geo.p2.blockZ - geo.p1.blockZ;
  const pixelDist = Math.hypot(dpx, dpy) || 1;
  const blockDist = Math.hypot(dbx, dbz);
  const blocksPerPixel = blockDist / pixelDist;
  const blocksPerCell = Math.max(1, Math.round(blocksPerPixel * imagePxPerCell));
  // Angle between the image vector and the world vector, snapped to 90°.
  const imgAngle = Math.atan2(dpy, dpx);
  const worldAngle = Math.atan2(dbz, dbx);
  const rawDeg = ((worldAngle - imgAngle) * 180) / Math.PI;
  const snapped = (((Math.round(rawDeg / 90) * 90) % 360) + 360) % 360;
  const rotationDeg = snapped as PlotTransform["rotationDeg"];
  // Origin: where image pixel (0,0) maps in block space (cell coords of p1).
  const cellX = Math.round(geo.p1.px / imagePxPerCell);
  const cellZ = Math.round(geo.p1.py / imagePxPerCell);
  const [rx, rz] = rotateCell(cellX, cellZ, rotationDeg);
  return {
    originBlockX: Math.round(geo.p1.blockX - rx * blocksPerCell),
    originBlockZ: Math.round(geo.p1.blockZ - rz * blocksPerCell),
    baseY,
    blocksPerCell,
    rotationDeg,
  };
}
