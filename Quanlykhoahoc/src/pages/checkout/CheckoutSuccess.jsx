/* eslint-disable */
import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../api/httpClient";

export default function CheckoutSuccess() {
  const API = API_BASE_URL;
  const [status, setStatus] = useState("pending");
  const [message, setMessage] = useState("Đang xác nhận và kích hoạt khóa học của bạn...");

  const token = useMemo(() => {
    try {
      return localStorage.getItem("token");
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const pendingCourseId = sessionStorage.getItem("checkout:pendingCourseId");
    if (!pendingCourseId) {
      setStatus("missing");
      setMessage("Không tìm thấy khóa học vừa thanh toán. Vui lòng vào \"Khóa học của tôi\" để kiểm tra.");
      return;
    }
    if (!token) {
      setStatus("auth");
      setMessage("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để kích hoạt khóa học.");
      return;
    }
    const enroll = async () => {
      try {
        const res = await fetch(`${API}/api/courses/${pendingCourseId}/enroll`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Enroll failed");
        setStatus("done");
        setMessage("Đã kích hoạt khóa học. Bạn có thể vào Trang sinh viên để tiếp tục học ngay.");
      } catch {
        setStatus("error");
        setMessage("Không thể kích hoạt khóa học tự động. Vui lòng thử lại hoặc liên hệ hỗ trợ.");
      } finally {
        sessionStorage.removeItem("checkout:pendingCourseId");
        sessionStorage.removeItem("checkout:pendingCourseSlug");
      }
    };
    enroll();
  }, [API, token]);

  const statusBadge = {
    pending: "text-amber-600",
    done: "text-green-600",
    missing: "text-amber-600",
    auth: "text-red-600",
    error: "text-red-600",
  }[status];

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <h2 className={`text-2xl font-bold ${statusBadge || "text-green-600"}`}>Thanh toán thành công</h2>
      <p className="mt-2 text-stone-600">{message}</p>
      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <a href="/student" className="inline-block px-4 py-2 rounded-lg border border-primary-200 text-primary-700">
          Trang sinh viên
        </a>
        <a href="/" className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg">
          Về trang chủ
        </a>
      </div>
    </div>
  );
}

