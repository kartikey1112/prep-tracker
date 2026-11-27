import { Link, useParams } from 'react-router-dom';
import { useStore } from '../store';
import { TRACKS } from '../lib/catalog';
import { dayDate, fmt, planDay } from '../lib/dates';
import { isDayDone, revisions } from '../lib/metrics';
import { BlurField, Confidence, Diff, ExtLink, Linkify, NumberField } from '../components/ui';

export function TodayPage() {
  const { content, progress, setDay, setMock } = useStore();
  const params = useParams();
  const todayN = planDay(progress.start);
  const fallback = Math.min(Math.max(todayN, 1), content.days.length);
  const n = params.day ? Math.min(Math.max(Number(params.day) || 1, 1), content.days.length) : fallback;
  const day = content.days[n - 1];
  const dp = progress.days[n] ?? { tracks: [false, false, false, false, false, false] };
  const done = isDayDone(progress, n);
  const due = revisions(content, progress).filter((r) => r.status === 'today' || r.status === 'overdue');
  const weekMocks = day.ty !== 'Preparation' ? content.mocks.filter((m) => m.w === day.w && m.type === 'Weekly assessment') : [];
  const isToday = n === todayN;

  const toggle = (i: number) => {
    const tracks = [...dp.tracks];
    tracks[i] = !tracks[i];
    setDay(n, { tracks });
  };

  return (
    <div className="page">
      {todayN < 1 && !params.day && (
        <p className="notice">Your plan starts on {fmt(progress.start, true)}. Here's Day 1 so you can see what's coming — change the start date in <Link to="/settings">Settings</Link>.</p>
      )}
      <div className="day-head">
        <div>
          <p className="eyebrow">{isToday ? 'Today · ' : ''}Week {day.w} · {day.ph} · {day.ty}</p>
          <h1 className="title">Day {n} <span>{fmt(dayDate(progress.start, n), true)}</span></h1>
          <p className="lede">{day.focus}</p>
        </div>
        <div className="day-nav">
          <Link className={`btn ghost ${n <= 1 ? 'disabled' : ''}`} to={`/day/${Math.max(1, n - 1)}`}>← Day {Math.max(1, n - 1)}</Link>
          {!isToday && todayN >= 1 && todayN <= content.days.length && <Link className="btn ghost" to="/today">Today</Link>}
          <Link className={`btn ghost ${n >= content.days.length ? 'disabled' : ''}`} to={`/day/${Math.min(content.days.length, n + 1)}`}>Day {Math.min(content.days.length, n + 1)} →</Link>
        </div>
      </div>

      <div className="day-grid">
        <ol className="tracks">
          {TRACKS.map((label, i) => (
            <li key={label} className={dp.tracks[i] ? 'checked' : ''}>
              <label className="check">
                <input type="checkbox" checked={!!dp.tracks[i]} onChange={() => toggle(i)} />
                <span className="track-name">{label}</span>
                <span className="mins">{day.mins[i]} min</span>
              </label>
              <p className="track-text"><Linkify text={day.t[i]} /></p>
            </li>
          ))}
        </ol>

        <aside className="day-side">
          <div className={`daystate ${done ? 'ok' : ''}`}>
            <b>{done ? 'Day complete' : `${dp.tracks.filter(Boolean).length} of 6 tracks done`}</b>
            <span>Estimated {day.est} min · <Diff d={day.diff} /></span>
          </div>
          <label>Actual time (min)
            <NumberField label="Actual time" min={0} max={1440} value={dp.actual} onSave={(actual) => setDay(n, { actual })} placeholder={String(day.est)} />
          </label>
          <label>How confident do you feel?
            <Confidence value={dp.conf} onChange={(conf) => setDay(n, { conf })} />
          </label>
          <label className="block">Notes
            <BlurField multiline label="Day notes" value={dp.note} onSave={(note) => setDay(n, { note })} placeholder="What clicked, what didn't…" />
          </label>
          {isToday && (
            <Link to="/revision" className={`revcard ${due.length ? 'hot' : ''}`}>
              <b>{due.length}</b> revision{due.length === 1 ? '' : 's'} due {due.length ? '— clear these first' : 'today'}
            </Link>
          )}
          {day.links.length > 0 && (
            <div>
              <h3 className="mini">Reference links</h3>
              <ul className="links">{day.links.map((u) => <li key={u}><ExtLink href={u}>{u.replace(/^https:\/\/(www\.)?/, '').slice(0, 48)}</ExtLink></li>)}</ul>
            </div>
          )}
        </aside>
      </div>

      {weekMocks.length > 0 && (
        <section className="panel">
          <header className="panel-head"><h2>Week {day.w} assessment — enter scores right after each round</h2></header>
          <table className="stack">
            <thead><tr><th>Area</th><th>Task</th><th>Time</th><th>Score</th></tr></thead>
            <tbody>
              {weekMocks.map((m) => (
                <tr key={m.id}>
                  <td>{m.area}</td><td>{m.task}</td><td className="nowrap">{m.time} min</td>
                  <td><NumberField label={`${m.area} score`} min={0} max={100} value={progress.mocks[m.id]?.score} onSave={(score) => setMock(m.id, { score })} placeholder="0-100" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
