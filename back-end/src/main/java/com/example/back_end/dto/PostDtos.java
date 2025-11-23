package com.example.back_end.dto;

import java.time.LocalDateTime;
import java.util.List;

public class PostDtos {
    public static class EditorRequest {
        public String title;
        public Long courseId;
        public String category;
        public String visibility;
        public List<String> tags;
        public String content;
        public String coverImageUrl;
        public List<String> attachments;
        public String status;
        public String excerpt;
    }

    public static class PostResponse {
        public Long id;
        public String slug;
        public String title;
        public String content;
        public String excerpt;
        public String status;
        public String visibility;
        public String category;
        public List<String> tags;
        public String coverImageUrl;
        public List<String> attachments;
        public Long courseId;
        public String courseTitle;
        public Long authorId;
        public String authorName;
        public String authorAvatar;
        public LocalDateTime createdAt;
        public LocalDateTime updatedAt;
        public LocalDateTime publishedAt;
        public String rejectedReason;
    }
}
