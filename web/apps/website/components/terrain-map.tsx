"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { MapRegion, MapSettlement } from "@/lib/data/map";

/**
 * The live world map: real in-game blocks (Xaero's-style tiles rendered by
 * the Andúril mod from the live world) with the claims + settlements overlay
 * projected on top in the same block-coordinate space.
 *
 * Tiles: 512×512 px PNGs; at scale S one tile covers 512·2^S blocks, drawn at
 * a fixed 512 px — so 1 screen px = 2^S blocks. Pan by dragging; zoom with
 * the +/− controls. Missing tiles (unmapped area) simply don't render.
 */

const TILE = 512;
const MAX_SCALE = 6;

type Props = {
  regions: MapRegion[];
  settlements: MapSettlement[];
  dim: string;
};

export function TerrainMap({ regions, settlements, dim }: Props) {
  const initial = useMemo(() => initialView(regions, settlements), [regions, settlements]);
  const [scale, setScale] = useState(initial.scale);
  const [center, setCenter] = useState<{ x: number; z: number }>(initial.center);
  const [size, setSize] = useState({ w: 960, h: 600 });
  const [focus, setFocus] = useState<Focus | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ px: number; py: number; cx: number; cz: number } | null>(null);

  // Track the container's real size so tile coverage and projection are exact.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const bpp = 1 << scale; // blocks per screen pixel
  const toScreen = (x: number, z: number): [number, number] => [
    (x - center.x) / bpp + size.w / 2,
    (z - center.z) / bpp + size.h / 2,
  ];

  // Visible tile range: tile (tx,tz) spans [tx·512·bpp, (tx+1)·512·bpp) blocks.
  const tileSpan = TILE * bpp;
  const tx0 = Math.floor((center.x - (size.w / 2) * bpp) / tileSpan);
  const tx1 = Math.floor((center.x + (size.w / 2) * bpp) / tileSpan);
  const tz0 = Math.floor((center.z - (size.h / 2) * bpp) / tileSpan);
  const tz1 = Math.floor((center.z + (size.h / 2) * bpp) / tileSpan);
  const tiles: { tx: number; tz: number }[] = [];
  for (let tz = tz0; tz <= tz1; tz++) {
    for (let tx = tx0; tx <= tx1; tx++) tiles.push({ tx, tz });
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, cx: center.x, cz: center.z };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const d = drag.current;
    setCenter({
      x: d.cx - (e.clientX - d.px) * bpp,
      z: d.cz - (e.clientY - d.py) * bpp,
    });
  }
  function onPointerUp() {
    drag.current = null;
  }

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <div className="relative rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-950 overflow-hidden">
        <div
          ref={containerRef}
          className="relative w-full touch-none select-none cursor-grab active:cursor-grabbing"
          style={{ height: "70vh", minHeight: 420 }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* Terrain tiles */}
          {tiles.map(({ tx, tz }) => {
            const [sx, sy] = toScreen(tx * tileSpan, tz * tileSpan);
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${scale}/${tx}/${tz}`}
                src={`/api/map/tile?dim=${encodeURIComponent(dim)}&scale=${scale}&tx=${tx}&tz=${tz}`}
                alt=""
                draggable={false}
                className="absolute"
                style={{
                  left: sx,
                  top: sy,
                  width: TILE,
                  height: TILE,
                  imageRendering: scale <= 1 ? "pixelated" : "auto",
                }}
                onError={(e) => {
                  // Unmapped area — hide the broken-image glyph.
                  (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
                }}
              />
            );
          })}

          {/* Claims + settlements overlay (same projection) */}
          <svg className="absolute inset-0 h-full w-full pointer-events-none">
            {regions.map((r) => {
              const [sx, sy] = toScreen(r.centreX, r.centreZ);
              const radius = (r.radiusBlocks * 0.45) / bpp;
              if (radius < 3) return null;
              const colour = r.claim?.bannerHex ?? "#9ca3af";
              return (
                <g key={r.id}>
                  <circle
                    cx={sx}
                    cy={sy}
                    r={radius}
                    fill={colour}
                    fillOpacity={0.18}
                    stroke={colour}
                    strokeOpacity={0.8}
                    strokeWidth={1.5}
                    className="pointer-events-auto cursor-pointer"
                    onClick={() => setFocus({ kind: "region", id: r.id })}
                  />
                  {radius > 28 && (
                    <text
                      x={sx}
                      y={sy - radius - 4}
                      textAnchor="middle"
                      className="fill-stone-300 font-mono"
                      style={{ fontSize: 10 }}
                    >
                      {r.id}
                    </text>
                  )}
                </g>
              );
            })}
            {settlements.map((s) => {
              const [sx, sy] = toScreen(s.centreX, s.centreZ);
              const sz = settlementPx(s.tier);
              return (
                <g key={s.id}>
                  <rect
                    x={sx - sz / 2}
                    y={sy - sz / 2}
                    width={sz}
                    height={sz}
                    fill="white"
                    stroke="black"
                    strokeWidth={1.5}
                    className="pointer-events-auto cursor-pointer"
                    onClick={() => setFocus({ kind: "settlement", id: s.id })}
                  />
                  {scale <= 3 && (
                    <text
                      x={sx}
                      y={sy + sz / 2 + 12}
                      textAnchor="middle"
                      className="fill-white"
                      style={{ fontSize: 11, paintOrder: "stroke", stroke: "rgba(0,0,0,0.8)", strokeWidth: 3 }}
                    >
                      {s.name}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Controls */}
        <div className="absolute right-3 top-3 flex flex-col gap-1">
          <button
            onClick={() => setScale((s) => Math.max(0, s - 1))}
            className="h-8 w-8 rounded bg-stone-900/80 text-stone-100 border border-stone-700 hover:bg-stone-800"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            onClick={() => setScale((s) => Math.min(MAX_SCALE, s + 1))}
            className="h-8 w-8 rounded bg-stone-900/80 text-stone-100 border border-stone-700 hover:bg-stone-800"
            aria-label="Zoom out"
          >
            −
          </button>
        </div>
        <div className="absolute left-3 bottom-2 text-[10px] font-mono text-stone-400 bg-stone-950/70 rounded px-1.5 py-0.5">
          {dim} · 1px = {bpp} block{bpp > 1 ? "s" : ""} · centre {Math.round(center.x)}, {Math.round(center.z)}
        </div>
      </div>

      <aside className="text-sm">
        {focus ? (
          <FocusPanel
            focus={focus}
            regions={regions}
            settlements={settlements}
            onClose={() => setFocus(null)}
            onJump={(x, z) => setCenter({ x, z })}
          />
        ) : (
          <div className="rounded-lg border border-stone-200 dark:border-stone-800 p-4 space-y-3 text-xs">
            <p className="opacity-70 leading-relaxed">
              Live terrain, rendered from the actual blocks on the server. Drag
              to pan, +/− to zoom. Click a claim or settlement for details.
            </p>
            <p className="opacity-50 leading-relaxed">
              Unmapped areas fill in as chunks are visited (or backfilled by
              staff). Tiles refresh within a minute of the world changing.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

type Focus = { kind: "region"; id: string } | { kind: "settlement"; id: number };

function FocusPanel({
  focus,
  regions,
  settlements,
  onClose,
  onJump,
}: {
  focus: Focus;
  regions: MapRegion[];
  settlements: MapSettlement[];
  onClose: () => void;
  onJump: (x: number, z: number) => void;
}) {
  if (focus.kind === "region") {
    const r = regions.find((x) => x.id === focus.id);
    if (!r) return null;
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
          <div>
            <dt className="opacity-60">Biome</dt>
            <dd className="font-medium capitalize">{r.biome}</dd>
          </div>
          <div>
            <dt className="opacity-60">Claim</dt>
            <dd className="font-medium">
              {r.claim ? (
                <Link href={{ pathname: `/factions/${r.claim.factionId}` }} className="hover:underline">
                  {r.claim.displayName}
                </Link>
              ) : (
                <em className="opacity-60">Unclaimed</em>
              )}
            </dd>
          </div>
        </dl>
        {here.length > 0 && (
          <ul className="space-y-1 text-xs">
            {here.map((s) => (
              <li key={s.id}>
                <Link href={{ pathname: `/settlements/${s.id}` }} className="hover:underline">
                  {s.name}
                </Link>
                <span className="opacity-60"> · {s.tier}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-3 text-xs">
          <button onClick={() => onJump(r.centreX, r.centreZ)} className="underline opacity-80 hover:opacity-100">
            Centre map here
          </button>
          <button onClick={onClose} className="underline opacity-60 hover:opacity-100">
            Close
          </button>
        </div>
      </div>
    );
  }

  const s = settlements.find((x) => x.id === focus.id);
  if (!s) return null;
  return (
    <div className="rounded-lg border border-stone-200 dark:border-stone-800 p-4 space-y-3">
      <header>
        <p className="text-xs uppercase tracking-widest opacity-60">Settlement</p>
        <h2 className="text-lg font-semibold">{s.name}</h2>
        <p className="text-xs opacity-70 mt-1 capitalize">{s.tier.replaceAll("_", " ")}</p>
      </header>
      <p className="text-xs">
        <span className="opacity-60">Faction </span>
        <Link href={{ pathname: `/factions/${s.factionId}` }} className="hover:underline font-medium">
          {s.factionDisplayName}
        </Link>
      </p>
      <p className="text-xs font-mono opacity-60">
        {s.centreX}, {s.centreZ}
      </p>
      <div className="flex gap-3 text-xs">
        <Link href={{ pathname: `/settlements/${s.id}` }} className="underline opacity-80 hover:opacity-100">
          Open settlement page →
        </Link>
        <button onClick={() => onJump(s.centreX, s.centreZ)} className="underline opacity-80 hover:opacity-100">
          Centre
        </button>
        <button onClick={onClose} className="underline opacity-60 hover:opacity-100">
          Close
        </button>
      </div>
    </div>
  );
}

function settlementPx(tier: string): number {
  switch (tier) {
    case "capital": return 14;
    case "great_city": return 12;
    case "city": return 11;
    case "town": return 10;
    case "burgh": return 9;
    case "village": return 8;
    case "steading": return 7;
    default: return 6;
  }
}

function initialView(regions: MapRegion[], settlements: MapSettlement[]) {
  const xs: number[] = [];
  const zs: number[] = [];
  for (const r of regions) {
    xs.push(r.centreX - r.radiusBlocks, r.centreX + r.radiusBlocks);
    zs.push(r.centreZ - r.radiusBlocks, r.centreZ + r.radiusBlocks);
  }
  for (const s of settlements) {
    xs.push(s.centreX);
    zs.push(s.centreZ);
  }
  if (xs.length === 0) return { center: { x: 0, z: 0 }, scale: 3 };
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const span = Math.max(maxX - minX, maxZ - minZ, 512);
  // Fit the span into ~900 screen px.
  const scale = Math.max(0, Math.min(MAX_SCALE, Math.ceil(Math.log2(span / 900))));
  return { center: { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 }, scale };
}
