import { getMapState } from "@/lib/data/map";
import { TerrainMap } from "@/components/terrain-map";

export const revalidate = 30;

export const metadata = {
  title: "Map — Middle-earth",
  description: "The live world map: real terrain, region claims, settlements.",
};

/** The dimension the campaign world lives in (datapack dimension). */
const DEFAULT_DIM = "me:middle_earth";

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ dim?: string }>;
}) {
  const { regions, settlements } = await getMapState();
  const { dim } = await searchParams;
  const safeDim = dim && /^[a-z0-9_]+:[a-z0-9_]+$/.test(dim) ? dim : DEFAULT_DIM;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 space-y-6">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
          The world
        </p>
        <h1 className="text-3xl font-semibold mb-3">Live map</h1>
        <p className="text-sm opacity-70 max-w-2xl">
          The actual blocks of the world, rendered live from the server —
          north is up, east is right — with claims and settlements overlaid.
          Drag to pan, +/− to zoom.
        </p>
      </header>

      <TerrainMap regions={regions} settlements={settlements} dim={safeDim} />
    </div>
  );
}
