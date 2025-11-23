import { useEffect, useMemo, useState } from "react";
import { fetchAdminUsers } from "../../services/adminUsers";

function roleLabel(role) {
  switch ((role || "").toLowerCase()) {
    case "manager":
      return "Quản lý";
    case "teacher":
      return "Giảng viên";
    case "student":
      return "Học viên";
    case "admin":
      return "Admin";
    default:
      return role;
  }
}

export default function UserDirectory() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    fetchAdminUsers({ limit: 200 })
      .then(({ data }) => {
        setUsers(Array.isArray(data) ? data : []);
        setError("");
      })
      .catch((err) => setError(err?.response?.data || "Không thể tải danh sách người dùng"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!query) return users;
    const term = query.toLowerCase();
    return users.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.username?.toLowerCase().includes(term),
    );
  }, [users, query]);

  return (
    <div className="bg-gradient-to-b from-white to-stone-50 min-h-[calc(100vh-64px-64px)]">
      <div className="mx-auto max-w-6xl px-4 py-12 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-stone-400">Quản lý</p>
            <h1 className="mt-1 text-3xl font-bold text-stone-900">Danh sách người dùng</h1>
            <p className="text-sm text-stone-500">Tra cứu nhanh người dùng trong hệ thống.</p>
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full max-w-xs rounded-2xl border border-stone-200 px-4 py-2 text-sm"
            placeholder="Tìm theo tên, email..."
          />
        </div>

        <div className="rounded-[32px] border border-white/80 bg-white/90 shadow-xl shadow-primary-900/5 backdrop-blur">
          {loading && <p className="p-6 text-sm text-stone-500">Đang tải dữ liệu...</p>}
          {error && !loading && <p className="p-6 text-sm text-red-600">{error}</p>}
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-100">
                <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-4 py-3">Người dùng</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Vai trò</th>
                    <th className="px-4 py-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50 text-sm">
                  {filtered.map((user) => (
                    <tr key={user.id} className="hover:bg-stone-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-stone-900">{user.fullName || "Chưa cập nhật"}</p>
                        <p className="text-xs text-stone-500">{user.username ? `@${user.username}` : "--"}</p>
                      </td>
                      <td className="px-4 py-3 text-stone-600">{user.email}</td>
                      <td className="px-4 py-3 text-stone-600">
                        <div className="flex flex-wrap gap-1">
                          {(user.roles || []).map((role) => (
                            <span key={role} className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                              {roleLabel(role)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">{user.status || "active"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="p-6 text-center text-sm text-stone-500">Không tìm thấy người dùng phù hợp.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
