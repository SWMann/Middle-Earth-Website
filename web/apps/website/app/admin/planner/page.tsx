import { notFound, forbidden } from "next/navigation";
import { safeAuth } from "@/lib/auth-helpers";
import { isAdmin } from "@/lib/data/wiki";
import { getPlannerCatalogue } from "@/lib/data/planner";
import { SettlementPlanner } from "./settlement-planner";

// Admin-only balancing tool; never statically rendered.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settlement Planner — Admin",
  description: "Plan settlements and preview their economy and systems.",
};

export default async function PlannerPage() {
  const session = await safeAuth();
  if (!isAdmin(session?.user?.discordId)) {
    try {
      forbidden();
    } catch {
      notFound();
    }
  }

  const catalogue = await getPlannerCatalogue();
  return <SettlementPlanner catalogue={catalogue} />;
}
