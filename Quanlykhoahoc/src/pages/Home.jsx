import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SectionHeading from "../components/SectionHeading";
import { API_BASE_URL } from "../api/httpClient";

const API_BASE = API_BASE_URL;

const HERO_IMAGE =
  "https://plus.unsplash.com/premium_photo-1664195786180-23507e5048c1?auto=format&fit=crop&w=1000&q=70";
const ILLUSTRATION_GENERAL =
  "/images/s.png";
const ILLUSTRATION_CLASS =
  "/images/cs.png";
const ILLUSTRATION_TEST =
  "/images/s.png";

function resolveThumb(u) {
  if (!u) return null;
  let s = String(u).trim().replace(/\\/g, "/");
  if (/^https?:\/\//i.test(s) || s.startsWith("data:")) return s;
  if (!s.startsWith("/")) s = `/${s}`;
  return `${API_BASE}${s}`;
}

function resolveAssetUrl(u) {
  if (!u) return "";
  const raw = String(u).trim();
  if (!raw) return "";
  if (/^(?:https?:|data:|blob:)/i.test(raw)) return raw;
  const normalized = raw.startsWith("/") ? raw : `/${raw}`;
  return `${API_BASE}${normalized}`;
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
            Nền tảng tiếng Anh toàn diện
          </div>
          <h1 className="mt-4 text-4xl md:text-5xl font-extrabold leading-tight text-stone-900">
            Làm chủ tiếng Anh với mentor và AI song hành
          </h1>
          <p className="mt-4 text-stone-600 text-lg">
            Chọn lộ trình IELTS, TOEIC, Giao tiếp hoặc Business English với bài học tương tác, flashcard thông minh và phản hồi phát âm chuẩn quốc tế.
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
            <span>65.000+ học viên đã nâng band</span>
            {slidesCount > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-600">
                <span className="h-2 w-2 rounded-full bg-primary-500" />
                {slidesCount} khoá đang học
              </span>
            )}
          </div>
        </div>
        <div className="relative">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-gradient-to-br from-[#0d2f5d] to-[#0f498d] shadow-2xl">
            {activeSlide ? (
              <>
                <img
                  src={activeSlide.thumbnail || HERO_IMAGE}
                  alt={activeSlide.title || "English course"}
                  className="absolute inset-0 h-full w-full object-cover opacity-70"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-black/30 to-transparent" />
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

function StatsBand() {
  const stats = [
    { value: "65.000+", label: "Học viên đạt mục tiêu" },
    { value: "8+", label: "Năm kinh nghiệm luyện thi" },
    { value: "120+", label: "Mentor bản ngữ & Việt Nam" },
    { value: "300+", label: "Bài học tương tác & đề thi" },
  ];
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-4 rounded-3xl border border-white/80 bg-white/90 p-4 shadow-[0_20px_40px_rgba(15,23,42,0.06)] sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((item) => (
            <div key={item.label} className="rounded-2xl bg-gradient-to-br from-primary-50 to-white px-4 py-6 text-center">
              <p className="text-2xl font-bold text-primary-600">{item.value}</p>
              <p className="mt-1 text-sm text-stone-600">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProgramShowcase() {
  const programs = [
    {
      title: "IELTS Ready",
      desc: "Tăng từ 5.0 lên 7.5+ với mentor 1:1, bài Speaking & Writing được chấm hàng tuần.",
      points: ["36 bài học tương tác", "Flashcard từ vựng Cambridge", "Lịch học linh hoạt"],
      cta: "/courses?track=ielts",
      color: "from-[#fdf2e9] to-white",
    },
    {
      title: "TOEIC Express",
      desc: "Tập trung Listening & Reading, tăng 200+ điểm sau 6 tuần với đề sát ETS.",
      points: ["12 đề thi thử", "Chiến lược giải nhanh từng Part", "Kho audio song ngữ"],
      cta: "/courses?track=toeic",
      color: "from-[#e8f4ff] to-white",
    },
    {
      title: "Speaking Lab",
      desc: "Lớp giao tiếp chuyên sâu, luyện phát âm IPA và phản xạ hội thoại với AI + mentor bản ngữ.",
      points: ["AI chấm phát âm", "CLB nói chuyện hằng tuần", "Mentor sửa lỗi trực tiếp"],
      cta: "/courses?track=speaking",
      color: "from-[#f1f3ff] to-white",
    },
    {
      title: "Kids English Adventures",
      desc: "Chương trình cho bé 6-12 tuổi với trò chơi gamified, câu chuyện và giáo viên nước ngoài.",
      points: ["Nhân vật hoạt hình", "Bảng điều khiển dành cho phụ huynh", "Lớp live hàng tuần"],
      cta: "/courses?track=kids",
      color: "from-[#fff0f7] to-white",
    },
  ];
  return (
    <section className="bg-[#fdf8f1]">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Lộ trình nổi bật</p>
          <h2 className="mt-2 text-3xl font-semibold text-stone-900">Chọn mục tiêu tiếng Anh phù hợp với bạn</h2>
          <p className="mt-2 text-sm text-stone-500">
            Không cần hiển thị toàn bộ danh sách khóa học. Khi bạn sẵn sàng, chỉ cần nhấn “Khám phá khóa học” để tới trang chi tiết.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {programs.map((program) => (
            <article
              key={program.title}
              className={`flex h-full flex-col rounded-[28px] border border-white/70 bg-gradient-to-b ${program.color} p-6 shadow-[0_25px_55px_rgba(15,23,42,0.08)]`}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary-500">Program</p>
                <h3 className="mt-2 text-xl font-bold text-stone-900">{program.title}</h3>
                <p className="mt-2 text-sm text-stone-600">{program.desc}</p>
              </div>
              <ul className="mt-6 space-y-2 text-sm text-stone-600">
                {program.points.map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary-500" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={program.cta}
                className="mt-6 inline-flex items-center justify-center rounded-full border border-primary-200 px-4 py-2 text-sm font-semibold text-primary-700 transition hover:border-primary-500 hover:bg-white"
              >
                Khám phá khóa học
                <svg viewBox="0 0 24 24" className="ml-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function HeritageBanner() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-col gap-8 rounded-[40px] border border-blue-100 bg-gradient-to-b from-white to-blue-50/40 p-8 text-center lg:flex-row lg:items-center lg:text-left">
          <div className="flex-1">
            <p className="text-sm font-semibold uppercase tracking-[0.4em] text-blue-400">#1 Việt Nam</p>
            <h2 className="mt-2 text-3xl font-semibold text-stone-900">Chinh phục mục tiêu tiếng Anh với nền tảng học tập được tin dùng suốt 12 năm</h2>
            <p className="mt-4 text-sm text-stone-600">
              Phát triển từ năm 2013, nền tảng hiện đồng hành cùng hơn 2 triệu học viên và được hệ sinh thái TECHFEST bình chọn là EdTech học tiếng Anh sáng tạo.
              Lịch học linh hoạt, bài tập tương tác và hệ thống đánh giá chuẩn quốc tế giúp bạn xác định lộ trình rõ ràng.
            </p>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="relative rounded-full border-2 border-blue-200 px-10 py-8 text-center shadow-[0_15px_40px_rgba(37,99,235,0.15)]">
              <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">XÓA BỎ RÀO CẢN</p>
              <p className="text-5xl font-black text-blue-500">12</p>
              <p className="text-sm font-semibold text-blue-400">NĂM ĐỒNG HÀNH</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SolutionTiles() {
  const tiles = [
    {
      logo: "VOCA.VN",
      tone: "text-blue-500",
      description:
        "Nền tảng học tiếng Anh tổng quát với 500+ khóa theo kỹ năng, cấp độ. Học qua trò chơi, flashcard và AI phản hồi giúp ghi nhớ lâu.",
      cta: "Bắt đầu miễn phí",
      link: "/register",
      bg: "from-[#f1f9ff] to-white",
      image: ILLUSTRATION_GENERAL,
    },
    {
      logo: "VOCA ClassZoom",
      tone: "text-orange-500",
      description:
        "Lớp học trực tuyến 1 kèm 1 kết hợp e-learning và mentor sư phạm. Duy trì động lực, có giáo trình cá nhân và buổi kèm mỗi tuần.",
      cta: "Nhận 2 buổi học thử",
      link: "/survey",
      bg: "from-[#fff7eb] to-white",
      image: ILLUSTRATION_CLASS,
    },
  ];
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 space-y-12">
        {tiles.map((tile) => (
          <div
            key={tile.logo}
            className={`grid gap-6 rounded-[36px] border border-white/70 bg-gradient-to-r ${tile.bg} p-8 shadow-[0_30px_60px_rgba(15,23,42,0.08)] lg:grid-cols-2`}
          >
            <div>
              <p className={`text-2xl font-bold ${tile.tone}`}>{tile.logo}</p>
              <p className="mt-2 text-base font-semibold text-stone-900">Nền tảng học tiếng Anh vui, hiệu quả</p>
              <p className="mt-3 text-sm text-stone-600">{tile.description}</p>
              <a
                href={tile.link}
                className="mt-6 inline-flex items-center rounded-full border border-stone-200 bg-white px-5 py-2 text-sm font-semibold text-stone-700 shadow-sm hover:border-primary-400"
              >
                {tile.cta}
              </a>
            </div>
            <div className="flex items-center justify-center">
              <img src={tile.image} alt={tile.logo} className="h-48 w-64 rounded-[32px] object-cover shadow-inner" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PlacementTestCTA() {
  return (
    <section className="bg-[#fffdf5]">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-[36px] bg-white p-8 shadow-[0_25px_55px_rgba(15,23,42,0.08)] lg:grid lg:grid-cols-[1.2fr,0.8fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-amber-500">VOCA English Test</p>
            <h3 className="mt-2 text-2xl font-bold text-stone-900">Kiểm tra trình độ tiếng Anh miễn phí</h3>
            <p className="mt-3 text-sm text-stone-600">
              Bài test dựa trên chuẩn CEFR giúp bạn biết mình đang ở cấp độ nào (A1 → C1), từ đó nhận lộ trình phù hợp trước khi đăng ký khóa học.
            </p>
        <Link
          to="/survey?step=placement"
          className="mt-4 inline-flex items-center rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-amber-600"
        >
          Làm bài kiểm tra ngay
          <svg viewBox="0 0 24 24" className="ml-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </Link>
      </div>
      <div className="mt-6 lg:mt-0 flex justify-center">
        <div className="rounded-[30px] bg-gradient-to-br from-[#fff4d6] to-white p-6 text-center shadow-inner">
          <img src={ILLUSTRATION_TEST} alt="Placement test" className="mb-4 h-32 w-full rounded-2xl object-cover" />
          <p className="text-sm font-semibold text-amber-500">Trình độ của bạn</p>
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-stone-600">
            <span>A1</span>
            <span>A2</span>
            <span>B1</span>
            <span>B2</span>
          </div>
          <p className="mt-3 text-xs text-stone-500">Mỗi cấp độ gồm phân tích kỹ năng nghe, đọc, nói và vốn từ.</p>
        </div>
      </div>
    </div>
  </div>
</section>
  );
}

function TeacherShowcase() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fallbacks = [
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=60",
    "https://images.unsplash.com/photo-1525130413817-d45c1d127c42?auto=format&fit=crop&w=400&q=60",
    "https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=400&q=60",
    "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=400&q=60",
  ];

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    fetch(`${API_BASE}/api/public/teachers/highlights?limit=6`)
      .then((res) => {
        if (!res.ok) throw new Error("Không thể tải danh sách giảng viên");
        return res.json();
      })
      .then((data) => {
        if (!alive) return;
        setTeachers(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.message || "Không thể tải danh sách giảng viên");
        setTeachers([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const placeholderCards = fallbacks.map((url, idx) => ({
    id: `fallback-${idx}`,
    fullName: ["Thầy Andrew", "Cô Minh Anh", "Thầy David", "Cô Julie"][idx % 4],
    avatarUrl: url,
    bio: "Giảng viên tiếng Anh giao tiếp và luyện thi.",
    courseCount: 5 - (idx % 3),
    lessonCount: 60 + idx * 10,
  }));
  const cards = teachers.length ? teachers : placeholderCards;
  const skeletons = Array.from({ length: 4 }, (_, idx) => ({
    id: `skeleton-${idx}`,
    isSkeleton: true,
  }));
  const listToRender = loading && teachers.length === 0 ? skeletons : cards;

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex flex-col gap-2 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Đội ngũ mentor</p>
          <h2 className="text-3xl font-semibold text-stone-900">Giảng viên đồng hành cùng bạn</h2>
          <p className="text-sm text-stone-500">Hơn 100 giáo viên bản ngữ và Việt Nam thiết kế bài học, chấm bài và tổ chức lớp trực tuyến mỗi tuần.</p>
        </div>
        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600 text-center">{error}</p>}
        <div className="mt-10 overflow-x-auto pb-4">
          <div className="flex gap-6 min-w-full">
            {listToRender.map((teacher, idx) => (
              <article
                key={teacher.id ?? idx}
                className="min-w-[240px] flex-1 rounded-[28px] border border-white/80 bg-gradient-to-b from-white to-sky-50 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)]"
              >
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 overflow-hidden rounded-full bg-sky-100">
                    {teacher.isSkeleton ? (
                      <div className="h-full w-full animate-pulse bg-sky-200" />
                    ) : (
                      <img
                        src={resolveAssetUrl(teacher.avatarUrl) || fallbacks[idx % fallbacks.length]}
                        alt={teacher.fullName || "Teacher"}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900">{teacher.fullName || "Đang cập nhật"}</p>
                    {!teacher.isSkeleton && (
                      <p className="text-xs text-stone-500">
                        {teacher.courseCount || 0} khóa · {teacher.lessonCount || 0} bài học
                      </p>
                    )}
                  </div>
                </div>
                <p className="mt-4 text-sm text-stone-600 line-clamp-3">
                  {teacher.isSkeleton
                    ? "Đang tải thông tin giảng viên..."
                    : teacher.bio || "Giảng viên tiếng Anh tại VOCA với nhiều năm kinh nghiệm luyện thi."}
                </p>
              </article>
            ))}
          </div>
        </div>
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
      title: "Lộ trình IELTS/TOEIC rõ ràng",
      desc: "Được thiết kế theo cấp độ CEFR từ A1 đến C1, có checklist từng tuần và bài kiểm tra định kỳ.",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      ),
    },
    {
      title: "Mentor & AI phản hồi phát âm",
      desc: "Thu âm giọng nói, nhận nhận xét tức thì và được mentor chỉnh sửa 1:1 mỗi tuần.",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 12c2.761 0 5-2.239 5-5S14.761 2 12 2 7 4.239 7 7s2.239 5 5 5Zm0 2c-4.418 0-8 2.239-8 5v3h16v-3c0-2.761-3.582-5-8-5Z" />
        </svg>
      ),
    },
    {
      title: "Flashcard & bài tập tương tác",
      desc: "Học từ vựng bằng spaced-repetition, luyện nghe với phụ đề song ngữ và viết bài được AI chấm điểm.",
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
      name: "Quỳnh Chi",
      role: "IELTS 7.5",
      text: "Lịch học linh hoạt và bài chấm Speaking chi tiết giúp mình tăng 1.5 band sau 8 tuần.",
    },
    {
      name: "Tuấn Minh",
      role: "TOEIC 905",
      text: "Flashcard và đề thi thử giống cấu trúc thật. Mỗi tuần mentor gọi video để luyện giao tiếp nên mình tiến bộ rõ rệt.",
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
              <h3 className="text-2xl md:text-3xl font-bold">Sẵn sàng bứt phá tiếng Anh?</h3>
              <p className="mt-2 text-white/90">Đăng ký nhận lộ trình cá nhân hóa IELTS/TOEIC miễn phí từ chuyên gia của chúng tôi.</p>
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
      <StatsBand />
      <HeritageBanner />
      <SolutionTiles />
      <ProgramShowcase />
      <PlacementTestCTA />
      <TeacherShowcase />
      <Trusted />
      <Features />
      <Testimonials />
      <CtaBanner />
    </div>
  );
}
