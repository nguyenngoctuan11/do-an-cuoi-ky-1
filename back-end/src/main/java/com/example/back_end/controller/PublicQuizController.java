package com.example.back_end.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class PublicQuizController {

    private final JdbcTemplate jdbc;

    public PublicQuizController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // Public alias under /api/public/** (usually whitelisted)
    @GetMapping(value = "/public/quiz/course/{key}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<Map<String, Object>>> publicListByCourseKey(@PathVariable("key") String key) {
        return listByCourseKeyInternal(key);
    }

    // Also expose under /api/quiz/** for callers already using this path
    @GetMapping(value = "/quiz/course/{key}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<Map<String, Object>>> listByCourseKey(@PathVariable("key") String key) {
        return listByCourseKeyInternal(key);
    }

    private ResponseEntity<List<Map<String, Object>>> listByCourseKeyInternal(String key) {
        Long courseId = resolveCourseId(key);
        if (courseId == null) {
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(List.of());
        }

        String sql = "SELECT q.id, q.title, q.time_limit_sec, " +
                "q.time_limit_sec AS timeLimitSec, q.shuffle, q.grading_policy, " +
                "ISNULL((SELECT COUNT(*) FROM dbo.questions qu WHERE qu.quiz_id = q.id), 0) AS question_count, " +
                "ISNULL((SELECT COUNT(*) FROM dbo.questions qu2 WHERE qu2.quiz_id = q.id), 0) AS questionCount " +
                "FROM dbo.quizzes q " +
                "WHERE q.course_id = ? " +
                "ORDER BY q.id DESC";

        List<Map<String, Object>> rows = jdbc.queryForList(sql, courseId);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(rows);
    }

    private Long resolveCourseId(String key) {
        try {
            long id = Long.parseLong(key.trim());
            Long found = jdbc.query("SELECT id FROM dbo.courses WHERE id = ?", rs -> {
                if (rs.next()) return rs.getLong(1); else return null;
            }, id);
            return found;
        } catch (NumberFormatException ignore) {
            String slug = key.trim();
            return jdbc.query("SELECT id FROM dbo.courses WHERE slug = ?", rs -> {
                if (rs.next()) return rs.getLong(1); else return null;
            }, slug);
        }
    }
}

