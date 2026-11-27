import type { BankKey, Content, Dsa, Js, Mc, Qa, Sd } from '../types';

export const TRACKS = ['DSA', 'Machine coding', 'System design', 'JS output', 'React / Next / theory', 'Revision'] as const;

export const BANKS: { key: BankKey; label: string; short: string; area?: string; revise: boolean }[] = [
  { key: 'react', label: 'React.js', short: 'React', area: 'React', revise: true },
  { key: 'next', label: 'Next.js', short: 'Next.js', area: 'Next.js', revise: true },
  { key: 'html', label: 'HTML, CSS & browser', short: 'Browser', area: 'Browser fundamentals', revise: true },
  { key: 'ts', label: 'TypeScript', short: 'TypeScript', area: 'TypeScript', revise: true },
  { key: 'perf', label: 'Frontend performance', short: 'Performance', area: 'Performance', revise: true },
  { key: 'test', label: 'Testing & security', short: 'Testing', revise: true },
  { key: 'proj', label: 'Project deep dive', short: 'Projects', area: 'Project discussion', revise: false },
  { key: 'beh', label: 'Behavioral', short: 'Behavioral', area: 'Behavioral', revise: false },
];

export type Entry =
  | { kind: 'dsa'; item: Dsa }
  | { kind: 'mc'; item: Mc }
  | { kind: 'sd'; item: Sd }
  | { kind: 'js'; item: Js }
  | { kind: 'qa'; item: Qa; bank: BankKey };

export function buildIndex(c: Content): Map<string, Entry> {
  const m = new Map<string, Entry>();
  c.dsa.forEach((item) => m.set(item.id, { kind: 'dsa', item }));
  c.mc.forEach((item) => m.set(item.id, { kind: 'mc', item }));
  c.sd.forEach((item) => m.set(item.id, { kind: 'sd', item }));
  c.js.forEach((item) => m.set(item.id, { kind: 'js', item }));
  (Object.keys(c.banks) as BankKey[]).forEach((bank) =>
    c.banks[bank].forEach((item) => m.set(item.id, { kind: 'qa', item, bank })));
  return m;
}

export function entryTitle(e: Entry): string {
  switch (e.kind) {
    case 'dsa': case 'mc': case 'sd': return e.item.n;
    case 'js': return `${e.item.topic} output question`;
    case 'qa': return e.item.q;
  }
}

/** Matches the IDs the Daily Task Tracker uses to point into the bank tabs. */
export const ID_RE = /\b(?:MC|SD|PD|D|Q|R|N|H|T|P|S|B)-\d{2,3}\b/g;
