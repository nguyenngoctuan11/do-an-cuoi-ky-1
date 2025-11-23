import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchPostDetail } from "../services/posts";
import { extractErrorMessage } from "../utils/errors";

export default function BlogDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetchPostDetail(slug)
      .then(({ data }) => {
        setPost(data);
        setError("");
      })
      .catch((err) => setError(extractErrorMessage(err?.response?.data, "Không tìm thấy bài viết")))
      .finally(() => setLoading(false));
  }, [slug]);

  const publishedTime = useMemo(() => {
    if (!post?.publishedAt) return "";
    return new Date(post.publishedAt).toLocaleString("vi-VN");
  }, [post?.publishedAt]);

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center bg-white text-sm text-stone-500">
        Đang tải bài viết...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] grid place-items-center bg-white px-4 text-center text-sm text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link to="/blog" className="text-sm text-primary-600 underline">
          ← Quay lại Blog
        </Link>
        <h1 className="mt-4 text-3xl md:text-4xl font-bold text-stone-900">{post.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-stone-500">
          <span>{post.authorName || "Học viện"}</span>
          {publishedTime && <span>• {publishedTime}</span>}
          {post.courseTitle && <span>• Thuộc khóa học: {post.courseTitle}</span>}
        </div>
        {post.coverImageUrl && (
          <div className="mt-6 overflow-hidden rounded-3xl border border-stone-100">
            <img src={post.coverImageUrl} alt={post.title} className="w-full object-cover" />
          </div>
        )}
        <article className="prose prose-stone mt-8 max-w-none text-stone-800" dangerouslySetInnerHTML={{ __html: post.content }} />
        {post.attachments?.length > 0 && (
          <div className="mt-8 rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-sm font-semibold text-stone-700">Tệp đính kèm</p>
            <ul className="mt-2 list-disc pl-5 text-sm text-stone-600">
              {post.attachments.map((url) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noreferrer" className="text-primary-600 underline">
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
