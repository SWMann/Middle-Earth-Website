import { ComingSoon } from "@/components/coming-soon";

export default function AdminPage() {
  return (
    <ComingSoon title="Admin Console" phase="Phase 6 — Admin &amp; Operations">
      <p>
        Staff-only. Will host the build-review queue, audit log search,
        faction admin views, config editor, and player management.
      </p>
      <p>
        Phase 1 ships the route stub only. No staff role check is enforced
        yet beyond authentication; the role model lands when the admin
        console comes online.
      </p>
    </ComingSoon>
  );
}
