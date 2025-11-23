package com.example.back_end.controller;

import com.example.back_end.dto.AnalyticsDtos;
import com.example.back_end.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {
    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/teacher/summary")
    @PreAuthorize("hasAnyRole('TEACHER','MANAGER')")
    public ResponseEntity<AnalyticsDtos.TeacherSummary> teacherSummary(Authentication auth) {
        String email = String.valueOf(auth.getPrincipal());
        return ResponseEntity.ok(analyticsService.buildTeacherSummary(email));
    }

    @GetMapping("/manager/courses")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<AnalyticsDtos.ManagerCourseReport> managerCourses(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "q", required = false) String keyword,
            @RequestParam(value = "teacher", required = false) String teacherEmail
    ) {
        return ResponseEntity.ok(analyticsService.buildManagerReport(page, size, keyword, teacherEmail));
    }

    @GetMapping("/manager/teachers")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<List<AnalyticsDtos.TeacherOption>> teacherOptions(
            @RequestParam(value = "q", required = false) String keyword
    ) {
        return ResponseEntity.ok(analyticsService.listTeacherOptions(keyword));
    }
}
