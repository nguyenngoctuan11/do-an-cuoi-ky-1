package com.example.back_end.repository.projection;

import java.math.BigDecimal;

// Projection giữ đúng tên cột theo T-SQL (snake_case)
public interface CourseCardSqlProjection {
    Long getId();
    String getTitle();
    String getSlug();
    String getLevel();
    String getStatus();
    BigDecimal getPrice();
    String getThumbnail_url();
    Integer getLessons_count();
    String getPreview_video_url();
}

