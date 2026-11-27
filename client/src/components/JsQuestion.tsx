import type { Js } from '../types';
import { useStore } from '../store';
import { Diff } from './ui';

const LETTERS = ['A', 'B', 'C', 'D'];

export function JsQuestion({ q, onNext }: { q: Js; onNext?: () => void }) {
  const { progress, answerJs } = useStore();
  const mine = progress.js[q.id];
  const answered = !!mine;
  return (
    <div className="jsq">
      <p className="muted">{q.id} · {q.topic} · <Diff d={q.diff} /></p>
      <h3>What does this print?</h3>
      <pre className="code"><code>{q.code}</code></pre>
      <div className="opts">
        {q.opts.map((o, i) => {
          const L = LETTERS[i];
          const cls = !answered ? '' : L === q.ans ? 'right' : L === mine ? 'wrong' : 'dim';
          return (
            <button key={L} type="button" className={`opt ${cls}`} disabled={answered} onClick={() => answerJs(q.id, L)}>
              <b>{L}</b><span>{o}</span>
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={`verdict ${mine === q.ans ? 'ok' : 'bad'}`}>
          <strong>{mine === q.ans ? 'Correct.' : `Not quite — the answer is ${q.ans}.`}</strong>
          <p>{q.exp}</p>
          {q.why && <p className="muted"><b>Why not the others:</b> {q.why}</p>}
          <div className="row">
            <button type="button" className="ghost" onClick={() => answerJs(q.id, null)}>Try again</button>
            {onNext && <button type="button" className="primary" onClick={onNext}>Next question</button>}
          </div>
        </div>
      )}
    </div>
  );
}
