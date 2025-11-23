package com.example.back_end.repository.projection;

import java.time.LocalDateTime;

public interface ManagerCourseAnalyticsProjection {
    Long getId();
    String getTitle();
    String getSlug();
    String getStatus();
    String getApprovalStatus();
    String getTeacherName();
    String getTeacherEmail();
    Long getViewCount();
    Long getPaymentCount();
    LocalDateTime getLastViewedAt();
    LocalDateTime getLastPaymentAt();
}
