package com.example.back_end.dto;

import java.util.List;

public class QuizDtos {
    public static class CreateQuizRequest { public Long courseId; public String title; public Integer timeLimitSec; public Boolean shuffle; }
    public static class QuizSummary { public Long id; public String title; public Integer timeLimitSec; public Integer questions; }
    public static class AddQuestionRequest {
        public String text; public Integer points; public List<Option> options; // up to 4
        public static class Option { public String text; public Boolean correct; }
    }
    public static class StartResponse {
        public Long attemptId; public Long quizId; public Integer timeLimitSec; public List<Question> questions;
    }
    public static class Question { public Long id; public String text; public List<Choice> choices; }
    public static class Choice { public Long id; public String text; }
    public static class SubmitRequest { public Long attemptId; public List<Answer> answers; public static class Answer { public Long questionId; public Long optionId; } }
    public static class Result { public Long attemptId; public int correct; public int total; public double score; }
}

