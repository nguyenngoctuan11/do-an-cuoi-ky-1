package com.example.back_end.service;

import com.example.back_end.dto.ReportDtos;
import com.example.back_end.model.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class ReportService {
    @PersistenceContext private EntityManager em;

    @Transactional(readOnly = true)
    public ReportDtos.StudentOverview studentOverview(Long userId) {
        ReportDtos.StudentOverview dto = new ReportDtos.StudentOverview();
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(
                        """
                                SELECT e.course_id,
                                       c.title AS courseName,
                                       c.slug AS courseSlug,
                                       COALESCE(lc.totalLessons, 0) AS totalLessons,
                                       COALESCE(cp.completedLessons, 0) AS completedLessons,
                                       qs.avgScore
                                FROM dbo.enrollments e
                                JOIN dbo.courses c ON c.id = e.course_id
                                LEFT JOIN (
                                    SELECT m.course_id, COUNT(l.id) AS totalLessons
                                    FROM dbo.modules m
                                    JOIN dbo.lessons l ON l.module_id = m.id
                                    GROUP BY m.course_id
                                ) lc ON lc.course_id = e.course_id
                                LEFT JOIN (
                                    SELECT e2.course_id, e2.user_id,
                                           SUM(CASE WHEN lp.completed_at IS NOT NULL OR lp.progress_percent >= 95 THEN 1 ELSE 0 END) AS completedLessons
                                    FROM dbo.enrollments e2
                                    JOIN dbo.modules m ON m.course_id = e2.course_id
                                    JOIN dbo.lessons l ON l.module_id = m.id
                                    LEFT JOIN dbo.lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = e2.user_id
                                    WHERE e2.user_id = :uid
                                    GROUP BY e2.course_id, e2.user_id
                                ) cp ON cp.course_id = e.course_id AND cp.user_id = e.user_id
                                LEFT JOIN (
                                    SELECT q.course_id, qa.user_id, AVG(CAST(qa.score AS FLOAT)) AS avgScore
                                    FROM dbo.quiz_attempts qa
                                    JOIN dbo.quizzes q ON q.id = qa.quiz_id
                                    WHERE qa.user_id = :uid AND qa.score IS NOT NULL
                                    GROUP BY q.course_id, qa.user_id
                                ) qs ON qs.course_id = e.course_id AND qs.user_id = e.user_id
                                WHERE e.user_id = :uid
                                ORDER BY e.start_at DESC
                                """)
                .setParameter("uid", userId)
                .getResultList();

        for (Object[] row : rows) {
            ReportDtos.StudentCourseOverview course = new ReportDtos.StudentCourseOverview();
            course.courseId = toLong(row[0]);
            course.courseName = str(row[1]);
            course.courseSlug = str(row[2]);
            course.totalLessons = toInt(row[3]);
            course.completedLessons = toInt(row[4]);
            course.progress = computePercent(course.completedLessons, course.totalLessons);
            course.avgScore = toDouble(row[5]);
            course.status = resolveStatus(course.progress, course.completedLessons);
            dto.courses.add(course);
        }
        return dto;
    }
    @Transactional(readOnly = true)
    public ReportDtos.StudentCourseDetail studentCourseDetail(Long userId, Long courseId) {
        Object[] info = (Object[]) em.createNativeQuery(
                        "SELECT c.title, c.slug FROM dbo.courses c WHERE c.id = :cid")
                .setParameter("cid", courseId)
                .getResultStream()
                .findFirst()
                .orElse(null);
        if (info == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found");
        }

        ReportDtos.StudentCourseDetail dto = new ReportDtos.StudentCourseDetail();
        dto.courseId = courseId;
        dto.courseName = str(info[0]);
        dto.courseSlug = str(info[1]);

        @SuppressWarnings("unchecked")
        List<Object[]> lessonRows = em.createNativeQuery(
                        """
                                SELECT l.id, l.title, m.title AS moduleTitle, lp.progress_percent, lp.completed_at, lp.updated_at
                                FROM dbo.lessons l
                                JOIN dbo.modules m ON m.id = l.module_id
                                LEFT JOIN dbo.lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = :uid
                                WHERE m.course_id = :cid
                                ORDER BY m.sort_order, l.sort_order, l.id
                                """)
                .setParameter("uid", userId)
                .setParameter("cid", courseId)
                .getResultList();

        dto.totalLessons = lessonRows.size();
        for (Object[] row : lessonRows) {
            ReportDtos.LessonProgressRow lesson = new ReportDtos.LessonProgressRow();
            lesson.lessonId = toLong(row[0]);
            lesson.lessonTitle = str(row[1]);
            lesson.moduleTitle = str(row[2]);
            lesson.progressPercent = toInteger(row[3]);
            lesson.completedAt = toDate(row[4]);
            lesson.updatedAt = toDate(row[5]);
            dto.lessons.add(lesson);
            if (Boolean.TRUE.equals(isCompleted(row[3], row[4]))) {
                dto.completedLessons++;
            }
        }
        dto.progress = computePercent(dto.completedLessons, dto.totalLessons);

        @SuppressWarnings("unchecked")
        List<Object[]> quizRows = em.createNativeQuery(
                        """
                                SELECT q.id, q.title,
                                       COUNT(qa.id) AS attemptCount,
                                       MAX(qa.score) AS bestScore,
                                       AVG(CAST(qa.score AS FLOAT)) AS avgScore,
                                       SUM(CASE WHEN qa.passed = 1 THEN 1 ELSE 0 END) AS passCount,
                                       MAX(COALESCE(qa.finished_at, qa.started_at)) AS lastAttempt
                                FROM dbo.quizzes q
                                LEFT JOIN dbo.quiz_attempts qa ON qa.quiz_id = q.id AND qa.user_id = :uid
                                WHERE q.course_id = :cid
                                GROUP BY q.id, q.title
                                ORDER BY q.id
                                """)
                .setParameter("uid", userId)
                .setParameter("cid", courseId)
                .getResultList();
        for (Object[] row : quizRows) {
            ReportDtos.QuizAggregate qa = new ReportDtos.QuizAggregate();
            qa.quizId = toLong(row[0]);
            qa.quizTitle = str(row[1]);
            qa.attemptCount = toInteger(row[2]);
            qa.bestScore = toDouble(row[3]);
            qa.averageScore = toDouble(row[4]);
            qa.passCount = toInteger(row[5]);
            qa.lastAttemptAt = toDate(row[6]);
            dto.quizzes.add(qa);
        }

        dto.avgScore = dto.quizzes.stream()
                .filter(q -> q.averageScore != null)
                .mapToDouble(q -> q.averageScore)
                .average()
                .orElse(Double.NaN);
        if (Double.isNaN(dto.avgScore)) dto.avgScore = null;

        dto.attempts.addAll(studentQuizHistory(userId, courseId));
        return dto;
    }

    @Transactional(readOnly = true)
    public List<ReportDtos.QuizHistoryItem> studentQuizHistory(Long userId) {
        return studentQuizHistory(userId, null);
    }

    @SuppressWarnings("unchecked")
    @Transactional(readOnly = true)
    private List<ReportDtos.QuizHistoryItem> studentQuizHistory(Long userId, Long courseFilter) {
        String filterSql = courseFilter != null ? "AND q.course_id = :cid" : "";
        List<Object[]> rows = em.createNativeQuery(
                        """
                                SELECT qa.id, qa.quiz_id, q.title, q.course_id, c.title AS courseTitle,
                                       qa.score, qa.passed, qa.status, qa.started_at, qa.finished_at,
                                       ROW_NUMBER() OVER (PARTITION BY qa.quiz_id, qa.user_id ORDER BY qa.started_at) AS attemptNo
                                FROM dbo.quiz_attempts qa
                                JOIN dbo.quizzes q ON q.id = qa.quiz_id
                                LEFT JOIN dbo.courses c ON c.id = q.course_id
                                WHERE qa.user_id = :uid %s
                                ORDER BY qa.started_at DESC
                                """.formatted(filterSql))
                .setParameter("uid", userId)
                .setParameter(courseFilter != null ? "cid" : "uid", courseFilter != null ? courseFilter : userId)
                .getResultList();
        List<ReportDtos.QuizHistoryItem> list = new ArrayList<>();
        for (Object[] row : rows) {
            ReportDtos.QuizHistoryItem item = new ReportDtos.QuizHistoryItem();
            item.attemptId = toLong(row[0]);
            item.quizId = toLong(row[1]);
            item.quizTitle = str(row[2]);
            item.courseId = toLong(row[3]);
            item.courseTitle = str(row[4]);
            item.score = toDouble(row[5]);
            item.passed = toBool(row[6]);
            item.status = str(row[7]);
            item.startedAt = toDate(row[8]);
            item.finishedAt = toDate(row[9]);
            item.attemptNo = row[10] != null ? ((Number) row[10]).intValue() : 1;
            list.add(item);
        }
        return list;
    }
    @Transactional(readOnly = true)
    public ReportDtos.TeacherOverview teacherOverview(User teacher) {
        ReportDtos.TeacherOverview dto = new ReportDtos.TeacherOverview();
        if (teacher == null) return dto;

        @SuppressWarnings("unchecked")
        List<Object[]> courses = em.createNativeQuery(
                        "SELECT c.id, c.title, c.slug FROM dbo.courses c WHERE c.created_by = :uid ORDER BY c.created_at DESC")
                .setParameter("uid", teacher.getId())
                .getResultList();
        List<Long> courseIds = courses.stream().map(r -> toLong(r[0])).collect(Collectors.toList());
        if (courseIds.isEmpty()) return dto;

        var summaries = courses.stream().collect(Collectors.toMap(
                r -> toLong(r[0]),
                r -> {
                    ReportDtos.TeacherCourseSummary s = new ReportDtos.TeacherCourseSummary();
                    s.courseId = toLong(r[0]);
                    s.courseName = str(r[1]);
                    s.courseSlug = str(r[2]);
                    return s;
                }
        ));

        @SuppressWarnings("unchecked")
        List<Object[]> completionRows = em.createNativeQuery(
                        """
                                SELECT stats.course_id,
                                       COUNT(*) AS studentCount,
                                       SUM(CASE WHEN stats.totalLessons > 0 AND stats.completedLessons >= stats.totalLessons THEN 1 ELSE 0 END) AS completedStudents,
                                       AVG(CASE WHEN stats.totalLessons > 0 THEN (stats.completedLessons * 100.0 / stats.totalLessons) ELSE 0 END) AS avgCompletion
                                FROM (
                                    SELECT e.course_id, e.user_id,
                                           COUNT(l.id) AS totalLessons,
                                           SUM(CASE WHEN lp.completed_at IS NOT NULL OR lp.progress_percent >= 95 THEN 1 ELSE 0 END) AS completedLessons
                                    FROM dbo.enrollments e
                                    JOIN dbo.modules m ON m.course_id = e.course_id
                                    JOIN dbo.lessons l ON l.module_id = m.id
                                    LEFT JOIN dbo.lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = e.user_id
                                    WHERE e.course_id IN :courseIds
                                    GROUP BY e.course_id, e.user_id
                                ) stats
                                GROUP BY stats.course_id
                                """)
                .setParameter("courseIds", courseIds)
                .getResultList();
        for (Object[] row : completionRows) {
            Long cid = toLong(row[0]);
            ReportDtos.TeacherCourseSummary s = summaries.get(cid);
            if (s == null) continue;
            s.studentCount = toLong(row[1]);
            s.completedStudents = toLong(row[2]);
            s.completionRate = zeroIfNaN(toDouble(row[3]));
        }

        @SuppressWarnings("unchecked")
        List<Object[]> scoreRows = em.createNativeQuery(
                        """
                                SELECT q.course_id, AVG(CAST(qa.score AS FLOAT)) AS avgScore
                                FROM dbo.quiz_attempts qa
                                JOIN dbo.quizzes q ON q.id = qa.quiz_id
                                WHERE q.course_id IN :courseIds AND qa.score IS NOT NULL
                                GROUP BY q.course_id
                                """)
                .setParameter("courseIds", courseIds)
                .getResultList();
        for (Object[] row : scoreRows) {
            ReportDtos.TeacherCourseSummary s = summaries.get(toLong(row[0]));
            if (s != null) {
                s.averageScore = toDouble(row[1]);
            }
        }

        dto.courses.addAll(summaries.values());
        dto.courseCount = dto.courses.size();
        dto.totalStudents = dto.courses.stream().mapToLong(c -> c.studentCount).sum();
        dto.averageCompletion = dto.courses.stream().mapToDouble(c -> c.completionRate).average().orElse(0);
        dto.averageScore = dto.courses.stream()
                .filter(c -> c.averageScore != null)
                .mapToDouble(c -> c.averageScore)
                .average()
                .orElse(Double.NaN);
        if (Double.isNaN(dto.averageScore)) dto.averageScore = null;
        return dto;
    }
    @Transactional(readOnly = true)
    public ReportDtos.TeacherCourseDetail teacherCourseDetail(User teacher, boolean isManager, Long courseId) {
        requireCourseAccess(teacher, isManager, courseId);

        ReportDtos.TeacherCourseDetail dto = new ReportDtos.TeacherCourseDetail();
        dto.summary = new ReportDtos.TeacherCourseSummary();
        @SuppressWarnings("unchecked")
        List<Object[]> header = em.createNativeQuery(
                        "SELECT c.id, c.title, c.slug FROM dbo.courses c WHERE c.id = :cid")
                .setParameter("cid", courseId)
                .getResultList();
        if (!header.isEmpty()) {
            dto.summary.courseId = toLong(header.get(0)[0]);
            dto.summary.courseName = str(header.get(0)[1]);
            dto.summary.courseSlug = str(header.get(0)[2]);
        }

        @SuppressWarnings("unchecked")
        List<Object[]> completionRows = em.createNativeQuery(
                        """
                                SELECT stats.user_id, u.full_name, u.email,
                                       stats.totalLessons, stats.completedLessons, stats.lastProgressAt,
                                       COALESCE(qs.avgScore, 0) AS avgScore, qs.lastAttemptAt
                                FROM (
                                    SELECT e.course_id, e.user_id,
                                           COUNT(l.id) AS totalLessons,
                                           SUM(CASE WHEN lp.completed_at IS NOT NULL OR lp.progress_percent >= 95 THEN 1 ELSE 0 END) AS completedLessons,
                                           MAX(lp.updated_at) AS lastProgressAt
                                    FROM dbo.enrollments e
                                    JOIN dbo.modules m ON m.course_id = e.course_id
                                    JOIN dbo.lessons l ON l.module_id = m.id
                                    LEFT JOIN dbo.lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = e.user_id
                                    WHERE e.course_id = :cid
                                    GROUP BY e.course_id, e.user_id
                                ) stats
                                JOIN dbo.users u ON u.id = stats.user_id
                                LEFT JOIN (
                                    SELECT qa.user_id, q.course_id,
                                           AVG(CAST(qa.score AS FLOAT)) AS avgScore,
                                           MAX(COALESCE(qa.finished_at, qa.started_at)) AS lastAttemptAt
                                    FROM dbo.quiz_attempts qa
                                    JOIN dbo.quizzes q ON q.id = qa.quiz_id
                                    WHERE q.course_id = :cid AND qa.score IS NOT NULL
                                    GROUP BY qa.user_id, q.course_id
                                ) qs ON qs.user_id = stats.user_id
                                ORDER BY u.full_name ASC
                                """)
                .setParameter("cid", courseId)
                .getResultList();

        long studentCount = 0;
        long completedStudents = 0;
        double sumCompletion = 0;

        for (Object[] row : completionRows) {
            ReportDtos.TeacherStudentRow student = new ReportDtos.TeacherStudentRow();
            student.studentId = toLong(row[0]);
            student.fullName = str(row[1]);
            student.email = str(row[2]);
            int totalLessons = toInt(row[3]);
            int completedLessons = toInt(row[4]);
            student.completionPercent = computePercent(completedLessons, totalLessons);
            student.averageScore = toDouble(row[6]);
            student.lastActivityAt = maxDate(toDate(row[5]), toDate(row[7]));
            student.status = resolveStatus(student.completionPercent, completedLessons);
            dto.students.add(student);
            studentCount++;
            sumCompletion += student.completionPercent;
            if ((totalLessons > 0 && completedLessons >= totalLessons) || student.completionPercent >= 99.5) {
                completedStudents++;
            }
        }
        dto.summary.studentCount = studentCount;
        dto.summary.completedStudents = completedStudents;
        dto.summary.completionRate = studentCount == 0 ? 0 : sumCompletion / studentCount;
        dto.summary.averageScore = dto.students.stream()
                .filter(s -> s.averageScore != null)
                .mapToDouble(s -> s.averageScore)
                .average()
                .orElse(Double.NaN);
        if (Double.isNaN(dto.summary.averageScore)) dto.summary.averageScore = null;

        // quizzes overview for this course
        @SuppressWarnings("unchecked")
        List<Object[]> quizRows = em.createNativeQuery(
                        """
                                SELECT q.id,
                                       q.title,
                                       COUNT(qa.id) AS attemptCount,
                                       MAX(qa.score) AS bestScore,
                                       AVG(CAST(qa.score AS FLOAT)) AS avgScore,
                                       SUM(CASE WHEN qa.passed = 1 THEN 1 ELSE 0 END) AS passCount,
                                       MAX(COALESCE(qa.finished_at, qa.started_at)) AS lastAttempt
                                FROM dbo.quizzes q
                                LEFT JOIN dbo.quiz_attempts qa ON qa.quiz_id = q.id
                                WHERE q.course_id = :cid
                                GROUP BY q.id, q.title
                                ORDER BY q.created_at DESC
                                """)
                .setParameter("cid", courseId)
                .getResultList();
        for (Object[] row : quizRows) {
            ReportDtos.QuizAggregate qa = new ReportDtos.QuizAggregate();
            qa.quizId = toLong(row[0]);
            qa.quizTitle = str(row[1]);
            qa.attemptCount = toInteger(row[2]);
            qa.bestScore = toDouble(row[3]);
            qa.averageScore = toDouble(row[4]);
            qa.passCount = toInteger(row[5]);
            qa.lastAttemptAt = toDate(row[6]);
            dto.quizzes.add(qa);
        }
        return dto;
    }
    @Transactional(readOnly = true)
    public ReportDtos.QuizReport quizReport(User teacher, boolean isManager, Long quizId) {
        Object[] meta = (Object[]) em.createNativeQuery(
                        """
                                SELECT q.id, q.title, c.id AS courseId, c.title AS courseTitle, c.created_by
                                FROM dbo.quizzes q
                                JOIN dbo.courses c ON c.id = q.course_id
                                WHERE q.id = :qid
                                """)
                .setParameter("qid", quizId)
                .getResultStream()
                .findFirst()
                .orElse(null);
        if (meta == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Quiz not found");
        }
        Long courseId = toLong(meta[2]);
        requireCourseAccess(teacher, isManager, courseId);

        ReportDtos.QuizReport dto = new ReportDtos.QuizReport();
        dto.quizId = toLong(meta[0]);
        dto.quizTitle = str(meta[1]);
        dto.courseId = courseId;
        dto.courseTitle = str(meta[3]);

        Object[] stats = (Object[]) em.createNativeQuery(
                        """
                                SELECT
                                    (SELECT COUNT(*) FROM dbo.enrollments e WHERE e.course_id = :cid) AS enrolled,
                                    (SELECT COUNT(DISTINCT qa.user_id) FROM dbo.quiz_attempts qa WHERE qa.quiz_id = :qid) AS attempted,
                                    AVG(CAST(qa.score AS FLOAT)) AS avgScore,
                                    MIN(qa.score) AS minScore,
                                    MAX(qa.score) AS maxScore
                                FROM dbo.quiz_attempts qa
                                WHERE qa.quiz_id = :qid AND qa.score IS NOT NULL
                                """)
                .setParameter("cid", courseId)
                .setParameter("qid", quizId)
                .getSingleResult();
        dto.enrolled = toLong(stats[0]);
        dto.attempted = toLong(stats[1]);
        dto.averageScore = toDouble(stats[2]);
        dto.minScore = toDouble(stats[3]);
        dto.maxScore = toDouble(stats[4]);

        Object[] buckets = (Object[]) em.createNativeQuery(
                        """
                                SELECT
                                    SUM(CASE WHEN qa.score < 40 THEN 1 ELSE 0 END) AS bucket1,
                                    SUM(CASE WHEN qa.score >= 40 AND qa.score < 70 THEN 1 ELSE 0 END) AS bucket2,
                                    SUM(CASE WHEN qa.score >= 70 AND qa.score < 90 THEN 1 ELSE 0 END) AS bucket3,
                                    SUM(CASE WHEN qa.score >= 90 THEN 1 ELSE 0 END) AS bucket4
                                FROM dbo.quiz_attempts qa
                                WHERE qa.quiz_id = :qid AND qa.score IS NOT NULL
                                """)
                .setParameter("qid", quizId)
                .getSingleResult();
        dto.distribution.put("0-3", toLong(buckets[0]));
        dto.distribution.put("4-6", toLong(buckets[1]));
        dto.distribution.put("7-8", toLong(buckets[2]));
        dto.distribution.put("9-10", toLong(buckets[3]));

        @SuppressWarnings("unchecked")
        List<Object[]> attempts = em.createNativeQuery(
                        """
                                SELECT TOP 200 qa.id, qa.quiz_id, q.title, qa.score, qa.passed, qa.status,
                                       qa.started_at, qa.finished_at,
                                       ROW_NUMBER() OVER (PARTITION BY qa.user_id ORDER BY qa.started_at) AS attemptNo,
                                       qa.user_id, u.full_name, u.email
                                FROM dbo.quiz_attempts qa
                                JOIN dbo.quizzes q ON q.id = qa.quiz_id
                                JOIN dbo.users u ON u.id = qa.user_id
                                WHERE qa.quiz_id = :qid
                                ORDER BY qa.started_at DESC
                                """)
                .setParameter("qid", quizId)
                .getResultList();
        for (Object[] row : attempts) {
            ReportDtos.QuizHistoryItem item = new ReportDtos.QuizHistoryItem();
            item.attemptId = toLong(row[0]);
            item.quizId = toLong(row[1]);
            item.quizTitle = str(row[2]);
            item.score = toDouble(row[3]);
            item.passed = toBool(row[4]);
            item.status = str(row[5]);
            item.startedAt = toDate(row[6]);
            item.finishedAt = toDate(row[7]);
            item.attemptNo = row[8] != null ? ((Number) row[8]).intValue() : 1;
            item.studentId = toLong(row[9]);
            item.studentName = str(row[10]);
            item.studentEmail = str(row[11]);
            dto.attempts.add(item);
        }
        return dto;
    }
    @Transactional(readOnly = true)
    public ReportDtos.AdminSummary adminSummary() {
        ReportDtos.AdminSummary dto = new ReportDtos.AdminSummary();

        Object[] totals = (Object[]) em.createNativeQuery(
                        """
                                SELECT
                                    (SELECT COUNT(DISTINCT u.id) FROM dbo.users u
                                        JOIN dbo.user_roles ur ON ur.user_id = u.id
                                        JOIN dbo.roles r ON r.id = ur.role_id
                                        WHERE LOWER(r.code) = 'student') AS students,
                                    (SELECT COUNT(DISTINCT u.id) FROM dbo.users u
                                        JOIN dbo.user_roles ur ON ur.user_id = u.id
                                        JOIN dbo.roles r ON r.id = ur.role_id
                                        WHERE LOWER(r.code) = 'teacher') AS teachers,
                                    (SELECT COUNT(*) FROM dbo.courses) AS courses,
                                    (SELECT COUNT(*) FROM dbo.quiz_attempts) AS quizAttempts,
                                    (SELECT COUNT(*) FROM dbo.lesson_progress WHERE completed_at IS NOT NULL OR progress_percent >= 95) AS lessonsCompleted,
                                    (SELECT COALESCE(SUM(p.amount), 0) FROM dbo.payments p WHERE p.status IN (N'succeeded', N'paid', N'PAID')) AS revenueTotal
                                """)
                .getSingleResult();
        dto.totals.students = toLong(totals[0]);
        dto.totals.teachers = toLong(totals[1]);
        dto.totals.courses = toLong(totals[2]);
        dto.totals.quizAttempts = toLong(totals[3]);
        dto.totals.lessonsCompleted = toLong(totals[4]);
        dto.totals.revenueTotal = toDouble(totals[5]) != null ? toDouble(totals[5]) : 0.0;

        dto.totals.activeStudents7d = activeStudentsSince(LocalDate.now(ZoneOffset.UTC).minusDays(7));
        dto.totals.avgCompletion = computeSystemCompletion();

        dto.topEnrollments.addAll(fetchTopEnrollmentCourses(5));
        dto.topCompletion.addAll(fetchTopCompletionCourses(5));
        dto.activeByDay.addAll(fetchActiveByDay(LocalDate.now(ZoneOffset.UTC).minusDays(14), LocalDate.now(ZoneOffset.UTC)));
        return dto;
    }

    @Transactional(readOnly = true)
    public ReportDtos.RevenueReport revenueReport(LocalDate from, LocalDate to) {
        LocalDate safeTo = to != null ? to : LocalDate.now(ZoneOffset.UTC);
        LocalDate safeFrom = from != null ? from : safeTo.minusDays(30);
        ReportDtos.RevenueReport dto = new ReportDtos.RevenueReport();
        dto.from = safeFrom;
        dto.to = safeTo;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(
                        """
                                SELECT CAST(COALESCE(p.paid_at, p.created_at) AS DATE) AS d, SUM(p.amount) AS revenue
                                FROM dbo.payments p
                                WHERE p.status IN (N'succeeded', N'paid', N'PAID')
                                  AND CAST(COALESCE(p.paid_at, p.created_at) AS DATE) BETWEEN :from AND :to
                                GROUP BY CAST(COALESCE(p.paid_at, p.created_at) AS DATE)
                                ORDER BY d
                                """)
                .setParameter("from", safeFrom)
                .setParameter("to", safeTo)
                .getResultList();
        double total = 0;
        for (Object[] row : rows) {
            ReportDtos.RevenueItem item = new ReportDtos.RevenueItem();
            item.date = toLocalDate(row[0]);
            item.amount = toDouble(row[1]) != null ? toDouble(row[1]) : 0;
            total += item.amount;
            dto.byDate.add(item);
        }
        dto.total = total;

        @SuppressWarnings("unchecked")
        List<Object[]> courseRows = em.createNativeQuery(
                        """
                                SELECT TOP 5 oi.item_id AS courseId, c.title,
                                       SUM(p.amount) AS revenue,
                                       COUNT(DISTINCT p.id) AS payments
                                FROM dbo.payments p
                                JOIN dbo.orders o ON o.id = p.order_id
                                JOIN dbo.order_items oi ON oi.order_id = o.id AND oi.item_type = N'course'
                                JOIN dbo.courses c ON c.id = oi.item_id
                                WHERE p.status IN (N'succeeded', N'paid', N'PAID')
                                  AND CAST(COALESCE(p.paid_at, p.created_at) AS DATE) BETWEEN :from AND :to
                                GROUP BY oi.item_id, c.title
                                ORDER BY revenue DESC
                                """)
                .setParameter("from", safeFrom)
                .setParameter("to", safeTo)
                .getResultList();
        for (Object[] row : courseRows) {
            ReportDtos.CourseRevenue cr = new ReportDtos.CourseRevenue();
            cr.courseId = toLong(row[0]);
            cr.courseTitle = str(row[1]);
            cr.revenue = toDouble(row[2]) != null ? toDouble(row[2]) : 0;
            cr.payments = toLong(row[3]);
            dto.topCourses.add(cr);
        }
        return dto;
    }
    @Transactional(readOnly = true)
    public ReportDtos.ActivityReport activityReport(LocalDate from, LocalDate to, String rangeLabel) {
        LocalDate safeTo = to != null ? to : LocalDate.now(ZoneOffset.UTC);
        LocalDate safeFrom = from != null ? from : safeTo.minusDays(30);
        ReportDtos.ActivityReport dto = new ReportDtos.ActivityReport();
        dto.range = rangeLabel != null ? rangeLabel : "last_30_days";

        dto.logins = activeStudentsSince(safeFrom);

        Object quizCount = em.createNativeQuery(
                        """
                                SELECT COUNT(*) FROM dbo.quiz_attempts
                                WHERE CAST(started_at AS DATE) BETWEEN :from AND :to
                                """)
                .setParameter("from", safeFrom)
                .setParameter("to", safeTo)
                .getSingleResult();
        dto.quizSubmissions = toLong(quizCount);

        Object lessonCount = em.createNativeQuery(
                        """
                                SELECT COUNT(*) FROM dbo.lesson_progress
                                WHERE (completed_at IS NOT NULL OR progress_percent >= 95)
                                  AND CAST(updated_at AS DATE) BETWEEN :from AND :to
                                """)
                .setParameter("from", safeFrom)
                .setParameter("to", safeTo)
                .getSingleResult();
        dto.lessonsCompleted = toLong(lessonCount);

        Object coursesCreated = em.createNativeQuery(
                        """
                                SELECT COUNT(*) FROM dbo.courses
                                WHERE CAST(created_at AS DATE) BETWEEN :from AND :to
                                """)
                .setParameter("from", safeFrom)
                .setParameter("to", safeTo)
                .getSingleResult();
        dto.coursesCreated = toLong(coursesCreated);
        return dto;
    }

    private void requireCourseAccess(User teacher, boolean manager, Long courseId) {
        if (courseId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "courseId is required");
        if (manager) return;
        if (teacher == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Unauthorized");
        Object creatorId = em.createNativeQuery("SELECT created_by FROM dbo.courses WHERE id = :cid")
                .setParameter("cid", courseId)
                .getResultStream()
                .findFirst()
                .orElse(null);
        if (creatorId == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found");
        Long createdBy = toLong(creatorId);
        if (!Objects.equals(createdBy, teacher.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not owner of the course");
        }
    }

    private long activeStudentsSince(LocalDate from) {
        Object result = em.createNativeQuery(
                        """
                                SELECT COUNT(DISTINCT recent.user_id) FROM (
                                    SELECT lp.user_id, lp.updated_at AS ts
                                    FROM dbo.lesson_progress lp
                                    WHERE CAST(lp.updated_at AS DATE) >= :from
                                    UNION
                                    SELECT qa.user_id, qa.started_at AS ts
                                    FROM dbo.quiz_attempts qa
                                    WHERE CAST(qa.started_at AS DATE) >= :from
                                    UNION
                                    SELECT e.user_id, e.start_at AS ts
                                    FROM dbo.enrollments e
                                    WHERE CAST(e.start_at AS DATE) >= :from
                                ) recent
                                """)
                .setParameter("from", from)
                .getSingleResult();
        return toLong(result);
    }

    private double computeSystemCompletion() {
        Object res = em.createNativeQuery(
                        """
                                SELECT AVG(CASE WHEN stats.totalLessons > 0 THEN (stats.completedLessons * 100.0 / stats.totalLessons) ELSE 0 END)
                                FROM (
                                    SELECT e.course_id, e.user_id,
                                           COUNT(l.id) AS totalLessons,
                                           SUM(CASE WHEN lp.completed_at IS NOT NULL OR lp.progress_percent >= 95 THEN 1 ELSE 0 END) AS completedLessons
                                    FROM dbo.enrollments e
                                    JOIN dbo.modules m ON m.course_id = e.course_id
                                    JOIN dbo.lessons l ON l.module_id = m.id
                                    LEFT JOIN dbo.lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = e.user_id
                                    GROUP BY e.course_id, e.user_id
                                ) stats
                                """)
                .getSingleResult();
        Double value = toDouble(res);
        return value != null ? value : 0.0;
    }
    @SuppressWarnings("unchecked")
    private List<ReportDtos.TopCourse> fetchTopEnrollmentCourses(int limit) {
        List<Object[]> rows = em.createNativeQuery(
                        """
                                SELECT TOP 5 c.id, c.title, COUNT(e.id) AS enrollments
                                FROM dbo.courses c
                                LEFT JOIN dbo.enrollments e ON e.course_id = c.id
                                GROUP BY c.id, c.title
                                ORDER BY enrollments DESC
                                """)
                .getResultList();
        List<ReportDtos.TopCourse> list = new ArrayList<>();
        for (Object[] row : rows) {
            ReportDtos.TopCourse tc = new ReportDtos.TopCourse();
            tc.courseId = toLong(row[0]);
            tc.courseName = str(row[1]);
            tc.enrollmentCount = toLong(row[2]);
            tc.value = (double) tc.enrollmentCount;
            list.add(tc);
        }
        return list;
    }

    @SuppressWarnings("unchecked")
    private List<ReportDtos.TopCourse> fetchTopCompletionCourses(int limit) {
        List<Object[]> rows = em.createNativeQuery(
                        """
                                SELECT TOP 5 stats.course_id, c.title,
                                       AVG(CASE WHEN stats.totalLessons > 0 THEN (stats.completedLessons * 100.0 / stats.totalLessons) ELSE 0 END) AS completionRate,
                                       COUNT(*) AS enrollments
                                FROM (
                                    SELECT e.course_id, e.user_id,
                                           COUNT(l.id) AS totalLessons,
                                           SUM(CASE WHEN lp.completed_at IS NOT NULL OR lp.progress_percent >= 95 THEN 1 ELSE 0 END) AS completedLessons
                                    FROM dbo.enrollments e
                                    JOIN dbo.modules m ON m.course_id = e.course_id
                                    JOIN dbo.lessons l ON l.module_id = m.id
                                    LEFT JOIN dbo.lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = e.user_id
                                    GROUP BY e.course_id, e.user_id
                                ) stats
                                JOIN dbo.courses c ON c.id = stats.course_id
                                GROUP BY stats.course_id, c.title
                                ORDER BY completionRate DESC
                                """)
                .getResultList();
        List<ReportDtos.TopCourse> list = new ArrayList<>();
        for (Object[] row : rows) {
            ReportDtos.TopCourse tc = new ReportDtos.TopCourse();
            tc.courseId = toLong(row[0]);
            tc.courseName = str(row[1]);
            tc.completionRate = toDouble(row[2]);
            tc.enrollmentCount = toLong(row[3]);
            tc.value = tc.completionRate;
            list.add(tc);
        }
        return list;
    }

    @SuppressWarnings("unchecked")
    private List<ReportDtos.TimeseriesPoint> fetchActiveByDay(LocalDate from, LocalDate to) {
        List<Object[]> rows = em.createNativeQuery(
                        """
                                SELECT CAST(recent.ts AS DATE) AS d, COUNT(DISTINCT recent.user_id) AS active
                                FROM (
                                    SELECT lp.user_id, lp.updated_at AS ts
                                    FROM dbo.lesson_progress lp
                                    WHERE CAST(lp.updated_at AS DATE) BETWEEN :from AND :to
                                    UNION
                                    SELECT qa.user_id, qa.started_at AS ts
                                    FROM dbo.quiz_attempts qa
                                    WHERE CAST(qa.started_at AS DATE) BETWEEN :from AND :to
                                ) recent
                                GROUP BY CAST(recent.ts AS DATE)
                                ORDER BY d
                                """)
                .setParameter("from", from)
                .setParameter("to", to)
                .getResultList();
        List<ReportDtos.TimeseriesPoint> list = new ArrayList<>();
        for (Object[] row : rows) {
            ReportDtos.TimeseriesPoint p = new ReportDtos.TimeseriesPoint();
            p.date = toLocalDate(row[0]);
            p.value = toLong(row[1]);
            list.add(p);
        }
        return list;
    }

    private static double computePercent(int completed, int total) {
        if (total <= 0) return 0;
        return Math.round((completed * 100.0) / total);
    }

    private static String resolveStatus(double progress, int completedLessons) {
        if (completedLessons <= 0 || progress <= 0) return "Chua hoc";
        if (progress >= 99.5) return "Hoan thanh";
        return "Dang hoc";
    }

    private static boolean toBool(Object value) {
        if (value == null) return false;
        if (value instanceof Boolean b) return b;
        if (value instanceof Number n) return n.intValue() != 0;
        return Boolean.parseBoolean(String.valueOf(value));
    }

    private static Long toLong(Object v) {
        if (v == null) return 0L;
        if (v instanceof Number n) return n.longValue();
        try {
            return Long.parseLong(String.valueOf(v));
        } catch (Exception e) {
            return 0L;
        }
    }

    private static Integer toInteger(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(String.valueOf(v));
        } catch (Exception e) {
            return null;
        }
    }

    private static int toInt(Object v) {
        Integer i = toInteger(v);
        return i == null ? 0 : i;
    }

    private static Double toDouble(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.doubleValue();
        try {
            return Double.parseDouble(String.valueOf(v));
        } catch (Exception e) {
            return null;
        }
    }

    private static String str(Object v) {
        return v == null ? null : String.valueOf(v);
    }

    private static LocalDateTime toDate(Object v) {
        if (v == null) return null;
        if (v instanceof LocalDateTime dt) return dt;
        if (v instanceof java.sql.Timestamp ts) return ts.toLocalDateTime();
        if (v instanceof java.util.Date d) return LocalDateTime.ofInstant(d.toInstant(), ZoneOffset.UTC);
        return null;
    }

    private static LocalDate toLocalDate(Object v) {
        if (v == null) return null;
        if (v instanceof LocalDate d) return d;
        if (v instanceof java.sql.Date d) return d.toLocalDate();
        if (v instanceof java.util.Date d) return d.toInstant().atZone(ZoneOffset.UTC).toLocalDate();
        if (v instanceof String s) {
            try {
                return LocalDate.parse(s);
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    private static LocalDateTime maxDate(LocalDateTime a, LocalDateTime b) {
        if (a == null) return b;
        if (b == null) return a;
        return a.isAfter(b) ? a : b;
    }

    private static boolean isCompleted(Object percentObj, Object completedAt) {
        if (completedAt != null) return true;
        Integer percent = toInteger(percentObj);
        return percent != null && percent >= 95;
    }

    private static double zeroIfNaN(Double value) {
        if (value == null) return 0;
        if (value.isNaN() || value.isInfinite()) return 0;
        return value;
    }
}
