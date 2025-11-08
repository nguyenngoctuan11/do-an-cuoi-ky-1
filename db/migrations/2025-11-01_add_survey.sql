-- Simple survey schema for learning path recommendation
IF OBJECT_ID('dbo.survey_questions','U') IS NULL
BEGIN
  CREATE TABLE dbo.survey_questions (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    code NVARCHAR(64) NOT NULL UNIQUE,
    text NVARCHAR(512) NOT NULL,
    sort_order INT NOT NULL CONSTRAINT df_sq_sort DEFAULT 0
  );
END

IF OBJECT_ID('dbo.survey_options','U') IS NULL
BEGIN
  CREATE TABLE dbo.survey_options (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    question_id BIGINT NOT NULL,
    code NVARCHAR(64) NOT NULL,
    text NVARCHAR(255) NOT NULL,
    weight_tag_slug NVARCHAR(128) NULL,
    weight_level NVARCHAR(16) NULL,
    sort_order INT NOT NULL CONSTRAINT df_so_sort DEFAULT 0,
    CONSTRAINT fk_so_question FOREIGN KEY (question_id) REFERENCES dbo.survey_questions(id) ON DELETE CASCADE
  );
  CREATE INDEX ix_so_question ON dbo.survey_options(question_id);
END

IF OBJECT_ID('dbo.survey_submissions','U') IS NULL
BEGIN
  CREATE TABLE dbo.survey_submissions (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NULL,
    answers_json NVARCHAR(MAX) NOT NULL,
    result_json NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT df_ss_created DEFAULT GETUTCDATE(),
    CONSTRAINT fk_ss_user FOREIGN KEY (user_id) REFERENCES dbo.users(id)
  );
END

-- Seed basic questions/options if empty
IF NOT EXISTS(SELECT 1 FROM dbo.survey_questions)
BEGIN
  INSERT INTO dbo.survey_questions(code, text, sort_order)
  VALUES (N'area', N'Bạn quan tâm mảng nào?', 1),
         (N'level', N'Bạn đang ở trình độ nào?', 2);

  DECLARE @q1 BIGINT = (SELECT id FROM dbo.survey_questions WHERE code=N'area');
  DECLARE @q2 BIGINT = (SELECT id FROM dbo.survey_questions WHERE code=N'level');

  INSERT INTO dbo.survey_options(question_id, code, text, weight_tag_slug, sort_order)
  VALUES (@q1, N'area_frontend', N'Front-end (Web UI)', N'frontend', 1),
         (@q1, N'area_backend', N'Back-end (API/DB)', N'backend', 2),
         (@q1, N'area_data', N'Data/AI', N'data', 3),
         (@q1, N'area_english', N'Tiếng Anh', N'english', 4);

  INSERT INTO dbo.survey_options(question_id, code, text, weight_level, sort_order)
  VALUES (@q2, N'level_beginner', N'Beginner', N'beginner', 1),
         (@q2, N'level_intermediate', N'Intermediate', N'intermediate', 2),
         (@q2, N'level_advanced', N'Advanced', N'advanced', 3);
END

