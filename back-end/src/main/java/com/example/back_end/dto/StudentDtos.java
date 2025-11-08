package com.example.back_end.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class StudentDtos {
    public static class StudentInfo {
        public Long id; public String email; public String fullName; public List<String> roles;
    }
    public static class EnrolledCourse {
        public Long courseId; public String title; public String slug; public String level; public String thumbnailUrl;
        public BigDecimal price; public String status; public LocalDateTime enrolledAt;
    }
}

