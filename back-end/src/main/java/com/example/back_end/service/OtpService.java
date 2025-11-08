package com.example.back_end.service;

import com.example.back_end.dto.AuthDtos;
import com.example.back_end.model.EmailOtp;
import com.example.back_end.model.Role;
import com.example.back_end.model.User;
import com.example.back_end.repository.EmailOtpRepository;
import com.example.back_end.repository.RoleRepository;
import com.example.back_end.repository.UserRepository;
import com.example.back_end.security.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.stream.Collectors;

@Service
public class OtpService {
    private final EmailOtpRepository otpRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.otp.expire-min:10}")
    private int expireMin;

    @Value("${app.otp.debug:true}")
    private boolean debug;

    public OtpService(EmailOtpRepository otpRepository, UserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.otpRepository = otpRepository; this.userRepository = userRepository; this.roleRepository = roleRepository; this.passwordEncoder = passwordEncoder; this.jwtService = jwtService;
    }

    private String genCode() {
        int n = new Random().nextInt(900000) + 100000; // 6-digit
        return String.valueOf(n);
    }

    @Transactional
    public Map<String, Object> startRegister(AuthDtos.RegisterRequest req) {
        if (userRepository.findByEmailIgnoreCase(req.email).isPresent()) {
            throw new IllegalArgumentException("Email đã tồn tại");
        }
        String roleCode = (req.role == null || req.role.isBlank()) ? "student" : req.role.trim().toLowerCase();
        Role role = roleRepository.findByCode(roleCode).orElseThrow(() -> new IllegalArgumentException("Role không hợp lệ"));

        String code = genCode();
        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                    "fullName", req.fullName,
                    "passwordHash", passwordEncoder.encode(req.password),
                    "role", role.getCode()
            ));
            EmailOtp otp = new EmailOtp();
            otp.setEmail(req.email);
            otp.setPurpose("register");
            otp.setCode(code);
            otp.setPayload(payload);
            otp.setExpiresAt(LocalDateTime.now().plusMinutes(expireMin));
            otpRepository.save(otp);
        } catch (Exception e) {
            throw new IllegalArgumentException("Không thể tạo OTP: " + e.getMessage());
        }

        // TODO: Integrate email sending via JavaMailSender if configured.
        return debug ? Map.of("ok", true, "devCode", code, "expireMin", expireMin) : Map.of("ok", true, "expireMin", expireMin);
    }

    @Transactional
    public AuthDtos.AuthResponse verifyRegister(String email, String code) {
        EmailOtp otp = otpRepository.findTopByEmailIgnoreCaseAndPurposeAndCodeAndConsumedAtIsNullAndExpiresAtAfterOrderByIdDesc(
                email, "register", code, LocalDateTime.now()).orElseThrow(() -> new IllegalArgumentException("Mã OTP không hợp lệ hoặc đã hết hạn"));
        try {
            Map<String, Object> data = objectMapper.readValue(otp.getPayload(), Map.class);
            String fullName = String.valueOf(data.get("fullName"));
            String passwordHash = String.valueOf(data.get("passwordHash"));
            String role = String.valueOf(data.get("role"));

            if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
                throw new IllegalArgumentException("Email đã tồn tại");
            }
            Role r = roleRepository.findByCode(role).orElseThrow();
            User u = new User();
            u.setEmail(email);
            u.setFullName(fullName);
            u.setPasswordHash(passwordHash);
            u.getRoles().add(r);
            u.setLocale("vi"); u.setStatus("active"); u.setCreatedAt(LocalDateTime.now()); u.setUpdatedAt(LocalDateTime.now());
            u = userRepository.save(u);

            otp.setConsumedAt(LocalDateTime.now());
            otpRepository.save(otp);

            List<String> roleCodes = u.getRoles().stream().map(Role::getCode).collect(Collectors.toList());
            String token = jwtService.generate(u.getEmail(), Map.of("uid", u.getId(), "roles", roleCodes));
            AuthDtos.AuthResponse res = new AuthDtos.AuthResponse();
            res.accessToken = token; res.email = u.getEmail(); res.fullName = u.getFullName(); res.roles = new AuthDtos.ListRole(roleCodes);
            return res;
        } catch (Exception e) {
            throw new IllegalArgumentException(e.getMessage());
        }
    }
}

