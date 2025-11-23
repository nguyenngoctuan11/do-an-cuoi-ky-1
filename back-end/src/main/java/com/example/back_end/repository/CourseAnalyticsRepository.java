package com.example.back_end.repository;

import com.example.back_end.model.CourseAnalytics;
import com.example.back_end.repository.projection.ManagerCourseAnalyticsProjection;
import com.example.back_end.repository.projection.ManagerCourseTotalsProjection;
import com.example.back_end.repository.projection.TeacherCourseAnalyticsProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseAnalyticsRepository extends JpaRepository<CourseAnalytics, Long> {

    @Query(
            value = """
                    SELECT c.id, c.title, c.slug, c.status, c.approval_status AS approvalStatus,
                           COALESCE(ca.view_count, 0) AS viewCount,
                           COALESCE(ca.payment_count, 0) AS paymentCount,
                           ca.last_viewed_at AS lastViewedAt,
                           ca.last_payment_at AS lastPaymentAt
                    FROM dbo.courses c
                    LEFT JOIN dbo.course_analytics ca ON ca.course_id = c.id
                    WHERE c.created_by = :creatorId
                    ORDER BY c.created_at DESC
                    """,
            nativeQuery = true
    )
    List<TeacherCourseAnalyticsProjection> findTeacherCourseStats(@Param("creatorId") Long creatorId);

    @Query(
            value = """
                    SELECT c.id, c.title, c.slug, c.status, c.approval_status AS approvalStatus,
                           u.full_name AS teacherName, u.email AS teacherEmail,
                           COALESCE(ca.view_count, 0) AS viewCount,
                           COALESCE(ca.payment_count, 0) AS paymentCount,
                           ca.last_viewed_at AS lastViewedAt,
                           ca.last_payment_at AS lastPaymentAt
                    FROM dbo.courses c
                    JOIN dbo.users u ON u.id = c.created_by
                    LEFT JOIN dbo.course_analytics ca ON ca.course_id = c.id
                    WHERE (:teacherEmail IS NULL OR LOWER(u.email) = LOWER(:teacherEmail))
                      AND (:keyword IS NULL OR c.title LIKE :keyword OR c.slug LIKE :keyword
                        OR u.full_name LIKE :keyword OR u.email LIKE :keyword)
                    ORDER BY COALESCE(ca.view_count, 0) DESC, c.created_at DESC
                    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
                    """,
            nativeQuery = true
    )
    List<ManagerCourseAnalyticsProjection> findManagerCourseStats(@Param("keyword") String keyword,
                                                                  @Param("teacherEmail") String teacherEmail,
                                                                  @Param("offset") int offset,
                                                                  @Param("limit") int limit);

    @Query(
            value = """
                    SELECT
                        COUNT(1) AS courseCount,
                        SUM(COALESCE(ca.view_count, 0)) AS totalViews,
                        SUM(COALESCE(ca.payment_count, 0)) AS totalPayments
                    FROM dbo.courses c
                    JOIN dbo.users u ON u.id = c.created_by
                    LEFT JOIN dbo.course_analytics ca ON ca.course_id = c.id
                    WHERE (:teacherEmail IS NULL OR LOWER(u.email) = LOWER(:teacherEmail))
                      AND (:keyword IS NULL OR c.title LIKE :keyword OR c.slug LIKE :keyword
                        OR u.full_name LIKE :keyword OR u.email LIKE :keyword)
                    """,
            nativeQuery = true
    )
    ManagerCourseTotalsProjection aggregateManagerTotals(@Param("keyword") String keyword,
                                                         @Param("teacherEmail") String teacherEmail);
}
