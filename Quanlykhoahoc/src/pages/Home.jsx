import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SectionHeading from "../components/SectionHeading";
import CourseShowcaseCard from "../components/CourseShowcaseCard";
import { resolveIsFree } from "../utils/price";
import CoursesByLevel from "./courses/CoursesByLevel";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8081";

function resolveThumb(u) {
  if (!u) return null;
  let s = String(u).trim().replace(/\\/g, "/");
  if (/^https?:\/\//i.test(s) || s.startsWith("data:")) return s;
  if (!s.startsWith("/")) s = `/${s}`;
  return `${API_BASE}${s}`;
}

function formatDurationFromMinutes(minutes) {
  if (minutes == null) return null;
  const totalMinutes = Number(minutes);
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return null;
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  if (hours === 0) return `${mins} phút`;
  if (mins === 0) return `${hours} giờ`;
  return `${hours}h${String(mins).padStart(2, "0")}p`;
}

function levelPriority(levelLabel) {
  const label = (levelLabel || "").toLowerCase();
  if (!label) return 9;
  if (label.includes("cơ bản") || label.includes("beginner")) return 0;
  if (label.includes("trung") || label.includes("intermediate")) return 1;
  if (label.includes("nâng cao") || label.includes("advanced")) return 2;
  if (label.includes("chuyên sâu") || label.includes("expert")) return 3;
  return 5;
}

function coerceNumericId(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeEnrollmentCourse(course) {
  if (!course) return null;
  const courseId = coerceNumericId(course?.courseId ?? course?.id);
  if (!courseId) return null;
  const thumbnailCandidate =
    course.thumbnailUrl ??
    course.thumbnail ??
    course.coverImage ??
    course.thumbnail_path ??
    course.thumbnailPath ??
    null;
  return {
    courseId,
    title: course.title ?? "Khoá học",
    level: course.level ?? course.levelName ?? "",
    thumbnail: resolveThumb(thumbnailCandidate),
  };
}

function CourseCluster({ eyebrow, title, subtitle, courses, loading, emptyMessage }) {
  const preview = courses.slice(0, 3);
  return (
    <div className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_25px_60px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {eyebrow && <p className="text-xs uppercase tracking-[0.3em] text-stone-400">{eyebrow}</p>}
          <h3 className="text-2xl font-semibold text-stone-900">{title}</h3>
          {subtitle && <p className="text-sm text-stone-500">{subtitle}</p>}
        </div>
        <Link
          to="/courses"
          className="inline-flex items-center gap-2 rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 transition hover:border-stone-400"
        >
          Xem tất cả
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </Link>
      </div>
      {loading ? (
        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-80 rounded-3xl bg-stone-100 animate-pulse" />
          ))}
        </div>
      ) : preview.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 px-6 py-8 text-center text-sm text-stone-500">
          {emptyMessage}
        </p>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {preview.map((course) => (
            <CourseShowcaseCard
              key={course.id}
              id={course.id}
              slug={course.slug}
              title={course.title}
              level={course.level}
              lessonsCount={course.lessonsCount}
              thumbnail={course.thumbnail}
              price={course.price}
              isFree={course.isFree}
              durationLabel={course.durationLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LandingCourseShelf() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortMode, setSortMode] = useState("asc");

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/api/public/courses-sql?status=published&limit=12`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Không thể tải danh sách khóa học");
        const data = await res.json();
        if (!alive) return;
        if (Array.isArray(data)) {
          const normalized = data.map((c) => {
            const priceValue = c.price ?? c.tuition_fee ?? c.tuitionFee ?? c.priceValue ?? null;
            return {
              id: c.id,
              slug: c.slug,
              title: c.title,
              level: c.level,
              lessonsCount: c.lessons_count ?? c.lessonsCount ?? 0,
              thumbnail: resolveThumb(c.thumbnail_url ?? c.thumbnailUrl ?? c.thumbnail_path ?? c.thumbnailPath ?? null),
              price: priceValue,
              isFree: resolveIsFree(priceValue, c.is_free ?? c.isFree),
              durationLabel: formatDurationFromMinutes(
                c.total_minutes ?? c.totalMinutes ?? c.duration_minutes ?? c.durationMinutes ?? null,
              ),
            };
          });
          setCourses(normalized);
        } else {
          setCourses([]);
        }
      } catch (err) {
        if (!alive) return;
        setError(err?.message || "Không thể tải dữ liệu");
        setCourses([]);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  const orderedCourses = useMemo(() => {
    const cloned = [...courses];
    cloned.sort((a, b) => {
      const diff = levelPriority(a.level) - levelPriority(b.level);
      if (diff !== 0) return sortMode === "asc" ? diff : -diff;
      return (a.title || "").localeCompare(b.title || "");
    });
    return cloned;
  }, [courses, sortMode]);

  const highlightCourses = useMemo(() => orderedCourses.slice(0, 3), [orderedCourses]);
  const proCourses = useMemo(() => orderedCourses.filter((course) => !course.isFree), [orderedCourses]);
  const freeCourses = useMemo(() => orderedCourses.filter((course) => course.isFree), [orderedCourses]);

  return (
    <section className="bg-[#fdf8f1]" id="landing-courses">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_35px_70px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-stone-700">
              <span>Sắp xếp theo cấp độ</span>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value)}
                className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="asc">Từ cơ bản đến nâng cao</option>
                <option value="desc">Từ nâng cao đến cơ bản</option>
              </select>
            </div>
            <span className="text-sm text-stone-500">{loading ? "Đang tải..." : `${orderedCourses.length} khóa học`}</span>
          </div>
          {error && <p className="mt-3 rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {loading &&
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="h-80 rounded-3xl bg-stone-100 animate-pulse" />
              ))}
            {!loading && highlightCourses.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 px-6 py-10 text-center text-sm text-stone-500">
                Chưa có khóa học để hiển thị.
              </div>
            )}
            {!loading &&
              highlightCourses.length > 0 &&
              highlightCourses.map((course) => (
                <CourseShowcaseCard
                  key={course.id}
                  id={course.id}
                  slug={course.slug}
                  title={course.title}
                  level={course.level}
                  lessonsCount={course.lessonsCount}
                  thumbnail={course.thumbnail}
                  price={course.price}
                  isFree={course.isFree}
                  durationLabel={course.durationLabel}
                />
              ))}
          </div>
        </div>
        <div className="mt-12 space-y-12">
          <CourseCluster
            eyebrow="Khóa học Pro"
            title="Bứt tốc với các khoá Pro"
            subtitle="Nội dung chuyên sâu, mentor đồng hành và tài liệu độc quyền."
            courses={proCourses}
            loading={loading}
            emptyMessage="Hiện chưa có khoá Pro nào được mở bán."
          />
          <CourseCluster
            eyebrow="Khóa học miễn phí"
            title="Khởi động nhanh với khoá miễn phí"
            subtitle="Làm quen với nền tảng, học thử miễn phí trước khi nâng cấp."
            courses={freeCourses}
            loading={loading}
            emptyMessage="Chưa có khoá miễn phí nào trong danh sách."
          />
        </div>
      </div>
    </section>
  );
}

function Hero({ progressSlides, loadingProgress, avgPercent }) {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const slides = progressSlides || [];
  const slidesCount = slides.length;
  const safeAvg = Math.min(Math.max(avgPercent || 0, 0), 100);
  const activeSlide = slidesCount > 0 ? slides[Math.min(activeIndex, slidesCount - 1)] : null;

  useEffect(() => {
    setActiveIndex(0);
  }, [slidesCount]);

  useEffect(() => {
    if (slidesCount <= 1) return undefined;
    const id = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slidesCount);
    }, 7000);
    return () => clearInterval(id);
  }, [slidesCount]);

  const gotoPrev = () => {
    if (slidesCount === 0) return;
    setActiveIndex((prev) => (prev - 1 + slidesCount) % slidesCount);
  };

  const gotoNext = () => {
    if (slidesCount === 0) return;
    setActiveIndex((prev) => (prev + 1) % slidesCount);
  };

  const handleStartLearning = () => {
    if (activeSlide?.courseId) {
      navigate(`/learn/${activeSlide.courseId}`);
    } else {
      navigate("/learn/fullstack");
    }
  };

  const fallbackMessage = loadingProgress
    ? "Đang tải tiến độ học tập..."
    : "Đăng nhập để xem tiến độ các khoá học bạn đang theo học.";

  return (
    <section className="bg-soft">
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-3 py-1 text-xs text-primary-700">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-600" />
            Học lập trình hiệu quả, có lộ trình
          </div>
          <h1 className="mt-4 text-4xl md:text-5xl font-extrabold leading-tight text-stone-900">
            Nâng cấp sự nghiệp với khoá học thực chiến
          </h1>
          <p className="mt-4 text-stone-600 text-lg">
            Lộ trình rõ ràng, mentor tận tâm, dự án thực tế. Theo dõi tiến độ từng khoá học và tiếp tục ngay nơi bạn dừng lại.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleStartLearning}
              className="btn btn-primary px-6 py-3 disabled:opacity-50"
              disabled={loadingProgress && slidesCount === 0}
            >
              Bắt đầu học ngay
            </button>
            <a href="#courses" className="btn px-6 py-3 border-stone-300 hover:border-stone-400">Xem khoá học</a>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-stone-600">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-primary-200 border border-white" />
              <div className="w-8 h-8 rounded-full bg-primary-300 border border-white" />
              <div className="w-8 h-8 rounded-full bg-primary-400 border border-white" />
            </div>
            <span>50k+ học viên đã tin tưởng</span>
            {slidesCount > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-600">
                <span className="h-2 w-2 rounded-full bg-primary-500" />
                {slidesCount} khoá đang học
              </span>
            )}
          </div>
        </div>
        <div className="relative">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-gradient-to-br from-[#b57b45] to-[#6d3f2b] shadow-2xl">
            {activeSlide ? (
              <>
                {activeSlide.thumbnail && (
                  <img
                    src={activeSlide.thumbnail}
                    alt={activeSlide.title}
                    className="absolute inset-0 h-full w-full object-cover opacity-60"
                    loading="lazy"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/30 to-transparent" />
                <div className="relative z-10 flex h-full flex-col justify-between p-6 text-white">
                  <div>
                    <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/90">
                      {activeSlide.level || "Khoá học"}
                    </span>
                    <h3 className="mt-3 text-2xl font-bold leading-snug">{activeSlide.title}</h3>
                    <p className="mt-2 text-sm text-white/80">{activeSlide.lessonsLabel}</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm font-semibold text-white/80">
                      <span>Tiến độ khóa học</span>
                      <span>{activeSlide.percent}%</span>
                    </div>
                    <div className="mt-2 h-3 rounded-full bg-white/20">
                      <div className="h-full rounded-full bg-amber-300" style={{ width: `${activeSlide.percent}%` }} />
                    </div>
                  </div>
                </div>
                <div className="absolute right-6 top-6 hidden flex-col gap-3 rounded-3xl bg-white/15 px-4 py-3 text-white shadow-[0_15px_30px_rgba(0,0,0,0.25)] backdrop-blur lg:flex">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
                    <span className="inline-flex h-2 w-2 rounded-full bg-amber-300" />
                    Tiến độ hôm nay
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-28 rounded-full bg-white/20">
                      <div className="h-full rounded-full bg-gradient-to-r from-amber-200 to-yellow-300" style={{ width: `${safeAvg}%` }} />
                    </div>
                    <span className="text-lg font-bold text-white">{safeAvg}%</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-white/80">
                {fallbackMessage}
              </div>
            )}
          </div>
          {slidesCount > 1 && (
            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/40 bg-white/80 px-4 py-2 text-xs font-semibold text-stone-700 shadow-lg backdrop-blur">
              <button
                type="button"
                className="rounded-full border border-stone-200 px-2 py-1 text-lg leading-none hover:bg-stone-100"
                onClick={gotoPrev}
                aria-label="Khoá trước"
              >
                ‹
              </button>
              <span>
                {activeIndex + 1}/{slidesCount}
              </span>
              <button
                type="button"
                className="rounded-full border border-stone-200 px-2 py-1 text-lg leading-none hover:bg-stone-100"
                onClick={gotoNext}
                aria-label="Khoá tiếp theo"
              >
                ›
              </button>
            </div>
          )}
        </div>
        {slidesCount > 0 && (
          <div className="mt-6 flex items-center justify-between rounded-3xl border border-white/70 bg-white px-5 py-4 text-sm font-semibold text-stone-700 shadow-[0_15px_35px_rgba(15,23,42,0.12)] sm:hidden">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-stone-400">Tiến độ hôm nay</p>
              <div className="mt-2 h-2 w-40 rounded-full bg-stone-100">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400" style={{ width: `${safeAvg}%` }} />
              </div>
            </div>
            <span className="text-base font-bold text-stone-900">{safeAvg}%</span>
          </div>
        )}
      </div>
    </section>
  );
}

function Trusted() {
  const logos = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta"];
  return (
    <section className="border-y border-stone-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center text-stone-500 text-sm">Được tin dùng bởi</div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 opacity-80">
          {logos.map((l) => (
            <div key={l} className="h-10 bg-stone-100 rounded-md grid place-items-center text-stone-400 text-xs uppercase tracking-widest">
              {l}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    {
      title: "Lộ trình rõ ràng",
      desc: "Từng bước từ cơ bản đến nâng cao, phù hợp nhiều cấp độ.",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      ),
    },
    {
      title: "Mentor đồng hành",
      desc: "Giải đáp nhanh, review bài tập và định hướng nghề nghiệp.",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 12c2.761 0 5-2.239 5-5S14.761 2 12 2 7 4.239 7 7s2.239 5 5 5Zm0 2c-4.418 0-8 2.239-8 5v3h16v-3c0-2.761-3.582-5-8-5Z" />
        </svg>
      ),
    },
    {
      title: "Dự án thực tế",
      desc: "Xây portfolio chất lượng với case study bám sát doanh nghiệp.",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 7h18v13H3z" /><path d="M8 7V4h8v3" />
        </svg>
      ),
    },
  ];
  return (
    <section id="features" className="bg-white">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <SectionHeading
          eyebrow="Vì sao chọn chúng tôi"
          title="Trải nghiệm học tập thiết kế cho người đi làm"
          subtitle="Tập trung vào thực hành, phản hồi nhanh và kết quả đo lường được."
          center
        />
        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {items.map((f) => (
            <div key={f.title} className="rounded-2xl border border-stone-200 p-6 hover:shadow-sm transition">
              <div className="w-10 h-10 rounded-md bg-primary-50 grid place-items-center">{f.icon}</div>
              <h3 className="mt-4 font-semibold text-stone-900">{f.title}</h3>
              <p className="mt-2 text-stone-600 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    {
      name: "Minh Anh",
      role: "Front-end Dev",
      text: "Lộ trình rõ ràng, mentor hỗ trợ nhanh. Sau 3 tháng mình đã có job đầu tiên.",
    },
    {
      name: "Quang Huy",
      role: "Fullstack Dev",
      text: "Bài tập thực tế, bám sát công việc. Portfolio sau khoá học giúp mình nổi bật khi phỏng vấn.",
    },
  ];
  return (
    <section id="testimonials" className="bg-white">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <SectionHeading
          eyebrow="Học viên nói gì"
          title="Kết quả là thước đo quan trọng nhất"
          subtitle="Chúng tôi tự hào về những chuyển đổi nghề nghiệp của học viên."
          center
        />
        <div className="mt-10 grid md:grid-cols-2 gap-6">
          {items.map((t) => (
            <div key={t.name} className="rounded-2xl border border-stone-200 p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-200" />
                <div>
                  <div className="font-semibold text-stone-900">{t.name}</div>
                  <div className="text-sm text-stone-600">{t.role}</div>
                </div>
              </div>
              <p className="mt-4 text-stone-700 leading-relaxed">“{t.text}”</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBanner() {
  return (
    <section className="py-14">
      <div className="max-w-7xl mx-auto px-4">
        <div className="rounded-2xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-700 to-primary-500 opacity-95" />
          <div className="relative p-8 md:p-12 text-white grid md:grid-cols-2 gap-6 items-center">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold">Sẵn sàng bứt phá sự nghiệp?</h3>
              <p className="mt-2 text-white/90">Tham gia ngay hôm nay để nhận tư vấn lộ trình miễn phí.</p>
            </div>
            <div className="flex md:justify-end">
              <Link to="/register" className="btn bg-white text-primary-700 border-white hover:bg-stone-50">Đăng ký ngay</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const token = useMemo(() => {
    try {
      return localStorage.getItem("token");
    } catch {
      return null;
    }
  }, []);
  const authHeaders = useMemo(
    () => (token ? { Accept: "application/json", Authorization: `Bearer ${token}` } : null),
    [token],
  );
  const [heroProgress, setHeroProgress] = useState({ loading: false, slides: [], avgPercent: 0 });

  useEffect(() => {
    if (!authHeaders) {
      setHeroProgress({ loading: false, slides: [], avgPercent: 0 });
      return;
    }
    let alive = true;
    const fetchProgress = async () => {
      setHeroProgress((prev) => ({ ...prev, loading: true }));
      try {
        const res = await fetch(`${API_BASE}/api/student/enrollments`, { headers: authHeaders });
        if (!res.ok) throw new Error("Không thể tải khoá học của bạn");
        const data = await res.json();
        if (!alive) return;
        const normalizedCourses = Array.isArray(data) ? data.map(normalizeEnrollmentCourse).filter(Boolean) : [];
        if (normalizedCourses.length === 0) {
          setHeroProgress({ loading: false, slides: [], avgPercent: 0 });
          return;
        }
        const limitedCourses = normalizedCourses.slice(0, 6);
        const progressEntries = await Promise.all(
          limitedCourses.map(async (course) => {
            try {
              const progressRes = await fetch(`${API_BASE}/api/student/progress/courses/${course.courseId}`, {
                headers: authHeaders,
              });
              if (!progressRes.ok) return [course.courseId, null];
              const progressData = await progressRes.json();
              return [
                course.courseId,
                {
                  completed: progressData?.completedLessons ?? 0,
                  total: progressData?.totalLessons ?? 0,
                  percent: progressData?.completionPercent ?? 0,
                },
              ];
            } catch {
              return [course.courseId, null];
            }
          }),
        );
        if (!alive) return;
        const progressMap = {};
        progressEntries.forEach(([id, info]) => {
          if (id) progressMap[id] = info;
        });
        const slides = limitedCourses
          .map((course) => {
            const stats = progressMap[course.courseId] || null;
            const total = stats?.total ?? 0;
            const completed = stats?.completed ?? 0;
            const basePercent = stats?.percent ?? (total > 0 ? (completed / total) * 100 : 0);
            const percent = Math.round(Math.min(Math.max(basePercent, 0), 100));
            return {
              ...course,
              percent,
              completed,
              total,
              lessonsLabel: total ? `${completed}/${total} bài học` : `${completed} bài đã hoàn thành`,
            };
          })
          .filter(Boolean);
        const avgPercent = slides.length
          ? Math.round(slides.reduce((sum, slide) => sum + (slide.percent || 0), 0) / slides.length)
          : 0;
        setHeroProgress({ loading: false, slides, avgPercent });
      } catch (err) {
        if (!alive) return;
        console.error(err);
        setHeroProgress({ loading: false, slides: [], avgPercent: 0 });
      }
    };
    fetchProgress();
    return () => {
      alive = false;
    };
  }, [authHeaders]);

  return (
    <div className="min-h-screen bg-white">
      {/* Ẩn mục "Bảng giá" trên thanh menu (ẩn theo href phổ biến) */}
      <style>{`
        a[href="/pricing"], a[href="/bang-gia"], a[data-nav="pricing"] {
          display: none !important;
        }
      `}</style>
      <Hero
        progressSlides={heroProgress.slides}
        loadingProgress={heroProgress.loading}
        avgPercent={heroProgress.avgPercent}
      />
      <LandingCourseShelf />
      <Trusted />
      <Features />
      {/* Danh sách khóa học thật, sắp xếp theo cấp độ */}
      <section id="courses" className="bg-stone-50">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <SectionHeading
            eyebrow="Khoá học theo cấp độ"
            title="Lộ trình thực chiến cho mọi cấp độ"
            subtitle="Tự động lấy dữ liệu từ backend và sắp xếp theo level."
            center
          />
          <div className="mt-10">
            <CoursesByLevel />
          </div>
        </div>
      </section>
      <Testimonials />
      <CtaBanner />
    </div>
  );
}
