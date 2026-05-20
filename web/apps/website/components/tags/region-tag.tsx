import { getRegion, getRegionClaim } from "@/lib/data/regions";
import { getFaction } from "@/lib/data/factions";

type Props = {
  regionId: string;
  /** Show the bare ID without the display name (e.g. inside dense tables). */
  idOnly?: boolean;
};

/**
 * Renders a region by ID with hover-tooltip showing biome and current
 * claim status. Per web_spec.md §2.2. Phase 2: no link target yet —
 * /regions/[id] is a v1.x page. We pass through to the map filtered by
 * region as a hover hint instead.
 */
export async function RegionTag({ regionId, idOnly }: Props) {
  const r = await getRegion(regionId);
  if (!r) {
    return <span className="font-mono text-xs text-stone-500">{regionId}</span>;
  }
  const claim = await getRegionClaim(regionId);
  const claimingFaction = claim ? await getFaction(claim.factionId) : null;
  const title = [
    r.biome.charAt(0).toUpperCase() + r.biome.slice(1),
    claimingFaction ? `claimed by ${claimingFaction.displayName}` : "unclaimed",
  ].join(" · ");

  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={title}
    >
      <span className="font-mono text-xs text-stone-500">{r.id}</span>
      {!idOnly && <span>{r.displayName}</span>}
    </span>
  );
}
