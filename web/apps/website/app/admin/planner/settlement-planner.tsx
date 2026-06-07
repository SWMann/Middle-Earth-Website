"use client";

import { useEffect, useMemo, useState } from "react";
import type { PlannerCatalogue } from "@/lib/data/planner";
import {
  type Plan,
  type PlanDistrict,
  TIER_ORDER,
  tierIndex,
  prettyTier,
  primarySlot,
  allowedHousing,
  computePreview,
  emptyPlan,
} from "@/lib/planner/compute";

const DRAFTS_KEY = "me-planner-drafts-v1";
let uidCounter = 0;
const nextUid = () => `d${Date.now().toString(36)}_${(uidCounter++).toString(36)}`;

export function SettlementPlanner({ catalogue }: { catalogue: PlannerCatalogue }) {
  const [plan, setPlan] = useState<Plan>(emptyPlan);
  const [drafts, setDrafts] = useState<{ name: string; plan: Plan }[]>([]);

  // Load drafts from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFTS_KEY);
      if (raw) setDrafts(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const persistDrafts = (next: { name: string; plan: Plan }[]) => {
    setDrafts(next);
    try {
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const dtById = useMemo(
    () => new Map(catalogue.districtTypes.map((d) => [d.id, d])),
    [catalogue],
  );

  const factionsSorted = useMemo(
    () => [...catalogue.factions].sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [catalogue],
  );

  const restrictedSet = useMemo(() => {
    const s = new Set<string>();
    for (const r of catalogue.factionRules) {
      if (r.factionId === plan.factionId && r.ruleType === "restrict")
        s.add(r.districtTypeId);
    }
    return s;
  }, [catalogue, plan.factionId]);

  // Districts available at the chosen tier + faction.
  const availableDistricts = useMemo(() => {
    const maxTier = tierIndex(plan.tier);
    return catalogue.districtTypes
      .filter((d) => tierIndex(d.tierMin) <= maxTier && !restrictedSet.has(d.id))
      .sort(
        (a, b) =>
          a.category.localeCompare(b.category) ||
          a.displayName.localeCompare(b.displayName),
      );
  }, [catalogue, plan.tier, restrictedSet]);

  const availableUnits = useMemo(() => {
    const maxTier = tierIndex(plan.tier);
    return catalogue.unitTypes
      .filter(
        (u) =>
          tierIndex(u.tierRequired) <= maxTier &&
          (u.factionId == null || u.factionId === plan.factionId),
      )
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [catalogue, plan.tier, plan.factionId]);

  const preview = useMemo(() => computePreview(plan, catalogue), [plan, catalogue]);

  // --- mutations ---
  function defaultBuildings(districtTypeId: string): PlanDistrict["buildings"] {
    const dt = dtById.get(districtTypeId);
    const slot = primarySlot(catalogue, districtTypeId);
    if (!dt || !slot) return [];
    if (dt.capFromHousing) {
      // Default to a representative (median bed-count) home of the quarter's
      // own class, so a Cottage Quarter starts with cottages, not the cheapest
      // cabin or the biggest tenement.
      const ownClass = allowedHousing(catalogue, dt.populationClass)
        .filter((b) => b.housingClass === dt.populationClass)
        .sort((a, b) => a.beds - b.beds);
      const own = ownClass[Math.floor(ownClass.length / 2)] ?? ownClass[0];
      return own ? [{ buildingTypeId: own.id, count: slot.min }] : [];
    }
    // Ranged non-residential (market/stables): the specific required building.
    const reqRow = catalogue.requiredBuildings.find(
      (r) => r.districtTypeId === districtTypeId && r.buildingTypeId,
    );
    return reqRow?.buildingTypeId
      ? [{ buildingTypeId: reqRow.buildingTypeId, count: slot.min }]
      : [];
  }

  const addDistrict = (id: string) =>
    setPlan((p) => ({
      ...p,
      districts: [
        ...p.districts,
        { uid: nextUid(), districtTypeId: id, buildings: defaultBuildings(id) },
      ],
    }));

  const removeDistrict = (uid: string) =>
    setPlan((p) => ({ ...p, districts: p.districts.filter((d) => d.uid !== uid) }));

  const setBuildingCount = (uid: string, buildingTypeId: string, count: number) =>
    setPlan((p) => ({
      ...p,
      districts: p.districts.map((d) => {
        if (d.uid !== uid) return d;
        const existing = d.buildings.find((b) => b.buildingTypeId === buildingTypeId);
        let buildings: PlanDistrict["buildings"];
        if (existing) {
          buildings =
            count <= 0
              ? d.buildings.filter((b) => b.buildingTypeId !== buildingTypeId)
              : d.buildings.map((b) =>
                  b.buildingTypeId === buildingTypeId ? { ...b, count } : b,
                );
        } else if (count > 0) {
          buildings = [...d.buildings, { buildingTypeId, count }];
        } else {
          buildings = d.buildings;
        }
        return { ...d, buildings };
      }),
    }));

  const setGarrison = (unitTypeId: string, count: number) =>
    setPlan((p) => {
      const has = p.garrison.find((g) => g.unitTypeId === unitTypeId);
      let garrison;
      if (has) {
        garrison =
          count <= 0
            ? p.garrison.filter((g) => g.unitTypeId !== unitTypeId)
            : p.garrison.map((g) => (g.unitTypeId === unitTypeId ? { ...g, count } : g));
      } else if (count > 0) {
        garrison = [...p.garrison, { unitTypeId, count }];
      } else {
        garrison = p.garrison;
      }
      return { ...p, garrison };
    });

  const saveDraft = () => {
    const name = plan.name.trim() || "Untitled plan";
    const next = [
      { name, plan: { ...plan, name } },
      ...drafts.filter((d) => d.name !== name),
    ];
    persistDrafts(next);
  };
  const loadDraft = (name: string) => {
    const d = drafts.find((x) => x.name === name);
    if (d) setPlan(structuredClone(d.plan));
  };
  const deleteDraft = (name: string) =>
    persistDrafts(drafts.filter((d) => d.name !== name));

  const faction = catalogue.factions.find((f) => f.id === plan.factionId) ?? null;
  const culture = faction
    ? catalogue.cultures.find((c) => c.id === faction.cultureId)
    : null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest opacity-60">
          Admin · balancing
        </p>
        <h1 className="text-2xl font-semibold">Settlement Planner</h1>
        <p className="text-sm opacity-70 mt-1 max-w-2xl">
          Plan a settlement for any faction and tier, then read its steady-state
          economy and systems. Numbers are computed live from the catalogue;
          nothing is saved server-side. Drafts live in this browser.
        </p>
      </header>

      <div className="grid lg:grid-cols-[1fr_26rem] gap-8 items-start">
        {/* ---------- LEFT: editor ---------- */}
        <div className="space-y-6">
          {/* Setup */}
          <section className="rounded border border-stone-200 dark:border-stone-800 p-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs uppercase tracking-widest opacity-60">
                  Plan name
                </span>
                <input
                  value={plan.name}
                  onChange={(e) => setPlan((p) => ({ ...p, name: e.target.value }))}
                  className="mt-1 w-full rounded border border-stone-300 dark:border-stone-700 bg-transparent px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-widest opacity-60">
                  Faction
                </span>
                <select
                  value={plan.factionId ?? ""}
                  onChange={(e) =>
                    setPlan((p) => ({ ...p, factionId: e.target.value || null }))
                  }
                  className="mt-1 w-full rounded border border-stone-300 dark:border-stone-700 bg-transparent px-2 py-1.5 text-sm"
                >
                  <option value="">— any —</option>
                  {factionsSorted.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.displayName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4">
              <span className="text-xs uppercase tracking-widest opacity-60">
                Tier
              </span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {TIER_ORDER.map((t) => (
                  <button
                    key={t}
                    onClick={() => setPlan((p) => ({ ...p, tier: t }))}
                    className={`text-xs px-2 py-1 rounded border ${
                      plan.tier === t
                        ? "border-stone-900 dark:border-stone-100 bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900"
                        : "border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-900"
                    }`}
                  >
                    {prettyTier(t)}
                  </button>
                ))}
              </div>
            </div>
            {culture && (
              <p className="mt-3 text-xs opacity-60">
                Builds in the <span className="font-medium">{culture.displayName}</span>{" "}
                style.
              </p>
            )}
          </section>

          {/* Add district */}
          <section className="rounded border border-stone-200 dark:border-stone-800 p-4">
            <h2 className="text-sm uppercase tracking-widest opacity-60 mb-2">
              Add district
            </h2>
            <AddDistrict districts={availableDistricts} onAdd={addDistrict} />
          </section>

          {/* District list */}
          <section className="space-y-3">
            {plan.districts.length === 0 && (
              <p className="text-sm opacity-50 italic">
                No districts yet. Add a residential quarter to seat a population,
                then the production and service districts to support it.
              </p>
            )}
            {plan.districts.map((inst) => {
              const dt = dtById.get(inst.districtTypeId);
              if (!dt) return null;
              const slot = primarySlot(catalogue, dt.id);
              const total = inst.buildings.reduce((s, b) => s + b.count, 0);
              const housing = dt.capFromHousing
                ? allowedHousing(catalogue, dt.populationClass)
                : [];
              return (
                <div
                  key={inst.uid}
                  className="rounded border border-stone-200 dark:border-stone-800 p-3"
                >
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-semibold">{dt.displayName}</span>
                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-900 text-stone-500">
                      {dt.category}
                    </span>
                    {slot && (
                      <span
                        className={`text-xs tabular-nums ${
                          total < slot.min || total > slot.max
                            ? "text-red-600 dark:text-red-400"
                            : "opacity-60"
                        }`}
                      >
                        {total} / {slot.min}–{slot.max} buildings
                      </span>
                    )}
                    <button
                      onClick={() => removeDistrict(inst.uid)}
                      className="ml-auto text-xs opacity-50 hover:opacity-100 hover:text-red-600"
                    >
                      remove
                    </button>
                  </div>

                  {/* Residential: per-housing picker */}
                  {dt.capFromHousing && slot && (
                    <div className="mt-2 space-y-1">
                      {housing.map((b) => {
                        const cur =
                          inst.buildings.find((x) => x.buildingTypeId === b.id)?.count ?? 0;
                        return (
                          <Stepper
                            key={b.id}
                            label={`${b.displayName}`}
                            sub={`${b.beds} beds · ${b.housingClass}`}
                            value={cur}
                            onChange={(n) => setBuildingCount(inst.uid, b.id, n)}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Ranged non-residential (market/stables): single count */}
                  {!dt.capFromHousing && slot && slot.max > slot.min && (
                    <div className="mt-2">
                      {inst.buildings.map((b) => (
                        <Stepper
                          key={b.buildingTypeId}
                          label={
                            catalogue.buildingTypes.find((x) => x.id === b.buildingTypeId)
                              ?.displayName ?? b.buildingTypeId
                          }
                          value={b.count}
                          min={slot.min}
                          max={slot.max}
                          onChange={(n) =>
                            setBuildingCount(inst.uid, b.buildingTypeId, n)
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          {/* Garrison */}
          <section className="rounded border border-stone-200 dark:border-stone-800 p-4">
            <h2 className="text-sm uppercase tracking-widest opacity-60 mb-2">
              Garrison <span className="opacity-50">(optional)</span>
            </h2>
            {availableUnits.length === 0 ? (
              <p className="text-xs opacity-50 italic">
                No units available — pick a faction and a higher tier.
              </p>
            ) : (
              <div className="space-y-1">
                {availableUnits.map((u) => {
                  const cur = plan.garrison.find((g) => g.unitTypeId === u.id)?.count ?? 0;
                  return (
                    <Stepper
                      key={u.id}
                      label={u.displayName}
                      sub={`${u.upkeepFoodDaily} food + ${u.upkeepCoinDaily} coin/day`}
                      value={cur}
                      onChange={(n) => setGarrison(u.id, n)}
                    />
                  );
                })}
              </div>
            )}
          </section>

          {/* Drafts */}
          <section className="rounded border border-stone-200 dark:border-stone-800 p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={saveDraft}
                className="text-xs px-3 py-1.5 rounded bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 hover:opacity-90"
              >
                Save draft
              </button>
              <button
                onClick={() => setPlan(emptyPlan())}
                className="text-xs px-3 py-1.5 rounded border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-900"
              >
                New / clear
              </button>
            </div>
            {drafts.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {drafts.map((d) => (
                  <li key={d.name} className="flex items-baseline gap-2">
                    <button
                      onClick={() => loadDraft(d.name)}
                      className="hover:underline text-left"
                    >
                      {d.name}
                    </button>
                    <span className="text-xs opacity-50">
                      {catalogue.factions.find((f) => f.id === d.plan.factionId)
                        ?.displayName ?? "any"}{" "}
                      · {prettyTier(d.plan.tier)} · {d.plan.districts.length} districts
                    </span>
                    <button
                      onClick={() => deleteDraft(d.name)}
                      className="ml-auto text-xs opacity-40 hover:opacity-100 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ---------- RIGHT: preview ---------- */}
        <div className="lg:sticky lg:top-6 space-y-4">
          <Preview preview={preview} catalogue={catalogue} />
        </div>
      </div>
    </div>
  );
}

// ---------- Preview panel ----------

function Preview({
  preview: p,
  catalogue,
}: {
  preview: ReturnType<typeof computePreview>;
  catalogue: PlannerCatalogue;
}) {
  const occName = (id: string) =>
    catalogue.occupationClasses.find((c) => c.id === id)?.displayName ?? id;
  const norm = (n: number) => {
    const r = Math.round(n);
    return Object.is(r, -0) ? 0 : r;
  };
  const fmt = (n: number) => norm(n).toLocaleString();
  const signed = (n: number) => {
    const v = norm(n);
    return `${v >= 0 ? "+" : ""}${v.toLocaleString()}`;
  };
  const col = (n: number) =>
    n >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400";

  return (
    <div className="rounded-lg border border-stone-200 dark:border-stone-800 overflow-hidden">
      <div className="bg-stone-50 dark:bg-stone-900/50 px-4 py-2 text-xs uppercase tracking-widest opacity-60">
        Live preview
      </div>
      <div className="p-4 space-y-5">
        {/* Warnings */}
        {p.warnings.length > 0 && (
          <ul className="space-y-1">
            {p.warnings.map((w, i) => (
              <li
                key={i}
                className="text-xs text-red-700 dark:text-red-400 flex gap-1.5"
              >
                <span aria-hidden>⚠</span>
                {w}
              </li>
            ))}
          </ul>
        )}

        {/* Headline */}
        <div className="grid grid-cols-2 gap-3">
          <Big label="Population cap" value={fmt(p.popCap)} />
          <Big label="Districts" value={p.districtCount.toString()} />
          <Big label="Coin / day" value={signed(p.coinNet)} cls={col(p.coinNet)} />
          <Big label="Food / day" value={signed(p.foodNet)} cls={col(p.foodNet)} />
        </div>

        {/* Population composition */}
        {p.composition.length > 0 && (
          <Block title="Population by class">
            <div className="flex h-2.5 w-full overflow-hidden rounded mb-2">
              {p.composition.map((c, i) => (
                <div
                  key={c.classId}
                  className={
                    [
                      "bg-amber-500",
                      "bg-sky-500",
                      "bg-violet-500",
                      "bg-emerald-500",
                      "bg-rose-500",
                      "bg-stone-500",
                    ][i % 6]
                  }
                  style={{ width: `${c.pct}%` }}
                  title={`${occName(c.classId)} ${c.pct}%`}
                />
              ))}
            </div>
            <ul className="space-y-0.5 text-sm">
              {p.composition.map((c) => (
                <li key={c.classId} className="flex items-baseline gap-2">
                  <span>{occName(c.classId)}</span>
                  <span className="ml-auto tabular-nums opacity-70">
                    {fmt(c.count)}
                  </span>
                  <span className="w-10 text-right tabular-nums opacity-50">
                    {c.pct}%
                  </span>
                  {p.target[c.classId] != null && (
                    <span className="w-14 text-right text-xs opacity-40">
                      ~{p.target[c.classId]}%
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-[10px] opacity-40 mt-1">
              Right column: the canonical mix for this tier, for reference.
            </p>
          </Block>
        )}

        {/* Economy */}
        <Block title="Treasury / day">
          <Row label="Tax from residents" value={signed(p.taxIncome)} cls={col(p.taxIncome)} />
          {p.coinFromEffects > 0 && (
            <Row label="Trade & services" value={signed(p.coinFromEffects)} cls={col(p.coinFromEffects)} />
          )}
          <Row label="District upkeep" value={signed(-p.upkeepCoin)} cls={col(-p.upkeepCoin)} />
          {p.garrisonCoin > 0 && (
            <Row label="Garrison upkeep" value={signed(-p.garrisonCoin)} cls={col(-p.garrisonCoin)} />
          )}
          <Row label="Net coin" value={signed(p.coinNet)} cls={col(p.coinNet)} strong />
          <div className="h-2" />
          <Row label="Food produced" value={signed(p.foodProduced)} cls={col(p.foodProduced)} />
          <Row label="Food eaten" value={signed(-p.foodConsumed)} cls={col(-p.foodConsumed)} />
          <Row label="Net food" value={signed(p.foodNet)} cls={col(p.foodNet)} strong />
          <div className="h-2" />
          {p.dpIncome > 0 && <Row label="Diplomacy / day" value={signed(p.dpIncome)} cls={col(p.dpIncome)} />}
          {p.prestige > 0 && <Row label="Prestige" value={`+${fmt(p.prestige)}`} />}
        </Block>

        {/* Production */}
        {p.production.length > 0 && (
          <Block title="Production / day">
            <ul className="space-y-0.5 text-sm">
              {p.production.map((r) => (
                <li key={r.resourceId} className="flex items-baseline gap-2">
                  <span>{r.name}</span>
                  <span className="ml-auto tabular-nums text-emerald-700 dark:text-emerald-400">
                    +{r.amount.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          </Block>
        )}

        {/* Consumption */}
        {p.consumption.length > 0 && (
          <Block title="Input demand / day">
            <ul className="space-y-0.5 text-sm">
              {p.consumption.map((c) => (
                <li key={c.tagId} className="flex items-baseline gap-2">
                  <span>{c.name}</span>
                  <span className="ml-auto tabular-nums opacity-70">
                    {c.amount.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          </Block>
        )}

        {/* Staffing */}
        {p.staffing.length > 0 && (
          <Block title="Staffing">
            <ul className="space-y-0.5 text-sm">
              {p.staffing.map((s) => (
                <li key={s.classId} className="flex items-baseline gap-2">
                  <span>{occName(s.classId)}</span>
                  <span
                    className={`ml-auto tabular-nums ${
                      s.demand > s.supply
                        ? "text-red-700 dark:text-red-400"
                        : "text-emerald-700 dark:text-emerald-400"
                    }`}
                  >
                    {s.demand} / {s.supply}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[10px] opacity-40 mt-1">needed / housed</p>
          </Block>
        )}

        {/* Construction */}
        <Block title="To build">
          <Row label="Coin commission" value={fmt(p.buildCoin)} />
          {p.buildDp > 0 && <Row label="DP commission" value={fmt(p.buildDp)} />}
          <Row
            label="Footprint"
            value={`${fmt(p.footMin)}–${fmt(p.footMax)} blk²`}
          />
        </Block>
      </div>
    </div>
  );
}

// ---------- small components ----------

function AddDistrict({
  districts,
  onAdd,
}: {
  districts: PlannerCatalogue["districtTypes"];
  onAdd: (id: string) => void;
}) {
  const [sel, setSel] = useState("");
  const byCat = new Map<string, typeof districts>();
  for (const d of districts) {
    if (!byCat.has(d.category)) byCat.set(d.category, []);
    byCat.get(d.category)!.push(d);
  }
  return (
    <div className="flex gap-2">
      <select
        value={sel}
        onChange={(e) => setSel(e.target.value)}
        className="flex-1 rounded border border-stone-300 dark:border-stone-700 bg-transparent px-2 py-1.5 text-sm"
      >
        <option value="">Choose a district…</option>
        {[...byCat.entries()].map(([cat, list]) => (
          <optgroup key={cat} label={cat}>
            {list.map((d) => (
              <option key={d.id} value={d.id}>
                {d.displayName}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <button
        disabled={!sel}
        onClick={() => {
          if (sel) onAdd(sel);
        }}
        className="text-sm px-3 py-1.5 rounded bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 disabled:opacity-40"
      >
        Add
      </button>
    </div>
  );
}

function Stepper({
  label,
  sub,
  value,
  onChange,
  min = 0,
  max = 99,
}: {
  label: string;
  sub?: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="flex-1 truncate">
        {label}
        {sub && <span className="opacity-40 text-xs"> · {sub}</span>}
      </span>
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-6 h-6 rounded border border-stone-300 dark:border-stone-700 leading-none hover:bg-stone-100 dark:hover:bg-stone-900"
      >
        −
      </button>
      <span className="w-7 text-center tabular-nums">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-6 h-6 rounded border border-stone-300 dark:border-stone-700 leading-none hover:bg-stone-100 dark:hover:bg-stone-900"
      >
        +
      </button>
    </div>
  );
}

function Big({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="rounded border border-stone-200 dark:border-stone-800 p-2.5">
      <div className="text-[10px] uppercase tracking-widest opacity-50">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${cls ?? ""}`}>{value}</div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-widest opacity-60 mb-1.5">{title}</h3>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  cls,
  strong,
}: {
  label: string;
  value: string;
  cls?: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline gap-2 text-sm ${
        strong ? "border-t border-stone-100 dark:border-stone-900 pt-1 mt-0.5 font-medium" : ""
      }`}
    >
      <span className={strong ? "" : "opacity-70"}>{label}</span>
      <span className={`ml-auto tabular-nums ${cls ?? ""}`}>{value}</span>
    </div>
  );
}
