import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { listMyPosts } from "../../services/posts";
import { extractErrorMessage } from "../../utils/errors";

const STATUS_TABS = [
  { id: "all", label: "Tất cả", values: ["draft", "pending", "published", "rejected"] },
  { id: "draft", label: "Nháp", values: ["draft"] },
  { id: "pending", label: "Chờ duyệt", values: ["pending"] },
  { id: "published", label: "Đã xuất bản", values: ["published"] },
  { id: "rejected", label: "Bị từ chối", values: ["rejected"] },
];

const badgeTone = (status) => {
  switch (status) {
    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-100";
    case "published":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "rejected":
      return "bg-red-50 text-red-600 border-red-100";
    default:
      return "bg-stone-100 text-stone-600 border-stone-200";
  }
};

export default function MyPosts() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState(STATUS_TABS[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const statusParam = statusFilter.values.join(",");
      const { data } = await listMyPosts({ status: statusParam });
      const records = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setItems(records);
    } catch (err) {
      setError(extractErrorMessage(err?.response?.data, err?.message || "Không thể tải danh sách bài viết"));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const summary = { draft: 0, pending: 0, published: 0, rejected: 0 };
    items.forEach((post) => {
      if (summary[post.status] !== undefined) {
        summary[post.status] += 1;
      }
    });
    return summary;
  }, [items]);

  return (
    <div className="bg-gradient-to-b from-white to-stone-50">
      <div className="mx-auto max-w-6xl px-4 py-12 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-stone-400">Studio bài viết</p>
            <h1 className="mt-1 text-3xl font-bold text-stone-900">Bài viết của tôi</h1>
            <p className="text-sm text-stone-500">Theo dõi nháp, trạng thái duyệt và chỉnh sửa nhanh.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/posts/new")}
            className="rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-stone-900/20"
          >
            + Viết bài mới
          </button>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg shadow-primary-900/10 backdrop-blur">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Nháp" value={stats.draft} tone="text-stone-900" />
            <StatCard label="Chờ duyệt" value={stats.pending} tone="text-amber-600" />
            <StatCard label="Xuất bản" value={stats.published} tone="text-emerald-600" />
            <StatCard label="Bị từ chối" value={stats.rejected} tone="text-red-500" />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  statusFilter.id === tab.id ? "bg-primary-600 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading && <p className="mt-6 text-sm text-stone-500">Đang tải bài viết...</p>}
          {error && !loading && <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

          {!loading && !error && items.length === 0 && (
            <div className="mt-6 rounded-3xl border border-dashed border-stone-200 bg-stone-50 px-6 py-12 text-center text-stone-500">
              Chưa có bài viết nào trong trạng thái này.
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="mt-6 space-y-3">
              {items.map((post) => {
                const detailHref = post.slug ? `/blog/${post.slug}` : `/posts/${post.id}/edit`;
                return (
                  <article
                    key={post.id}
                    className="rounded-3xl border border-stone-100 bg-white px-5 py-4 shadow-sm shadow-primary-900/5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold text-stone-900">{post.title}</h3>
                          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeTone(post.status)}`}>
                          {post.status}
                        </span>
                        {post.visibility === "internal" && (
                          <span className="rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-500">Nội bộ</span>
                        )}
                      </div>
                      <p className="text-sm text-stone-500 line-clamp-2">{post.excerpt}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-stone-400">
                        <span>
                          Cập nhật:{" "}
                          {post.updatedAt ? new Date(post.updatedAt).toLocaleString("vi-VN") : new Date(post.createdAt).toLocaleString("vi-VN")}
                        </span>
                        {post.courseTitle && <span>Khóa học: {post.courseTitle}</span>}
                        {post.rejectedReason && <span className="text-red-500">Lý do: {post.rejectedReason}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        to={detailHref}
                        className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:border-stone-300"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Xem
                      </Link>
                      <button
                        type="button"
                        className="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                        onClick={() => navigate(`/posts/${post.id}/edit`)}
                      >
                        Chỉnh sửa
                      </button>
                    </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 px-5 py-4 shadow-inner shadow-primary-900/5">
      <p className="text-xs uppercase tracking-[0.3em] text-stone-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}
