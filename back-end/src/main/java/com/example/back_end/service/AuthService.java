package com.example.back_end.service;

import com.example.back_end.dto.AuthDtos;
import com.example.back_end.model.Role;
import com.example.back_end.model.User;
import com.example.back_end.repository.RoleRepository;
import com.example.back_end.repository.UserRepository;
import com.example.back_end.security.JwtService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest req) {
        String roleCode = (req.role == null || req.role.isBlank()) ? "student" : req.role.trim().toLowerCase();
        if (roleCode.equals("manager")) {
            throw new IllegalArgumentException("Không thể tự đăng ký quyền manager");
        }
        Role role = roleRepository.findByCode(roleCode)
                .orElseThrow(() -> new IllegalArgumentException("Role không hợp lệ: " + roleCode));

        User u = new User();
        u.setEmail(req.email);
        u.setPasswordHash(passwordEncoder.encode(req.password));
        u.setFullName(req.fullName);
        u.setLocale("vi");
        u.setStatus("active");
        u.setCreatedAt(LocalDateTime.now());
        u.setUpdatedAt(LocalDateTime.now());
        u.getRoles().add(role);

        try {
            u = userRepository.save(u);
        } catch (DataIntegrityViolationException ex) {
            throw new IllegalArgumentException("Email đã tồn tại");
        }

        return toAuthResponse(u);
    }

    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest req) {
        User u = userRepository.findByEmailIgnoreCase(req.email)
                .orElseThrow(() -> new IllegalArgumentException("Sai email hoặc mật khẩu"));
        if (!passwordEncoder.matches(req.password, u.getPasswordHash())) {
            throw new IllegalArgumentException("Sai email hoặc mật khẩu");
        }
        return toAuthResponse(u);
    }

    private AuthDtos.AuthResponse toAuthResponse(User u) {
        List<String> roleCodes = u.getRoles().stream().map(Role::getCode).collect(Collectors.toList());
        String token = jwtService.generate(u.getEmail(), Map.of("uid", u.getId(), "roles", roleCodes));
        AuthDtos.AuthResponse res = new AuthDtos.AuthResponse();
        res.accessToken = token;
        res.email = u.getEmail();
        res.fullName = u.getFullName();
        res.roles = new AuthDtos.ListRole(roleCodes);
        return res;
    }

    public Map<String, Object> me(String email) {
        User u = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        List<String> roleCodes = u.getRoles().stream().map(Role::getCode).collect(Collectors.toList());
        return Map.of(
                "id", u.getId(),
                "email", u.getEmail(),
                "fullName", u.getFullName(),
                "roles", roleCodes
        );
    }
}
