package com.example.back_end.controller;

import com.example.back_end.dto.CourseDtos;
import com.example.back_end.model.Course;
import com.example.back_end.model.User;
import com.example.back_end.repository.CourseRepository;
import com.example.back_end.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/teacher/courses")
public class TeacherCourseController {
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;

    public TeacherCourseController(CourseRepository courseRepository, UserRepository userRepository) {
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
    }

    private User currentUser(Authentication auth) {
        return userRepository.findByEmailIgnoreCase(String.valueOf(auth.getPrincipal())).orElseThrow();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER','MANAGER')")
    public ResponseEntity<?> create(@RequestBody CourseDtos.CreateRequest req, Authentication auth) {
        try {
            User creator = currentUser(auth);
            Course c = new Course();
            c.setTitle(req.title);
            c.setSlug(req.slug);
            c.setShortDesc(req.shortDesc);
            c.setLanguage(req.language != null ? req.language : "vi");
            c.setLevel(req.level != null ? req.level : "beginner");
            c.setStatus("draft");
            c.setPrice(req.price);
            c.setThumbnailUrl(null);
            c.setCreatedBy(creator);
            c.setApprovalStatus("draft");
            c = courseRepository.save(c);
            return ResponseEntity.ok(Map.of("id", c.getId(), "slug", c.getSlug()));
        } catch (org.springframework.dao.DataIntegrityViolationException dive) {
            String msg = String.valueOf(dive.getMostSpecificCause());
            if (msg != null && msg.toLowerCase().contains("slug")) {
                return ResponseEntity.badRequest().body("Slug đã tồn tại, hãy chọn slug khác");
            }
            if (msg != null && msg.toLowerCase().contains("fk_courses_creator")) {
                return ResponseEntity.badRequest().body("Tài khoản hiện tại không hợp lệ (created_by)");
            }
            return ResponseEntity.badRequest().body("Dữ liệu không hợp lệ: " + msg);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PostMapping("/{id}/thumbnail")
    @PreAuthorize("hasAnyRole('TEACHER','MANAGER')")
    @Transactional
    public ResponseEntity<?> setThumbnail(@PathVariable Long id, @RequestBody Map<String, String> body, Authentication auth) {
        Course c = courseRepository.findById(id).orElseThrow();
        if (!c.getCreatedBy().getEmail().equalsIgnoreCase(String.valueOf(auth.getPrincipal()))) {
            return ResponseEntity.status(403).body("Not owner");
        }
        c.setThumbnailUrl(body.get("url"));
        courseRepository.save(c);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER','MANAGER')")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getOne(@PathVariable Long id, Authentication auth) {
        Course c = courseRepository.findById(id).orElseThrow();
        boolean isOwner = c.getCreatedBy().getEmail().equalsIgnoreCase(String.valueOf(auth.getPrincipal()));
        boolean isManager = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER"));
        if (!(isOwner || isManager)) return ResponseEntity.status(403).body("Not owner");
        CourseDtos.CourseResponse res = new CourseDtos.CourseResponse();
        res.id = c.getId(); res.title = c.getTitle(); res.slug = c.getSlug(); res.shortDesc = c.getShortDesc();
        res.language = c.getLanguage(); res.level = c.getLevel(); res.status = c.getStatus(); res.price = c.getPrice();
        res.createdById = c.getCreatedBy().getId(); res.createdByEmail = c.getCreatedBy().getEmail();
        res.thumbnailUrl = c.getThumbnailUrl(); res.approvalStatus = c.getApprovalStatus();
        return ResponseEntity.ok(res);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER','MANAGER')")
    @Transactional
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody CourseDtos.UpdateRequest req, Authentication auth) {
        Course c = courseRepository.findById(id).orElseThrow();
        boolean isOwner = c.getCreatedBy().getEmail().equalsIgnoreCase(String.valueOf(auth.getPrincipal()));
        boolean isManager = ((org.springframework.security.core.GrantedAuthority) () -> "ROLE_MANAGER")
                .getAuthority() != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER"));
        if (!(isOwner || isManager)) return ResponseEntity.status(403).body("Not owner");
        if (req.title != null) {
            String t = req.title.trim();
            if (t.isEmpty()) return ResponseEntity.badRequest().body("Tiêu đề không được để trống");
            c.setTitle(t);
        }
        if (req.slug != null) {
            String slug = req.slug.trim();
            if (slug.isEmpty()) return ResponseEntity.badRequest().body("Slug không được để trống");
            if (courseRepository.existsBySlugIgnoreCaseAndIdNot(slug, id)) {
                return ResponseEntity.badRequest().body("Slug đã tồn tại, hãy chọn slug khác");
            }
            c.setSlug(slug);
        }
        if (req.shortDesc != null) c.setShortDesc(req.shortDesc);
        if (req.language != null) c.setLanguage(req.language);
        if (req.level != null) c.setLevel(req.level);
        if (req.status != null) c.setStatus(req.status);
        if (req.price != null) c.setPrice(req.price);
        if (req.thumbnailUrl != null) c.setThumbnailUrl(req.thumbnailUrl);
        try {
            courseRepository.save(c);
            return ResponseEntity.ok(Map.of("ok", true));
        } catch (org.springframework.dao.DataIntegrityViolationException dive) {
            String msg = String.valueOf(dive.getMostSpecificCause());
            if (msg != null && msg.toLowerCase().contains("slug")) {
                return ResponseEntity.badRequest().body("Slug đã tồn tại, hãy chọn slug khác");
            }
            return ResponseEntity.badRequest().body("Dữ liệu không hợp lệ: " + msg);
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER','MANAGER')")
    @Transactional
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        Course c = courseRepository.findById(id).orElseThrow();
        boolean isOwner = c.getCreatedBy().getEmail().equalsIgnoreCase(String.valueOf(auth.getPrincipal()));
        boolean isManager = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER"));
        if (!(isOwner || isManager)) return ResponseEntity.status(403).body("Not owner");
        courseRepository.delete(c);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("hasAnyRole('TEACHER','MANAGER')")
    @Transactional
    public ResponseEntity<?> submitForReview(@PathVariable Long id, Authentication auth) {
        Course c = courseRepository.findById(id).orElseThrow();
        if (!c.getCreatedBy().getEmail().equalsIgnoreCase(String.valueOf(auth.getPrincipal()))) {
            return ResponseEntity.status(403).body("Not owner");
        }
        c.setApprovalStatus("pending");
        c.setSubmittedAt(LocalDateTime.now());
        courseRepository.save(c);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
