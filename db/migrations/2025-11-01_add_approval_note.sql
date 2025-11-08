-- Add approval_note column if missing (SQL Server)
IF COL_LENGTH('dbo.courses', 'approval_note') IS NULL
BEGIN
    ALTER TABLE dbo.courses ADD approval_note NVARCHAR(1000) NULL;
END

