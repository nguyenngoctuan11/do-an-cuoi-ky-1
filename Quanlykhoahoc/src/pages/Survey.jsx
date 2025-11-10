import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Survey() {
  const API = process.env.REACT_APP_API_BASE || "http://localhost:8081";
  const [qs, setQs] = useState([]);
  const [sel, setSel] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    fetch(`${API}/api/public/survey`).then(r=>r.json()).then(setQs).catch(()=>setQs([]));
  }, [API]);

  const onSubmit = async (e) => {
    e.preventDefault(); setError("");
    const token = localStorage.getItem('token');
    if(!token){ nav('/login', { state: { from: '/survey' }}); return; }
    const selectedCodes = Object.values(sel).filter(Boolean);
    if(selectedCodes.length===0) { setError('Vui lòng chọn đáp án.'); return; }
    try{
      setSubmitting(true);
      const res = await fetch(`${API}/api/survey/submit`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ selectedCodes }) });
      const json = await res.json();
      if(!res.ok) throw new Error(json?.message || 'Submit failed');
      nav(`/paths/${json.pathId}`, { replace:true });
    }catch(err){ setError(err.message||'Submit failed'); }
    finally{ setSubmitting(false); }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-stone-900">Khảo sát định hướng</h1>
      <p className="text-stone-600 mt-1">Chọn đáp án phù hợp để hệ thống đề xuất lộ trình học tập.</p>

      {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

      <form onSubmit={onSubmit} className="mt-6 space-y-6">
        {qs.map(q => (
          <div key={q.id} className="border border-stone-200 rounded-xl p-4">
            <div className="font-medium text-stone-900">{q.text}</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {q.options.map(o => (
                <label key={o.id} className={`rounded-lg border p-3 cursor-pointer ${sel[q.code]===o.code? 'border-primary-300 bg-primary-50' : 'border-stone-200 hover:border-stone-300'}`}>
                  <input type="radio" name={q.code} value={o.code} className="mr-2" onChange={() => setSel(s => ({...s, [q.code]: o.code }))} />
                  {o.text}
                </label>
              ))}
            </div>
          </div>
        ))}
        <button type="submit" disabled={submitting} className="btn btn-primary">{submitting? 'Đang xử lý...' : 'Đề xuất lộ trình'}</button>
      </form>
    </div>
  );
}

