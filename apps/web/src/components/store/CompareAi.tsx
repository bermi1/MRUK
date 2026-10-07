'use client';
import { useState, useTransition } from 'react';
import { aiAskAction, aiVerdictAction } from '@/app/actions/store';

/** AI verdict and Q&A — answers come only from the catalogue data of the compared products. */
export function CompareAi({ brand, ids, names, months }: { brand: string; ids: string[]; names: string; months: number }) {
  const [verdict, setVerdict] = useState('');
  const [q, setQ] = useState('');
  const [a, setA] = useState('');
  const [vPending, startV] = useTransition();
  const [aPending, startA] = useTransition();
  const run = () =>
    startV(async () => {
      const r = await aiVerdictAction(brand, ids, months);
      setVerdict(r.ok ? r.data!.text : r.error);
    });
  const ask = (question: string) => {
    setQ(question);
    startA(async () => {
      setA('Thinking…');
      const r = await aiAskAction(brand, ids, question, months);
      setA(r.ok ? r.data!.text : r.error);
    });
  };
  return (
    <div className="cmp-ai">
      <div style={{ borderRadius: 24, background: 'var(--p)', color: '#fff', padding: 26 }}>
        <div className="row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✦</span>
            <span style={{ fontSize: 17, fontWeight: 600 }}>AI verdict</span>
          </div>
          <button type="button" className="btn btn-white btn-sm" onClick={run} disabled={vPending} data-testid="run-verdict">
            {vPending ? 'Analysing…' : verdict ? 'Regenerate' : 'Generate verdict'}
          </button>
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.65, marginTop: 16, whiteSpace: 'pre-wrap', opacity: 0.95 }} aria-live="polite" data-testid="verdict">
          {verdict || 'Tap “Generate verdict” for an AI recommendation based only on the product data above.'}
        </div>
        <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 14 }}>Based only on catalogue data: {names}</div>
      </div>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Ask about these products</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['Which is best value?', 'Which uses less power?', 'Best for a small shop?'].map((t) => (
            <button key={t} type="button" onClick={() => ask(t)} style={{ borderRadius: 999, background: 'var(--surface)', padding: '7px 12px', fontSize: 12.5, minHeight: 36 }}>
              {t}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) ask(q.trim());
          }}
          style={{ display: 'flex', gap: 8 }}
        >
          <label htmlFor="aiq" className="sr-only">
            Your question
          </label>
          <input id="aiq" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Which is best for a family of 6?" maxLength={300} data-testid="ai-question" />
          <button className="btn btn-primary btn-sm" style={{ borderRadius: 12 }} disabled={aPending}>
            Ask
          </button>
        </form>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: '#2E3245', whiteSpace: 'pre-wrap', minHeight: 40 }} aria-live="polite" data-testid="ai-answer">
          {a}
        </div>
      </div>
    </div>
  );
}
