package org.middleearth.anduril.scan;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.middleearth.anduril.Anduril;
import org.middleearth.anduril.Database;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Persists a {@link ScanResult}: one row into {@code game.plots}, one
 * append-only {@code audit.events} {@code 'PLOT_SCANNED'} row, and — if the
 * scan auto-approved a linked district — flips that district active. All in a
 * single transaction, following the same shape as the grant/recruit endpoints
 * ({@code setAutoCommit(false)} … {@code CAST(? AS jsonb)} … {@code RETURNING id}
 * … {@code commit()}).
 *
 * <p>Runs <b>off</b> the server thread (on the IO executor for the command
 * path, on the Jetty worker for the HTTP path) — it only touches plain data
 * and JDBC, never the Minecraft world.
 */
public final class PlotRepository {
    private static final ObjectMapper JSON = new ObjectMapper();

    private final Database database;

    public PlotRepository(Database database) {
        this.database = database;
    }

    /** What the caller needs to report back to the player / HTTP client. */
    public record PersistResult(long plotId, long auditEventId) {}

    public PersistResult persist(ScanResult r) throws SQLException {
        ScanContext ctx = r.ctx();
        ScanObservations o = r.observations();

        String breakdownJson = write(r.criteriaBreakdown());
        String componentJson = write(r.componentValidation());
        String footprintJson = write(r.footprintValidation());

        try (Connection conn = database.getConnection()) {
            conn.setAutoCommit(false);
            try {
                long plotId;
                try (PreparedStatement ins = conn.prepareStatement(
                        "INSERT INTO game.plots (" +
                        "settlement_id, district_id, district_type, faction_id, source, label, " +
                        "min_x, min_y, min_z, max_x, max_y, max_z, " +
                        "decoration_score, criteria_breakdown, component_result, footprint_result, " +
                        "review_status, review_mode, reviewed_by, scanned_at, updated_at) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, " +
                        "CAST(? AS jsonb), CAST(? AS jsonb), CAST(? AS jsonb), " +
                        "?, ?, ?, NOW(), NOW()) RETURNING id")) {
                    setNullableLong(ins, 1, ctx.settlementId());
                    setNullableLong(ins, 2, ctx.districtId());
                    ins.setString(3, ctx.districtType());
                    ins.setString(4, ctx.factionId());
                    ins.setString(5, ctx.source());
                    ins.setString(6, ctx.label() == null ? "" : ctx.label());
                    ins.setInt(7, o.minX());
                    ins.setInt(8, o.minY());
                    ins.setInt(9, o.minZ());
                    ins.setInt(10, o.maxX());
                    ins.setInt(11, o.maxY());
                    ins.setInt(12, o.maxZ());
                    ins.setInt(13, r.decorationScore());
                    ins.setString(14, breakdownJson);
                    ins.setString(15, componentJson);
                    ins.setString(16, footprintJson);
                    ins.setString(17, r.reviewStatus());
                    ins.setString(18, r.reviewMode());
                    ins.setString(19, ctx.scannedBy());
                    try (ResultSet rs = ins.executeQuery()) {
                        rs.next();
                        plotId = rs.getLong(1);
                    }
                }

                long eventId;
                try (PreparedStatement ins = conn.prepareStatement(
                        "INSERT INTO audit.events " +
                        "(event_type, faction_id, visibility, payload, occurred_at) " +
                        "VALUES (?, ?, ?, CAST(? AS jsonb), NOW()) RETURNING id")) {
                    ins.setString(1, "PLOT_SCANNED");
                    ins.setString(2, ctx.factionId());
                    ins.setString(3, "admin");
                    ins.setString(4, write(auditPayload(r, plotId)));
                    try (ResultSet rs = ins.executeQuery()) {
                        rs.next();
                        eventId = rs.getLong(1);
                    }
                }

                try (PreparedStatement up = conn.prepareStatement(
                        "UPDATE game.plots SET scan_audit_event_id = ? WHERE id = ?")) {
                    up.setLong(1, eventId);
                    up.setLong(2, plotId);
                    up.executeUpdate();
                }

                // If a linked district auto-approved, mark it active — the hook
                // a future live tick consumes.
                if (TierGate.AUTO_APPROVED.equals(r.reviewStatus()) && ctx.districtId() != null) {
                    try (PreparedStatement up = conn.prepareStatement(
                            "UPDATE game.districts SET active = 'true' WHERE id = ?")) {
                        up.setLong(1, ctx.districtId());
                        up.executeUpdate();
                    }
                }

                conn.commit();
                Anduril.LOGGER.info(
                    "PLOT_SCANNED: plot #{} ({} score {} → {}, event {})",
                    plotId, ctx.districtType(), r.decorationScore(), r.reviewStatus(), eventId);
                return new PersistResult(plotId, eventId);
            } catch (Exception e) {
                conn.rollback();
                throw e;
            }
        }
    }

    /**
     * Update an existing plot row with fresh scan results (the HTTP/floorplan
     * path re-scans a saved plot rather than inserting a new one). Same
     * transaction shape as {@link #persist}: write results, audit, conditional
     * district activation.
     */
    public PersistResult updateScan(long plotId, ScanResult r) throws SQLException {
        ScanContext ctx = r.ctx();
        String breakdownJson = write(r.criteriaBreakdown());
        String componentJson = write(r.componentValidation());
        String footprintJson = write(r.footprintValidation());

        try (Connection conn = database.getConnection()) {
            conn.setAutoCommit(false);
            try {
                try (PreparedStatement up = conn.prepareStatement(
                        "UPDATE game.plots SET decoration_score = ?, " +
                        "criteria_breakdown = CAST(? AS jsonb), component_result = CAST(? AS jsonb), " +
                        "footprint_result = CAST(? AS jsonb), review_status = ?, review_mode = ?, " +
                        "scanned_at = NOW(), updated_at = NOW() WHERE id = ?")) {
                    up.setInt(1, r.decorationScore());
                    up.setString(2, breakdownJson);
                    up.setString(3, componentJson);
                    up.setString(4, footprintJson);
                    up.setString(5, r.reviewStatus());
                    up.setString(6, r.reviewMode());
                    up.setLong(7, plotId);
                    if (up.executeUpdate() == 0) {
                        throw new SQLException("Plot not found for scan update: " + plotId);
                    }
                }

                long eventId;
                try (PreparedStatement ins = conn.prepareStatement(
                        "INSERT INTO audit.events " +
                        "(event_type, faction_id, visibility, payload, occurred_at) " +
                        "VALUES (?, ?, ?, CAST(? AS jsonb), NOW()) RETURNING id")) {
                    ins.setString(1, "PLOT_SCANNED");
                    ins.setString(2, ctx.factionId());
                    ins.setString(3, "admin");
                    ins.setString(4, write(auditPayload(r, plotId)));
                    try (ResultSet rs = ins.executeQuery()) {
                        rs.next();
                        eventId = rs.getLong(1);
                    }
                }

                try (PreparedStatement up = conn.prepareStatement(
                        "UPDATE game.plots SET scan_audit_event_id = ? WHERE id = ?")) {
                    up.setLong(1, eventId);
                    up.setLong(2, plotId);
                    up.executeUpdate();
                }

                if (TierGate.AUTO_APPROVED.equals(r.reviewStatus()) && ctx.districtId() != null) {
                    try (PreparedStatement up = conn.prepareStatement(
                            "UPDATE game.districts SET active = 'true' WHERE id = ?")) {
                        up.setLong(1, ctx.districtId());
                        up.executeUpdate();
                    }
                }

                conn.commit();
                Anduril.LOGGER.info(
                    "PLOT_SCANNED (rescan): plot #{} ({} score {} → {}, event {})",
                    plotId, ctx.districtType(), r.decorationScore(), r.reviewStatus(), eventId);
                return new PersistResult(plotId, eventId);
            } catch (Exception e) {
                conn.rollback();
                throw e;
            }
        }
    }

    private Map<String, Object> auditPayload(ScanResult r, long plotId) {
        ScanContext ctx = r.ctx();
        ScanObservations o = r.observations();
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("plot_id", plotId);
        p.put("district_type", ctx.districtType());
        p.put("faction_id", ctx.factionId());
        p.put("settlement_id", ctx.settlementId());
        p.put("district_id", ctx.districtId());
        p.put("source", ctx.source());
        p.put("scanned_by", ctx.scannedBy());
        p.put("decoration_score", r.decorationScore());
        p.put("review_status", r.reviewStatus());
        p.put("review_mode", r.reviewMode());
        p.put("criteria_breakdown", r.criteriaBreakdown());
        p.put("component_pass", r.componentValidation().pass());
        p.put("footprint_pass", r.footprintValidation().pass());
        p.put("buildings_verified", r.footprintValidation().buildingsVerified());
        p.put("area_blocks", o.areaBlocks());
        p.put("height_blocks", o.heightBlocks());
        p.put("box", Map.of(
            "min", new int[]{o.minX(), o.minY(), o.minZ()},
            "max", new int[]{o.maxX(), o.maxY(), o.maxZ()}));
        return p;
    }

    private static String write(Object value) {
        try {
            return JSON.writeValueAsString(value);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialise scan payload", e);
        }
    }

    private static void setNullableLong(PreparedStatement ps, int idx, Long v) throws SQLException {
        if (v == null) ps.setNull(idx, Types.BIGINT);
        else ps.setLong(idx, v);
    }
}
