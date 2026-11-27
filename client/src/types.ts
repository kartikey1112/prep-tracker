// ---------- roadmap content (read-only, from the sheet) ----------
export interface Day {
  d: number; w: number; ph: string; ty: string; focus: string;
  mins: number[]; t: string[]; est: number; diff: string; links: string[];
}
export interface Week { w: number; ph: string; dsa: string; mc: string; sd: string; assess: string; exit: string }
export interface Dsa {
  id: string; n: string; u: string; diff: string; topic: string; pat: string;
  tc: string; sc: string; rec: number; freq: string; day: number;
}
export interface Mc {
  id: string; level: string; n: string; statement: string; req: string; bonus: string; ui: string;
  comps: string; state: string; api: string; edge: string; a11y: string; time: number; eval: string;
  tests: string; ref: string; reported: string; day: number;
}
export interface Sd { id: string; n: string; w: number; asp: [string, string][]; ref: string }
export interface Js {
  id: string; topic: string; diff: string; code: string; opts: string[];
  day: number; ans: string; exp: string; why: string;
}
export interface Qa { id: string; topic: string; q: string; type: string; diff: string; cov: string; fu: string; day: number }
export interface Company { co: string; role: string; date: string; src: string; rounds: string; tasks: string; prep: string; u: string; label: string }
export interface Rejection { reason: string; where: string; u: string }
export interface Mock { id: string; w: number; date: string; type: string; area: string; task: string; time: number }

export type BankKey = 'react' | 'next' | 'html' | 'ts' | 'perf' | 'test' | 'proj' | 'beh';

export interface Content {
  start: string;
  days: Day[]; weeks: Week[]; dsa: Dsa[]; mc: Mc[]; sd: Sd[]; js: Js[];
  banks: Record<BankKey, Qa[]>;
  comp: Company[]; rej: Rejection[]; mocks: Mock[];
  steps: Record<string, string>;
}

// ---------- progress (yours, saved by the server) ----------
export type Status = '' | 'prog' | 'done';
export interface DayProgress { tracks: boolean[]; actual?: number; conf?: number; note?: string }
export interface ItemProgress { s: Status; dt?: string; conf?: number; note?: string; time?: number; score?: number }
export interface MockProgress { score?: number; feedback?: string }
export interface WeakEntry {
  id: string; date: string; area: string; obs: string; src: string; plan: string; target: string;
  status: 'Open' | 'In Progress' | 'Fixed';
}
export interface Progress {
  version: 1; start: string; updatedAt: string;
  days: Record<string, DayProgress>;
  items: Record<string, ItemProgress>;
  js: Record<string, string>;
  mocks: Record<string, MockProgress>;
  revisions: Record<string, number>;
  weak: WeakEntry[];
}
