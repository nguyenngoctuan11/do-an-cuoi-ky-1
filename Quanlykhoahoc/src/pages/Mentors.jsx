/* eslint-disable */
import { useEffect, useMemo, useState } from "react";
import SectionHeading from "../components/SectionHeading";

const API_BASE = process.env.REACT_APP_API_BASE || "";

function resolveAvatar(u){
  if(!u) return null;
  let s = String(u).trim().replace(/\\/g,'/');
  if(/^https?:\/\//i.test(s) || s.startsWith('data:')) return s;
  if(!s.startsWith('/')) s = '/' + s;
  return (API_BASE || '') + s;
}

export default function Mentors() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ (async()=>{
    setLoading(true);
    const endpoints = [
      '/api/public/mentors',
      '/api/public/teachers',
      '/api/public/users?role=TEACHER',
      '/api/public/users?role=MENTOR',
    ];
    let list = [];
    for(const ep of endpoints){
      try{
        const r = await fetch(API_BASE + ep, { headers:{ Accept:'application/json' }});
        if(!r.ok) continue;
        const data = await r.json();
        if(Array.isArray(data)){
          list = data.map(x=>({
            id: x.id ?? x.user_id ?? x.teacher_id,
            name: x.fullName ?? x.full_name ?? x.name ?? x.display_name ?? x.username,
            title: x.title ?? x.headline ?? x.position ?? (x.role ? String(x.role).toUpperCase() : ''),
            avatar: resolveAvatar(x.avatar_url ?? x.avatar ?? x.photo_url ?? x.image_url ?? x.image),
            bio: x.bio ?? x.about ?? x.summary ?? ''
          }));
          break;
        }
      }catch(e){}
    }
    setRows(list);
    setLoading(false);
  })(); },[]);

  const filtered = useMemo(()=>{
    if(!q) return rows;
    const s = q.toLowerCase();
    return rows.filter(r => (r.name||'').toLowerCase().includes(s) || (r.title||'').toLowerCase().includes(s));
  },[rows,q]);

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <SectionHeading
          eyebrow="Đội ngũ"
          title="Mentor đồng hành"
          subtitle="Chuyên gia nhiều năm kinh nghiệm tại doanh nghiệp"
          center
        />

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="text-stone-500 text-sm">{filtered.length} mentor</div>
          <input
            placeholder="Tìm mentor theo tên/chức danh..."
            value={q}
            onChange={e=>setQ(e.target.value)}
            className="w-72 max-w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none"
          />
        </div>

        {loading ? (
          <div className="mt-10">Đang tải danh sách mentor…</div>
        ) : (
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filtered.map(m => (
              <div key={m.id} className="rounded-2xl border border-stone-200 p-5 flex items-center gap-4 hover:shadow-sm transition">
                {m.avatar ? (
                  <img src={m.avatar} alt={m.name} className="w-16 h-16 rounded-full object-cover border border-stone-200" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-stone-200" />
                )}
                <div>
                  <div className="font-semibold text-stone-900">{m.name || 'Mentor'}</div>
                  <div className="text-sm text-stone-600">{m.title || 'Mentor'}</div>
                  {m.bio && <div className="text-xs text-stone-500 mt-1 line-clamp-2">{m.bio}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

