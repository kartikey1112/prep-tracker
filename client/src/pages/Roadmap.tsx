import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { dayDate, fmt, planDay } from '../lib/dates';
import { isDayDone, dayTracksDone, weekStats } from '../lib/metrics';

const PHASE_MINS: [string, number[]][] = [
  ['Foundations', [35, 40, 25, 15, 30, 15]],
  ['Intermediate', [35, 45, 25, 10, 30, 15]],
  ['Advanced', [40, 40, 30, 10, 25, 15]],
  ['Interview simulation', [40, 60, 30, 10, 15, 15]],
];

export function RoadmapPage() {
  const { content: c, progress: p } = useStore();
  const today = planDay(p.start);
  return (
    <div className="page">
      <h1 className="title">112-day master roadmap</h1>
      <p className="lede">Every track runs in parallel from Day 1: six preparation days and one revision-and-assessment day each week.</p>

      <div className="phases">
        {PHASE_MINS.map(([ph, m]) => (
          <div key={ph} className={`phase ph-${ph.split(' ')[0].toLowerCase()}`}>
            <b>{ph}</b>
            <span>DSA {m[0]} · MC {m[1]} · SD {m[2]} · JS {m[3]} · Theory {m[4]} · Rev {m[5]} min</span>
          </div>
        ))}
      </div>

      <div className="weeks">
        {c.weeks.map((w) => {
          const s = weekStats(c, p, w.w);
          const days = c.days.filter((d) => d.w === w.w);
          const current = days.some((d) => d.d === today);
          return (
            <article key={w.w} className={`week ${current ? 'current' : ''}`}>
              <header>
                <h2>Week {w.w}</h2>
                <span className={`phase-tag ph-${w.ph.split(' ')[0].toLowerCase()}`}>{w.ph}</span>
                <span className="muted">{fmt(dayDate(p.start, days[0].d))} – {fmt(dayDate(p.start, days[days.length - 1].d))}</span>
                <b className="wk-pct">{s.done}/7</b>
              </header>
              <div className="wk-days">
                {days.map((d) => (
                  <Link key={d.d} to={`/day/${d.d}`} title={d.focus}
                    className={`wk-day ${isDayDone(p, d.d) ? 'done' : dayTracksDone(p, d.d) ? 'part' : ''} ${d.d === today ? 'now' : ''}`}>
                    <span>{fmt(dayDate(p.start, d.d)).split(',')[0]}</span><b>{d.d}</b>
                  </Link>
                ))}
              </div>
              <dl className="wk-list">
                <div><dt>DSA</dt><dd>{w.dsa}</dd></div>
                <div><dt>Machine coding</dt><dd>{w.mc}</dd></div>
                <div><dt>System design</dt><dd>{w.sd}</dd></div>
                <div><dt>Day 7 assessment</dt><dd>{w.assess}</dd></div>
                <div><dt>Exit check</dt><dd>{w.exit}</dd></div>
              </dl>
            </article>
          );
        })}
      </div>
    </div>
  );
}
