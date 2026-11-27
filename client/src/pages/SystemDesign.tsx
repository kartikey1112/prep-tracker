import { useStore } from '../store';
import { bankCompletion } from '../lib/metrics';
import { StatusSelect } from '../components/ui';

export function SystemDesignPage() {
  const { content: c, progress: p, setItem, open } = useStore();
  const s = bankCompletion(c, p, c.sd);
  return (
    <div className="page">
      <h1 className="title">Frontend system design</h1>
      <p className="lede">One topic a week for weeks 1–14, then timed drills. Each topic covers the 14 aspects interviewers probe — {s.done} of {s.total} done.</p>
      <ol className="sd-list">
        {c.sd.map((d) => {
          const it = p.items[d.id];
          return (
            <li key={d.id} className={it?.s === 'done' ? 'is-done' : ''}>
              <span className="sd-week">W{d.w}</span>
              <div>
                <h3><button type="button" className="linkish" onClick={() => open(d.id)}>{d.n}</button></h3>
                <p className="muted small clamp">{d.asp[0]?.[1]}</p>
              </div>
              <div className="sd-ctl">
                {it?.score !== undefined && <span className="score">{it.score}</span>}
                <StatusSelect value={it?.s ?? ''} onChange={(st) => setItem(d.id, { s: st })} />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
