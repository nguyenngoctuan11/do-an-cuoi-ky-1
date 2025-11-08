package com.example.back_end.controller;

import com.example.back_end.dto.AuthDtos;
import com.example.back_end.service.OtpService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth/otp")
public class AuthOtpController {
    private final OtpService otpService;
    public AuthOtpController(OtpService otpService) { this.otpService = otpService; }

    @PostMapping("/register/start")
    public ResponseEntity<?> start(@RequestBody AuthDtos.RegisterRequest req) {
        try {
            return ResponseEntity.ok(otpService.startRegister(req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/register/verify")
    public ResponseEntity<?> verify(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email"); String code = body.get("code");
            return ResponseEntity.ok(otpService.verifyRegister(email, code));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}

