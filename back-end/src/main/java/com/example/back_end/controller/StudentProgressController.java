package com.example.back_end.controller;

import com.example.back_end.dto.StudentDtos;
import com.example.back_end.model.User;
import com.example.back_end.repository.UserRepository;
import com.example.back_end.service.StudentProgressService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/student/progress")
public class StudentProgressController {

    private final UserRepository userRepository;
    private final StudentProgressService progressService;

    public StudentProgressController(UserRepository userRepository, StudentProgressService progressService) {
        this.userRepository = userRepository;
        this.progressService = progressService;
    }

    private Long currentUserId(Authentication auth) {
        if (auth == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
        }
        String principal = auth.getName();
        return userRepository.findByEmailIgnoreCase(principal)
                .map(User::getId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Không tìm thấy tài khoản"));
    }

    @GetMapping("/courses/{courseKey}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<StudentDtos.CourseProgress> courseProgress(@PathVariable String courseKey, Authentication auth) {
        return ResponseEntity.ok(progressService.loadCourseProgress(currentUserId(auth), courseKey));
    }

    @PostMapping("/lessons/{lessonId}/complete")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<StudentDtos.CourseProgress> completeLesson(@PathVariable Long lessonId, Authentication auth) {
        return ResponseEntity.ok(progressService.markLessonComplete(currentUserId(auth), lessonId));
    }
}
