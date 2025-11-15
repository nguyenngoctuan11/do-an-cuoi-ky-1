-- Expand allowed course level values to support TOEIC-style ranges
IF EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = 'ck_courses_level'
)
BEGIN
  ALTER TABLE dbo.courses DROP CONSTRAINT ck_courses_level;
END;

ALTER TABLE dbo.courses ADD CONSTRAINT ck_courses_level CHECK (
  level IN (
    N'beginner',
    N'intermediate',
    N'advanced',
    N'350+',
    N'450+',
    N'550+',
    N'650+',
    N'750+',
    N'850+',
    N'950+'
  )
);
