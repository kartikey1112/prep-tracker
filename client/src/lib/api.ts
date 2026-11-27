import type { Content, DayProgress, ItemProgress, MockProgress, Progress, WeakEntry } from '../types';

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  // An expired session mid-use sends the app back to the sign-in screen.
  if (res.status === 401 && !url.startsWith('/api/auth/')) window.dispatchEvent(new Event('auth:expired'));
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}
const send = <T>(method: string, url: string, body?: unknown) =>
  req<T>(url, { method, body: body === undefined ? undefined : JSON.stringify(body) });

/** Partial update where `null` clears a field on the server. */
type Patch<T> = { [K in keyof T]?: T[K] | null };

export interface User { id: string; email: string }

export const auth = {
  me: () => req<User>('/api/auth/me'),
  login: (email: string, password: string) => send<User>('POST', '/api/auth/login', { email, password }),
  signup: (email: string, password: string) => send<User>('POST', '/api/auth/signup', { email, password }),
  logout: () => send<{ ok: true }>('POST', '/api/auth/logout'),
};

export const api = {
  content: () => req<Content>('/api/content'),
  progress: () => req<Progress>('/api/progress'),
  setStart: (start: string) => send<Progress>('PUT', '/api/progress/settings', { start }),
  patchDay: (n: number, p: Patch<DayProgress>) => send<Progress>('PATCH', `/api/progress/days/${n}`, p),
  patchItem: (id: string, p: Patch<ItemProgress>) => send<Progress>('PATCH', `/api/progress/items/${id}`, p),
  answerJs: (id: string, answer: string | null) => send<Progress>('PUT', `/api/progress/js/${id}`, { answer }),
  patchMock: (id: string, p: Patch<MockProgress>) => send<Progress>('PATCH', `/api/progress/mocks/${id}`, p),
  setRevision: (id: string, count: number) => send<Progress>('PUT', `/api/progress/revisions/${id}`, { count }),
  addWeak: (w: Omit<WeakEntry, 'id'>) => send<Progress>('POST', '/api/progress/weak', w),
  patchWeak: (id: string, w: Partial<WeakEntry>) => send<Progress>('PATCH', `/api/progress/weak/${id}`, w),
  deleteWeak: (id: string) => send<Progress>('DELETE', `/api/progress/weak/${id}`),
  importProgress: (p: unknown) => send<Progress>('POST', '/api/progress/import', p),
  reset: () => send<Progress>('POST', '/api/progress/reset'),
};
export type { Patch };
