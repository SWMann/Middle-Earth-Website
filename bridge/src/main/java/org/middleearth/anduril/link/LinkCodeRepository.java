package org.middleearth.anduril.link;

import org.middleearth.anduril.Database;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

/**
 * Reads and writes {@code web.mc_link_codes} — the short-lived, single-use
 * codes that pair a Minecraft account with a Discord account.
 *
 * <p>Two operations, both fully transactional:
 * <ul>
 *   <li>{@link #issue} — the in-game {@code /anduril link} command mints a
 *       code for a player. Any previous unredeemed code for the same UUID is
 *       replaced so a player never accumulates stale codes.</li>
 *   <li>{@link #redeem} — the website's {@code POST /mc-links/redeem} call
 *       consumes a code: it is looked up under a row lock, deleted, and its
 *       identity returned. Expiry is enforced here so the check and the delete
 *       cannot race.</li>
 * </ul>
 *
 * <p>The table is bridge-private: the website never reads it. It lives in the
 * {@code web} schema alongside {@code web.mc_links} purely as domain grouping.
 */
public final class LinkCodeRepository {
    private final Database database;

    public LinkCodeRepository(Database database) {
        this.database = database;
    }

    /**
     * Mint a code for {@code mcUuid}, replacing any earlier unredeemed code the
     * same player holds. Runs in one transaction so a player is never left with
     * two live codes.
     */
    public void issue(UUID mcUuid, String mcUsername, String code,
                      Instant issuedAt, Instant expiresAt) throws SQLException {
        try (Connection conn = database.getConnection()) {
            conn.setAutoCommit(false);
            try {
                try (PreparedStatement del = conn.prepareStatement(
                        "DELETE FROM web.mc_link_codes WHERE mc_uuid = ?")) {
                    del.setObject(1, mcUuid);
                    del.executeUpdate();
                }
                try (PreparedStatement ins = conn.prepareStatement(
                        "INSERT INTO web.mc_link_codes " +
                        "(code, mc_uuid, mc_username, issued_at, expires_at) " +
                        "VALUES (?, ?, ?, ?, ?)")) {
                    ins.setString(1, code);
                    ins.setObject(2, mcUuid);
                    ins.setString(3, mcUsername);
                    ins.setTimestamp(4, Timestamp.from(issuedAt));
                    ins.setTimestamp(5, Timestamp.from(expiresAt));
                    ins.executeUpdate();
                }
                conn.commit();
            } catch (SQLException e) {
                conn.rollback();
                throw e;
            }
        }
    }

    /**
     * Consume {@code code}. Locks the row, deletes it, and reports the outcome.
     * A miss and an expired-but-present code are distinguished so the HTTP layer
     * can return 404 vs 410 to match the website's existing error handling.
     */
    public RedeemResult redeem(String code) throws SQLException {
        try (Connection conn = database.getConnection()) {
            conn.setAutoCommit(false);
            try {
                UUID mcUuid;
                String mcUsername;
                Instant expiresAt;
                try (PreparedStatement sel = conn.prepareStatement(
                        "SELECT mc_uuid, mc_username, expires_at " +
                        "FROM web.mc_link_codes WHERE code = ? FOR UPDATE")) {
                    sel.setString(1, code);
                    try (ResultSet rs = sel.executeQuery()) {
                        if (!rs.next()) {
                            conn.commit();
                            return RedeemResult.notFound();
                        }
                        mcUuid = (UUID) rs.getObject("mc_uuid");
                        mcUsername = rs.getString("mc_username");
                        expiresAt = rs.getTimestamp("expires_at").toInstant();
                    }
                }

                // Consume the row whether it was valid or expired — either way
                // it is spent and should not linger.
                try (PreparedStatement del = conn.prepareStatement(
                        "DELETE FROM web.mc_link_codes WHERE code = ?")) {
                    del.setString(1, code);
                    del.executeUpdate();
                }
                conn.commit();

                if (expiresAt.isBefore(Instant.now())) {
                    return RedeemResult.expired();
                }
                return RedeemResult.found(mcUuid, mcUsername);
            } catch (SQLException e) {
                conn.rollback();
                throw e;
            }
        }
    }

    /** Outcome of a {@link #redeem} attempt. */
    public record RedeemResult(Status status, UUID mcUuid, String mcUsername) {
        public enum Status { OK, NOT_FOUND, EXPIRED }

        static RedeemResult notFound() {
            return new RedeemResult(Status.NOT_FOUND, null, null);
        }

        static RedeemResult expired() {
            return new RedeemResult(Status.EXPIRED, null, null);
        }

        static RedeemResult found(UUID mcUuid, String mcUsername) {
            return new RedeemResult(Status.OK, mcUuid, mcUsername);
        }
    }
}
