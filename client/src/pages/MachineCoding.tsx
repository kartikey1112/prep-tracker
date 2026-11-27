import { useState } from 'react';
import { useStore } from '../store';
import { bankCompletion } from '../lib/metrics';
import { StatusSelect } from '../components/ui';

export function MachineCodingPage() {
  const { content: c, progress: p, setItem, open } = useStore();
  const levels = [...new Set(c.mc.map((m) => m.level))];
  const [level, setLevel] = useState('');
  const s = bankCompletion(c, p, c.mc);
  const rows = c.mc.filter((m) => !level || m.level === level);

  return (
    <div className="page">
      <h1 className="title">Machine coding</h1>
      <p className="lede">{s.done} of {s.total} builds done. React + TypeScript by default; JS utilities in plain TS. Open a card for the full spec, edge cases and evaluation criteria.</p>
      <div className="chips">
        <button type="button" className={!level ? 'on' : ''} onClick={() => setLevel('')}>All</button>
        {levels.map((l) => <button key={l} type="button" className={level === l ? 'on' : ''} onClick={() => setLevel(l)}>{l}</button>)}
      </div>
      <div className="cards">
        {rows.map((m) => {
          const it = p.items[m.id];
          return (
            <article key={m.id} className={`card ${it?.s === 'done' ? 'is-done' : ''}`}>
              <p className="muted small">{m.id} · {m.level} · {m.time} min · day {m.day}</p>
              <h3><button type="button" className="linkish" onClick={() => open(m.id)}>{m.n}</button></h3>
              <p className="clamp">{m.statement}</p>
              {m.reported && m.reported !== 'General practice' && <p className="reported">Reported: {m.reported}</p>}
              <footer>
                <StatusSelect value={it?.s ?? ''} onChange={(st) => setItem(m.id, { s: st })} />
                {it?.score !== undefined && <span className="muted">self-score {it.score}/10</span>}
                <button type="button" className="ghost" onClick={() => open(m.id)}>Spec</button>
              </footer>
            </article>
          );
        })}
      </div>
    </div>
  );
}
