import { Router, type NextFunction, type Request, type Response } from 'express';
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { pool } from './db.js';

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

const COOKIE = 'sid';
const SESSION_DAYS = 30;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface AuthedRequest extends Request {
  userId: string;
}

export class AuthError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// ---------- passwords (scrypt, no native deps) ----------
export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(pw, salt, 64);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, keyB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, 'base64');
  const actual = await scryptAsync(pw, Buffer.from(saltB64, 'base64'), expected.length);
  return timingSafeEqual(actual, expected);
}

// A real hash to compare against when the email is unknown, so timing doesn't reveal which emails exist.
const dummyHash = hashPassword(randomBytes(16).toString('hex'));

// ---------- sessions (random token in an httpOnly cookie, only its hash stored) ----------
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

function readCookie(req: Request, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

async function startSession(res: Response, userId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await pool.query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [sha256(token), userId, expires]);
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires,
    path: '/',
  });
}

async function sessionUser(req: Request): Promise<{ id: string; email: string } | null> {
  const token = readCookie(req, COOKIE);
  if (!token) return null;
  const { rows } = await pool.query<{ id: string; email: string }>(
    `SELECT u.id, u.email FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`, [sha256(token)]);
  return rows[0] ?? null;
}

/** Rejects requests without a valid session; sets req.userId otherwise. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  sessionUser(req)
    .then((user) => {
      if (!user) { res.status(401).json({ error: 'Please sign in' }); return; }
      (req as AuthedRequest).userId = user.id;
      next();
    })
    .catch(next);
}

// ---------- brute-force guard (in memory; fine for a single instance) ----------
const attempts = new Map<string, { n: number; until: number }>();
const WINDOW = 15 * 60_000;
const MAX_ATTEMPTS = 10;

function throttle(key: string): void {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || a.until < now) { attempts.set(key, { n: 1, until: now + WINDOW }); return; }
  if (++a.n > MAX_ATTEMPTS) throw new AuthError(429, 'Too many attempts. Try again in 15 minutes.');
}
setInterval(() => {
  const now = Date.now();
  for (const [k, a] of attempts) if (a.until < now) attempts.delete(k);
}, WINDOW).unref();

function credentials(body: unknown): { email: string; password: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  const password = typeof b.password === 'string' ? b.password : '';
  if (!EMAIL.test(email) || email.length > 254) throw new AuthError(400, 'Enter a valid email address');
  if (password.length < 8) throw new AuthError(400, 'Password must be at least 8 characters');
  if (password.length > 200) throw new AuthError(400, 'Password is too long');
  return { email, password };
}

// ---------- routes ----------
const wrap = (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

export const authRouter = Router();

authRouter.get('/me', wrap(async (req, res) => {
  const user = await sessionUser(req);
  if (!user) { res.status(401).json({ error: 'Please sign in' }); return; }
  res.json(user);
}));

authRouter.post('/signup', wrap(async (req, res) => {
  throttle(`signup:${req.ip}`);
  const { email, password } = credentials(req.body);
  const id = randomUUID();
  const { rowCount } = await pool.query(
    'INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING',
    [id, email, await hashPassword(password)]);
  if (!rowCount) throw new AuthError(409, 'An account with this email already exists. Sign in instead.');
  await startSession(res, id);
  res.status(201).json({ id, email });
}));

authRouter.post('/login', wrap(async (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  const password = typeof b.password === 'string' ? b.password.slice(0, 200) : '';
  throttle(`login:${req.ip}:${email}`);
  const { rows } = await pool.query<{ id: string; password_hash: string }>(
    'SELECT id, password_hash FROM users WHERE email = $1', [email]);
  const user = rows[0];
  const ok = await verifyPassword(password, user?.password_hash ?? await dummyHash);
  if (!user || !ok) throw new AuthError(401, 'Wrong email or password');
  attempts.delete(`login:${req.ip}:${email}`);
  await startSession(res, user.id);
  res.json({ id: user.id, email });
}));

authRouter.post('/logout', wrap(async (req, res) => {
  const token = readCookie(req, COOKIE);
  if (token) await pool.query('DELETE FROM sessions WHERE token_hash = $1', [sha256(token)]);
  res.clearCookie(COOKIE, { path: '/' });
  res.json({ ok: true });
}));
