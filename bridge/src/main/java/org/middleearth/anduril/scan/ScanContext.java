package org.middleearth.anduril.scan;

/**
 * The non-world inputs to a scan: what the build is supposed to be, where it
 * lives in the catalogue, and who/what triggered the scan. Carried alongside
 * the {@link ScanObservations} (which hold the world facts) through scoring,
 * validation, and persistence. Pure plain data — safe to cross the
 * server-thread → IO-thread boundary.
 *
 * <p>Most linkage fields are nullable: a command-path scan often knows only
 * the district type, leaving the settlement/district/faction to be attached
 * later on the web review surface.
 */
public record ScanContext(
    /** config.district_types.id this build is validated against. Required. */
    String districtType,
    /** game.factions.id, resolves the culture for theme scoring. Nullable. */
    String factionId,
    /** Resolved from factionId via config; drives theme_adherence. Nullable. */
    String cultureId,
    /** game.settlements.id this plot belongs to. Nullable (command path). */
    Long settlementId,
    /** game.districts.id this plot realises. Nullable. */
    Long districtId,
    /** Settlement tier for the gate (config.tier_decoration_thresholds). Nullable. */
    String tier,
    /** 'command' | 'floorplanner' | 'http'. */
    String source,
    /** Free-text label shown in the review queue. */
    String label,
    /** Who ran the scan (player name or 'http'); stored in the audit row. */
    String scannedBy,
    /** True when a building layout is available to verify building-count. */
    boolean hasLayout
) {
    /** A bare command-path context: district type only, everything else open. */
    public static ScanContext command(String districtType, String factionId,
                                       String cultureId, String tier, String scannedBy) {
        return new ScanContext(
            districtType, factionId, cultureId, null, null, tier,
            "command", "", scannedBy, false
        );
    }
}
