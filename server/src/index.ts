import './env.js';
import express, { type NextFunction, type Request, type Response } from 'express';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { ProgressStore, type ItemProgress, type Progress, type Status, type WeakEntry } from './store.js';
import { migrate } from './db.js';
import { AuthError, authRouter, requireAuth, type AuthedRequest } from './auth.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const PORT = Number(process.env.PORT ?? 4000);
const CONTENT_FILE = path.join(root, 'data', 'content.json');

// ---------- content (read-only roadmap from the Google Sheet) ----------
interface Content {
  start: string;
  days: { d: number }[];
  dsa: { id: string }[];
  mc: { id: string }[];
  sd: { id: string }[];
  js: { id: string; opts: string[] }[];
  banks: Record<string, { id: string }[]>;
  mocks: { id: string }[];
}
const content = JSON.parse(readFileSync(CONTENT_FILE, 'utf8')) as Content;
const itemIds = new Set<string>([
  ...content.dsa, ...content.mc, ...content.sd,
  ...Object.values(content.banks).flat(),
].map((x) => x.id));
const jsIds = new Set(content.js.map((q) => q.id));
const mockIds = new Set(content.mocks.map((m) => m.id));
const dayCount = content.days.length;

const store = new ProgressStore(content.start);
const uid = (req: Request) => (req as AuthedRequest).userId;

// ---------- validation helpers ----------
class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const STATUSES: Status[] = ['', 'prog', 'done'];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

function optInt(v: unknown, min: number, max: number, field: string): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(400, `${field} must be between ${min} and ${max}`);
  return Math.round(n);
}
function optText(v: unknown, field: string, max = 4000): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'string') throw new HttpError(400, `${field} must be text`);
  return v.slice(0, max);
}
function optDate(v: unknown, field: string): string | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v !== 'string' || !ISO.test(v)) throw new HttpError(400, `${field} must be YYYY-MM-DD`);
  return v;
}
/** Applies only the keys present in body; `null` clears a field. */
function patchFields<T extends object>(target: T, body: Record<string, unknown>, parsers: Record<string, (v: unknown) => unknown>) {
  for (const [key, parse] of Object.entries(parsers)) {
    if (!(key in body)) continue;
    const value = body[key] === null ? undefined : parse(body[key]);
    if (value === undefined) delete (target as Record<string, unknown>)[key];
    else (target as Record<string, unknown>)[key] = value;
  }
}

const wrap = (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

// ---------- app ----------
const app = express();
app.set('trust proxy', 1); // Render terminates TLS in front of us; needed for secure cookies and req.ip
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => { res.json({ ok: true }); });
app.use('/api/auth', authRouter);

// Everything below needs a signed-in user.
app.use(['/api/content', '/api/progress'], requireAuth);
app.get('/api/content', (_req, res) => { res.sendFile(CONTENT_FILE); });
app.get('/api/progress', wrap(async (req, res) => { res.json(await store.get(uid(req))); }));

app.put('/api/progress/settings', wrap(async (req, res) => {
  const start = optDate(req.body?.start, 'start');
  if (!start) throw new HttpError(400, 'start is required');
  res.json(await store.update(uid(req), (d) => { d.start = start; }));
}));

app.patch('/api/progress/days/:day', wrap(async (req, res) => {
  const n = Number(req.params.day);
  if (!Number.isInteger(n) || n < 1 || n > dayCount) throw new HttpError(404, 'Unknown day');
  const body = (req.body ?? {}) as Record<string, unknown>;
  res.json(await store.update(uid(req), (d) => {
    const day = d.days[n] ?? { tracks: [false, false, false, false, false, false] };
    if ('tracks' in body) {
      const t = body.tracks;
      if (!Array.isArray(t) || t.length !== 6 || !t.every((x) => typeof x === 'boolean')) throw new HttpError(400, 'tracks must be 6 booleans');
      day.tracks = t;
    }
    patchFields(day, body, {
      actual: (v) => optInt(v, 0, 1440, 'actual'),
      conf: (v) => optInt(v, 1, 5, 'conf'),
      note: (v) => optText(v, 'note'),
    });
    d.days[n] = day;
  }));
}));

app.patch('/api/progress/items/:id', wrap(async (req, res) => {
  const id = req.params.id;
  if (!itemIds.has(id)) throw new HttpError(404, 'Unknown item');
  const body = (req.body ?? {}) as Record<string, unknown>;
  res.json(await store.update(uid(req), (d) => {
    const item: ItemProgress = d.items[id] ?? { s: '' };
    if ('s' in body) {
      if (!STATUSES.includes(body.s as Status)) throw new HttpError(400, 'Invalid status');
      item.s = body.s as Status;
    }
    patchFields(item, body, {
      dt: (v) => optDate(v, 'dt'),
      conf: (v) => optInt(v, 1, 5, 'conf'),
      note: (v) => optText(v, 'note'),
      time: (v) => optInt(v, 0, 1440, 'time'),
      score: (v) => optInt(v, 0, 100, 'score'),
    });
    // A completed item needs a first-done date: it drives the revision schedule.
    if (item.s === 'done' && !item.dt) item.dt = new Date().toISOString().slice(0, 10);
    if (item.s !== 'done') { delete item.dt; delete d.revisions[id]; }
    d.items[id] = item;
  }));
}));

app.put('/api/progress/js/:id', wrap(async (req, res) => {
  const id = req.params.id;
  if (!jsIds.has(id)) throw new HttpError(404, 'Unknown question');
  const answer = req.body?.answer as unknown;
  if (answer !== null && !['A', 'B', 'C', 'D'].includes(answer as string)) throw new HttpError(400, 'answer must be A-D or null');
  res.json(await store.update(uid(req), (d) => {
    if (answer === null) delete d.js[id]; else d.js[id] = answer as string;
  }));
}));

app.patch('/api/progress/mocks/:id', wrap(async (req, res) => {
  const id = req.params.id;
  if (!mockIds.has(id)) throw new HttpError(404, 'Unknown mock');
  const body = (req.body ?? {}) as Record<string, unknown>;
  res.json(await store.update(uid(req), (d) => {
    const m = d.mocks[id] ?? {};
    patchFields(m, body, {
      score: (v) => optInt(v, 0, 100, 'score'),
      feedback: (v) => optText(v, 'feedback'),
    });
    d.mocks[id] = m;
  }));
}));

app.put('/api/progress/revisions/:id', wrap(async (req, res) => {
  const id = req.params.id;
  if (!itemIds.has(id)) throw new HttpError(404, 'Unknown item');
  const count = optInt(req.body?.count, 0, 5, 'count') ?? 0;
  res.json(await store.update(uid(req), (d) => {
    if (d.items[id]?.s !== 'done') throw new HttpError(409, 'Complete the item before revising it');
    d.revisions[id] = count;
  }));
}));

function parseWeak(body: Record<string, unknown>, base?: WeakEntry): WeakEntry {
  const status = (body.status ?? base?.status ?? 'Open') as WeakEntry['status'];
  if (!['Open', 'In Progress', 'Fixed'].includes(status)) throw new HttpError(400, 'Invalid status');
  const entry: WeakEntry = {
    id: base?.id ?? randomUUID(),
    date: optDate(body.date, 'date') ?? base?.date ?? new Date().toISOString().slice(0, 10),
    area: optText(body.area, 'area', 80) ?? base?.area ?? '',
    obs: optText(body.obs, 'obs') ?? base?.obs ?? '',
    src: optText(body.src, 'src', 200) ?? base?.src ?? '',
    plan: optText(body.plan, 'plan') ?? base?.plan ?? '',
    target: optDate(body.target, 'target') ?? base?.target ?? '',
    status,
  };
  if (!entry.area || !entry.obs) throw new HttpError(400, 'area and obs are required');
  return entry;
}

app.post('/api/progress/weak', wrap(async (req, res) => {
  const entry = parseWeak(req.body ?? {});
  res.status(201).json(await store.update(uid(req), (d) => { d.weak.unshift(entry); }));
}));
app.patch('/api/progress/weak/:id', wrap(async (req, res) => {
  res.json(await store.update(uid(req), (d) => {
    const i = d.weak.findIndex((w) => w.id === req.params.id);
    if (i < 0) throw new HttpError(404, 'Unknown entry');
    d.weak[i] = parseWeak(req.body ?? {}, d.weak[i]);
  }));
}));
app.delete('/api/progress/weak/:id', wrap(async (req, res) => {
  res.json(await store.update(uid(req), (d) => { d.weak = d.weak.filter((w) => w.id !== req.params.id); }));
}));

app.get('/api/progress/export', wrap(async (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="prep-progress.json"');
  res.json(await store.get(uid(req)));
}));
app.post('/api/progress/import', wrap(async (req, res) => {
  const b = req.body as Partial<Progress> | undefined;
  if (!b || b.version !== 1 || typeof b.days !== 'object' || typeof b.items !== 'object') throw new HttpError(400, 'Not a progress export');
  res.json(await store.replace(uid(req), {
    version: 1, start: optDate(b.start, 'start') ?? content.start, updatedAt: '',
    days: b.days ?? {}, items: b.items ?? {}, js: b.js ?? {}, mocks: b.mocks ?? {},
    revisions: b.revisions ?? {}, weak: Array.isArray(b.weak) ? b.weak : [],
  }));
}));
app.post('/api/progress/reset', wrap(async (req, res) => {
  res.json(await store.update(uid(req), (d) => {
    Object.assign(d, { days: {}, items: {}, js: {}, mocks: {}, revisions: {}, weak: [] });
  }));
}));

app.use('/api', (_req, res) => { res.status(404).json({ error: 'Not found' }); });

// In production the API also serves the built React app.
const clientDist = path.resolve(root, '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => { res.sendFile(path.join(clientDist, 'index.html')); });
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError || err instanceof AuthError) { res.status(err.status).json({ error: err.message }); return; }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

await migrate();
app.listen(PORT, () => console.log(`Prep tracker API on http://localhost:${PORT}`));
