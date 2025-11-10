package com.example.back_end.dto;

import java.math.BigDecimal;

public class CourseDtos {
    public static class CreateRequest {
        public String title;
        public String slug;
        public String shortDesc;
        public String language; // vi,en
        public String level;    // beginner,intermediate,advanced
        public String status;   // draft,published,archived
        public BigDecimal price;
        public String thumbnailUrl; // optional direct set
    }

    public static class UpdateRequest extends CreateRequest { }

    public static class CourseResponse {
        public Long id;
        public String title;
        public String slug;
        public String shortDesc;
        public String language;
        public String level;
        public String status;
        public BigDecimal price;
        public Long createdById;
        public String createdByEmail;
        public String thumbnailUrl;
        public String approvalStatus;
    }
}
