import React, { useEffect, useState } from "react";
import SectionHeading from "../components/SectionHeading";

function CourseCard({ id, slug, title, level, lessons, image, price, onEnroll }) {
  return (
    <div className="group rounded-2xl overflow-hidden border border-stone-200 bg-white hover:shadow-md transition block">
      <a href={`/learn/${slug || id}?from=courses`}>
        {image ? (
          <img src={image} alt={title} className="aspect-video w-full object-cover" />
        ) : (
          <div className="aspect-video bg-gradient-to-br from-primary-200 to-primary-100" />
        )}
      </a>
      <div className="p-4">
        <div className="flex items-center gap-2 text-xs">
          {level && (
            <span className="px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">{level}</span>
          )}
          <span className="ml-auto text-sm font-medium text-stone-900">{price != null ? `${price} đ` : 'Miễn phí'}</span>
        </div>
        <h3 className="mt-2 font-semibold text-stone-900 group-hover:text-primary-700">{title}</h3>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-stone-600">{lessons} bài học</div>
          <div className="flex items-center gap-2">
            <a href={`/learn/${slug || id}?from=courses`} className="btn btn-primary">Xem chi tiết</a>
            <button className="btn" onClick={onEnroll}>Đăng ký</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Courses() {
  const [courses, setCourses] = useState([]);
  useEffect(() => {
    const API = process.env.REACT_APP_API_BASE || "http://localhost:8081";
    const asset = (u) => (u && u.startsWith("/")) ? `${API}${u}` : u;
    fetch(`${API}/api/public/courses-sql?status=published&limit=12`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // map thumbnail to absolute URL when needed
          setCourses(data.map((c) => ({ ...c, thumbnail_url: asset(c.thumbnail_url) })));
        }
        else setCourses([]);
      })
      .catch((e) => {
        console.error("Load courses failed", e);
        setCourses([]);
      });
  }, []);
  const enroll = async (courseId) => {
    const token = localStorage.getItem('token');
    if(!token){ window.location.href = '/login'; return; }
    const API = process.env.REACT_APP_API_BASE || "http://localhost:8081";
    try{
      const r = await fetch(`${API}/api/courses/${courseId}/enroll`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` } });
      const t = await r.text(); let d; try{ d=t? JSON.parse(t): null;}catch{ d=null; }
      if(!r.ok){ alert((d&&d.message)||r.statusText); return; }
      alert('Đăng ký thành công');
    }catch(e){ alert('Lỗi đăng ký: ' + (e.message||e)); }
  };
  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <SectionHeading
          eyebrow="Khoá học"
          title="Danh sách khóa học"
          subtitle="Chọn lộ trình phù hợp với mục tiêu của bạn"
          center
        />
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((c) => (
            <CourseCard
              key={c.id}
              id={c.id}
              slug={c.slug}
              title={c.title}
              level={c.level}
              lessons={c.lessons_count ?? 0}
              image={c.thumbnail_url}
              price={c.price}
              onEnroll={() => enroll(c.id)}
            />
          ))}
          {courses.length === 0 && (
            <div className="col-span-full text-center text-stone-500">Chưa có khóa học.</div>
          )}
        </div>
      </div>
    </div>
  );
}

