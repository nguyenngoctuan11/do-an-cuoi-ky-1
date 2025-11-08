import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import LessonSidebar from "../../components/LessonSidebar";

function PlayerHeader({ lesson }) {
  return (
    <div className="mb-4">
      <div className="text-xs text-stone-500">Bài học</div>
      <h1 className="text-xl md:text-2xl font-bold text-stone-900">{lesson?.title || ""}</h1>
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
            active === t.id
              ? "border-primary-600 text-stone-900"
              : "border-transparent text-stone-600 hover:text-stone-900"
          }`}
        >
          {t.name}
        </button>
      ))}
    </div>
  );
}

export default function CoursePlayer() {
  const { courseId } = useParams(); // slug
  const [modules, setModules] = useState([]);
  const flatLessons = useMemo(() => modules.flatMap((m) => m.lessons || []), [modules]);
  const [current, setCurrent] = useState(null);
  const [tab, setTab] = useState("video");

  useEffect(() => {
    const API = process.env.REACT_APP_API_BASE || "http://localhost:8081";
    const asset = (u) => (u && u.startsWith("/")) ? `${API}${u}` : u;
    if (!courseId) return;
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

  useEffect(() => {
    if (!current && flatLessons.length) {
      const firstWithVideo = flatLessons.find((l) => !!l.video_url);
      setCurrent(firstWithVideo || flatLessons[0]);
    }
  }, [flatLessons, current]);

  const goPrev = () => {
    const i = flatLessons.findIndex((l) => l.id === current?.id);
    if (i > 0) setCurrent(flatLessons[i - 1]);
  };
  const goNext = () => {
    const i = flatLessons.findIndex((l) => l.id === current?.id);
    if (i < flatLessons.length - 1) setCurrent(flatLessons[i + 1]);
  };

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-6">
      <div>
        <PlayerHeader lesson={current} />
        {current?.video_url ? (
          <video src={current.video_url} controls className="aspect-video w-full rounded-xl bg-black" />
        ) : (
          <div className="aspect-video rounded-xl bg-gradient-to-br from-primary-200 to-primary-100 flex items-center justify-center text-stone-500">
            Chưa có video cho bài học này
          </div>
        )}
        <div className="mt-4">
          <ContentTabs active={tab} setActive={setTab} />
          <div className="mt-4">
            {tab === "video" && (
              <div className="text-sm text-stone-700">
                <p>Nội dung tóm tắt bài học, ghi chú quan trọng và liên kết hữu ích.</p>
              </div>
            )}
            {tab === "notes" && (
              <div className="space-y-3">
                <textarea className="input border-stone-300 w-full h-32" placeholder="Ghi chú của bạn..." />
                <div className="text-right"><button className="btn btn-primary">Lưu ghi chú</button></div>
              </div>
            )}
            {tab === "resources" && (
              <ul className="list-disc pl-5 text-sm text-stone-700 space-y-1">
                <li>Tài liệu tham khảo</li>
                <li>Liên kết hữu ích</li>
              </ul>
            )}
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <button onClick={goPrev} className="btn border-stone-300 hover:border-stone-400">Bài trước</button>
          <button onClick={goNext} className="btn btn-primary">Bài tiếp theo</button>
        </div>
      </div>

      <LessonSidebar
        modules={modules}
        activeLessonId={current?.id}
        onSelect={(l) => setCurrent(l)}
      />
    </div>
  );
}
