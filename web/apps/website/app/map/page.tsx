import { ComingSoon } from "@/components/coming-soon";

export default function MapPage() {
  return (
    <ComingSoon title="The Live Map" phase="Phase 2 — Read-Only World">
      <p>
        The flagship visual. Will show region claims, settlements, armies in
        transit, trade routes (faction-scoped), and watchtower sight zones. A
        custom canvas renderer per <code>mod_spec.md §6.4</code>.
      </p>
      <p>
        Phase 1 ships this route stub only. Real markers and base biome layer
        arrive in Phase 2.
      </p>
    </ComingSoon>
  );
}
