import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function CheckoutFailed() {
  const navigate = useNavigate();

  useEffect(() => {
    sessionStorage.removeItem("checkout:pendingCourseId");
    sessionStorage.removeItem("checkout:pendingCourseSlug");
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-red-600">Thanh toán thất bại</h1>
      <p className="mt-2 text-stone-600">
        Giao dịch của bạn chưa hoàn tất hoặc đã bị hủy. Vui lòng thử lại hoặc chọn phương thức thanh toán khác.
      </p>
      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg border border-primary-200 px-4 py-2 text-primary-700"
          onClick={() => navigate("/checkout")}
        >
          Thử thanh toán lại
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white"
          onClick={() => navigate("/contact")}
        >
          Liên hệ hỗ trợ
        </button>
      </div>
    </div>
  );
}
