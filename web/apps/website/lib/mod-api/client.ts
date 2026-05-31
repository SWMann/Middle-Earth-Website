/**
 * Typed HTTP client for the mod's API.
 *
 * Routes calls to either:
 *   - the real mod HTTP endpoint, when MOD_API_URL is set and MOD_API_MOCK
 *     is not truthy
 *   - the in-process mock in ./mock.ts otherwise
 *
 * The mod doesn't exist yet in Phase 1, so production behaviour here is
 * untested. The mock is what Phase 1 actually exercises.
 */

import type {
  ProblemDetails,
  RedeemLinkCodeRequest,
  RedeemLinkCodeResponse,
  GrantTreasuryRequest,
  GrantTreasuryResponse,
  RecruitUnitsRequest,
  RecruitUnitsResponse,
} from "@modspec/api-types";
import { MockModApiError, mockRedeemLinkCode } from "./mock";

function shouldMock(): boolean {
  if (process.env.MOD_API_MOCK === "1" || process.env.MOD_API_MOCK === "true") return true;
  return !process.env.MOD_API_URL;
}

export class ModApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: ProblemDetails,
  ) {
    super(problem.detail ?? problem.title);
  }
}

export async function redeemLinkCode(
  req: RedeemLinkCodeRequest,
): Promise<RedeemLinkCodeResponse> {
  if (shouldMock()) {
    try {
      return await mockRedeemLinkCode(req);
    } catch (err) {
      if (err instanceof MockModApiError) {
        throw new ModApiError(err.status, {
          title: "Link code rejected",
          status: err.status,
          detail: err.detail,
        });
      }
      throw err;
    }
  }
  return await modPost<RedeemLinkCodeResponse>("/mc-links/redeem", req);
}

/**
 * Admin grant of Coin or DP to a faction. Always goes through the real
 * bridge — the mock doesn't implement this because the point of the
 * action is exercising the cross-process write path.
 */
export async function grantTreasury(
  factionId: string,
  req: GrantTreasuryRequest,
): Promise<GrantTreasuryResponse> {
  if (shouldMock()) {
    throw new ModApiError(503, {
      title: "Bridge mock doesn't implement grantTreasury",
      status: 503,
      detail:
        "Set MOD_API_URL to the running Andúril bridge (e.g. http://localhost:8080) " +
        "and MOD_API_MOCK=0 to use this action.",
    });
  }
  return await modPost<GrantTreasuryResponse>(
    `/admin/factions/${encodeURIComponent(factionId)}/grant`,
    req,
  );
}

/**
 * Recruit units at a settlement. Charges Coin from the settlement's
 * faction treasury and consumes settlement population. Always goes
 * through the real bridge.
 */
export async function recruitUnits(
  settlementId: number,
  req: RecruitUnitsRequest,
): Promise<RecruitUnitsResponse> {
  if (shouldMock()) {
    throw new ModApiError(503, {
      title: "Bridge mock doesn't implement recruitUnits",
      status: 503,
      detail:
        "Set MOD_API_URL to the running Andúril bridge (e.g. http://localhost:8080) " +
        "and MOD_API_MOCK=0 to use this action.",
    });
  }
  return await modPost<RecruitUnitsResponse>(
    `/settlements/${settlementId}/recruitments`,
    req,
  );
}

async function modPost<T>(path: string, body: unknown): Promise<T> {
  const base = process.env.MOD_API_URL;
  const token = process.env.MOD_API_TOKEN;
  if (!base || !token) {
    throw new Error("MOD_API_URL and MOD_API_TOKEN must be set when not using the mock.");
  }
  const res = await fetch(`${base}/api/v1${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Mod-Token": token,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    let problem: ProblemDetails;
    try {
      problem = (await res.json()) as ProblemDetails;
    } catch {
      problem = { title: res.statusText, status: res.status };
    }
    throw new ModApiError(res.status, problem);
  }
  return (await res.json()) as T;
}
