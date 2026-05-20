import type { Event } from "@/lib/db/schema/audit";
import { FactionTag } from "@/components/tags/faction-tag";
import { RegionTag } from "@/components/tags/region-tag";

type Props = {
  events: Event[];
  /** Fallback to show when there are no events. */
  empty?: React.ReactNode;
};

/**
 * Stream renderer for audit events. Per web_spec.md §2.7.
 *
 * Each event is dispatched to a small per-type formatter; the formatter
 * embeds the appropriate tag components (FactionTag, RegionTag, etc.)
 * inline. Unknown event types render as a neutral fallback rather than
 * crashing — the audit log is forward-compatible by design.
 */
export function AuditFeed({ events, empty }: Props) {
  if (events.length === 0) {
    return (
      <div className="text-sm text-stone-500 italic">
        {empty ?? "Nothing has happened yet."}
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {events.map((e) => (
        <AuditFeedItem key={e.id} event={e} />
      ))}
    </ul>
  );
}

async function AuditFeedItem({ event: e }: { event: Event }) {
  return (
    <li className="text-sm">
      <div className="flex items-baseline gap-2">
        <time
          className="font-mono text-xs text-stone-500 shrink-0"
          dateTime={e.occurredAt.toISOString()}
          title={e.occurredAt.toISOString()}
        >
          {formatRelativeTime(e.occurredAt)}
        </time>
        <div>{await renderEventBody(e)}</div>
      </div>
    </li>
  );
}

async function renderEventBody(e: Event): Promise<React.ReactNode> {
  const p = e.payload;
  switch (e.eventType) {
    case "FACTION_FOUNDED":
      return (
        <span>
          {e.factionId ? <FactionTag factionId={e.factionId} /> : "A faction"} was founded.
        </span>
      );

    case "REGION_CLAIMED":
      return (
        <span>
          {e.factionId && <FactionTag factionId={e.factionId} />} claimed{" "}
          {typeof p.region_id === "string" && <RegionTag regionId={p.region_id} />}{" "}
          {typeof p.dp_cost === "number" && (
            <span className="text-stone-500">— {p.dp_cost} DP</span>
          )}
        </span>
      );

    case "SETTLEMENT_FOUNDED":
      return (
        <span>
          {e.factionId && <FactionTag factionId={e.factionId} />} founded{" "}
          <strong>{typeof p.settlement_name === "string" ? p.settlement_name : "a settlement"}</strong>
          {typeof p.tier === "string" && (
            <span className="text-stone-500"> ({p.tier})</span>
          )}
          {typeof p.region_id === "string" && (
            <>
              {" in "}
              <RegionTag regionId={p.region_id} idOnly />
            </>
          )}
          .
        </span>
      );

    case "TRADE_DEAL":
      return (
        <span>
          {e.factionId && <FactionTag factionId={e.factionId} />} opened a trade deal with{" "}
          {typeof p.with === "string" && <FactionTag factionId={p.with} />}.
        </span>
      );

    case "COUNCIL_HELD":
      return (
        <span>
          {e.factionId && <FactionTag factionId={e.factionId} />} convened a council
          {typeof p.topic === "string" && <>: <em>{p.topic}</em></>}
          {typeof p.weight === "number" && (
            <span className="text-stone-500"> (weight {p.weight})</span>
          )}
          .
        </span>
      );

    case "WAR_DECLARED":
      return (
        <span className="text-red-700 dark:text-red-400">
          {e.factionId && <FactionTag factionId={e.factionId} />} declared war on{" "}
          {typeof p.against === "string" && <FactionTag factionId={p.against} />}
          {typeof p.casus_belli === "string" && (
            <span className="text-stone-500"> — “{p.casus_belli}”</span>
          )}
          .
        </span>
      );

    case "DIPLOMATIC_ACTION":
      return (
        <span>
          {e.factionId && <FactionTag factionId={e.factionId} />}{" "}
          {typeof p.action === "string"
            ? p.action.replaceAll("_", " ")
            : "took a diplomatic action"}
          {typeof p.with === "string" && (
            <>
              {" with "}
              <FactionTag factionId={p.with} />
            </>
          )}
          .
        </span>
      );

    default:
      return (
        <span className="text-stone-500">
          <code>{e.eventType}</code>
          {e.factionId && (
            <>
              {" — "}
              <FactionTag factionId={e.factionId} />
            </>
          )}
        </span>
      );
  }
}

function formatRelativeTime(d: Date): string {
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return d.toLocaleDateString();
}
