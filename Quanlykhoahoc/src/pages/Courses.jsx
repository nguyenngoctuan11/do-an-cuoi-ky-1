import { useEffect, useMemo, useState } from "react";
import SectionHeading from "../components/SectionHeading";
import CourseShowcaseCard from "../components/CourseShowcaseCard";
import { resolveIsFree } from "../utils/price";
import { API_BASE_URL } from "../api/httpClient";

const API_BASE = API_BASE_URL;

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
  if (hours === 0) return `${mins} phut`;
  if (mins === 0) return `${hours} gio`;
  return `${hours}h${String(mins).padStart(2, "0")}p`;
}

function normalizeText(str) {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

const LEGACY_LEVEL_MAP = {
  beginner: 350,
  "co ban": 350,
  basic: 350,
  foundation: 350,
  intermediate: 550,
  "trung cap": 550,
  medium: 550,
  advanced: 750,
  "nang cao": 750,
  expert: 850,
};

function parseLevelScore(level) {
  if (!level) return null;
  const match = String(level).match(/(\d{2,3})/);
  if (match) {
    const score = Number(match[1]);
    if (Number.isFinite(score)) return score;
  }
  const normalized = normalizeText(level);
  return LEGACY_LEVEL_MAP[normalized] ?? null;
}

const LEVEL_SEGMENTS = [
  { id: "350", label: "350+", hint: "Mat goc, lam quen", min: 350, max: 450 },
  { id: "450", label: "450+", hint: "So trung cap, tang diem nhanh", min: 450, max: 550 },
  { id: "550", label: "550+", hint: "Trung cap, tu tin thi TOEIC", min: 550, max: 650 },
  { id: "650", label: "650+", hint: "Trung cao, muc tieu IELTS 6.5", min: 650, max: 750 },
  { id: "750", label: "750+", hint: "Nang cao, giao tiep cong so", min: 750, max: 850 },
  { id: "850", label: "850+", hint: "Chuyen sau, tieng Anh hoc thuat", min: 850, max: 950 },
  { id: "950", label: "950+", hint: "Mastery song ngu", min: 950, max: 1000 },
];

const DISCOVERY_TAGS = [
  {
    id: "foundation",
    label: "Kien thuc nen",
    hint: "Grammar, vocabulary, mat goc",
    matcher: (course) => {
      const score = parseLevelScore(course.level);
      if (score && score <= 450) return true;
      const txt = normalizeText(`${course.title || ""} ${course.shortDesc || ""}`);
      return /nen tang|co ban|foundation|grammar|vocabulary/.test(txt);
    },
  },
  {
    id: "skills",
    label: "Ky nang",
    hint: "Speaking, listening, presentation",
    matcher: (course) => {
      const txt = normalizeText(`${course.title || ""} ${course.shortDesc || ""}`);
      return /ky nang|skill|speaking|listening|writing|reading|communication|giao tiep|presentation/.test(txt);
    },
  },
  {
    id: "advanced",
    label: "Cap do",
    hint: "Khoa hoc nang cao",
    matcher: (course) => {
      const score = parseLevelScore(course.level);
      if (score && score >= 650) return true;
      const txt = normalizeText(`${course.title || ""} ${course.shortDesc || ""} ${course.level || ""}`);
      return /advanced|nang cao|master|cap do/.test(txt);
    },
  },
  {
    id: "needs",
    label: "Nhu cau",
    hint: "Business, du lich, di lam",
    matcher: (course) => {
      const txt = normalizeText(`${course.title || ""} ${course.shortDesc || ""}`);
      return /giao tiep|business|cong viec|du hoc|di lam|meeting|van phong|travel/.test(txt);
    },
  },
  {
    id: "certificate",
    label: "Chung chi",
    hint: "TOEIC, IELTS, CEFR",
    matcher: (course) => {
      const txt = normalizeText(`${course.title || ""} ${course.shortDesc || ""}`);
      return /toeic|ielts|toefl|chung chi|certificate|cefr/.test(txt);
    },
  },
  {
    id: "student",
    label: "Hoc sinh",
    hint: "Thi THPT, sinh vien",
    matcher: (course) => {
      const txt = normalizeText(`${course.title || ""} ${course.shortDesc || ""}`);
      return /hoc sinh|sinh vien|teen|thpt|thi dai hoc|cap 3/.test(txt);
    },
  },
];

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/public/courses-sql?status=published&limit=50`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Khong the tai danh sach khoa hoc");
        const data = await res.json();
        if (Array.isArray(data)) {
          const normalized = data.map((c) => ({
            id: c.id,
            slug: c.slug,
            title: c.title,
            level: c.level,
            teacherName: c.teacher_name ?? c.teacherName ?? c.created_by_name ?? null,
            lessons: c.lessons_count ?? c.lessonsCount ?? 0,
            thumbnail: resolveThumb(
              c.thumbnail_url ?? c.thumbnailUrl ?? c.thumbnail_path ?? c.thumbnailPath ?? null,
            ),
            price: c.price ?? null,
            isFree: resolveIsFree(c.price, c.is_free ?? c.isFree),
            durationLabel: formatDurationFromMinutes(
              c.total_minutes ?? c.totalMinutes ?? c.duration_minutes ?? c.durationMinutes ?? null,
            ),
            shortDesc: c.short_desc ?? c.shortDesc ?? "",
          }));
          setCourses(normalized);
        } else {
          setCourses([]);
        }
      } catch (error) {
        console.error(error);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredCourses = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    return courses.filter((course) => {
      const searchable = normalizeText(
        `${course.title || ""} ${course.shortDesc || ""} ${course.level || ""} ${course.teacherName || ""}`,
      );
      if (normalizedQuery && !searchable.includes(normalizedQuery)) {
        return false;
      }
      if (selectedTag) {
        const tag = DISCOVERY_TAGS.find((t) => t.id === selectedTag);
        if (tag && !tag.matcher(course)) return false;
      }
      if (selectedLevel) {
        const segment = LEVEL_SEGMENTS.find((seg) => seg.id === selectedLevel);
        if (segment) {
          const score = parseLevelScore(course.level);
          if (score == null) return false;
          if (segment.min != null && score < segment.min) return false;
          if (segment.max != null && score >= segment.max) return false;
        }
      }
      return true;
    });
  }, [courses, query, selectedLevel, selectedTag]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setQuery((prev) => prev.trim());
  };

  const toggleTag = (id) => {
    setSelectedTag((prev) => (prev === id ? null : id));
  };

  const toggleLevel = (id) => {
    setSelectedLevel((prev) => (prev === id ? null : id));
  };

  const clearFilters = () => {
    setSelectedTag(null);
    setSelectedLevel(null);
    setQuery("");
  };

  const activeFilters = Boolean(query || selectedTag || selectedLevel);

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <SectionHeading
          eyebrow="Khoa hoc"
          title="Danh sach khoa hoc"
          subtitle="Chon lo trinh phu hop voi muc tieu cua ban"
          center
        />

        <div className="mx-auto mt-10 max-w-4xl rounded-[32px] border border-stone-200 bg-white p-6 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.8)]">
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-3 rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 text-stone-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4.35-4.35" />
                </svg>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tim khoa hoc..."
                  className="flex-1 border-none bg-transparent text-base text-stone-800 placeholder-stone-400 outline-none"
                />
              </div>
              <button type="submit" className="btn btn-primary min-w-[140px]">
                Tim kiem
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {DISCOVERY_TAGS.map((tag) => {
                const active = selectedTag === tag.id;
                return (
                  <button
                    type="button"
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    title={tag.hint}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                      active
                        ? "border-primary-500 bg-primary-50 text-primary-700 shadow-sm"
                        : "border-stone-200 text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">Trinh do TOEIC</span>
              {LEVEL_SEGMENTS.map((segment) => {
                const active = selectedLevel === segment.id;
                return (
                  <button
                    type="button"
                    key={segment.id}
                    onClick={() => toggleLevel(segment.id)}
                    title={segment.hint}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                      active ? "bg-emerald-100 text-emerald-700 shadow-inner" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {segment.label}
                  </button>
                );
              })}
              {activeFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-primary-600 hover:bg-primary-50"
                >
                  Xoa bo loc
                </button>
              )}
              <span className="ml-auto text-xs text-stone-500">
                {filteredCourses.length} khoa hoc phu hop
              </span>
            </div>
          </form>
        </div>

        {loading ? (
          <div className="mt-12 grid animate-pulse gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-72 rounded-3xl border border-stone-200 bg-stone-50" />
            ))}
          </div>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 px-6 py-12 text-center text-stone-600">
                Khong tim thay khoa hoc phu hop. Thu doi tu khoa hoac bo loc khac.
              </div>
            )}
            {filteredCourses.map((course) => (
              <CourseShowcaseCard
                key={course.id}
                id={course.id}
                slug={course.slug}
                title={course.title}
                level={course.level}
                teacherName={course.teacherName}
                lessonsCount={course.lessons}
                thumbnail={course.thumbnail}
                price={course.price}
                isFree={course.isFree}
                durationLabel={course.durationLabel}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
