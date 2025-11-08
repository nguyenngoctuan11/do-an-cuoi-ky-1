-- Email OTP table for registration verification
IF OBJECT_ID('dbo.email_otps','U') IS NULL
BEGIN
  CREATE TABLE dbo.email_otps (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    email NVARCHAR(255) NOT NULL,
    code NVARCHAR(16) NOT NULL,
    purpose NVARCHAR(32) NOT NULL,
    payload NVARCHAR(MAX) NULL,
    expires_at DATETIME2 NOT NULL,
    consumed_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT df_email_otps_created DEFAULT GETUTCDATE()
  );
  CREATE INDEX ix_email_otps_lookup ON dbo.email_otps(email, purpose, code) INCLUDE(expires_at, consumed_at);
END

