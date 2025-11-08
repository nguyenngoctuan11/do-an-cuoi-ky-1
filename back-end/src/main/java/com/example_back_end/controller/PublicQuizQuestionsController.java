package com.example_back_end.controller;

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

    // GET /api/public/quiz/{quizId}/questions?debug=true -> include is_correct for dev
    @GetMapping(value = "/{quizId}/questions", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<Map<String, Object>>> loadQuestions(@PathVariable("quizId") Long quizId,
                                                                   @RequestParam(value = "debug", required = false) Boolean debug) {
        if (quizId == null) return ResponseEntity.ok(List.of());

        String questionsTable = resolveQuestionsTable();
        String qContentExpr = buildCoalesceExpr(questionsTable, List.of("content","text","question_text","title"), "content", "");
        String qImageExpr = buildCoalesceExpr(questionsTable, List.of("image_url","image","img_url","thumbnail_url"), "image_url", null);
        String qVideoExpr = buildCoalesceExpr(questionsTable, List.of("video_url","video","media_url"), "video_url", null);
        String qSql = "SELECT id, " + qContentExpr + ", " + qImageExpr + ", " + qVideoExpr + " FROM " + questionsTable + " WHERE quiz_id = ? ORDER BY id";
        List<Map<String, Object>> qRows = jdbc.queryForList(qSql, quizId);

        if (qRows.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        // Fetch options by question_id list (works even if question_options doesn't have quiz_id column)
        List<Long> qIds = qRows.stream().map(r -> ((Number) r.get("id")).longValue()).collect(Collectors.toList());
        List<Map<String, Object>> oRows = List.of();
        String qidCol = resolveQuestionIdColumn();
        if (qidCol != null && !qIds.isEmpty()) {
            String placeholders = qIds.stream().map(id -> "?").collect(Collectors.joining(","));
            String optTable = "dbo.question_options";
            String contentCol = en(resolveColumn(optTable, "content", List.of("content", "text", "option_text", "answer_text")));
            String orderCol = en(existsColumn(optTable, "sort_order") ? "sort_order" : "id");
            String qidColEn = en(qidCol);
            String oSql = "SELECT id, " + qidColEn + " AS question_id, " + contentCol + " AS content, is_correct, " + orderCol + " AS ord FROM " + optTable + " WHERE " + qidColEn + " IN (" + placeholders + ") ORDER BY " + qidColEn + ", " + orderCol + ", id";
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
            int idx = 0;
            for (Map<String, Object> o : byQuestion.getOrDefault(qid, List.of())) {
                Map<String, Object> opt = new LinkedHashMap<>();
                opt.put("id", ((Number) o.get("id")).longValue());
                String lbl = String.valueOf((char)('A' + Math.min(idx, 25)));
                idx++;
                opt.put("label", lbl);
                opt.put("content", o.get("content"));
                if (includeCorrect) opt.put("is_correct", ((Number) o.get("is_correct")).intValue() == 1);
                opts.add(opt);
            }
            item.put("options", opts);
            result.add(item);
        }
        return ResponseEntity.ok(result);
    }

    // POST /api/public/quiz/{quizId}/grade  body: { answers: [{question_id, option_id}] }
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
                String sql = "SELECT is_correct FROM dbo.question_options WHERE id=? AND " + en(qidCol) + "=?";
                ok = jdbc.query(sql, rs -> rs.next() ? rs.getInt(1) : 0, oid, qid);
            } else {
                ok = 0; // cannot verify without a question-id column
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

    private String resolveQuestionsTable() {
        if (existsTable("dbo", "questions")) return "dbo.questions";
        if (existsTable("dbo", "quiz_questions")) return "dbo.quiz_questions";
        // Try to find any table that has quiz_id and a text-like column
        List<Map<String,Object>> cand = jdbc.queryForList(
                "SELECT s.name AS schema_name, t.name AS table_name " +
                "FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id " +
                "WHERE t.name LIKE '%questions%' OR t.name LIKE '%quiz_question%'");
        for (Map<String,Object> row: cand) {
            String tbl = row.get("schema_name")+"."+row.get("table_name");
            if (existsColumn(tbl, "quiz_id")) return tbl;
        }
        // fallback
        return "dbo.questions";
    }

    private boolean existsTable(String schema, String name) {
        Integer n = jdbc.query("SELECT COUNT(*) FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE t.name=? AND s.name=?",
                rs -> rs.next() ? rs.getInt(1) : 0, name, schema);
        return n != null && n > 0;
    }

    private String resolveColumn(String table, String wanted, List<String> candidates) {
        for (String c : candidates) {
            if (existsColumn(table, c)) return c;
        }
        return candidates.get(0);
    }

    private String en(String col) {
        if (col == null) return null;
        String c = col.trim();
        if (c.startsWith("[") && c.endsWith("]")) return c;
        // quote identifier to avoid reserved words like 'text'
        return "[" + c + "]";
    }

    private String buildCoalesceExpr(String table, List<String> candidates, String alias, String defaultVal) {
        List<String> exist = new ArrayList<>();
        for (String c : candidates) if (existsColumn(table, c)) exist.add(en(c));
        if (exist.isEmpty()) {
            if (defaultVal == null) return "CAST(NULL AS NVARCHAR(512)) AS " + alias;
            return "CAST('" + defaultVal.replace("'","''") + "' AS NVARCHAR(4000)) AS " + alias;
        }
        return "COALESCE(" + String.join(",", exist) + ") AS " + alias;
    }

    private static Long toLong(Object v) {
        if (v == null) return null;
        if (v instanceof Number) return ((Number) v).longValue();
        try { return Long.parseLong(String.valueOf(v)); } catch (Exception e) { return null; }
    }
}
