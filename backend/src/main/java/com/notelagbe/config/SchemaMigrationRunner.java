package com.notelagbe.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.List;
import java.util.Map;

/**
 * Ensures legacy database constraints match updated entity mappings cleanly.
 * Specifically, Hibernate's ddl-auto=update does not drop the old 2-column unique index
 * (user_id, course_id) on unlocked_courses when transitioning to faculty-scoped gifts.
 */
@Component
@Order(0)
public class SchemaMigrationRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SchemaMigrationRunner.class);

    private final DataSource dataSource;
    private final JdbcTemplate jdbcTemplate;

    public SchemaMigrationRunner(DataSource dataSource, JdbcTemplate jdbcTemplate) {
        this.dataSource = dataSource;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        try (Connection conn = dataSource.getConnection()) {
            String product = conn.getMetaData().getDatabaseProductName().toLowerCase();
            if (product.contains("mysql") || product.contains("tidb") || product.contains("mariadb")) {
                migrateMySqlUnlockedCoursesIndexes();
            } else if (product.contains("h2")) {
                migrateH2UnlockedCoursesConstraints();
            }
            linkMissingContributionUploaders();
            migrateFeedbackAndNotesColumns();
        } catch (Exception e) {
            log.debug("Schema migration check skipped/completed: {}", e.getMessage());
        }
    }

    private void linkMissingContributionUploaders() {
        try {
            jdbcTemplate.execute(
                "UPDATE resources r " +
                "INNER JOIN contribution_requests cr ON cr.resource_id = r.id " +
                "SET r.uploader_id = cr.user_id " +
                "WHERE r.uploader_id IS NULL AND cr.user_id IS NOT NULL"
            );
        } catch (Exception e) {
            try {
                jdbcTemplate.execute(
                    "UPDATE resources SET uploader_id = " +
                    "(SELECT user_id FROM contribution_requests WHERE contribution_requests.resource_id = resources.id) " +
                    "WHERE uploader_id IS NULL AND id IN (SELECT resource_id FROM contribution_requests WHERE resource_id IS NOT NULL)"
                );
            } catch (Exception ignored) {}
        }
    }

    private void migrateFeedbackAndNotesColumns() {
        try {
            jdbcTemplate.execute("ALTER TABLE contribution_requests MODIFY COLUMN admin_feedback TEXT");
            log.info("Migrated contribution_requests.admin_feedback to TEXT");
        } catch (Exception e) {
            log.debug("admin_feedback TEXT migration skipped/completed: {}", e.getMessage());
        }
        try {
            jdbcTemplate.execute("ALTER TABLE waiver_requests MODIFY COLUMN admin_notes TEXT");
            log.info("Migrated waiver_requests.admin_notes to TEXT");
        } catch (Exception e) {
            log.debug("admin_notes TEXT migration skipped/completed: {}", e.getMessage());
        }
        try {
            jdbcTemplate.execute("ALTER TABLE payment_requests MODIFY COLUMN admin_notes TEXT");
            log.info("Migrated payment_requests.admin_notes to TEXT");
        } catch (Exception e) {
            log.debug("payment admin_notes TEXT migration skipped/completed: {}", e.getMessage());
        }
        try {
            jdbcTemplate.execute("ALTER TABLE resources MODIFY COLUMN file_url VARCHAR(1000) NULL");
            log.info("Migrated resources.file_url to NULLABLE");
        } catch (Exception e) {
            log.debug("file_url NULL migration skipped/completed: {}", e.getMessage());
        }
        try {
            jdbcTemplate.execute("ALTER TABLE resources ADD COLUMN IF NOT EXISTS video_url VARCHAR(1000) NULL");
            log.info("Ensured resources.video_url column exists");
        } catch (Exception e) {
            try {
                jdbcTemplate.execute("ALTER TABLE resources ADD COLUMN video_url VARCHAR(1000) NULL");
            } catch (Exception ignored) {}
        }
        try {
            jdbcTemplate.execute("ALTER TABLE teachers ADD COLUMN IF NOT EXISTS youtube_url VARCHAR(1000) NULL");
            log.info("Ensured teachers.youtube_url column exists");
        } catch (Exception e) {
            try {
                jdbcTemplate.execute("ALTER TABLE teachers ADD COLUMN youtube_url VARCHAR(1000) NULL");
            } catch (Exception ignored) {}
        }
        try {
            jdbcTemplate.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS video_url VARCHAR(1000) NULL");
            log.info("Ensured courses.video_url column exists");
        } catch (Exception e) {
            try {
                jdbcTemplate.execute("ALTER TABLE courses ADD COLUMN video_url VARCHAR(1000) NULL");
            } catch (Exception ignored) {}
        }
        try {
            jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS offered_sections (" +
                "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                "course_code VARCHAR(30) NOT NULL, " +
                "section_number VARCHAR(20) NOT NULL, " +
                "course_title VARCHAR(200), " +
                "credits DOUBLE DEFAULT 3.0, " +
                "faculty_initial VARCHAR(30), " +
                "faculty_name VARCHAR(150), " +
                "available_seats INT DEFAULT 40, " +
                "schedule_text VARCHAR(500), " +
                "schedule_json TEXT, " +
                "semester VARCHAR(50) NOT NULL DEFAULT 'Spring 2026', " +
                "uploaded_by_user_id BIGINT, " +
                "uploader_role VARCHAR(30) DEFAULT 'SYSTEM', " +
                "expires_at DATETIME NULL, " +
                "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                "updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                "INDEX idx_offered_sections_course (course_code), " +
                "INDEX idx_offered_sections_semester (semester), " +
                "UNIQUE KEY idx_offered_sections_unique (course_code, section_number, semester)" +
                ")"
            );
            log.info("Verified offered_sections table structure");
        } catch (Exception e) {
            log.debug("offered_sections table creation skipped: {}", e.getMessage());
        }
    }

    private void migrateMySqlUnlockedCoursesIndexes() {
        try {
            // Ensure supporting non-unique indexes exist so FK constraints remain valid when dropping legacy unique index
            try {
                jdbcTemplate.execute("CREATE INDEX idx_unlocked_courses_user ON unlocked_courses (user_id)");
            } catch (Exception ignored) {}
            try {
                jdbcTemplate.execute("CREATE INDEX idx_unlocked_courses_course ON unlocked_courses (course_id)");
            } catch (Exception ignored) {}

            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                    "SELECT INDEX_NAME, GROUP_CONCAT(LOWER(COLUMN_NAME) ORDER BY SEQ_IN_INDEX SEPARATOR ',') AS cols " +
                    "FROM INFORMATION_SCHEMA.STATISTICS " +
                    "WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'unlocked_courses' AND NON_UNIQUE = 0 AND INDEX_NAME <> 'PRIMARY' " +
                    "GROUP BY INDEX_NAME"
            );
            for (Map<String, Object> row : rows) {
                String indexName = String.valueOf(row.get("INDEX_NAME"));
                String cols = String.valueOf(row.get("cols"));
                if ("user_id,course_id".equals(cols) || "course_id,user_id".equals(cols)) {
                    jdbcTemplate.execute("ALTER TABLE unlocked_courses DROP INDEX `" + indexName.replace("`", "") + "`");
                    log.info("Dropped legacy unique index '{}' on unlocked_courses(user_id, course_id)", indexName);
                }
            }
        } catch (Exception e) {
            log.warn("Could not inspect/drop legacy MySQL unique index on unlocked_courses: {}", e.getMessage());
        }
    }

    private void migrateH2UnlockedCoursesConstraints() {
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                    "SELECT tc.CONSTRAINT_NAME, LISTAGG(LOWER(kcu.COLUMN_NAME), ',') WITHIN GROUP (ORDER BY kcu.ORDINAL_POSITION) AS cols " +
                    "FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc " +
                    "JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND tc.TABLE_NAME = kcu.TABLE_NAME " +
                    "WHERE LOWER(tc.TABLE_NAME) = 'unlocked_courses' AND tc.CONSTRAINT_TYPE = 'UNIQUE' " +
                    "GROUP BY tc.CONSTRAINT_NAME"
            );
            for (Map<String, Object> row : rows) {
                String constraintName = String.valueOf(row.get("CONSTRAINT_NAME"));
                String cols = String.valueOf(row.get("cols"));
                if ("user_id,course_id".equals(cols) || "course_id,user_id".equals(cols)) {
                    jdbcTemplate.execute("ALTER TABLE unlocked_courses DROP CONSTRAINT \"" + constraintName.replace("\"", "") + "\"");
                    log.info("Dropped legacy H2 unique constraint '{}' on unlocked_courses", constraintName);
                }
            }
        } catch (Exception e) {
            log.debug("H2 unique constraint check skipped: {}", e.getMessage());
        }
    }
}
