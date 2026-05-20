import Link from "next/link";
import { getSettlement } from "@/lib/data/settlements";

type Props = {
  settlementId: number;
  /** Show the tier alongside the name as a subtle suffix. */
  withTier?: boolean;
};

const TIER_LABELS: Record<string, string> = {
  hamlet: "Hamlet",
  steading: "Steading",
  village: "Village",
  burgh: "Burgh",
  town: "Town",
  city: "City",
  great_city: "Great City",
  capital: "Capital",
};

export async function SettlementTag({ settlementId, withTier }: Props) {
  const s = await getSettlement(settlementId);
  if (!s) {
    return <span className="font-mono text-xs text-stone-500">#{settlementId}</span>;
  }
  return (
    <Link
      href={{ pathname: `/settlements/${s.id}` }}
      className="inline-flex items-baseline gap-1.5 hover:underline"
    >
      <span>{s.name}</span>
      {withTier && (
        <span className="text-xs text-stone-500">
          {TIER_LABELS[s.tier] ?? s.tier}
        </span>
      )}
    </Link>
  );
}
