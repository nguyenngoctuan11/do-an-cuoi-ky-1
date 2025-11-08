package com.example.back_end.controller;

import com.example.back_end.dto.QuizDtos;
import com.example.back_end.model.User;
import com.example.back_end.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/quiz")
public class StudentQuizController {
    @PersistenceContext private EntityManager em;
    private final UserRepository userRepository;
    public StudentQuizController(UserRepository userRepository){ this.userRepository = userRepository; }
    private Long uid(Authentication auth){ return userRepository.findByEmailIgnoreCase(String.valueOf(auth.getPrincipal())).orElseThrow().getId(); }

    @GetMapping("/course/{key}")
    public ResponseEntity<List<QuizDtos.QuizSummary>> publicList(@PathVariable String key){
        // key có thể là id (số) hoặc slug
        Long courseId = null;
        try { courseId = Long.parseLong(key); } catch (NumberFormatException ignore) { }
        if (courseId == null) {
            @SuppressWarnings("unchecked")
            List<Object> ids = (List<Object>) em.createNativeQuery("SELECT id FROM dbo.courses WHERE slug = :slug")
                    .setParameter("slug", key).getResultList();
            if (ids.isEmpty()) return ResponseEntity.ok(java.util.Collections.emptyList());
            courseId = ((Number) ids.get(0)).longValue();
        }
        @SuppressWarnings("unchecked")
        List<Object[]> rows = (List<Object[]>) em.createNativeQuery(
                "SELECT q.id, q.title, q.time_limit_sec, (SELECT COUNT(*) FROM dbo.questions WHERE quiz_id=q.id) FROM dbo.quizzes q WHERE q.course_id = :cid ORDER BY q.id DESC")
                .setParameter("cid", courseId).getResultList();
        List<QuizDtos.QuizSummary> list = new ArrayList<>();
        for(Object[] r: rows){ QuizDtos.QuizSummary s=new QuizDtos.QuizSummary(); s.id=((Number)r[0]).longValue(); s.title=String.valueOf(r[1]); s.timeLimitSec=r[2]==null?null:((Number)r[2]).intValue(); s.questions=((Number)r[3]).intValue(); list.add(s);}        
        return ResponseEntity.ok(list);
    }

    @PostMapping("/{quizId}/start")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<QuizDtos.StartResponse> start(@PathVariable Long quizId, Authentication auth){
        Long userId = uid(auth);
        Object attObj = em.createNativeQuery(
                "INSERT INTO dbo.quiz_attempts(quiz_id, user_id, status) OUTPUT inserted.id VALUES (?, ?, N'in_progress')")
                .setParameter(1, quizId).setParameter(2, userId).getSingleResult();
        Long attemptId = ((Number) attObj).longValue();
        List<Object[]> qs = em.createNativeQuery("SELECT id, text FROM dbo.questions WHERE quiz_id = :qid ORDER BY NEWID()").setParameter("qid", quizId).getResultList();
        List<QuizDtos.Question> qList = new ArrayList<>();
        for(Object[] q: qs){
            Long qid = ((Number)q[0]).longValue();
            QuizDtos.Question qq = new QuizDtos.Question(); qq.id=qid; qq.text=String.valueOf(q[1]);
            List<Object[]> ops = em.createNativeQuery("SELECT id, text FROM dbo.question_options WHERE question_id = :qid ORDER BY NEWID()").setParameter("qid", qid).getResultList();
            List<QuizDtos.Choice> choices = new ArrayList<>();
            for(Object[] o: ops){ QuizDtos.Choice c = new QuizDtos.Choice(); c.id=((Number)o[0]).longValue(); c.text=String.valueOf(o[1]); choices.add(c);}            
            qq.choices = choices; qList.add(qq);
        }
        QuizDtos.StartResponse res = new QuizDtos.StartResponse(); res.attemptId=attemptId; res.quizId=quizId; res.timeLimitSec=null; res.questions=qList; return ResponseEntity.ok(res);
    }

    @PostMapping("/{quizId}/submit")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<QuizDtos.Result> submit(@PathVariable Long quizId, @RequestBody QuizDtos.SubmitRequest body, Authentication auth){
        Long userId = uid(auth);
        Long attId = body.attemptId;
        int correct = 0; int total = 0;
        for(QuizDtos.SubmitRequest.Answer a : body.answers){
            total++;
            boolean isCorrect = !em.createNativeQuery("SELECT 1 FROM dbo.question_options WHERE id = :oid AND question_id = :qid AND is_correct = 1")
                    .setParameter("oid", a.optionId).setParameter("qid", a.questionId).getResultList().isEmpty();
            if(isCorrect) correct++;
            em.createNativeQuery("INSERT INTO dbo.quiz_answers(attempt_id, question_id, selected_option_id, is_correct) VALUES (?,?,?,?)")
                    .setParameter(1, attId).setParameter(2, a.questionId).setParameter(3, a.optionId).setParameter(4, isCorrect?1:0).executeUpdate();
        }
        double score = total>0 ? (double) correct : 0;
        em.createNativeQuery("UPDATE dbo.quiz_attempts SET status = N'graded', score = ?, finished_at = GETUTCDATE() WHERE id = ? AND user_id = ?")
                .setParameter(1, score).setParameter(2, attId).setParameter(3, userId).executeUpdate();
        QuizDtos.Result r = new QuizDtos.Result(); r.attemptId = attId; r.correct = correct; r.total = total; r.score = score;
        return ResponseEntity.ok(r);
    }
}
