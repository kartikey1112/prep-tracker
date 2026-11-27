import { pool } from './db.js';

export type Status = '' | 'prog' | 'done';

export interface DayProgress {
  tracks: boolean[];
  actual?: number;
  conf?: number;
  note?: string;
}

export interface ItemProgress {
  s: Status;
  dt?: string;
  conf?: number;
  note?: string;
  time?: number;
  score?: number;
}

export interface MockProgress {
  score?: number;
  feedback?: string;
}

export interface WeakEntry {
  id: string;
  date: string;
  area: string;
  obs: string;
  src: string;
  plan: string;
  target: string;
  status: 'Open' | 'In Progress' | 'Fixed';
}

export interface Progress {
  version: 1;
  start: string;
  updatedAt: string;
  days: Record<string, DayProgress>;
  items: Record<string, ItemProgress>;
  js: Record<string, string>;
  mocks: Record<string, MockProgress>;
  revisions: Record<string, number>;
  weak: WeakEntry[];
}

export function emptyProgress(start: string): Progress {
  return {
    version: 1,
    start,
    updatedAt: new Date().toISOString(),
    days: {},
    items: {},
    js: {},
    mocks: {},
    revisions: {},
    weak: [],
  };
}

/**
 * One progress document per user, stored as jsonb. Each update runs in a
 * transaction that locks that user's row, so concurrent writes never clobber
 * each other (even across several server instances).
 */
export class ProgressStore {
  constructor(private defaultStart: string) {}

  async get(userId: string): Promise<Progress> {
    const { rows } = await pool.query<{ data: Progress }>('SELECT data FROM progress WHERE user_id = $1', [userId]);
    return this.normalise(rows[0]?.data);
  }

  async update(userId: string, mutator: (draft: Progress) => void): Promise<Progress> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'INSERT INTO progress (user_id, data) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING',
        [userId, emptyProgress(this.defaultStart)]);
      const { rows } = await client.query<{ data: Progress }>(
        'SELECT data FROM progress WHERE user_id = $1 FOR UPDATE', [userId]);
      const draft = this.normalise(rows[0]?.data);
      mutator(draft);
      draft.updatedAt = new Date().toISOString();
      await client.query('UPDATE progress SET data = $2, updated_at = now() WHERE user_id = $1', [userId, draft]);
      await client.query('COMMIT');
      return draft;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  replace(userId: string, next: Progress): Promise<Progress> {
    return this.update(userId, (d) => Object.assign(d, next));
  }

  private normalise(raw: Partial<Progress> | undefined): Progress {
    return { ...emptyProgress(this.defaultStart), ...raw, version: 1 };
  }
}
