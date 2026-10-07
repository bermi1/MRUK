'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  ADVANCE_TERMS,
  assessAffordability,
  buildSchedule,
  CONTRACT_CONSENTS,
  contractTerms,
  deliveryEta,
  deliveryFee,
  firstDeductionDate,
  fmtDate,
  fmtTZS,
  monthlyInstalment,
  REGIONS,
} from '@bt/core';
import { placeMiniOrderAction, type MiniOrderResult } from '@/app/actions/mini';
import { PImg } from '@/components/store/PImg';
import type { BrandKey } from '@/lib/types';

export interface MiniProduct {
  id: string;
  cat: string;
  sub: string;
  model: string;
  name: string;
  price: number;
  stock: number;
  img: string;
  features: string[];
}

export interface MiniBrand {
  key: BrandKey;
  name: string;
  legal: string;
  primary: string;
  dark: string;
  cats: { id: string; short: string }[];
  products: MiniProduct[];
}

export interface MiniCustomer {
  fullName: string;
  nidaMasked: string;
  phoneMasked: string;
  employer: string;
  jobTitle: string;
  netSalary: number;
  accountLast4: string;
  limit: number;
}

type Step = 'shop' | 'term' | 'review' | 'done';
const DEFAULT_REGION = 'Dar es Salaam';

function stockText(n: number) {
  if (n <= 0) return 'Out of stock';
  return n <= 5 ? `Only ${n} left` : `${n} in stock`;
}

/** Ask the host Azania app to close the webview (bridge names are a placeholder until the bank's SDK is known). */
function closeMiniApp() {
  const w = window as unknown as { AzaniaBridge?: { close?: () => void }; ReactNativeWebView?: { postMessage: (m: string) => void } };
  if (w.AzaniaBridge?.close) return w.AzaniaBridge.close();
  if (w.ReactNativeWebView) return w.ReactNativeWebView.postMessage(JSON.stringify({ type: 'close' }));
  window.close();
  if (window.history.length > 1) window.history.back();
}

export function MiniApp({ customer, brands }: { customer: MiniCustomer; brands: Record<BrandKey, MiniBrand> }) {
  const [step, setStep] = useState<Step>('shop');
  const [brandKey, setBrandKey] = useState<BrandKey>('mruk');
  const [cat, setCat] = useState('all');
  const [pid, setPid] = useState<string | null>(null);
  const [months, setMonths] = useState<number>(12);
  const [region, setRegion] = useState<string>(DEFAULT_REGION);
  const [consents, setConsents] = useState<[boolean, boolean]>([false, false]);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<{ msg: string; field?: string } | null>(null);
  const [shake, setShake] = useState(false);
  const [result, setResult] = useState<MiniOrderResult | null>(null);
  const [pending, startTransition] = useTransition();
  const shopScroll = useRef(0);
  const screenRef = useRef<HTMLDivElement>(null);

  const brand = brands[brandKey];
  const product = useMemo(() => brand.products.find((p) => p.id === pid) ?? null, [brand, pid]);

  // Scroll position: restore the shop list when coming back, start other steps at the top.
  useEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    el.scrollTop = step === 'shop' ? shopScroll.current : 0;
    el.focus({ preventScroll: true });
  }, [step]);

  const go = (s: Step) => {
    if (step === 'shop' && screenRef.current) shopScroll.current = screenRef.current.scrollTop;
    setError(null);
    setPin('');
    setStep(s);
  };

  const grid = useMemo(() => brand.products.filter((p) => cat === 'all' || p.cat === cat), [brand, cat]);

  // Pricing for the selected product, region and term.
  const fee = product ? deliveryFee(region, product.price) : 0;
  const total = product ? product.price + fee : 0;
  const monthly = product ? monthlyInstalment(total, months) : 0;
  const aff = assessAffordability(monthly, customer.netSalary);
  const overLimit = total > customer.limit;
  const canContinue = !!product && product.stock > 0 && !overLimit && aff.status === 'within';
  const firstDeduction = firstDeductionDate(new Date());
  const themeStyle = { ['--p' as string]: brand.primary, ['--rs' as string]: '0px', ['--sel' as string]: brand.primary } as React.CSSProperties;

  const submit = (fullPin: string) => {
    if (!product) return;
    setError(null);
    startTransition(async () => {
      const r = await placeMiniOrderAction({ brand: brandKey, productId: product.id, months, region, pin: fullPin, consents });
      if (r.ok && r.data) {
        setResult(r.data);
        go('done');
        return;
      }
      if (!r.ok) {
        setError({ msg: r.error, field: r.field });
        setPin('');
        setShake(true);
        setTimeout(() => setShake(false), 400);
      }
    });
  };

  const press = (k: string) => {
    if (pending) return;
    if (k === 'del') return setPin((p) => p.slice(0, -1));
    if (pin.length >= 4) return;
    const n = pin + k;
    setPin(n);
    if (n.length === 4) setTimeout(() => submit(n), 200);
  };

  // ---------------------------------------------------------------- 1 · Shop
  if (step === 'shop') {
    return (
      <div className="mn-screen" key={step} ref={screenRef} tabIndex={-1} style={themeStyle} aria-label="Shop">
        <header className="mn-top">
          <div className="mn-head">
            <button type="button" className="mn-iconbtn" aria-label="Close shop and return to Azania Bank" onClick={closeMiniApp}>
              ✕
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mn-eyebrow">MINI APP IN AZANIA</div>
              <h1>Mr UK and Skywood</h1>
            </div>
            <img className="mn-azlogo" src="/brand/azania-mark.png" alt="Azania Bank" />
          </div>
          <div className="mn-seg" role="group" aria-label="Store">
            {(['mruk', 'skywood'] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={brandKey === k}
                style={brandKey === k ? { background: brands[k].primary } : undefined}
                onClick={() => {
                  setBrandKey(k);
                  setCat('all');
                  shopScroll.current = 0;
                  if (screenRef.current) screenRef.current.scrollTop = 0;
                }}
              >
                {brands[k].name}
              </button>
            ))}
          </div>
          <div className="mn-limit">
            <div>
              <div className="l1">Salary Advance limit</div>
              <div className="l2">
                {fmtTZS(customer.limit)} <small>available</small>
              </div>
            </div>
            <span className="mn-pill ok">PRE-APPROVED</span>
          </div>
        </header>

        <nav className="mn-chips" aria-label="Categories">
          {[{ id: 'all', short: 'All' }, ...brand.cats].map((c) => (
            <button key={c.id} type="button" className="mn-chip" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
              {c.short}
            </button>
          ))}
        </nav>

        <div className="mn-grid">
          {grid.map((p) => {
            const fits = p.price + deliveryFee(DEFAULT_REGION, p.price) <= customer.limit;
            const disabled = !fits || p.stock <= 0;
            return (
              <button
                key={p.id}
                type="button"
                className="mn-card"
                aria-disabled={disabled}
                aria-label={`${p.name}, ${fmtTZS(monthlyInstalment(p.price, 12))} a month${!fits ? ', above your Salary Advance limit' : p.stock <= 0 ? ', out of stock' : ''}`}
                onClick={() => {
                  if (disabled) return;
                  setPid(p.id);
                  setMonths(12);
                  setConsents([false, false]);
                  go('term');
                }}
              >
                <PImg src={p.img} alt="" model={p.model} sub={p.sub} cover size="md" />
                <span className="shade" />
                {disabled && (
                  <span className="over">
                    <span>{!fits ? 'Above your limit' : 'Out of stock'}</span>
                  </span>
                )}
                <span className="meta">
                  <span className="nm" style={{ display: 'block' }}>
                    {p.name}
                  </span>
                  <span className="st" style={{ display: 'block', color: p.stock <= 5 ? '#FFB199' : '#9FE0B5' }}>
                    {stockText(p.stock)}
                  </span>
                  <span className="mo" style={{ display: 'block' }}>
                    {fmtTZS(monthlyInstalment(p.price, 12))}/mo
                  </span>
                </span>
              </button>
            );
          })}
          {!grid.length && <div className="mn-empty">No products in this category yet.</div>}
          <p className="mn-note" style={{ gridColumn: '1 / -1', padding: '8px 0 0' }}>
            Monthly prices shown over 12 months. Items above your pre-approved limit can&apos;t be bought on Salary Advance here.
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- 2 · Choose term
  if (step === 'term' && product) {
    return (
      <div className="mn-screen white mn-col" key={step} ref={screenRef} tabIndex={-1} style={themeStyle} aria-label="Choose your term">
        <div className="mn-hero">
          <PImg src={product.img} alt={product.name} model={product.model} cover size="lg" />
          <button type="button" className="mn-iconbtn glass back" aria-label="Back to shop" onClick={() => go('shop')}>
            ‹
          </button>
          <span className="bpill">{brand.name}</span>
        </div>
        <div className="mn-sheet" style={{ flex: 1 }}>
          <div className="mn-steps" aria-label="Step 2 of 4">
            <i className="on" />
            <i className="on" />
            <i />
            <i />
          </div>
          <div>
            <div className="mn-sub mn-mono">
              {product.model} · {stockText(product.stock)}
            </div>
            <h2>{product.name}</h2>
            <div className="mn-cash">Cash price {fmtTZS(product.price)}</div>
          </div>
          {product.features.length > 0 && (
            <ul className="mn-feats">
              {product.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}

          <div className="mn-label" id="mn-term-l">
            Choose your term
          </div>
          <div className="mn-terms" role="group" aria-labelledby="mn-term-l">
            {ADVANCE_TERMS.map((m) => {
              const amt = monthlyInstalment(total, m);
              const ok = assessAffordability(amt, customer.netSalary).status === 'within';
              return (
                <button key={m} type="button" className="mn-term" aria-pressed={months === m} disabled={!ok} onClick={() => setMonths(m)}>
                  <div className="m">{m} months</div>
                  <div className="a">{fmtTZS(amt)}</div>
                  {!ok && <div className="x">Above 1/3 of salary</div>}
                </button>
              );
            })}
          </div>

          <div className={`mn-aff ${aff.status === 'within' ? '' : 'bad'}`} role="status">
            <div className="mn-row" style={{ color: 'inherit' }}>
              <span style={{ color: 'inherit' }}>
                Affordability: <b>{aff.percent}%</b> of net salary
              </span>
              <span>{aff.status === 'within' ? 'Within limit' : 'Above limit'}</span>
            </div>
            <div className="bar" aria-hidden="true">
              <i style={{ width: `${aff.meter}%` }} />
            </div>
            <div style={{ color: 'var(--mn-muted)', fontSize: 11.5 }}>
              Azania Bank allows up to one third of your net salary ({fmtTZS(aff.maxInstalment)} a month).
            </div>
          </div>

          <div className="mn-label" id="mn-reg-l">
            Deliver to
          </div>
          <div className="mn-regions" role="group" aria-labelledby="mn-reg-l">
            {REGIONS.map((r) => {
              const f = deliveryFee(r.name, product.price);
              return (
                <button key={r.name} type="button" className="mn-region" aria-pressed={region === r.name} onClick={() => setRegion(r.name)}>
                  {r.name}
                  <small>{f === 0 ? 'Free' : fmtTZS(f)} · {r.eta}</small>
                </button>
              );
            })}
          </div>

          <div className="mn-box">
            <div className="mn-row">
              <span>Deducted from</span>
              <span>Salary account ••{customer.accountLast4}</span>
            </div>
            <div className="mn-row">
              <span>First deduction</span>
              <span>{fmtDate(firstDeduction)}</span>
            </div>
            <div className="mn-row">
              <span>Delivery</span>
              <span>
                {region} · {fee === 0 ? 'Free' : fmtTZS(fee)}
              </span>
            </div>
            <div className="mn-row">
              <span>Total on Salary Advance</span>
              <span>{fmtTZS(total)}</span>
            </div>
          </div>
          {overLimit && (
            <div className="mn-error" role="alert">
              With delivery this comes to {fmtTZS(total)}, above your pre-approved limit of {fmtTZS(customer.limit)}.
            </div>
          )}
        </div>
        <div className="mn-foot">
          <button type="button" className="mn-cta" disabled={!canContinue} onClick={() => go('review')}>
            Buy on Salary Advance · {fmtTZS(monthly)}/mo
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- 3 · Review and sign
  if (step === 'review' && product) {
    const schedule = buildSchedule(total, months, new Date());
    const terms = contractTerms(months, fmtTZS(monthly), fmtDate(firstDeduction));
    const consentsOk = consents[0] && consents[1];
    return (
      <div className="mn-screen white" key={step} ref={screenRef} tabIndex={-1} style={themeStyle} aria-label="Review and sign">
        <div className="mn-col" style={{ padding: 'calc(18px + env(safe-area-inset-top)) 20px calc(30px + env(safe-area-inset-bottom))', gap: 14 }}>
          <div className="mn-pagehead">
            <button type="button" className="mn-iconbtn" aria-label="Back to term" onClick={() => go('term')} disabled={pending}>
              ‹
            </button>
            <h2>Review and sign</h2>
          </div>
          <div className="mn-steps" aria-label="Step 3 of 4">
            <i className="on" />
            <i className="on" />
            <i className="on" />
            <i />
          </div>

          <section className="mn-box" aria-label="Your details from Azania Bank">
            <div className="mn-boxhead az">YOUR DETAILS · FROM AZANIA KYC</div>
            <div className="mn-row">
              <span>Name</span>
              <span>{customer.fullName}</span>
            </div>
            <div className="mn-row">
              <span>NIDA</span>
              <span className="mn-mono">{customer.nidaMasked}</span>
            </div>
            <div className="mn-row">
              <span>Employer</span>
              <span>{customer.employer}</span>
            </div>
            <div className="mn-row">
              <span>Net salary</span>
              <span>{fmtTZS(customer.netSalary)}</span>
            </div>
            <div className="mn-row">
              <span>Phone</span>
              <span>{customer.phoneMasked}</span>
            </div>
          </section>

          <section className="mn-box line" aria-label="Instalment agreement">
            <div className="mn-boxhead">INSTALMENT AGREEMENT</div>
            <div className="mn-row">
              <span>Product</span>
              <span>{product.name}</span>
            </div>
            <div className="mn-row">
              <span>Seller</span>
              <span>{brand.legal}</span>
            </div>
            <div className="mn-row">
              <span>Financier</span>
              <span>Azania Bank Limited</span>
            </div>
            <div className="mn-row">
              <span>Cash price</span>
              <span>{fmtTZS(product.price)}</span>
            </div>
            <div className="mn-row">
              <span>Delivery ({region})</span>
              <span>{fee === 0 ? 'Free' : fmtTZS(fee)}</span>
            </div>
            <div className="mn-row">
              <span>Total</span>
              <span>{fmtTZS(total)}</span>
            </div>
            <div className="mn-row">
              <span>Term</span>
              <span>{months} months</span>
            </div>
            <div className="mn-row" style={{ fontSize: 15, paddingTop: 6, borderTop: '1px solid #F0F1F5' }}>
              <span style={{ color: 'var(--mn-text)' }}>Monthly</span>
              <span style={{ fontWeight: 700, color: 'var(--mn-az2)' }}>{fmtTZS(monthly)}</span>
            </div>
            <div className="mn-fine">
              Deducted on payday from salary account ••{customer.accountLast4}, first on {fmtDate(firstDeduction)}. Ownership passes after the final instalment. Early settlement allowed.
            </div>
            <details className="mn-details">
              <summary>Repayment schedule ({months} instalments)</summary>
              <table className="mn-sched">
                <tbody>
                  {schedule.map((s) => (
                    <tr key={s.n}>
                      <td>
                        {s.n}. {fmtDate(s.dueDate)}
                      </td>
                      <td>{fmtTZS(s.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
            <details className="mn-details">
              <summary>Key terms (8)</summary>
              <ol>
                {terms.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
            </details>
          </section>

          <div className="mn-row" style={{ fontSize: 12.5 }}>
            <span>Affordability: {aff.percent}% of net salary</span>
            <span style={{ color: 'var(--mn-ok)' }}>Within limit</span>
          </div>

          <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
            <legend className="sr-only">Consent</legend>
            {CONTRACT_CONSENTS.map((text, i) => (
              <label key={text} className="mn-check">
                <input
                  type="checkbox"
                  checked={consents[i]}
                  disabled={pending}
                  onChange={(e) => {
                    const next: [boolean, boolean] = [...consents];
                    next[i] = e.target.checked;
                    setConsents(next);
                  }}
                />
                <span>{text}</span>
              </label>
            ))}
          </fieldset>

          <div className="mn-pinlabel" id="mn-pin-l">
            {consentsOk ? 'Enter your Azania PIN to sign' : 'Tick both boxes, then enter your Azania PIN to sign'}
          </div>
          <div className={`mn-dots ${shake ? 'shake' : ''}`} role="img" aria-label={`${pin.length} of 4 PIN digits entered`}>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={i < pin.length ? 'on' : ''} />
            ))}
          </div>
          {pending && (
            <div className="mn-busy" role="status">
              Signing and sending to Azania Bank…
            </div>
          )}
          {error && (
            <div className="mn-error" role="alert">
              {error.msg}
              {error.field === 'session' && (
                <>
                  {' '}
                  <button type="button" onClick={() => window.location.reload()} style={{ textDecoration: 'underline', fontWeight: 600, minHeight: 44 }}>
                    Reload
                  </button>
                </>
              )}
            </div>
          )}
          <div className="mn-keypad" role="group" aria-labelledby="mn-pin-l">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k, i) =>
              k === '' ? (
                <span key={`blank-${i}`} className="blank" />
              ) : (
                <button key={k} type="button" disabled={!consentsOk || pending} aria-label={k === 'del' ? 'Delete digit' : `Digit ${k}`} onClick={() => press(k)}>
                  {k === 'del' ? '⌫' : k}
                </button>
              ),
            )}
          </div>
          <div className="mn-fine" style={{ textAlign: 'center' }}>
            Your PIN is checked by Azania Bank and never stored by Mr UK or Skywood.
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- 4 · Approved
  if (step === 'done' && result && product) {
    const approved = result.status === 'approved';
    const rejected = result.status === 'rejected';
    return (
      <div className="mn-screen white" key={step} ref={screenRef} tabIndex={-1} style={themeStyle} aria-label="Order result">
        <div className="mn-done">
          <div className={`mn-tick ${approved ? '' : rejected ? 'no' : 'wait'}`} aria-hidden="true">
            {approved ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16825D" strokeWidth="2.4">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            ) : rejected ? (
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#B4462E" strokeWidth="2.4">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0078B4" strokeWidth="2.2">
                <circle cx="12" cy="12" r="8" />
                <path d="M12 8v4l3 2" />
              </svg>
            )}
          </div>
          <h2>{approved ? 'Approved and ordered' : rejected ? 'Not approved' : 'Sent to Azania Bank'}</h2>
          <p>
            {approved
              ? `Contract ${result.contract} is signed. ${brand.name} will deliver your ${product.name} to ${region} ${deliveryEta(region) === 'tomorrow' ? 'tomorrow' : `in ${deliveryEta(region)}`}.`
              : rejected
                ? `Azania Bank could not approve this Salary Advance. ${result.note} No money will be deducted.`
                : `Contract ${result.contract} is signed and with Azania Bank for a decision. We'll SMS you when it's approved.`}
          </p>

          {!rejected && (
            <div className="mn-plan" aria-label="Salary Advance plan">
              <span className="blob" />
              <div className="top">
                <img src="/brand/azania-mark.png" alt="Azania Bank" />
                <span className="mn-pill az">{approved ? 'Active plan' : 'In review'}</span>
              </div>
              <div className="no mn-mono">SALARY ADVANCE •••• {customer.accountLast4}</div>
              <div className="nums">
                <div className="paid">
                  PAID<b>{fmtTZS(result.paid)}</b>
                </div>
                <div>
                  REMAINING<b>{fmtTZS(result.remaining)}</b>
                </div>
                <div className="mon">
                  MONTHLY<b>{fmtTZS(result.monthly)}</b>
                </div>
              </div>
            </div>
          )}

          <div className="mn-box">
            <div className="mn-row">
              <span>Order number</span>
              <span className="mn-mono">{result.number}</span>
            </div>
            <div className="mn-row">
              <span>Contract number</span>
              <span className="mn-mono">{result.contract}</span>
            </div>
            <div className="mn-row">
              <span>Term</span>
              <span>
                {result.months} × {fmtTZS(result.monthly)}
              </span>
            </div>
            <div className="mn-row">
              <span>First deduction</span>
              <span>{fmtDate(new Date(result.firstDeduction))}</span>
            </div>
          </div>

          <a className="mn-dl" href={result.contractUrl} download>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19h14" />
            </svg>
            Download contract (PDF)
          </a>
          <div className="mn-spacer" />
          <button
            type="button"
            className="mn-cta"
            onClick={() => {
              setResult(null);
              setPid(null);
              setConsents([false, false]);
              shopScroll.current = 0;
              go('shop');
            }}
          >
            Back to Azania Shop
          </button>
        </div>
      </div>
    );
  }

  // Fallback (e.g. product vanished): return to the shop.
  return (
    <div className="mn-screen" key={step} ref={screenRef}>
      <div className="mn-gate">
        <p>This product is no longer available.</p>
        <button type="button" className="mn-cta" onClick={() => go('shop')}>
          Back to Azania Shop
        </button>
      </div>
    </div>
  );
}
