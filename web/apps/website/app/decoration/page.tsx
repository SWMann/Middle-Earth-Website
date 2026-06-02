import Link from "next/link";
import {
  getDecorationCriteria,
  getTierDecorationThresholds,
} from "@/lib/data/catalogue";

export const revalidate = 600;

export const metadata = {
  title: "Decoration scoring — Middle-earth",
  description:
    "How a plot's build quality is graded into a 0–100 decoration score, and the threshold each settlement tier must clear.",
};

const TIER_ORDER = [
  "hamlet",
  "steading",
  "village",
  "burgh",
  "town",
  "city",
  "great_city",
  "capital",
];

const REVIEW_LABEL: Record<string, string> = {
  light: "Auto-scored",
  spot: "Auto-scored + spot review",
  full: "Staff review required",
};

const REVIEW_BLURB: Record<string, string> = {
  light:
    "The score is computed automatically from the plot scan. No staff time needed.",
  spot:
    "Auto-scored, with a fraction of plots pulled for a staff sanity-check.",
  full:
    "A builder or admin signs off before the district is accepted, no matter the auto-score.",
};

function prettyTier(s: string): string {
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function DecorationPage() {
  const [criteria, thresholds] = await Promise.all([
    getDecorationCriteria(),
    getTierDecorationThresholds(),
  ]);

  const totalWeight = criteria.reduce((s, c) => s + (c.weightPct ?? 0), 0);

  const thresholdByTier = new Map(thresholds.map((t) => [t.tier, t]));
  const orderedTiers = [
    ...TIER_ORDER.filter((t) => thresholdByTier.has(t)),
    ...thresholds.map((t) => t.tier).filter((t) => !TIER_ORDER.includes(t)),
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 space-y-12">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
          Catalogue
        </p>
        <h1 className="text-3xl font-semibold">Decoration scoring</h1>
        <p className="mt-3 text-sm opacity-70 max-w-2xl">
          Meeting a district&apos;s component spec makes it{" "}
          <em>functional</em>; it does not make it <em>finished</em>. Every plot
          is also graded for build quality on a 0–100 scale. Larger and more
          prestigious settlements demand a higher score before a district is
          accepted — a capital cannot be a field of dirt huts that merely happen
          to contain the right beds and forges.
        </p>
      </header>

      {/* ----- Criteria ----- */}
      <section>
        <h2 className="text-lg font-semibold mb-1">How the score is built</h2>
        <p className="text-xs opacity-60 mb-4 max-w-2xl">
          Each criterion is scored 0–100 from the plot scan, then weighted and
          summed. The weights total {totalWeight}%.
        </p>
        <ul className="space-y-3">
          {criteria.map((c) => (
            <li
              key={c.id}
              className="flex items-start gap-4 border-b border-stone-100 dark:border-stone-900 pb-3"
            >
              <div className="w-12 shrink-0 text-right">
                <span className="text-lg font-semibold tabular-nums">
                  {c.weightPct}%
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-medium">{c.displayName}</p>
                {c.description && (
                  <p className="text-sm opacity-70 mt-0.5">{c.description}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
        {/* weight bar */}
        <div className="mt-4 flex h-2 w-full overflow-hidden rounded">
          {criteria.map((c, i) => (
            <div
              key={c.id}
              className={
                i % 2 === 0
                  ? "bg-stone-400 dark:bg-stone-500"
                  : "bg-stone-300 dark:bg-stone-700"
              }
              style={{ width: `${c.weightPct}%` }}
              title={`${c.displayName} — ${c.weightPct}%`}
            />
          ))}
        </div>
      </section>

      {/* ----- Tier thresholds ----- */}
      <section>
        <h2 className="text-lg font-semibold mb-1">Thresholds by settlement tier</h2>
        <p className="text-xs opacity-60 mb-4 max-w-2xl">
          The minimum decoration score a district must reach to be accepted,
          and how it is reviewed. Individual district types may set their own
          higher bar on top of the tier minimum.
        </p>
        <div className="overflow-hidden rounded border border-stone-200 dark:border-stone-800">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 dark:bg-stone-900/50 text-xs uppercase tracking-widest opacity-60">
              <tr>
                <th className="text-left font-normal px-4 py-2">Tier</th>
                <th className="text-right font-normal px-4 py-2">Min score</th>
                <th className="text-left font-normal px-4 py-2">Review</th>
              </tr>
            </thead>
            <tbody>
              {orderedTiers.map((tier) => {
                const t = thresholdByTier.get(tier)!;
                return (
                  <tr
                    key={tier}
                    className="border-t border-stone-100 dark:border-stone-900"
                  >
                    <td className="px-4 py-2.5 font-medium">
                      {prettyTier(tier)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {t.minScore != null ? (
                        <span className="font-semibold">{t.minScore}</span>
                      ) : (
                        <span className="opacity-50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className="font-medium"
                        title={REVIEW_BLURB[t.reviewMode] ?? ""}
                      >
                        {REVIEW_LABEL[t.reviewMode] ?? t.reviewMode}
                      </span>
                      {t.note && (
                        <span className="block text-xs opacity-60 mt-0.5">
                          {t.note}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <dl className="mt-4 space-y-1.5 text-xs opacity-70">
          {Object.entries(REVIEW_LABEL).map(([k, label]) => (
            <div key={k} className="flex gap-2">
              <dt className="font-medium w-44 shrink-0">{label}</dt>
              <dd>{REVIEW_BLURB[k]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="text-xs opacity-60 border-t border-stone-200 dark:border-stone-800 pt-4">
        See also:{" "}
        <Link href={{ pathname: "/buildings" }} className="underline">
          Buildings
        </Link>{" "}
        ·{" "}
        <Link href={{ pathname: "/districts" }} className="underline">
          Districts
        </Link>
      </footer>
    </div>
  );
}
