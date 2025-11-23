package com.example.back_end.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class ReportDtos {
    // -------- Student views --------
    public static class StudentCourseOverview {
        public Long courseId;
        public String courseName;
        public String courseSlug;
        public int totalLessons;
        public int completedLessons;
        public double progress;
        public Double avgScore;
        public String status;
    }

    public static class StudentOverview {
        public List<StudentCourseOverview> courses = new ArrayList<>();
    }

    public static class LessonProgressRow {
        public Long lessonId;
        public String lessonTitle;
        public String moduleTitle;
        public Integer progressPercent;
        public LocalDateTime completedAt;
        public LocalDateTime updatedAt;
    }

    public static class QuizAggregate {
        public Long quizId;
        public String quizTitle;
        public Integer attemptCount;
        public Double bestScore;
        public Double averageScore;
        public Integer passCount;
        public LocalDateTime lastAttemptAt;
    }

    public static class QuizHistoryItem {
        public Long attemptId;
        public Long quizId;
        public String quizTitle;
        public Long courseId;
        public String courseTitle;
        public Long studentId;
        public String studentName;
        public String studentEmail;
        public int attemptNo;
        public Double score;
        public Boolean passed;
        public String status;
        public LocalDateTime startedAt;
        public LocalDateTime finishedAt;
    }

    public static class StudentCourseDetail {
        public Long courseId;
        public String courseName;
        public String courseSlug;
        public int totalLessons;
        public int completedLessons;
        public double progress;
        public Double avgScore;
        public List<LessonProgressRow> lessons = new ArrayList<>();
        public List<QuizAggregate> quizzes = new ArrayList<>();
        public List<QuizHistoryItem> attempts = new ArrayList<>();
    }

    // -------- Teacher views --------
    public static class TeacherCourseSummary {
        public Long courseId;
        public String courseName;
        public String courseSlug;
        public long studentCount;
        public long completedStudents;
        public double completionRate;
        public Double averageScore;
    }

    public static class TeacherOverview {
        public long courseCount;
        public long totalStudents;
        public double averageCompletion;
        public Double averageScore;
        public List<TeacherCourseSummary> courses = new ArrayList<>();
    }

    public static class TeacherStudentRow {
        public Long studentId;
        public String fullName;
        public String email;
        public double completionPercent;
        public Double averageScore;
        public String status;
        public LocalDateTime lastActivityAt;
    }

    public static class TeacherCourseDetail {
        public TeacherCourseSummary summary;
        public List<TeacherStudentRow> students = new ArrayList<>();
        public List<QuizAggregate> quizzes = new ArrayList<>();
    }

    // -------- Quiz level --------
    public static class QuizReport {
        public Long quizId;
        public String quizTitle;
        public Long courseId;
        public String courseTitle;
        public long enrolled;
        public long attempted;
        public Double averageScore;
        public Double minScore;
        public Double maxScore;
        public Map<String, Long> distribution = new LinkedHashMap<>();
        public List<QuizHistoryItem> attempts = new ArrayList<>();
    }

    // -------- Admin views --------
    public static class Totals {
        public long students;
        public long teachers;
        public long courses;
        public long activeStudents7d;
        public double avgCompletion;
        public long quizAttempts;
        public long lessonsCompleted;
        public double revenueTotal;
    }

    public static class TopCourse {
        public Long courseId;
        public String courseName;
        public Double completionRate;
        public long enrollmentCount;
        public Double value; // generic metric (e.g. revenue or rating)
    }

    public static class TimeseriesPoint {
        public LocalDate date;
        public long value;
    }

    public static class AdminSummary {
        public Totals totals = new Totals();
        public List<TopCourse> topEnrollments = new ArrayList<>();
        public List<TopCourse> topCompletion = new ArrayList<>();
        public List<TimeseriesPoint> activeByDay = new ArrayList<>();
    }

    public static class RevenueItem {
        public LocalDate date;
        public double amount;
    }

    public static class CourseRevenue {
        public Long courseId;
        public String courseTitle;
        public double revenue;
        public long payments;
    }

    public static class RevenueReport {
        public LocalDate from;
        public LocalDate to;
        public double total;
        public List<RevenueItem> byDate = new ArrayList<>();
        public List<CourseRevenue> topCourses = new ArrayList<>();
    }

    public static class ActivityReport {
        public String range;
        public long logins;
        public long quizSubmissions;
        public long lessonsCompleted;
        public long coursesCreated;
    }
}
