package com.example.back_end.controller;

import com.example.back_end.dto.ReportDtos;
import com.example.back_end.model.User;
import com.example.back_end.repository.UserRepository;
import com.example.back_end.service.ReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.ZoneOffset;

@RestController
@RequestMapping("/api/reports")
public class ReportsController {
    private final ReportService reportService;
    private final UserRepository userRepository;

    public ReportsController(ReportService reportService, UserRepository userRepository) {
        this.reportService = reportService;
        this.userRepository = userRepository;
    }

    private User requireUser(Authentication auth) {
        return userRepository.findByEmailIgnoreCase(String.valueOf(auth.getPrincipal())).orElseThrow();
    }

    private boolean isManager(Authentication auth) {
        return auth.getAuthorities().stream().anyMatch(a -> {
            String authority = a.getAuthority();
            return "ROLE_MANAGER".equals(authority) || "ROLE_ADMIN".equals(authority);
        });
    }

    // -------- Student --------
    @GetMapping("/student/overview")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReportDtos.StudentOverview> studentOverview(Authentication auth) {
        User user = requireUser(auth);
        return ResponseEntity.ok(reportService.studentOverview(user.getId()));
    }

    @GetMapping("/student/course/{courseId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReportDtos.StudentCourseDetail> studentCourseDetail(@PathVariable Long courseId,
                                                                              Authentication auth) {
        User user = requireUser(auth);
        return ResponseEntity.ok(reportService.studentCourseDetail(user.getId(), courseId));
    }

    @GetMapping("/student/quiz-history")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> studentQuizHistory(Authentication auth) {
        User user = requireUser(auth);
        return ResponseEntity.ok(reportService.studentQuizHistory(user.getId()));
    }

    // -------- Teacher --------
    @GetMapping("/teacher/overview")
    @PreAuthorize("hasAnyRole('TEACHER','MANAGER')")
    public ResponseEntity<ReportDtos.TeacherOverview> teacherOverview(Authentication auth) {
        User user = requireUser(auth);
        return ResponseEntity.ok(reportService.teacherOverview(user));
    }

    @GetMapping("/teacher/course/{courseId}")
    @PreAuthorize("hasAnyRole('TEACHER','MANAGER')")
    public ResponseEntity<ReportDtos.TeacherCourseDetail> teacherCourseDetail(@PathVariable Long courseId,
                                                                              Authentication auth) {
        User user = requireUser(auth);
        boolean manager = isManager(auth);
        return ResponseEntity.ok(reportService.teacherCourseDetail(user, manager, courseId));
    }

    @GetMapping("/teacher/course/{courseId}/export")
    @PreAuthorize("hasAnyRole('TEACHER','MANAGER')")
    public ResponseEntity<byte[]> teacherCourseExport(@PathVariable Long courseId, Authentication auth) {
        User user = requireUser(auth);
        boolean manager = isManager(auth);
        ReportDtos.TeacherCourseDetail detail = reportService.teacherCourseDetail(user, manager, courseId);
        StringBuilder sb = new StringBuilder();
        sb.append("StudentId,FullName,Email,CompletionPercent,AverageScore,Status,LastActivity\n");
        for (ReportDtos.TeacherStudentRow s : detail.students) {
            sb.append(s.studentId != null ? s.studentId : "").append(",");
            sb.append(csv(s.fullName)).append(",");
            sb.append(csv(s.email)).append(",");
            sb.append(s.completionPercent).append(",");
            sb.append(s.averageScore != null ? s.averageScore : "").append(",");
            sb.append(csv(s.status)).append(",");
            sb.append(s.lastActivityAt != null ? s.lastActivityAt : "").append("\n");
        }
        byte[] bytes = sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header("Content-Type", "text/csv; charset=utf-8")
                .header("Content-Disposition", "attachment; filename=\"course-" + courseId + "-students.csv\"")
                .body(bytes);
    }

    @GetMapping("/teacher/quiz/{quizId}")
    @PreAuthorize("hasAnyRole('TEACHER','MANAGER')")
    public ResponseEntity<ReportDtos.QuizReport> quizReport(@PathVariable Long quizId, Authentication auth) {
        User user = requireUser(auth);
        boolean manager = isManager(auth);
        return ResponseEntity.ok(reportService.quizReport(user, manager, quizId));
    }

    // -------- Admin / Manager --------
    @GetMapping("/admin/summary")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ResponseEntity<ReportDtos.AdminSummary> adminSummary() {
        return ResponseEntity.ok(reportService.adminSummary());
    }

    @GetMapping("/admin/revenue")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ResponseEntity<ReportDtos.RevenueReport> revenueReport(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(reportService.revenueReport(from, to));
    }

    @GetMapping("/admin/activity")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ResponseEntity<ReportDtos.ActivityReport> activityReport(
            @RequestParam(value = "range", required = false, defaultValue = "last_30_days") String range) {
        String normalized = range == null ? "last_30_days" : range.toLowerCase();
        LocalDate to = LocalDate.now(ZoneOffset.UTC);
        LocalDate from = switch (normalized) {
            case "last_7_days" -> to.minusDays(7);
            case "last_90_days" -> to.minusDays(90);
            default -> to.minusDays(30);
        };
        return ResponseEntity.ok(reportService.activityReport(from, to, normalized));
    }

    private String csv(String value) {
        if (value == null) return "";
        String escaped = value.replace("\"", "\"\"");
        return "\"" + escaped + "\"";
    }
}
