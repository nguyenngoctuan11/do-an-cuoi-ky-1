import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import LessonSidebar from "../../components/LessonSidebar";
import httpClient, { API_BASE_URL } from "../../api/httpClient";

function PlayerHeader({ lesson }) {
  if (!lesson) return null;
  return (
    <div className="mb-4">
      <div className="text-xs uppercase tracking-wide text-stone-500">Bài học</div>
      <h1 className="text-xl md:text-2xl font-bold text-stone-900">{lesson.title}</h1>
    </div>
  );
}

function ContentTabs({ active, setActive }) {
  const tabs = [
    { id: "video", name: "Video" },
    { id: "notes", name: "Ghi chú" },
    { id: "resources", name: "Tài liệu" },
  ];
  return (
    <div className="border-b border-stone-200 flex items-center gap-4 text-sm">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => setActive(t.id)}
          className={`px-2 py-2 border-b-2 -mb-px ${
            active === t.id ? "border-primary-600 text-stone-900" : "border-transparent text-stone-600 hover:text-stone-900"
          }`}
        >
          {t.name}
        </button>
      ))}
    </div>
  );
}

export default function CoursePlayer() {
  const { courseId } = useParams();
  const { progress, refreshProgress } = useOutletContext() || {};
  const [modules, setModules] = useState([]);
  const [current, setCurrent] = useState(null);
  const [tab, setTab] = useState("video");
  const [videoUnlocked, setVideoUnlocked] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const pendingCompleteRef = useRef(new Set());

  const completedLessonIds = progress?.completedLessonIds || [];
  const completedSet = useMemo(() => new Set(completedLessonIds), [completedLessonIds]);

  useEffect(() => {
    if (!courseId) return;
    const API = API_BASE_URL;
    const asset = (u) => (u && u.startsWith("/") ? `${API}${u}` : u);
    fetch(`${API}/api/public/courses/${courseId}/detail-sql`)
      .then((r) => r.json())
      .then((data) => {
        const mods = (data?.modules || []).map((m) => ({
          id: m.id,
          title: m.title,
          lessons: (m.lessons || []).map((l) => ({
            id: l.id,
            title: l.title,
            time: l.duration_seconds
              ? `${Math.floor(l.duration_seconds / 60)}:${String(l.duration_seconds % 60).padStart(2, "0")}`
              : "",
            video_url: asset(l.video_url),
          })),
        }));
        setModules(mods);
      })
      .catch((e) => console.error("Load course detail failed", e));
  }, [courseId]);

  const flatLessons = useMemo(() => modules.flatMap((m) => m.lessons || []), [modules]);

  useEffect(() => {
    if (!current && flatLessons.length) {
      const firstWithVideo = flatLessons.find((l) => !!l.video_url);
      setCurrent(firstWithVideo || flatLessons[0]);
    }
  }, [flatLessons, current]);

  useEffect(() => {
    if (!current) {
      setVideoUnlocked(true);
      return;
    }
    const completed = completedSet.has(current.id);
    const isVideo = Boolean(current.video_url);
    setVideoUnlocked(!isVideo || completed);
  }, [current, completedSet]);

  const markLessonComplete = useCallback(
    async (lesson, { silent = false, onSuccess } = {}) => {
      if (!lesson?.id) return true;
      if (completedSet.has(lesson.id) || pendingCompleteRef.current.has(lesson.id)) {
        onSuccess?.();
        return true;
      }
      pendingCompleteRef.current.add(lesson.id);
      try {
        await httpClient.post(`/api/student/progress/lessons/${lesson.id}/complete`);
        onSuccess?.();
        await refreshProgress?.();
        return true;
      } catch (err) {
        console.error(err);
        if (!silent) {
          const msg = err?.response?.data?.message || "Không thể lưu tiến độ học tập. Vui lòng thử lại.";
          alert(msg);
        }
        return false;
      } finally {
        pendingCompleteRef.current.delete(lesson.id);
      }
    },
    [completedSet, refreshProgress],
  );

  const handleVideoProgress = async (event) => {
    if (!current?.video_url) return;
    if (completedSet.has(current.id)) return;
    const video = event.currentTarget;
    const duration = video.duration || 0;
    if (!duration) return;
    if (video.currentTime / duration >= 0.97) {
      await markLessonComplete(current, {
        silent: true,
        onSuccess: () => setVideoUnlocked(true),
      });
    }
  };

  const handleVideoEnded = async () => {
    if (!current?.video_url) return;
    await markLessonComplete(current, {
      silent: true,
      onSuccess: () => setVideoUnlocked(true),
    });
  };

  const goPrev = () => {
    const i = flatLessons.findIndex((l) => l.id === current?.id);
    if (i > 0) setCurrent(flatLessons[i - 1]);
  };

  const goNext = async () => {
    if (!current || navigating) return;
    const isVideo = Boolean(current.video_url);
    if (isVideo && !(completedSet.has(current.id) || videoUnlocked)) return;
    try {
      setNavigating(true);
      if (!isVideo && !completedSet.has(current.id)) {
        const ok = await markLessonComplete(current);
        if (!ok) return;
      }
      const i = flatLessons.findIndex((l) => l.id === current.id);
      if (i < flatLessons.length - 1) setCurrent(flatLessons[i + 1]);
    } finally {
      setNavigating(false);
    }
  };

  const video = current?.video_url;
  const lessonCompleted = current ? completedSet.has(current.id) : false;
  const disableNext = Boolean(video) && !lessonCompleted && !videoUnlocked;

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-6">
      <div>
        <PlayerHeader lesson={current} />
        {video ? (
          <video
            src={video}
            controls
            className="aspect-video w-full rounded-xl bg-black"
            onTimeUpdate={handleVideoProgress}
            onEnded={handleVideoEnded}
          />
        ) : (
          <div className="aspect-video rounded-xl bg-gradient-to-br from-primary-200 to-primary-100 flex items-center justify-center text-stone-500">
            Chưa có video cho bài học này
          </div>
        )}
        <div className="mt-4">
          <ContentTabs active={tab} setActive={setTab} />
          <div className="mt-4 text-sm text-stone-700">
            {tab === "video" && <p>Nội dung tóm tắt bài học, ghi chú quan trọng và liên kết hữu ích.</p>}
            {tab === "notes" && (
              <div className="space-y-3">
                <textarea className="input border-stone-300 w-full h-32" placeholder="Ghi chú của bạn..." />
                <div className="text-right">
                  <button className="btn btn-primary">Lưu ghi chú</button>
                </div>
              </div>
            )}
            {tab === "resources" && (
              <ul className="list-disc pl-5 space-y-1">
                <li>Tài liệu tham khảo</li>
                <li>Liên kết hữu ích</li>
              </ul>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex gap-3">
            <button onClick={goPrev} className="btn border-stone-300 hover:border-stone-400">
              Bài trước
            </button>
            <button
              onClick={goNext}
              disabled={disableNext || navigating}
              className={`btn border-stone-300 hover:border-stone-400 ${disableNext ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              Bài tiếp theo
            </button>
          </div>
          {video && !lessonCompleted && !videoUnlocked && (
            <p className="text-xs text-stone-500">Hãy xem hết video để mở khóa bài tiếp theo.</p>
          )}
        </div>

        <div className="mt-4 text-sm text-stone-600">
          Tiến độ khóa học: {progress?.completedLessons ?? 0}/{progress?.totalLessons ?? flatLessons.length} bài
        </div>
      </div>

      <LessonSidebar
        modules={modules}
        activeLessonId={current?.id}
        completedLessonIds={completedLessonIds}
        onSelect={(l) => setCurrent(l)}
      />
    </div>
  );
}
