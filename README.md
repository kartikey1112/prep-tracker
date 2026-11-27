# Senior Frontend Prep Tracker

Your 16-week Senior Frontend / SDE-2 interview prep sheet, as a React + Node web app.

- **client/** — React 18 + TypeScript + Vite + React Router
- **server/** — Node + Express + TypeScript + Postgres. Email/password accounts; each user's progress is one `jsonb` row.

## Run it

Needs Node 22 and a Postgres database.

```bash
docker run -d --name prep-pg -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=prep -p 5434:5432 postgres:16-alpine
cp server/.env.example server/.env   # DATABASE_URL already points at the container above
npm install          # installs both client and server (npm workspaces)
npm run dev          # API on :4000, React app on http://localhost:5173
```

Tables are created automatically on startup.

Production (one process, Express serves the built React app):

```bash
npm run build
npm start            # http://localhost:4000
```

Env vars: `DATABASE_URL` (required), `PORT` (default 4000).

## Deploy to Render

1. Create a free Postgres database on [Neon](https://neon.tech) (or Supabase) and copy its connection string.
2. Push this folder to a GitHub repo.
3. In Render: **New → Blueprint**, pick the repo. `render.yaml` sets up one web service
   (build `npm ci --include=dev && npm run build`, start `npm start`, health check `/api/health`).
4. Paste the connection string when Render asks for `DATABASE_URL`, then deploy.

## Authentication

- Sign up / sign in with email + password (min 8 chars). Passwords are hashed with scrypt.
- Sessions: random token in an `httpOnly`, `SameSite=Lax` cookie (`Secure` in production), 30 days; only its SHA-256 is stored.
- Login and signup are rate-limited per IP (10 tries / 15 min).
- Every `/api/content` and `/api/progress/*` route requires a session and only touches the caller's own progress.

## What's in it (one page per sheet tab)

| Page | From the sheet |
| --- | --- |
| Today / `/day/:n` | Daily Task Tracker — 6 track checkboxes, actual time, confidence, notes; IDs like `D-001`, `MC-13`, `Q-004` open the item |
| Dashboard | Dashboard — completion, days behind, 112-day grid, per-track meters, week-by-week table |
| Roadmap | 112-Day Master Roadmap — phases, weekly overview, exit checks |
| DSA | DSA Problem Bank — 139 problems, filter by topic/difficulty/status |
| Machine coding | Machine Coding Tracker — 48 builds with full spec in a side drawer |
| System design | Frontend System Design — 14 topics × 14 aspects |
| JS output | JavaScript Output Questions — 154 MCQs as a quiz, with explanations |
| Theory banks | React, Next.js, HTML/CSS/Browser, TypeScript, Performance, Testing & Security, Project Deep Dive, Behavioral |
| Mocks | Mock Interview Tracker — weekly assessments + 8 full loops, scores drive readiness |
| Revision | Revision Tracker — auto-scheduled at +1, +3, +7, +14, +30 days from first completion |
| Readiness | Final Readiness Scorecard + Weak Areas + weakness log |
| Companies | Company Interview Experiences + common rejection reasons |
| Settings | Start date, JSON backup/restore, reset |

Readiness rules (same as the sheet): an area is Ready when bank completion ≥ 80%, ≥ 2 timed assessments, ≥ 2 full-mock rounds, and both averages ≥ 70. Area score = 20% completion + 40% timed + 40% mock.

## API

| Method | Path | Body |
| --- | --- | --- |
| POST | `/api/auth/signup`, `/api/auth/login` | `{ email, password }` |
| POST | `/api/auth/logout` | — |
| GET | `/api/auth/me` | — current user, or 401 |
| GET | `/api/content` | — roadmap data (`server/data/content.json`) |
| GET | `/api/progress` | — |
| PUT | `/api/progress/settings` | `{ start: "YYYY-MM-DD" }` |
| PATCH | `/api/progress/days/:day` | `{ tracks?: boolean[6], actual?, conf?, note? }` |
| PATCH | `/api/progress/items/:id` | `{ s?: "" \| "prog" \| "done", conf?, note?, time?, score?, dt? }` |
| PUT | `/api/progress/js/:id` | `{ answer: "A"-"D" \| null }` |
| PATCH | `/api/progress/mocks/:id` | `{ score?, feedback? }` |
| PUT | `/api/progress/revisions/:id` | `{ count: 0-5 }` |
| POST / PATCH / DELETE | `/api/progress/weak[/:id]` | weakness log entry |
| GET / POST | `/api/progress/export`, `/api/progress/import` | full progress JSON |
| POST | `/api/progress/reset` | — |

Send `null` for a field to clear it. Each write runs in a transaction that locks the user's row.

## Updating the roadmap content

`server/data/content.json` was generated from the Google Sheet. Edit it directly (or regenerate it) and restart the server.
