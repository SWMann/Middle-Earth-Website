import Link from "next/link";
import { ComingSoon } from "@/components/coming-soon";

export default function AdminPage() {
  return (
    <ComingSoon title="Admin Console" phase="Phase 6 — Admin &amp; Operations">
      <p>
        Staff-only. Will host the build-review queue, audit log search,
        faction admin views, config editor, and player management.
      </p>
      <p>
        Available now:{" "}
        <Link href={{ pathname: "/admin/planner" }} className="underline">
          Settlement Planner
        </Link>{" "}
        — plan a settlement for any faction and tier and preview its economy
        and systems live.
      </p>
      <p>
        <Link href={{ pathname: "/admin/reviews" }} className="underline">
          Build Reviews
        </Link>{" "}
        — approve or reject in-game builds the Andúril scanner flagged for a
        human look.
      </p>
      <p>
        <Link href={{ pathname: "/admin/floorplan" }} className="underline">
          Plot Floorplanner
        </Link>{" "}
        — sketch a plot&apos;s footprint and buildings on a grid mapped to world
        block coordinates, then save it for scanning.
      </p>
    </ComingSoon>
  );
}
