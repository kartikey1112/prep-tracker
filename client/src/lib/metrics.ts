import type { BankKey, Content, Progress } from '../types';
import { BANKS } from './catalog';
import { addDays, diffDays, planDay, todayISO } from './dates';

export const PASS_MARK = 70;
export const RULES = { minCompletion: 80, minTimed: 2, minMock: 2, minLoops: 4, wCompletion: 0.2, wTimed: 0.4, wMock: 0.4 };
export const REVISION_GAPS = [1, 3, 7, 14, 30];

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

export const isDayDone = (p: Progress, d: number) => {
  const t = p.days[d]?.tracks;
  return !!t && t.every(Boolean);
};
export const dayTracksDone = (p: Progress, d: number) => (p.days[d]?.tracks ?? []).filter(Boolean).length;
export const isDone = (p: Progress, id: string) => p.items[id]?.s === 'done';

export function bankCompletion(_c: Content, p: Progress, ids: { id: string }[]) {
  const done = ids.filter((x) => isDone(p, x.id)).length;
  return { done, total: ids.length, pct: pct(done, ids.length) };
}

export function jsStats(c: Content, p: Progress) {
  const attempted = c.js.filter((q) => p.js[q.id]);
  const correct = attempted.filter((q) => p.js[q.id] === q.ans).length;
  return {
    attempted: attempted.length, correct, total: c.js.length,
    attemptedPct: pct(attempted.length, c.js.length),
    accuracy: pct(correct, attempted.length),
    correctPct: pct(correct, c.js.length),
  };
}

export function mockLoops(c: Content, p: Progress) {
  const loops = new Map<string, { rounds: number; scored: number; scores: number[] }>();
  c.mocks.filter((m) => m.type.startsWith('Full mock')).forEach((m) => {
    const l = loops.get(m.type) ?? { rounds: 0, scored: 0, scores: [] };
    l.rounds++;
    const s = p.mocks[m.id]?.score;
    if (s !== undefined) { l.scored++; l.scores.push(s); }
    loops.set(m.type, l);
  });
  const list = [...loops.entries()].map(([name, l]) => ({ name, ...l, complete: l.scored === l.rounds }));
  return { list, completed: list.filter((l) => l.complete).length, total: list.length };
}

export interface AreaRow {
  area: string; completion: number; source: string;
  timedN: number; timedAvg: number; mockN: number; mockAvg: number;
  score: number; ready: boolean; gap: number;
}

export function scorecard(c: Content, p: Progress) {
  const bankPct = (k: BankKey) => bankCompletion(c, p, c.banks[k]).pct;
  const completionByArea: Record<string, [number, string]> = {
    DSA: [bankCompletion(c, p, c.dsa).pct, 'DSA problems completed'],
    'Machine coding': [bankCompletion(c, p, c.mc).pct, 'Machine coding builds completed'],
    JavaScript: [jsStats(c, p).correctPct, 'JS output questions answered correctly'],
    'System design': [bankCompletion(c, p, c.sd).pct, 'System design topics completed'],
  };
  BANKS.forEach((b) => { if (b.area) completionByArea[b.area] = [bankPct(b.key), `${b.label} questions completed`]; });
  const order = ['DSA', 'Machine coding', 'JavaScript', 'React', 'Next.js', 'System design', 'Browser fundamentals', 'TypeScript', 'Performance', 'Project discussion', 'Behavioral'];

  const rows: AreaRow[] = order.map((area) => {
    const scored = (full: boolean) => c.mocks
      .filter((m) => m.area === area && m.type.startsWith('Full mock') === full)
      .map((m) => p.mocks[m.id]?.score)
      .filter((s): s is number => s !== undefined);
    const timed = scored(false), mock = scored(true);
    const [completion, source] = completionByArea[area];
    const timedAvg = avg(timed), mockAvg = avg(mock);
    const score = Math.round(RULES.wCompletion * completion + RULES.wTimed * timedAvg + RULES.wMock * mockAvg);
    const ready = completion >= RULES.minCompletion && timed.length >= RULES.minTimed && mock.length >= RULES.minMock
      && timedAvg >= PASS_MARK && mockAvg >= PASS_MARK;
    return { area, completion, source, timedN: timed.length, timedAvg, mockN: mock.length, mockAvg, score, ready, gap: Math.max(0, PASS_MARK - score) };
  });
  const loops = mockLoops(c, p);
  const readyCount = rows.filter((r) => r.ready).length;
  const overall = avg(rows.map((r) => r.score));
  const weakest = [...rows].sort((a, b) => a.score - b.score || order.indexOf(a.area) - order.indexOf(b.area));
  const below = rows.length - readyCount;
  const verdict = below === 0 && loops.completed >= RULES.minLoops
    ? 'Interview ready'
    : below === 0
      ? `Areas ready — finish ${RULES.minLoops - loops.completed} more full mock loop(s)`
      : `Not ready yet: ${below} area${below === 1 ? '' : 's'} below the bar`;
  return { rows, overall, readyCount, loops, weakest, verdict, anyScore: rows.some((r) => r.timedN + r.mockN > 0) };
}

export function planStatus(c: Content, p: Progress) {
  const today = planDay(p.start);
  const completed = c.days.filter((d) => isDayDone(p, d.d)).length;
  const behind = c.days.filter((d) => d.d < today && !isDayDone(p, d.d)).length;
  const lastDate = addDays(p.start, c.days.length - 1);
  return {
    today, completed, behind, total: c.days.length,
    overall: pct(completed, c.days.length),
    calendarLeft: Math.max(0, diffDays(lastDate, todayISO()) + 1),
  };
}

export type RevisionStatus = 'overdue' | 'today' | 'upcoming' | 'finished';
export interface RevisionRow { id: string; first: string; count: number; next?: string; status: RevisionStatus }

export function revisions(c: Content, p: Progress): RevisionRow[] {
  const ids = [...c.dsa, ...c.mc, ...c.sd, ...BANKS.filter((b) => b.revise).flatMap((b) => c.banks[b.key])].map((x) => x.id);
  const today = todayISO();
  return ids.flatMap((id): RevisionRow[] => {
    const it = p.items[id];
    if (it?.s !== 'done' || !it.dt) return [];
    const count = p.revisions[id] ?? 0;
    if (count >= REVISION_GAPS.length) return [{ id, first: it.dt, count, status: 'finished' }];
    const next = addDays(it.dt, REVISION_GAPS[count]);
    const d = diffDays(next, today);
    return [{ id, first: it.dt, count, next, status: d < 0 ? 'overdue' : d === 0 ? 'today' : 'upcoming' }];
  });
}

export function weekStats(c: Content, p: Progress, w: number) {
  const days = c.days.filter((d) => d.w === w);
  const confs = days.map((d) => p.days[d.d]?.conf).filter((x): x is number => x !== undefined);
  const scores = (full: boolean) => c.mocks
    .filter((m) => m.w === w && m.type.startsWith('Full mock') === full)
    .map((m) => p.mocks[m.id]?.score).filter((s): s is number => s !== undefined);
  const done = days.filter((d) => isDayDone(p, d.d)).length;
  return {
    planned: days.length, done, pct: pct(done, days.length),
    conf: confs.length ? (confs.reduce((a, b) => a + b, 0) / confs.length).toFixed(1) : '–',
    assess: scores(false).length ? avg(scores(false)) : null,
    mock: scores(true).length ? avg(scores(true)) : null,
  };
}
