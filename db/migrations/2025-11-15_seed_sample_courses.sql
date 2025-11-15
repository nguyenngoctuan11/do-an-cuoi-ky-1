/*
  Seed 50 demo courses so QA can test search/filter & catalog screens.
  Run on SQL Server AFTER schema + base data exist.
*/
SET NOCOUNT ON;

BEGIN TRAN;

DECLARE @teacherEmail NVARCHAR(255) = N'seed.teacher@lms.dev';
DECLARE @teacherRoleId INT;
DECLARE @teacherId BIGINT;

-- Ensure TEACHER role exists
SELECT @teacherRoleId = id FROM dbo.roles WHERE code = N'TEACHER';
IF @teacherRoleId IS NULL
BEGIN
  INSERT INTO dbo.roles(code, name) VALUES (N'TEACHER', N'Giảng viên');
  SET @teacherRoleId = SCOPE_IDENTITY();
END

-- Ensure demo teacher account exists (password hash = "password")
SELECT @teacherId = id FROM dbo.users WHERE email = @teacherEmail;
IF @teacherId IS NULL
BEGIN
  INSERT INTO dbo.users (email, password_hash, full_name, avatar_url, username, bio, status)
  VALUES (
    @teacherEmail,
    N'$2a$10$Dow1ShUMHbOWcZH/5Li.yOt38DSHLVYRIlnSRrped1IovnEwlHGhG',
    N'Giảng viên Seed',
    N'https://i.pravatar.cc/150?img=68',
    N'demo.teacher',
    N'Tài khoản seed phục vụ kiểm thử dữ liệu khóa học.',
    N'active'
  );
  SET @teacherId = SCOPE_IDENTITY();
END

IF NOT EXISTS (SELECT 1 FROM dbo.user_roles WHERE user_id = @teacherId AND role_id = @teacherRoleId)
BEGIN
  INSERT INTO dbo.user_roles(user_id, role_id) VALUES (@teacherId, @teacherRoleId);
END

-- Clean up previous seed runs
DELETE FROM dbo.courses WHERE slug LIKE 'seed-course-%';

;WITH seeded AS (
  SELECT TOP (50)
    ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n
  FROM sys.all_objects
)
INSERT INTO dbo.courses (title, slug, short_desc, long_desc, language, level, thumbnail_url, status, price, is_free, publish_at, created_by)
SELECT
  CONCAT(N'Bộ kĩ năng tiếng Anh #', n) AS title,
  CONCAT('seed-course-', RIGHT('000' + CAST(n AS NVARCHAR(4)), 3)) AS slug,
  CONCAT(N'Khoá seed số ', n, N' tập trung luyện nghe, nói và từ vựng ứng dụng.') AS short_desc,
  CONCAT(
    N'Thử nghiệm lộ trình toàn diện với mentor: module đọc hiểu, luyện nói AI và bài tập ngữ pháp. Mức độ bài: ',
    CASE ((n - 1) % 7)
      WHEN 0 THEN N'350+'
      WHEN 1 THEN N'450+'
      WHEN 2 THEN N'550+'
      WHEN 3 THEN N'650+'
      WHEN 4 THEN N'750+'
      WHEN 5 THEN N'850+'
      ELSE N'950+'
    END,
    N'.'
  ) AS long_desc,
  CASE WHEN n % 5 = 0 THEN N'en' ELSE N'vi' END AS language,
  CASE
    WHEN n % 10 = 0 THEN N'beginner'
    WHEN n % 10 = 1 THEN N'intermediate'
    WHEN n % 10 = 2 THEN N'advanced'
    WHEN (n - 1) % 7 = 0 THEN N'350+'
    WHEN (n - 1) % 7 = 1 THEN N'450+'
    WHEN (n - 1) % 7 = 2 THEN N'550+'
    WHEN (n - 1) % 7 = 3 THEN N'650+'
    WHEN (n - 1) % 7 = 4 THEN N'750+'
    WHEN (n - 1) % 7 = 5 THEN N'850+'
    ELSE N'950+'
  END AS level,
  CONCAT('https://picsum.photos/seed/course-', n, '/640/360') AS thumbnail_url,
  CASE WHEN n % 3 = 0 THEN N'published' ELSE N'draft' END AS status,
  CASE WHEN n % 4 = 0 THEN CAST(450000 + (n * 25000) AS DECIMAL(12,2)) ELSE NULL END AS price,
  CASE WHEN n % 4 = 0 THEN 0 ELSE 1 END AS is_free,
  CASE WHEN n % 3 = 0 THEN DATEADD(DAY, -n, GETUTCDATE()) ELSE NULL END AS publish_at,
  @teacherId AS created_by
FROM seeded
ORDER BY n;

PRINT 'Đã seed 50 khóa học demo với slug seed-course-xxx';

COMMIT TRAN;
