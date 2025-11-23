import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listPublicPosts } from "../services/posts";
import { extractErrorMessage } from "../utils/errors";
import { getSavedPosts, toggleSavedPost } from "../utils/savedPosts";

function BookmarkButton({ active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm transition ${
        active ? "border-primary-200 bg-primary-50 text-primary-700" : "border-stone-200 text-stone-500 hover:border-primary-200"
      }`}
      aria-label={active ? "Bỏ lưu" : "Lưu bài viết"}
    >
      {active ? "Đã lưu" : "Lưu"}
    </button>
  );
}

function BlogCard({ post, saved, onToggleSave }) {
  return (
    <article className="rounded-[32px] border border-stone-100 bg-white px-6 py-5 shadow-lg shadow-stone-200/50">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary-100 text-primary-700 grid place-items-center font-bold">
            {(post.authorName || "B").trim().charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-900">{post.authorName || "Tác giả ẩn danh"}</p>
            {post.publishedAt && (
              <p className="text-xs text-stone-500">{new Date(post.publishedAt).toLocaleDateString("vi-VN")}</p>
            )}
          </div>
        </div>
        <BookmarkButton active={saved} onClick={() => onToggleSave(post)} />
      </div>
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex-1 space-y-3">
          <Link to={`/blog/${post.slug}`} className="text-xl font-bold text-stone-900 hover:text-primary-700">
            {post.title}
          </Link>
          <p className="text-sm text-stone-600 line-clamp-3">{post.excerpt}</p>
          <div className="flex flex-wrap gap-2 text-xs text-stone-500">
            {post.category && (
              <span className="inline-flex items-center rounded-full bg-stone-100 px-4 py-1">{post.category}</span>
            )}
            {post.tags?.slice(0, 3).map((tag) => (
              <span key={tag} className="inline-flex items-center rounded-full bg-primary-50 px-4 py-1 text-primary-700">
                #{tag}
              </span>
            ))}
          </div>
        </div>
        <Link to={`/blog/${post.slug}`} className="block h-28 w-full max-w-[180px] overflow-hidden rounded-2xl border border-stone-100">
          <img
            src={post.coverImageUrl || "/app/assets/blog-placeholder.png"}
            alt={post.title}
            className="h-full w-full object-cover"
          />
        </Link>
      </div>
    </article>
  );
}

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(() => getSavedPosts());

  const handleToggleSave = (post) => {
    toggleSavedPost(post);
    setSaved(getSavedPosts());
  };

  useEffect(() => {
    setLoading(true);
    listPublicPosts({ size: 20 })
      .then(({ data }) => {
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setPosts(items);
      })
      .catch((err) => setError(extractErrorMessage(err?.response?.data, err?.message || "Không thể tải bài viết")))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-gradient-to-b from-white to-stone-50">
      <div className="mx-auto max-w-6xl px-4 py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-black text-stone-900">Bài viết nổi bật</h1>
          <p className="mt-2 text-sm text-stone-500">
            Tổng hợp các bài viết chia sẻ về kinh nghiệm tự học lập trình online và kỹ thuật triển khai sản phẩm thực tế.
          </p>
        </div>

        {loading && <p className="text-center text-sm text-stone-500">Đang tải bài viết...</p>}
        {error && <p className="text-center text-sm text-red-600">{error}</p>}
        {!loading && !error && posts.length === 0 && (
          <p className="text-center text-sm text-stone-500">Hiện chưa có bài viết nào được xuất bản.</p>
        )}

        <div className="space-y-4">
          {posts.map((post) => (
            <BlogCard
              key={post.id}
              post={post}
              saved={saved.some((item) => String(item.id ?? item.slug) === String(post.id ?? post.slug))}
              onToggleSave={handleToggleSave}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
