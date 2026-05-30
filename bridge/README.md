# Andúril — Middle-earth bridge mod

Companion Fabric mod that runs alongside the upstream [Middle-earth mod by
Jukoz et al.](https://modrinth.com/mod/middle-earth) and bridges the
in-game state to the website (`web/apps/website`) and Discord bot.

Per `mod_spec.md` §4: this mod owns all writes to the `game.*` and
`audit.*` Postgres schemas. The website reads those schemas freely and
sends mutations through this mod's HTTP API.

## What this scaffold ships

Bare-bones Fabric mod. Loads on both client and server. The server
module registers lifecycle hooks and logs them. No HTTP API yet, no DB
connection yet, no daily tick yet — all that lands in subsequent
chunks.

The shape of what comes next, per the mod spec:

- **HTTP API** (Javalin) on a configurable port. Authenticated via the
  `X-Mod-Token` bearer secret. Endpoint catalogue in `mod_spec.md` §5.
- **Postgres connection** (HikariCP + JDBC) to the same Neon database
  the website uses. Connection string from env. Writes to `game.*` and
  `audit.*` with the `mod_writer` role.
- **Daily-tick scheduler** running at 06:00 UTC (configurable). Per
  `mod_spec.md` §4.2: atomic-per-faction, advisory-locked in Postgres,
  writes one audit event per state change.
- **Server-to-client packet protocol** for HUD overlays and battle
  command primitives.

## Dev setup

### Prerequisites

- **Java 21** (Temurin recommended). Verify with `java -version`.
  Install via [Adoptium](https://adoptium.net/temurin/releases/?version=21),
  or via [SDKMAN](https://sdkman.io/) with `sdk install java 21.0.5-tem`.
- (Optional) **IntelliJ IDEA** with the Fabric template. Standalone
  `./gradlew` works fine without an IDE.

### Build

This project is independent of the upstream mod's Gradle project at the
repo root. Build it on its own:

```bash
cd bridge
./gradlew build       # build the JAR
./gradlew runServer   # spin up a dedicated server with the mod
./gradlew runClient   # spin up a client to connect
```

This subproject has its own gradle wrapper — independent build from
the upstream mod at the repo root. Both projects pin the same Fabric
Loom + Minecraft 1.21.1 versions so jars are compatible.

To run alongside the upstream Middle-earth mod, drop both built JARs
into the server's `mods/` folder. They coexist as separate mod IDs
(`me` and `anduril`).

## Mod ID / packaging

- Mod ID: `anduril`
- Group: `org.middleearth`
- Package root: `org.middleearth.anduril`
- License: All Rights Reserved (project-wide; will revisit if we open
  the bridge mod separately later)

## Why "Andúril"?

The in-game admin commands described in `mod_spec.md` §9.3 are spec'd
as `/anduril grant ...`, `/anduril teleport-to-build ...`, etc.
Keeping the mod ID aligned with the command namespace.
