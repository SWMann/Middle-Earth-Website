import { notFound, forbidden } from "next/navigation";
import { safeAuth } from "@/lib/auth-helpers";
import { isAdmin } from "@/lib/data/wiki";
import { getFloorplanCatalogue } from "@/lib/data/floorplan";
import { listDimensions } from "@/lib/mod-api/client";
import { FloorplanEditor } from "./floorplan-editor";

// Admin-only authoring tool; never statically rendered.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Plot Floorplanner — Admin",
  description: "Author a plot's footprint, buildings, and image↔block transform.",
};

export default async function FloorplanPage() {
  const session = await safeAuth();
  if (!isAdmin(session?.user?.discordId)) {
    try {
      forbidden();
    } catch {
      notFound();
    }
  }

  const [catalogue, dimensions] = await Promise.all([
    getFloorplanCatalogue(),
    listDimensions(),
  ]);
  // Fall back to a sensible default when the bridge is offline/mocked.
  const dims = dimensions.length > 0 ? dimensions : ["minecraft:overworld"];
  return <FloorplanEditor catalogue={catalogue} dimensions={dims} />;
}
