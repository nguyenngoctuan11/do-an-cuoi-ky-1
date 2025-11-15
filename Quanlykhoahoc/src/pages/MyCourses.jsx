import React, { useCallback, useEffect, useState } from "react";
import { useSupportChat } from "../context/SupportChatContext";

function ActionButton({ onClick, children }) {
  return (
    <button onClick={onClick} className="px-3 py-1.5 text-sm border border-stone-300 rounded hover:bg-stone-50">
      {children}
    </button>
  );
}

export default function MyCourses() {
  const API = process.env.REACT_APP_API_BASE || "http://localhost:8081";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const { setEntryContext } = useSupportChat();

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const load = useCallback(() => {
    setLoading(true); setErr(null);
    fetch(`${API}/api/teacher/courses/my`, { headers: { "Content-Type": "application/json", ...authHeaders() } })
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((e) => setErr(e?.message || String(e)))
      .finally(() => setLoading(false));
  }, [API]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    setEntryContext((prev) => ({ ...(prev || {}), origin: "my_courses" }));
    return () => setEntryContext((prev) => (prev?.origin === "my_courses" ? null : prev));
  }, [setEntryContext]);

  const submitReview = async (id) => {
    await fetch(`${API}/api/teacher/courses/${id}/submit`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() } });
    load();
  };
  const removeCourse = async (id) => {
    if (!window.confirm("Xóa khóa học này?")) return;
    await fetch(`${API}/api/teacher/courses/${id}`, { method: "DELETE", headers: { ...authHeaders() } });
    load();
  };



  const editHref = (id) => `${API}/app/admin/teacher-new-course.html?id=${id}`;
  const createHref = `${API}/app/admin/teacher-new-course.html`;

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-stone-900">Khóa học của tôi</h1>
          <a href={createHref} className="btn btn-primary">Tạo khóa học</a>
        </div>
        {loading && <div className="mt-6 text-stone-500">Đang tải...</div>}
        {err && <div className="mt-6 text-red-600 text-sm">{err}</div>}
        {!loading && (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border border-stone-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-stone-50 text-left text-sm text-stone-600">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Tiêu đề</th>
                  <th className="px-3 py-2">Slug</th>
                  <th className="px-3 py-2">Trạng thái</th>
                  <th className="px-3 py-2">Duyệt</th>
                  <th className="px-3 py-2">Tạo lúc</th>
                  <th className="px-3 py-2">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-center text-stone-500">Chưa có khóa học nào</td>
                  </tr>
                )}
                {items.map((c) => (
                  <tr key={c.id} className="border-t border-stone-200 text-sm">
                    <td className="px-3 py-2">{c.id}</td>
                    <td className="px-3 py-2">{c.title}</td>
                    <td className="px-3 py-2">{c.slug}</td>
                    <td className="px-3 py-2">{c.status}</td>
                    <td className="px-3 py-2">{c.approvalStatus}</td>
                    <td className="px-3 py-2">{String(c.createdAt).replace('T',' ')}</td>
                    <td className="px-3 py-2 flex items-center gap-2">
                      <a href={editHref(c.id)} className="px-3 py-1.5 text-sm border border-stone-300 rounded hover:bg-stone-50">Chỉnh sửa</a>
                      <ActionButton onClick={() => submitReview(c.id)}>Gửi duyệt</ActionButton>
                      <ActionButton onClick={() => removeCourse(c.id)}>Xóa</ActionButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

