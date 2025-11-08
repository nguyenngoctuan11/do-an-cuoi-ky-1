import React from "react";
import { Link, Outlet, useParams } from "react-router-dom";

export default function LearnLayout() {
  const { courseId } = useParams();
  return (
    <div className="bg-white min-h-[calc(100vh-64px-64px)]">
      <div className="border-b border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Link to="/courses" className="text-stone-600 hover:text-stone-900">Khoá học</Link>
            <span className="text-stone-400">/</span>
            <span className="text-stone-900 font-medium">{courseId || "Khoá học"}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to={`/quiz/${courseId || "fullstack"}`} className="btn border-stone-300 hover:border-stone-400">Làm bài kiểm tra</Link>
            <Link to="/dashboard" className="btn btn-primary">Thoát học</Link>
          </div>
        </div>
        <div className="h-1 bg-stone-200">
          <div className="h-full bg-primary-600 w-1/3" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </div>
    </div>
  );
}

