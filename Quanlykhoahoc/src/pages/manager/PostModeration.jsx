import { useCallback, useEffect, useState } from "react";
import { approvePost, listPendingPosts, rejectPost } from "../../services/posts";
import { extractErrorMessage } from "../../utils/errors";

const StatusBadge = ({ label }) => (
  <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">{label}</span>
);

export default function PostModeration() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await listPendingPosts();
      const payload = data?.items ?? data?.content ?? data ?? [];
      setItems(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setError(extractErrorMessage(err?.response?.data, err?.message || "Không thể tải danh sách bài viết chờ duyệt."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (id) => {
    await approvePost(id);
    load();
  };

  const handleReject = async (id) => {
    const reason = window.prompt("Nhập lý do từ chối", "");
    if (reason === null) return;
    await rejectPost(id, { reason });
    load();
  };

  return (
    <div className="min-h-[calc(100vh-64px-64px)] bg-gradient-to-b from-white to-stone-50">
      <div className="mx-auto max-w-6xl px-4 py-12 space-y-8">
        <header>
          <p className="text-xs uppercase tracking-[0.4em] text-stone-400">Moderator</p>
          <h1 className="mt-1 text-3xl font-bold text-stone-900">Duyệt bài viết</h1>
          <p className="text-sm text-stone-500">Theo dõi và xuất bản các bài viết mà giảng viên gửi lên hệ thống.</p>
        </header>

        <section className="rounded-[32px] border border-stone-100 bg-white p-6 shadow-lg shadow-stone-200/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-stone-900">Danh sách chờ duyệt</h2>
              <p className="text-sm text-stone-500">
                {loading ? "Đang tải..." : `Có ${items.length} bài viết cần xử lý`}
              </p>
            </div>
            <button type="button" className="btn ghost" onClick={() => load(true)}>
              Làm mới
            </button>
          </div>
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          {!error && !loading && items.length === 0 && (
            <p className="mt-4 text-sm text-stone-500">Hiện chưa có bài viết nào chờ duyệt.</p>
          )}
          <div className="mt-6 space-y-4">
            {items.map((post) => (
              <article key={post.id} className="rounded-3xl border border-stone-100 bg-white px-5 py-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-stone-900">{post.title}</h3>
                      {post.courseTitle && <StatusBadge label={`Khóa học: ${post.courseTitle}`} />}
                      <StatusBadge label={post.category || "Blog"} />
                    </div>
                    <p className="text-xs text-stone-500">
                      Tác giả: {post.authorName || "Không rõ"} •{" "}
                      {post.createdAt ? new Date(post.createdAt).toLocaleString("vi-VN") : "--"}
                    </p>
                    <p className="text-sm text-stone-600 line-clamp-2">{post.excerpt}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-stone-400">
                      {post.tags?.map((tag) => (
                        <span key={tag} className="inline-flex items-center rounded-full border border-stone-200 px-3 py-0.5">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <a
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary-600 underline"
                    >
                      Xem preview
                    </a>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleReject(post.id)}
                        className="rounded-full border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Từ chối
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(post.id)}
                        className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                      >
                        Duyệt & xuất bản
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
