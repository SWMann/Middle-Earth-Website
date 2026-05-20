import type { DiscordId, McUuid } from "./common";

export interface RedeemLinkCodeRequest {
  code: string;
  discord_id: DiscordId;
}

export interface RedeemLinkCodeResponse {
  mc_uuid: McUuid;
  mc_username: string;
  linked_at: string;
}
