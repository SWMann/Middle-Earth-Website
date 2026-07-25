import { notFound, forbidden } from "next/navigation";
import { safeAuth } from "@/lib/auth-helpers";
import { isAdmin } from "@/lib/data/wiki";
import { getMapState } from "@/lib/data/map";
import { RegionEditor } from "./region-editor";

// Admin-only authoring tool; never statically rendered.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Region Boundaries — Admin",
  description: "Draw polygon boundaries for regions over the canonical world map.",
};

export default async function RegionsAdminPage() {
  const session = await safeAuth();
  if (!isAdmin(session?.user?.discordId)) {
    try {
      forbidden();
    } catch {
      notFound();
    }
  }

  const { regions, settlements } = await getMapState();

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 space-y-6">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">Admin · Regions</p>
        <h1 className="text-3xl font-semibold mb-3">Region boundaries</h1>
        <p className="text-sm opacity-70 max-w-2xl">
          Draw a polygon boundary for each region over the canonical Middle-earth
          map. Saved boundaries replace the fallback circle on the live map.
        </p>
      </header>

      <RegionEditor regions={regions} settlements={settlements} />
    </div>
  );
}
