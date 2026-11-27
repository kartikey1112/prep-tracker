import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Content, DayProgress, ItemProgress, MockProgress, Progress, WeakEntry } from './types';
import { api, type Patch } from './lib/api';
import { buildIndex, type Entry } from './lib/catalog';
import { todayISO } from './lib/dates';

function applyPatch<T extends object>(base: T, patch: Patch<T>): T {
  const next = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined) delete next[k]; else next[k] = v;
  }
  return next as T;
}

interface Store {
  content: Content;
  progress: Progress;
  index: Map<string, Entry>;
  saving: boolean;
  error: string | null;
  openId: string | null;
  open: (id: string | null) => void;
  setDay: (n: number, patch: Patch<DayProgress>) => void;
  setItem: (id: string, patch: Patch<ItemProgress>) => void;
  answerJs: (id: string, answer: string | null) => void;
  setMock: (id: string, patch: Patch<MockProgress>) => void;
  setRevision: (id: string, count: number) => void;
  addWeak: (w: Omit<WeakEntry, 'id'>) => void;
  patchWeak: (id: string, w: Partial<WeakEntry>) => void;
  deleteWeak: (id: string) => void;
  setStart: (iso: string) => void;
  importProgress: (data: unknown) => Promise<void>;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside provider');
  return s;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<Content | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [openId, open] = useState<string | null>(null);
  const seq = useRef(0);
  const snapshot = useRef<Progress | null>(null);

  useEffect(() => {
    Promise.all([api.content(), api.progress()])
      .then(([c, p]) => { setContent(c); setProgress(p); })
      .catch((e: Error) => setLoadError(e.message));
  }, []);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  /** Optimistic update: apply locally, then reconcile with the server's copy. */
  const mutate = useCallback((local: (p: Progress) => Progress, remote: () => Promise<Progress>) => {
    setProgress((p) => {
      if (!p) return p;
      if (!snapshot.current) snapshot.current = p;
      return local(p);
    });
    const mine = ++seq.current;
    setPending((n) => n + 1);
    remote()
      .then((server) => { if (mine === seq.current) { setProgress(server); snapshot.current = null; } })
      .catch((e: Error) => {
        setError(e.message);
        api.progress().then(setProgress).catch(() => snapshot.current && setProgress(snapshot.current));
        snapshot.current = null;
      })
      .finally(() => setPending((n) => n - 1));
  }, []);

  const store = useMemo<Store | null>(() => {
    if (!content || !progress) return null;
    return {
      content, progress, index: buildIndex(content), saving: pending > 0, error, openId, open,
      setDay: (n, patch) => mutate(
        (p) => ({ ...p, days: { ...p.days, [n]: applyPatch(p.days[n] ?? { tracks: [false, false, false, false, false, false] }, patch) } }),
        () => api.patchDay(n, patch)),
      setItem: (id, patch) => {
        const full: Patch<ItemProgress> = patch.s === 'done' && !progress.items[id]?.dt ? { ...patch, dt: todayISO() } : patch;
        mutate((p) => {
          const item = applyPatch(p.items[id] ?? { s: '' }, full);
          const revisions = { ...p.revisions };
          if (item.s !== 'done') { delete item.dt; delete revisions[id]; }
          return { ...p, items: { ...p.items, [id]: item }, revisions };
        }, () => api.patchItem(id, full));
      },
      answerJs: (id, answer) => mutate((p) => {
        const js = { ...p.js };
        if (answer) js[id] = answer; else delete js[id];
        return { ...p, js };
      }, () => api.answerJs(id, answer)),
      setMock: (id, patch) => mutate(
        (p) => ({ ...p, mocks: { ...p.mocks, [id]: applyPatch(p.mocks[id] ?? {}, patch) } }),
        () => api.patchMock(id, patch)),
      setRevision: (id, count) => mutate(
        (p) => ({ ...p, revisions: { ...p.revisions, [id]: count } }),
        () => api.setRevision(id, count)),
      addWeak: (w) => mutate((p) => ({ ...p, weak: [{ ...w, id: `tmp-${Date.now()}` }, ...p.weak] }), () => api.addWeak(w)),
      patchWeak: (id, w) => mutate((p) => ({ ...p, weak: p.weak.map((x) => (x.id === id ? { ...x, ...w } : x)) }), () => api.patchWeak(id, w)),
      deleteWeak: (id) => mutate((p) => ({ ...p, weak: p.weak.filter((x) => x.id !== id) }), () => api.deleteWeak(id)),
      setStart: (iso) => mutate((p) => ({ ...p, start: iso }), () => api.setStart(iso)),
      importProgress: async (data) => { setProgress(await api.importProgress(data)); },
      reset: () => mutate((p) => ({ ...p, days: {}, items: {}, js: {}, mocks: {}, revisions: {}, weak: [] }), () => api.reset()),
    };
  }, [content, progress, pending, error, openId, mutate]);

  if (loadError) {
    return (
      <div className="boot">
        <h1>Can't reach the API</h1>
        <p>{loadError}. Check that the server is running, then reload the page.</p>
      </div>
    );
  }
  if (!store) return <div className="boot"><p>Loading your roadmap…</p></div>;
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
