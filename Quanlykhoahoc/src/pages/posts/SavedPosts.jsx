import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { clearSavedPost, getSavedPosts } from "../../utils/savedPosts";

export default function SavedPosts() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(getSavedPosts());
  }, []);

  const handleRemove = (id) => {
    setItems(clearSavedPost(id));
  };

  if (!items.length) {
    return (
      <div className="min-h-[calc(100vh-64px-64px)] bg-gradient-to-b from-white to-stone-50">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center space-y-4">
          <h1 className="text-3xl font-bold text-stone-900">Bài viết đã lưu</h1>
          <p className="text-sm text-stone-500">Bạn chưa lưu bài viết nào. Hãy nhấn biểu tượng đánh dấu để lưu lại.</p>
          <Link to="/blog" className="btn btn-primary inline-flex items-center gap-2">
            Khám phá blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-white to-stone-50 min-h-[calc(100vh-64px-64px)]">
      <div className="mx-auto max-w-5xl px-4 py-12 space-y-6">
        <div className="text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.4em] text-stone-400">Tủ sách của bạn</p>
          <h1 className="text-3xl font-bold text-stone-900">Bài viết đã lưu</h1>
          <p className="text-sm text-stone-500">Tổng hợp những bài viết bạn yêu thích để đọc lại bất cứ lúc nào.</p>
        </div>
        <div className="space-y-4">
          {items.map((post) => (
            <article key={post.id} className="rounded-3xl border border-stone-100 bg-white px-6 py-4 shadow-sm">
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex-1 min-w-0">
                  <Link to={`/blog/${post.slug}`} className="text-lg font-semibold text-stone-900 hover:text-primary-700">
                    {post.title}
                  </Link>
                  <p className="mt-1 text-sm text-stone-500 line-clamp-2">{post.excerpt}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-400">
                    {post.category && (
                      <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-stone-600">
                        {post.category}
                      </span>
                    )}
                    {post.tags?.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-primary-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <img
                  src={post.coverImageUrl || "/app/assets/blog-placeholder.png"}
                  alt={post.title}
                  className="h-24 w-32 rounded-2xl object-cover"
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-stone-500">
                <span>{post.authorName || "Tác giả ẩn danh"}</span>
                <button type="button" onClick={() => handleRemove(post.id)} className="text-red-500 underline">
                  Bỏ lưu
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
