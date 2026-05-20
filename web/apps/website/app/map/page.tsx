import { getMapState } from "@/lib/data/map";
import { WorldMap } from "@/components/world-map";

export const revalidate = 30;

export const metadata = {
  title: "Map — Middle-earth",
  description: "The world map: region claims and settlements.",
};

export default async function MapPage() {
  const { regions, settlements } = await getMapState();

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 space-y-6">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
          The world
        </p>
        <h1 className="text-3xl font-semibold mb-3">Live map</h1>
        <p className="text-sm opacity-70 max-w-2xl">
          Claims, capitals, holdings. North is up, east is right. Region codes
          are shown in monospace above each claim.
        </p>
      </header>

      <WorldMap regions={regions} settlements={settlements} />
    </div>
  );
}
