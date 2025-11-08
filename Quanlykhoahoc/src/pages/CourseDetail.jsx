/* eslint-disable */
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import SectionHeading from "../components/SectionHeading";

const API_BASE = process.env.REACT_APP_API_BASE || "";

function normalize(str){
  return (str||"").toString().normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim();
}
function levelLabel(lv){
  const s = normalize(lv);
  if(["co ban","beginner","basic","foundation"].includes(s)) return "Cơ bản";
  if(["trung cap","intermediate","middle","medium"].includes(s)) return "Trung cấp";
  if(["nang cao","advanced","expert"].includes(s)) return "Nâng cao";
  return lv || "Khác";
}
function resolveThumb(u){
  if(!u) return null;
  let s = String(u).trim().replace(/\\/g,'/');
  if(/^https?:\/\//i.test(s) || s.startsWith('data:')) return s;
  if(!s.startsWith('/')) s = '/' + s;
  return (API_BASE || '') + s;
}

export default function CourseDetail() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(()=>{
    let alive = true;
    async function load(){
      setLoading(true); setError("");
      const paths = [
        `/api/public/courses/detail/${encodeURIComponent(slug)}`,
        `/api/public/courses/detail-sql/${encodeURIComponent(slug)}`,
        `/api/public/course/${encodeURIComponent(slug)}`,
      ];
      let found = null;
      for(const p of paths){
        try{
          const r = await fetch(API_BASE + p, { headers:{ Accept:'application/json' }});
          if(!r.ok) continue;
          const j = await r.json();
          if(j){ found = j; break; }
        }catch(e){}
      }
      // Fallback: get list and pick by slug
      if(!found){
        try{
          const r = await fetch(API_BASE + '/api/public/courses', { headers:{ Accept:'application/json' }});
          if(r.ok){
            const list = await r.json();
            if(Array.isArray(list)){
              const it = list.find(x => (x.slug||x.course_slug||x.code) === slug);
              if(it) found = it;
            }
          }
        }catch(e){}
      }
      if(alive){ setData(found); setLoading(false); if(!found) setError('Không tìm thấy khoá học'); }
    }
    if(slug) load();
    return ()=>{ alive=false; };
  },[slug]);

  const view = useMemo(()=>{
    const c = data || {};
    const title = c.title ?? c.name ?? c.course_title ?? slug;
    const desc = c.description ?? c.summary ?? c.short_desc ?? "";
    const level = c.level ?? c.level_name ?? c.difficulty ?? "";
    const durationWeeks = c.duration_weeks ?? c.durationWeeks ?? c.weeks ?? null;
    const image = resolveThumb(c.thumbnail_url ?? c.thumbnailUrl ?? c.thumbnail_path ?? c.thumbnailPath ?? c.image_url ?? c.imageUrl ?? c.cover_url ?? c.coverUrl ?? null);
    const modules = c.modules ?? c.chapters ?? [];
    return { title, desc, level, durationWeeks, image, modules };
  },[data, slug]);

  if(loading) return <div className="max-w-7xl mx-auto px-4 py-12">Đang tải chi tiết khoá học…</div>;
  if(error) return <div className="max-w-7xl mx-auto px-4 py-12" style={{color:'#d9534f'}}>{error}</div>;

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <SectionHeading
          eyebrow="Khoá học"
          title={view.title}
          subtitle={view.desc || "Xây dựng nền tảng vững, hoàn thiện dự án và portfolio"}
        />
        <div className="mt-8 grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            {view.image ? (
              <div className="aspect-video rounded-xl overflow-hidden border border-stone-200">
                <img src={view.image} alt={view.title} style={{width:'100%', height:'100%', objectFit:'cover'}} />
              </div>
            ) : (
              <div className="aspect-video rounded-xl bg-gradient-to-br from-primary-200 to-primary-100" />
            )}
            {Array.isArray(view.modules) && view.modules.length > 0 && (
              <div className="mt-6 prose prose-stone max-w-none">
                <h3>Nội dung chính</h3>
                <ol>
                  {view.modules.map((m,i)=> (
                    <li key={m.id||i}>
                      <strong>{m.title||m.name||`Chương ${i+1}`}</strong>
                      {Array.isArray(m.lessons)&&m.lessons.length>0 && (
                        <ul>
                          {m.lessons.map((l,j)=> (
                            <li key={l.id||j}>{l.title||l.name||`Bài ${j+1}`}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
          <aside className="space-y-4">
            <div className="rounded-xl border border-stone-200 p-4">
              <div className="font-semibold">Thông tin</div>
              <div className="mt-2 text-sm text-stone-600 space-y-1">
                {view.durationWeeks && (<div>Thời lượng: {view.durationWeeks} tuần</div>)}
                <div>Hình thức: Online</div>
                {view.level && (<div>Cấp độ: {levelLabel(view.level)}</div>)}
              </div>
              <a className="btn btn-primary w-full mt-4" href={`/checkout?course=${encodeURIComponent(slug)}`}>Thanh toán / Đăng ký</a>
            </div>
            <div className="rounded-xl border border-stone-200 p-4">
              <div className="font-semibold">Yêu cầu đầu vào</div>
              <ul className="mt-2 text-sm text-stone-600 list-disc pl-5 space-y-1">
                <li>Kiến thức lập trình cơ bản</li>
                <li>Thời gian 8-10 giờ/tuần</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

