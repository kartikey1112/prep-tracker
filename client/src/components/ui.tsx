import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Status } from '../types';
import { useStore } from '../store';
import { ID_RE } from '../lib/catalog';
import { isDayDone, dayTracksDone } from '../lib/metrics';
import { dayDate, fmt, planDay } from '../lib/dates';

export const STATUS_LABEL: Record<Status, string> = { '': 'Not started', prog: 'In progress', done: 'Completed' };

export function StatusSelect({ value, onChange, label = 'Status' }: { value: Status; onChange: (s: Status) => void; label?: string }) {
  return (
    <select aria-label={label} className={`status s-${value || 'none'}`} value={value} onChange={(e) => onChange(e.target.value as Status)}>
      {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
    </select>
  );
}

export function Confidence({ value, onChange }: { value?: number; onChange: (v: number | null) => void }) {
  return (
    <div className="conf" role="group" aria-label="Confidence 1 to 5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" aria-pressed={value === n} className={value !== undefined && n <= value ? 'on' : ''}
          onClick={() => onChange(value === n ? null : n)} title={`Confidence ${n}`}>{n}</button>
      ))}
    </div>
  );
}

export function Meter({ value, label, sub }: { value: number; label: string; sub?: string }) {
  return (
    <div className="meter">
      <div className="meter-head"><span>{label}</span><b>{value}%</b></div>
      <div className="bar"><i style={{ width: `${Math.min(100, value)}%` }} /></div>
      {sub && <small>{sub}</small>}
    </div>
  );
}

/** Text field that saves when it loses focus, so typing never re-renders the page. */
export function BlurField({ value, onSave, placeholder, multiline, label }: {
  value?: string; onSave: (v: string) => void; placeholder?: string; multiline?: boolean; label: string;
}) {
  const [v, setV] = useState(value ?? '');
  useEffect(() => setV(value ?? ''), [value]);
  const commit = () => { if (v !== (value ?? '')) onSave(v); };
  return multiline
    ? <textarea aria-label={label} value={v} placeholder={placeholder} rows={3} onChange={(e) => setV(e.target.value)} onBlur={commit} />
    : <input aria-label={label} value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />;
}

export function NumberField({ value, onSave, min, max, label, placeholder }: {
  value?: number; onSave: (v: number | null) => void; min: number; max: number; label: string; placeholder?: string;
}) {
  const [v, setV] = useState(value?.toString() ?? '');
  useEffect(() => setV(value?.toString() ?? ''), [value]);
  const commit = () => {
    if (v.trim() === '') { if (value !== undefined) onSave(null); return; }
    const n = Math.max(min, Math.min(max, Math.round(Number(v))));
    if (Number.isFinite(n) && n !== value) onSave(n); else setV(value?.toString() ?? '');
  };
  return (
    <input className="num" type="number" inputMode="numeric" aria-label={label} min={min} max={max} value={v}
      placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
  );
}

export function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  if (!/^https:\/\//.test(href)) return <>{children}</>;
  return <a href={href} target="_blank" rel="noreferrer noopener">{children}</a>;
}

/** Turns bank IDs inside task text (D-001, MC-13, Q-004 …) into buttons that open the item. */
export function Linkify({ text }: { text: string }) {
  const { index, open } = useStore();
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(ID_RE)) {
    const id = m[0];
    if (!index.has(id)) continue;
    parts.push(text.slice(last, m.index));
    parts.push(<button key={`${id}-${m.index}`} type="button" className="idlink" onClick={() => open(id)}>{id}</button>);
    last = (m.index ?? 0) + id.length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

export function Diff({ d }: { d: string }) {
  const k = d.toLowerCase().includes('hard') ? 'hard' : d.toLowerCase().includes('medium') ? 'med' : 'easy';
  return <span className={`diff d-${k}`}>{d}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

/** 16 weeks × 7 days: the whole plan at a glance. */
export function PlanGrid({ compact }: { compact?: boolean }) {
  const { content, progress } = useStore();
  const nav = useNavigate();
  const today = planDay(progress.start);
  const weeks = content.weeks.map((w) => w.w);
  return (
    <div className={`plangrid ${compact ? 'compact' : ''}`} role="grid" aria-label="112-day plan">
      {weeks.map((w) => (
        <div key={w} className="pg-week" role="row">
          <span className="pg-label">W{w}</span>
          {content.days.filter((d) => d.w === w).map((d) => {
            const done = isDayDone(progress, d.d);
            const part = dayTracksDone(progress, d.d);
            const cls = done ? 'done' : part ? 'part' : d.d < today ? 'missed' : '';
            return (
              <button key={d.d} role="gridcell" type="button"
                className={`pg-day ${cls} ${d.d === today ? 'now' : ''} ${d.ty !== 'Preparation' ? 'assess' : ''}`}
                title={`Day ${d.d} · ${fmt(dayDate(progress.start, d.d))} · ${d.focus}`}
                onClick={() => nav(`/day/${d.d}`)}>
                <span>{d.d}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="panel">
      <header className="panel-head"><h2>{title}</h2>{aside}</header>
      {children}
    </section>
  );
}
