package com.example.back_end.controller;

import com.example.back_end.dto.public_.PublicCourseDetailDto;
import com.example.back_end.service.AnalyticsService;
import com.example.back_end.service.PublicCourseQueryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public/courses")
public class PublicCourseDetailController {
    private final PublicCourseQueryService queryService;
    private final AnalyticsService analyticsService;

    public PublicCourseDetailController(PublicCourseQueryService queryService,
                                        AnalyticsService analyticsService) {
        this.queryService = queryService;
        this.analyticsService = analyticsService;
    }

    @GetMapping("/{slug}/detail-sql")
    public ResponseEntity<?> detail(@PathVariable String slug) {
        PublicCourseDetailDto dto = queryService.loadCourseDetailBySlug(slug);
        if (dto == null && slug.matches("\\d+")) {
            dto = queryService.loadCourseDetailById(Long.parseLong(slug), false);
        }
        if (dto == null) return ResponseEntity.notFound().build();
        analyticsService.trackCourseView(dto.id);
        return ResponseEntity.ok(dto);
    }
}

