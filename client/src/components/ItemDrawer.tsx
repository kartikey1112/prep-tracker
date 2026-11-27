import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { BANKS, entryTitle } from '../lib/catalog';
import { dayDate, fmt } from '../lib/dates';
import { BlurField, Confidence, Diff, ExtLink, NumberField, StatusSelect } from './ui';
import { JsQuestion } from './JsQuestion';

function Field({ label, value }: { label: string; value: string }) {
  if (!value || value === 'N/A') return null;
  return <div className="field"><dt>{label}</dt><dd>{value}</dd></div>;
}

export function ItemDrawer() {
  const { openId, open, index, progress, setItem } = useStore();
  const ref = useRef<HTMLElement>(null);
  const entry = openId ? index.get(openId) : undefined;

  useEffect(() => {
    if (!entry) return;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && open(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [entry, open]);

  if (!entry || !openId) return null;
  const it = progress.items[openId] ?? { s: '' as const };
  const plannedDay = entry.kind === 'sd' ? undefined : entry.item.day;

  return (
    <div className="drawer-wrap" onClick={(e) => e.target === e.currentTarget && open(null)}>
      <aside className="drawer" ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={entryTitle(entry)}>
        <header className="drawer-head">
          <span className="tag">{openId}</span>
          {plannedDay ? <span className="muted">Planned for day {plannedDay} · {fmt(dayDate(progress.start, plannedDay))}</span> : null}
          <button type="button" className="ghost close" onClick={() => open(null)} aria-label="Close">Close</button>
        </header>

        {entry.kind === 'js' ? <JsQuestion q={entry.item} /> : (
          <>
            <h2 className="drawer-title">{entryTitle(entry)}</h2>
            <div className="controls">
              <label>Status <StatusSelect value={it.s} onChange={(s) => setItem(openId, { s })} /></label>
              <label>Confidence <Confidence value={it.conf} onChange={(conf) => setItem(openId, { conf })} /></label>
              {entry.kind === 'dsa' && <label>Time taken (min) <NumberField label="Time taken" min={0} max={600} value={it.time} onSave={(time) => setItem(openId, { time })} /></label>}
              {entry.kind === 'mc' && <>
                <label>Actual time (min) <NumberField label="Actual time" min={0} max={600} value={it.time} onSave={(time) => setItem(openId, { time })} /></label>
                <label>Self-score (0-10) <NumberField label="Self score" min={0} max={10} value={it.score} onSave={(score) => setItem(openId, { score })} /></label>
              </>}
              {entry.kind === 'sd' && <label>Timed score (0-100) <NumberField label="Timed score" min={0} max={100} value={it.score} onSave={(score) => setItem(openId, { score })} /></label>}
            </div>
            {it.dt && <p className="muted small">Completed {fmt(it.dt, true)} · revisions follow at +1, +3, +7, +14 and +30 days.</p>}

            {entry.kind === 'dsa' && (
              <dl className="fields">
                <div className="field"><dt>Difficulty</dt><dd><Diff d={entry.item.diff} /></dd></div>
                <Field label="Topic" value={entry.item.topic} />
                <Field label="Pattern" value={entry.item.pat} />
                <Field label="Complexity" value={`Time ${entry.item.tc} · Space ${entry.item.sc}`} />
                <Field label="Target time" value={`${entry.item.rec} min`} />
                <Field label="Source" value={entry.item.freq} />
                <div className="field"><dt>Problem</dt><dd><ExtLink href={entry.item.u}>Open on LeetCode ↗</ExtLink></dd></div>
              </dl>
            )}
            {entry.kind === 'mc' && (
              <dl className="fields">
                <Field label="Level" value={entry.item.level} />
                <Field label="Expected time" value={`${entry.item.time} min`} />
                <Field label="Problem" value={entry.item.statement} />
                <Field label="Required features" value={entry.item.req} />
                <Field label="Bonus" value={entry.item.bonus} />
                <Field label="Expected UI behaviour" value={entry.item.ui} />
                <Field label="Components" value={entry.item.comps} />
                <Field label="State" value={entry.item.state} />
                <Field label="API" value={entry.item.api} />
                <Field label="Edge cases" value={entry.item.edge} />
                <Field label="Accessibility" value={entry.item.a11y} />
                <Field label="Evaluation" value={entry.item.eval} />
                <Field label="Test cases" value={entry.item.tests} />
                <Field label="Reported in" value={entry.item.reported} />
                {entry.item.ref && <div className="field"><dt>Reference</dt><dd><ExtLink href={entry.item.ref}>{entry.item.ref}</ExtLink></dd></div>}
              </dl>
            )}
            {entry.kind === 'sd' && (
              <dl className="fields">
                <Field label="Week" value={String(entry.item.w)} />
                {entry.item.asp.map(([k, v]) => <Field key={k} label={k} value={v} />)}
                {entry.item.ref && <div className="field"><dt>Reference</dt><dd><ExtLink href={entry.item.ref}>{entry.item.ref}</ExtLink></dd></div>}
              </dl>
            )}
            {entry.kind === 'qa' && (
              <>
                <p className="muted">{BANKS.find((b) => b.key === entry.bank)?.label} · {entry.item.topic} · {entry.item.type} · <Diff d={entry.item.diff} /></p>
                <p className="hint">Answer aloud first, then open the model answer.</p>
                <details className="reveal">
                  <summary>A strong answer covers</summary>
                  <p>{entry.item.cov}</p>
                  {entry.item.fu && <><h4>Likely follow-ups</h4><p>{entry.item.fu}</p></>}
                </details>
              </>
            )}
            <label className="block">{entry.kind === 'qa' && ['proj', 'beh'].includes(entry.bank) ? 'My story / talking points' : 'Notes'}
              <BlurField multiline label="Notes" value={it.note} onSave={(note) => setItem(openId, { note })} placeholder="Approach, mistakes, link to repo or diagram…" />
            </label>
          </>
        )}
      </aside>
    </div>
  );
}
