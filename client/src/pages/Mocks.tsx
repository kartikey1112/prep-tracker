import { useState } from 'react';
import { useStore } from '../store';
import { mockLoops, PASS_MARK } from '../lib/metrics';
import { BlurField, NumberField } from '../components/ui';

export function MocksPage() {
  const { content: c, progress: p, setMock } = useStore();
  const [kind, setKind] = useState<'all' | 'weekly' | 'full'>('all');
  const loops = mockLoops(c, p);
  const rows = c.mocks.filter((m) => kind === 'all' || (kind === 'full') === m.type.startsWith('Full mock'));
  const weeks = [...new Set(rows.map((m) => m.w))];

  return (
    <div className="page">
      <h1 className="title">Mock interviews</h1>
      <p className="lede">Weekly timed assessments on Day 7 and eight full mock loops. Enter a score (0–100) right after each round; pass mark is {PASS_MARK}. These scores drive the readiness scorecard.</p>

      <div className="loops">
        {loops.list.map((l) => (
          <div key={l.name} className={`loop ${l.complete ? 'ok' : ''}`}>
            <b>{l.name.split(':')[0]}</b><span>{l.name.split(':')[1]}</span><small>{l.scored}/{l.rounds} rounds scored</small>
          </div>
        ))}
      </div>

      <div className="chips">
        {(['all', 'weekly', 'full'] as const).map((k) => (
          <button key={k} type="button" className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>
            {{ all: 'All', weekly: 'Weekly assessments', full: 'Full mock loops' }[k]}
          </button>
        ))}
      </div>

      {weeks.map((w) => (
        <section key={w} className="panel">
          <header className="panel-head"><h2>Week {w}</h2></header>
          <table className="stack">
            <thead><tr><th>ID</th><th>Date</th><th>Type</th><th>Area</th><th>Task</th><th>Time</th><th>Score</th><th>Result</th><th>Feedback</th></tr></thead>
            <tbody>
              {rows.filter((m) => m.w === w).map((m) => {
                const mp = p.mocks[m.id];
                const res = mp?.score === undefined ? '' : mp.score >= PASS_MARK ? 'Pass' : 'Below bar';
                return (
                  <tr key={m.id}>
                    <td className="muted">{m.id}</td>
                    <td className="nowrap">{m.date}</td>
                    <td>{m.type.startsWith('Full mock') ? m.type.split(':')[0] : 'Weekly'}</td>
                    <td>{m.area}</td>
                    <td>{m.task}</td>
                    <td className="nowrap r">{m.time} min</td>
                    <td><NumberField label={`${m.id} score`} min={0} max={100} value={mp?.score} onSave={(score) => setMock(m.id, { score })} placeholder="0-100" /></td>
                    <td>{res && <span className={`result ${res === 'Pass' ? 'ok' : 'bad'}`}>{res}</span>}</td>
                    <td><BlurField label={`${m.id} feedback`} value={mp?.feedback} onSave={(feedback) => setMock(m.id, { feedback })} placeholder="Feedback / follow-up" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
