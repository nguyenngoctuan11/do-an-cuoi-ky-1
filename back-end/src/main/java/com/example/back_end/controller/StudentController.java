package com.example.back_end.controller;

import com.example.back_end.dto.StudentDtos;
import com.example.back_end.model.Role;
import com.example.back_end.model.User;
import com.example.back_end.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/student")
public class StudentController {
    private final UserRepository userRepository;
    @PersistenceContext private EntityManager em;

    public StudentController(UserRepository userRepository){ this.userRepository = userRepository; }

    private User currentUser(Authentication auth){ return userRepository.findByEmailIgnoreCase(String.valueOf(auth.getPrincipal())).orElseThrow(); }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<StudentDtos.StudentInfo> me(Authentication auth){
        User u = currentUser(auth);
        StudentDtos.StudentInfo info = new StudentDtos.StudentInfo();
        info.id = u.getId(); info.email = u.getEmail(); info.fullName = u.getFullName();
        info.roles = u.getRoles().stream().map(Role::getCode).collect(Collectors.toList());
        return ResponseEntity.ok(info);
    }

    @GetMapping("/enrollments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<StudentDtos.EnrolledCourse>> enrollments(Authentication auth){
        Long uid = currentUser(auth).getId();
        List<Object[]> rows = em.createNativeQuery(
                "SELECT c.id, c.title, c.slug, c.level, c.thumbnail_url, c.price, e.status, e.start_at\n"+
                "FROM dbo.enrollments e JOIN dbo.courses c ON c.id = e.course_id\n"+
                "WHERE e.user_id = :uid ORDER BY e.start_at DESC")
                .setParameter("uid", uid)
                .getResultList();
        List<StudentDtos.EnrolledCourse> list = rows.stream().map(r -> {
            StudentDtos.EnrolledCourse ec = new StudentDtos.EnrolledCourse();
            ec.courseId = ((Number) r[0]).longValue();
            ec.title = r[1]!=null? r[1].toString(): null;
            ec.slug = r[2]!=null? r[2].toString(): null;
            ec.level = r[3]!=null? r[3].toString(): null;
            ec.thumbnailUrl = r[4]!=null? r[4].toString(): null;
            ec.price = (r[5] instanceof BigDecimal)? (BigDecimal) r[5]: null;
            ec.status = r[6]!=null? r[6].toString(): null;
            ec.enrolledAt = r[7] instanceof java.sql.Timestamp? ((java.sql.Timestamp) r[7]).toLocalDateTime(): (LocalDateTime) r[7];
            return ec;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }
}

