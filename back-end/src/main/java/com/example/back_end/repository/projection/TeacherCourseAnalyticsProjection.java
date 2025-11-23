package com.example.back_end.repository.projection;

import java.time.LocalDateTime;

public interface TeacherCourseAnalyticsProjection {
    Long getId();
    String getTitle();
    String getSlug();
    String getStatus();
    String getApprovalStatus();
    Long getViewCount();
    Long getPaymentCount();
    LocalDateTime getLastViewedAt();
    LocalDateTime getLastPaymentAt();
}
