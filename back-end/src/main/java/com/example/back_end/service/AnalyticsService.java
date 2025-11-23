package com.example.back_end.service;

import com.example.back_end.dto.AnalyticsDtos;
import com.example.back_end.model.CourseAnalytics;
import com.example.back_end.model.User;
import com.example.back_end.repository.CourseAnalyticsRepository;
import com.example.back_end.repository.UserRepository;
import com.example.back_end.repository.projection.ManagerCourseAnalyticsProjection;
import com.example.back_end.repository.projection.ManagerCourseTotalsProjection;
import com.example.back_end.repository.projection.TeacherCourseAnalyticsProjection;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class AnalyticsService {
    private final CourseAnalyticsRepository analyticsRepository;
    private final UserRepository userRepository;
    @PersistenceContext
    private EntityManager em;

    public AnalyticsService(CourseAnalyticsRepository analyticsRepository, UserRepository userRepository) {
        this.analyticsRepository = analyticsRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void trackCourseView(Long courseId) {
        if (courseId == null) return;
        CourseAnalytics analytics = analyticsRepository.findById(courseId).orElseGet(() -> new CourseAnalytics(courseId));
        analytics.setCourseId(courseId);
        analytics.setViewCount(safeIncrement(analytics.getViewCount()));
        LocalDateTime now = nowUtc();
        analytics.setLastViewedAt(now);
        analytics.setUpdatedAt(now);
        if (analytics.getPaymentCount() == null) {
            analytics.setPaymentCount(0L);
        }
        analyticsRepository.save(analytics);
    }

    @Transactional
    public void trackCoursePayment(Long courseId) {
        if (courseId == null) return;
        CourseAnalytics analytics = analyticsRepository.findById(courseId).orElseGet(() -> new CourseAnalytics(courseId));
        analytics.setCourseId(courseId);
        analytics.setPaymentCount(safeIncrement(analytics.getPaymentCount()));
        LocalDateTime now = nowUtc();
        analytics.setLastPaymentAt(now);
        analytics.setUpdatedAt(now);
        if (analytics.getViewCount() == null) {
            analytics.setViewCount(0L);
        }
        analyticsRepository.save(analytics);
    }

    @Transactional(readOnly = true)
    public AnalyticsDtos.TeacherSummary buildTeacherSummary(String email) {
        User teacher = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new IllegalArgumentException("KhA'ng tA�m th���y gi���ng viA�n"));
        List<TeacherCourseAnalyticsProjection> rows = analyticsRepository.findTeacherCourseStats(teacher.getId());
        AnalyticsDtos.TeacherSummary dto = new AnalyticsDtos.TeacherSummary();
        dto.totalCourses = rows.size();
        for (TeacherCourseAnalyticsProjection row : rows) {
            AnalyticsDtos.CourseMetric metric = new AnalyticsDtos.CourseMetric();
            metric.id = row.getId();
            metric.title = row.getTitle();
            metric.slug = row.getSlug();
            metric.status = row.getStatus();
            metric.approvalStatus = row.getApprovalStatus();
            metric.viewCount = safeLong(row.getViewCount());
            metric.paymentCount = safeLong(row.getPaymentCount());
            metric.lastViewedAt = row.getLastViewedAt();
            metric.lastPaymentAt = row.getLastPaymentAt();
            dto.courses.add(metric);

            dto.totalViews += metric.viewCount;
            dto.totalPayments += metric.paymentCount;
            if ("published".equalsIgnoreCase(metric.status)) dto.publishedCourses++;
            if ("pending".equalsIgnoreCase(metric.approvalStatus)) dto.pendingCourses++;
        }
        dto.quizzes.addAll(loadTeacherQuizzes(teacher.getId()));
        dto.totalQuizzes = dto.quizzes.size();
        return dto;
    }

    @Transactional(readOnly = true)
    public AnalyticsDtos.ManagerCourseReport buildManagerReport(int page, int size, String keyword, String teacherEmail) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        int offset = safePage * safeSize;
        String normalizedKeyword = normalizeKeyword(keyword);
        String keywordLike = normalizedKeyword != null ? "%" + normalizedKeyword + "%" : null;
        String normalizedTeacher = normalizeEmail(teacherEmail);

        List<ManagerCourseAnalyticsProjection> rows =
                analyticsRepository.findManagerCourseStats(keywordLike, normalizedTeacher, offset, safeSize);
        ManagerCourseTotalsProjection totals = analyticsRepository.aggregateManagerTotals(keywordLike, normalizedTeacher);

        AnalyticsDtos.ManagerCourseReport dto = new AnalyticsDtos.ManagerCourseReport();
        dto.page = safePage;
        dto.size = safeSize;
        dto.courseCount = totals != null && totals.getCourseCount() != null ? totals.getCourseCount() : 0L;
        dto.totalViews = totals != null && totals.getTotalViews() != null ? totals.getTotalViews() : 0L;
        dto.totalPayments = totals != null && totals.getTotalPayments() != null ? totals.getTotalPayments() : 0L;

        for (ManagerCourseAnalyticsProjection row : rows) {
            AnalyticsDtos.CourseMetric metric = new AnalyticsDtos.CourseMetric();
            metric.id = row.getId();
            metric.title = row.getTitle();
            metric.slug = row.getSlug();
            metric.status = row.getStatus();
            metric.approvalStatus = row.getApprovalStatus();
            metric.viewCount = safeLong(row.getViewCount());
            metric.paymentCount = safeLong(row.getPaymentCount());
            metric.lastViewedAt = row.getLastViewedAt();
            metric.lastPaymentAt = row.getLastPaymentAt();
            metric.teacherName = row.getTeacherName();
            metric.teacherEmail = row.getTeacherEmail();
            dto.items.add(metric);
        }
        dto.quizzes.addAll(loadManagerQuizzes(keywordLike, normalizedTeacher, offset, safeSize));
        QuizTotals quizTotals = loadManagerQuizTotals(keywordLike, normalizedTeacher);
        dto.quizCount = quizTotals.count;
        dto.totalQuizAttempts = quizTotals.attempts;

        return dto;
    }

    private static Long safeIncrement(Long value) {
        long current = value == null ? 0L : value;
        return current + 1L;
    }

    private static long safeLong(Long value) {
        return value == null ? 0L : value;
    }

    private static LocalDateTime nowUtc() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null) return null;
        String trimmed = keyword.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeEmail(String email) {
        if (email == null) return null;
        String trimmed = email.trim();
        return trimmed.isEmpty() ? null : trimmed.toLowerCase(Locale.ROOT);
    }

    private List<AnalyticsDtos.QuizMetric> loadTeacherQuizzes(Long creatorId) {
        final String sql = """
                SELECT q.id, q.title, q.course_id, c.slug, c.title AS courseTitle,
                       (SELECT COUNT(*) FROM dbo.questions WHERE quiz_id = q.id) AS questionCount,
                       (SELECT COUNT(*) FROM dbo.quiz_attempts WHERE quiz_id = q.id) AS attemptCount,
                       (SELECT MAX(finished_at) FROM dbo.quiz_attempts WHERE quiz_id = q.id) AS lastAttemptAt,
                       q.created_at
                FROM dbo.quizzes q
                JOIN dbo.courses c ON c.id = q.course_id
                WHERE c.created_by = :creatorId
                ORDER BY q.created_at DESC
                """;
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("creatorId", creatorId)
                .getResultList();
        List<AnalyticsDtos.QuizMetric> quizzes = new ArrayList<>();
        for (Object[] row : rows) {
            quizzes.add(mapQuizMetric(row, false));
        }
        return quizzes;
    }

    private List<AnalyticsDtos.QuizMetric> loadManagerQuizzes(String keyword, String teacherEmail, int offset, int limit) {
        final String sql = """
                SELECT q.id, q.title, q.course_id, c.slug, c.title AS courseTitle,
                       (SELECT COUNT(*) FROM dbo.questions WHERE quiz_id = q.id) AS questionCount,
                       (SELECT COUNT(*) FROM dbo.quiz_attempts WHERE quiz_id = q.id) AS attemptCount,
                       (SELECT MAX(finished_at) FROM dbo.quiz_attempts WHERE quiz_id = q.id) AS lastAttemptAt,
                       q.created_at,
                       u.full_name AS teacherName,
                       u.email AS teacherEmail
                FROM dbo.quizzes q
                JOIN dbo.courses c ON c.id = q.course_id
                JOIN dbo.users u ON u.id = c.created_by
                WHERE (:teacherEmail IS NULL OR LOWER(u.email) = LOWER(:teacherEmail))
                  AND (:keyword IS NULL OR c.title LIKE :keyword OR c.slug LIKE :keyword
                       OR q.title LIKE :keyword OR u.full_name LIKE :keyword OR u.email LIKE :keyword)
                ORDER BY q.created_at DESC
                OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
                """;
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("teacherEmail", teacherEmail)
                .setParameter("keyword", keyword)
                .setParameter("offset", offset)
                .setParameter("limit", limit)
                .getResultList();
        List<AnalyticsDtos.QuizMetric> quizzes = new ArrayList<>();
        for (Object[] row : rows) {
            quizzes.add(mapQuizMetric(row, true));
        }
        return quizzes;
    }

    private QuizTotals loadManagerQuizTotals(String keyword, String teacherEmail) {
        final String sql = """
                SELECT COUNT(*) AS quizCount,
                       SUM(stats.attemptCount) AS totalAttempts
                FROM (
                    SELECT q.id,
                           (SELECT COUNT(*) FROM dbo.quiz_attempts qa WHERE qa.quiz_id = q.id) AS attemptCount
                    FROM dbo.quizzes q
                    JOIN dbo.courses c ON c.id = q.course_id
                    JOIN dbo.users u ON u.id = c.created_by
                    WHERE (:teacherEmail IS NULL OR LOWER(u.email) = LOWER(:teacherEmail))
                      AND (:keyword IS NULL OR c.title LIKE :keyword OR c.slug LIKE :keyword
                           OR q.title LIKE :keyword OR u.full_name LIKE :keyword OR u.email LIKE :keyword)
                ) stats
                """;
        Object[] result = (Object[]) em.createNativeQuery(sql)
                .setParameter("teacherEmail", teacherEmail)
                .setParameter("keyword", keyword)
                .getSingleResult();
        QuizTotals totals = new QuizTotals();
        Long quizCount = toLong(result[0]);
        Long attempts = toLong(result[1]);
        totals.count = quizCount != null ? quizCount : 0L;
        totals.attempts = attempts != null ? attempts : 0L;
        return totals;
    }

    private AnalyticsDtos.QuizMetric mapQuizMetric(Object[] row, boolean includeTeacher) {
        int idx = 0;
        AnalyticsDtos.QuizMetric metric = new AnalyticsDtos.QuizMetric();
        metric.id = toLong(row[idx++]);
        metric.title = str(row[idx++]);
        metric.courseId = toLong(row[idx++]);
        metric.courseSlug = str(row[idx++]);
        metric.courseTitle = str(row[idx++]);
        metric.questionCount = toInteger(row[idx++]);
        metric.attemptCount = safeLong(toLong(row[idx++]));
        metric.lastAttemptAt = toDate(row[idx++]);
        metric.createdAt = toDate(row[idx++]);
        if (includeTeacher) {
            metric.teacherName = str(row[idx++]);
            metric.teacherEmail = str(row[idx++]);
        }
        return metric;
    }

    private static Long toLong(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) return n.longValue();
        return Long.valueOf(String.valueOf(value));
    }

    private static Integer toInteger(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) return n.intValue();
        return Integer.valueOf(String.valueOf(value));
    }

    private static LocalDateTime toDate(Object value) {
        if (value == null) return null;
        if (value instanceof LocalDateTime dt) return dt;
        if (value instanceof java.sql.Timestamp ts) return ts.toLocalDateTime();
        if (value instanceof java.util.Date d) return LocalDateTime.ofInstant(d.toInstant(), ZoneOffset.UTC);
        return null;
    }

    private static String str(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    @Transactional(readOnly = true)
    public List<AnalyticsDtos.TeacherOption> listTeacherOptions(String keyword) {
        String likeKeyword = normalizeKeyword(keyword);
        if (likeKeyword != null) {
            likeKeyword = "%" + likeKeyword + "%";
        }
        final String sql = """
                SELECT u.id, u.full_name, u.email,
                       (SELECT COUNT(*) FROM dbo.courses c WHERE c.created_by = u.id) AS courseCount,
                       (SELECT COUNT(*) FROM dbo.quizzes q JOIN dbo.courses c ON c.id = q.course_id WHERE c.created_by = u.id) AS quizCount
                FROM dbo.users u
                WHERE EXISTS (
                    SELECT 1 FROM dbo.user_roles ur
                    JOIN dbo.roles r ON r.id = ur.role_id
                    WHERE ur.user_id = u.id AND r.name = 'TEACHER'
                )
                  AND (:keyword IS NULL OR u.full_name LIKE :keyword OR u.email LIKE :keyword)
                ORDER BY u.full_name ASC
                """;
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("keyword", likeKeyword)
                .getResultList();
        List<AnalyticsDtos.TeacherOption> options = new ArrayList<>();
        for (Object[] row : rows) {
            AnalyticsDtos.TeacherOption opt = new AnalyticsDtos.TeacherOption();
            opt.id = toLong(row[0]);
            opt.fullName = str(row[1]);
            opt.email = str(row[2]);
            opt.courseCount = safeLong(toLong(row[3]));
            opt.quizCount = safeLong(toLong(row[4]));
            options.add(opt);
        }
        return options;
    }

    private static class QuizTotals {
        long count;
        long attempts;
    }
}
