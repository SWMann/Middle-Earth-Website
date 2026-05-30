"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { MapRegion, MapSettlement } from "@/lib/data/map";

type Props = {
  regions: MapRegion[];
  settlements: MapSettlement[];
};

/**
 * Phase 2 world map. SVG-based, no pan/zoom (the seed data fits one
 * viewport). North-up, east-right — direct (worldX, worldZ) → (svgX, svgY)
 * mapping, no flipping needed because SVG y also increases downward.
 *
 * Settlement-tier sizing is purely visual; the underlying data still
 * carries the canonical tier string.
 *
 * Replace with a PixiJS / Canvas2D renderer when the region count climbs.
 * The data contract (MapRegion, MapSettlement) is the stable surface.
 */
export function WorldMap({ regions, settlements }: Props) {
  const bounds = useMemo(() => computeBounds(regions, settlements), [regions, settlements]);

  const [hovered, setHovered] = useState<HoverTarget | null>(null);
  const [pinned, setPinned] = useState<HoverTarget | null>(null);

  const focus = pinned ?? hovered;

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      {/* ----- Map canvas ----- */}
      <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 overflow-hidden">
        <svg
          viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
          className="w-full h-auto block"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="World map of Middle-earth showing region claims and settlements"
        >
          {/* Grid */}
          <defs>
            <pattern
              id="grid"
              width="1000"
              height="1000"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 1000 0 L 0 0 0 1000"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                opacity="0.05"
              />
            </pattern>
          </defs>
          <rect
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
            fill="url(#grid)"
          />

          {/* Region circles */}
          {regions.map((r) => {
            const isHovered =
              hovered?.kind === "region" && hovered.id === r.id;
            const isPinned =
              pinned?.kind === "region" && pinned.id === r.id;
            const colour = r.claim?.bannerHex ?? "#9ca3af";
            return (
              <g key={r.id}>
                <circle
                  cx={r.centreX}
                  cy={r.centreZ}
                  r={r.radiusBlocks * 0.45}
                  fill={colour}
                  fillOpacity={isHovered || isPinned ? 0.5 : 0.28}
                  stroke={colour}
                  strokeWidth={isHovered || isPinned ? 30 : 12}
                  strokeOpacity={0.9}
                  onMouseEnter={() =>
                    setHovered({ kind: "region", id: r.id })
                  }
                  onMouseLeave={() => setHovered(null)}
                  onClick={() =>
                    setPinned(
                      pinned?.kind === "region" && pinned.id === r.id
                        ? null
                        : { kind: "region", id: r.id },
                    )
                  }
                  style={{ cursor: "pointer" }}
                />
                <text
                  x={r.centreX}
                  y={r.centreZ - r.radiusBlocks * 0.45 - 60}
                  fontSize="100"
                  textAnchor="middle"
                  fill="currentColor"
                  fillOpacity={0.7}
                  className="pointer-events-none select-none font-mono"
                >
                  {r.id}
                </text>
              </g>
            );
          })}

          {/* Settlement markers */}
          {settlements.map((s) => {
            const isHovered =
              hovered?.kind === "settlement" && hovered.id === s.id;
            const isPinned =
              pinned?.kind === "settlement" && pinned.id === s.id;
            const size = settlementSize(s.tier);
            return (
              <g key={s.id}>
                <rect
                  x={s.centreX - size / 2}
                  y={s.centreZ - size / 2}
                  width={size}
                  height={size}
                  fill="white"
                  stroke="black"
                  strokeWidth={isHovered || isPinned ? 20 : 10}
                  onMouseEnter={() =>
                    setHovered({ kind: "settlement", id: s.id })
                  }
                  onMouseLeave={() => setHovered(null)}
                  onClick={() =>
                    setPinned(
                      pinned?.kind === "settlement" && pinned.id === s.id
                        ? null
                        : { kind: "settlement", id: s.id },
                    )
                  }
                  style={{ cursor: "pointer" }}
                />
                {(isHovered || isPinned) && (
                  <text
                    x={s.centreX}
                    y={s.centreZ + size / 2 + 80}
                    fontSize="90"
                    textAnchor="middle"
                    fill="currentColor"
                    className="pointer-events-none select-none"
                  >
                    {s.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* ----- Detail panel ----- */}
      <aside className="text-sm">
        {focus ? (
          <FocusPanel
            target={focus}
            regions={regions}
            settlements={settlements}
            onClose={() => {
              setPinned(null);
              setHovered(null);
            }}
          />
        ) : (
          <IdlePanel regionCount={regions.length} settlementCount={settlements.length} />
        )}
      </aside>
    </div>
  );
}

// --- Sub-components ------------------------------------------------------

type HoverTarget =
  | { kind: "region"; id: string }
  | { kind: "settlement"; id: number };

function FocusPanel({
  target,
  regions,
  settlements,
  onClose,
}: {
  target: HoverTarget;
  regions: MapRegion[];
  settlements: MapSettlement[];
  onClose: () => void;
}) {
  if (target.kind === "region") {
    const r = regions.find((x) => x.id === target.id);
    if (!r) return null;
    // Filter by the settlement's declared region, not by spatial overlap —
    // overlapping circles can wrongly claim each other's settlements.
    const here = settlements.filter((s) => s.regionId === r.id);
    return (
      <div className="rounded-lg border border-stone-200 dark:border-stone-800 p-4 space-y-3">
        <header>
          <p className="text-xs uppercase tracking-widest opacity-60">Region</p>
          <h2 className="text-lg font-semibold flex items-baseline gap-2">
            <span className="font-mono text-sm opacity-60">{r.id}</span>
            {r.displayName}
          </h2>
        </header>
        <dl className="grid grid-cols-2 gap-3 text-xs">
          <Field label="Biome">{capitalise(r.biome)}</Field>
          <Field label="Claim">
            {r.claim ? (
              <Link
                href={{ pathname: `/factions/${r.claim.factionId}` }}
                className="hover:underline"
              >
                {r.claim.displayName}
              </Link>
            ) : (
              <em className="opacity-60">Unclaimed</em>
            )}
          </Field>
        </dl>
        {here.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-widest opacity-60 mb-2">
              Settlements here
            </p>
            <ul className="space-y-1 text-xs">
              {here.map((s) => (
                <li key={s.id}>
                  <Link
                    href={{ pathname: `/settlements/${s.id}` }}
                    className="hover:underline"
                  >
                    {s.name}
                  </Link>
                  <span className="opacity-60"> · {s.tier}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className="text-xs underline opacity-60 hover:opacity-100"
        >
          Close
        </button>
      </div>
    );
  }

  const s = settlements.find((x) => x.id === target.id);
  if (!s) return null;
  return (
    <div className="rounded-lg border border-stone-200 dark:border-stone-800 p-4 space-y-3">
      <header>
        <p className="text-xs uppercase tracking-widest opacity-60">Settlement</p>
        <h2 className="text-lg font-semibold">{s.name}</h2>
        <p className="text-xs opacity-70 mt-1">{capitalise(s.tier.replaceAll("_", " "))}</p>
      </header>
      <dl className="grid grid-cols-1 gap-2 text-xs">
        <Field label="Faction">
          <Link
            href={{ pathname: `/factions/${s.factionId}` }}
            className="hover:underline"
          >
            {s.factionDisplayName}
          </Link>
        </Field>
      </dl>
      <Link
        href={{ pathname: `/settlements/${s.id}` }}
        className="block text-xs underline opacity-80 hover:opacity-100"
      >
        Open settlement page &rarr;
      </Link>
      <button
        type="button"
        onClick={onClose}
        className="text-xs underline opacity-60 hover:opacity-100"
      >
        Close
      </button>
    </div>
  );
}

function IdlePanel({
  regionCount,
  settlementCount,
}: {
  regionCount: number;
  settlementCount: number;
}) {
  return (
    <div className="rounded-lg border border-stone-200 dark:border-stone-800 p-4 space-y-3 text-xs">
      <p className="opacity-70 leading-relaxed">
        Hover a region or settlement for details. Click to pin.
      </p>
      <dl className="grid grid-cols-2 gap-3">
        <Field label="Regions">{regionCount}</Field>
        <Field label="Settlements">{settlementCount}</Field>
      </dl>
      <p className="opacity-50 leading-relaxed pt-2 border-t border-stone-200 dark:border-stone-800">
        Map shows claims and settlements. Trade routes, watchtower sight,
        and armies in transit arrive in later phases.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="opacity-60">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

// --- Helpers -------------------------------------------------------------

function settlementSize(tier: string): number {
  switch (tier) {
    case "capital":
      return 260;
    case "great_city":
      return 220;
    case "city":
      return 180;
    case "town":
      return 150;
    case "burgh":
      return 130;
    case "village":
      return 110;
    case "steading":
      return 90;
    case "hamlet":
    default:
      return 70;
  }
}

function computeBounds(
  regions: MapRegion[],
  settlements: MapSettlement[],
): { x: number; y: number; width: number; height: number } {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const r of regions) {
    xs.push(r.centreX - r.radiusBlocks, r.centreX + r.radiusBlocks);
    ys.push(r.centreZ - r.radiusBlocks, r.centreZ + r.radiusBlocks);
  }
  for (const s of settlements) {
    xs.push(s.centreX, s.centreX);
    ys.push(s.centreZ, s.centreZ);
  }
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const padding = 500;
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
