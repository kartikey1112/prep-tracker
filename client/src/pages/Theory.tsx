import { useState } from 'react';
import { Navigate, NavLink, useParams } from 'react-router-dom';
import { useStore } from '../store';
import type { BankKey } from '../types';
import { BANKS } from '../lib/catalog';
import { bankCompletion } from '../lib/metrics';
import { BlurField, Confidence, Diff, StatusSelect } from '../components/ui';

export function TheoryPage() {
  const { content: c, progress: p, setItem } = useStore();
  const { bank } = useParams();
  const meta = BANKS.find((b) => b.key === bank);
  const [topic, setTopic] = useState('');
  if (!meta) return <Navigate to="/theory/react" replace />;
  const items = c.banks[meta.key as BankKey];
  const topics = [...new Set(items.map((q) => q.topic))];
  const shown = items.filter((q) => !topic || q.topic === topic);
  const story = meta.key === 'proj' || meta.key === 'beh';

  return (
    <div className="page">
      <h1 className="title">Theory banks</h1>
      <nav className="tabs" aria-label="Banks">
        {BANKS.map((b) => {
          const s = bankCompletion(c, p, c.banks[b.key]);
          return <NavLink key={b.key} to={`/theory/${b.key}`} onClick={() => setTopic('')}>{b.short} <small>{s.done}/{s.total}</small></NavLink>;
        })}
      </nav>
      <p className="lede">{meta.label}: answer aloud first, then open “A strong answer covers” and compare.{story && ' Write your own story in the talking points.'}</p>
      <div className="chips">
        <button type="button" className={!topic ? 'on' : ''} onClick={() => setTopic('')}>All topics</button>
        {topics.map((t) => <button key={t} type="button" className={topic === t ? 'on' : ''} onClick={() => setTopic(t)}>{t}</button>)}
      </div>
      <div className="qa-list">
        {shown.map((q) => {
          const it = p.items[q.id];
          return (
            <article key={q.id} className={`qa ${it?.s === 'done' ? 'is-done' : ''}`}>
              <p className="muted small">{q.id} · {q.topic} · {q.type} · <Diff d={q.diff} /> · day {q.day}</p>
              <h3>{q.q}</h3>
              <details className="reveal">
                <summary>A strong answer covers</summary>
                <p>{q.cov}</p>
                {q.fu && <><h4>Likely follow-ups</h4><p>{q.fu}</p></>}
              </details>
              <div className="qa-ctl">
                <StatusSelect value={it?.s ?? ''} onChange={(s) => setItem(q.id, { s })} />
                <Confidence value={it?.conf} onChange={(conf) => setItem(q.id, { conf })} />
              </div>
              <BlurField multiline={story} label={story ? 'Talking points' : 'Notes'} value={it?.note}
                onSave={(note) => setItem(q.id, { note })} placeholder={story ? 'Situation, task, action, result…' : 'My notes'} />
            </article>
          );
        })}
      </div>
    </div>
  );
}
