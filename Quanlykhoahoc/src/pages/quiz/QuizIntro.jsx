/* eslint-disable */
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_BASE || '';

export default function QuizIntro() {
  const { slug } = useParams();
  const derivedSlug = slug || (typeof window !== 'undefined' ? (window.location.pathname.split('/').filter(Boolean).pop() || '') : '');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState({}); // questionId -> optionId
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      const key = derivedSlug;
      if (!key) { setLoading(false); setError('Thiếu slug khóa học.'); return; }
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE}/api/public/quiz/course/${encodeURIComponent(key)}`, {
          headers: { Accept: 'application/json' }
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (alive) setList(Array.isArray(data) ? data : []);
      } catch (e) {
        if (alive) setError('Không tải được bài kiểm tra.');
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [derivedSlug]);

  const items = useMemo(() => (list || []).map((q) => ({
    id: q.id,
    title: q.title,
    questionCount: q.questionCount ?? q.question_count ?? 0,
  })), [list]);

  if (loading) return <div>Đang tải…</div>;
  if (error) return <div style={{ color: '#d9534f' }}>{error}</div>;

  return (
    <div style={{maxWidth:960, margin:'24px auto', padding:'0 16px'}}>
      <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:16}}>
        <h2 style={{margin:0}}>Bài kiểm tra — {derivedSlug}</h2>
        {activeQuizId && (
          <button onClick={()=>setActiveQuizId(null)} style={{border:'1px solid #eee', background:'#fff', padding:'6px 10px', borderRadius:8, cursor:'pointer'}}>Quay lại danh sách</button>
        )}
      </div>

      {items.length === 0 ? (
        <div style={{padding:16, border:'1px solid #eee', borderRadius:12}}>Chưa có bài kiểm tra.</div>
      ) : (
        <div>
          {!activeQuizId && (
            <div>
              {items.map(it => (
                <div key={it.id} style={{border:'1px solid #eee', borderRadius:12, padding:16, marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:600, fontSize:18}}>{it.title}</div>
                    <div style={{color:'#666'}}>{it.questionCount} câu hỏi</div>
                  </div>
                  <button
                    onClick={async ()=>{
                      setActiveQuizId(it.id);
                      setQuestions([]); setCurrent(0); setSelected({}); setResult(null);
                      // load questions of this quiz
                      try {
                        const r = await fetch(`${API_BASE}/api/public/quiz/${it.id}/questions`, { headers: { Accept:'application/json' } });
                        const data = r.ok ? await r.json() : [];
                        setQuestions(Array.isArray(data) ? data : []);
                      } catch(e) { setQuestions([]); }
                    }}
                    style={{background:'#6b5b95', color:'#fff', padding:'8px 14px', borderRadius:8, border:'none', cursor:'pointer'}}>
                    Bắt đầu
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeQuizId && (
            <div style={{border:'1px solid #eee', borderRadius:12, padding:16}}>
              <div style={{fontSize:18, fontWeight:600, marginBottom:8}}>Làm bài kiểm tra</div>
              <div className="muted" style={{color:'#666', marginBottom:12}}>Khóa học: {derivedSlug} • Quiz ID: {activeQuizId}</div>

              {questions.length === 0 ? (
                <div>Đang tải câu hỏi…</div>
              ) : result ? (
                <div>
                  <div style={{fontSize:20, fontWeight:700}}>Kết quả</div>
                  <p style={{margin:'8px 0'}}>Đúng: {result.correct}/{result.totalQuestions} — Điểm: {result.scorePercent.toFixed(1)}%</p>
                  <button onClick={()=>{setActiveQuizId(null);}} style={{border:'1px solid #eee', background:'#fff', padding:'8px 14px', borderRadius:8, cursor:'pointer'}}>Về danh sách</button>
                </div>
              ) : (
                <div>
                  <div style={{marginBottom:12}}>
                    <span style={{fontWeight:600}}>Câu {current + 1}/{questions.length}:</span>
                  </div>
                  <div style={{padding:12, border:'1px solid #f0f0f0', borderRadius:8, marginBottom:12}}>
                    <div style={{marginBottom:8}}>{questions[current].content}</div>
                    {questions[current].image_url && (
                      <img alt="question" src={questions[current].image_url} style={{maxWidth:'100%', borderRadius:8, marginBottom:8}} />
                    )}
                    {questions[current].video_url && (
                      <video controls src={questions[current].video_url} style={{maxWidth:'100%', borderRadius:8, marginBottom:8}} />
                    )}
                    <div>
                      {(questions[current].options || []).map(op => (
                        <label key={op.id} style={{display:'flex', alignItems:'center', gap:8, margin:'6px 0'}}>
                          <input type="radio" name={`q-${questions[current].id}`} checked={selected[questions[current].id] === op.id}
                                 onChange={()=>setSelected(s=>({...s, [questions[current].id]: op.id}))} />
                          <span style={{width:22, display:'inline-block', fontWeight:600}}>{op.label}</span>
                          <span>{op.content}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={{display:'flex', justifyContent:'space-between'}}>
                    <button disabled={current===0} onClick={()=>setCurrent(c=>Math.max(0,c-1))} style={{border:'1px solid #eee', background:'#fff', padding:'8px 14px', borderRadius:8, cursor:'pointer'}}>Trước</button>
                    {current < questions.length - 1 ? (
                      <button onClick={()=>setCurrent(c=>Math.min(questions.length-1,c+1))} style={{background:'#6b5b95', color:'#fff', padding:'8px 14px', borderRadius:8, border:'none', cursor:'pointer'}}>Tiếp</button>
                    ) : (
                      <button disabled={grading} onClick={async ()=>{
                        setGrading(true);
                        try {
                          const payload = { answers: questions.map(q => ({ question_id: q.id, option_id: selected[q.id] || null })) };
                          const r = await fetch(`${API_BASE}/api/public/quiz/${activeQuizId}/grade`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
                          const data = r.ok ? await r.json() : null;
                          setResult(data || { totalQuestions: questions.length, correct: 0, scorePercent: 0 });
                        } catch(e) { setResult({ totalQuestions: questions.length, correct: 0, scorePercent: 0 }); }
                        finally { setGrading(false); }
                      }} style={{background:'#4CAF50', color:'#fff', padding:'8px 14px', borderRadius:8, border:'none', cursor:'pointer'}}>Nộp bài</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
