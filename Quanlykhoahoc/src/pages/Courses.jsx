import { useEffect, useState } from "react";
import SectionHeading from "../components/SectionHeading";
import CourseShowcaseCard from "../components/CourseShowcaseCard";
import { resolveIsFree } from "../utils/price";

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

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/public/courses-sql?status=published&limit=12`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Không thể tải danh sách khóa học");
        const data = await res.json();
        if (Array.isArray(data)) {
          const normalized = data.map((c) => ({
            id: c.id,
            slug: c.slug,
            title: c.title,
            level: c.level,
            lessons: c.lessons_count ?? c.lessonsCount ?? 0,
            thumbnail: resolveThumb(
              c.thumbnail_url ?? c.thumbnailUrl ?? c.thumbnail_path ?? c.thumbnailPath ?? null
            ),
            price: c.price ?? null,
            isFree: resolveIsFree(c.price, c.is_free ?? c.isFree),
            durationLabel: formatDurationFromMinutes(
              c.total_minutes ?? c.totalMinutes ?? c.duration_minutes ?? c.durationMinutes ?? null
            ),
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

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <SectionHeading
          eyebrow="Khóa học"
          title="Danh sách khóa học"
          subtitle="Chọn lộ trình phù hợp với mục tiêu của bạn"
          center
        />

        {loading ? (
          <div className="mt-12 grid animate-pulse gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-72 rounded-3xl border border-stone-200 bg-stone-50" />
            ))}
          </div>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 px-6 py-12 text-center text-stone-600">
                Chưa có khóa học. Hãy quay lại sau nhé!
              </div>
            )}
            {courses.map((course) => (
              <CourseShowcaseCard
                key={course.id}
                id={course.id}
                slug={course.slug}
                title={course.title}
                level={course.level}
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
