import { useStore } from '../store';
import { BANKS } from '../lib/catalog';
import { fmt } from '../lib/dates';
import { bankCompletion, jsStats, mockLoops, planStatus, scorecard, weekStats } from '../lib/metrics';
import { Meter, PlanGrid, Section } from '../components/ui';

export function DashboardPage() {
  const { content: c, progress: p } = useStore();
  const ps = planStatus(c, p);
  const js = jsStats(c, p);
  const sc = scorecard(c, p);
  const loops = mockLoops(c, p);
  const reactNext = bankCompletion(c, p, [...c.banks.react, ...c.banks.next]);
  const allMockScores = c.mocks.filter((m) => m.type.startsWith('Full mock')).map((m) => p.mocks[m.id]?.score).filter((x): x is number => x !== undefined);
  const assess = c.mocks.filter((m) => m.type === 'Weekly assessment').map((m) => p.mocks[m.id]?.score).filter((x): x is number => x !== undefined);
  const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

  return (
    <div className="page">
      <h1 className="title">{sc.verdict}</h1>
      <p className="lede">{ps.today < 1 ? 'Starts' : 'Started'} {fmt(p.start, true)} · {ps.calendarLeft} calendar days left in the plan</p>

      <div className="kpis">
        <div className="kpi"><span>Overall completion</span><b>{ps.overall}%</b><small>{ps.completed} of {ps.total} days</small></div>
        <div className="kpi"><span>Days behind</span><b className={ps.behind ? 'warn' : ''}>{ps.behind}</b><small>past days not finished</small></div>
        <div className="kpi"><span>Readiness score</span><b>{sc.overall}%</b><small>{sc.readyCount} of {sc.rows.length} areas ready</small></div>
        <div className="kpi"><span>Full mock loops</span><b>{loops.completed}/{loops.total}</b><small>avg score {mean(allMockScores)}</small></div>
      </div>

      <div className="two">
        <Section title="The 112 days">
          <PlanGrid />
          <p className="legend"><i className="lg done" />done <i className="lg part" />partly done <i className="lg missed" />missed <i className="lg assess" />assessment day</p>
        </Section>
        <Section title="Tracks">
          <div className="meters">
            <Meter label="DSA" value={bankCompletion(c, p, c.dsa).pct} sub={`${bankCompletion(c, p, c.dsa).done} of ${c.dsa.length} problems`} />
            <Meter label="Machine coding" value={bankCompletion(c, p, c.mc).pct} sub={`${bankCompletion(c, p, c.mc).done} of ${c.mc.length} builds`} />
            <Meter label="System design" value={bankCompletion(c, p, c.sd).pct} sub={`${bankCompletion(c, p, c.sd).done} of ${c.sd.length} topics`} />
            <Meter label="JS questions attempted" value={js.attemptedPct} sub={`${js.attempted} of ${js.total} · ${js.accuracy}% accuracy`} />
            <Meter label="React and Next.js" value={reactNext.pct} sub={`${reactNext.done} of ${reactNext.total} questions`} />
            {BANKS.filter((b) => !['react', 'next'].includes(b.key)).map((b) => {
              const s = bankCompletion(c, p, c.banks[b.key]);
              return <Meter key={b.key} label={b.label} value={s.pct} sub={`${s.done} of ${s.total}`} />;
            })}
          </div>
        </Section>
      </div>

      <div className="two">
        <Section title="Weakest areas">
          {sc.anyScore ? (
            <ol className="weak">
              {sc.weakest.slice(0, 3).map((r) => <li key={r.area}><b>{r.area}</b> <span>score {r.score} · {c.steps[r.area]}</span></li>)}
            </ol>
          ) : <p className="muted">No scores yet — enter your first weekly assessment scores and this fills in. Average weekly assessment so far: {mean(assess)}.</p>}
        </Section>
        <Section title="Week by week">
          <div className="scroll">
            <table className="num-table">
              <thead><tr><th>Week</th><th>Done</th><th>Completion</th><th>Avg conf.</th><th>Assessment</th><th>Full mock</th></tr></thead>
              <tbody>
                {c.weeks.map((w) => {
                  const s = weekStats(c, p, w.w);
                  return (
                    <tr key={w.w}>
                      <td>W{w.w}</td><td>{s.done}/{s.planned}</td>
                      <td><div className="cellbar"><i style={{ width: `${s.pct}%` }} /><span>{s.pct}%</span></div></td>
                      <td>{s.conf}</td><td>{s.assess ?? '–'}</td><td>{s.mock ?? '–'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </div>
  );
}
