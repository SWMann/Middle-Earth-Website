"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import type { PlotBuilding } from "./geometry";

/**
 * The one SVG renderer for a plot grid — used interactively by the
 * floorplanner editor and (read-only) anywhere a layout needs to be shown.
 * Pure presentation: it draws the grid, the painted footprint, building
 * footprints (labelled by catalogue id), an optional underlay image, and any
 * hover/draft overlays. All interaction is delegated up via the pointer
 * callbacks, which translate client coords → integer grid cells.
 */

const CATEGORY_FILL: Record<string, string> = {
  residential: "#d97706",
  agricultural: "#65a30d",
  extraction: "#78716c",
  industrial: "#dc2626",
  artisanal: "#7c3aed",
  trade: "#0891b2",
  military: "#b91c1c",
  governance: "#a16207",
  defensive: "#525252",
};

export function buildingFill(category: string | undefined): string {
  return (category && CATEGORY_FILL[category]) || "#6b7280";
}

export type PlotCanvasProps = {
  gridW: number;
  gridH: number;
  cellPx: number;
  /** Painted footprint cells, keyed "x,z". */
  footprint: Set<string>;
  buildings: PlotBuilding[];
  /** category per building id, for colouring. */
  categoryOf?: (buildingTypeId: string) => string | undefined;
  underlay?: { src: string; opacity: number } | null;
  hoverCell?: { x: number; z: number } | null;
  draftRect?: { x: number; z: number; w: number; h: number } | null;
  selectedUid?: string | null;
  /** Markers in cell space (e.g. georeference anchor points). */
  markers?: { x: number; z: number; label: string }[];
  readOnly?: boolean;
  onCellDown?: (x: number, z: number, e: ReactPointerEvent) => void;
  onCellEnter?: (x: number, z: number) => void;
  onPointerUp?: () => void;
};

export function PlotCanvas({
  gridW,
  gridH,
  cellPx,
  footprint,
  buildings,
  categoryOf,
  underlay,
  hoverCell,
  draftRect,
  selectedUid,
  markers,
  readOnly,
  onCellDown,
  onCellEnter,
  onPointerUp,
}: PlotCanvasProps) {
  const w = gridW * cellPx;
  const h = gridH * cellPx;

  function cellFromEvent(e: ReactPointerEvent): { x: number; z: number } | null {
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellPx);
    const z = Math.floor((e.clientY - rect.top) / cellPx);
    if (x < 0 || z < 0 || x >= gridW || z >= gridH) return null;
    return { x, z };
  }

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="touch-none select-none rounded bg-stone-100 dark:bg-stone-900"
      style={{ cursor: readOnly ? "default" : "crosshair" }}
      onPointerDown={(e) => {
        if (readOnly || !onCellDown) return;
        const c = cellFromEvent(e);
        if (c) {
          try {
            (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
          } catch {
            /* pointer capture is best-effort (e.g. synthetic events) */
          }
          onCellDown(c.x, c.z, e);
        }
      }}
      onPointerMove={(e) => {
        if (readOnly || !onCellEnter) return;
        const c = cellFromEvent(e);
        if (c) onCellEnter(c.x, c.z);
      }}
      onPointerUp={() => onPointerUp?.()}
    >
      {underlay && (
        <image
          href={underlay.src}
          x={0}
          y={0}
          width={w}
          height={h}
          opacity={underlay.opacity}
          preserveAspectRatio="none"
        />
      )}

      {/* Footprint cells. */}
      {[...footprint].map((key) => {
        const parts = key.split(",");
        const cx = Number(parts[0]);
        const cz = Number(parts[1]);
        return (
          <rect
            key={`f${key}`}
            x={cx * cellPx}
            y={cz * cellPx}
            width={cellPx}
            height={cellPx}
            className="fill-amber-500/25"
          />
        );
      })}

      {/* Grid lines. */}
      <g className="stroke-stone-300/60 dark:stroke-stone-700/60" strokeWidth={0.5}>
        {Array.from({ length: gridW + 1 }, (_, i) => (
          <line key={`v${i}`} x1={i * cellPx} y1={0} x2={i * cellPx} y2={h} />
        ))}
        {Array.from({ length: gridH + 1 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={i * cellPx} x2={w} y2={i * cellPx} />
        ))}
      </g>

      {/* Buildings. */}
      {buildings.map((b) => {
        if (b.shape !== "rect" || !b.rect) return null;
        const { cx, cz, w: bw, h: bh } = b.rect;
        const fill = buildingFill(categoryOf?.(b.buildingTypeId));
        const selected = b.uid === selectedUid;
        return (
          <g key={b.uid}>
            <rect
              x={cx * cellPx}
              y={cz * cellPx}
              width={bw * cellPx}
              height={bh * cellPx}
              fill={fill}
              fillOpacity={0.45}
              stroke={fill}
              strokeWidth={selected ? 2.5 : 1.25}
            />
            <text
              x={(cx + bw / 2) * cellPx}
              y={(cz + bh / 2) * cellPx}
              textAnchor="middle"
              dominantBaseline="middle"
              className="pointer-events-none fill-stone-800 dark:fill-stone-100"
              style={{ fontSize: Math.min(11, cellPx * 0.8) }}
            >
              {b.buildingTypeId}
            </text>
          </g>
        );
      })}

      {/* Draft building rectangle (drag preview). */}
      {draftRect && (
        <rect
          x={draftRect.x * cellPx}
          y={draftRect.z * cellPx}
          width={draftRect.w * cellPx}
          height={draftRect.h * cellPx}
          className="fill-sky-500/30 stroke-sky-500"
          strokeWidth={1.5}
          strokeDasharray="4 2"
        />
      )}

      {/* Hover cell. */}
      {hoverCell && !readOnly && (
        <rect
          x={hoverCell.x * cellPx}
          y={hoverCell.z * cellPx}
          width={cellPx}
          height={cellPx}
          className="fill-sky-400/20 stroke-sky-400"
          strokeWidth={1}
        />
      )}

      {/* Georeference markers. */}
      {markers?.map((m, i) => (
        <g key={`m${i}`}>
          <circle cx={(m.x + 0.5) * cellPx} cy={(m.z + 0.5) * cellPx} r={Math.max(4, cellPx * 0.3)} className="fill-fuchsia-500" />
          <text
            x={(m.x + 0.5) * cellPx}
            y={(m.z + 0.5) * cellPx - cellPx}
            textAnchor="middle"
            className="fill-fuchsia-500"
            style={{ fontSize: 10 }}
          >
            {m.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
