-- Blog/announcement posts authored by teachers/managers/admins
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
    updated_at DATETIME2 NOT NULL CONSTRAINT df_posts_updated DEFAULT SYSUTCDATETIME()
);

ALTER TABLE dbo.posts
    ADD CONSTRAINT fk_posts_author FOREIGN KEY (author_id) REFERENCES dbo.users(id);

ALTER TABLE dbo.posts
    ADD CONSTRAINT fk_posts_course FOREIGN KEY (course_id) REFERENCES dbo.courses(id);

CREATE INDEX idx_posts_status ON dbo.posts(status);
CREATE INDEX idx_posts_course ON dbo.posts(course_id);
