import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { jsStats } from '../lib/metrics';
import { JsQuestion } from '../components/JsQuestion';

type Filter = 'all' | 'new' | 'wrong' | 'right';

export function JsPage() {
  const { content: c, progress: p } = useStore();
  const [topic, setTopic] = useState('');
  const [filter, setFilter] = useState<Filter>('new');
  const topics = useMemo(() => [...new Set(c.js.map((q) => q.topic))], [c.js]);
  const st = jsStats(c, p);

  const list = c.js.filter((q) => {
    if (topic && q.topic !== topic) return false;
    const a = p.js[q.id];
    if (filter === 'new') return !a;
    if (filter === 'wrong') return !!a && a !== q.ans;
    if (filter === 'right') return a === q.ans;
    return true;
  });
  const [currentId, setCurrentId] = useState<string | null>(null);
  // Keep showing the question just answered even though it left the "new" filter.
  const firstId = list[0]?.id ?? null;
  useEffect(() => { if (!currentId && firstId) setCurrentId(firstId); }, [currentId, firstId]);
  const current = c.js.find((q) => q.id === currentId) ?? list[0];
  const nextAfter = () => {
    const pool = list.filter((q) => q.id !== current?.id);
    const i = current ? c.js.indexOf(current) : -1;
    setCurrentId((pool.find((q) => c.js.indexOf(q) > i) ?? pool[0])?.id ?? null);
  };

  return (
    <div className="page">
      <h1 className="title">JavaScript output questions</h1>
      <p className="lede">Pick an answer before reading the explanation. {st.attempted} of {st.total} attempted · {st.accuracy}% accuracy.</p>

      <div className="filters">
        <div className="chips" role="group" aria-label="Show">
          {(['new', 'wrong', 'right', 'all'] as Filter[]).map((f) => (
            <button key={f} type="button" className={filter === f ? 'on' : ''} onClick={() => { setFilter(f); setCurrentId(null); }}>
              {{ new: 'Unanswered', wrong: 'Got wrong', right: 'Got right', all: 'All' }[f]}
            </button>
          ))}
        </div>
        <select aria-label="Topic" value={topic} onChange={(e) => { setTopic(e.target.value); setCurrentId(null); }}>
          <option value="">All topics</option>
          {topics.map((t) => <option key={t}>{t}</option>)}
        </select>
        <span className="muted">{list.length} in this set</span>
      </div>

      <div className="js-layout">
        <div className="panel">
          {current ? <JsQuestion key={current.id} q={current} onNext={nextAfter} /> : <p className="empty">Nothing in this set. Pick another filter.</p>}
        </div>
        <ol className="qnav" aria-label="Questions">
          {c.js.filter((q) => !topic || q.topic === topic).map((q) => {
            const a = p.js[q.id];
            return (
              <li key={q.id}>
                <button type="button" onClick={() => setCurrentId(q.id)}
                  className={`${a ? (a === q.ans ? 'right' : 'wrong') : ''} ${current?.id === q.id ? 'cur' : ''}`}
                  title={`${q.id} · ${q.topic}`}>{q.id.slice(2)}</button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
