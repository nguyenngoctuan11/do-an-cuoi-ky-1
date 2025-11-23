IF OBJECT_ID('dbo.course_analytics', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.course_analytics (
        course_id BIGINT NOT NULL PRIMARY KEY,
        view_count BIGINT NOT NULL CONSTRAINT df_course_analytics_views DEFAULT 0,
        payment_count BIGINT NOT NULL CONSTRAINT df_course_analytics_payments DEFAULT 0,
        last_viewed_at DATETIME2 NULL,
        last_payment_at DATETIME2 NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT df_course_analytics_created DEFAULT GETUTCDATE(),
        updated_at DATETIME2 NOT NULL CONSTRAINT df_course_analytics_updated DEFAULT GETUTCDATE(),
        CONSTRAINT fk_course_analytics_course FOREIGN KEY (course_id)
            REFERENCES dbo.courses(id) ON DELETE CASCADE,
        CONSTRAINT ck_course_analytics_counts CHECK (view_count >= 0 AND payment_count >= 0)
    );

    CREATE INDEX idx_course_analytics_views ON dbo.course_analytics(view_count);
    CREATE INDEX idx_course_analytics_payments ON dbo.course_analytics(payment_count);
END;
