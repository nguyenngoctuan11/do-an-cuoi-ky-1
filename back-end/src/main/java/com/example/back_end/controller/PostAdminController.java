package com.example.back_end.controller;

import com.example.back_end.model.Post;
import com.example.back_end.repository.PostRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/posts")
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
public class PostAdminController {

    private final PostRepository postRepository;
    private final PostController delegateMapper;

    public PostAdminController(PostRepository postRepository, PostController delegateMapper) {
        this.postRepository = postRepository;
        this.delegateMapper = delegateMapper;
    }

    private Pageable pageable(int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);
        return PageRequest.of(safePage, safeSize);
    }

    @GetMapping("/pending")
    @Transactional(readOnly = true)
    public ResponseEntity<?> pending(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size
    ) {
        Page<Post> data = postRepository.findByStatusOrderByCreatedAtDesc("pending", pageable(page, size));
        Map<String, Object> payload = new HashMap<>();
        payload.put("items", data.getContent().stream().map(delegateMapper::toResponse).toList());
        payload.put("total", data.getTotalElements());
        payload.put("page", page);
        payload.put("size", size);
        return ResponseEntity.ok(payload);
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable Long id) {
        Post post = postRepository.findById(id).orElse(null);
        if (post == null) return ResponseEntity.notFound().build();
        post.setStatus("published");
        post.setPublishedAt(LocalDateTime.now());
        post.setRejectedReason(null);
        Post saved = postRepository.save(post);
        return ResponseEntity.ok(delegateMapper.toResponse(saved));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        Post post = postRepository.findById(id).orElse(null);
        if (post == null) return ResponseEntity.notFound().build();
        String reason = payload != null ? payload.getOrDefault("reason", payload.getOrDefault("message", "")) : "";
        post.setStatus("rejected");
        post.setPublishedAt(null);
        post.setRejectedReason(reason == null ? null : reason.trim());
        Post saved = postRepository.save(post);
        return ResponseEntity.ok(delegateMapper.toResponse(saved));
    }
}
