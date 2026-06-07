"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { PlannerCatalogue } from "@/lib/data/planner";
import {
  type Plan,
  type PlanDistrict,
  type DistrictContribution,
  TIER_ORDER,
  tierIndex,
  prettyTier,
  primarySlot,
  allowedHousing,
  allowedUpgrades,
  optionalSlot,
  availableDeposits,
  computePreview,
  emptyPlan,
} from "@/lib/planner/compute";

const DRAFTS_KEY = "me-planner-drafts-v1";
let uidCounter = 0;
const nextUid = () => `d${Date.now().toString(36)}_${(uidCounter++).toString(36)}`;

export function SettlementPlanner({ catalogue }: { catalogue: PlannerCatalogue }) {
  const [plan, setPlan] = useState<Plan>(emptyPlan);
  const [drafts, setDrafts] = useState<{ name: string; plan: Plan }[]>([]);
  const [modal, setModal] = useState<
    { type: "district"; uid: string } | { type: "building"; id: string } | null
  >(null);

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
    // Ranged non-residential (production / market / stables): prefer the
    // ranged building — for output districts that's the production building
    // (a Smithy's forge, a Bakery's bakehouse), not a fixed co-building.
    const rangedRow = catalogue.requiredBuildings.find(
      (r) =>
        r.districtTypeId === districtTypeId &&
        r.buildingTypeId &&
        r.maxCount != null &&
        r.maxCount > r.count,
    );
    const reqRow =
      rangedRow ??
      catalogue.requiredBuildings.find(
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
        {
          uid: nextUid(),
          districtTypeId: id,
          buildings: defaultBuildings(id),
          deposit: availableDeposits(catalogue, id, p.tier)[0]?.id,
        },
      ],
    }));

  const setDeposit = (uid: string, depositId: string) =>
    setPlan((p) => ({
      ...p,
      districts: p.districts.map((d) =>
        d.uid === uid ? { ...d, deposit: depositId } : d,
      ),
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
              // Count only primary-slot buildings, not optional upgrades.
              const upgradeIdSet = new Set(
                allowedUpgrades(catalogue, dt.id).map((u) => u.id),
              );
              const total = inst.buildings
                .filter((b) => !upgradeIdSet.has(b.buildingTypeId))
                .reduce((s, b) => s + b.count, 0);
              const housing = dt.capFromHousing
                ? allowedHousing(catalogue, dt.populationClass)
                : [];
              return (
                <div
                  key={inst.uid}
                  className="rounded border border-stone-200 dark:border-stone-800 p-3"
                >
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <button
                      onClick={() => setModal({ type: "district", uid: inst.uid })}
                      className="font-semibold hover:underline text-left"
                      title="Open district detail"
                    >
                      {dt.displayName}
                    </button>
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

                  {/* Extraction: deposit picker */}
                  {dt.extractionMethod &&
                    (() => {
                      const deps = availableDeposits(catalogue, dt.id, plan.tier);
                      return (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs opacity-60">Working</span>
                          <select
                            value={inst.deposit ?? ""}
                            onChange={(e) => setDeposit(inst.uid, e.target.value)}
                            className="flex-1 rounded border border-stone-300 dark:border-stone-700 bg-transparent px-2 py-1 text-sm"
                          >
                            {deps.length === 0 && (
                              <option value="">— none at this tier —</option>
                            )}
                            {deps.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.displayName} ({d.baseYield}/shaft
                                {d.requiresDiscovery ? ` · needs ${d.requiresDiscovery}` : ""})
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })()}

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
                            onLabelClick={() => setModal({ type: "building", id: b.id })}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Ranged non-residential (production / market / stables).
                      Show only the primary-slot building(s), not optional
                      upgrades (which get their own picker below). */}
                  {!dt.capFromHousing && slot && slot.max > slot.min && (
                    <div className="mt-2">
                      {dt.outputFromBuildings && (
                        <p className="text-[10px] opacity-50 mb-1">
                          Output scales with this building — more = more goods.
                        </p>
                      )}
                      {inst.buildings
                        .filter(
                          (b) =>
                            !allowedUpgrades(catalogue, dt.id).some(
                              (u) => u.id === b.buildingTypeId,
                            ),
                        )
                        .map((b) => (
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
                          onLabelClick={() =>
                            setModal({ type: "building", id: b.buildingTypeId })
                          }
                        />
                      ))}
                    </div>
                  )}

                  {/* Optional workshop upgrades */}
                  {(() => {
                    const upgrades = allowedUpgrades(catalogue, dt.id);
                    if (upgrades.length === 0) return null;
                    const oslot = optionalSlot(catalogue, dt.id);
                    const cap = oslot?.maxCount ?? 0;
                    const used = inst.buildings
                      .filter((b) => upgrades.some((u) => u.id === b.buildingTypeId))
                      .reduce((s, b) => s + b.count, 0);
                    const remaining = cap - used;
                    return (
                      <div className="mt-3 border-t border-stone-100 dark:border-stone-900 pt-2">
                        <p className="text-[11px] uppercase tracking-widest opacity-50 mb-1">
                          Upgrades{" "}
                          <span className="opacity-70 tabular-nums">
                            {used}/{cap}
                          </span>
                        </p>
                        {upgrades.map((u) => {
                          const cur =
                            inst.buildings.find((b) => b.buildingTypeId === u.id)
                              ?.count ?? 0;
                          return (
                            <Stepper
                              key={u.id}
                              label={u.displayName}
                              value={cur}
                              max={cur + remaining}
                              onChange={(n) => setBuildingCount(inst.uid, u.id, n)}
                              onLabelClick={() =>
                                setModal({ type: "building", id: u.id })
                              }
                            />
                          );
                        })}
                      </div>
                    );
                  })()}
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
          <Preview preview={preview} catalogue={catalogue} onOpen={setModal} />
        </div>
      </div>

      {/* ---------- Modals ---------- */}
      {modal?.type === "district" &&
        (() => {
          const inst = plan.districts.find((d) => d.uid === modal.uid);
          const contrib = preview.perDistrict.find((d) => d.uid === modal.uid);
          if (!inst || !contrib) return null;
          return (
            <DistrictModal
              contrib={contrib}
              catalogue={catalogue}
              onClose={() => setModal(null)}
              onBuilding={(id) => setModal({ type: "building", id })}
            />
          );
        })()}
      {modal?.type === "building" && (
        <BuildingModal
          id={modal.id}
          catalogue={catalogue}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

export type OpenModal = (
  m: { type: "district"; uid: string } | { type: "building"; id: string },
) => void;

const EFFECT_LABEL: Record<string, string> = {
  output_pct: "Output",
  input_reduction_pct: "Input saved",
  coin_pct: "Coin / trade",
  upkeep_reduction_pct: "Upkeep saved",
  storage_capacity: "Storage",
};
function effectLabel(type: string): string {
  return EFFECT_LABEL[type] ?? type.replace(/_/g, " ");
}

// ---------- Preview panel ----------

const TABS = ["Overview", "Economy", "Population", "Production"] as const;

function Preview({
  preview: p,
  catalogue,
  onOpen,
}: {
  preview: ReturnType<typeof computePreview>;
  catalogue: PlannerCatalogue;
  onOpen: OpenModal;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
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
  const COLORS = ["bg-amber-500", "bg-sky-500", "bg-violet-500", "bg-emerald-500", "bg-rose-500", "bg-stone-500"];

  return (
    <div className="rounded-lg border border-stone-200 dark:border-stone-800 overflow-hidden">
      <div className="bg-stone-50 dark:bg-stone-900/50 px-4 py-2 text-xs uppercase tracking-widest opacity-60">
        Live preview
      </div>
      <div className="p-4 space-y-4">
        {/* Headline (always shown) */}
        <div className="grid grid-cols-2 gap-3">
          <Big label="Population cap" value={fmt(p.popCap)} />
          <Big label="Districts" value={p.districtCount.toString()} />
          <Big label="Coin / day" value={signed(p.coinNet)} cls={col(p.coinNet)} />
          <Big label="Food / day" value={signed(p.foodNet)} cls={col(p.foodNet)} />
        </div>

        {/* Warnings (always shown) */}
        {p.warnings.length > 0 && (
          <ul className="space-y-1">
            {p.warnings.map((w, i) => (
              <li key={i} className="text-xs text-red-700 dark:text-red-400 flex gap-1.5">
                <span aria-hidden>⚠</span>
                {w}
              </li>
            ))}
          </ul>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-stone-200 dark:border-stone-800">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs px-2.5 py-1.5 -mb-px border-b-2 ${
                tab === t
                  ? "border-stone-900 dark:border-stone-100 font-medium"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ---- Overview ---- */}
        {tab === "Overview" && (
          <div className="space-y-4">
            {p.composition.length > 0 && (
              <Block title="Population by class">
                <div className="flex h-2.5 w-full overflow-hidden rounded mb-2">
                  {p.composition.map((c, i) => (
                    <div
                      key={c.classId}
                      className={COLORS[i % 6]}
                      style={{ width: `${c.pct}%` }}
                      title={`${occName(c.classId)} ${c.pct}%`}
                    />
                  ))}
                </div>
                <ul className="space-y-0.5 text-sm">
                  {p.composition.map((c) => (
                    <li key={c.classId} className="flex items-baseline gap-2">
                      <span>{occName(c.classId)}</span>
                      <span className="ml-auto tabular-nums opacity-70">{fmt(c.count)}</span>
                      <span className="w-10 text-right tabular-nums opacity-50">{c.pct}%</span>
                    </li>
                  ))}
                </ul>
              </Block>
            )}
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
              <Row label="Net food" value={signed(p.foodNet)} cls={col(p.foodNet)} strong />
              {p.dpIncome > 0 && <Row label="Diplomacy / day" value={signed(p.dpIncome)} cls={col(p.dpIncome)} />}
              {p.prestige > 0 && <Row label="Prestige" value={`+${fmt(p.prestige)}`} />}
            </Block>
            <Block title="To build">
              <Row label="Coin commission" value={fmt(p.buildCoin)} />
              {p.buildDp > 0 && <Row label="DP commission" value={fmt(p.buildDp)} />}
              <Row label="Footprint" value={`${fmt(p.footMin)}–${fmt(p.footMax)} blk²`} />
            </Block>
          </div>
        )}

        {/* ---- Economy ---- */}
        {tab === "Economy" && (
          <div className="space-y-4">
            <Block title="Coin by district">
              {p.perDistrict.length === 0 ? (
                <p className="text-xs opacity-50 italic">No districts yet.</p>
              ) : (
                <ul className="space-y-0.5 text-sm">
                  {[...p.perDistrict]
                    .sort((a, b) => b.coinNet - a.coinNet)
                    .map((d) => (
                      <li key={d.uid} className="flex items-baseline gap-2">
                        <button
                          onClick={() => onOpen({ type: "district", uid: d.uid })}
                          className="hover:underline text-left truncate"
                        >
                          {d.name}
                        </button>
                        <span className={`ml-auto tabular-nums ${col(d.coinNet)}`}>
                          {signed(d.coinNet)}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </Block>
            <Block title="Efficiency">
              <Row label="Coin / head" value={p.ratios.coinPerPop.toFixed(2)} />
              <Row label="Coin / district" value={p.ratios.coinPerDistrict.toFixed(1)} />
              <Row label="Tax / head" value={p.ratios.taxPerCapita.toFixed(2)} />
              <Row
                label="Food self-sufficiency"
                value={`${Math.round(p.ratios.foodSelfSufficiencyPct)}%`}
                cls={p.ratios.foodSelfSufficiencyPct >= 100 ? col(1) : col(-1)}
              />
              <Row
                label="Upkeep / gross income"
                value={`${Math.round(p.ratios.upkeepRatioPct)}%`}
              />
              {p.ratios.buildRoiDays != null && (
                <Row label="Build payback" value={`${Math.ceil(p.ratios.buildRoiDays)} days`} />
              )}
            </Block>
            {p.ratios.scaleCoinBonus > 0 && (
              <Block title="Density dividend">
                <Row
                  label="Extra tax from building big"
                  value={signed(p.ratios.scaleCoinBonus)}
                  cls={col(1)}
                />
                <p className="text-[10px] opacity-40 mt-1">
                  +{Math.round(p.ratios.scaleCoinBonusPct)}% over the same housing built at
                  the minimum size.
                </p>
              </Block>
            )}
          </div>
        )}

        {/* ---- Population ---- */}
        {tab === "Population" && (
          <div className="space-y-4">
            <Block title="Composition vs. tier norm">
              <ul className="space-y-0.5 text-sm">
                {p.compositionDeviation
                  .filter((d) => d.planPct > 0 || d.targetPct > 0)
                  .map((d) => (
                    <li key={d.classId} className="flex items-baseline gap-2">
                      <span>{occName(d.classId)}</span>
                      <span className="ml-auto tabular-nums opacity-70 w-10 text-right">
                        {d.planPct}%
                      </span>
                      <span className="tabular-nums opacity-40 w-12 text-right">
                        ~{d.targetPct}%
                      </span>
                      <span
                        className={`tabular-nums w-12 text-right ${
                          Math.abs(d.delta) <= 5 ? "opacity-40" : col(d.delta)
                        }`}
                      >
                        {d.delta >= 0 ? "+" : ""}
                        {d.delta}
                      </span>
                    </li>
                  ))}
              </ul>
              <p className="text-[10px] opacity-40 mt-1">plan · norm · deviation</p>
            </Block>
            {p.staffing.length > 0 && (
              <Block title="Workforce (needed / housed)">
                <ul className="space-y-0.5 text-sm">
                  {p.staffing.map((s) => (
                    <li key={s.classId} className="flex items-baseline gap-2">
                      <span>{occName(s.classId)}</span>
                      <span
                        className={`ml-auto tabular-nums ${
                          s.demand > s.supply ? col(-1) : col(1)
                        }`}
                      >
                        {s.demand} / {s.supply}
                      </span>
                    </li>
                  ))}
                </ul>
              </Block>
            )}
            {p.soldiers > 0 && (
              <Block title="Garrison">
                <Row label="Soldiers" value={fmt(p.soldiers)} />
                <Row
                  label="Garrison cap"
                  value={fmt(p.garrisonCap)}
                  cls={p.soldiers > p.garrisonCap ? col(-1) : undefined}
                />
                <Row label="Upkeep" value={`${fmt(p.garrisonFood)} food + ${fmt(p.garrisonCoin)} coin`} />
              </Block>
            )}
          </div>
        )}

        {/* ---- Production ---- */}
        {tab === "Production" && (
          <div className="space-y-4">
            {p.inputBalance.length > 0 && (
              <Block title="Supply chain">
                <ul className="space-y-1 text-sm">
                  {p.inputBalance.map((b) => (
                    <li key={b.tagId}>
                      <div className="flex items-baseline gap-2">
                        <span>{b.name}</span>
                        <span className={`ml-auto tabular-nums ${col(b.net)}`}>
                          {b.net >= 0 ? "surplus" : "short"} {Math.abs(b.net).toFixed(1)}
                        </span>
                      </div>
                      <div className="text-[10px] opacity-50">
                        demand {b.demand} · local supply {b.supply.toFixed(1)}
                        {b.satisfying.length > 0 &&
                          ` (${b.satisfying.map((s) => s.name).join(", ")})`}
                      </div>
                    </li>
                  ))}
                </ul>
              </Block>
            )}
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
            <Block title="Food balance">
              <Row label="Produced" value={signed(p.foodProduced)} cls={col(p.foodProduced)} />
              <Row label="Civilians eat" value={signed(-p.foodConsumedCiv)} cls={col(-1)} />
              {p.garrisonFood > 0 && (
                <Row label="Garrison eats" value={signed(-p.garrisonFood)} cls={col(-1)} />
              )}
              <Row label="Net" value={signed(p.foodNet)} cls={col(p.foodNet)} strong />
            </Block>
          </div>
        )}
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
  onLabelClick,
  min = 0,
  max = 99,
}: {
  label: string;
  sub?: string;
  value: number;
  onChange: (n: number) => void;
  onLabelClick?: () => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="flex-1 truncate">
        {onLabelClick ? (
          <button onClick={onLabelClick} className="hover:underline" title="Open detail">
            {label}
          </button>
        ) : (
          label
        )}
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

// ---------- Modals ----------

function Modal({
  title,
  sub,
  href,
  hrefLabel,
  onClose,
  children,
}: {
  title: string;
  sub?: string;
  href?: string;
  hrefLabel?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="mt-12 w-full max-w-lg rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-stone-200 dark:border-stone-800 px-5 py-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold truncate">{title}</h2>
            {sub && <p className="text-xs opacity-60">{sub}</p>}
          </div>
          <button
            onClick={onClose}
            className="ml-auto text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {href && (
          <div className="border-t border-stone-200 dark:border-stone-800 px-5 py-2.5">
            <Link
              href={{ pathname: href }}
              className="text-xs underline opacity-70 hover:opacity-100"
            >
              {hrefLabel ?? "Open full page"} →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function DistrictModal({
  contrib: d,
  catalogue,
  onClose,
  onBuilding,
}: {
  contrib: DistrictContribution;
  catalogue: PlannerCatalogue;
  onClose: () => void;
  onBuilding: (id: string) => void;
}) {
  const dt = catalogue.districtTypes.find((x) => x.id === d.districtTypeId);
  const occName = (id: string) =>
    catalogue.occupationClasses.find((c) => c.id === id)?.displayName ?? id;
  const bName = (id: string) =>
    catalogue.buildingTypes.find((b) => b.id === id)?.displayName ?? id;
  const compName = (id: string) =>
    catalogue.functionalComponents.find((c) => c.id === id)?.displayName ?? id;
  const reqB = catalogue.requiredBuildings.filter((r) => r.districtTypeId === d.districtTypeId);
  const reqC = catalogue.requiredComponents.filter((r) => r.districtTypeId === d.districtTypeId);
  const fmt = (n: number) => Math.round(n).toLocaleString();

  return (
    <Modal
      title={d.name}
      sub={`${d.category}${dt?.tierMin ? ` · ${prettyTier(dt.tierMin)}+` : ""}${
        dt?.populationClass ? ` · houses ${occName(dt.populationClass)}` : ""
      }`}
      href={`/districts/${d.districtTypeId}`}
      hrefLabel="Open district page"
      onClose={onClose}
    >
      {dt?.description && <p className="text-sm opacity-80">{dt.description}</p>}

      <Block title="In this plan">
        {d.deposit && <Row label="Working" value={d.deposit.name} />}
        <Row label="Buildings" value={`${d.totalBuildings}${d.slotMin != null ? ` (${d.slotMin}–${d.slotMax})` : ""}`} />
        {d.popCap > 0 && <Row label="Population cap" value={fmt(d.popCap)} />}
        {Object.entries(d.popByClass).map(([c, n]) => (
          <Row key={c} label={`· ${occName(c)}`} value={fmt(n)} />
        ))}
        <Row label="Net coin / day" value={`${d.coinNet >= 0 ? "+" : ""}${fmt(d.coinNet)}`} />
        {d.foodProduced > 0 && <Row label="Food / day" value={`+${fmt(d.foodProduced)}`} />}
        {d.dpBase > 0 && <Row label="Diplomacy / day" value={`+${fmt(d.dpBase)}`} />}
        {d.prestige > 0 && <Row label="Prestige" value={`+${fmt(d.prestige)}`} />}
      </Block>

      {d.production.length > 0 && (
        <Block title="Produces / day">
          {d.production.map((r) => (
            <Row key={r.resourceId} label={r.name} value={`+${r.amount.toFixed(1)}`} />
          ))}
        </Block>
      )}
      {d.consumption.length > 0 && (
        <Block title="Consumes / day">
          {d.consumption.map((c) => (
            <Row key={c.tagId} label={c.name} value={c.amount.toFixed(1)} />
          ))}
        </Block>
      )}
      {d.scale.length > 0 && (
        <Block title="Scale dividend (active)">
          {d.scale.map((s) => (
            <Row
              key={s.bonusType}
              label={s.bonusType.replace(/_/g, " ")}
              value={`+${s.totalPct}${s.bonusType === "prestige" ? "" : "%"}`}
            />
          ))}
        </Block>
      )}

      {(d.upgradeBuff.outputPct > 0 ||
        d.upgradeBuff.inputRedPct > 0 ||
        d.upgradeBuff.coinPct > 0) && (
        <Block title="Workshop upgrades (active)">
          {d.upgradeBuff.outputPct > 0 && (
            <Row label="Output" value={`+${d.upgradeBuff.outputPct}%`} />
          )}
          {d.upgradeBuff.inputRedPct > 0 && (
            <Row label="Input saved" value={`−${d.upgradeBuff.inputRedPct}%`} />
          )}
          {d.upgradeBuff.coinPct > 0 && (
            <Row label="Coin / trade" value={`+${d.upgradeBuff.coinPct}%`} />
          )}
        </Block>
      )}

      {reqB.length > 0 && (
        <Block title="Required buildings">
          <ul className="text-sm space-y-0.5">
            {reqB.map((r) => (
              <li key={r.id} className="flex items-baseline gap-2">
                <span className="tabular-nums opacity-60 w-12">
                  {r.maxCount && r.maxCount > r.count ? `${r.count}–${r.maxCount}` : r.count}×
                </span>
                {r.buildingTypeId ? (
                  <button
                    onClick={() => onBuilding(r.buildingTypeId!)}
                    className="hover:underline text-left"
                  >
                    {bName(r.buildingTypeId)}
                  </button>
                ) : (
                  <span className="italic opacity-80">{r.themeNote ?? "themed"}</span>
                )}
              </li>
            ))}
          </ul>
        </Block>
      )}
      {reqC.length > 0 && (
        <Block title="Required components">
          <ul className="text-sm flex flex-wrap gap-x-3 gap-y-0.5">
            {reqC.map((r) => (
              <li key={r.componentId}>
                {r.count}× {compName(r.componentId)}
                {r.perCap ? " /cap" : ""}
              </li>
            ))}
          </ul>
        </Block>
      )}
      {Object.keys(d.staffDemand).length > 0 && (
        <Block title="Staffing">
          {Object.entries(d.staffDemand).map(([c, n]) => (
            <Row key={c} label={occName(c)} value={fmt(n)} />
          ))}
        </Block>
      )}
    </Modal>
  );
}

function BuildingModal({
  id,
  catalogue,
  onClose,
}: {
  id: string;
  catalogue: PlannerCatalogue;
  onClose: () => void;
}) {
  const b = catalogue.buildingTypes.find((x) => x.id === id);
  if (!b) return null;
  const compName = (cid: string) =>
    catalogue.functionalComponents.find((c) => c.id === cid)?.displayName ?? cid;
  const cultureName = (cid: string) =>
    catalogue.cultures.find((c) => c.id === cid)?.displayName ?? cid;
  const provides = catalogue.provides.filter((p) => p.buildingTypeId === id);
  const outputs = catalogue.buildingOutputs.filter((o) => o.buildingTypeId === id);
  const effects = catalogue.buildingEffects.filter((e) => e.buildingTypeId === id);
  const resName = (rid: string | null) =>
    rid ? catalogue.resources.find((r) => r.id === rid)?.displayName ?? rid : "coin";
  const tags = catalogue.buildingTags.filter((t) => t.buildingTypeId === id).map((t) => t.tag);
  const variants = catalogue.buildingVariants.filter((v) => v.buildingTypeId === id);
  const usedBy = catalogue.requiredBuildings
    .filter((r) => r.buildingTypeId === id)
    .map((r) => catalogue.districtTypes.find((d) => d.id === r.districtTypeId)?.displayName)
    .filter(Boolean);
  const fp =
    b.minFootprintBlocks != null || b.maxFootprintBlocks != null
      ? `${b.minFootprintBlocks ?? "?"}–${b.maxFootprintBlocks ?? "?"} blk²`
      : null;

  return (
    <Modal
      title={b.displayName}
      sub={`${b.category}${b.housingClass ? ` · ${b.housingClass} class` : ""}${
        b.tierMin ? ` · ${prettyTier(b.tierMin)}+` : ""
      }`}
      href={`/buildings`}
      hrefLabel="Open buildings page"
      onClose={onClose}
    >
      {effects.length > 0 && (
        <Block title="District buff (when added)">
          {effects.map((e) => (
            <Row
              key={e.effectType}
              label={effectLabel(e.effectType)}
              value={
                e.effectType === "input_reduction_pct"
                  ? `−${e.magnitude}%`
                  : e.effectType === "storage_capacity"
                    ? `+${e.magnitude}`
                    : `+${e.magnitude}%`
              }
            />
          ))}
          <p className="text-[10px] opacity-40 mt-1">
            An optional upgrade — buffs the production district it sits in.
          </p>
        </Block>
      )}
      {outputs.length > 0 && (
        <Block title="Produces / day (each)">
          {outputs.map((o) => (
            <Row
              key={o.id}
              label={`${resName(o.resourceId)}${o.outputKind !== "primary" ? ` (${o.outputKind})` : ""}`}
              value={o.outputKind === "coin" ? `+${o.dailyAmount} coin` : `+${o.dailyAmount}`}
            />
          ))}
          <p className="text-[10px] opacity-40 mt-1">
            Per building — a district&apos;s output is the sum of these.
          </p>
        </Block>
      )}
      {provides.length > 0 && (
        <Block title="Provides">
          <div className="flex flex-wrap gap-1.5">
            {provides.map((p) => (
              <span
                key={p.componentId}
                className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
              >
                {p.quantity > 1 ? `${p.quantity}× ` : ""}
                {compName(p.componentId)}
              </span>
            ))}
          </div>
        </Block>
      )}
      <Block title="Intrinsics">
        {b.beds > 0 && <Row label="Beds" value={b.beds.toString()} />}
        {fp && <Row label="Footprint" value={fp} />}
        {b.minHeightBlocks != null && <Row label="Min height" value={`${b.minHeightBlocks} blk`} />}
        {b.level > 1 && <Row label="Tier" value={`${b.level}${b.upgradesFrom ? ` (upgrades ${b.upgradesFrom})` : ""}`} />}
      </Block>
      {tags.length > 0 && (
        <Block title="Tags">
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-900 text-stone-500 font-mono"
              >
                {t}
              </span>
            ))}
          </div>
        </Block>
      )}
      {variants.length > 0 && (
        <Block title="Cultural variants">
          <ul className="text-sm space-y-0.5">
            {variants.map((v) => (
              <li key={v.cultureId} className="flex items-baseline gap-2">
                <span className="font-medium">{v.variantName}</span>
                <span className="ml-auto text-xs opacity-50">{cultureName(v.cultureId)}</span>
              </li>
            ))}
          </ul>
        </Block>
      )}
      {usedBy.length > 0 && (
        <Block title="Required by">
          <p className="text-sm opacity-70">{usedBy.join(", ")}</p>
        </Block>
      )}
    </Modal>
  );
}
