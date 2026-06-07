package org.middleearth.anduril.scan;

import org.middleearth.anduril.Anduril;
import org.middleearth.anduril.Database;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Loads the scanner's {@link ScanConfig} from the {@code config.*} catalogue
 * and caches it. The snapshot is read with plain SELECTs (the JDBC layer the
 * rest of the mod already uses) and held behind an {@link AtomicReference}; a
 * background refresh keeps it within a TTL so the hot path (a scan) reads an
 * in-memory object and never blocks the server tick on the database.
 *
 * <p>Thread-safety: {@link #get()} returns the current immutable snapshot
 * with no locking. {@link #refresh()} builds a new snapshot off-thread and
 * swaps it in atomically. If a scan finds the cache cold it falls back to a
 * synchronous load (rare; logged).
 */
public final class ConfigReader {
    /** Refresh the snapshot at most this often when {@link #getFresh} is used. */
    public static final long TTL_MILLIS = 60_000;

    private final Database database;
    private final AtomicReference<ScanConfig> cache = new AtomicReference<>(null);
    private volatile long loadedAtMillis = 0L;

    public ConfigReader(Database database) {
        this.database = database;
    }

    /** The current snapshot, loading synchronously if the cache is cold. */
    public ScanConfig get() {
        ScanConfig c = cache.get();
        if (c != null) return c;
        return refresh();
    }

    /** The snapshot, refreshing first if older than the TTL. Off the hot path. */
    public ScanConfig getFresh(long nowMillis) {
        ScanConfig c = cache.get();
        if (c != null && nowMillis - loadedAtMillis < TTL_MILLIS) return c;
        return refresh();
    }

    /** Rebuild the snapshot from the DB and swap it in. Returns the new value. */
    public ScanConfig refresh() {
        try (Connection conn = database.getConnection()) {
            ScanConfig built = load(conn);
            cache.set(built);
            loadedAtMillis = System.currentTimeMillis();
            Anduril.LOGGER.info(
                "Scan config loaded: {} criteria, {} component rules, {} block tiers, {} districts.",
                built.criteriaWeights().size(), built.componentRules().size(),
                built.blockTier().size(), built.districts().size()
            );
            return built;
        } catch (SQLException e) {
            Anduril.LOGGER.error("Failed to load scan config: {}", e.getMessage(), e);
            ScanConfig stale = cache.get();
            if (stale != null) return stale; // serve the last good snapshot
            throw new RuntimeException("Scan config load failed and no cache available", e);
        }
    }

    private ScanConfig load(Connection conn) throws SQLException {
        Map<String, Integer> weights = new LinkedHashMap<>();
        try (Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery(
                 "SELECT id, weight_pct FROM config.decoration_criteria")) {
            while (rs.next()) weights.put(rs.getString("id"), rs.getInt("weight_pct"));
        }

        Map<String, ScanConfig.TierThreshold> tiers = new HashMap<>();
        try (Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery(
                 "SELECT tier, min_score, review_mode FROM config.tier_decoration_thresholds")) {
            while (rs.next()) {
                int ms = rs.getInt("min_score");
                Integer minScore = rs.wasNull() ? null : ms;
                tiers.put(rs.getString("tier"),
                    new ScanConfig.TierThreshold(minScore, rs.getString("review_mode")));
            }
        }

        List<ScanConfig.ComponentRule> rules = new ArrayList<>();
        try (Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery(
                 "SELECT component_id, match_type, match_value FROM config.component_blocks")) {
            while (rs.next()) {
                rules.add(new ScanConfig.ComponentRule(
                    rs.getString("component_id"), rs.getString("match_type"),
                    rs.getString("match_value")));
            }
        }

        Map<String, String> blockTier = new HashMap<>();
        Set<String> decorative = new HashSet<>();
        try (Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery(
                 "SELECT block_id, tier, decorative FROM config.block_tiers")) {
            while (rs.next()) {
                String id = rs.getString("block_id");
                blockTier.put(id, rs.getString("tier"));
                if (rs.getBoolean("decorative")) decorative.add(id);
            }
        }

        // Culture palettes: union every role's block list per culture. blocks
        // is a jsonb string[]; parse it without a JSON lib (it is a flat array
        // of quoted strings).
        Map<String, Set<String>> palettes = new HashMap<>();
        try (Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery(
                 "SELECT culture_id, blocks::text AS blocks FROM config.culture_palettes")) {
            while (rs.next()) {
                String culture = rs.getString("culture_id");
                Set<String> set = palettes.computeIfAbsent(culture, k -> new HashSet<>());
                set.addAll(parseJsonStringArray(rs.getString("blocks")));
            }
        }

        Map<String, String> factionCulture = new HashMap<>();
        try (Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery(
                 "SELECT id, culture_id FROM game.factions WHERE culture_id IS NOT NULL")) {
            while (rs.next()) factionCulture.put(rs.getString("id"), rs.getString("culture_id"));
        }

        // District specs: base row, then required components + buildings.
        Map<String, ScanConfig.DistrictSpec> districts = new HashMap<>();
        Map<String, List<ScanConfig.ReqComponent>> reqComp = new HashMap<>();
        try (Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery(
                 "SELECT district_type_id, component_id, count, per_cap " +
                 "FROM config.district_required_components")) {
            while (rs.next()) {
                reqComp.computeIfAbsent(rs.getString("district_type_id"), k -> new ArrayList<>())
                    .add(new ScanConfig.ReqComponent(
                        rs.getString("component_id"), rs.getInt("count"), rs.getBoolean("per_cap")));
            }
        }
        Map<String, List<ScanConfig.ReqBuilding>> reqBld = new HashMap<>();
        try (Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery(
                 "SELECT district_type_id, COALESCE(group_key, building_type_id, theme_tag, kind) AS slot_key, " +
                 "count, max_count, optional FROM config.district_required_buildings")) {
            while (rs.next()) {
                int mc = rs.getInt("max_count");
                Integer maxCount = rs.wasNull() ? null : mc;
                reqBld.computeIfAbsent(rs.getString("district_type_id"), k -> new ArrayList<>())
                    .add(new ScanConfig.ReqBuilding(
                        rs.getString("slot_key"), rs.getInt("count"), maxCount, rs.getBoolean("optional")));
            }
        }
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT id, min_footprint_blocks, max_footprint_blocks, min_height_blocks, " +
                "decoration_threshold FROM config.district_types");
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                String id = rs.getString("id");
                districts.put(id, new ScanConfig.DistrictSpec(
                    id,
                    nullableInt(rs, "min_footprint_blocks"),
                    nullableInt(rs, "max_footprint_blocks"),
                    nullableInt(rs, "min_height_blocks"),
                    nullableInt(rs, "decoration_threshold"),
                    reqComp.getOrDefault(id, List.of()),
                    reqBld.getOrDefault(id, List.of())
                ));
            }
        }

        return new ScanConfig(weights, tiers, rules, blockTier, decorative,
            palettes, factionCulture, districts);
    }

    private static Integer nullableInt(ResultSet rs, String col) throws SQLException {
        int v = rs.getInt(col);
        return rs.wasNull() ? null : v;
    }

    private static final Pattern QUOTED = Pattern.compile("\"((?:[^\"\\\\]|\\\\.)*)\"");

    /** Parse a flat jsonb string array like {@code ["minecraft:a","minecraft:b"]}. */
    static List<String> parseJsonStringArray(String json) {
        List<String> out = new ArrayList<>();
        if (json == null) return out;
        Matcher m = QUOTED.matcher(json);
        while (m.find()) {
            out.add(m.group(1).replace("\\\"", "\"").replace("\\\\", "\\"));
        }
        return out;
    }
}
