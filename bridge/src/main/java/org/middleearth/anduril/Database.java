package org.middleearth.anduril;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import com.zaxxer.hikari.HikariPoolMXBean;

import java.net.URI;
import java.net.URISyntaxException;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Postgres connection for the Andúril bridge mod.
 *
 * <p>Reads {@code DATABASE_URL} from the environment — the same connection
 * string the website uses, in standard postgres:// form. We convert it to
 * a JDBC URL plus separated credentials because pgjdbc doesn't accept
 * user:password embedded in the URL.
 *
 * <p>Pool sized at 8 per {@code mod_spec.md §4.5}. Connection is verified
 * at startup with {@code SELECT version()}; if the verification fails the
 * exception propagates and the mod fails to start.
 *
 * <p>SSL settings are inherited from the connection-string query (e.g.
 * {@code sslmode=require&channel_binding=require} for Neon). No defaults
 * added by this class.
 */
public class Database {
    public static final String URL_ENV = "DATABASE_URL";

    private final HikariDataSource pool;
    private String postgresVersion = "";

    public Database() throws Exception {
        String raw = System.getenv(URL_ENV);
        if (raw == null || raw.isBlank()) {
            throw new IllegalStateException(
                URL_ENV + " is not set — set it to a postgres:// connection string"
            );
        }
        ParsedUrl parsed = ParsedUrl.parse(raw);

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(parsed.jdbcUrl);
        config.setUsername(parsed.user);
        config.setPassword(parsed.password);
        config.setMaximumPoolSize(8);
        config.setMinimumIdle(1);
        config.setPoolName("anduril");
        // The mod's writes are short and transactional. Anything > 30s is
        // a leak we want to know about.
        config.setLeakDetectionThreshold(30_000);

        this.pool = new HikariDataSource(config);
        verifyConnectivity();
        Anduril.LOGGER.info("Andúril DB connected ({}).", postgresVersion);
    }

    public Connection getConnection() throws SQLException {
        return pool.getConnection();
    }

    public String postgresVersion() {
        return postgresVersion;
    }

    public HikariPoolMXBean poolStats() {
        return pool.getHikariPoolMXBean();
    }

    public void close() {
        if (pool != null && !pool.isClosed()) {
            pool.close();
            Anduril.LOGGER.info("Andúril DB pool closed.");
        }
    }

    private void verifyConnectivity() throws SQLException {
        try (Connection conn = pool.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT version()")) {
            if (!rs.next()) {
                throw new SQLException("SELECT version() returned no rows");
            }
            String full = rs.getString(1);
            // Trim to "PostgreSQL 17.0" or similar — full string includes
            // build details and compiler info we don't care about logging.
            int idxOn = full.indexOf(" on ");
            this.postgresVersion = idxOn > 0 ? full.substring(0, idxOn) : full;
        }
    }

    /**
     * Parsed postgres:// URL split into JDBC-compatible components.
     * Kept package-private and tiny — we never need the constituent fields
     * outside this class.
     */
    private record ParsedUrl(String jdbcUrl, String user, String password) {
        static ParsedUrl parse(String raw) {
            URI uri;
            try {
                uri = new URI(raw);
            } catch (URISyntaxException e) {
                throw new IllegalArgumentException(
                    URL_ENV + " is not a valid URL: " + e.getMessage(), e
                );
            }
            String scheme = uri.getScheme();
            if (!"postgres".equals(scheme) && !"postgresql".equals(scheme)) {
                throw new IllegalArgumentException(
                    URL_ENV + " must use the postgres:// or postgresql:// scheme; got " + scheme
                );
            }
            String userInfo = uri.getUserInfo();
            String user = "";
            String password = "";
            if (userInfo != null && !userInfo.isEmpty()) {
                int colon = userInfo.indexOf(':');
                if (colon < 0) {
                    user = userInfo;
                } else {
                    user = userInfo.substring(0, colon);
                    password = userInfo.substring(colon + 1);
                }
            }
            String host = uri.getHost();
            if (host == null) {
                throw new IllegalArgumentException(URL_ENV + " missing host");
            }
            int port = uri.getPort() == -1 ? 5432 : uri.getPort();
            String path = uri.getPath() == null ? "" : uri.getPath();
            String query = uri.getRawQuery();
            String jdbc = String.format(
                "jdbc:postgresql://%s:%d%s%s",
                host, port, path,
                query == null || query.isEmpty() ? "" : "?" + query
            );
            return new ParsedUrl(jdbc, user, password);
        }
    }
}
