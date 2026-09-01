# Changelog

Notable changes to the Middle-earth modded server project, newest first.
Early sections follow the implementation plan's phase numbering; later
ones are grouped by the body of work they delivered, since the plan's
numbering stopped tracking what was actually built. Each entry lists the
commits that delivered it. Commit hashes are stable; section boundaries
are working checkpoints, not version tags.

## Minecraft 1.21.8 + the canonical world map

Branch `upgrade/mc-1.21.8`. Two threads: re-vendoring upstream at its
1.21.8 release and porting Andúril onto it, then replacing the live
block-tile map with the mod's own canonical world-gen imagery. The
sub-phase labels below are the ones used in the commit subjects — they
number the map work, not the project plan.

- **Re-vendor upstream at `1.0.0-1.21.8-beta`** ([f2b3631]): the
  upstream project is now a three-module monorepo (`sevenstars-api`,
  `middle-earth`, `of-beasts-and-wild-things`) under the
  `net.sevenstars` group, and its mod ID moved from `me` to
  `middle-earth`. Registry aliases keep old `me:` ids resolving.
- **Port bridge + website to 1.21.8** ([bee242a]): Loom, mappings, and
  loader bumped on the bridge; the website's dimension defaults follow
  the renamed `middle-earth:` namespace.
- **Link code is click-to-copy** ([78847ac]): the `/anduril link` chat
  reply now copies the code on click instead of asking players to
  transcribe it.
- **Dimension regex fix** ([5ebe6af]): the map's dimension validator
  rejected the hyphen in `middle-earth:`, so every tile request against
  the build world 400'd. Widened on both the bridge and the web proxy.
- **Map opens on Minas Tirith** ([7992379]): `/map` takes an initial
  centre + zoom rather than dropping the viewer at world origin.
- **Phase 1 — canonical world-gen imagery** ([86bf0b6]): the map now
  renders the Middle-earth mod's own biome/height tile pyramid, so it
  shows all of Middle-earth regardless of what has actually been
  generated in-game. `WorldMapStore` extracts the pyramid from the
  Middle-earth jar once on startup (background thread) into
  `run/anduril-worldmap` and serves it read-only; the transform comes
  from the mod's `MiddleEarthMapConfigs` (3000px tiles, levels 0–3,
  96000-block square world, origin top-left, `32/2^level` blocks per
  pixel). New `GET /api/v1/worldmap/tile` + `/worldmap/meta` on the
  bridge, an `/api/worldmap/tile` proxy on the web side that adds the
  mod token server-side, and a `baseLayer` prop on `TerrainMap` so
  worldgen and live block tiles share one projection, overlay, and
  pan-zoom. The live block tiles stay — the floorplanner needs real
  blocks for build alignment.
- **Tile aspect fix** ([6556ba6]): the framework's `img { max-width:
  100% }` crushed the 3000px world-gen tiles horizontally and distorted
  the projection. Positioned tiles opt out with `max-width: none`.
- **Phase 2a — authored region boundaries** ([7704051]): `game.regions`
  gains an optional `boundary` jsonb column, an ordered ring of `[x, z]`
  world coordinates. The map draws it as a claim-coloured polygon when
  present and falls back to the centre+radius circle otherwise.
- **Phase 2b — the boundary editor** ([25f8fc9]): `PUT
  /api/v1/regions/{id}/boundary` on the bridge writes or clears a ring,
  validating it (3–512 points, within map bounds) — per `mod_spec.md`
  §4, boundary writes go through the mod. `/admin/regions` is the
  editor: the canonical world map with click-to-add vertices,
  drag-to-move, double-click-to-delete, undo / clear / save / delete,
  and the other regions drawn as context. Admin-guarded like the
  floorplanner.

[f2b3631]: https://github.com/SWMann/Middle-Earth-Website/commit/f2b3631
[bee242a]: https://github.com/SWMann/Middle-Earth-Website/commit/bee242a
[78847ac]: https://github.com/SWMann/Middle-Earth-Website/commit/78847ac
[5ebe6af]: https://github.com/SWMann/Middle-Earth-Website/commit/5ebe6af
[7992379]: https://github.com/SWMann/Middle-Earth-Website/commit/7992379
[86bf0b6]: https://github.com/SWMann/Middle-Earth-Website/commit/86bf0b6
[6556ba6]: https://github.com/SWMann/Middle-Earth-Website/commit/6556ba6
[7704051]: https://github.com/SWMann/Middle-Earth-Website/commit/7704051
[25f8fc9]: https://github.com/SWMann/Middle-Earth-Website/commit/25f8fc9

### Current state

- Region boundaries are authored one at a time through `/admin/regions`.
  Only AR01 was seeded to verify the renderer; the rest still draw as
  centre+radius circles until someone traces them.
- The root `gradle.properties` still reads `mod_version =
  1.5.3-1.21.5-alpha` against `minecraft_version=1.21.8`. That file is
  vendored from upstream verbatim; the stale string is theirs, left
  untouched so re-vendoring stays a clean copy.

---

## The plot scanner (Phases A–E)

Ties a player's actual Minecraft build to the catalogue. A build is
scored 0–100 against weighted decoration criteria, validated against the
district's required components and footprint, gated by settlement tier,
and either auto-approved or routed to a staff review queue. Phase letters
are the scanner's own, not the project plan's.

- **Phase A — the data model** ([8dda8bc]): `game.plots` (mod-owned, web
  reads) carries linkage (settlement / district / type / faction /
  source), an always-present block AABB plus optional footprint cells,
  the image↔block transform + underlay + planned layout for the
  floorplanner, and nullable scan results (`decorationScore`,
  `criteriaBreakdown`, component/footprint results, `reviewStatus`
  defaulting to `unscanned`). Plus the shared cell↔block geometry.
- **Phase B — the in-game scanner** ([2ac7abb]): `/anduril pos1 | pos2 |
  plot | clear` marks a two-corner selection; `/anduril scan
  <districtType> [faction] [tier]` scores, validates, gates, and
  persists. The threading contract is the crux: the command body reads
  the world on the server thread into an immutable, MC-free
  `ScanObservations`; scoring, validation, and gating are pure; the Neon
  write goes to a daemon IO pool so the tick never blocks; the reply
  marshals back through `server.execute`. No `World` or `BlockState` ever
  crosses the boundary. A 4M-block volume budget guards runaway
  selections. Fifteen new classes under `scan/`, including a
  `ConfigReader` cache of every tunable read from `config.*` (criteria
  weights, tier gates, component-block rules, block tiers, culture
  palettes) so detection retunes without a redeploy. Gating is honest:
  auto-approval needs a met threshold *and* passing validation *and* a
  verified building count *and* no uncertain detections.
- **Phase C — the review queue** ([4a74767]): `/admin/reviews` lists
  plots in `pending_spot` / `pending_full` with score, tier badge,
  faction banner, and pass chips; the detail view renders per-criterion
  0–100 bars (absent criteria show "—", matching the renormalising
  scorer), component and footprint pass/fail with uncertain flags, a
  read-only box preview, and an approve/reject form. `POST
  /api/v1/plots/{id}/review` on the bridge only accepts pending plots
  (409 otherwise), activates a linked district on approval, and writes a
  `PLOT_REVIEWED` audit row. Reviewer identity comes from the session,
  never the client.
- **Phase D — the web floorplanner** ([ea76fe1]): `/admin/floorplan`
  paints a footprint and places building footprints on a grid mapped to
  world block coordinates — the "where" step between the settlement
  planner ("what") and the scanner ("what got built"). Footprint / erase
  / building / georeference tools, a manual transform editor
  (blocks-per-cell, origin, base Y, 90° rotation, scan height, grid
  size) as the primary path, an optional underlay image with a two-point
  georeference, and a live readout of the cursor's world block coords and
  the projected world AABB. `POST /api/v1/plots` stores transform,
  layout, and cells verbatim; the AABB is computed web-side through the
  shared `lib/plots/geometry.ts` so the projection stays single-sourced.
- **Phase E — HTTP-triggered scan** ([03bf94f]): `POST
  /api/v1/plots/{id}/scan` scans a saved floorplan in-world with the
  threading inverted — load plot + config on the Jetty worker, read the
  world inside `server.execute` (force-loading the box, since the author
  may be absent), block the worker on a bounded 15s future so a lagging
  tick fails the request instead of hanging Jetty. Because a floorplan
  carries a layout, building count can finally be *verified*: each
  declared building's sub-region is read, and a building counts as
  verified only if every component it should provide is physically
  present. That is what lets a complete floorplan auto-approve, where the
  command path (no layout) always routes to review. `PlotGeometry` is the
  Java twin of the TypeScript geometry module, kept in lockstep so a
  web-authored plot projects to the same blocks the scanner reads.
- **Command registration fix** ([ee09c5c]): `/anduril` never registered
  on the live server. A dedicated server builds its command tree *during
  datapack load*, before `SERVER_STARTING`, so a
  `CommandRegistrationCallback` added inside `onStarting` was never
  invoked. Registration moved to mod-init; handlers resolve the live
  instance at command-run time.
- **Live world map** ([c06681e]): Xaero's World Map renders client-side,
  so there is no server imagery to borrow — this does the same thing
  server-side. Every chunk that loads gets its 16×16 surface captured
  (top-block MapColor, vanilla north-shading, 1px/block) and blitted into
  512×512 PNG tiles; zoom-outs compose lazily from scale-0 tiles, and
  tile serving touches only the tile store, never the world. The backfill
  pump is fully async and never reads chunks from the tick: short-lived
  forced tickets (8/tick, 32 in flight) let the chunk system load on its
  own workers, `CHUNK_LOAD` captures and releases each ticket, and a
  counters-only sweep recycles stragglers — roughly 80 chunks/s with no
  "Can't keep up" lines. Three failure modes are recorded in the
  comments: neighbour `getChunk` during `CHUNK_LOAD` deadlocked boot;
  synchronous `getChunk(create=true)` stalled ticks 5–17s and tripped the
  watchdog; and even `create=false` polling parks the server thread under
  VMP's chunk-manager rewrite. Also `TopDownRenderer` +
  `GET /api/v1/render/topdown` for the floorplanner's exact 1px/block
  underlay, `GET /api/v1/dimensions`, and `game.plots.dimension` — scans
  previously always read the overworld while builds live in the
  Middle-earth dimension.
- **Real Minecraft account linking** ([5d03e7f]): closes the half of the
  write loop that Phase 1's mock stood in for. `/anduril link` issues a
  short single-use code into `web.mc_link_codes` (15-minute TTL, one live
  code per player); `POST /api/v1/mc-links/redeem` validates and consumes
  it, returning UUID + username. It matches the existing snake_case
  contract via `@JsonProperty`, so no website code changed. The op-gate
  moved from the `/anduril` root onto each scan subcommand so ordinary
  players can reach `link`. Deploy steps in
  `bridge/docs/account-linking.md`.

[8dda8bc]: https://github.com/SWMann/Middle-Earth-Website/commit/8dda8bc
[2ac7abb]: https://github.com/SWMann/Middle-Earth-Website/commit/2ac7abb
[4a74767]: https://github.com/SWMann/Middle-Earth-Website/commit/4a74767
[ea76fe1]: https://github.com/SWMann/Middle-Earth-Website/commit/ea76fe1
[03bf94f]: https://github.com/SWMann/Middle-Earth-Website/commit/03bf94f
[ee09c5c]: https://github.com/SWMann/Middle-Earth-Website/commit/ee09c5c
[c06681e]: https://github.com/SWMann/Middle-Earth-Website/commit/c06681e
[5d03e7f]: https://github.com/SWMann/Middle-Earth-Website/commit/5d03e7f

---

## Catalogue and simulation depth

The layer the rest of the game validates against: `config.*` describes
what *can* exist (costs, stat blocks, recipes, buildings), distinct from
the `game.*` instance tables tracking what *does*. Built out from a
vertical slice into a full economic and military model, then given an
admin-facing planner to balance against.

- **`config.*` schema + vertical slice** ([f949f47]): tags, resources,
  resource↔tag weights, district types, district consumes/produces, unit
  types, unit recruitment costs. Seeded with a complete supply chain
  (Wheat Farm → Bakery → Bread; Iron Mine → Smithy → Foundry → Steel →
  Citadel Guard) and browse pages at `/resources`, `/districts`,
  `/units`. Recruitment and construction validation can now look up real
  costs instead of the hardcoded 10-coin placeholder.
- **`game.diplomatic_states`** ([b0609c8]): wars, alliances, trade deals,
  truces, and vassalage as first-class rows rather than something you
  reconstruct by scanning the audit log. Single-row symmetric storage,
  DP costs per `mechanics_spec.md` §8.2.
- **Walls as districts + occupation classes** ([9f7a714]): walls were
  implicit in settlement tier, so a Burgh could never have stone walls
  early. Now six defensive district tiers carrying defence bonus, delay
  of engagement (24h palisade → 240h capital walls), breach difficulty
  and requirements, archer cover, ranged retaliation, and defender waves.
- **District depth** ([14c9f25]): eleven new columns and seven relation
  tables on `district_types` — build cost and time, upkeep, required
  biomes, discovery and terrain gating, per-settlement caps, upgrade
  chains, staffing by occupation class, open-ended effects, per-biome
  outputs, prerequisites, adjacency bonuses, and per-faction restrict /
  unlock / override rules. Catalogue grows to 33 districts demonstrating
  every axis.
- **Production sophistication** ([222e97d]): consumption periods (daily /
  weekly / monthly catalysts), byproducts, conditional production bonuses
  (Foundry +50% Steel when fed Coal), alternate recipes a district can
  switch to, and per-tier output multipliers.
- **Military depth** ([ec1ce9d]): weapons with damage and range, a global
  veterancy ladder (green → elite), rock-paper-scissors category
  counters, terrain modifiers, an open combat-trait catalogue, and active
  battle abilities with cooldowns. All surfaced on `/units/[id]`.
- **Building composition** ([44174b9]): districts are made of buildings,
  which supply functional components. Adds the `/buildings` index, the
  `/decoration` scoring reference (weighted criteria + per-tier
  thresholds), and a construction-requirements section on district pages
  — the catalogue half of what the scanner later grades against.
- **Building depth + cultural variants** ([2b9dd31]): component
  quantities, per-building footprint and tier floors, upgrade chains,
  building tags enabling verifiable "themed" requirements and "any one
  of" slots — plus purely cosmetic cultural reskins.
- **Housing rework** ([8eec73b]): the old residential districts were
  degenerate — each a single building masquerading as a district. Houses
  became a building family; residential districts became *quarters*,
  clusters of housing buildings deriving their population cap from the
  beds inside. Material costs dropped everywhere, per the
  block-determined principle: the bill of resources is whatever blocks a
  player actually places, not config.
- **Housing by population class** ([cbf3d5e]): each residential district
  declares the class it is *for*, as a ceiling — a quarter accepts its
  own class or any lower-standing one, so a manor can't drop into a
  peasant quarter but a Noble Estate may include servant cottages. 23
  housing buildings across five civilian classes; population produced
  follows the mix actually built.
- **District size and scale bonuses** ([5bb0685]): a required-building
  slot becomes a range rather than a fixed count, and a new density
  dividend rewards every building raised beyond the minimum. The
  anti-sprawl lever is structural — each district pays a flat commission
  and daily upkeep regardless of size, so one big quarter pays once where
  a dozen small ones pay twelve times.
- **Settlement planner** ([4147d31]): `/admin/planner`, an admin-gated
  balancing tool. Pick a faction and tier, add districts and a garrison,
  and read the steady-state economy live — population cap and class
  composition against the canonical tier mix, production and input
  demand, food / coin / DP balances, prestige, staffing versus housing,
  build commission and footprint, and warnings. Computed in the browser
  from a one-shot catalogue bundle through a pure function; drafts
  persist in `localStorage`, nothing is stored server-side.
- **Planner v2** ([2c6c46e]): clickable district and building detail
  modals, plus tabbed deep views — Economy (per-district coin breakdown,
  efficiency ratios, build payback), Population (composition deviation,
  workforce, garrison cap), and Production (supply-chain reconciliation
  of each input tag's demand against what the plan produces).
- **Production overhaul** ([600ec1a]): a production district's daily
  output becomes the sum of its production buildings, so building choice
  and count drive the economy — a Smithy with three forges makes 3× iron.
  Five new chains added (textiles, leather and wood, victuals and
  pottery, luxury and finance, logistics), about 13 districts and 12
  buildings.
- **District upgrades** ([a93c971]): optional support buildings that buff
  a production district — output percentage, input reduction, coin, and
  storage — stacking, so a smithy with a foreman and a materials store
  makes +10% iron on −20% fuel.
- **Extraction rework** ([401344c]): per-resource extraction districts
  replaced by generic archetypes (Mine, Deep Mine, Quarry, Forestry Camp)
  plus a 12-entry deposit catalogue with biome, terrain, and discovery
  gates. Output scales with buildings like industry does. Adds Coal — a
  real gap, nothing produced it before — plus Gold, Gems, Salt, Marble.

[f949f47]: https://github.com/SWMann/Middle-Earth-Website/commit/f949f47
[b0609c8]: https://github.com/SWMann/Middle-Earth-Website/commit/b0609c8
[9f7a714]: https://github.com/SWMann/Middle-Earth-Website/commit/9f7a714
[14c9f25]: https://github.com/SWMann/Middle-Earth-Website/commit/14c9f25
[222e97d]: https://github.com/SWMann/Middle-Earth-Website/commit/222e97d
[ec1ce9d]: https://github.com/SWMann/Middle-Earth-Website/commit/ec1ce9d
[44174b9]: https://github.com/SWMann/Middle-Earth-Website/commit/44174b9
[2b9dd31]: https://github.com/SWMann/Middle-Earth-Website/commit/2b9dd31
[8eec73b]: https://github.com/SWMann/Middle-Earth-Website/commit/8eec73b
[cbf3d5e]: https://github.com/SWMann/Middle-Earth-Website/commit/cbf3d5e
[5bb0685]: https://github.com/SWMann/Middle-Earth-Website/commit/5bb0685
[4147d31]: https://github.com/SWMann/Middle-Earth-Website/commit/4147d31
[2c6c46e]: https://github.com/SWMann/Middle-Earth-Website/commit/2c6c46e
[600ec1a]: https://github.com/SWMann/Middle-Earth-Website/commit/600ec1a
[a93c971]: https://github.com/SWMann/Middle-Earth-Website/commit/a93c971
[401344c]: https://github.com/SWMann/Middle-Earth-Website/commit/401344c

---

## Phase 4 — Andúril, the bridge mod

The companion Fabric mod that owns every write to `game.*` and `audit.*`.
The website reads those schemas directly and sends all mutations through
here. Built up one endpoint at a time, each establishing a pattern the
next reuses.

- **Scaffold** ([bc9c6a2]): bare Fabric mod, its own Gradle wrapper
  independent of the vendored upstream project, mod ID `anduril`, package
  root `org.middleearth.anduril`.
- **HTTP server** ([0189201]): Javalin on a configurable port,
  `GET /api/v1/health`.
- **Token middleware** ([8a52e0d]): `X-Mod-Token` bearer auth on
  everything but health, plus `GET /api/v1/admin/info`.
- **Postgres connection** ([b56e11f]): HikariCP + pgjdbc against the same
  Neon database the website uses.
- **First mutating endpoint** ([a290f7e]): `POST
  /api/v1/admin/factions/{id}/grant` — the transaction template
  everything later copies (lock, validate, mutate, audit, commit).
- **Website → real bridge** ([01db428]): `/admin/factions/[id]/grant`
  closes the integration loop — a click on the website mutates state
  through the running mod, and the website reads the result back from
  Neon on its next render.
- **Recruitment** ([2df47fa]): `POST
  /api/v1/settlements/{id}/recruitments` exercises the multi-row,
  cross-table write shape — deterministic lock order to avoid deadlocks,
  cross-table validation (settlement exists, faction can afford it,
  settlement has available population), conditional insert-vs-update of
  the unit stack under a held row lock, debit, audit, commit.
- **Region claims** ([703cc50]): `POST /api/v1/claims` adds two patterns
  the rest reuse — 409 Conflict when well-formed input meets a world
  state that rejects it (distinct from 400 validation errors), and DP
  debits alongside the established coin ones. Contiguity checking is
  deferred; it needs region adjacency data and the faction-trait
  exception ruleset.
- **Bundle every transitive dependency** ([fe70a98]): Loom's `include`
  does not pull transitives, and local dev hid it because Gradle wires
  the runtime classpath directly. Production found it the hard way —
  restart 1 died on `jackson-core`, restart 2 on Javalin's Kotlin
  stdlib, restart 3 would have hit Jetty. The whole transitive set is now
  explicit: 27 jars, 3.9 MB → 8.6 MB. SLF4J is skipped, since Minecraft
  provides it. If a new `NoClassDefFoundError` appears after adding a
  feature, find its containing jar and add it here.
- **Diagnostic mock detail** ([32cac01]): when the website falls back to
  the mock because `MOD_API_URL` / `MOD_API_TOKEN` / `MOD_API_MOCK`
  aren't configured for a real bridge, the 503 now reports which of those
  are set — never the token value — so "why am I still hitting the mock
  on Vercel" is answerable from the error itself.

[bc9c6a2]: https://github.com/SWMann/Middle-Earth-Website/commit/bc9c6a2
[0189201]: https://github.com/SWMann/Middle-Earth-Website/commit/0189201
[8a52e0d]: https://github.com/SWMann/Middle-Earth-Website/commit/8a52e0d
[b56e11f]: https://github.com/SWMann/Middle-Earth-Website/commit/b56e11f
[a290f7e]: https://github.com/SWMann/Middle-Earth-Website/commit/a290f7e
[01db428]: https://github.com/SWMann/Middle-Earth-Website/commit/01db428
[2df47fa]: https://github.com/SWMann/Middle-Earth-Website/commit/2df47fa
[703cc50]: https://github.com/SWMann/Middle-Earth-Website/commit/703cc50
[fe70a98]: https://github.com/SWMann/Middle-Earth-Website/commit/fe70a98
[32cac01]: https://github.com/SWMann/Middle-Earth-Website/commit/32cac01

---

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
