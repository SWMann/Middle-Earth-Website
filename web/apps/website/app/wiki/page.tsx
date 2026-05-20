import { ComingSoon } from "@/components/coming-soon";

export default function WikiPage() {
  return (
    <ComingSoon title="Lore &amp; Mechanics Wiki" phase="Phase 2 — Read-Only World">
      <p>
        Markdown-authored pages stored in <code>web.wiki_pages</code>. Lore is
        partly hand-authored by faction players, mechanics pages are
        admin-only. Phase 1 has the table but no content yet.
      </p>
    </ComingSoon>
  );
}
