-- Create learning path tables if missing
IF OBJECT_ID('dbo.learning_paths','U') IS NULL
BEGIN
  CREATE TABLE dbo.learning_paths (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NULL,
    created_by BIGINT NOT NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT df_lpaths_created DEFAULT GETUTCDATE(),
    CONSTRAINT fk_lpaths_creator FOREIGN KEY (created_by) REFERENCES dbo.users(id)
  );
END

IF OBJECT_ID('dbo.learning_path_items','U') IS NULL
BEGIN
  CREATE TABLE dbo.learning_path_items (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    path_id BIGINT NOT NULL,
    item_type NVARCHAR(16) NOT NULL,
    item_id BIGINT NOT NULL,
    sort_order INT NOT NULL CONSTRAINT df_lpi_sort DEFAULT 0,
    prerequisite_item_id BIGINT NULL,
    CONSTRAINT ck_lpi_type CHECK (item_type IN (N'course')),
    CONSTRAINT fk_lpi_path FOREIGN KEY (path_id) REFERENCES dbo.learning_paths(id) ON DELETE CASCADE
  );
  CREATE INDEX ix_lpi_path_sort ON dbo.learning_path_items(path_id, sort_order);
END

