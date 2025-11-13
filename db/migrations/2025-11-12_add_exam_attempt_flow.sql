-- Add richer exam attempt metadata & certificate artifacts

ALTER TABLE dbo.quizzes
ADD max_attempts INT NOT NULL CONSTRAINT df_quizzes_max_attempts DEFAULT 3,
    passing_score DECIMAL(5,2) NOT NULL CONSTRAINT df_quizzes_passing DEFAULT 70.00,
    attempt_window_start DATETIME2 NULL,
    attempt_window_end DATETIME2 NULL,
    instructions NVARCHAR(MAX) NULL,
    review_policy NVARCHAR(32) NOT NULL CONSTRAINT df_quizzes_review DEFAULT N'score_only',
    auto_submit_grace_sec INT NOT NULL CONSTRAINT df_quizzes_auto_grace DEFAULT 30,
    retake_cooldown_minutes INT NULL;

ALTER TABLE dbo.quizzes
ADD CONSTRAINT ck_quizzes_review CHECK (review_policy IN (N'score_only', N'full', N'none'));

ALTER TABLE dbo.quiz_attempts
ADD ends_at DATETIME2 NULL,
    time_limit_sec INT NULL,
    last_seen_question_id BIGINT NULL,
    seed INT NULL,
    auto_submitted BIT NOT NULL CONSTRAINT df_qattempts_auto DEFAULT 0,
    graded_at DATETIME2 NULL,
    passed BIT NULL,
    max_points DECIMAL(6,2) NULL,
    total_points DECIMAL(6,2) NULL,
    last_saved_at DATETIME2 NULL,
    status_reason NVARCHAR(64) NULL;

ALTER TABLE dbo.quiz_attempts
ADD CONSTRAINT fk_qattempts_last_question FOREIGN KEY (last_seen_question_id) REFERENCES dbo.questions(id);

ALTER TABLE dbo.quiz_answers
ADD marked_for_review BIT NOT NULL CONSTRAINT df_qanswers_marked DEFAULT 0;

CREATE TABLE dbo.quiz_attempt_items (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    attempt_id BIGINT NOT NULL,
    question_id BIGINT NOT NULL,
    display_order INT NOT NULL,
    option_order NVARCHAR(MAX) NULL,
    CONSTRAINT fk_qaitems_attempt FOREIGN KEY (attempt_id) REFERENCES dbo.quiz_attempts(id) ON DELETE CASCADE,
    CONSTRAINT fk_qaitems_question FOREIGN KEY (question_id) REFERENCES dbo.questions(id) ON DELETE CASCADE,
    CONSTRAINT uq_qaitems UNIQUE (attempt_id, question_id)
);

CREATE TABLE dbo.course_certificates (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    course_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    attempt_id BIGINT NULL,
    issued_at DATETIME2 NOT NULL CONSTRAINT df_certificates_issued DEFAULT GETUTCDATE(),
    CONSTRAINT fk_cert_course FOREIGN KEY (course_id) REFERENCES dbo.courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_cert_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_cert_attempt FOREIGN KEY (attempt_id) REFERENCES dbo.quiz_attempts(id),
    CONSTRAINT uq_cert_course_user UNIQUE (course_id, user_id)
);
