/**
 * @modspec/api-types
 *
 * Shared TypeScript types for the mod's HTTP API. Both the website and the
 * mod consume this package — the website at compile-time, the mod via type
 * generation or hand-mirroring.
 *
 * Phase 1 surface: only MC-link redemption is wired up. Other endpoints will
 * land here as their respective phases come online.
 */

export * from "./mc-links";
export * from "./common";
