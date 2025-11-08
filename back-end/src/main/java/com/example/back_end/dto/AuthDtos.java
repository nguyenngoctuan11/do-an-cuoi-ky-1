package com.example.back_end.dto;

public class AuthDtos {
    public static class RegisterRequest {
        public String email;
        public String password;
        public String fullName;
        public String role; // optional: student | teacher (manager should be assigned by admin)
    }

    public static class LoginRequest {
        public String email;
        public String password;
    }

    public static class AuthResponse {
        public String accessToken;
        public String tokenType = "Bearer";
        public String email;
        public String fullName;
        public ListRole roles;
    }

    public static class ListRole {
        public java.util.List<String> items;
        public ListRole() {}
        public ListRole(java.util.List<String> items) { this.items = items; }
    }
}

