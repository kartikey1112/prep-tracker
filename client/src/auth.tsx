import { Fragment, createContext, useCallback, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { auth, type User } from './lib/api';

interface Auth {
  user: User;
  logout: () => void;
}

const Ctx = createContext<Auth | null>(null);

export function useAuth(): Auth {
  const a = useContext(Ctx);
  if (!a) throw new Error('useAuth outside provider');
  return a;
}

/** Shows the sign-in screen until there is a session, then renders the app for that user. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    auth.me().then(setUser).catch(() => setUser(null));
    const expired = () => setUser(null);
    window.addEventListener('auth:expired', expired);
    return () => window.removeEventListener('auth:expired', expired);
  }, []);

  const logout = useCallback(() => {
    auth.logout().finally(() => setUser(null));
  }, []);

  if (user === undefined) return <div className="boot"><p>Loading…</p></div>;
  if (!user) return <SignIn onUser={setUser} />;
  // key: a different user gets a fresh store, never the previous user's progress.
  return <Ctx.Provider value={{ user, logout }}><Fragment key={user.id}>{children}</Fragment></Ctx.Provider>;
}

function SignIn({ onUser }: { onUser: (u: User) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const signup = mode === 'signup';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onUser(await (signup ? auth.signup : auth.login)(email, password));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-brand">
        <h1>Senior Frontend prep</h1>
        <p>16 weeks · SDE-2 / Senior Frontend</p>
      </div>
      <form className="auth-card" onSubmit={submit}>
        <h2>{signup ? 'Create your account' : 'Sign in'}</h2>
        <label>Email
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>Password
          <input type="password" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={signup ? 8 : undefined}
            value={password} onChange={(e) => setPassword(e.target.value)} />
          {signup && <small className="muted">At least 8 characters.</small>}
        </label>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button type="submit" className="primary" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</button>
        <p className="small muted">
          {signup ? 'Already have an account? ' : 'New here? '}
          <button type="button" className="linkish" onClick={() => { setMode(signup ? 'login' : 'signup'); setError(''); }}>
            {signup ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </form>
    </div>
  );
}
