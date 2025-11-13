/* eslint-disable */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SectionHeading from "../components/SectionHeading";
import { normalizePriceValue, resolveIsFree } from "../utils/price";
import httpClient from "../api/httpClient";
import { useAuth } from "../context/AuthContext";

const API_BASE = process.env.REACT_APP_API_BASE || "";
const moneyFormatter = new Intl.NumberFormat("vi-VN");

function formatMoney(value) {
  const num = normalizePriceValue(value);
  if (num === null) return null;
  return `${moneyFormatter.format(Math.round(num))}đ`;
}

function secondsToLabel(seconds) {
  if (!seconds) return null;
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return null;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours === 0) return `${minutes} phút`;
  if (minutes === 0) return `${hours} giờ`;
  return `${hours} giờ ${minutes} phút`;
}

function normalize(str) {
  return (str || "").toString().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

function levelLabel(lv) {
  const s = normalize(lv);
  if (["co ban", "beginner", "basic", "foundation"].includes(s)) return "Cơ bản";
  if (["trung cap", "intermediate", "middle", "medium"].includes(s)) return "Trung cấp";
  if (["nang cao", "advanced", "expert"].includes(s)) return "Nâng cao";
  return lv || "Tổng hợp";
}

function resolveThumb(u) {
  if (!u) return null;
  let s = String(u).trim().replace(/\\/g, "/");
  if (/^https?:\/\//i.test(s) || s.startsWith("data:")) return s;
  if (!s.startsWith("/")) s = `/${s}`;
  return `${API_BASE}${s}`;
}

function parseTimeLike(value) {
  if (value == null) return null;
  if (typeof value === "number") {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
  const str = String(value).trim();
  if (!str) return null;
  if (/^\d+$/.test(str)) {
    const num = Number(str);
    return Number.isFinite(num) ? num : null;
  }
  if (str.includes(":")) {
    const parts = str.split(":").map((part) => Number(part));
    if (parts.every((n) => Number.isFinite(n))) {
      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
      if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
      }
      if (parts.length === 1) {
        return parts[0];
      }
    }
  }
  return null;
}

function extractLessonDurationSeconds(lesson) {
  if (!lesson) return 0;
  const secondCandidates = [
    lesson.durationSeconds,
    lesson.duration_seconds,
    lesson.durationInSeconds,
    lesson.video_duration,
    lesson.videoDuration,
    lesson.total_seconds,
    lesson.seconds,
    lesson.duration,
  ];
  for (const candidate of secondCandidates) {
    const parsed = parseTimeLike(candidate);
    if (parsed && parsed > 0) return parsed;
  }
  const minuteCandidates = [lesson.duration_minutes, lesson.durationMinutes, lesson.minutes];
  for (const candidate of minuteCandidates) {
    const parsed = parseTimeLike(candidate);
    if (parsed && parsed > 0) return parsed * 60;
  }
  return 0;
}

function formatLessonDurationLabel(seconds) {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return null;
  if (total < 60) return `${Math.round(total)}s`;
  const minutes = Math.floor(total / 60);
  const remainSeconds = total % 60;
  if (minutes < 60) {
    return remainSeconds ? `${minutes}p${String(Math.round(remainSeconds)).padStart(2, "0")}s` : `${minutes} phút`;
  }
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  return remainMinutes ? `${hours}h ${remainMinutes}p` : `${hours}h`;
}

function stripHtmlTags(value) {
  if (!value) return "";
  return String(value).replace(/<[^>]*>/g, "").trim();
}

function normalizeModuleList(modules) {
  if (!Array.isArray(modules)) return [];
  return modules.map((module, mIdx) => {
    const lessonsRaw = Array.isArray(module.lessons) ? module.lessons : module.items ?? [];
    const lessons = lessonsRaw.map((lesson, lIdx) => {
      const durationSeconds = extractLessonDurationSeconds(lesson);
      return {
        ...lesson,
        id: lesson.id ?? lesson.lesson_id ?? `lesson-${mIdx}-${lIdx}`,
        title: lesson.title ?? lesson.name ?? `Bài ${lIdx + 1}`,
        description: stripHtmlTags(lesson.description ?? lesson.summary ?? lesson.sub_title ?? lesson.subtitle ?? ""),
        content: stripHtmlTags(lesson.content ?? lesson.details ?? ""),
        durationSeconds,
        durationLabel: formatLessonDurationLabel(durationSeconds),
        video_url: lesson.video_url ?? lesson.videoUrl ?? lesson.video ?? lesson.video_link ?? lesson.videoLink ?? null,
      };
    });
    const durationSeconds = lessons.reduce((sum, lesson) => sum + (lesson.durationSeconds || 0), 0);
    return {
      ...module,
      id: module.id ?? module.module_id ?? module.chapter_id ?? `module-${mIdx}`,
      title: module.title ?? module.name ?? module.chapter_title ?? `Chương ${mIdx + 1}`,
      lessons,
      durationSeconds,
    };
  });
}

function summarizeModules(modules) {
  let totalLessons = 0;
  let totalSeconds = 0;
  let firstLessonWithVideo = null;
  for (const module of modules || []) {
    const lessons = Array.isArray(module.lessons) ? module.lessons : [];
    totalLessons += lessons.length;
    for (const lesson of lessons) {
      const seconds = extractLessonDurationSeconds(lesson);
      if (Number.isFinite(seconds)) totalSeconds += seconds;
      const videoUrl = lesson.video_url ?? lesson.videoUrl ?? lesson.video ?? lesson.video_link ?? lesson.videoLink;
      if (!firstLessonWithVideo && videoUrl) {
        firstLessonWithVideo = lesson;
      }
    }
  }
  return { totalLessons, totalSeconds, firstLessonWithVideo };
}

export default function CourseDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [syllabus, setSyllabus] = useState([]);
  const [syllabusLoading, setSyllabusLoading] = useState(false);
  const [syllabusError, setSyllabusError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      const paths = [
        `/api/public/courses/detail/${encodeURIComponent(slug)}`,
        `/api/public/courses/detail-sql/${encodeURIComponent(slug)}`,
        `/api/public/course/${encodeURIComponent(slug)}`,
      ];
      let found = null;
      for (const p of paths) {
        try {
          const r = await fetch(API_BASE + p, { headers: { Accept: "application/json" } });
          if (!r.ok) continue;
          const j = await r.json();
          if (j) {
            found = j;
            break;
          }
        } catch (e) {}
      }
      if (!found) {
        try {
          const r = await fetch(API_BASE + "/api/public/courses", { headers: { Accept: "application/json" } });
          if (r.ok) {
            const list = await r.json();
            if (Array.isArray(list)) {
              const it = list.find((x) => (x.slug || x.course_slug || x.code) === slug);
              if (it) found = it;
            }
          }
        } catch (e) {}
      }
      if (alive) {
        setData(found);
        setLoading(false);
        if (!found) setError("Không tìm thấy khóa học");
      }
    }
    if (slug) load();
    return () => {
      alive = false;
    };
  }, [slug]);

  const view = useMemo(() => {
    const c = data || {};
    const modules = Array.isArray(c.modules) && c.modules.length ? c.modules : (c.chapters ?? []);
    const stats = summarizeModules(modules);
    const totalDurationLabel = secondsToLabel(stats.totalSeconds);
    const priceRaw = c.price ?? c.tuition ?? c.amount ?? null;
    const numericPrice = normalizePriceValue(priceRaw);
    const isFree = resolveIsFree(priceRaw, c.is_free ?? c.isFree);
    return {
      id: c.id,
      slug: c.slug ?? slug,
      title: c.title ?? c.name ?? c.course_title ?? slug,
      desc: c.description ?? c.long_desc ?? c.short_desc ?? c.summary ?? "",
      level: c.level ?? c.level_name ?? c.difficulty ?? "",
      image: resolveThumb(
        c.thumbnail_url ??
          c.thumbnailUrl ??
          c.thumbnail_path ??
          c.thumbnailPath ??
          c.image_url ??
          c.imageUrl ??
          c.cover_url ??
          c.coverUrl ??
          null
      ),
      modules,
      stats: {
        totalLessons: stats.totalLessons,
        totalDurationLabel,
        moduleCount: modules.length,
      },
      previewLesson: stats.firstLessonWithVideo,
      price: numericPrice,
      isFree,
    };
  }, [data, slug]);

  const normalizedBaseModules = useMemo(() => normalizeModuleList(view.modules || []), [view.modules]);

  useEffect(() => {
    if (!view.id) {
      setSyllabus([]);
      return;
    }
    let cancelled = false;
    setSyllabus(normalizedBaseModules);
    setSyllabusLoading(true);
    setSyllabusError("");
    fetch(`${API_BASE}/api/public/courses/${view.id}/detail-sql`, { headers: { Accept: "application/json" } })
      .then((res) => {
        if (!res.ok) throw new Error("Không tải được nội dung khóa học");
        return res.json();
      })
      .then((payload) => {
        if (cancelled) return;
        const rawModules = payload?.modules?.length ? payload.modules : payload?.chapters || [];
        const normalized = normalizeModuleList(rawModules);
        setSyllabus(normalized.length ? normalized : normalizedBaseModules);
      })
      .catch((err) => {
        if (cancelled) return;
        setSyllabusError(err?.message || "Không tải được nội dung khóa học");
        setSyllabus(normalizedBaseModules);
      })
      .finally(() => {
        if (!cancelled) setSyllabusLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view.id, normalizedBaseModules]);

  const modulesForDisplay = useMemo(
    () => (syllabus.length ? syllabus : normalizedBaseModules),
    [syllabus, normalizedBaseModules],
  );

  const modulesStats = useMemo(() => summarizeModules(modulesForDisplay), [modulesForDisplay]);
  const totalLessons = modulesStats.totalLessons || view.stats.totalLessons;
  const totalDurationLabel = secondsToLabel(modulesStats.totalSeconds) || view.stats.totalDurationLabel;
  const moduleCount = modulesForDisplay.length || view.stats.moduleCount;
  const previewLesson = modulesStats.firstLessonWithVideo || view.previewLesson;

  const isFreeCourse = view.isFree;
  const priceLabel = isFreeCourse ? "Miễn phí" : formatMoney(view.price) || "Đang cập nhật";

  const handleStartCourse = () => {
    if (!view.id) return;
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `/courses/${slug}` } });
      return;
    }
    navigate(`/learn/${view.id}`, { state: { from: `/courses/${slug}` } });
  };

  const handleCheckout = () => {
    navigate(`/checkout?course=${encodeURIComponent(slug)}&id=${view.id ?? ""}`);
  };

  const handlePreview = () => {
    setShowPreview(true);
    setTimeout(() => {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  const handleFreeEnroll = async () => {
    if (!view.id) return;
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `/courses/${slug}` } });
      return;
    }
    setEnrollError("");
    setEnrolling(true);
    try {
      await httpClient.post(`/api/courses/${view.id}/enroll`);
      setEnrolled(true);
      handleStartCourse();
    } catch (err) {
      const msg = err?.response?.data?.message || "Ghi danh không thành công. Vui lòng thử lại.";
      setEnrollError(msg);
    } finally {
      setEnrolling(false);
    }
  };

  useEffect(() => {
    setEnrolling(false);
    setEnrolled(false);
    setEnrollError("");
  }, [slug]);

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-12 text-stone-600">Đang tải chi tiết khóa học…</div>;
  }
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-red-600">
        {error}
      </div>
    );
  }

  const statCards = [
    {
      label: "Bài học",
      value: totalLessons || "Đang cập nhật",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      ),
    },
    {
      label: "Thời lượng",
      value: totalDurationLabel || "Đang cập nhật",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
      ),
    },
    {
      label: "Chương học",
      value: moduleCount || "Đang cập nhật",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 4h14v16H5z" />
          <path d="M5 9h14" />
        </svg>
      ),
    },
  ];

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-10 lg:grid-cols-[1.75fr,1fr]">
          <div className="space-y-10">
            <SectionHeading
              eyebrow="Khóa học"
              title={view.title}
              subtitle={
                view.desc ||
                "Xây dựng nền tảng vững chắc, làm chủ dự án thực tế cùng mentor đồng hành xuyên suốt khóa học."
              }
            />

            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-2 shadow-inner">
              {view.image ? (
                <img src={view.image} alt={view.title} className="h-full w-full rounded-[24px] object-cover" />
              ) : (
                <div className="aspect-video w-full rounded-[24px] bg-gradient-to-br from-primary-200 to-primary-50" />
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {statCards.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary-50 p-2">{stat.icon}</div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{stat.label}</p>
                      <p className="text-lg font-semibold text-stone-900">{stat.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {showPreview && (
              <div ref={previewRef} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold text-primary-600">Học thử</p>
                <h3 className="mt-2 text-2xl font-bold text-stone-900">
                  {previewLesson?.title || "Video giới thiệu khóa học"}
                </h3>
                <p className="mt-2 text-sm text-stone-600">
                  {view.desc || "Tận mắt xem cách giảng viên đồng hành, bài giảng được trình bày ra sao trước khi quyết định."}
                </p>
                <div className="mt-4 aspect-video overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
                  {previewLesson?.video_url ? (
                    <video
                      controls
                      poster={view.image || undefined}
                      src={previewLesson.video_url}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-stone-500">Chưa có video học thử.</div>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-stone-900">Nội dung khóa học</h3>
                <span className="text-sm text-stone-500">
                  {moduleCount} chương · {totalLessons} bài học · {totalDurationLabel || "Đang cập nhật"}
                </span>
              </div>
              {syllabusLoading && (
                <div className="mt-4 rounded-2xl border border-dashed border-primary-200 bg-primary-50/40 px-4 py-3 text-sm text-primary-700">
                  Đang tải nội dung và cấu trúc bài giảng...
                </div>
              )}
              {syllabusError && (
                <p className="mt-3 text-sm text-red-600">{syllabusError}</p>
              )}
              <div className="mt-6 space-y-4">
                {modulesForDisplay.map((module, idx) => {
                  const lessons = Array.isArray(module.lessons) ? module.lessons : [];
                  const moduleDurationLabel =
                    secondsToLabel(module.durationSeconds) ||
                    secondsToLabel(lessons.reduce((sum, lesson) => sum + extractLessonDurationSeconds(lesson), 0)) ||
                    null;
                  return (
                    <div key={module.id ?? idx} className="rounded-2xl border border-stone-100 bg-white/90 p-4 shadow-sm">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-600">
                            Chương {idx + 1}
                          </p>
                          <h4 className="text-lg font-semibold text-stone-900">{module.title || `Chương ${idx + 1}`}</h4>
                          {module.description && (
                            <p className="mt-1 text-sm text-stone-500">{stripHtmlTags(module.description)}</p>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-stone-500">
                          {lessons.length} bài · {moduleDurationLabel || "Đang cập nhật"}
                        </span>
                      </div>
                      {lessons.length > 0 ? (
                        <ul className="mt-4 space-y-3">
                          {lessons.map((lesson, lessonIdx) => (
                            <li
                              key={lesson.id ?? `${module.id}-${lessonIdx}`}
                              className="flex flex-col gap-2 rounded-2xl border border-stone-100 bg-stone-50/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="flex items-start gap-3">
                                <span className="mt-0.5 rounded-full bg-primary-100 px-2 py-1 text-xs font-semibold text-primary-700">
                                  {String(lessonIdx + 1).padStart(2, "0")}
                                </span>
                                <div>
                                  <p className="font-semibold leading-snug text-stone-900">
                                    {lesson.title || `Bài ${lessonIdx + 1}`}
                                  </p>
                                  {lesson.description ? (
                                    <p className="text-xs text-stone-500">{lesson.description}</p>
                                  ) : lesson.content ? (
                                    <p className="text-xs text-stone-500">{lesson.content}</p>
                                  ) : null}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-xs font-semibold text-stone-500">
                                {lesson.durationLabel && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 shadow-sm">
                                    <svg
                                      viewBox="0 0 24 24"
                                      className="h-3.5 w-3.5 text-primary-600"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <circle cx="12" cy="12" r="9" />
                                      <path d="M12 7v5l3 3" />
                                    </svg>
                                    {lesson.durationLabel}
                                  </span>
                                )}
                                {lesson.video_url && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-primary-600">
                                    <svg
                                      viewBox="0 0 24 24"
                                      className="h-3.5 w-3.5"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                    Video
                                  </span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-sm text-stone-500">Chương này đang cập nhật bài học.</p>
                      )}
                    </div>
                  );
                })}
                {modulesForDisplay.length === 0 && !syllabusLoading && (
                  <p className="text-sm text-stone-500">Nội dung khóa học đang được cập nhật.</p>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-primary-100 bg-primary-50/50 p-6 shadow-lg shadow-primary-100/50">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-600">Chi phí</p>
              <div className="mt-2 text-4xl font-black text-primary-700">{priceLabel}</div>
              <p className="mt-2 text-sm text-stone-600">
                Quyền truy cập trọn đời, cập nhật miễn phí và mentor hỗ trợ trong suốt khóa học.
              </p>

              {isFreeCourse ? (
                <>
                  <button className="btn btn-primary mt-6 w-full" onClick={handleFreeEnroll} disabled={enrolling}>
                    {enrolling ? "Đang ghi danh..." : enrolled ? "Vào học ngay" : "Đăng ký học ngay"}
                  </button>
                  {enrollError && <p className="mt-2 text-sm text-red-600">{enrollError}</p>}
                </>
              ) : (
                <>
                  <button className="btn btn-primary mt-6 w-full" onClick={handleCheckout}>
                    Mua khóa học
                  </button>
                  <button
                    className="btn mt-3 w-full border-primary-200 text-primary-700 hover:border-primary-400"
                    onClick={handlePreview}
                  >
                    Học thử
                  </button>
                </>
              )}

              <ul className="mt-6 space-y-3 text-sm text-stone-700">
                <li className="flex items-center gap-2">
                  <span className="text-primary-600">•</span>
                  Trình độ: {levelLabel(view.level)}
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary-600">•</span>
                  Tổng {totalLessons || "—"} bài học · {totalDurationLabel || "Đang cập nhật"}
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary-600">•</span>
                  Học trên mọi thiết bị, không giới hạn
                </li>
              </ul>
            </div>

            <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-stone-900">Lời giới thiệu</h4>
              <p className="mt-2 text-sm text-stone-600">
                {view.desc ||
                  "Khoá học cung cấp kiến thức trọng tâm đi kèm dự án thực tế để bạn có thể tự tin ứng tuyển vị trí mơ ước."}
              </p>
              {!isFreeCourse && (
                <p className="mt-4 text-sm text-primary-700">
                  Bạn chưa chắc chắn? Hãy chọn “Học thử” để xem ngay bài giảng đầu tiên hoàn toàn miễn phí.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
