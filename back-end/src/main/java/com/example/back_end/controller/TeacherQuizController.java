package com.example.back_end.controller;

import com.example.back_end.dto.QuizDtos;
import com.example.back_end.model.Course;
import com.example.back_end.model.User;
import com.example.back_end.repository.CourseRepository;
import com.example.back_end.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/teacher/quizzes")
public class TeacherQuizController {
    @PersistenceContext private EntityManager em;
    private final CourseRepository courseRepository; private final UserRepository userRepository;
    public TeacherQuizController(CourseRepository courseRepository, UserRepository userRepository){ this.courseRepository=courseRepository; this.userRepository=userRepository; }
    private User currentUser(Authentication auth){ return userRepository.findByEmailIgnoreCase(String.valueOf(auth.getPrincipal())).orElseThrow(); }

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER','MANAGER')")
    @Transactional
    public ResponseEntity<?> create(@RequestBody QuizDtos.CreateQuizRequest req, Authentication auth){
        Course c = courseRepository.findById(req.courseId).orElseThrow();
        // ownership check (teacher owner) — managers bypass
        boolean isManager = auth.getAuthorities().stream().anyMatch(a->a.getAuthority().equals("ROLE_MANAGER"));
        if(!isManager && !c.getCreatedBy().getEmail().equalsIgnoreCase(String.valueOf(auth.getPrincipal()))) return ResponseEntity.status(403).body("Not owner");
        Object idObj = em.createNativeQuery(
                "INSERT INTO dbo.quizzes(course_id, title, time_limit_sec, shuffle, grading_policy) " +
                "OUTPUT inserted.id VALUES (?,?,?,?,N'manual')")
                .setParameter(1, c.getId())
                .setParameter(2, (req.title!=null && !req.title.isBlank()) ? req.title : "Bài kiểm tra")
                .setParameter(3, req.timeLimitSec!=null? req.timeLimitSec: 1200)
                .setParameter(4, Boolean.TRUE.equals(req.shuffle)? 1: 0)
                .getSingleResult();
        Long id = ((Number) idObj).longValue();
        return ResponseEntity.ok(Map.of("id", id));
    }

    @GetMapping("/course/{courseId}")
    @PreAuthorize("hasAnyRole('TEACHER','MANAGER')")
    public ResponseEntity<List<Map<String,Object>>> listForCourse(@PathVariable Long courseId){
        @SuppressWarnings("unchecked")
        List<Object[]> rows = (List<Object[]>) em.createNativeQuery(
                "SELECT q.id, q.title, q.time_limit_sec, (SELECT COUNT(*) FROM dbo.questions WHERE quiz_id=q.id) FROM dbo.quizzes q WHERE q.course_id = :cid ORDER BY q.id DESC")
                .setParameter("cid", courseId).getResultList();
        List<Map<String,Object>> list = new java.util.ArrayList<>();
        for(Object[] r : rows){
            java.util.Map<String,Object> m = new java.util.LinkedHashMap<>();
            m.put("id", ((Number)r[0]).longValue());
            m.put("title", String.valueOf(r[1]));
            m.put("timeLimitSec", r[2]==null? null: ((Number)r[2]).intValue());
            m.put("questions", ((Number)r[3]).intValue());
            list.add(m);
        }
        return ResponseEntity.ok(list);
    }

    @PostMapping("/{quizId}/questions")
    @PreAuthorize("hasAnyRole('TEACHER','MANAGER')")
    @Transactional
    public ResponseEntity<?> addQuestion(@PathVariable Long quizId, @RequestBody QuizDtos.AddQuestionRequest req){
        Object qidObj = em.createNativeQuery(
                "INSERT INTO dbo.questions(quiz_id, type, text, points, sort_order) " +
                "OUTPUT inserted.id VALUES(?, N'sc', ?, ?, (SELECT ISNULL(MAX(sort_order),0)+1 FROM dbo.questions WHERE quiz_id=?))")
                .setParameter(1, quizId)
                .setParameter(2, req.text)
                .setParameter(3, req.points!=null? req.points: 1)
                .setParameter(4, quizId)
                .getSingleResult();
        Long qid = ((Number) qidObj).longValue();
        if(req.options!=null){
            int i=0; for(QuizDtos.AddQuestionRequest.Option o : req.options){ i++;
                em.createNativeQuery("INSERT INTO dbo.question_options(question_id, text, is_correct, sort_order) VALUES (?,?,?,?)")
                        .setParameter(1, qid)
                        .setParameter(2, o.text)
                        .setParameter(3, Boolean.TRUE.equals(o.correct)?1:0)
                        .setParameter(4, i)
                        .executeUpdate();
            }
        }
        return ResponseEntity.ok(Map.of("id", qid));
    }
}
