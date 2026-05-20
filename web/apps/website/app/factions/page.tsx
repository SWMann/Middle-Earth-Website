import { ComingSoon } from "@/components/coming-soon";

export default function FactionsIndexPage() {
  return (
    <ComingSoon title="Factions" phase="Phase 2 — Read-Only World">
      <p>
        Major factions (Gondor, Rohan, Mordor, Isengard, Lothlórien, Erebor,
        Dale, Rivendell, the Shire) and player-founded minor factions. Each
        has a public overview and a faction-scoped internal dashboard.
      </p>
      <p>
        Phase 1 ships the route stub only. The faction model lands in Phase 2
        once <code>game.factions</code> is wired up by the mod.
      </p>
    </ComingSoon>
  );
}
