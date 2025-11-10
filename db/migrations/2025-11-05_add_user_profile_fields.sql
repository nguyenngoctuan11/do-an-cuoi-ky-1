-- Add extended profile fields and basic security flags for users
ALTER TABLE dbo.users ADD username NVARCHAR(64) NULL;
ALTER TABLE dbo.users ADD bio NVARCHAR(2000) NULL;
ALTER TABLE dbo.users ADD two_factor_enabled BIT NOT NULL CONSTRAINT df_users_two_factor DEFAULT 0;

-- Ensure usernames remain unique for future updates
CREATE UNIQUE INDEX uq_users_username ON dbo.users(username) WHERE username IS NOT NULL;
