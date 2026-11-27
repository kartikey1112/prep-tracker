import { useStore } from '../store';
import { entryTitle } from '../lib/catalog';
import { fmt } from '../lib/dates';
import { REVISION_GAPS, revisions, type RevisionRow } from '../lib/metrics';
import { Empty } from '../components/ui';

const KIND: Record<string, string> = { dsa: 'DSA', mc: 'Machine coding', sd: 'System design', qa: 'Theory', js: 'JS' };

export function RevisionPage() {
  const { content: c, progress: p, index, open, setRevision } = useStore();
  const all = revisions(c, p);
  const groups: [string, RevisionRow[]][] = [
    ['Overdue', all.filter((r) => r.status === 'overdue')],
    ['Due today', all.filter((r) => r.status === 'today')],
    ['Coming up', all.filter((r) => r.status === 'upcoming').sort((a, b) => (a.next! < b.next! ? -1 : 1))],
    ['All five revisions done', all.filter((r) => r.status === 'finished')],
  ];

  return (
    <div className="page">
      <h1 className="title">Spaced revision</h1>
      <p className="lede">Every completed item comes back at +{REVISION_GAPS.join(', +')} days from the day you first finished it. Clear “Overdue” and “Due today” each morning.</p>
      {all.length === 0 && <Empty>Nothing to revise yet. Mark DSA problems, builds, designs or theory questions as Completed and they'll show up here.</Empty>}
      {groups.map(([title, rows]) => rows.length > 0 && (
        <section key={title} className="panel">
          <header className="panel-head"><h2>{title} <small>{rows.length}</small></h2></header>
          <ul className="rev-list">
            {rows.map((r) => {
              const e = index.get(r.id)!;
              return (
                <li key={r.id} className={`rev ${r.status}`}>
                  <button type="button" className="idlink" onClick={() => open(r.id)}>{r.id}</button>
                  <span className="rev-title">{entryTitle(e)}<small>{KIND[e.kind]} · first done {fmt(r.first)}{r.next ? ` · next ${fmt(r.next)}` : ''}</small></span>
                  <span className="pips" aria-label={`${r.count} of 5 revisions done`}>{REVISION_GAPS.map((g, i) => <i key={g} className={i < r.count ? 'on' : ''} />)}</span>
                  {r.status !== 'finished'
                    ? <button type="button" className={r.status === 'upcoming' ? 'ghost' : 'primary'} onClick={() => setRevision(r.id, r.count + 1)}>Revised</button>
                    : <button type="button" className="ghost" onClick={() => setRevision(r.id, 0)}>Restart</button>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
