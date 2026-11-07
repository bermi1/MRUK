'use client';
import { useState, useTransition } from 'react';
import type { VerdictView } from '@bt/core';
import { aiAskAction, aiVerdictAction } from '@/app/actions/store';
import { SparkleIcon } from '../icons';

/** Customer-facing name of the Azania product (catalogue AI in @bt/core still says "Salary Advance"). */
const shown = (s: string) => s.replaceAll('Salary Advance', 'Pay Later');

type Lang = 'en' | 'sw';
export type VerdictLabels = Record<'title' | 'hint' | 'generate' | 'regenerate' | 'analysing' | 'pick' | 'value' | 'bestFor' | 'pros' | 'cons' | 'notSpecified' | 'source', string>;

/**
 * AI verdict (English or Kiswahili, following the site language with a toggle on the panel)
 * and Q&A. Everything comes only from the catalogue data of the compared products.
 */
export function CompareAi({ brand, ids, names, months, locale, labels }: { brand: string; ids: string[]; names: string; months: number; locale: Lang; labels: Record<Lang, VerdictLabels> }) {
  const [lang, setLang] = useState<Lang>(locale);
  const [verdict, setVerdict] = useState<VerdictView | null>(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [a, setA] = useState('');
  const [vPending, startV] = useTransition();
  const [aPending, startA] = useTransition();
  const L = labels[lang];
  const run = (l: Lang = lang) =>
    startV(async () => {
      const r = await aiVerdictAction(brand, ids, months, l);
      if (r.ok) {
        setVerdict(r.data!.verdict);
        setErr('');
      } else setErr(r.error);
    });
  const switchLang = (l: Lang) => {
    setLang(l);
    if (verdict) run(l);
  };
  const ask = (question: string) => {
    setQ(question);
    startA(async () => {
      setA('Thinking…');
      const r = await aiAskAction(brand, ids, question, months);
      setA(r.ok ? shown(r.data!.text) : r.error);
    });
  };
  const nameOf = (model: string) => verdict?.products.find((p) => p.model === model)?.name ?? model;
  return (
    <div className="cmp-ai">
      <section className="cmp-verdict" aria-labelledby="cmp-v-title" lang={lang}>
        <div className="cmp-v-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="cmp-v-icon">
              <SparkleIcon size={18} />
            </span>
            <div>
              <h2 id="cmp-v-title">{L.title}</h2>
              <p>{L.hint}</p>
            </div>
          </div>
          <div className="cmp-v-ctl">
            <div className="cmp-v-lang" role="group" aria-label="Language / Lugha">
              {(['en', 'sw'] as const).map((l) => (
                <button key={l} type="button" aria-pressed={lang === l} className={lang === l ? 'on' : ''} onClick={() => switchLang(l)} disabled={vPending} data-testid={`verdict-lang-${l}`}>
                  {l === 'en' ? 'English' : 'Kiswahili'}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-white btn-sm" onClick={() => run()} disabled={vPending} data-testid="run-verdict">
              {vPending ? L.analysing : verdict ? L.regenerate : L.generate}
            </button>
          </div>
        </div>
        <div aria-live="polite" aria-busy={vPending} data-testid="verdict" data-lang={verdict?.lang ?? ''} className={vPending ? 'is-busy' : ''}>
          {err && <p className="cmp-v-err">{err}</p>}
          {verdict && (
            <>
              <div className="cmp-v-pick">
                <small>{L.pick}</small>
                <b data-testid="verdict-pick">{nameOf(verdict.pick)}</b>
                <p>{verdict.recommendation}</p>
              </div>
              <div className="cmp-v-grid">
                <div>
                  <h3>{L.value}</h3>
                  <p data-testid="verdict-value">{verdict.value}</p>
                  {verdict.needs.length > 0 && (
                    <>
                      <h3>{L.bestFor}</h3>
                      <ul className="cmp-v-needs">
                        {verdict.needs.map((n) => (
                          <li key={n.need}>
                            <b>{n.need}</b>: {nameOf(n.model)} <span>({n.because})</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
                <div className="cmp-v-products">
                  {verdict.products.map((p) => (
                    <div key={p.model} className="cmp-v-prod" data-testid="verdict-product">
                      <b>{p.name}</b>
                      {p.pros.length > 0 && (
                        <p>
                          <span className="pro">{L.pros}:</span> {p.pros.join('; ')}
                        </p>
                      )}
                      {p.cons.length > 0 && (
                        <p>
                          <span className="con">{L.cons}:</span> {p.cons.join('; ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <p className="cmp-v-ns">
                <b>{L.notSpecified}:</b> {verdict.notSpecified}
              </p>
            </>
          )}
        </div>
        <div className="cmp-v-src">{L.source.replace('{names}', names)}</div>
      </section>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Ask about these products</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['Which is best value?', 'Which uses less power?', 'Best for a small shop?'].map((t) => (
            <button key={t} type="button" onClick={() => ask(t)} style={{ borderRadius: 999, background: 'var(--surface)', padding: '7px 12px', fontSize: 12.5, minHeight: 44 }}>
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
