import React, { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

export default function NavBar() {
  const navigate = useNavigate();
  const [auth, setAuth] = useState({ email: null, roles: [] });
  useEffect(() => {
    const email = localStorage.getItem("email");
    const roles = (localStorage.getItem("roles") || "").split(",").filter(Boolean);
    setAuth({ email, roles });
  }, []);
  const linkCls = ({ isActive }) =>
    `text-sm ${isActive ? "text-stone-900" : "text-stone-700 hover:text-stone-900"}`;
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    localStorage.removeItem("roles");
    setAuth({ email: null, roles: [] });
    navigate("/login", { replace: true });
  };
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-md bg-primary-600 text-white grid place-items-center font-bold">FS</div>
          <span className="font-semibold text-stone-900">Your LMS</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <NavLink to="/courses" className={linkCls}>Khóa học</NavLink>
          <NavLink to="/mentors" className={linkCls}>Mentor</NavLink>
          <NavLink to="/pricing" className={linkCls}>Bảng giá</NavLink>
          <NavLink to="/survey" className={linkCls}>Khảo sát lộ trình</NavLink>
          {auth.email && (
            <NavLink to="/student" className={linkCls}>Sinh viên</NavLink>
          )}
          <NavLink to="/blog" className={linkCls}>Blog</NavLink>
          <NavLink to="/faq" className={linkCls}>Hỏi đáp</NavLink>
          <NavLink to="/about" className={linkCls}>Về chúng tôi</NavLink>
          {(auth.roles.includes("teacher") || auth.roles.includes("manager")) && (
            <NavLink to="/my-courses" className={linkCls}>Khóa học của tôi</NavLink>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {!auth.email ? (
            <>
              <Link to="/login" className="btn">Đăng nhập</Link>
              <Link to="/register" className="btn btn-primary">Bắt đầu miễn phí</Link>
            </>
          ) : (
            <>
              <span className="text-sm text-stone-700 hidden sm:inline">{auth.email}</span>
              <button onClick={logout} className="btn">Đăng xuất</button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
