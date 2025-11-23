package com.example.back_end.controller;

import com.example.back_end.dto.PostDtos;
import com.example.back_end.model.Course;
import com.example.back_end.model.Post;
import com.example.back_end.model.User;
import com.example.back_end.repository.CourseRepository;
import com.example.back_end.repository.PostRepository;
import com.example.back_end.repository.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/posts")
public class PostController {
    private static final Set<String> AUTHOR_STATUSES = Set.of("draft", "pending");
    private static final Set<String> AUTHOR_LIST_STATUSES = Set.of("draft", "pending", "published", "rejected");
    private static final Set<String> MODERATOR_STATUSES = Set.of("draft", "pending", "published", "rejected");
    private static final Set<String> VISIBILITY_VALUES = Set.of("course", "enrolled", "internal");
    private static final TypeReference<List<String>> LIST_OF_STRING = new TypeReference<>() {};

    private final PostRepository postRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public PostController(PostRepository postRepository, CourseRepository courseRepository,
                          UserRepository userRepository, ObjectMapper objectMapper) {
        this.postRepository = postRepository;
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    private User currentUser(Authentication auth) {
        if (auth == null) throw new IllegalStateException("Phiên đăng nhập không hợp lệ");
        String email = String.valueOf(auth.getPrincipal());
        return userRepository.findByEmailIgnoreCase(email).orElseThrow();
    }

    private boolean hasAuthority(Authentication auth, String authority) {
        if (auth == null) return false;
        return auth.getAuthorities().stream().anyMatch(granted -> authority.equals(granted.getAuthority()));
    }

    private boolean canModerate(Authentication auth) {
        return hasAuthority(auth, "ROLE_ADMIN") || hasAuthority(auth, "ROLE_MANAGER");
    }

    private Pageable pageable(int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);
        return PageRequest.of(safePage, safeSize);
    }

    private String normalizeVisibility(String value) {
        if (value == null) return "course";
        String cleaned = value.trim().toLowerCase(Locale.ROOT);
        return VISIBILITY_VALUES.contains(cleaned) ? cleaned : "course";
    }

    private String normalizeStatus(String requested, Authentication auth) {
        String normalized = requested == null ? "draft" : requested.trim().toLowerCase(Locale.ROOT);
        if (canModerate(auth)) {
            return MODERATOR_STATUSES.contains(normalized) ? normalized : "draft";
        }
        return AUTHOR_STATUSES.contains(normalized) ? normalized : "draft";
    }

    private String slugify(String input) {
        if (input == null) return "bai-viet";
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .replaceAll("[^a-zA-Z0-9\\s-]", "")
                .trim()
                .replaceAll("\\s+", "-")
                .replaceAll("-{2,}", "-")
                .toLowerCase(Locale.ROOT);
        if (normalized.isBlank()) {
            normalized = "bai-viet";
        }
        return normalized;
    }

    private String ensureUniqueSlug(String base, Long currentId) {
        String slug = base;
        int attempt = 1;
        Long idToExclude = currentId == null ? -1L : currentId;
        while (postRepository.existsBySlugIgnoreCaseAndIdNot(slug, idToExclude)) {
            attempt += 1;
            slug = base + "-" + attempt;
        }
        return slug;
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String joinTags(List<String> tags) {
        if (tags == null) return null;
        return tags.stream()
                .map(this::trimToNull)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.joining(","));
    }

    private List<String> splitTags(String tags) {
        if (tags == null || tags.isBlank()) return List.of();
        return Arrays.stream(tags.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    private String encodeAttachments(List<String> attachments) {
        if (attachments == null || attachments.isEmpty()) return null;
        List<String> sanitized = attachments.stream()
                .map(this::trimToNull)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (sanitized.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(sanitized);
        } catch (Exception ex) {
            return null;
        }
    }

    private List<String> decodeAttachments(String raw) {
        if (raw == null || raw.isBlank()) return List.of();
        try {
            return objectMapper.readValue(raw, LIST_OF_STRING);
        } catch (Exception ex) {
            return List.of();
        }
    }

    private String resolveExcerpt(String provided, String content) {
        String base = trimToNull(provided);
        if (base != null) return base;
        if (content == null) return null;
        String plain = content.replaceAll("<[^>]*>", " ").replaceAll("\\s+", " ").trim();
        if (plain.length() > 240) {
            return plain.substring(0, 240).trim() + "...";
        }
        return plain;
    }

    private void applyEditorFields(Post post, PostDtos.EditorRequest req, Authentication auth) {
        if (req == null) throw new IllegalArgumentException("Thiếu dữ liệu bài viết");
        String title = trimToNull(req.title);
        if (title == null) throw new IllegalArgumentException("Tiêu đề không được bỏ trống");
        if (req.content == null || req.content.trim().isEmpty()) {
            throw new IllegalArgumentException("Nội dung không được bỏ trống");
        }
        post.setTitle(title);
        post.setCategory(trimToNull(req.category));
        post.setVisibility(normalizeVisibility(req.visibility));
        post.setTags(joinTags(req.tags));
        post.setCoverImageUrl(trimToNull(req.coverImageUrl));
        post.setAttachmentUrls(encodeAttachments(req.attachments));
        post.setContent(req.content.trim());
        post.setExcerpt(resolveExcerpt(req.excerpt, post.getContent()));

        if (req.courseId != null) {
            Course course = courseRepository.findById(req.courseId)
                    .orElseThrow(() -> new IllegalArgumentException("Khóa học không tồn tại"));
            post.setCourse(course);
        } else {
            post.setCourse(null);
        }

        boolean allowSlugUpdate = post.getId() == null || !"published".equals(post.getStatus());
        if (allowSlugUpdate) {
            String baseSlug = slugify(post.getTitle());
            post.setSlug(ensureUniqueSlug(baseSlug, post.getId()));
        }

        String status = req.status != null ? normalizeStatus(req.status, auth) : post.getStatus();
        if (status == null || status.isBlank()) {
            status = "draft";
        }
        applyStatus(post, status, null);
    }

    private void applyStatus(Post post, String status, String rejectedReason) {
        String previous = post.getStatus();
        post.setStatus(status);
        if ("published".equals(status)) {
            if (!"published".equals(previous) || post.getPublishedAt() == null) {
                post.setPublishedAt(LocalDateTime.now());
            }
            post.setRejectedReason(null);
        } else if ("rejected".equals(status)) {
            post.setPublishedAt(null);
            post.setRejectedReason(trimToNull(rejectedReason));
        } else {
            if ("published".equals(previous)) {
                post.setPublishedAt(null);
            }
            post.setRejectedReason(null);
        }
    }

    public PostDtos.PostResponse toResponse(Post post) {
        PostDtos.PostResponse res = new PostDtos.PostResponse();
        res.id = post.getId();
        res.slug = post.getSlug();
        res.title = post.getTitle();
        res.content = post.getContent();
        res.excerpt = post.getExcerpt();
        res.status = post.getStatus();
        res.visibility = post.getVisibility();
        res.category = post.getCategory();
        res.tags = splitTags(post.getTags());
        res.coverImageUrl = post.getCoverImageUrl();
        res.attachments = decodeAttachments(post.getAttachmentUrls());
        if (post.getCourse() != null) {
            res.courseId = post.getCourse().getId();
            res.courseTitle = post.getCourse().getTitle();
        }
        if (post.getAuthor() != null) {
            res.authorId = post.getAuthor().getId();
            res.authorName = post.getAuthor().getFullName();
            res.authorAvatar = post.getAuthor().getAvatarUrl();
        }
        res.createdAt = post.getCreatedAt();
        res.updatedAt = post.getUpdatedAt();
        res.publishedAt = post.getPublishedAt();
        res.rejectedReason = post.getRejectedReason();
        return res;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> listPublished(
            @RequestParam(value = "courseId", required = false) Long courseId,
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "12") int size
    ) {
        Page<Post> data = postRepository.search("published", courseId, null, keyword, pageable(page, size));
        List<PostDtos.PostResponse> items = data.getContent().stream()
                .filter(post -> !"internal".equalsIgnoreCase(post.getVisibility()))
                .map(this::toResponse)
                .toList();
        Map<String, Object> payload = new HashMap<>();
        payload.put("items", items);
        payload.put("page", page);
        payload.put("size", size);
        payload.put("total", data.getTotalElements());
        return ResponseEntity.ok(payload);
    }

    @GetMapping("/{idOrSlug}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> fetchOne(@PathVariable String idOrSlug, Authentication auth) {
        Optional<Post> byId = Optional.empty();
        try {
            Long id = Long.parseLong(idOrSlug);
            byId = postRepository.findById(id);
        } catch (NumberFormatException ignored) { }
        Post post = byId.orElseGet(() -> postRepository.findBySlugIgnoreCase(idOrSlug).orElse(null));
        if (post == null) return ResponseEntity.notFound().build();

        boolean isOwner = false;
        if (auth != null && post.getAuthor() != null) {
            isOwner = post.getAuthor().getEmail().equalsIgnoreCase(String.valueOf(auth.getPrincipal()));
        }
        if (!"published".equals(post.getStatus())) {
            if (!(isOwner || canModerate(auth))) {
                return ResponseEntity.status(403).build();
            }
        }
        if ("internal".equals(post.getVisibility()) && !(isOwner || canModerate(auth))) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(toResponse(post));
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<?> myPosts(
            @RequestParam(value = "status", required = false) String statusFilter,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            Authentication auth
    ) {
        User author = currentUser(auth);
        List<String> statuses;
        if (statusFilter == null || statusFilter.isBlank()) {
            statuses = new ArrayList<>(AUTHOR_LIST_STATUSES);
        } else {
            statuses = Arrays.stream(statusFilter.split(","))
                    .map(String::trim)
                    .map(String::toLowerCase)
                    .filter(s -> MODERATOR_STATUSES.contains(s))
                    .distinct()
                    .toList();
            if (statuses.isEmpty()) {
                statuses = new ArrayList<>(AUTHOR_STATUSES);
            }
        }
        Page<Post> data = postRepository.findByAuthorAndStatusInOrderByCreatedAtDesc(author, statuses, pageable(page, size));
        Map<String, Object> payload = new HashMap<>();
        payload.put("items", data.getContent().stream().map(this::toResponse).toList());
        payload.put("total", data.getTotalElements());
        payload.put("page", page);
        payload.put("size", size);
        return ResponseEntity.ok(payload);
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> create(@RequestBody PostDtos.EditorRequest request, Authentication auth) {
        User author = currentUser(auth);
        Post post = new Post();
        post.setAuthor(author);
        applyEditorFields(post, request, auth);
        Post saved = postRepository.save(post);
        return ResponseEntity.ok(toResponse(saved));
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody PostDtos.EditorRequest request, Authentication auth) {
        Post post = postRepository.findById(id).orElse(null);
        if (post == null) return ResponseEntity.notFound().build();
        User author = currentUser(auth);
        boolean isOwner = post.getAuthor() != null && post.getAuthor().getId().equals(author.getId());
        if (!(isOwner || canModerate(auth))) {
            return ResponseEntity.status(403).body("Bạn không có quyền chỉnh sửa bài viết này");
        }
        applyEditorFields(post, request, auth);
        Post saved = postRepository.save(post);
        return ResponseEntity.ok(toResponse(saved));
    }
}
