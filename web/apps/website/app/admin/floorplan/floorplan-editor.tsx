"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { FloorplanCatalogue } from "@/lib/data/floorplan";
import { PlotCanvas, buildingFill } from "@/lib/plots/PlotCanvas";
import {
  type PlotTransform,
  type PlotBuilding,
  type PlotLayout,
  cellToBlock,
  projectFootprint,
  solveTransform,
} from "@/lib/plots/geometry";
import { savePlotAction, scanPlotAction, type SaveResult, type ScanResult } from "./actions";
import type { SavePlotRequest } from "@modspec/api-types";

type Tool = "footprint" | "erase" | "building" | "georef";
type Cell = { x: number; z: number };
type GeoPoint = { cell: Cell | null; blockX: number; blockZ: number };

let uid = 0;
const nextUid = () => `b${(uid++).toString(36)}_${Math.round(performance.now())}`;

const DEFAULT_TRANSFORM: PlotTransform = {
  originBlockX: 0,
  originBlockZ: 0,
  baseY: 64,
  blocksPerCell: 4,
  rotationDeg: 0,
};

export function FloorplanEditor({ catalogue }: { catalogue: FloorplanCatalogue }) {
  const [gridW, setGridW] = useState(32);
  const [gridH, setGridH] = useState(32);
  const cellPx = 18;

  const [tool, setTool] = useState<Tool>("footprint");
  const [footprint, setFootprint] = useState<Set<string>>(new Set());
  const [buildings, setBuildings] = useState<PlotBuilding[]>([]);
  const [buildingTypeId, setBuildingTypeId] = useState("");
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  const [transform, setTransform] = useState<PlotTransform>(DEFAULT_TRANSFORM);
  const [scanHeight, setScanHeight] = useState(32);

  const [districtType, setDistrictType] = useState("");
  const [factionId, setFactionId] = useState("");
  const [settlementId, setSettlementId] = useState("");
  const [label, setLabel] = useState("");

  const [underlay, setUnderlay] = useState<{ src: string; opacity: number } | null>(null);
  const [geo, setGeo] = useState<{ p1: GeoPoint; p2: GeoPoint }>({
    p1: { cell: null, blockX: 0, blockZ: 0 },
    p2: { cell: null, blockX: 0, blockZ: 0 },
  });
  const [armed, setArmed] = useState<1 | 2 | null>(null);

  const [hover, setHover] = useState<Cell | null>(null);
  const [draftRect, setDraftRect] = useState<{ x: number; z: number; w: number; h: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const dragMode = useRef<null | "add" | "remove">(null);
  const buildStart = useRef<Cell | null>(null);
  const lastCell = useRef<Cell | null>(null);

  const buildingById = useMemo(
    () => new Map(catalogue.buildingTypes.map((b) => [b.id, b])),
    [catalogue],
  );
  const categoryOf = (id: string) => buildingById.get(id)?.category;

  const districtsByCategory = useMemo(() => {
    const m = new Map<string, typeof catalogue.districtTypes>();
    for (const d of catalogue.districtTypes) {
      if (!m.has(d.category)) m.set(d.category, []);
      m.get(d.category)!.push(d);
    }
    return m;
  }, [catalogue]);

  const cellsArray = useMemo<[number, number][]>(
    () => [...footprint].map((k) => k.split(",").map(Number) as [number, number]),
    [footprint],
  );

  const proj = useMemo(() => {
    if (cellsArray.length === 0) return null;
    const layout: PlotLayout = { footprintCells: cellsArray, buildings: [] };
    return projectFootprint(layout, transform);
  }, [cellsArray, transform]);

  const hoverBlock = hover ? cellToBlock(hover.x, hover.z, transform) : null;

  function toggleCell(x: number, z: number, add: boolean) {
    setFootprint((prev) => {
      const n = new Set(prev);
      const k = `${x},${z}`;
      if (add) n.add(k);
      else n.delete(k);
      return n;
    });
  }

  function onCellDown(x: number, z: number) {
    setSaveResult(null);
    if (tool === "footprint") {
      dragMode.current = "add";
      toggleCell(x, z, true);
    } else if (tool === "erase") {
      dragMode.current = "remove";
      toggleCell(x, z, false);
    } else if (tool === "building") {
      if (!buildingTypeId) {
        setSaveResult({ error: "Pick a building type to place first." });
        return;
      }
      buildStart.current = { x, z };
      lastCell.current = { x, z };
      setDraftRect({ x, z, w: 1, h: 1 });
    } else if (tool === "georef") {
      if (armed) {
        setGeo((g) => ({ ...g, [armed === 1 ? "p1" : "p2"]: { ...g[armed === 1 ? "p1" : "p2"], cell: { x, z } } }));
        setArmed(null);
      }
    }
  }

  function onCellEnter(x: number, z: number) {
    setHover({ x, z });
    lastCell.current = { x, z };
    if (dragMode.current === "add") toggleCell(x, z, true);
    else if (dragMode.current === "remove") toggleCell(x, z, false);
    else if (buildStart.current) {
      const s = buildStart.current;
      setDraftRect({
        x: Math.min(s.x, x),
        z: Math.min(s.z, z),
        w: Math.abs(x - s.x) + 1,
        h: Math.abs(z - s.z) + 1,
      });
    }
  }

  function onPointerUp() {
    dragMode.current = null;
    const start = buildStart.current;
    const end = lastCell.current;
    if (start && end && buildingTypeId) {
      const cx = Math.min(start.x, end.x);
      const cz = Math.min(start.z, end.z);
      const w = Math.abs(end.x - start.x) + 1;
      const h = Math.abs(end.z - start.z) + 1;
      setBuildings((prev) => [
        ...prev,
        { uid: nextUid(), buildingTypeId, shape: "rect", rect: { cx, cz, w, h } },
      ]);
    }
    buildStart.current = null;
    setDraftRect(null);
  }

  function solve() {
    if (!geo.p1.cell || !geo.p2.cell) {
      setSaveResult({ error: "Pick both reference cells on the grid first." });
      return;
    }
    const t = solveTransform(
      {
        imageWidthPx: gridW,
        imageHeightPx: gridH,
        p1: { px: geo.p1.cell.x, py: geo.p1.cell.z, blockX: geo.p1.blockX, blockZ: geo.p1.blockZ },
        p2: { px: geo.p2.cell.x, py: geo.p2.cell.z, blockX: geo.p2.blockX, blockZ: geo.p2.blockZ },
      },
      transform.baseY,
      1,
    );
    setTransform(t);
    setSaveResult({ error: undefined });
  }

  async function save() {
    if (cellsArray.length === 0) {
      setSaveResult({ error: "Paint a plot footprint first." });
      return;
    }
    if (!districtType) {
      setSaveResult({ error: "Pick a district type." });
      return;
    }
    const layout: PlotLayout = { footprintCells: cellsArray, buildings };
    const p = projectFootprint(layout, transform);
    const req: SavePlotRequest = {
      districtType,
      factionId: factionId || null,
      settlementId: settlementId ? Number(settlementId) : null,
      label,
      source: "floorplanner",
      minX: p.minX,
      minY: transform.baseY,
      minZ: p.minZ,
      maxX: p.maxX,
      maxY: transform.baseY + scanHeight - 1,
      maxZ: p.maxZ,
      footprintCells: cellsArray,
      transform: transform as unknown as Record<string, unknown>,
      layout: layout as unknown as Record<string, unknown>,
    };
    setSaving(true);
    setScanResult(null);
    const res = await savePlotAction(req);
    setSaving(false);
    setSaveResult(res);
  }

  async function scanNow(plotId: number) {
    setScanResult(null);
    setScanning(true);
    const res = await scanPlotAction(plotId);
    setScanning(false);
    setScanResult(res);
  }

  function reset() {
    setFootprint(new Set());
    setBuildings([]);
    setDraftRect(null);
    setSaveResult(null);
  }

  const markers = [geo.p1, geo.p2]
    .map((p, i) => (p.cell ? { x: p.cell.x, z: p.cell.z, label: String(i + 1) } : null))
    .filter(Boolean) as { x: number; z: number; label: string }[];

  const num = "w-full rounded border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-2 py-1 text-sm";
  const lbl = "block text-[10px] uppercase tracking-widest opacity-60 mb-0.5";

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-6 flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <p className="mb-1 text-xs uppercase tracking-widest opacity-60">Admin · Floorplanner</p>
          <h1 className="text-3xl font-semibold">Plot Floorplanner</h1>
        </div>
        <Link href={{ pathname: "/admin/reviews" }} className="text-sm opacity-60 hover:underline">
          Review queue →
        </Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Canvas + readout */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {(["footprint", "erase", "building", "georef"] as Tool[]).map((t) => (
              <button
                key={t}
                onClick={() => setTool(t)}
                className={`rounded border px-3 py-1 text-sm capitalize ${
                  tool === t
                    ? "border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    : "border-stone-300 dark:border-stone-700"
                }`}
              >
                {t}
              </button>
            ))}
            <button onClick={reset} className="ml-auto rounded border border-stone-300 dark:border-stone-700 px-3 py-1 text-sm">
              Clear plot
            </button>
          </div>

          <div className="inline-block overflow-auto rounded border border-stone-200 dark:border-stone-800 p-2">
            <PlotCanvas
              gridW={gridW}
              gridH={gridH}
              cellPx={cellPx}
              footprint={footprint}
              buildings={buildings}
              categoryOf={categoryOf}
              underlay={underlay}
              hoverCell={hover}
              draftRect={draftRect}
              selectedUid={selectedUid}
              markers={markers}
              onCellDown={onCellDown}
              onCellEnter={onCellEnter}
              onPointerUp={onPointerUp}
            />
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-stone-500 tabular-nums">
            <span>footprint <strong>{footprint.size}</strong> cells</span>
            <span>buildings <strong>{buildings.length}</strong></span>
            {hover && hoverBlock && (
              <span>
                cursor cell ({hover.x},{hover.z}) → block ({hoverBlock[0]}, {hoverBlock[1]})
              </span>
            )}
            {proj && (
              <span>
                world box X {proj.minX}…{proj.maxX} · Z {proj.minZ}…{proj.maxZ} · {proj.maxX - proj.minX + 1}×{proj.maxZ - proj.minZ + 1}
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-5 text-sm">
          <section className="space-y-2">
            <h2 className="text-xs uppercase tracking-widest opacity-60">Plot</h2>
            <div>
              <label className={lbl}>District type</label>
              <select className={num} value={districtType} onChange={(e) => setDistrictType(e.target.value)}>
                <option value="">— pick —</option>
                {[...districtsByCategory].map(([cat, list]) => (
                  <optgroup key={cat} label={cat}>
                    {list.map((d) => (
                      <option key={d.id} value={d.id}>{d.displayName}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={lbl}>Faction</label>
                <select className={num} value={factionId} onChange={(e) => setFactionId(e.target.value)}>
                  <option value="">— none —</option>
                  {catalogue.factions.map((f) => (
                    <option key={f.id} value={f.id}>{f.displayName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lbl}>Settlement</label>
                <select className={num} value={settlementId} onChange={(e) => setSettlementId(e.target.value)}>
                  <option value="">— none —</option>
                  {catalogue.settlements.map((s) => (
                    <option key={s.id} value={String(s.id)}>{s.name} ({s.tier})</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={lbl}>Label</label>
              <input className={num} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Rivermeet cottages" />
            </div>
          </section>

          {tool === "building" && (
            <section className="space-y-2">
              <h2 className="text-xs uppercase tracking-widest opacity-60">Building to place</h2>
              <select className={num} value={buildingTypeId} onChange={(e) => setBuildingTypeId(e.target.value)}>
                <option value="">— pick a building —</option>
                {catalogue.buildingTypes.map((b) => (
                  <option key={b.id} value={b.id}>{b.displayName} ({b.category})</option>
                ))}
              </select>
              <p className="text-[11px] opacity-60">Drag a rectangle on the grid to place it.</p>
            </section>
          )}

          {buildings.length > 0 && (
            <section className="space-y-1">
              <h2 className="text-xs uppercase tracking-widest opacity-60">Placed buildings</h2>
              {buildings.map((b) => (
                <div
                  key={b.uid}
                  onMouseEnter={() => setSelectedUid(b.uid)}
                  onMouseLeave={() => setSelectedUid(null)}
                  className="flex items-center justify-between gap-2 rounded border border-stone-200 dark:border-stone-800 px-2 py-1"
                >
                  <span className="inline-flex items-center gap-1.5 truncate">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: buildingFill(categoryOf(b.buildingTypeId)) }} />
                    <span className="truncate font-mono text-xs">{b.buildingTypeId}</span>
                    <span className="text-[10px] opacity-50">{b.rect?.w}×{b.rect?.h}</span>
                  </span>
                  <button
                    onClick={() => setBuildings((prev) => prev.filter((x) => x.uid !== b.uid))}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    remove
                  </button>
                </div>
              ))}
            </section>
          )}

          <section className="space-y-2">
            <h2 className="text-xs uppercase tracking-widest opacity-60">Transform (image ↔ block)</h2>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={lbl}>Blocks / cell</label>
                <input type="number" min={1} className={num} value={transform.blocksPerCell}
                  onChange={(e) => setTransform((t) => ({ ...t, blocksPerCell: Math.max(1, Number(e.target.value) || 1) }))} />
              </div>
              <div>
                <label className={lbl}>Rotation</label>
                <select className={num} value={transform.rotationDeg}
                  onChange={(e) => setTransform((t) => ({ ...t, rotationDeg: Number(e.target.value) as PlotTransform["rotationDeg"] }))}>
                  {[0, 90, 180, 270].map((r) => <option key={r} value={r}>{r}°</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Origin block X</label>
                <input type="number" className={num} value={transform.originBlockX}
                  onChange={(e) => setTransform((t) => ({ ...t, originBlockX: Number(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className={lbl}>Origin block Z</label>
                <input type="number" className={num} value={transform.originBlockZ}
                  onChange={(e) => setTransform((t) => ({ ...t, originBlockZ: Number(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className={lbl}>Base Y (floor)</label>
                <input type="number" className={num} value={transform.baseY}
                  onChange={(e) => setTransform((t) => ({ ...t, baseY: Number(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className={lbl}>Scan height</label>
                <input type="number" min={1} className={num} value={scanHeight}
                  onChange={(e) => setScanHeight(Math.max(1, Number(e.target.value) || 1))} />
              </div>
              <div>
                <label className={lbl}>Grid W</label>
                <input type="number" min={8} max={64} className={num} value={gridW}
                  onChange={(e) => setGridW(Math.min(64, Math.max(8, Number(e.target.value) || 8)))} />
              </div>
              <div>
                <label className={lbl}>Grid H</label>
                <input type="number" min={8} max={64} className={num} value={gridH}
                  onChange={(e) => setGridH(Math.min(64, Math.max(8, Number(e.target.value) || 8)))} />
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs uppercase tracking-widest opacity-60">Underlay + georeference</h2>
            <input type="file" accept="image/*" className="text-xs"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = () => setUnderlay({ src: String(reader.result), opacity: underlay?.opacity ?? 0.5 });
                reader.readAsDataURL(f);
              }} />
            {underlay && (
              <div className="flex items-center gap-2">
                <input type="range" min={0} max={1} step={0.05} value={underlay.opacity}
                  onChange={(e) => setUnderlay((u) => (u ? { ...u, opacity: Number(e.target.value) } : u))} className="flex-1" />
                <button onClick={() => setUnderlay(null)} className="text-xs hover:underline">clear</button>
              </div>
            )}
            <p className="text-[11px] opacity-60">
              In <strong>georef</strong> mode, arm a point then click its cell; type the world
              block coords it maps to; Solve derives the transform (rotation snaps to 90°).
            </p>
            {([1, 2] as const).map((n) => {
              const p = n === 1 ? geo.p1 : geo.p2;
              return (
                <div key={n} className="flex items-center gap-1.5">
                  <button
                    onClick={() => { setTool("georef"); setArmed(n); }}
                    className={`rounded border px-2 py-1 text-xs ${armed === n ? "border-fuchsia-500 bg-fuchsia-500/15" : "border-stone-300 dark:border-stone-700"}`}
                  >
                    P{n}{p.cell ? ` (${p.cell.x},${p.cell.z})` : ""}
                  </button>
                  <input type="number" placeholder="X" className={`${num} w-20`} value={p.blockX}
                    onChange={(e) => setGeo((g) => ({ ...g, [n === 1 ? "p1" : "p2"]: { ...p, blockX: Number(e.target.value) || 0 } }))} />
                  <input type="number" placeholder="Z" className={`${num} w-20`} value={p.blockZ}
                    onChange={(e) => setGeo((g) => ({ ...g, [n === 1 ? "p1" : "p2"]: { ...p, blockZ: Number(e.target.value) || 0 } }))} />
                </div>
              );
            })}
            <button onClick={solve} className="rounded border border-fuchsia-500 px-3 py-1 text-xs text-fuchsia-600 dark:text-fuchsia-400 hover:bg-fuchsia-500/10">
              Solve transform
            </button>
          </section>

          <section className="space-y-2 border-t border-stone-200 dark:border-stone-800 pt-4">
            <button
              onClick={save}
              disabled={saving}
              className="w-full rounded bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save plot to bridge"}
            </button>
            {saveResult?.ok && saveResult.plotId != null && (
              <div className="space-y-2 rounded border border-emerald-600/40 bg-emerald-500/10 p-2 text-xs">
                <p>Saved as plot #{saveResult.plotId}.</p>
                <button
                  onClick={() => scanNow(saveResult.plotId!)}
                  disabled={scanning}
                  className="w-full rounded border border-emerald-600 px-3 py-1.5 font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600/10 disabled:opacity-50"
                >
                  {scanning ? "Scanning in-world…" : "Scan now (in-world)"}
                </button>
                {scanResult?.ok && (
                  <p>
                    Scored <strong>{scanResult.score}/100</strong> → {scanResult.status}.{" "}
                    {(scanResult.status === "pending_spot" || scanResult.status === "pending_full") && (
                      <Link href={{ pathname: "/admin/reviews" }} className="underline">
                        review queue
                      </Link>
                    )}
                  </p>
                )}
                {scanResult?.error && <p className="text-red-600 dark:text-red-400">{scanResult.error}</p>}
              </div>
            )}
            {saveResult?.error && (
              <p className="text-xs text-red-600 dark:text-red-400">{saveResult.error}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
