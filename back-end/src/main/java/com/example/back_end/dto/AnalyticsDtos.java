package com.example.back_end.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class AnalyticsDtos {

    public static class CourseMetric {
        public Long id;
        public String title;
        public String slug;
        public String status;
        public String approvalStatus;
        public Long viewCount;
        public Long paymentCount;
        public LocalDateTime lastViewedAt;
        public LocalDateTime lastPaymentAt;
        public String teacherName;
        public String teacherEmail;
    }

    public static class QuizMetric {
        public Long id;
        public String title;
        public Long courseId;
        public String courseSlug;
        public String courseTitle;
        public Integer questionCount;
        public Long attemptCount;
        public LocalDateTime lastAttemptAt;
        public LocalDateTime createdAt;
        public String teacherName;
        public String teacherEmail;
    }

    public static class TeacherSummary {
        public int totalCourses;
        public int pendingCourses;
        public int publishedCourses;
        public int totalQuizzes;
        public long totalViews;
        public long totalPayments;
        public List<CourseMetric> courses = new ArrayList<>();
        public List<QuizMetric> quizzes = new ArrayList<>();
    }

    public static class ManagerCourseReport {
        public long courseCount;
        public long totalViews;
        public long totalPayments;
        public long quizCount;
        public long totalQuizAttempts;
        public int page;
        public int size;
        public List<CourseMetric> items = new ArrayList<>();
        public List<QuizMetric> quizzes = new ArrayList<>();
    }

    public static class TeacherOption {
        public Long id;
        public String fullName;
        public String email;
        public long courseCount;
        public long quizCount;
    }
}
