package com.example.back_end.controller;

import com.example.back_end.repository.CourseRepository;
import com.example.back_end.repository.projection.TeacherCourseProjection;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/teacher/courses")
public class TeacherCourseQueryController {
    private final CourseRepository courseRepository;

    public TeacherCourseQueryController(CourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('TEACHER','MANAGER')")
    public ResponseEntity<List<TeacherCourseProjection>> myCourses(Authentication auth) {
        String email = String.valueOf(auth.getPrincipal());
        return ResponseEntity.ok(courseRepository.findCoursesByCreatorEmail(email));
    }
}

