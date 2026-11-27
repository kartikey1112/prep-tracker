import { useState, type FormEvent } from 'react';
import { useStore } from '../store';
import type { WeakEntry } from '../types';
import { todayISO } from '../lib/dates';
import { PASS_MARK, RULES, scorecard } from '../lib/metrics';
import { Section } from '../components/ui';

const blank = () => ({ date: todayISO(), area: 'DSA', obs: '', src: '', plan: '', target: '', status: 'Open' as const });

export function ScorecardPage() {
  const { content: c, progress: p, addWeak, patchWeak, deleteWeak } = useStore();
  const sc = scorecard(c, p);
  const [form, setForm] = useState<Omit<WeakEntry, 'id'>>(blank);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.obs.trim()) return;
    addWeak({ ...form, target: form.target || '' });
    setForm(blank());
  };

  return (
    <div className="page">
      <h1 className="title">{sc.verdict}</h1>
      <p className="lede">Finishing the syllabus isn't enough. An area is Ready only when its bank is at least {RULES.minCompletion}% done, you've taken {RULES.minTimed}+ timed assessments and {RULES.minMock}+ full-mock rounds in it, and both averages are at or above {PASS_MARK}. Area score = 20% completion + 40% timed + 40% mock.</p>

      <div className="kpis">
        <div className="kpi"><span>Overall readiness</span><b>{sc.overall}%</b></div>
        <div className="kpi"><span>Areas ready</span><b>{sc.readyCount} of {sc.rows.length}</b></div>
        <div className="kpi"><span>Full mock loops done</span><b>{sc.loops.completed}</b><small>need {RULES.minLoops}</small></div>
      </div>

      <Section title="Areas">
        <table className="stack data">
          <thead><tr><th>Area</th><th>Completion</th><th>Timed</th><th>Avg timed</th><th>Mock rounds</th><th>Avg mock</th><th>Score</th><th>Ready?</th></tr></thead>
          <tbody>
            {sc.rows.map((r) => (
              <tr key={r.area}>
                <td><b>{r.area}</b><small className="sub">{r.source}</small></td>
                <td><div className="cellbar"><i style={{ width: `${r.completion}%` }} /><span>{r.completion}%</span></div></td>
                <td className="r">{r.timedN}</td><td className="r">{r.timedAvg || '–'}</td>
                <td className="r">{r.mockN}</td><td className="r">{r.mockAvg || '–'}</td>
                <td className="r"><b>{r.score}</b></td>
                <td><span className={`result ${r.ready ? 'ok' : 'bad'}`}>{r.ready ? 'Ready' : `Gap ${r.gap}`}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="What to work on next">
        <ol className="weak">
          {sc.weakest.filter((r) => !r.ready).slice(0, 5).map((r) => (
            <li key={r.area}><b>{r.area}</b> <span>score {r.score} — {c.steps[r.area]}</span></li>
          ))}
        </ol>
      </Section>

      <Section title="Weakness log">
        <form className="weak-form" onSubmit={submit}>
          <label>Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
          <label>Area
            <select value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}>
              {sc.rows.map((r) => <option key={r.area}>{r.area}</option>)}
              <option>Testing and security</option>
            </select>
          </label>
          <label className="wide">Weakness observed<input required value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} placeholder="e.g. mixed up microtask vs macrotask order" /></label>
          <label>Source<input value={form.src} onChange={(e) => setForm({ ...form, src: e.target.value })} placeholder="M-002 / Day 12" /></label>
          <label className="wide">Action plan<input value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} /></label>
          <label>Target date<input type="date" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} /></label>
          <button type="submit" className="primary">Add</button>
        </form>
        {p.weak.length === 0 ? <p className="muted">No weaknesses logged yet.</p> : (
          <table className="stack">
            <thead><tr><th>Date</th><th>Area</th><th>Weakness</th><th>Source</th><th>Plan</th><th>Target</th><th>Status</th><th /></tr></thead>
            <tbody>
              {p.weak.map((w) => (
                <tr key={w.id}>
                  <td className="nowrap">{w.date}</td><td>{w.area}</td><td>{w.obs}</td><td>{w.src}</td><td>{w.plan}</td><td className="nowrap">{w.target}</td>
                  <td>
                    <select aria-label="Status" value={w.status} onChange={(e) => patchWeak(w.id, { status: e.target.value as WeakEntry['status'] })}>
                      <option>Open</option><option>In Progress</option><option>Fixed</option>
                    </select>
                  </td>
                  <td>
                    {confirmDel === w.id
                      ? <button type="button" className="danger" onClick={() => { deleteWeak(w.id); setConfirmDel(null); }}>Confirm</button>
                      : <button type="button" className="ghost" onClick={() => setConfirmDel(w.id)}>Delete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
