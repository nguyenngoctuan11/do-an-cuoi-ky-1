import React, { useMemo, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { path: "/courses", label: "Khóa học" },
  { path: "/mentors", label: "Mentor" },
  { path: "/pricing", label: "Bảng giá" },
  { path: "/survey", label: "Khảo sát lộ trình" },
  { path: "/blog", label: "Blog" },
  { path: "/faq", label: "Hỏi đáp" },
  { path: "/about", label: "Về chúng tôi" },
  { path: "/contact", label: "Liên hệ" },
];

const bellIcon = (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor">
    <path
      strokeWidth="1.6"
      d="M6 9a6 6 0 0 1 12 0c0 4 1 6 2 7H4c1-1 2-3 2-7Z"
    />
    <path strokeWidth="1.6" d="M9 18c0 1.66 1.34 3 3 3s3-1.34 3-3" />
  </svg>
);

export default function NavBar() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const linkCls = ({ isActive }) =>
    `text-sm ${isActive ? "text-stone-900" : "text-stone-700 hover:text-stone-900"}`;

  const userInitial = (user?.fullName || user?.email || "U").trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-md bg-primary-600 text-white grid place-items-center font-bold">FS</div>
          <span className="font-semibold text-stone-900">Your LMS</span>
        </Link>
        <nav className="hidden lg:flex items-center gap-6 flex-1 ml-6">
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} className={linkCls}>
              {item.label}
            </NavLink>
          ))}
          {(user?.roles?.includes("teacher") || user?.roles?.includes("manager")) && (
            <NavLink to="/my-courses" className={linkCls}>
              Khóa học của tôi
            </NavLink>
          )}
        </nav>
        {!isAuthenticated ? (
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn">
              Đăng nhập
            </Link>
            <Link to="/register" className="btn btn-primary">
              Bắt đầu miễn phí
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-sm font-medium text-stone-700">Khóa học của tôi</span>
            <button
              type="button"
              className="w-10 h-10 rounded-full bg-stone-100 text-stone-500 grid place-items-center hover:bg-stone-200 transition"
              aria-label="Thông báo"
            >
              {bellIcon}
            </button>
            <UserDropdown user={user} onLogout={() => { logout(); navigate("/login"); }}>
              <span className="font-semibold text-stone-900">{userInitial}</span>
            </UserDropdown>
          </div>
        )}
      </div>
    </header>
  );
}

function UserDropdown({ user, onLogout, children }) {
  const [open, setOpen] = useState(false);
  const hoverTimeout = useRef(null);
  const usernameDisplay = user?.username ? `@${user.username}` : user?.email || "";

  const quickLinks = useMemo(
    () => [
      { label: "Trang cá nhân", to: "/student" },
      { label: "Viết blog", to: "/blog" },
      { label: "Bài viết của tôi", to: "/blog" },
      { label: "Bài viết đã lưu", to: "/blog" },
      { label: "Cài đặt", to: "/account/settings" },
    ],
    [],
  );

  const handleOpen = () => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    setOpen(true);
  };

  const handleClose = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => setOpen(false), 120);
  };

  const handleToggle = () => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    setOpen((prev) => !prev);
  };

  const handleLogout = () => {
    setOpen(false);
    onLogout();
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
    >
      <button
        type="button"
        onClick={handleToggle}
        className="w-10 h-10 rounded-full bg-teal-600 text-white grid place-items-center font-semibold shadow focus:outline-none focus:ring-2 focus:ring-teal-300"
      >
        {children}
      </button>
      {open && (
        <div className="absolute right-0 mt-3 w-64 rounded-3xl bg-white shadow-2xl border border-stone-100">
          <div className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-700 grid place-items-center font-semibold text-lg">
              {(user?.fullName || user?.email || "U").trim().charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-stone-900">{user?.fullName || "Chưa cập nhật"}</p>
              <p className="text-sm text-stone-500">{usernameDisplay}</p>
            </div>
          </div>
          <div className="border-t border-stone-100">
            {quickLinks.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setOpen(false)}
                className="block px-5 py-2.5 text-sm text-stone-700 hover:bg-stone-50"
              >
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left px-5 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-b-3xl"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
