/* eslint-disable */
import { useEffect, useMemo, useState } from 'react';

const API_BASE = process.env.REACT_APP_API_BASE || '';

function resolveThumb(u){
  if(!u) return null;
  let s = String(u).trim();
  // Normalize Windows backslashes -> slashes
  s = s.replace(/\\/g, '/');
  // If already absolute (http/https or data URI), keep as-is
  if(/^https?:\/\//i.test(s) || s.startsWith('data:')) return s;
  // Ensure leading slash
  if(!s.startsWith('/')) s = '/' + s;
  return (API_BASE || '') + s;
}

function normalize(str){
  return (str||'').toString().normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim();
}
function levelOrder(lv){
  if(lv==null) return 99;
  const s = normalize(lv);
  if(/^\d+$/.test(s)) return parseInt(s,10);
  if(['co ban','beginner','basic','foundation'].includes(s)) return 1;
  if(['trung cap','intermediate','middle','medium'].includes(s)) return 2;
  if(['nang cao','advanced','expert'].includes(s)) return 3;
  return 50;
}
function levelLabel(lv){
  const o = levelOrder(lv);
  if(o===1) return 'Cơ bản';
  if(o===2) return 'Trung cấp';
  if(o===3) return 'Nâng cao';
  return (lv||'Khác');
}

export default function CoursesByLevel(){
  const [courses, setCourses] = useState([]);
  const [dir, setDir] = useState('asc');
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ (async()=>{
    setLoading(true);
    const endpoints = ['/api/public/courses','/api/public/courses-sql'];
    let list = [];
    for(const ep of endpoints){
      try{
        const res = await fetch(API_BASE+ep,{headers:{Accept:'application/json'}});
        if(!res.ok) continue;
        const data = await res.json();
        if(Array.isArray(data)){
          list = data.map(c=>({
            id: c.id ?? c.course_id,
            title: c.title ?? c.name ?? c.course_title,
            slug: c.slug ?? c.course_slug ?? c.code,
            level: c.level ?? c.level_name ?? c.difficulty,
            durationWeeks: c.duration_weeks ?? c.durationWeeks ?? c.weeks ?? null,
            lessons: c.lessons_count ?? c.lessonsCount ?? c.total_lessons ?? null,
            thumbnail: c.thumbnail_url ?? c.thumbnailUrl ?? c.thumbnail_path ?? c.thumbnailPath ?? c.image_url ?? c.imageUrl ?? c.cover_url ?? c.coverUrl ?? null
          }));
          break;
        }
      }catch(e){}
    }
    setCourses(list);
    setLoading(false);
  })(); },[]);

  const items = useMemo(()=>{
    const arr = [...courses];
    arr.sort((a,b)=>{
      const A = levelOrder(a.level), B = levelOrder(b.level);
      return dir==='asc' ? A-B : B-A;
    });
    return arr;
  },[courses,dir]);

  return (
    <div style={{maxWidth:1200, margin:'24px auto', padding:'0 16px'}}>
      <h1 style={{fontSize:28, margin:'8px 0 16px'}}>Lộ trình thực chiến cho mọi cấp độ</h1>
      <div style={{color:'#6b7280', marginBottom:20}}>Học theo dự án, cập nhật công nghệ mới, mentor sát sao.</div>

      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <label>Sắp xếp theo cấp độ:</label>
          <select value={dir} onChange={e=>setDir(e.target.value)} style={{padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8}}>
            <option value="asc">Từ thấp đến cao (Cơ bản → Nâng cao)</option>
            <option value="desc">Từ cao xuống thấp (Nâng cao → Cơ bản)</option>
          </select>
        </div>
        <div style={{color:'#6b7280'}}>{items.length} khóa học</div>
      </div>

      {loading ? <div>Đang tải…</div> : (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16}}>
          {items.map(it => {
            const thumbUrl = resolveThumb(it.thumbnail);
            return (
            <div key={it.id} style={{background:'#fff', border:'1px solid #e5e7eb', borderRadius:14, overflow:'hidden', display:'flex', flexDirection:'column'}}>
              <div style={{height:140, background: thumbUrl ? `url(${thumbUrl}) center/cover no-repeat` : 'linear-gradient(135deg,#e8d6c8,#d9c2b4)'}} />
              <div style={{padding:14}}>
                <div style={{display:'flex', gap:8, alignItems:'center', color:'#6b7280', fontSize:13, marginBottom:8}}>
                  <span style={{border:'1px solid #e5e7eb', padding:'2px 8px', borderRadius:999, background:'#fff', color:'#555'}}>{levelLabel(it.level)}</span>
                  {it.durationWeeks ? (<><span>•</span><span>{it.durationWeeks} tuần</span></>) : null}
                </div>
                <div style={{fontWeight:700, margin:'4px 0 8px'}}>{(it.title||'Khóa học')}</div>
                <div style={{color:'#6b7280'}}>{it.lessons ? `${it.lessons} bài học` : ' '}</div>
              </div>
              <div style={{display:'flex', justifyContent:'flex-end', padding:'12px 14px'}}>
                <a href={`/courses/${encodeURIComponent(it.slug||it.id)}`} style={{background:'#6b5b95', color:'#fff', padding:'8px 12px', borderRadius:10, textDecoration:'none'}}>Xem chi tiết</a>
              </div>
            </div>
          )})}
        </div>
      )}
    </div>
  );
}
