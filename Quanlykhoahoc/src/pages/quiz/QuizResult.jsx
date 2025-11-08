import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";

export default function QuizResult() {
  const { courseId } = useParams();
  const { state } = useLocation();
  const correct = state?.correct ?? 0;
  const total = state?.total ?? 0;
  const pass = correct >= Math.ceil(total * 0.8);
  return (
    <div className="bg-white">
      <div className="max-w-lg mx-auto px-4 py-10 text-center">
        <div className={`text-6xl font-extrabold ${pass ? "text-primary-600" : "text-stone-700"}`}>{correct}/{total}</div>
        <h1 className="mt-2 text-2xl font-bold text-stone-900">{pass ? "Chúc mừng! Bạn đã vượt qua" : "Bạn cần cố gắng thêm"}</h1>
        <p className="mt-2 text-stone-600">Bạn có thể xem lại bài học hoặc làm lại bài kiểm tra để cải thiện kết quả.</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link to={`/learn/${courseId || "fullstack"}`} className="btn border-stone-300 hover:border-stone-400">Xem lại bài học</Link>
          <Link to={`/quiz/${courseId || "fullstack"}/run`} className="btn btn-primary">Làm lại bài</Link>
        </div>
      </div>
    </div>
  );
}

