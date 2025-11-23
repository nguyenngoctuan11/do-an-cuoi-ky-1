import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import httpClient from "../../api/httpClient";
import { uploadImage } from "../../services/upload";
import { createPost, fetchPostDetail, updatePost } from "../../services/posts";
import { useAuth } from "../../context/AuthContext";
import { extractErrorMessage } from "../../utils/errors";

const CATEGORY_OPTIONS = [
  { value: "announcement", label: "Thông báo" },
  { value: "material", label: "Tài liệu bổ sung" },
  { value: "experience", label: "Chia sẻ kinh nghiệm" },
  { value: "event", label: "Sự kiện" },
];

const VISIBILITY_OPTIONS = [
  { value: "course", label: "Công khai trong khóa học" },
  { value: "enrolled", label: "Chỉ học viên đã đăng ký" },
  { value: "internal", label: "Nội bộ (giảng viên/admin)" },
];

const DEFAULT_FORM = {
  title: "",
  courseId: "",
  category: "announcement",
  visibility: "course",
  tags: [],
  content: "",
  coverImageUrl: "",
  excerpt: "",
  status: "draft",
};

const stripHtml = (html) =>
  typeof html === "string" ? html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";

function RichTextEditor({ value, onChange }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const exec = (command) => {
    document.execCommand(command, false, null);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white">
      <div className="flex flex-wrap gap-2 border-b border-stone-100 px-3 py-2 text-sm text-stone-600">
        <button type="button" onClick={() => exec("bold")} className="rounded-lg px-2 py-1 font-semibold hover:bg-stone-100">
          B
        </button>
        <button type="button" onClick={() => exec("italic")} className="rounded-lg px-2 py-1 italic hover:bg-stone-100">
          I
        </button>
        <button type="button" onClick={() => exec("underline")} className="rounded-lg px-2 py-1 hover:bg-stone-100">
          U
        </button>
        <button type="button" onClick={() => exec("insertUnorderedList")} className="rounded-lg px-2 py-1 hover:bg-stone-100">
          • List
        </button>
        <button type="button" onClick={() => exec("insertOrderedList")} className="rounded-lg px-2 py-1 hover:bg-stone-100">
          1. List
        </button>
        <button type="button" onClick={() => exec("removeFormat")} className="rounded-lg px-2 py-1 hover:bg-stone-100">
          Clear
        </button>
      </div>
      <div
        ref={editorRef}
        className="min-h-[320px] px-4 py-3 text-sm leading-relaxed outline-none"
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
      />
    </div>
  );
}

function PreviewDialog({ open, onClose, post }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-stone-200 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-stone-400">Xem trước</p>
            <h2 className="text-2xl font-bold text-stone-900">{post.title}</h2>
            <p className="text-sm text-stone-500">
              Thuộc khóa học: {post.courseName || "Không gắn khóa học"} · Hiển thị: {post.visibilityLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Đóng
          </button>
        </div>
        {post.coverImageUrl && (
          <div className="mt-6 overflow-hidden rounded-3xl border border-stone-100">
            <img src={post.coverImageUrl} alt={post.title} className="h-64 w-full object-cover" />
          </div>
        )}
        <article className="prose prose-stone mt-6 max-w-none text-stone-800" dangerouslySetInnerHTML={{ __html: post.content }} />
      </div>
    </div>
  );
}

export default function PostEditor() {
  const { postId } = useParams();
  const isEdit = Boolean(postId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [coverUploading, setCoverUploading] = useState(false);

  const canPublishDirectly = useMemo(
    () => (user?.roles || []).some((role) => ["manager", "admin"].includes(String(role).toLowerCase())),
    [user?.roles],
  );

  const showFeedback = (payload, type = "success") => {
    const message = extractErrorMessage(payload, type === "success" ? "Thao tác thành công" : "Có lỗi xảy ra");
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  useEffect(() => {
    httpClient
      .get("/api/teacher/courses/my")
      .then((res) => setCourses(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    fetchPostDetail(postId)
      .then(({ data }) => {
        setForm({
          title: data.title || "",
          courseId: data.courseId || "",
          category: data.category || "announcement",
          visibility: data.visibility || "course",
          tags: Array.isArray(data.tags) ? data.tags : [],
          content: data.content || "",
          coverImageUrl: data.coverImageUrl || "",
          excerpt: data.excerpt || "",
          status: data.status || "draft",
        });
      })
      .catch((err) => showFeedback(err?.response?.data || err.message, "error"))
      .finally(() => setLoading(false));
  }, [isEdit, postId]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddTag = () => {
    const normalized = tagInput.trim();
    if (!normalized) return;
    setForm((prev) => ({ ...prev, tags: Array.from(new Set([...(prev.tags || []), normalized])) }));
    setTagInput("");
  };

  const handleRemoveTag = (tag) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((item) => item !== tag) }));
  };

  const handleCoverUpload = async (evt) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      const { data } = await uploadImage(file);
      setField("coverImageUrl", data?.url || "");
      showFeedback("Đã tải ảnh bìa", "success");
    } catch (err) {
      showFeedback(err?.response?.data || "Tải ảnh thất bại", "error");
    } finally {
      setCoverUploading(false);
    }
  };

  const mapPayload = useCallback(
    (status) => ({
      title: form.title,
      courseId: form.courseId || null,
      category: form.category,
      visibility: form.visibility,
      tags: form.tags,
      content: form.content,
      coverImageUrl: form.coverImageUrl,
      excerpt: form.excerpt || stripHtml(form.content).slice(0, 200),
      status,
    }),
    [form],
  );

  const handleSave = async (status) => {
    setSaving(true);
    try {
      const payload = mapPayload(status);
      const { data } = isEdit ? await updatePost(postId, payload) : await createPost(payload);
        setForm({
          title: data.title || "",
          courseId: data.courseId || "",
          category: data.category || "announcement",
          visibility: data.visibility || "course",
          tags: Array.isArray(data.tags) ? data.tags : [],
          content: data.content || "",
          coverImageUrl: data.coverImageUrl || "",
          excerpt: data.excerpt || "",
          status: data.status || status,
        });
      const message =
        status === "draft"
          ? "Đã lưu nháp bài viết"
          : status === "pending"
          ? "Đã gửi bài viết chờ duyệt"
          : "Đã xuất bản bài viết";
      showFeedback(message, "success");
      if (!isEdit) {
        navigate(`/posts/${data.id}/edit`, { replace: true });
      }
    } catch (err) {
      showFeedback(err?.response?.data || err.message || "Lưu bài viết thất bại", "error");
    } finally {
      setSaving(false);
    }
  };

  const previewData = useMemo(
    () => ({
      title: form.title || "Chưa có tiêu đề",
      content: form.content || "<p>(Chưa có nội dung)</p>",
      courseName: courses.find((c) => String(c.id) === String(form.courseId))?.title,
      visibilityLabel: VISIBILITY_OPTIONS.find((opt) => opt.value === form.visibility)?.label || "Công khai",
      coverImageUrl: form.coverImageUrl,
    }),
    [form, courses],
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-sm text-stone-500">
        Đang tải dữ liệu bài viết...
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-white to-stone-50">
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-stone-400">{isEdit ? "Chỉnh sửa" : "Viết bài mới"}</p>
            <h1 className="text-3xl font-bold text-stone-900">Studio bài viết</h1>
            <p className="text-sm text-stone-500">Chia sẻ thông tin, tài liệu và câu chuyện đến học viên.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-stone-500">
            <span className="rounded-full border border-stone-200 px-3 py-1">
              Trạng thái hiện tại: <strong>{form.status}</strong>
            </span>
            {feedback && (
              <span
                className={`rounded-full px-3 py-1 ${
                  feedback.type === "error" ? "bg-red-100 text-red-700" : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {feedback.message}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-xl shadow-primary-900/5 backdrop-blur">
          <div className="space-y-6">
            <div>
              <label className="text-sm font-semibold text-stone-700">Tiêu đề *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                className="mt-2 w-full rounded-2xl border border-stone-200 px-4 py-3 text-lg font-semibold text-stone-900 focus:border-primary-200 focus:ring-2 focus:ring-primary-100"
                placeholder="Nhập tiêu đề ấn tượng..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-stone-700">Khóa học liên quan</label>
                <select
                  value={form.courseId}
                  onChange={(e) => setField("courseId", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-stone-200 px-4 py-2"
                >
                  <option value="">Không thuộc khóa nào</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-stone-700">Danh mục</label>
                <select
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-stone-200 px-4 py-2"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-stone-700">Chế độ hiển thị</label>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                {VISIBILITY_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`rounded-2xl border p-3 text-sm transition ${
                      form.visibility === opt.value
                        ? "border-primary-300 bg-primary-50 text-primary-700"
                        : "border-stone-200 bg-white text-stone-600 hover:border-primary-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value={opt.value}
                      className="mr-2"
                      checked={form.visibility === opt.value}
                      onChange={(e) => setField("visibility", e.target.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-stone-700">Ảnh bìa</label>
              <div className="mt-2 flex gap-4">
                <div className="h-36 w-56 overflow-hidden rounded-2xl border border-dashed border-stone-300 bg-stone-50">
                  {form.coverImageUrl ? (
                    <img src={form.coverImageUrl} alt={form.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-stone-400">Chưa có ảnh</div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-3">
                  <input
                    type="text"
                    value={form.coverImageUrl}
                    onChange={(e) => setField("coverImageUrl", e.target.value)}
                    className="w-full rounded-2xl border border-stone-200 px-4 py-2 text-sm"
                    placeholder="Hoặc dán URL ảnh..."
                  />
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-primary-700">
                    <input type="file" accept="image/*" onChange={handleCoverUpload} hidden disabled={coverUploading} />
                    <span className="rounded-full border border-primary-200 px-4 py-2">Tải ảnh từ máy</span>
                    {coverUploading && <span className="text-xs text-stone-500">Đang tải...</span>}
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-stone-700">Thẻ (tag)</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {form.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700"
                  >
                    {tag}
                    <button type="button" className="ml-2 text-stone-500" onClick={() => handleRemoveTag(tag)}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  className="flex-1 rounded-2xl border border-stone-200 px-4 py-2 text-sm"
                  placeholder="Nhập tag rồi nhấn Enter"
                />
                <button type="button" onClick={handleAddTag} className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white">
                  Thêm
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-stone-700">Nội dung *</label>
              <div className="mt-2">
                <RichTextEditor value={form.content} onChange={(html) => setField("content", html)} />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-stone-700">Tóm tắt (tùy chọn)</label>
              <textarea
                rows={3}
                value={form.excerpt}
                onChange={(e) => setField("excerpt", e.target.value)}
                className="mt-2 w-full rounded-2xl border border-stone-200 px-4 py-2 text-sm"
                placeholder="Đoạn mô tả ngắn hiển thị ở danh sách"
              />
            </div>

          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-6">
            <div className="flex flex-wrap gap-2 text-xs text-stone-500">
              <button type="button" className="underline" onClick={() => navigate(-1)}>
                Hủy
              </button>
              <button type="button" className="underline" onClick={() => setPreviewOpen(true)}>
                Xem trước
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleSave("draft")}
                disabled={saving}
                className="rounded-2xl border border-stone-300 px-5 py-2 text-sm font-semibold text-stone-700 hover:border-stone-400 disabled:opacity-50"
              >
                Lưu nháp
              </button>
              <button
                type="button"
                onClick={() => handleSave(canPublishDirectly ? "published" : "pending")}
                disabled={saving}
                className="rounded-2xl bg-gradient-to-r from-primary-600 to-sky-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {canPublishDirectly ? "Xuất bản ngay" : "Gửi duyệt"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <PreviewDialog open={previewOpen} onClose={() => setPreviewOpen(false)} post={previewData} />
    </div>
  );
}
