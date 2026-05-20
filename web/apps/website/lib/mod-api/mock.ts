/**
 * In-process mock of the mod's HTTP API for Phase 1 development.
 *
 * State lives in module-level variables — it does not persist across server
 * restarts and is not safe across multi-worker deployments. Fine for dev,
 * not for prod. The real client should replace this once the mod ships.
 *
 * The only endpoint phased-in here is MC-link code redemption. Future
 * endpoints get added per their respective implementation-plan phases.
 */

import { randomUUID } from "node:crypto";
import type {
  RedeemLinkCodeRequest,
  RedeemLinkCodeResponse,
} from "@modspec/api-types";

interface PendingLink {
  code: string;
  mcUuid: string;
  mcUsername: string;
  issuedAt: Date;
  expiresAt: Date;
}

const CODE_TTL_MS = 15 * 60 * 1000;

const pending = new Map<string, PendingLink>();

/**
 * Dev-only helper. Called by the /link?devSeed=1 path so a developer can
 * exercise the redemption flow without running an actual Minecraft server.
 *
 * Returns the code and the would-be MC username so the dev can read what
 * they're about to redeem.
 */
export function devSeedLinkCode(): PendingLink {
  const code = makeCode();
  const link: PendingLink = {
    code,
    mcUuid: randomUUID(),
    mcUsername: `dev_player_${code.slice(0, 4).toLowerCase()}`,
    issuedAt: new Date(),
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  };
  pending.set(code, link);
  return link;
}

export class MockModApiError extends Error {
  constructor(public readonly status: number, public readonly detail: string) {
    super(detail);
  }
}

export async function mockRedeemLinkCode(
  req: RedeemLinkCodeRequest,
): Promise<RedeemLinkCodeResponse> {
  const link = pending.get(req.code.toUpperCase());
  if (!link) {
    throw new MockModApiError(404, "Unknown or expired link code.");
  }
  if (link.expiresAt < new Date()) {
    pending.delete(link.code);
    throw new MockModApiError(410, "Link code has expired.");
  }
  pending.delete(link.code);
  return {
    mc_uuid: link.mcUuid,
    mc_username: link.mcUsername,
    linked_at: new Date().toISOString(),
  };
}

function makeCode(): string {
  // 6-char base32-ish code: unambiguous alphabet, easy to type in MC chat.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
