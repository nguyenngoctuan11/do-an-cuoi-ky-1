-- Add course approval workflow columns
ALTER TABLE dbo.courses ADD approval_status NVARCHAR(16) NULL;
ALTER TABLE dbo.courses ADD submitted_at DATETIME2 NULL;
ALTER TABLE dbo.courses ADD approved_at DATETIME2 NULL;
ALTER TABLE dbo.courses ADD approved_by BIGINT NULL;
ALTER TABLE dbo.courses ADD CONSTRAINT fk_courses_approved_by FOREIGN KEY (approved_by) REFERENCES dbo.users(id);

-- Optional check for approval_status values
ALTER TABLE dbo.courses ADD CONSTRAINT ck_courses_approval_status CHECK (approval_status IN (N'draft', N'pending', N'approved', N'rejected'));

