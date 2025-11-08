/* eslint-disable */
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_BASE || '';

export default function QuizRun() {
  const { slug } = useParams();
  const derivedSlug = slug || (typeof window !== 'undefined' ? (window.location.pathname.split('/').filter(Boolean).pop() || '') : '');
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      const key = derivedSlug;
      if (!key) { setLoading(false); setError('Thiếu slug khóa học.'); return; }
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE}/api/public/quiz/course/${encodeURIComponent(key)}`, {
          headers: { 'Accept': 'application/json' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (mounted) setQuizzes(Array.isArray(data) ? data : []);
      } catch (e) {
        if (mounted) setError('Không tải được danh sách bài kiểm tra.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [derivedSlug]);

  const items = useMemo(() => (quizzes || []).map(q => ({
    id: q.id,
    title: q.title,
    questionCount: q.questionCount ?? q.question_count ?? 0,
    timeLimitSec: q.timeLimitSec ?? q.time_limit_sec ?? null,
  })), [quizzes]);

  if (loading) return <div>Đang tải bài kiểm tra…</div>;
  if (error) return <div style={{color:'#d9534f'}}>{error}</div>;
  if (!items.length) return (
    <div>
      <h2>Đề xuất bài kiểm tra - {derivedSlug}</h2>
      <p>Chưa có bài kiểm tra.</p>
    </div>
  );

  return (
    <div>
      <h2>Đề xuất bài kiểm tra - {slug}</h2>
      <ul>
        {items.map(it => (
          <li key={it.id} style={{margin:'8px 0'}}>
            <strong>{it.title}</strong> — {it.questionCount} câu hỏi{it.timeLimitSec?`, ${it.timeLimitSec}s`:''}
          </li>
        ))}
      </ul>
    </div>
  );
}
