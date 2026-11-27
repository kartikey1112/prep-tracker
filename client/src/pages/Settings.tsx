import { useRef, useState } from 'react';
import { useStore } from '../store';
import { addDays, fmt } from '../lib/dates';
import { Section } from '../components/ui';

export function SettingsPage() {
  const { content: c, progress: p, setStart, importProgress, reset } = useStore();
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [confirm, setConfirm] = useState(false);

  const onImport = async (f: File | undefined) => {
    if (!f) return;
    try {
      await importProgress(JSON.parse(await f.text()));
      setMsg('Progress imported.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Import failed');
    }
    if (file.current) file.current.value = '';
  };

  return (
    <div className="page narrow">
      <h1 className="title">Settings</h1>
      <Section title="Start date">
        <p className="muted">Day 1 of the plan. Every date in the app follows from this.</p>
        <input type="date" value={p.start} onChange={(e) => e.target.value && setStart(e.target.value)} aria-label="Start date" />
        <p className="small">Plan runs {fmt(p.start, true)} → {fmt(addDays(p.start, c.days.length - 1), true)}.</p>
      </Section>
      <Section title="Backup">
        <p className="muted">Your progress is saved to your account. Download a copy, or restore one (including a <code>progress.json</code> from the old local version).</p>
        <div className="row">
          <a className="btn primary" href="/api/progress/export" download>Download progress (.json)</a>
          <label className="btn ghost">Import a backup
            <input ref={file} type="file" accept="application/json" hidden onChange={(e) => onImport(e.target.files?.[0])} />
          </label>
        </div>
        {msg && <p className="small" role="status">{msg}</p>}
      </Section>
      <Section title="Reset">
        <p className="muted">Clears every tick, score, answer and note. The start date stays.</p>
        {confirm
          ? <div className="row"><button type="button" className="danger" onClick={() => { reset(); setConfirm(false); }}>Yes, clear everything</button><button type="button" className="ghost" onClick={() => setConfirm(false)}>Cancel</button></div>
          : <button type="button" className="ghost" onClick={() => setConfirm(true)}>Reset progress…</button>}
      </Section>
    </div>
  );
}
