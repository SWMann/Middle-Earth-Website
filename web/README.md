# middle-earth-web

The website portion of the Middle-earth modded-server stack. A pnpm monorepo containing the Next.js website and a shared API-types package.

This is **Phase 1** of the implementation plan: foundation only. No game data, no live map, no floorplanner. What works is authentication via Discord, the Minecraft-link flow against an in-process mock of the mod API, and a deployable Next.js skeleton with stub pages for every top-level route.

## Layout

```
web/
  apps/
    website/          Next.js 15 App Router app (@middle-earth/website)
  packages/
    api-types/        Shared TS contract with the mod's HTTP API (@modspec/api-types)
```

## Setup

Requires Node 20+ and pnpm 9+.

```bash
cd web
pnpm install

# Copy and fill in env vars
cp apps/website/.env.example apps/website/.env.local

# Create the web.* schema in your Postgres
pnpm --filter @middle-earth/website run db:push

# Run dev
pnpm dev
```

The site will be at <http://localhost:3000>.

## Environment

`apps/website/.env.example` documents every required variable. For Phase 1 the relevant ones are:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection. Neon or local Postgres. |
| `AUTH_SECRET` | NextAuth signing secret. Generate with `openssl rand -base64 32`. |
| `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` | Discord OAuth credentials. Create an app at <https://discord.com/developers/applications>. |
| `MOD_API_URL` | The mod's HTTP API base URL. Unset/empty → mock is used. |
| `MOD_API_TOKEN` | `X-Mod-Token` bearer for the mod API. |
| `MOD_API_MOCK` | `1` to force the in-process mock even when `MOD_API_URL` is set. |

## Mod API mock

The mod doesn't exist yet, so all calls go through an in-process mock at `apps/website/lib/mod-api/mock.ts`. The mock stores state in module-level variables — fine for dev, will not survive a restart. Replace with the real client by setting `MOD_API_URL` and unsetting `MOD_API_MOCK`.

For the MC-link flow, the mock exposes a dev-only seeder. When mocked, visiting `/link?devSeed=1` issues a fresh code/UUID pair that you can redeem in the form — saves running a real Minecraft server during Phase 1.

## Scripts

- `pnpm dev` — run the website
- `pnpm build` — build all packages
- `pnpm typecheck` — type-check all packages
- `pnpm lint` — lint all packages
- `pnpm --filter @middle-earth/website run db:push` — push the Drizzle schema to Postgres
- `pnpm --filter @middle-earth/website run db:studio` — open Drizzle Studio

## What this phase does not include

Per `web_implementation_plan.md` §3 (Phase 1):

- Game data (no factions, settlements, map)
- Mod-side writes (the mod API is mocked)
- Live map component (route stub only)
- Faction/dashboard/admin content (route stubs only)
- Floorplanner (Phase 4)
