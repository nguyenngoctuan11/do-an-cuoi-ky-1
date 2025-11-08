package com.example_back_end.config;

import org.springframework.context.annotation.Bean;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.stereotype.Component;

@Component
public class SecurityQuizPermitConfig {

    @Bean
    @Order(0)
    public SecurityFilterChain quizPermitChain(HttpSecurity http) throws Exception {
        var courseMatcher = new AntPathRequestMatcher("/api/quiz/course/**");
        var publicCourseMatcher = new AntPathRequestMatcher("/api/quiz/public/course/**");

        http
            .securityMatcher(request -> courseMatcher.matches(request) || publicCourseMatcher.matches(request))
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
            .csrf(csrf -> csrf.disable())
            .cors(cors -> {});
        return http.build();
    }
}

