package com.example.back_end.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public/quiz")
@CrossOrigin(origins = "*")
public class PublicQuizQuestionsController {

    private final JdbcTemplate jdbc;

    public PublicQuizQuestionsController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping(value = "/{quizId}/questions", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<Map<String, Object>>> loadQuestions(@PathVariable("quizId") Long quizId,
                                                                   @RequestParam(value = "debug", required = false) Boolean debug) {
        if (quizId == null) return ResponseEntity.ok(List.of());

        String qSql = "SELECT id, content, image_url, video_url FROM dbo.questions WHERE quiz_id = ? ORDER BY id";
        List<Map<String, Object>> qRows = jdbc.queryForList(qSql, quizId);

        if (qRows.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        List<Long> qIds = qRows.stream().map(r -> ((Number) r.get("id")).longValue()).collect(Collectors.toList());
        List<Map<String, Object>> oRows = List.of();
        String qidCol = resolveQuestionIdColumn();
        if (qidCol != null && !qIds.isEmpty()) {
            String placeholders = qIds.stream().map(id -> "?").collect(Collectors.joining(","));
            String oSql = "SELECT id, " + qidCol + " AS question_id, label, content, is_correct FROM dbo.question_options WHERE " + qidCol + " IN (" + placeholders + ") ORDER BY " + qidCol + ", label";
            try {
                oRows = jdbc.queryForList(oSql, qIds.toArray());
            } catch (Exception ignore) {
                oRows = List.of();
            }
        }

        Map<Long, List<Map<String, Object>>> byQuestion = oRows.stream().collect(Collectors.groupingBy(r -> ((Number) r.get("question_id")).longValue(), LinkedHashMap::new, Collectors.toList()));

        boolean includeCorrect = Boolean.TRUE.equals(debug);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> q : qRows) {
            Long qid = ((Number) q.get("id")).longValue();
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", qid);
            item.put("content", q.get("content"));
            item.put("image_url", q.get("image_url"));
            item.put("video_url", q.get("video_url"));

            List<Map<String, Object>> opts = new ArrayList<>();
            for (Map<String, Object> o : byQuestion.getOrDefault(qid, List.of())) {
                Map<String, Object> opt = new LinkedHashMap<>();
                opt.put("id", ((Number) o.get("id")).longValue());
                opt.put("label", o.get("label"));
                opt.put("content", o.get("content"));
                if (includeCorrect) opt.put("is_correct", ((Number) o.get("is_correct")).intValue() == 1);
                opts.add(opt);
            }
            item.put("options", opts);
            result.add(item);
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping(value = "/{quizId}/grade", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> grade(@PathVariable("quizId") Long quizId, @RequestBody Map<String, Object> body) {
        List<Map<String, Object>> answers = (List<Map<String, Object>>) body.getOrDefault("answers", List.of());
        int total = answers.size();
        int correct = 0;
        for (Map<String, Object> a : answers) {
            Long qid = toLong(a.get("question_id"));
            Long oid = toLong(a.get("option_id"));
            if (qid == null || oid == null) continue;
            Integer ok = 0;
            String qidCol = resolveQuestionIdColumn();
            if (qidCol != null) {
                String sql = "SELECT is_correct FROM dbo.question_options WHERE id=? AND " + qidCol + "=?";
                ok = jdbc.query(sql, rs -> rs.next() ? rs.getInt(1) : 0, oid, qid);
            }
            if (ok != null && ok == 1) correct++;
        }
        double percent = total == 0 ? 0 : (correct * 100.0 / total);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("totalQuestions", total);
        res.put("correct", correct);
        res.put("scorePercent", percent);
        return ResponseEntity.ok(res);
    }

    private String resolveQuestionIdColumn() {
        try {
            if (existsColumn("dbo.question_options", "question_id")) return "question_id";
            if (existsColumn("dbo.question_options", "questionId")) return "questionId";
            if (existsColumn("dbo.question_options", "qid")) return "qid";
        } catch (Exception ignore) {}
        return null;
    }

    private boolean existsColumn(String table, String col) {
        Integer n = jdbc.query("SELECT COUNT(*) FROM sys.columns WHERE Name = ? AND Object_ID = Object_ID(?)",
                rs -> rs.next() ? rs.getInt(1) : 0, col, table);
        return n != null && n > 0;
    }

    private static Long toLong(Object v) {
        if (v == null) return null;
        if (v instanceof Number) return ((Number) v).longValue();
        try { return Long.parseLong(String.valueOf(v)); } catch (Exception e) { return null; }
    }
}
