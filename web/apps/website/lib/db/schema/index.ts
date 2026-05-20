/**
 * Single entrypoint for the project's Drizzle schema.
 *
 * Three namespaces, organised by ownership:
 *
 *   - `web.*`   — owned by the website (auth, accounts, links, wiki)
 *   - `game.*`  — owned by the mod (read-only from website)
 *   - `audit.*` — append-only, owned by the mod
 *
 * Importers should reach for table objects via `schema.accounts`,
 * `schema.factions`, `schema.events`, etc. — flat namespace, conflict-free.
 */

export * from "./web";
export * from "./game";
export * from "./audit";
