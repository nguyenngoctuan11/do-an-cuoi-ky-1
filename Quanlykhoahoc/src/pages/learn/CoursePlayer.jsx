import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import LessonSidebar from "../../components/LessonSidebar";
import httpClient, { API_BASE_URL } from "../../api/httpClient";
import { useSupportChat } from "../../context/SupportChatContext";

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
  const navigate = useNavigate();
  const { progress, refreshProgress } = useOutletContext() || {};
  const [modules, setModules] = useState([]);
  const [current, setCurrent] = useState(null);
  const [tab, setTab] = useState("video");
  const [videoUnlocked, setVideoUnlocked] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const pendingCompleteRef = useRef(new Set());
  const [exams, setExams] = useState([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const videoElementRef = useRef(null);
  const allowedSeekRef = useRef(0);
  const { openChat, setEntryContext } = useSupportChat();

  const completedLessonIds = progress?.completedLessonIds || [];
  const [localCompleted, setLocalCompleted] = useState(() => new Set(completedLessonIds));

  useEffect(() => {
    setLocalCompleted(new Set(completedLessonIds));
  }, [completedLessonIds]);

  const completedSet = useMemo(() => localCompleted, [localCompleted]);

  useEffect(() => {
    if (!courseId) return undefined;
    setEntryContext((prev) => ({
      ...(prev || {}),
      courseId,
      courseTitle: progress?.courseTitle || progress?.courseName || `Kha hc ${courseId}`,
      origin: "lesson_player",
    }));
    return () =>
      setEntryContext((prev) => (prev && String(prev.courseId) === String(courseId) ? null : prev));
  }, [courseId, progress?.courseTitle, progress?.courseName, setEntryContext]);

  const resolveVideoSource = useCallback((url) => {
    if (!url) return { type: "none", url: null };
    const normalized = url.trim();
    const lower = normalized.toLowerCase();
    if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
      let embed = normalized;
      if (lower.includes("watch?v=")) {
        const idPart = normalized.split("watch?v=")[1]?.split("&")[0];
        if (idPart) embed = `https://www.youtube.com/embed/${idPart}`;
      } else if (lower.includes("youtu.be/")) {
        const idPart = normalized.split("youtu.be/")[1]?.split("?")[0];
        if (idPart) embed = `https://www.youtube.com/embed/${idPart}`;
      }
      return { type: "youtube", url: embed };
    }
    const absolute = normalized.startsWith("/") ? `${API_BASE_URL}${normalized}` : normalized;
    return { type: "video", url: absolute };
  }, []);

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
    if (!courseId) return;
    setLoadingExams(true);
    httpClient
      .get(`/api/student/exams/courses/${courseId}`)
      .then(({ data }) => {
        setExams(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Load exams failed", err);
        setExams([]);
      })
      .finally(() => setLoadingExams(false));
  }, [courseId]);

  useEffect(() => {
    if (!current) {
      setVideoUnlocked(true);
      return;
    }
    const completed = completedSet.has(current.id);
    const isVideo = resolveVideoSource(current.video_url).type !== "none";
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
        setLocalCompleted((prev) => {
          const next = new Set(prev);
          next.add(lesson.id);
          return next;
        });
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
    videoElementRef.current = video;
    const duration = video.duration || 0;
    const currentTime = video.currentTime || 0;
    allowedSeekRef.current = Math.max(allowedSeekRef.current, currentTime + 15);
    if (!duration) return;
    if (video.currentTime / duration >= 0.97) {
      await markLessonComplete(current, {
        silent: true,
        onSuccess: () => setVideoUnlocked(true),
      });
    }
  };

  const handleVideoSeeking = (event) => {
    const video = event.currentTarget;
    if (video.currentTime > allowedSeekRef.current) {
      video.currentTime = allowedSeekRef.current;
    }
  };

  const handleVideoEnded = async () => {
    if (!current?.video_url) return;
    await markLessonComplete(current, {
      silent: true,
      onSuccess: () => setVideoUnlocked(true),
    });
  };

  const handleManualComplete = async () => {
    if (!current || completedSet.has(current.id)) return;
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
    const isVideo = resolveVideoSource(current.video_url).type !== "none";
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

  const videoSource = resolveVideoSource(current?.video_url);
  const lessonCompleted = current ? completedSet.has(current.id) : false;
  const disableNext = videoSource.type !== "none" && !lessonCompleted && !videoUnlocked;
  const totalLessons = progress?.totalLessons ?? flatLessons.length;
  const completedLessons = completedSet.size || progress?.completedLessons || 0;
  const completionPercent = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const canShowExams = completionPercent >= 100 && exams.length > 0;
  const lessonIndex = flatLessons.findIndex((l) => l.id === current?.id);
  const canFastForward = lessonIndex <= 1;

  useEffect(() => {
    allowedSeekRef.current = lessonIndex <= 1 ? Number.MAX_SAFE_INTEGER : 0;
    if (videoElementRef.current) {
      videoElementRef.current.currentTime = 0;
    }
  }, [current?.id, lessonIndex]);

  const canAccessLesson = (lessonId) => {
    if (!lessonId) return false;
    const idx = flatLessons.findIndex((l) => l.id === lessonId);
    if (idx <= 0) return true;
    for (let i = 0; i < idx; i += 1) {
      if (!completedSet.has(flatLessons[i].id)) {
        return false;
      }
    }
    return true;
  };

  const handleSelectLesson = (lesson) => {
    if (!lesson?.id) return;
    if (!canAccessLesson(lesson.id)) {
      alert("Bạn cần hoàn thành bài trước để mở bài này.");
      return;
    }
    setCurrent(lesson);
  };

  const goToExam = (examId) => {
    navigate(`/courses/${courseId}/exams/${examId}`);
  };

  const formatExamMeta = (exam) => {
    const minutes = exam?.timeLimitSec ? Math.round(exam.timeLimitSec / 60) : null;
    const timeLabel = minutes ? `${minutes} phút` : "Không giới hạn";
    return `${exam?.questionCount ?? 0} cu  ${timeLabel}`;
  };

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-6">
      <div>
        <PlayerHeader lesson={current} />
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() =>
              openChat({
                origin: "lesson_player",
                courseId,
                courseTitle: progress?.courseTitle || progress?.courseName || current?.title || `Kha hc ${courseId}`,
                topic: "lesson_issue",
              })
            }
            className="text-sm font-semibold text-primary-700 hover:underline"
          >
            Cần hỗ trợ? Chat với tư vấn viên
          </button>
        </div>
        <div className="mb-6 rounded-xl border border-stone-200 bg-white p-4 shadow-sm flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Tin  kha hc</p>
            <p className="text-2xl font-semibold text-stone-900">
              {completedLessons}/{totalLessons} bài ({completionPercent}%)
            </p>
          </div>
          <div className="flex-1 h-2 rounded-full bg-stone-100">
            <div className="h-full rounded-full bg-primary-600 transition-all" style={{ width: `${Math.min(100, completionPercent)}%` }} />
          </div>
          <div className="text-sm text-primary-700 font-medium">
            {completionPercent >= 100 ? "Bạn đã hoàn thành toàn bộ khóa học!" : "Tiếp tục học để mở bài kiểm tra."}
          </div>
        </div>
        {canShowExams && (
          <div className="mb-6 border border-primary-100 bg-primary-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-primary-600 font-semibold uppercase">Bài kiểm tra</p>
                <p className="text-stone-800">Hoàn thành bài kiểm tra để nhận chứng chỉ</p>
              </div>
              {loadingExams && <span className="text-xs text-stone-500">Đang tải...</span>}
            </div>
            <div className="space-y-2">
              {exams.map((exam) => (
                <div key={exam.id} className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-lg px-4 py-3 shadow-sm border border-primary-100">
                  <div>
                    <p className="font-medium text-stone-900">{exam.title || `Bi kim tra #${exam.id}`}</p>
                    <p className="text-sm text-stone-500">{formatExamMeta(exam)}</p>
                  </div>
                  <button onClick={() => goToExam(exam.id)} className="btn btn-primary">
                    Làm bài
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {videoSource.type === "video" ? (
          <video
            src={videoSource.url}
            controls
            className="aspect-video w-full rounded-xl bg-black"
            onTimeUpdate={handleVideoProgress}
            onEnded={handleVideoEnded}
          />
        ) : videoSource.type === "youtube" ? (
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
            <iframe
              src={videoSource.url}
              title={current?.title || "Lesson video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full border-0"
            />
          </div>
        ) : (
          <div className="aspect-video rounded-xl bg-gradient-to-br from-primary-200 to-primary-100 flex items-center justify-center text-stone-500">
            Chưa có video cho bài học này
          </div>
        )}\r\n        <div className="mt-4">
          <ContentTabs active={tab} setActive={setTab} />
          <div className="mt-4 text-sm text-stone-700">
            {tab === "video" && <p>Nội dung tóm tắt bài học, ghi chú quan trọng và liên kết hữu ích.</p>}
            {tab === "notes" && (
              <div className="space-y-3">
                <textarea className="input border-stone-300 w-full h-32" placeholder="Ghi chú của bạn..." />
                <div className="text-right">
                  <button className="btn btn-primary">Lu ghi ch</button>
                </div>
              </div>
            )}
            {tab === "resources" && (
              <ul className="list-disc pl-5 space-y-1">
                <li>Tài liệu tham kho</li>
                <li>Lin kt hu ch</li>
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
          {videoSource.type !== "none" && !lessonCompleted && !videoUnlocked && (
            <div className="flex flex-col gap-1 text-xs text-stone-500">
              <span>Hãy xem hết video để mở bài tiếp theo.</span>
              {videoSource.type === "youtube" && (
                <button onClick={handleManualComplete} className="btn btn-xs border-stone-300 text-stone-600">
                  nh du  xem
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 text-sm text-stone-600">
          Tiến độ khóa học: {completedLessons}/{totalLessons} bài
        </div>
      </div>

      <LessonSidebar
        modules={modules}
        activeLessonId={current?.id}
        completedLessonIds={completedLessonIds}
        onSelect={handleSelectLesson}
      />
    </div>
  );
}













