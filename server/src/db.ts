import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Copy server/.env.example to server/.env and fill it in.');
  process.exit(1);
}

// Hosted Postgres (Neon, Supabase, Render) needs TLS; a local database usually doesn't.
const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
export const pool = new pg.Pool({
  connectionString: url,
  ssl: local || /sslmode=disable/.test(url) ? undefined : { rejectUnauthorized: false },
  max: 5,
});

/** Creates the tables on startup. Safe to run every boot. */
export async function migrate(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            uuid PRIMARY KEY,
      email         text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      created_at    timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash text PRIMARY KEY,
      user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS progress (
      user_id    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      data       jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await pool.query('DELETE FROM sessions WHERE expires_at < now()');
}
