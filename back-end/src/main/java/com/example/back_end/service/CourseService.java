package com.example.back_end.service;

import com.example.back_end.dto.CourseDtos;
import com.example.back_end.model.Course;
import com.example.back_end.model.User;
import com.example.back_end.repository.CourseRepository;
import com.example.back_end.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CourseService {
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;

    public CourseService(CourseRepository courseRepository, UserRepository userRepository) {
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
    }

    public CourseDtos.CourseResponse create(CourseDtos.CreateRequest req) {
        User creator = getCurrentUser();
        Course c = new Course();
        c.setTitle(req.title);
        c.setSlug(req.slug);
        c.setShortDesc(req.shortDesc);
        c.setLanguage(req.language != null ? req.language : "vi");
        c.setLevel(req.level != null ? req.level : "beginner");
        c.setStatus(req.status != null ? req.status : "draft");
        c.setPrice(req.price);
        c.setCreatedBy(creator);
        c = courseRepository.save(c);
        return toResponse(c);
    }

    public List<CourseDtos.CourseResponse> list(int limit) {
        return courseRepository.findAllByOrderByIdDesc(PageRequest.of(0, Math.max(1, Math.min(limit, 100))))
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    private CourseDtos.CourseResponse toResponse(Course c) {
        CourseDtos.CourseResponse r = new CourseDtos.CourseResponse();
        r.id = c.getId();
        r.title = c.getTitle();
        r.slug = c.getSlug();
        r.shortDesc = c.getShortDesc();
        r.language = c.getLanguage();
        r.level = c.getLevel();
        r.status = c.getStatus();
        r.price = c.getPrice();
        r.createdById = c.getCreatedBy() != null ? c.getCreatedBy().getId() : null;
        r.createdByEmail = c.getCreatedBy() != null ? c.getCreatedBy().getEmail() : null;
        return r;
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth != null ? String.valueOf(auth.getPrincipal()) : null;
        if (email == null) throw new IllegalStateException("Chưa đăng nhập");
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new IllegalStateException("Không tìm thấy người dùng hiện tại"));
    }
}

