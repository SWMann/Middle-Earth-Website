import Link from "next/link";
import { getFaction } from "@/lib/data/factions";

type Props = {
  factionId: string;
  /** Hide the colour swatch (useful when the tag is used in dense lists). */
  noSwatch?: boolean;
};

/**
 * Renders a faction by ID with its banner colour and a link to the
 * faction overview page. Public — visible on every screen where a faction
 * is referenced. Per web_spec.md §2.3.
 */
export async function FactionTag({ factionId, noSwatch }: Props) {
  const f = await getFaction(factionId);
  if (!f) {
    return <span className="font-mono text-xs text-stone-500">{factionId}</span>;
  }
  return (
    <Link
      href={{ pathname: `/factions/${f.id}` }}
      className="inline-flex items-center gap-1.5 hover:underline"
    >
      {!noSwatch && f.bannerHex && (
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 rounded-sm border border-stone-300 dark:border-stone-700"
          style={{ backgroundColor: f.bannerHex }}
        />
      )}
      <span>{f.displayName}</span>
    </Link>
  );
}
