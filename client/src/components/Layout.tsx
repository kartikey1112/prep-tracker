import { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useStore } from '../store';
import { useAuth } from '../auth';
import { planStatus, revisions, scorecard } from '../lib/metrics';
import { ItemDrawer } from './ItemDrawer';

const NAV = [
  ['/today', 'Today'],
  ['/dashboard', 'Dashboard'],
  ['/roadmap', 'Roadmap'],
  ['/dsa', 'DSA'],
  ['/machine-coding', 'Machine coding'],
  ['/system-design', 'System design'],
  ['/js', 'JS output'],
  ['/theory', 'Theory banks'],
  ['/mocks', 'Mocks'],
  ['/revision', 'Revision'],
  ['/scorecard', 'Readiness'],
  ['/companies', 'Companies'],
  ['/settings', 'Settings'],
] as const;

/** On phones, stacked tables label each cell with its column header. */
function useStackLabels() {
  useEffect(() => {
    const label = () => {
      document.querySelectorAll<HTMLTableCellElement>('.stack td:not([data-l])').forEach((td) => {
        const head = td.closest('table')?.tHead?.rows[0]?.cells[td.cellIndex];
        td.dataset.l = head?.textContent ?? '';
      });
    };
    label();
    const mo = new MutationObserver(label);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);
}

export function Layout() {
  useStackLabels();
  const { content, progress, saving, error } = useStore();
  const { user, logout } = useAuth();
  const ps = planStatus(content, progress);
  const due = revisions(content, progress).filter((r) => r.status === 'today' || r.status === 'overdue').length;
  const sc = scorecard(content, progress);
  const dayLabel = ps.today < 1 ? `Starts in ${1 - ps.today} day${ps.today === 0 ? '' : 's'}` : ps.today > ps.total ? 'Plan finished' : `Day ${ps.today} of ${ps.total}`;

  return (
    <div className="shell">
      <header className="strip">
        <div className="strip-title">
          <h1>Senior Frontend prep</h1>
          <span>16 weeks · SDE-2 / Senior Frontend · ₹15–25 LPA</span>
        </div>
        <dl className="strip-stats">
          <div><dt>Plan</dt><dd>{dayLabel}</dd></div>
          <div><dt>Days done</dt><dd>{ps.completed}/{ps.total}</dd></div>
          <div><dt>Behind</dt><dd>{ps.behind}</dd></div>
          <div><dt>Readiness</dt><dd>{sc.overall}%</dd></div>
        </dl>
        <span className={`save ${saving ? 'busy' : ''}`} aria-live="polite">{saving ? 'Saving…' : 'Saved'}</span>
        <div className="account">
          <span title={user.email}>{user.email}</span>
          <button type="button" onClick={logout}>Sign out</button>
        </div>
      </header>
      <nav className="nav" aria-label="Sections">
        {NAV.map(([to, label]) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
            {label}{to === '/revision' && due > 0 && <span className="badge">{due}</span>}
          </NavLink>
        ))}
      </nav>
      <main className="main"><Outlet /></main>
      {error && <div className="toast" role="alert">{error}</div>}
      <ItemDrawer />
    </div>
  );
}
