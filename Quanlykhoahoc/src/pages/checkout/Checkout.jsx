/* eslint-disable */
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_BASE || '';

function useQuery(){
  const { search } = useLocation();
  return useMemo(()=> new URLSearchParams(search), [search]);
}

function resolveThumb(u){
  if(!u) return null; let s=String(u).trim().replace(/\\/g,'/');
  if(/^https?:\/\//i.test(s)||s.startsWith('data:')) return s; if(!s.startsWith('/')) s='/'+s; return (API_BASE||'')+s;
}
function money(n){ try{ return Number(n).toLocaleString('vi-VN') + ' đ'; }catch(e){ return n+' đ'; } }

export default function Checkout(){
  const q = useQuery();
  const navigate = useNavigate();
  const courseKey = q.get('course');
  const [course, setCourse] = useState(null);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [method, setMethod] = useState('VNPAY');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(()=>{ (async()=>{
    setLoading(true); setMessage('');
    if(!courseKey){ setMessage('Thiếu tham số course.'); setLoading(false); return; }
    const tries = [
      `/api/public/courses/detail/${encodeURIComponent(courseKey)}`,
      `/api/public/courses/detail-sql/${encodeURIComponent(courseKey)}`,
      `/api/public/course/${encodeURIComponent(courseKey)}`
    ];
    let found=null;
    for(const p of tries){
      try{ const r = await fetch(API_BASE+p,{headers:{Accept:'application/json'}}); if(!r.ok) continue; const j=await r.json(); if(j){ found=j; break; } }catch(e){}
    }
    if(!found){ try{ const r = await fetch(API_BASE+'/api/public/courses'); if(r.ok){ const list=await r.json(); if(Array.isArray(list)) found=list.find(x=> (x.slug||x.course_slug||x.code)==courseKey || String(x.id||x.course_id)===courseKey); } }catch(e){} }
    setCourse(found); setLoading(false);
    if(!found) setMessage('Không tìm thấy khoá học.');
  })(); },[courseKey]);

  const view = useMemo(()=>{
    const c = course || {};
    const title = c.title ?? c.name ?? c.course_title ?? 'Khoá học';
    const desc = c.description ?? c.summary ?? c.short_desc ?? '';
    const price = c.price ?? c.tuition ?? c.amount ?? 0;
    const img = resolveThumb(c.thumbnail_url ?? c.thumbnailUrl ?? c.thumbnail_path ?? c.image_url ?? c.cover_url);
    const id = c.id ?? c.course_id ?? null;
    return { title, desc, price, img, id };
  },[course]);

  async function onPay(){
    if(!course) return;
    const payload = {
      course_id: view.id,
      course_key: courseKey,
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      method,
      amount: view.price,
      return_url: window.location.origin + '/checkout/success',
      cancel_url: window.location.origin + '/checkout/failed'
    };
    setMessage('Đang xử lý thanh toán...');
    try{
      const r = await fetch(API_BASE+'/api/payments/checkout',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      if(r.ok){
        const j = await r.json();
        if(j && j.paymentUrl){ window.location.href = j.paymentUrl; return; }
        if(j && (j.status==='PAID' || j.paid===true)){ setMessage('Thanh toán thành công.'); navigate('/'); return; }
      }
    }catch(e){}
    try{
      const r2 = await fetch(API_BASE+`/api/courses/${view.id}/enroll`,{method:'POST'});
      if(r2.ok){ setMessage('Đã đăng ký khoá học. Vui lòng kiểm tra trang Sinh viên.'); return; }
    }catch(e){}
    setMessage('Không gọi được cổng thanh toán. Vui lòng liên hệ hỗ trợ.');
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h2 className="text-2xl font-bold">Thanh toán khoá học</h2>
      {message && <div className="mt-2 text-stone-600">{message}</div>}
      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <div className="rounded-xl border border-stone-200 p-4">
          <div className="rounded-xl overflow-hidden border border-stone-200 aspect-video bg-stone-100">
            {view.img && <img alt={view.title} src={view.img} className="w-full h-full object-cover" />}
          </div>
          <div className="mt-3 font-semibold text-stone-900">{view.title}</div>
          <div className="text-stone-600 text-sm">{view.desc}</div>
          <div className="mt-2 text-2xl font-extrabold">{money(view.price)}</div>
        </div>
        <div className="rounded-xl border border-stone-200 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm">Họ tên</label>
              <input className="w-full px-3 py-2 border border-stone-300 rounded-lg" value={buyerName} onChange={e=>setBuyerName(e.target.value)} placeholder="Nguyễn Văn A" />
            </div>
            <div>
              <label className="text-sm">Email</label>
              <input className="w-full px-3 py-2 border border-stone-300 rounded-lg" value={buyerEmail} onChange={e=>setBuyerEmail(e.target.value)} placeholder="email@example.com" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-semibold mb-2">Phương thức thanh toán</div>
            {['VNPAY','MOMO','BANK','COD'].map(v => (
              <label key={v} className="flex items-center gap-2 text-sm mb-2">
                <input type="radio" name="pm" value={v} checked={method===v} onChange={()=>setMethod(v)} /> {v}
              </label>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={onPay} className="btn btn-primary px-4 py-2 bg-primary-600 text-white rounded-lg">Thanh toán</button>
            <button onClick={()=>navigate(-1)} className="px-4 py-2 border border-stone-300 rounded-lg">Quay lại</button>
          </div>
        </div>
      </div>
    </div>
  );
}
