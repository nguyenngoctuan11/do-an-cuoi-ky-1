package com.example.back_end.service;

import com.example.back_end.dto.StudentDtos;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.List;
import java.util.Objects;

@Service
public class StudentProgressService {

    private static final Logger log = LoggerFactory.getLogger(StudentProgressService.class);

    @PersistenceContext
    private EntityManager em;

    public Long resolveCourseId(String key) {
        if (key == null || key.isBlank()) return null;
        try {
            return Long.parseLong(key.trim());
        } catch (NumberFormatException ignore) {
            List<?> rows = em.createNativeQuery("SELECT id FROM dbo.courses WHERE slug = :slug")
                    .setParameter("slug", key).getResultList();
            if (rows.isEmpty()) return null;
            return ((Number) rows.get(0)).longValue();
        }
    }

    public StudentDtos.CourseProgress loadCourseProgress(Long userId, String courseKey) {
        Long courseId = resolveCourseId(courseKey);
        if (courseId == null) {
            log.warn("Course key '{}' not found for user {}. Returning default progress.", courseKey, userId);
            return defaultProgress(courseKey);
        }
        return loadCourseProgressById(userId, courseId);
    }

    public StudentDtos.CourseProgress loadCourseProgressById(Long userId, Long courseId) {
        Object slugObj = em.createNativeQuery("SELECT slug FROM dbo.courses WHERE id = :cid")
                .setParameter("cid", courseId).getResultStream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy khóa học"));
        String slug = Objects.toString(slugObj, null);

        Number totalLessons = (Number) em.createNativeQuery(
                        "SELECT COUNT(*) FROM dbo.lessons l JOIN dbo.modules m ON l.module_id = m.id WHERE m.course_id = :cid")
                .setParameter("cid", courseId).getSingleResult();

        Number completedLessons = (Number) em.createNativeQuery(
                        "SELECT COUNT(*) FROM dbo.lesson_progress lp " +
                                "JOIN dbo.lessons l ON lp.lesson_id = l.id " +
                                "JOIN dbo.modules m ON l.module_id = m.id " +
                                "WHERE lp.user_id = :uid AND m.course_id = :cid AND lp.progress_percent >= 100")
                .setParameter("uid", userId)
                .setParameter("cid", courseId)
                .getSingleResult();

        @SuppressWarnings("unchecked")
        List<Number> completedIds = em.createNativeQuery(
                        "SELECT lp.lesson_id FROM dbo.lesson_progress lp " +
                                "JOIN dbo.lessons l ON lp.lesson_id = l.id " +
                                "JOIN dbo.modules m ON l.module_id = m.id " +
                                "WHERE lp.user_id = :uid AND m.course_id = :cid AND lp.progress_percent >= 100")
                .setParameter("uid", userId)
                .setParameter("cid", courseId)
                .getResultList();

        StudentDtos.CourseProgress progress = new StudentDtos.CourseProgress();
        progress.courseId = courseId;
        progress.courseSlug = slug;
        progress.totalLessons = totalLessons == null ? 0 : totalLessons.intValue();
        progress.completedLessons = completedLessons == null ? 0 : completedLessons.intValue();
        progress.completionPercent = progress.totalLessons == 0
                ? 0
                : Math.round((progress.completedLessons * 10000.0 / progress.totalLessons)) / 100.0;
        progress.completedLessonIds = completedIds == null
                ? Collections.emptyList()
                : completedIds.stream().map(Number::longValue).toList();
        return progress;
    }

    @Transactional
    public StudentDtos.CourseProgress markLessonComplete(Long userId, Long lessonId) {
        try {
            Object[] row = (Object[]) em.createNativeQuery(
                            "SELECT l.id, m.course_id FROM dbo.lessons l " +
                                    "JOIN dbo.modules m ON l.module_id = m.id WHERE l.id = :lid")
                    .setParameter("lid", lessonId)
                    .getResultStream()
                    .findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài học"));
            if (row[1] == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bài học chưa thuộc khóa học cụ thể");
            }
            Long courseId = ((Number) row[1]).longValue();

            // auto-enroll learner on first progress update if needed
            boolean enrolled = !em.createNativeQuery(
                            "SELECT 1 FROM dbo.enrollments WHERE user_id = :uid AND course_id = :cid AND status IN (N'active', N'completed')")
                    .setParameter("uid", userId)
                    .setParameter("cid", courseId)
                    .getResultList()
                    .isEmpty();
            if (!enrolled) {
                try {
                    em.createNativeQuery("INSERT INTO dbo.enrollments(user_id, course_id, source, status) VALUES (:uid, :cid, N'free', N'active')")
                            .setParameter("uid", userId)
                            .setParameter("cid", courseId)
                            .executeUpdate();
                } catch (DataIntegrityViolationException dupEnroll) {
                    log.debug("Enrollment already exists for user {} course {}", userId, courseId);
                } catch (Exception enrollEx) {
                    log.error("Không thể tạo ghi danh tạm thời (user={}, course={})", userId, courseId, enrollEx);
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể ghi danh khóa học: " + enrollEx.getMessage());
                }
            }

            int updated = em.createNativeQuery(
                            "UPDATE dbo.lesson_progress SET progress_percent = 100, completed_at = COALESCE(completed_at, SYSUTCDATETIME()), " +
                                    "updated_at = SYSUTCDATETIME() WHERE user_id = :uid AND lesson_id = :lid")
                    .setParameter("uid", userId)
                    .setParameter("lid", lessonId)
                    .executeUpdate();
            if (updated == 0) {
                try {
                    em.createNativeQuery(
                                    "INSERT INTO dbo.lesson_progress(user_id, lesson_id, progress_percent, completed_at) " +
                                            "VALUES (:uid, :lid, 100, SYSUTCDATETIME())")
                            .setParameter("uid", userId)
                            .setParameter("lid", lessonId)
                            .executeUpdate();
                } catch (DataIntegrityViolationException dup) {
                    log.debug("Lesson progress already exists for user {} lesson {}", userId, lessonId);
                }
            }
            return loadCourseProgressById(userId, courseId);
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Không thể cập nhật tiến độ học (user={}, lesson={})", userId, lessonId, ex);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể cập nhật tiến độ học: " + ex.getMessage());
        }
    }

    private StudentDtos.CourseProgress defaultProgress(String slug) {
        StudentDtos.CourseProgress progress = new StudentDtos.CourseProgress();
        progress.courseId = null;
        progress.courseSlug = slug;
        progress.totalLessons = 0;
        progress.completedLessons = 0;
        progress.completionPercent = 0;
        progress.completedLessonIds = Collections.emptyList();
        return progress;
    }
}
