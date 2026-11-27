import { useState } from 'react';
import { useStore } from '../store';
import { ExtLink, Section } from '../components/ui';

export function CompaniesPage() {
  const { content: c } = useStore();
  const companies = [...new Set(c.comp.map((x) => x.co))];
  const [co, setCo] = useState('');
  const rows = c.comp.filter((x) => !co || x.co === co);
  return (
    <div className="page">
      <h1 className="title">Company interview experiences</h1>
      <p className="lede">Only reports found in public sources (researched Nov 2026). Each card links to its source.</p>
      <div className="chips">
        <button type="button" className={!co ? 'on' : ''} onClick={() => setCo('')}>All ({c.comp.length})</button>
        {companies.map((x) => <button key={x} type="button" className={co === x ? 'on' : ''} onClick={() => setCo(x)}>{x}</button>)}
      </div>
      <div className="cards">
        {rows.map((x, i) => (
          <article key={`${x.co}-${i}`} className="card company">
            <p className="muted small">{x.date} · {x.src}</p>
            <h3>{x.co} <span>{x.role}</span></h3>
            <dl className="fields tight">
              <div className="field"><dt>Rounds</dt><dd>{x.rounds}</dd></div>
              <div className="field"><dt>Notable</dt><dd>{x.tasks}</dd></div>
              <div className="field"><dt>Prepare</dt><dd>{x.prep}</dd></div>
            </dl>
            <footer><span className="tag">{x.label}</span><ExtLink href={x.u}>Source ↗</ExtLink></footer>
          </article>
        ))}
      </div>
      <Section title="Common rejection reasons in these reports">
        <ul className="rej">
          {c.rej.map((r) => <li key={r.reason}><b>{r.reason}</b><span>{r.where} · <ExtLink href={r.u}>source ↗</ExtLink></span></li>)}
        </ul>
      </Section>
    </div>
  );
}
