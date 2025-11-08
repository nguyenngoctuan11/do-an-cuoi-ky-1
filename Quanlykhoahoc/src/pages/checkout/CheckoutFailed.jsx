/* eslint-disable */
export default function CheckoutFailed(){
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <h2 className="text-2xl font-bold text-red-600">Thanh toán thất bại</h2>
      <p className="mt-2 text-stone-600">Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại hoặc chọn phương thức khác.</p>
      <a href="/" className="inline-block mt-6 px-4 py-2 border border-stone-300 rounded-lg">Về trang chủ</a>
    </div>
  );
}

