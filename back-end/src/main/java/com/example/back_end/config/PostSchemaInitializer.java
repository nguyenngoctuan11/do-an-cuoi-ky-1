package com.example.back_end.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class PostSchemaInitializer {
    private static final Logger log = LoggerFactory.getLogger(PostSchemaInitializer.class);

    private final JdbcTemplate jdbcTemplate;
    private final boolean autoMigrate;

    public PostSchemaInitializer(JdbcTemplate jdbcTemplate,
                                 @Value("${app.posts.auto-migrate:true}") boolean autoMigrate) {
        this.jdbcTemplate = jdbcTemplate;
        this.autoMigrate = autoMigrate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ensurePostsSchema() {
        if (!autoMigrate) {
            log.info("Posts schema auto-migrate disabled (app.posts.auto-migrate=false)");
            return;
        }
        try {
            createPostsTable();
            createIndexes();
        } catch (DataAccessException ex) {
            log.error("Không thể khởi tạo bảng posts. Vui lòng kiểm tra cấu hình DB.", ex);
        }
    }

    private void createPostsTable() {
        String sql = """
            IF OBJECT_ID('dbo.posts', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.posts (
                    id BIGINT IDENTITY(1,1) PRIMARY KEY,
                    title NVARCHAR(255) NOT NULL,
                    slug NVARCHAR(160) NOT NULL UNIQUE,
                    content NVARCHAR(MAX) NOT NULL,
                    excerpt NVARCHAR(1000) NULL,
                    status NVARCHAR(20) NOT NULL CONSTRAINT df_posts_status DEFAULT N'draft',
                    visibility NVARCHAR(32) NOT NULL CONSTRAINT df_posts_visibility DEFAULT N'course',
                    category NVARCHAR(120) NULL,
                    tags NVARCHAR(512) NULL,
                    cover_image_url NVARCHAR(512) NULL,
                    attachment_urls NVARCHAR(MAX) NULL,
                    course_id BIGINT NULL,
                    author_id BIGINT NOT NULL,
                    rejected_reason NVARCHAR(1000) NULL,
                    published_at DATETIME2 NULL,
                    created_at DATETIME2 NOT NULL CONSTRAINT df_posts_created DEFAULT SYSUTCDATETIME(),
                    updated_at DATETIME2 NOT NULL CONSTRAINT df_posts_updated DEFAULT SYSUTCDATETIME(),
                    CONSTRAINT fk_posts_author FOREIGN KEY (author_id) REFERENCES dbo.users(id),
                    CONSTRAINT fk_posts_course FOREIGN KEY (course_id) REFERENCES dbo.courses(id)
                );
            END;
            """;
        jdbcTemplate.execute(sql);
    }

    private void createIndexes() {
        String sql = """
            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_posts_status' AND object_id = OBJECT_ID('dbo.posts'))
            BEGIN
                CREATE INDEX idx_posts_status ON dbo.posts(status);
            END;

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_posts_course' AND object_id = OBJECT_ID('dbo.posts'))
            BEGIN
                CREATE INDEX idx_posts_course ON dbo.posts(course_id);
            END;
            """;
        jdbcTemplate.execute(sql);
    }
}
