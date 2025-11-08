import React from "react";

export default function BlogDetail() {
  return (
    <div className="bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-stone-900">Tiêu đề bài viết</h1>
        <div className="mt-2 text-sm text-stone-500">Đăng ngày 01/01/2025 • 8 phút đọc</div>
        <div className="mt-6 prose prose-stone max-w-none">
          <p>Đây là nội dung minh hoạ cho bài viết. Bạn có thể thay thế bằng dữ liệu thật từ API.</p>
          <h2>Mục 1</h2>
          <p>Nội dung chi tiết, hình ảnh, và ví dụ code.</p>
          <h2>Mục 2</h2>
          <p>Thực hành và tổng kết.</p>
        </div>
      </div>
    </div>
  );
}

