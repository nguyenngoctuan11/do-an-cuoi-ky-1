import React from "react";
import { Link } from "react-router-dom";
import SectionHeading from "../components/SectionHeading";
import CoursesByLevel from "./courses/CoursesByLevel";

function Hero() {
  return (
    <section className="bg-soft">
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-3 py-1 text-xs text-primary-700">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-600" />
            Học lập trình hiệu quả, có lộ trình
          </div>
          <h1 className="mt-4 text-4xl md:text-5xl font-extrabold leading-tight text-stone-900">
            Nâng cấp sự nghiệp với khoá học thực chiến
          </h1>
          <p className="mt-4 text-stone-600 text-lg">
            Lộ trình rõ ràng, mentor tận tâm, dự án thực tế. Cùng bạn vững nền tảng và bứt phá.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link to="/learn/fullstack" className="btn btn-primary px-6 py-3">Bắt đầu học ngay</Link>
            <a href="#courses" className="btn px-6 py-3 border-stone-300 hover:border-stone-400">Xem khoá học</a>
          </div>
          <div className="mt-8 flex items-center gap-6 text-sm text-stone-600">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-primary-200 border border-white" />
              <div className="w-8 h-8 rounded-full bg-primary-300 border border-white" />
              <div className="w-8 h-8 rounded-full bg-primary-400 border border-white" />
            </div>
            <span>50k+ học viên đã tin tưởng</span>
          </div>
        </div>
        <div className="relative">
          <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary-600 to-primary-400 shadow-2xl" />
          <div className="absolute -bottom-6 -left-6 bg-white border border-stone-200 rounded-xl p-4 shadow-lg">
            <div className="text-sm text-stone-600">Tiến độ hôm nay</div>
            <div className="mt-2 w-64 h-2 bg-stone-200 rounded-full">
              <div className="h-2 w-2/3 bg-primary-600 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Trusted() {
  const logos = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta"];
  return (
    <section className="border-y border-stone-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center text-stone-500 text-sm">Được tin dùng bởi</div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 opacity-80">
          {logos.map((l) => (
            <div key={l} className="h-10 bg-stone-100 rounded-md grid place-items-center text-stone-400 text-xs uppercase tracking-widest">
              {l}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    {
      title: "Lộ trình rõ ràng",
      desc: "Từng bước từ cơ bản đến nâng cao, phù hợp nhiều cấp độ.",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      ),
    },
    {
      title: "Mentor đồng hành",
      desc: "Giải đáp nhanh, review bài tập và định hướng nghề nghiệp.",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 12c2.761 0 5-2.239 5-5S14.761 2 12 2 7 4.239 7 7s2.239 5 5 5Zm0 2c-4.418 0-8 2.239-8 5v3h16v-3c0-2.761-3.582-5-8-5Z" />
        </svg>
      ),
    },
    {
      title: "Dự án thực tế",
      desc: "Xây portfolio chất lượng với case study bám sát doanh nghiệp.",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 7h18v13H3z" /><path d="M8 7V4h8v3" />
        </svg>
      ),
    },
  ];
  return (
    <section id="features" className="bg-white">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <SectionHeading
          eyebrow="Vì sao chọn chúng tôi"
          title="Trải nghiệm học tập thiết kế cho người đi làm"
          subtitle="Tập trung vào thực hành, phản hồi nhanh và kết quả đo lường được."
          center
        />
        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {items.map((f) => (
            <div key={f.title} className="rounded-2xl border border-stone-200 p-6 hover:shadow-sm transition">
              <div className="w-10 h-10 rounded-md bg-primary-50 grid place-items-center">{f.icon}</div>
              <h3 className="mt-4 font-semibold text-stone-900">{f.title}</h3>
              <p className="mt-2 text-stone-600 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Courses() {
  const courses = Array.from({ length: 6 }).map((_, i) => ({
    id: i + 1,
    title: `Khoá học Fullstack #${i + 1}`,
    level: i % 2 ? "Trung cấp" : "Cơ bản",
    time: `${8 + i} tuần`,
  }));
  return (
    <section id="courses" className="bg-stone-50">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <SectionHeading
          eyebrow="Khoá học nổi bật"
          title="Lộ trình thực chiến cho mọi cấp độ"
          subtitle="Học theo dự án, cập nhật công nghệ mới, mentor sát sao."
          center
        />
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((c) => (
            <div key={c.id} className="group rounded-2xl overflow-hidden border border-stone-200 bg-white hover:shadow-md transition">
              <div className="aspect-video bg-gradient-to-br from-primary-200 to-primary-100" />
              <div className="p-4">
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">{c.level}</span>
                  <span className="text-stone-500">•</span>
                  <span className="text-stone-600">{c.time}</span>
                </div>
                <h3 className="mt-2 font-semibold text-stone-900 group-hover:text-primary-700">{c.title}</h3>
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-stone-600">120 bài học</div>
                  <button className="btn btn-primary">Xem chi tiết</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    {
      name: "Minh Anh",
      role: "Front-end Dev",
      text: "Lộ trình rõ ràng, mentor hỗ trợ nhanh. Sau 3 tháng mình đã có job đầu tiên.",
    },
    {
      name: "Quang Huy",
      role: "Fullstack Dev",
      text: "Bài tập thực tế, bám sát công việc. Portfolio sau khoá học giúp mình nổi bật khi phỏng vấn.",
    },
  ];
  return (
    <section id="testimonials" className="bg-white">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <SectionHeading
          eyebrow="Học viên nói gì"
          title="Kết quả là thước đo quan trọng nhất"
          subtitle="Chúng tôi tự hào về những chuyển đổi nghề nghiệp của học viên."
          center
        />
        <div className="mt-10 grid md:grid-cols-2 gap-6">
          {items.map((t) => (
            <div key={t.name} className="rounded-2xl border border-stone-200 p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-200" />
                <div>
                  <div className="font-semibold text-stone-900">{t.name}</div>
                  <div className="text-sm text-stone-600">{t.role}</div>
                </div>
              </div>
              <p className="mt-4 text-stone-700 leading-relaxed">“{t.text}”</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBanner() {
  return (
    <section className="py-14">
      <div className="max-w-7xl mx-auto px-4">
        <div className="rounded-2xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-700 to-primary-500 opacity-95" />
          <div className="relative p-8 md:p-12 text-white grid md:grid-cols-2 gap-6 items-center">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold">Sẵn sàng bứt phá sự nghiệp?</h3>
              <p className="mt-2 text-white/90">Tham gia ngay hôm nay để nhận tư vấn lộ trình miễn phí.</p>
            </div>
            <div className="flex md:justify-end">
              <Link to="/register" className="btn bg-white text-primary-700 border-white hover:bg-stone-50">Đăng ký ngay</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 py-10 grid md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary-600 text-white grid place-items-center font-bold">FS</div>
            <span className="font-semibold text-stone-900">Your LMS</span>
          </div>
          <p className="mt-3 text-stone-600">Hệ thống học lập trình định hướng thực chiến.</p>
        </div>
        <div>
          <div className="font-semibold text-stone-900">Sản phẩm</div>
          <ul className="mt-3 space-y-2 text-stone-600">
            <li><a href="#courses">Khoá học</a></li>
            <li><a href="#features">Tính năng</a></li>
            <li><a href="#testimonials">Đánh giá</a></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-stone-900">Tài nguyên</div>
          <ul className="mt-3 space-y-2 text-stone-600">
            <li><a href="#blog">Blog</a></li>
            <li><a href="#">Hướng dẫn</a></li>
            <li><a href="#">FAQ</a></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-stone-900">Liên hệ</div>
          <ul className="mt-3 space-y-2 text-stone-600">
            <li>support@example.com</li>
            <li>0123 456 789</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-200 py-4 text-center text-xs text-stone-500">
        © {new Date().getFullYear()} Your LMS. All rights reserved.
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Ẩn mục "Bảng giá" trên thanh menu (ẩn theo href phổ biến) */}
      <style>{`
        a[href="/pricing"], a[href="/bang-gia"], a[data-nav="pricing"] {
          display: none !important;
        }
      `}</style>
      <Hero />
      <Trusted />
      <Features />
      {/* Danh sách khóa học thật, sắp xếp theo cấp độ */}
      <section id="courses" className="bg-stone-50">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <SectionHeading
            eyebrow="Khoá học theo cấp độ"
            title="Lộ trình thực chiến cho mọi cấp độ"
            subtitle="Tự động lấy dữ liệu từ backend và sắp xếp theo level."
            center
          />
          <div className="mt-10">
            <CoursesByLevel />
          </div>
        </div>
      </section>
      <Testimonials />
      <CtaBanner />
    </div>
  );
}
