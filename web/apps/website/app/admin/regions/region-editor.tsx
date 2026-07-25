"use client";

import { useEffect, useRef, useState } from "react";
import type { MapRegion, MapSettlement } from "@/lib/data/map";
import { saveRegionBoundaryAction } from "./actions";

// World-gen map projection (mirrors the bridge's WorldMapStore): 3000px tiles,
// levels 0..3, world 96000 blocks square, blocks/px = 32/2^level.
const WG_TILE_PX = 3000;
const WG_WORLD_SIZE = 96000;
const WG_MAX_LEVEL = 3;
const MIN_SCALE = 1;
const MAX_SCALE = 6;

type Pt = [number, number];

export function RegionEditor({
  regions,
  settlements,
}: {
  regions: MapRegion[];
  settlements: MapSettlement[];
}) {
  const [regionId, setRegionId] = useState(regions[0]?.id ?? "");
  const region = regions.find((r) => r.id === regionId);

  const [verts, setVerts] = useState<Pt[]>(region?.boundary ?? []);
  const [scale, setScale] = useState(4);
  const [center, setCenter] = useState<{ x: number; z: number }>(
    region ? { x: region.centreX, z: region.centreZ } : { x: WG_WORLD_SIZE / 2, z: WG_WORLD_SIZE / 2 },
  );
  const [size, setSize] = useState({ w: 960, h: 600 });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  // Interaction bookkeeping for one pointer gesture.
  const gesture = useRef<
    | { kind: "vertex"; idx: number }
    | { kind: "bg"; px: number; py: number; cx: number; cz: number; moved: boolean }
    | null
  >(null);

  // Load the selected region's boundary + recentre when it changes.
  useEffect(() => {
    const r = regions.find((x) => x.id === regionId);
    setVerts(r?.boundary ? r.boundary.map((p) => [p[0], p[1]] as Pt) : []);
    if (r) setCenter({ x: r.centreX, z: r.centreZ });
    setDirty(false);
    setStatus(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const bpp = 1 << scale;
  const toScreen = (x: number, z: number): [number, number] => [
    (x - center.x) / bpp + size.w / 2,
    (z - center.z) / bpp + size.h / 2,
  ];
  const localToWorld = (lx: number, ly: number): Pt => [
    Math.round((lx - size.w / 2) * bpp + center.x),
    Math.round((ly - size.h / 2) * bpp + center.z),
  ];

  // World-gen base tiles for the current viewport.
  const level = Math.max(0, Math.min(WG_MAX_LEVEL, 5 - scale));
  const perAxis = 1 << level;
  const tileBlocks = WG_WORLD_SIZE / perAxis;
  const tilePx = tileBlocks / bpp;
  const c0 = Math.max(0, Math.floor((center.x - (size.w / 2) * bpp) / tileBlocks));
  const c1 = Math.min(perAxis - 1, Math.floor((center.x + (size.w / 2) * bpp) / tileBlocks));
  const r0 = Math.max(0, Math.floor((center.z - (size.h / 2) * bpp) / tileBlocks));
  const r1 = Math.min(perAxis - 1, Math.floor((center.z + (size.h / 2) * bpp) / tileBlocks));
  const tiles: { col: number; row: number }[] = [];
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) tiles.push({ col, row });
  }

  function localFromEvent(e: React.PointerEvent): [number, number] {
    const rect = containerRef.current!.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }

  function onBgPointerDown(e: React.PointerEvent) {
    containerRef.current?.setPointerCapture(e.pointerId);
    gesture.current = { kind: "bg", px: e.clientX, py: e.clientY, cx: center.x, cz: center.z, moved: false };
  }
  function onPointerMove(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g) return;
    if (g.kind === "vertex") {
      const [lx, ly] = localFromEvent(e);
      const w = localToWorld(lx, ly);
      setVerts((v) => v.map((p, i) => (i === g.idx ? w : p)));
      setDirty(true);
      return;
    }
    const dx = e.clientX - g.px;
    const dy = e.clientY - g.py;
    if (!g.moved && Math.hypot(dx, dy) > 4) g.moved = true;
    if (g.moved) setCenter({ x: g.cx - dx * bpp, z: g.cz - dy * bpp });
  }
  function onPointerUp(e: React.PointerEvent) {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    // A click (no meaningful drag) on the background appends a vertex.
    if (g.kind === "bg" && !g.moved) {
      const [lx, ly] = localFromEvent(e);
      setVerts((v) => [...v, localToWorld(lx, ly)]);
      setDirty(true);
    }
  }
  function onVertexPointerDown(e: React.PointerEvent, idx: number) {
    e.stopPropagation();
    containerRef.current?.setPointerCapture(e.pointerId);
    gesture.current = { kind: "vertex", idx };
  }
  function deleteVertex(idx: number) {
    setVerts((v) => v.filter((_, i) => i !== idx));
    setDirty(true);
  }

  async function save(clear = false) {
    setSaving(true);
    setStatus(null);
    const payload = clear || verts.length === 0 ? null : verts;
    const res = await saveRegionBoundaryAction(regionId, payload);
    setSaving(false);
    if (res.error) {
      setStatus({ kind: "err", msg: res.error });
    } else {
      setDirty(false);
      setStatus({ kind: "ok", msg: clear ? "Boundary cleared." : `Saved — ${res.vertices} vertices.` });
      if (clear) setVerts([]);
    }
  }

  const vertScreen = verts.map(([x, z]) => toScreen(x, z));
  const polyPoints = vertScreen.map(([x, y]) => `${x},${y}`).join(" ");

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-6">
      <div className="relative rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-950 overflow-hidden">
        <div
          ref={containerRef}
          className="relative w-full touch-none select-none cursor-crosshair"
          style={{ height: "72vh", minHeight: 460 }}
          onPointerDown={onBgPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* World-gen tiles */}
          {tiles.map(({ col, row }) => {
            const [sx, sy] = toScreen(col * tileBlocks, row * tileBlocks);
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${level}/${col}/${row}`}
                src={`/api/worldmap/tile?layer=biomes&level=${level}&col=${col}&row=${row}`}
                alt=""
                draggable={false}
                className="absolute"
                style={{ left: sx, top: sy, width: tilePx, height: tilePx, maxWidth: "none" }}
                onError={(ev) => ((ev.currentTarget as HTMLImageElement).style.visibility = "hidden")}
              />
            );
          })}

          <svg className="absolute inset-0 h-full w-full">
            {/* Context: other regions' boundaries/circles + settlements */}
            {regions
              .filter((r) => r.id !== regionId)
              .map((r) => {
                const colour = r.claim?.bannerHex ?? "#9ca3af";
                if (r.boundary && r.boundary.length >= 3) {
                  const pts = r.boundary.map(([x, z]) => toScreen(x, z));
                  return (
                    <polygon
                      key={r.id}
                      points={pts.map(([x, y]) => `${x},${y}`).join(" ")}
                      fill={colour}
                      fillOpacity={0.06}
                      stroke={colour}
                      strokeOpacity={0.3}
                      strokeWidth={1}
                    />
                  );
                }
                const [sx, sy] = toScreen(r.centreX, r.centreZ);
                const rad = (r.radiusBlocks * 0.45) / bpp;
                if (rad < 3) return null;
                return (
                  <circle key={r.id} cx={sx} cy={sy} r={rad} fill="none" stroke={colour} strokeOpacity={0.25} strokeWidth={1} />
                );
              })}
            {settlements.map((s) => {
              const [sx, sy] = toScreen(s.centreX, s.centreZ);
              return <rect key={s.id} x={sx - 3} y={sy - 3} width={6} height={6} fill="white" fillOpacity={0.5} />;
            })}

            {/* The edited polygon */}
            {vertScreen.length >= 2 && (
              <polygon
                points={polyPoints}
                fill="#38bdf8"
                fillOpacity={0.15}
                stroke="#38bdf8"
                strokeOpacity={0.9}
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
            )}
            {vertScreen.map(([x, y], i) => (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={6}
                fill="#38bdf8"
                stroke="#0c4a6e"
                strokeWidth={1.5}
                className="cursor-move"
                style={{ pointerEvents: "all" }}
                onPointerDown={(e) => onVertexPointerDown(e, i)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  deleteVertex(i);
                }}
              />
            ))}
          </svg>

          {/* Zoom controls */}
          <div className="absolute top-3 right-3 flex flex-col gap-1">
            <button
              type="button"
              className="h-8 w-8 rounded bg-stone-800/90 text-stone-100 text-lg leading-none"
              onClick={() => setScale((s) => Math.max(MIN_SCALE, s - 1))}
            >
              +
            </button>
            <button
              type="button"
              className="h-8 w-8 rounded bg-stone-800/90 text-stone-100 text-lg leading-none"
              onClick={() => setScale((s) => Math.min(MAX_SCALE, s + 1))}
            >
              −
            </button>
          </div>
        </div>
      </div>

      {/* Side panel */}
      <div className="space-y-4 text-sm">
        <div>
          <label className="block text-xs uppercase tracking-widest opacity-60 mb-1">Region</label>
          <select
            className="w-full rounded border border-stone-300 dark:border-stone-700 bg-transparent p-2"
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
          >
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} — {r.displayName}
                {r.boundary ? " ●" : ""}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs opacity-50">● = already has a polygon</p>
        </div>

        <div className="rounded border border-stone-200 dark:border-stone-800 p-3 text-xs space-y-1 opacity-80 leading-relaxed">
          <p><strong>Click</strong> the map to add a point.</p>
          <p><strong>Drag</strong> a point to move it; <strong>double-click</strong> a point to delete it.</p>
          <p><strong>Drag the map</strong> to pan, +/− to zoom.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded border border-stone-300 dark:border-stone-700 px-3 py-1.5 disabled:opacity-40"
            onClick={() => {
              setVerts((v) => v.slice(0, -1));
              setDirty(true);
            }}
            disabled={verts.length === 0}
          >
            Undo point
          </button>
          <button
            type="button"
            className="rounded border border-stone-300 dark:border-stone-700 px-3 py-1.5 disabled:opacity-40"
            onClick={() => {
              setVerts([]);
              setDirty(true);
            }}
            disabled={verts.length === 0}
          >
            Clear points
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded bg-sky-600 text-white px-3 py-1.5 disabled:opacity-40"
            onClick={() => save(false)}
            disabled={saving || (verts.length > 0 && verts.length < 3) || !dirty}
          >
            {saving ? "Saving…" : "Save boundary"}
          </button>
          <button
            type="button"
            className="rounded border border-red-400/50 text-red-500 px-3 py-1.5 disabled:opacity-40"
            onClick={() => save(true)}
            disabled={saving || !region?.boundary}
          >
            Delete boundary
          </button>
        </div>

        <p className="text-xs opacity-60">
          {verts.length} point{verts.length === 1 ? "" : "s"}
          {verts.length > 0 && verts.length < 3 ? " (need ≥3 to save)" : ""}
          {dirty ? " · unsaved" : ""}
        </p>

        {status && (
          <p className={`text-xs ${status.kind === "ok" ? "text-emerald-500" : "text-red-500"}`}>
            {status.msg}
          </p>
        )}
      </div>
    </div>
  );
}
