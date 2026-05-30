# Changelog

Notable changes to the Middle-earth modded server project, grouped by the
implementation plan's phase structure. Each entry lists the commits that
delivered it. Commit hashes are stable; phase boundaries are working
checkpoints, not version tags.

## Phase 3 — Player Dashboards (Read-Only)

The website now reflects living game state. Characters, districts, units,
and resource stocks are in Neon; a tick simulator advances the world; and
both the player home and faction-internal dashboards render the result.

- **Schema expansion** ([9a8b165]): `game.characters`,
  `game.districts`, `game.units`, `game.armies`, `game.resource_stocks`.
  Characters cross-reference `web.accounts.discord_id` (stored as TEXT
  for snowflake-safe JSON).
- **Seed expansion** ([9a8b165]): 14 canonical characters (Faramir,
  Éomer, Thorin Stonehelm, Bard II, Haldir, Elrohir, Meriadoc Brandybuck,
  Suladân the Younger, etc.), 48 districts (4 per capital), 14 unit
  stacks, 20 resource stockpiles, realistic per-faction treasuries.
- **`/characters/[id]`** ([9a8b165]): age, race, title, Inf, Wnd with
  human descriptor (Hale / Scarred / Battered / Broken / Walking
  wounded / Death's threshold), biography, faction events.
- **Faction pages** ([9a8b165]): leader resolved to highest-influence
  character; Notable members section added.
- **Settlement pages** ([9a8b165]): real Districts grid + Garrison
  panel replacing the placeholders.
- **`/dashboard`** ([8b0add2]): player home with character header,
  quick stats (treasury / Inf / Wnd), faction settlements list, action
  queue placeholder, recent faction events. Empty state for users
  without a character.
- **Tick simulator** ([9a601f1]): `pnpm db:tick` advances the world
  one day; `--days N` advances more. Treasury accrues per settlement,
  population grows toward cap, resources stockpile, DAILY_TICK audit
  event lands per faction.
- **`/factions/[id]/dashboard`** ([dafc318]): faction-internal command
  panel. Member-gated; non-members redirect to the public page; admins
  bypass with a labelled view. Treasury card shows last-tick delta;
  military, settlements, resources, subfactions, members, audit feed.
- **Notifications bell + `/characters` index + polish** (this commit):
  bell-icon dropdown in the nav with unread count from
  `lastNotificationsViewedAt`; /characters index grouped by faction;
  stale phase labels cleaned up.

[9a8b165]: https://github.com/SWMann/Middle-Earth-Website/commit/9a8b165
[8b0add2]: https://github.com/SWMann/Middle-Earth-Website/commit/8b0add2
[9a601f1]: https://github.com/SWMann/Middle-Earth-Website/commit/9a601f1
[dafc318]: https://github.com/SWMann/Middle-Earth-Website/commit/dafc318

### Known Phase 3 limitations

These are deliberate, not bugs.

- Districts and units are seeded but not yet *produced* through gameplay —
  Phase 5 introduces those writes.
- Armies are schema-only. Mobilisation and movement land with combat.
- `/dashboard` action queue is a placeholder. Real items (build plan
  reviews, council invites) come with the corresponding writes.
- Faction-scoped map layers (your trade routes, your watchtower sight
  zones) are not in `/map` yet — the schema for trade routes and
  watchtowers comes later.
- Character creation through the website is Phase 5. For now, faction
  officers / admins assign players to characters via SQL or admin tools.

---

## Phase 2 — Read-Only World

A coherent public-facing site backed by Neon. Anonymous viewers can
browse factions, settlements, the live map, and the wiki without ever
hitting a 404 or placeholder.

- **Game schema + seed** ([5c26f4a]): `game.factions` (12 canonical
  majors + 2 subfactions, banner colours, lore summaries), `game.regions`
  (20 regions placed in roughly correct Tolkien-map positions),
  `game.region_claims`, `game.settlements` (15 capitals), `audit.events`
  (7 starter events). Schema-split (web / game / audit) keeps ownership
  boundaries explicit.
- **Tag components + AuditFeed** ([5c26f4a]): `<FactionTag>` with
  banner-colour swatch, `<RegionTag>` with biome+claim tooltip,
  `<SettlementTag>` with tier, `<AuditFeed>` with per-event-type
  formatters embedding the tags inline.
- **Landing page** ([5c26f4a]): real stat line (faction count,
  settlement count, active wars, RP year), faction roster preview,
  recent events feed.
- **`/factions` index + `/factions/[id]`** ([5c26f4a]): grid of all 14
  faction cards; detail page with claimed regions, settlements,
  subfaction holdings, faction-scoped audit feed.
- **`/settlements/[id]`** ([e660d8f]): header, population stats,
  founding date, sibling settlements, faction events.
- **`/map`** ([e660d8f]): SVG-based live map. Region circles
  banner-coloured by claiming faction, settlement squares sized by tier,
  North-up + East-right orientation, hover highlight, click-to-pin,
  detail panel with links into faction and settlement pages.
- **Wiki infrastructure** ([12b01a2]): `/wiki` index grouped by
  category, `/wiki/[slug]` with Markdown rendering, admin-only editor
  with `ADMIN_DISCORD_IDS` env-list gating, three seed pages.
- **/recruit, /about, /rules** ([9a2b028]): closes the public surface.
- **Polish bundle** ([77ee844]): real footer with navigation,
  subfaction holdings on parent faction pages, audit feed surfaces
  events *touching* a faction (not just where it acts), global search
  bar in nav using Postgres full-text.
- **Deploy** ([affada3], [6d3fe65]): pushed to GitHub, Vercel
  auto-deploys on push. Build settings cleaned up for the pnpm
  workspace layout.

[5c26f4a]: https://github.com/SWMann/Middle-Earth-Website/commit/5c26f4a
[e660d8f]: https://github.com/SWMann/Middle-Earth-Website/commit/e660d8f
[12b01a2]: https://github.com/SWMann/Middle-Earth-Website/commit/12b01a2
[9a2b028]: https://github.com/SWMann/Middle-Earth-Website/commit/9a2b028
[77ee844]: https://github.com/SWMann/Middle-Earth-Website/commit/77ee844
[affada3]: https://github.com/SWMann/Middle-Earth-Website/commit/affada3
[6d3fe65]: https://github.com/SWMann/Middle-Earth-Website/commit/6d3fe65

---

## Phase 1 — Foundation

Auth, identity, and the scaffold the rest of the project sits on. No
gameplay yet; just the bones.

- **Workspace + Next.js scaffold** ([032af14]): `web/` pnpm workspace
  with `apps/website` (Next 15 App Router, TypeScript everywhere) and
  `packages/api-types` (shared mod-API type contracts). Tailwind v4
  beta, ESLint, Drizzle, Auth.js v5.
- **`web.*` schema** ([032af14]): `accounts`, `mc_links`, `sessions`,
  `notification_state`, `wiki_pages`. Discord IDs stored as TEXT.
- **Auth.js v5 with Discord OAuth** ([032af14]): JWT sessions, custom
  `safeAuth()` wrapper that returns null instead of throwing on stale
  cookies. JWT augmented with `discordId` and `discordUsername`.
- **Minecraft account linking** ([032af14]): one-time code flow with an
  in-process mock of the mod API so it works end-to-end with no Java
  yet. Real flow lands when the mod is built.
- **Layout + stub pages** ([032af14]): shared header / footer, theme
  toggle, stub pages for every route Phase 2+ would later fill in.
- **CI** ([032af14]): GitHub Actions workflow runs typecheck + lint on
  PRs touching `web/**`.

The Phase 1 success criterion ("a Discord account can sign in, link a
Minecraft username, and see 'signed in as X', all in production") was
met against a Neon dev database before Phase 2 began.

[032af14]: https://github.com/SWMann/Middle-Earth-Website/commit/032af14

---

## Project bootstrap (pre-Phase 1)

The repo started as the **Middle-earth Mod (Fabric)** Java/Gradle
scaffold from upstream. The `web/` workspace was added on top of that
without modifying the mod source. The mod itself has not been built
out yet — it's the next major undertaking after the read-only web is
sustainable.

---

*This file follows the spirit of [Keep a Changelog](https://keepachangelog.com/)
but is grouped by phase rather than semver — useful at this stage because
the website is on a single rolling main branch and the meaningful
boundaries are the implementation plan's phases.*
