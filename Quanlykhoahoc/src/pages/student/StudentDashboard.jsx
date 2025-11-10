import React, { useEffect, useState } from "react";

export default function StudentDashboard(){
  const API = process.env.REACT_APP_API_BASE || "http://localhost:8081";
  const [me, setMe] = useState(null);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");

  useEffect(()=>{
    const token = localStorage.getItem('token');
    if(!token){ window.location.href='/login'; return; }
    const headers = { 'Content-Type':'application/json', Authorization:`Bearer ${token}` };
    fetch(`${API}/api/student/me`, { headers }).then(r=>r.json()).then(setMe).catch(()=>{});
    fetch(`${API}/api/student/enrollments`, { headers })
      .then(r=>r.json())
      .then(setCourses)
      .catch(e=>setError(String(e)));
  },[API]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-stone-900">Trang sinh viên</h1>
      {me && (
        <div className="mt-4 border border-stone-200 rounded-xl p-4 bg-white">
          <div className="font-medium text-stone-900">Thông tin</div>
          <div className="text-sm text-stone-700 mt-2">Họ tên: {me.fullName}</div>
          <div className="text-sm text-stone-700">Email: {me.email}</div>
          <div className="text-sm text-stone-700">Vai trò: {(me.roles||[]).join(', ')}</div>
        </div>
      )}

      <div className="mt-8">
        <div className="font-medium text-stone-900 mb-3">Khóa học đã đăng ký</div>
        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
        {courses.length === 0 && (
          <div className="text-stone-500 text-sm">Bạn chưa đăng ký khóa học nào.</div>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(c => (
            <div key={c.courseId} className="rounded-xl overflow-hidden border border-stone-200 bg-white">
              <a href={`/learn/${c.slug || c.courseId}`}>
                {c.thumbnailUrl ? (
                  <img src={c.thumbnailUrl.startsWith('/')? `${API}${c.thumbnailUrl}`: c.thumbnailUrl} alt={c.title} className="aspect-video w-full object-cover" />
                ) : (<div className="aspect-video bg-stone-100" />)}
              </a>
              <div className="p-4">
                <div className="text-xs text-stone-500">{c.level} • {c.price!=null? `${c.price} đ`:'Miễn phí'}</div>
                <div className="font-semibold text-stone-900">{c.title}</div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-stone-500">{c.status}</span>
                  <a className="btn btn-primary" href={`/learn/${c.slug || c.courseId}`}>Tiếp tục học</a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

