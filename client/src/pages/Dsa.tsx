import { useMemo, useState } from 'react';
import { useStore } from '../store';
import type { Status } from '../types';
import { bankCompletion } from '../lib/metrics';
import { Confidence, Diff, ExtLink, StatusSelect, STATUS_LABEL } from '../components/ui';

export function DsaPage() {
  const { content: c, progress: p, setItem, open } = useStore();
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState('');
  const [diff, setDiff] = useState('');
  const [status, setStatus] = useState<'all' | Status>('all');
  const topics = useMemo(() => [...new Set(c.dsa.map((d) => d.topic))].sort(), [c.dsa]);
  const done = bankCompletion(c, p, c.dsa);

  const rows = c.dsa.filter((d) =>
    (!q || `${d.id} ${d.n} ${d.pat}`.toLowerCase().includes(q.toLowerCase()))
    && (!topic || d.topic === topic) && (!diff || d.diff === diff)
    && (status === 'all' || (p.items[d.id]?.s ?? '') === status));

  return (
    <div className="page">
      <h1 className="title">DSA problem bank</h1>
      <p className="lede">{done.done} of {done.total} solved ({done.pct}%). Mark a problem Completed and it joins the revision schedule.</p>

      <div className="topics">
        {topics.map((t) => {
          const items = c.dsa.filter((d) => d.topic === t);
          const s = bankCompletion(c, p, items);
          return (
            <button key={t} type="button" className={`topic ${topic === t ? 'on' : ''}`} onClick={() => setTopic(topic === t ? '' : t)}>
              <span>{t}</span><small>{s.done}/{s.total}</small><i style={{ width: `${s.pct}%` }} />
            </button>
          );
        })}
      </div>

      <div className="filters">
        <input type="search" placeholder="Search problem or pattern" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Difficulty" value={diff} onChange={(e) => setDiff(e.target.value)}>
          <option value="">All difficulties</option><option>Easy</option><option>Medium</option><option>Hard</option>
        </select>
        <select aria-label="Status filter" value={status} onChange={(e) => setStatus(e.target.value as 'all' | Status)}>
          <option value="all">Any status</option>
          {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <span className="muted">{rows.length} shown</span>
      </div>

      <table className="stack data">
        <thead><tr><th>ID</th><th>Problem</th><th>Difficulty</th><th>Pattern</th><th>Day</th><th>Status</th><th>Confidence</th></tr></thead>
        <tbody>
          {rows.map((d) => {
            const it = p.items[d.id];
            return (
              <tr key={d.id} className={it?.s === 'done' ? 'is-done' : ''}>
                <td><button type="button" className="idlink" onClick={() => open(d.id)}>{d.id}</button></td>
                <td><ExtLink href={d.u}>{d.n}</ExtLink><small className="sub">{d.topic} · {d.rec} min · {d.freq}</small></td>
                <td><Diff d={d.diff} /></td>
                <td>{d.pat}<small className="sub">{d.tc} time · {d.sc} space</small></td>
                <td className="r">{d.day}</td>
                <td><StatusSelect value={it?.s ?? ''} onChange={(s) => setItem(d.id, { s })} /></td>
                <td><Confidence value={it?.conf} onChange={(conf) => setItem(d.id, { conf })} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
