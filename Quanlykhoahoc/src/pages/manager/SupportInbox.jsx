import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  managerAssignThread,
  managerChangeStatus,
  managerFetchThread,
  managerListThreads,
  managerSendMessage,
  managerTransferThread,
} from "../../services/support";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../api/httpClient";

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả" },
  { value: "NEW", label: "Chưa nhận" },
  { value: "IN_PROGRESS", label: "Đang xử lý" },
  { value: "WAITING_STUDENT", label: "Chờ học viên" },
  { value: "CLOSED", label: "Đã đóng" },
];

const STATUS_BADGE = {
  NEW: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-sky-100 text-sky-700",
  WAITING_STUDENT: "bg-purple-100 text-purple-700",
  CLOSED: "bg-stone-200 text-stone-600",
};

export default function SupportInbox() {
  const { user, initialised, isAuthenticated } = useAuth();
  const [filters, setFilters] = useState({ status: "ALL", keyword: "", mineOnly: false });
  const [threads, setThreads] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [selectedThread, setSelectedThread] = useState(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [transferId, setTransferId] = useState("");
  const [error, setError] = useState("");
  const [alerts, setAlerts] = useState([]);

  const isManager = useMemo(
    () => Boolean(user?.roles?.some((role) => role?.toLowerCase() === "manager")),
    [user],
  );

  const metrics = useMemo(() => {
    const mine = threads.filter((thread) => thread.manager?.id === user?.id).length;
    return {
      total: meta.total || threads.length,
      inProgress: threads.filter((t) => t.status === "IN_PROGRESS").length,
      waiting: threads.filter((t) => t.status === "WAITING_STUDENT").length,
      mine,
    };
  }, [threads, meta, user]);

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" }).format(new Date()),
    [],
  );
  const welcomeName = useMemo(() => {
    if (!user?.fullName) return "quản lý";
    const parts = user.fullName.trim().split(/\s+/);
    return parts[parts.length - 1] || user.fullName;
  }, [user?.fullName]);

  const buildParams = useCallback(() => {
    const params = { page: 0, size: 40 };
    if (filters.status !== "ALL") params.status = filters.status;
    if (filters.keyword.trim()) params.studentKeyword = filters.keyword.trim();
    if (filters.mineOnly) params.mineOnly = true;
    return params;
  }, [filters]);

  const loadThreads = useCallback(async () => {
    if (!isAuthenticated || !isManager) return;
    setLoadingThreads(true);
    setError("");
    try {
      const { data } = await managerListThreads(buildParams());
      const list = Array.isArray(data?.data) ? data.data : [];
      setThreads(list);
      setMeta({ total: data?.totalElements ?? list.length });
    } catch (err) {
      setError(err?.response?.data?.message || "Không thể tải danh sách hội thoại.");
    } finally {
      setLoadingThreads(false);
    }
  }, [buildParams, isAuthenticated, isManager]);

  const loadThreadsRef = useRef(loadThreads);
  useEffect(() => {
    loadThreadsRef.current = loadThreads;
  }, [loadThreads]);

  const openThread = useCallback(
    async (threadId) => {
      if (!threadId || !isAuthenticated || !isManager) return;
      setLoadingThread(true);
      setError("");
      try {
        const { data } = await managerFetchThread(threadId);
        setSelectedThread(data);
      } catch (err) {
        setError(err?.response?.data?.message || "Không thể tải hội thoại.");
      } finally {
        setLoadingThread(false);
      }
    },
    [isAuthenticated, isManager],
  );

  useEffect(() => {
    if (!initialised || !isAuthenticated || !isManager) return;
    loadThreads();
  }, [initialised, isAuthenticated, isManager, loadThreads]);

  const pushAlert = useCallback((payload) => {
    const key = `${payload.id || "alert"}-${Date.now()}`;
    setAlerts((prev) => [...prev, { ...payload, key }]);
    setTimeout(() => {
      setAlerts((prev) => prev.filter((item) => item.key !== key));
    }, 6000);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !isManager) return undefined;
    const protocol = API_BASE_URL.startsWith("https") ? "wss" : "ws";
    const endpoint = `${API_BASE_URL.replace(/^https?/, protocol)}/ws-support`;
    let buffer = "";
    const socket = new WebSocket(endpoint);

    const sendFrame = (frame) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(frame);
      }
    };

    const handleFrame = (raw) => {
      const frame = parseStompFrame(raw);
      if (!frame) return;
      if (frame.command === "CONNECTED") {
        sendFrame("SUBSCRIBE\nid:manager-alerts\ndestination:/topic/support/manager-alerts\n\n\0");
        return;
      }
      if (frame.command !== "MESSAGE" || !frame.body) return;
      try {
        const payload = JSON.parse(frame.body);
        pushAlert({
          id: payload.id,
          title: payload.student?.fullName || "Học viên mới",
          subtitle: payload.courseTitle || payload.topic || "Yêu cầu hỗ trợ mới",
        });
        loadThreadsRef.current?.();
      } catch (err) {
        console.warn("Không thể parse thông báo mới", err);
      }
    };

    const onMessage = (event) => {
      if (typeof event.data !== "string") return;
      buffer += event.data;
      let frameEnd = buffer.indexOf("\0");
      while (frameEnd !== -1) {
        const frame = buffer.slice(0, frameEnd);
        buffer = buffer.slice(frameEnd + 1);
        if (frame.trim()) {
          handleFrame(frame);
        }
        frameEnd = buffer.indexOf("\0");
      }
    };

    socket.addEventListener("open", () => {
      sendFrame("CONNECT\naccept-version:1.2,1.1,1.0\nheart-beat:0,0\n\n\0");
    });
    socket.addEventListener("message", onMessage);
    socket.addEventListener("error", (event) => {
      console.error("Support socket error", event);
    });

    return () => {
      try {
        sendFrame("DISCONNECT\n\n\0");
      } catch {
        // ignore
      }
      socket.removeEventListener("message", onMessage);
      socket.close();
    };
  }, [isAuthenticated, isManager, pushAlert]);

  const handleAssign = async () => {
    if (!selectedThread?.id) return;
    try {
      await managerAssignThread(selectedThread.id);
      await Promise.all([openThread(selectedThread.id), loadThreads()]);
    } catch (err) {
      setError(err?.response?.data?.message || "Không thể nhận xử lý hội thoại.");
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!selectedThread?.id || !messageText.trim()) return;
    setSending(true);
    try {
      const { data } = await managerSendMessage(selectedThread.id, { content: messageText.trim() });
      setSelectedThread((prev) =>
        prev
          ? {
              ...prev,
              messages: [...(prev.messages || []), data],
              lastMessagePreview: data.content,
              lastMessageAt: data.createdAt,
            }
          : prev,
      );
      setMessageText("");
      await loadThreads();
    } catch (err) {
      setError(err?.response?.data?.message || "Không thể gửi tin nhắn.");
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (status) => {
    if (!selectedThread?.id) return;
    try {
      await managerChangeStatus(selectedThread.id, { status });
      await Promise.all([openThread(selectedThread.id), loadThreads()]);
    } catch (err) {
      setError(err?.response?.data?.message || "Không thể cập nhật trạng thái.");
    }
  };

  const handleTransfer = async () => {
    if (!selectedThread?.id || !transferId.trim()) return;
    const newManagerId = Number(transferId);
    if (!Number.isFinite(newManagerId)) {
      setError("ID quản lý không hợp lệ.");
      return;
    }
    try {
      await managerTransferThread(selectedThread.id, { newManagerId });
      setTransferId("");
      await Promise.all([openThread(selectedThread.id), loadThreads()]);
    } catch (err) {
      setError(err?.response?.data?.message || "Không thể chuyển hội thoại.");
    }
  };

  if (!initialised) {
    return <div className="max-w-6xl mx-auto px-4 py-10 text-sm text-stone-500">Đang tải...</div>;
  }

  if (!isAuthenticated || !isManager) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-xl font-semibold text-stone-800">Bạn cần quyền manager để truy cập trang này.</p>
      </div>
    );
  }

  return (
    <>
      {alerts.length > 0 && (
        <div className="fixed bottom-6 left-6 z-40 flex flex-col gap-3">
          {alerts.map((alert) => (
            <div
              key={alert.key}
              className="w-64 rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-2xl shadow-primary-900/20 backdrop-blur"
            >
              <p className="text-sm font-semibold text-stone-900">{alert.title}</p>
              <p className="text-xs text-stone-500">{alert.subtitle}</p>
            </div>
          ))}
        </div>
      )}

      <div className="min-h-screen bg-soft pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pt-10">
          <header className="rounded-[32px] border border-white/40 bg-gradient-to-r from-sky-500 via-primary-600 to-rose-500 text-white px-8 py-8 shadow-2xl shadow-primary-900/30">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.5em] text-white/70">Manager Console</p>
                <h1 className="text-3xl font-semibold">Trung tâm hỗ trợ học viên</h1>
                <p className="text-sm text-white/80">
                  Xin chào {welcomeName}, hôm nay là {todayLabel}. Hãy đồng hành cùng học viên trong mọi cuộc trò chuyện.
                </p>
              </div>
              <FilterSelect filters={filters} setFilters={setFilters} loadThreads={loadThreads} />
            </div>
          </header>

          {error && (
            <div className="rounded-2xl border border-red-200/70 bg-red-50/90 px-4 py-3 text-sm text-red-700 shadow-sm">{error}</div>
          )}

          <StatsRow metrics={metrics} />

          <section className="grid gap-6 lg:grid-cols-[360px,1fr]">
            <ThreadColumn
              threads={threads}
              selectedThread={selectedThread}
              onSelect={openThread}
              loading={loadingThreads}
              filters={filters}
              setFilters={setFilters}
              loadThreads={loadThreads}
            />

            <ChatColumn
              selectedThread={selectedThread}
              loadingThread={loadingThread}
              messageText={messageText}
              setMessageText={setMessageText}
              sending={sending}
              handleSendMessage={handleSendMessage}
              handleAssign={handleAssign}
              handleStatusChange={handleStatusChange}
              handleTransfer={handleTransfer}
              transferId={transferId}
              setTransferId={setTransferId}
            />
          </section>
        </div>
      </div>
    </>
  );
}

function FilterSelect({ filters, setFilters, loadThreads }) {
  return (
    <div className="flex w-full flex-col gap-3 text-sm md:flex-row md:items-end">
      <div className="flex flex-1 flex-col gap-1 text-xs uppercase tracking-wide text-white/80">
        <span>Trạng thái</span>
        <select
          className="rounded-2xl border border-white/30 bg-white/15 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/60"
          value={filters.status}
          onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-1 flex-col gap-1 text-xs text-white/80">
        <span>Từ khóa</span>
        <div className="relative">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="m16 16 4 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder="Tìm học viên / khóa học..."
            className="w-full rounded-2xl border border-white/30 bg-white/15 px-10 py-2 text-sm placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/60"
            value={filters.keyword}
            onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-white/80">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="rounded border-white/70 text-white focus:ring-white"
            checked={filters.mineOnly}
            onChange={(e) => setFilters((prev) => ({ ...prev, mineOnly: e.target.checked }))}
          />
          Chỉ hội thoại của tôi
        </label>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-2xl bg-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/30 transition"
          onClick={loadThreads}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4v6h6M20 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 19A9 9 0 0 0 19 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Làm mới
        </button>
      </div>
    </div>
  );
}

function StatsRow({ metrics }) {
  const items = [
    {
      label: "Tổng yêu cầu",
      value: metrics.total || 0,
      hint: "Đang mở trên toàn hệ thống",
      accent: "from-sky-500 to-blue-500",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "Đang xử lý",
      value: metrics.inProgress,
      hint: "Cần phản hồi sớm",
      accent: "from-amber-500 to-orange-500",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      ),
    },
    {
      label: "Chờ học viên",
      value: metrics.waiting,
      hint: "Đang chờ phản hồi",
      accent: "from-purple-500 to-fuchsia-500",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 6a6 6 0 0 1 5.7 7.8l2.3 4.2H4l2.3-4.2A6 6 0 0 1 12 6Z" />
        </svg>
      ),
    },
    {
      label: "Phụ trách của tôi",
      value: metrics.mine,
      hint: "Bạn đang theo dõi",
      accent: "from-emerald-500 to-lime-500",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
          <path d="M5 21a7 7 0 0 1 14 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-3xl border border-white/80 bg-white/80 px-5 py-4 shadow-lg shadow-primary-900/5 backdrop-blur"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-stone-500">{item.label}</p>
              <span className="mt-2 block text-3xl font-semibold text-stone-900">{item.value}</span>
            </div>
            <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${item.accent} text-white`}>
              {item.icon}
            </div>
          </div>
          {item.hint && <p className="mt-2 text-xs text-stone-500">{item.hint}</p>}
        </div>
      ))}
    </div>
  );
}

function ThreadColumn({ threads, selectedThread, onSelect, loading, filters, setFilters, loadThreads }) {
  return (
    <div className="space-y-4">
      <div className="rounded-[32px] border border-white/80 bg-white/85 shadow-xl shadow-primary-900/5 backdrop-blur">
        <div className="space-y-4 border-b border-stone-100/80 px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-stone-900">Danh sách hội thoại</p>
            <p className="text-xs text-stone-500">Chọn một hội thoại để xem chi tiết và phản hồi.</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="relative">
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
                <path d="m16 16 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                placeholder="Tìm nhanh..."
                className="w-full rounded-2xl border border-stone-200 bg-white px-10 py-2 text-sm focus:border-primary-200 focus:ring-2 focus:ring-primary-100"
                value={filters.keyword}
                onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    loadThreads();
                  }
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-stone-500">
              {STATUS_OPTIONS.filter((opt) => opt.value !== "ALL").map((opt) => {
                const active = filters.status === opt.value;
                return (
                  <button
                    type="button"
                    key={opt.value}
                    className={`rounded-full border px-3 py-1 transition ${
                      active
                        ? "border-primary-200 bg-primary-50 text-primary-700 shadow-sm"
                        : "border-stone-200 bg-white hover:border-primary-100 hover:text-primary-600"
                    }`}
                    onClick={() => {
                      setFilters((prev) => ({ ...prev, status: opt.value }));
                      setTimeout(() => loadThreads(), 0);
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="max-h-[540px] overflow-y-auto px-2 py-4">
          {loading && <p className="px-4 py-2 text-sm text-stone-500">Đang tải danh sách...</p>}
          {!loading && threads.length === 0 && (
            <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-400">
              Chưa có yêu cầu nào phù hợp bộ lọc.
            </div>
          )}
          <ul className="flex flex-col gap-2">
            {threads.map((thread) => {
              const active = selectedThread?.id === thread.id;
              return (
                <li key={thread.id}>
                  <button
                    type="button"
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-primary-200 bg-gradient-to-r from-primary-50 to-white shadow-sm shadow-primary-100/60"
                        : "border-stone-100 bg-white hover:border-primary-100 hover:shadow-sm"
                    }`}
                    onClick={() => onSelect(thread.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-semibold text-stone-900 truncate">
                          {thread.student?.fullName || "Học viên ẩn danh"}
                        </p>
                        <p className="text-xs text-stone-500 truncate">
                          {(thread.courseTitle && `${thread.courseTitle} · `) || ""}
                          {thread.topic}
                        </p>
                        <p className="text-[11px] text-stone-400 truncate">
                          {thread.lastMessagePreview || "Chưa có tin nhắn"}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full ${STATUS_BADGE[thread.status] || STATUS_BADGE.NEW}`}
                      >
                        {statusLabel(thread.status)}
                      </span>
                    </div>
                    {thread.unreadForManager && (
                      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600">
                        <span className="h-2 w-2 rounded-full bg-primary-500" />
                        Tin nhắn mới
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ChatColumn({
  selectedThread,
  loadingThread,
  messageText,
  setMessageText,
  sending,
  handleSendMessage,
  handleAssign,
  handleStatusChange,
  handleTransfer,
  transferId,
  setTransferId,
}) {
  return (
    <div className="rounded-[36px] border border-white/80 bg-white/95 shadow-2xl shadow-primary-900/10 backdrop-blur flex flex-col min-h-[640px]">
      {loadingThread && <p className="p-4 text-sm text-stone-500">Đang tải hội thoại...</p>}
      {!loadingThread && !selectedThread && (
        <div className="flex-1 grid place-items-center px-6 text-center text-sm text-stone-500">
          Chọn một hội thoại ở cột bên trái để bắt đầu trao đổi với học viên.
        </div>
      )}

      {selectedThread && !loadingThread && (
        <>
          <div className="rounded-t-[36px] border-b border-stone-100 bg-gradient-to-r from-white to-rose-50 px-6 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.4em] text-primary-600">Hội thoại #{selectedThread.id}</p>
                <h2 className="text-2xl font-semibold text-stone-900">{selectedThread.student?.fullName || "Học viên ẩn danh"}</h2>
                <div className="flex flex-wrap gap-2 text-xs">
                  {selectedThread.courseTitle && (
                    <span className="rounded-full bg-white/60 px-3 py-1 text-stone-600">{selectedThread.courseTitle}</span>
                  )}
                  <span className="rounded-full bg-primary-50 px-3 py-1 text-primary-700">{selectedThread.topic}</span>
                </div>
              </div>
              <div className="space-y-2 text-xs text-stone-500">
                <p>Phụ trách: {selectedThread.manager?.fullName || "Chưa gán"}</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="pill-btn" onClick={handleAssign}>
                    Nhận xử lý
                  </button>
                  <button type="button" className="pill-btn-muted" onClick={() => handleStatusChange("WAITING_STUDENT")}>
                    Chờ học viên
                  </button>
                  <button type="button" className="pill-btn-muted" onClick={() => handleStatusChange("CLOSED")}>
                    Đóng hội thoại
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-xs text-stone-500">
              <span className="font-semibold text-stone-700">Chuyển hội thoại</span>
              <input
                type="number"
                placeholder="ID manager"
                className="w-28 rounded-xl border border-stone-200 px-3 py-1 text-sm"
                value={transferId}
                onChange={(e) => setTransferId(e.target.value)}
              />
              <button type="button" className="text-primary-600 font-semibold" onClick={handleTransfer}>
                Xác nhận
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-primary-50/40 px-6 py-5 space-y-4">
            {(selectedThread.messages || []).map((message) => (
              <ThreadMessage key={message.id} message={message} />
            ))}
          </div>

          <form className="rounded-b-[36px] border-t border-stone-100 bg-white/90 px-6 py-5 space-y-3" onSubmit={handleSendMessage}>
            <textarea
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-200"
              rows={3}
              placeholder="Nhập phản hồi cho học viên..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
            <div className="flex items-center justify-between text-xs text-stone-500">
              {selectedThread.rating?.rating && (
                <span>Học viên đã đánh giá {selectedThread.rating.rating}/5⭐</span>
              )}
              <button
                type="submit"
                disabled={sending || !messageText.trim()}
                className="rounded-2xl bg-gradient-to-r from-primary-600 to-sky-500 px-6 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {sending ? "Đang gửi..." : "Gửi trả lời"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

function ThreadMessage({ message }) {
  const isManager = message.senderType === "manager";
  const isSystem = message.senderType === "system";
  const bubbleClass = isSystem
    ? "mx-auto bg-white border border-dashed border-stone-300 text-stone-600 text-center rounded-2xl text-xs"
    : isManager
      ? "bg-gradient-to-r from-primary-600 to-sky-500 text-white rounded-2xl rounded-br-sm shadow-lg shadow-primary-900/30"
      : "bg-white text-stone-800 rounded-2xl rounded-bl-sm border border-stone-100 shadow";
  const wrapper = isSystem ? "mx-auto text-center" : isManager ? "ml-auto text-right" : "";
  return (
    <div className={`max-w-[85%] ${wrapper}`}>
      <div className={`px-4 py-3 text-sm ${bubbleClass}`}>
        {!isSystem && (
          <p className="mb-1 text-[11px] uppercase tracking-wide opacity-70">
            {message.sender?.fullName || message.senderType}
          </p>
        )}
        <p className="whitespace-pre-line">{message.content}</p>
        {!!message.attachments?.length && (
          <div className="mt-2 space-y-2 text-left">
            {message.attachments.map((url) =>
              isImageAttachment(url) ? (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-xl border border-white/40 shadow"
                >
                  <img src={url} alt="Đính kèm" className="max-w-[220px]" />
                </a>
              ) : (
                <a key={url} href={url} target="_blank" rel="noreferrer" className="block text-xs underline">
                  Tải tệp đính kèm
                </a>
              ),
            )}
          </div>
        )}
        <p className={`mt-1 text-[10px] ${isManager ? "text-white/80" : "text-stone-400"}`}>
          {new Date(message.createdAt).toLocaleString("vi-VN")}
        </p>
      </div>
    </div>
  );
}

const IMAGE_EXT = /\.(png|jpe?g|gif|bmp|webp|svg)$/i;
const isImageAttachment = (url) => {
  if (!url) return false;
  return IMAGE_EXT.test(url);
};

function statusLabel(status) {
  switch (status) {
    case "IN_PROGRESS":
      return "Đang xử lý";
    case "WAITING_STUDENT":
      return "Chờ học viên";
    case "CLOSED":
      return "Đã đóng";
    case "NEW":
      return "Chưa nhận";
    default:
      return "Không rõ";
  }
}

function parseStompFrame(raw) {
  if (!raw) return null;
  const normalized = raw.replace(/\r/g, "");
  const lines = normalized.split("\n");
  const command = lines.shift();
  const emptyIndex = lines.indexOf("");
  const headerLines = emptyIndex >= 0 ? lines.slice(0, emptyIndex) : lines;
  const bodyLines = emptyIndex >= 0 ? lines.slice(emptyIndex + 1) : [];
  const headers = {};
  headerLines.forEach((line) => {
    if (!line) return;
    const [key, ...rest] = line.split(":");
    headers[key] = rest.join(":");
  });
  const body = bodyLines.join("\n");
  return { command, headers, body };
}
