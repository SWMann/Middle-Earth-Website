export const MOD_API_VERSION = "v1" as const;

export type DiscordId = string;
export type McUuid = string;

export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}
