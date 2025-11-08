package com.example.back_end.controller;

import com.example.back_end.dto.CourseDtos;
import com.example.back_end.service.CourseService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/courses")
public class CourseController {
    private final CourseService courseService;

    public CourseController(CourseService courseService) {
        this.courseService = courseService;
    }

    @GetMapping
    public ResponseEntity<List<CourseDtos.CourseResponse>> list(@RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(courseService.list(limit));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER','MANAGER')")
    public ResponseEntity<CourseDtos.CourseResponse> create(@RequestBody CourseDtos.CreateRequest req) {
        return ResponseEntity.ok(courseService.create(req));
    }
}

