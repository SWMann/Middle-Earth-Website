# Account linking — deploy runbook

This closes the Minecraft ↔ Discord account-linking loop that the website's
Phase 1 mock stood in for. It has two halves, both now real:

1. **In-game** — a player runs `/anduril link` and receives a short, single-use
   code (e.g. `K7PQR2`), valid for 15 minutes.
2. **On the website** — signed in with Discord, they enter that code on the
   Link page. The site calls the bridge's `POST /api/v1/mc-links/redeem`, which
   validates and consumes the code and returns the player's UUID + username;
   the website then writes the `web.mc_links` row.

No website code changed — it already spoke this contract to the mock. All the
new behaviour is in the bridge (`/anduril link` command + redeem endpoint) plus
one new table.

## 1. One-time database setup

The bridge issues and consumes codes in a new bridge-private table,
`web.mc_link_codes`. The website never reads it. Create it once against the
same Postgres (Neon) the bridge and website share.

Preferred (from `web/apps/website`, uses the Drizzle schema as source of truth):

```bash
pnpm --filter @middle-earth/website run db:push
```

Or apply the DDL directly with `psql`:

```sql
CREATE TABLE IF NOT EXISTS web.mc_link_codes (
    code         text PRIMARY KEY,
    mc_uuid      uuid NOT NULL,
    mc_username  text NOT NULL,
    issued_at    timestamptz NOT NULL DEFAULT now(),
    expires_at   timestamptz NOT NULL
);
```

If the bridge connects with a restricted role (rather than the DB owner), grant
it access to the new table:

```sql
GRANT INSERT, SELECT, DELETE ON web.mc_link_codes TO <bridge_role>;
```

## 2. Environment variables

**Bridge** (the Minecraft server process):

| Var | Purpose |
|---|---|
| `DATABASE_URL` | `postgres://…` — same database as the website. Already required. |
| `ANDURIL_TOKEN` | Shared secret; the website sends it as `X-Mod-Token`. Already required. |
| `ANDURIL_PORT` | HTTP API port (default `8080`). Already optional. |

**Website** (Vercel) — so redeem hits the real bridge instead of the mock:

| Var | Value |
|---|---|
| `MOD_API_URL` | Public base URL of the bridge, e.g. `https://mc.example.com:8080` |
| `MOD_API_TOKEN` | Same value as the bridge's `ANDURIL_TOKEN` |
| `MOD_API_MOCK` | `0` (or unset) — any truthy value forces the mock |

Note: with `MOD_API_URL` unset, the website silently stays on the mock and
`/anduril link` codes will not redeem. Setting these three is what flips the
switch to production.

## 3. Build and deploy the bridge

```bash
cd bridge
./gradlew build          # produces build/libs/anduril-<version>.jar
# copy the jar into the server's mods/ folder (alongside the upstream `me` mod)
# then restart the server
```

On startup the log should show:

```
Andúril link command handler ready.
Andúril HTTP API listening on 0.0.0.0:8080
```

## 4. End-to-end test

1. In-game: `/anduril link` → you get a gold code in chat.
2. Website: sign in with Discord → **Link** page → enter the code → expect
   "linked as `<username>`".
3. Re-entering the same code should now fail with **410 / "Link code has
   expired."** (single-use — it was consumed). An unknown code returns
   **404 / "Unknown or expired link code."**
4. A code left unused for 15 minutes should also return 410.

## Verification status at time of writing

- **Website** (`web`): `pnpm typecheck` passes. No website code changed; the
  schema gained `web.mc_link_codes`.
- **Bridge** (`bridge`): written against the existing endpoint/command/JDBC
  patterns; Minecraft/Yarn API calls cross-checked against the upstream mod.
  It was **not** compiled in the authoring environment because the Fabric-Loom
  toolchain could not be fetched there — run `./gradlew build` on a machine
  with network access to `maven.fabricmc.net` as the first deploy step.
