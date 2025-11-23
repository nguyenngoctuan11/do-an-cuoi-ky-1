package com.example.back_end.config;

import com.example.back_end.model.Role;
import com.example.back_end.model.User;
import com.example.back_end.repository.RoleRepository;
import com.example.back_end.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

@Configuration
public class StartupData {
    private static final Logger log = LoggerFactory.getLogger(StartupData.class);

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap.manager.email:manager@lms.local}")
    private String managerEmail;
    @Value("${app.bootstrap.manager.password:Manager123!}")
    private String managerPassword;
    @Value("${app.bootstrap.manager.full-name:Quản lý hệ thống}")
    private String managerFullName;

    @Value("${app.bootstrap.teacher.email:teacher@lms.local}")
    private String teacherEmail;
    @Value("${app.bootstrap.teacher.password:Teacher123!}")
    private String teacherPassword;
    @Value("${app.bootstrap.teacher.full-name:Giảng viên demo}")
    private String teacherFullName;

    public StartupData(RoleRepository roleRepository,
                       UserRepository userRepository,
                       PasswordEncoder passwordEncoder) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Bean
    CommandLineRunner seedInitialData() {
        return args -> {
            Role student = getOrCreateRole("student", "Học viên");
            Role teacher = getOrCreateRole("teacher", "Giảng viên");
            Role manager = getOrCreateRole("manager", "Quản lý");

            ensureBootstrapUser(managerEmail, managerPassword, managerFullName, Set.of(manager));
            ensureBootstrapUser(teacherEmail, teacherPassword, teacherFullName, Set.of(teacher));

            // If someone prefers a single account that can do everything, keep manager+teacher in sync.
            if (StringUtils.hasText(teacherEmail) && teacherEmail.equalsIgnoreCase(managerEmail)) {
                ensureBootstrapUser(managerEmail, managerPassword, managerFullName, Set.of(manager, teacher));
            }
        };
    }

    private Role getOrCreateRole(String code, String name) {
        return roleRepository.findByCode(code).orElseGet(() -> {
            Role role = new Role();
            role.setCode(code);
            role.setName(name);
            log.info("Seeded default role '{}'", code);
            return roleRepository.save(role);
        });
    }

    private void ensureBootstrapUser(String email, String rawPassword, String fullName, Set<Role> roles) {
        if (!StringUtils.hasText(email) || !StringUtils.hasText(rawPassword) || roles == null || roles.isEmpty()) {
            return;
        }

        userRepository.findByEmailIgnoreCase(email.trim()).ifPresentOrElse(existing -> {
            Set<Role> updatedRoles = new HashSet<>(existing.getRoles());
            boolean changed = updatedRoles.addAll(roles);
            if (changed) {
                existing.setRoles(updatedRoles);
                userRepository.save(existing);
                log.info("Ensured bootstrap roles {} for '{}'", describeRoles(updatedRoles), email);
            }
        }, () -> {
            User user = new User();
            user.setEmail(email.trim().toLowerCase(Locale.ROOT));
            user.setPasswordHash(passwordEncoder.encode(rawPassword));
            user.setFullName(StringUtils.hasText(fullName) ? fullName.trim() : email);
            user.setUsername(generateUsername(email));
            user.setLocale("vi");
            user.setStatus("active");
            user.setTwoFactorEnabled(false);
            LocalDateTime now = LocalDateTime.now();
            user.setCreatedAt(now);
            user.setUpdatedAt(now);
            user.setRoles(new HashSet<>(roles));
            userRepository.save(user);
            log.info("Seeded bootstrap user '{}' with roles {}", email, describeRoles(roles));
        });
    }

    private String generateUsername(String email) {
        String base = email.substring(0, email.indexOf('@')).replaceAll("[^a-zA-Z0-9]", "");
        if (!StringUtils.hasText(base)) {
            base = "user";
        }
        String candidate = base;
        int attempt = 1;
        while (userRepository.existsByUsernameIgnoreCaseAndIdNot(candidate, -1L)) {
            candidate = base + attempt;
            attempt++;
        }
        return candidate;
    }

    private String describeRoles(Set<Role> roles) {
        return roles.stream().map(Role::getCode).sorted().toList().toString();
    }
}
