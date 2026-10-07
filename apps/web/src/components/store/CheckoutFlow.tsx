'use client';
import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  assessAffordability,
  buildSchedule,
  CONTRACT_CONSENTS,
  contractTerms,
  firstDeductionDate,
  fmtDate,
  isTzPhone,
  monthlyInstalment,
  normaliseNida,
  parseAmount,
  PAYMENT_METHOD_INFO,
  paymentAllowed,
  REGIONS,
  signatureMatches,
  type PaymentMethod,
} from '@bt/core';
import { placeAdvanceOrderAction, placeOrderAction, updateCartAction } from '@/app/actions/store';
import { fmt } from '@/lib/format';
import type { CartView } from '@/lib/types';

type Step = 'checkout' | 'apply' | 'contract';

interface Props {
  brand: { key: string; name: string; legal: string; logo: string };
  cart: CartView;
  prefill: { name: string; phone: string; email: string };
  initialMethod: PaymentMethod;
  channel: 'web' | 'app';
}

const METHODS: PaymentMethod[] = ['salary_advance', 'azania_account', 'card', 'pay_on_delivery'];

function Field({ label, error, children, wide }: { label: string; error?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className="field" style={wide ? { gridColumn: '1 / -1' } : undefined}>
      {label}
      {children}
      {error && (
        <span className="err" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

export function CheckoutFlow({ brand, cart, prefill, initialMethod, channel }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('checkout');
  const [method, setMethod] = useState<PaymentMethod>(initialMethod);
  const [co, setCo] = useState({ name: prefill.name, phone: prefill.phone, email: prefill.email, address: '', consent: false });
  const [sa, setSa] = useState({ nida: '', employer: '', checkNumber: '', jobTitle: '', salary: '', account: '' });
  const [months, setMonths] = useState(cart.months);
  const [sig, setSig] = useState('');
  const [consents, setConsents] = useState<[boolean, boolean]>([false, false]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formErr, setFormErr] = useState('');
  const [pending, start] = useTransition();
  const b = `/${brand.key}`;

  const monthly = monthlyInstalment(cart.total, months);
  const salary = parseAmount(sa.salary);
  const aff = assessAffordability(monthly, salary);
  const now = useMemo(() => new Date(), []);
  const schedule = useMemo(() => buildSchedule(cart.total, months, now), [cart.total, months, now]);
  const first = firstDeductionDate(now);
  const terms = contractTerms(months, fmt(monthly), fmtDate(first));

  const setRegion = (region: string) =>
    start(async () => {
      await updateCartAction(brand.key, { region });
      if (!paymentAllowed(method, region)) setMethod('card');
      router.refresh();
    });
  const setTerm = (m: number) => {
    setMonths(m);
    void updateCartAction(brand.key, { months: m });
  };

  const validateContact = () => {
    const e: Record<string, string> = {};
    if (co.name.trim().length < 2) e.name = 'Enter your full name';
    if (!isTzPhone(co.phone)) e.phone = 'Enter a valid Tanzanian number, e.g. +255 754 000 214';
    if (co.email && !/^\S+@\S+\.\S+$/.test(co.email)) e.email = 'Enter a valid email';
    if (!co.consent) e.consent = 'Please accept the privacy notice to continue';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const place = () => {
    setFormErr('');
    if (!validateContact()) return;
    if (method === 'salary_advance') {
      setStep('apply');
      window.scrollTo({ top: 0 });
      return;
    }
    start(async () => {
      const r = await placeOrderAction(brand.key, { name: co.name, phone: co.phone, email: co.email, address: co.address, method, consent: co.consent, channel });
      if (!r.ok) {
        setFormErr(r.error);
        if (r.field) setErrors({ [r.field]: r.error });
        return;
      }
      router.push(r.data!.redirect);
    });
  };

  const toContract = () => {
    const e: Record<string, string> = {};
    if (!normaliseNida(sa.nida)) e.nida = 'Enter your 20-digit NIDA number';
    if (sa.employer.trim().length < 2) e.employer = 'Enter your employer';
    if (!sa.checkNumber.trim()) e.checkNumber = 'Enter your check / employee number';
    if (!salary) e.salary = 'Enter your net monthly salary';
    if (!/^\d{10,16}$/.test(sa.account.replace(/\s+/g, ''))) e.account = 'Enter your Azania Bank salary account number (10–16 digits)';
    if (salary && aff.status === 'above') e.salary = `Instalment is ${aff.percent}% of net salary — above the one-third limit. Choose a longer term or a smaller basket.`;
    setErrors(e);
    if (Object.keys(e).length) return setFormErr('Please complete the highlighted fields');
    setFormErr('');
    setStep('contract');
    window.scrollTo({ top: 0 });
  };

  const canSign = signatureMatches(sig, co.name) && consents[0] && consents[1];
  const sign = () => {
    if (!canSign) return setFormErr('Type your full name and tick both boxes to sign');
    start(async () => {
      const r = await placeAdvanceOrderAction(brand.key, {
        name: co.name,
        phone: co.phone,
        email: co.email,
        address: co.address,
        months,
        nida: sa.nida,
        employer: sa.employer,
        checkNumber: sa.checkNumber,
        jobTitle: sa.jobTitle,
        netSalary: salary,
        account: sa.account,
        signature: sig,
        consents,
        channel,
      });
      if (!r.ok) {
        setFormErr(r.error);
        if (r.field && ['nida', 'employer', 'checkNumber', 'account', 'netSalary'].includes(r.field)) {
          setErrors({ [r.field === 'netSalary' ? 'salary' : r.field]: r.error });
          setStep('apply');
        }
        return;
      }
      router.push(r.data!.redirect);
    });
  };

  const crumbs = (cur: number) => (
    <div className="crumbs" aria-label="Progress">
      {['Cart', method === 'salary_advance' ? 'Salary Advance details' : 'Checkout', 'Digital contract', 'Confirmation'].map((l, i) => (
        <span key={l} style={i <= cur ? { color: 'var(--text)', fontWeight: 600 } : undefined}>
          {i > 0 && <span style={{ margin: '0 8px', color: 'var(--muted)' }}>›</span>}
          {i + 1} {l}
        </span>
      ))}
    </div>
  );

  const summary = (
    <div className="card-soft" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 17, fontWeight: 600 }}>Summary</div>
      {cart.lines.map((l) => (
        <div key={l.productId} className="row" style={{ fontSize: 14 }}>
          <span>
            {l.name} × {l.qty}
          </span>
          <span>{fmt(l.price * l.qty)}</span>
        </div>
      ))}
      {cart.discount > 0 && (
        <div className="row" style={{ fontSize: 14, color: 'var(--ok)' }}>
          <span>Savings</span>
          <span>−{fmt(cart.discount)}</span>
        </div>
      )}
      <div className="row" style={{ fontSize: 14, color: 'var(--muted2)' }}>
        <span>Delivery · {cart.region}</span>
        <span>{cart.delivery ? fmt(cart.delivery) : 'Free'}</span>
      </div>
      <div className="sumtotal">
        <span>Total</span>
        <span data-testid="checkout-total">{fmt(cart.total)}</span>
      </div>
      {method === 'salary_advance' && (
        <>
          <div style={{ display: 'flex', gap: 6 }}>
            {[3, 6, 12].map((m) => (
              <button key={m} type="button" className={`chip chip-az ${m === months ? 'on' : ''}`} style={{ flex: 1, justifyContent: 'center', padding: '8px 0' }} onClick={() => setTerm(m)} aria-pressed={m === months}>
                {m} mo
              </button>
            ))}
          </div>
          <div className="row monthly" style={{ fontSize: 14, fontWeight: 600 }}>
            <span>Salary Advance · {months} months</span>
            <span>{fmt(monthly)}/mo</span>
          </div>
        </>
      )}
      {formErr && step === 'checkout' && (
        <div className="err" role="alert">
          {formErr}
        </div>
      )}
      <button type="button" className="btn btn-primary btn-block" onClick={place} disabled={pending || !cart.lines.length} data-testid="place-order">
        {pending ? 'Please wait…' : method === 'salary_advance' ? 'Continue to Azania Bank' : `Place order · ${fmt(cart.total)}`}
      </button>
      <div className="note">Prices include VAT. You&apos;ll get an SMS with your order number.</div>
    </div>
  );

  if (!cart.lines.length && step === 'checkout')
    return (
      <div style={{ border: '1px dashed var(--line)', borderRadius: 20, padding: 40, textAlign: 'center', color: 'var(--muted2)', marginTop: 22 }}>
        Your cart is empty.{' '}
        <Link href={`${b}/c/all`} style={{ fontWeight: 600, color: 'var(--monthly)' }}>
          Browse products
        </Link>
      </div>
    );

  if (step === 'checkout')
    return (
      <div className="two-col">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <section className="card" aria-labelledby="del-h">
            <div id="del-h" style={{ fontSize: 17, fontWeight: 600 }}>
              Delivery
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }} role="radiogroup" aria-label="Delivery region">
              {REGIONS.map((r) => (
                <button key={r.name} type="button" role="radio" aria-checked={cart.region === r.name} className={`chip ${cart.region === r.name ? 'on' : ''}`} style={{ padding: '7px 13px', fontSize: 13 }} onClick={() => setRegion(r.name)} disabled={pending}>
                  {r.name}
                </button>
              ))}
            </div>
            <div className="form-grid" style={{ marginTop: 14 }}>
              <Field label="Full name" error={errors.name}>
                <input className="input" value={co.name} onChange={(e) => setCo({ ...co, name: e.target.value })} autoComplete="name" aria-invalid={!!errors.name} name="name" />
              </Field>
              <Field label="Phone" error={errors.phone}>
                <input className="input" value={co.phone} onChange={(e) => setCo({ ...co, phone: e.target.value })} inputMode="tel" autoComplete="tel" placeholder="+255 7XX XXX XXX" aria-invalid={!!errors.phone} name="phone" />
              </Field>
              <Field label="Delivery address or landmark" wide>
                <input className="input" value={co.address} onChange={(e) => setCo({ ...co, address: e.target.value })} autoComplete="street-address" placeholder="e.g. Mikocheni B, near the market" name="address" />
              </Field>
              <Field label="Email (optional)" error={errors.email} wide>
                <input className="input" type="email" value={co.email} onChange={(e) => setCo({ ...co, email: e.target.value })} autoComplete="email" name="email" />
              </Field>
            </div>
          </section>
          <section className="card" aria-labelledby="pay-h">
            <div id="pay-h" style={{ fontSize: 17, fontWeight: 600 }}>
              Payment
            </div>
            <div className="pay-grid" role="radiogroup" aria-label="Payment method">
              {METHODS.map((m) => {
                const info = PAYMENT_METHOD_INFO[m];
                const allowed = paymentAllowed(m, cart.region);
                return (
                  <button key={m} type="button" role="radio" aria-checked={method === m} disabled={!allowed} onClick={() => setMethod(m)} className="paym" style={{ border: method === m ? '2px solid var(--p)' : '1px solid var(--line)', opacity: allowed ? 1 : 0.5 }} data-testid={`pay-${m}`}>
                    {info.azania ? (
                      <span className="paym-az">
                        <img src="/brand/azania-mark.png" alt="Azania Bank" />
                      </span>
                    ) : (
                      <span className="paym-mono" style={{ background: info.tile }}>
                        {info.mono}
                      </span>
                    )}
                    <span style={{ textAlign: 'left' }}>
                      <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{info.title}</span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--muted2)' }}>{allowed ? info.sub : 'Only in Dar es Salaam'}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <label className="check" style={{ marginTop: 16 }}>
              <input type="checkbox" checked={co.consent} onChange={(e) => setCo({ ...co, consent: e.target.checked })} aria-invalid={!!errors.consent} data-testid="consent" />
              <span>
                I agree that {brand.legal} processes my details to deliver this order, under the{' '}
                <Link href="/privacy" target="_blank" style={{ color: 'var(--monthly)', fontWeight: 600 }}>
                  Privacy Notice
                </Link>{' '}
                (Personal Data Protection Act, 2022).
              </span>
            </label>
            {errors.consent && <div className="err">{errors.consent}</div>}
          </section>
        </div>
        {summary}
      </div>
    );

  if (step === 'apply')
    return (
      <>
        {crumbs(1)}
        <div className="two-col" style={{ gridTemplateColumns: '1.5fr 1fr', marginTop: 18 }}>
          <section className="card" style={{ borderRadius: 26, padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src="/brand/azania-mark.png" alt="Azania Bank" style={{ width: 52, height: 40, objectFit: 'contain' }} />
              <div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-.02em' }}>Salary Advance application</h1>
                <div style={{ fontSize: 13.5, color: 'var(--muted2)' }}>Shared securely with Azania Bank for approval</div>
              </div>
            </div>
            <div className="eyebrow-muted">PERSONAL</div>
            <div className="form-grid">
              <Field label="Full name (as on NIDA)" error={errors.name}>
                <input className="input" value={co.name} onChange={(e) => setCo({ ...co, name: e.target.value })} autoComplete="name" />
              </Field>
              <Field label="NIDA number" error={errors.nida}>
                <input className="input" value={sa.nida} onChange={(e) => setSa({ ...sa, nida: e.target.value })} placeholder="19900101-12345-00001-23" inputMode="numeric" aria-invalid={!!errors.nida} name="nida" />
              </Field>
              <Field label="Phone">
                <input className="input" value={co.phone} onChange={(e) => setCo({ ...co, phone: e.target.value })} inputMode="tel" />
              </Field>
              <Field label="Email">
                <input className="input" type="email" value={co.email} onChange={(e) => setCo({ ...co, email: e.target.value })} placeholder="you@example.com" />
              </Field>
            </div>
            <div className="eyebrow-muted">EMPLOYMENT</div>
            <div className="form-grid">
              <Field label="Employer" error={errors.employer}>
                <input className="input" value={sa.employer} onChange={(e) => setSa({ ...sa, employer: e.target.value })} placeholder="e.g. Ministry of Health" aria-invalid={!!errors.employer} name="employer" />
              </Field>
              <Field label="Check / employee number" error={errors.checkNumber}>
                <input className="input" value={sa.checkNumber} onChange={(e) => setSa({ ...sa, checkNumber: e.target.value })} aria-invalid={!!errors.checkNumber} name="checkNumber" />
              </Field>
              <Field label="Job title">
                <input className="input" value={sa.jobTitle} onChange={(e) => setSa({ ...sa, jobTitle: e.target.value })} name="jobTitle" />
              </Field>
              <Field label="Net monthly salary (TZS)" error={errors.salary}>
                <input className="input" value={sa.salary} onChange={(e) => setSa({ ...sa, salary: e.target.value })} placeholder="1500000" inputMode="numeric" aria-invalid={!!errors.salary} name="salary" />
              </Field>
              <Field label="Azania Bank salary account number" error={errors.account} wide>
                <input className="input" value={sa.account} onChange={(e) => setSa({ ...sa, account: e.target.value })} placeholder="01XX XXXX XXXX" inputMode="numeric" aria-invalid={!!errors.account} name="account" />
              </Field>
            </div>
            <div className="eyebrow-muted">REPAYMENT PERIOD</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[3, 6, 12].map((m) => (
                <button key={m} type="button" className={`chip chip-az ${m === months ? 'on' : ''}`} style={{ flex: 1, justifyContent: 'center', borderRadius: 14, padding: 12, fontWeight: 600 }} onClick={() => setTerm(m)} aria-pressed={m === months}>
                  {m} months
                </button>
              ))}
            </div>
            <div className="err" role="alert">
              {formErr}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-outline" onClick={() => setStep('checkout')}>
                ← Back
              </button>
              <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={toContract} data-testid="to-contract">
                Review digital contract
              </button>
            </div>
          </section>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card-soft" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Instalment plan</div>
              <div className="sumrow">
                <span>Cash price</span>
                <b>{fmt(cart.total)}</b>
              </div>
              <div className="sumrow">
                <span>Term</span>
                <b>{months} months</b>
              </div>
              <div className="sumtotal" style={{ paddingTop: 10 }}>
                <span>Monthly</span>
                <span className="monthly" data-testid="advance-monthly">
                  {fmt(monthly)}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted2)' }}>First deduction on {fmtDate(first)}</div>
            </div>
            <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }} aria-live="polite">
              <div className="row" style={{ fontSize: 14, fontWeight: 600 }}>
                <span>Affordability</span>
                <span style={{ color: aff.status === 'within' ? 'var(--ok)' : aff.status === 'above' ? 'var(--warn)' : 'var(--muted)' }} data-testid="affordability">
                  {aff.status === 'within' ? 'Within limit' : aff.status === 'above' ? 'Above limit' : 'Enter salary'}
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 8, background: '#F0F1F5' }} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={aff.meter} aria-label="Share of the one-third limit used">
                <div style={{ height: 8, borderRadius: 8, width: `${aff.meter}%`, background: aff.status === 'above' ? 'var(--warn)' : 'var(--ok)', transition: 'width .25s' }} />
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted2)', lineHeight: 1.5 }}>
                {aff.status === 'unknown'
                  ? 'Instalments are capped at one third of your net monthly salary.'
                  : aff.status === 'within'
                    ? `Your instalment is ${aff.percent}% of net salary, within the one-third guideline.`
                    : `Instalment is ${aff.percent}% of net salary. Choose a longer term or a smaller basket. Maximum instalment: ${fmt(aff.maxInstalment)}.`}
              </div>
            </div>
            <div className="note">Your details are encrypted in transit and at rest, and used only to assess this Salary Advance. Final approval and terms are set by Azania Bank.</div>
          </div>
        </div>
      </>
    );

  // Contract
  const accMasked = `•••• ${sa.account.replace(/\s+/g, '').slice(-4)}`;
  return (
    <>
      <div className="row no-print" style={{ flexWrap: 'wrap' }}>
        {crumbs(2)}
        <button type="button" className="btn btn-outline btn-sm" style={{ borderWidth: 1, borderColor: 'var(--line)' }} onClick={() => window.print()}>
          Print or save PDF
        </button>
      </div>
      <article className="contract" aria-label="Instalment Sale and Salary Advance Agreement">
        <header className="contract-head">
          <img src={brand.logo} alt={brand.name} style={{ height: brand.key === 'mruk' ? 46 : 30 }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(15px, 2vw, 20px)', fontWeight: 700, letterSpacing: '-.01em' }}>Instalment Sale and Salary Advance Agreement</div>
            <div className="mono" style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 4 }}>
              Contract number issued on signing · {fmtDate(now)}
            </div>
          </div>
          <img src="/brand/azania-bank.png" alt="Azania Bank" style={{ width: 64, height: 64, objectFit: 'contain' }} />
        </header>
        <div className="contract-parties">
          <div>
            <div className="eyebrow-muted" style={{ fontSize: 10.5 }}>SELLER</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{brand.legal}</div>
            <div style={{ color: 'var(--muted2)' }}>Dar es Salaam, Tanzania</div>
          </div>
          <div>
            <div className="eyebrow-muted" style={{ fontSize: 10.5 }}>FINANCIER</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Azania Bank Limited</div>
            <div style={{ color: 'var(--muted2)' }}>Salary Advance Scheme</div>
          </div>
          <div>
            <div className="eyebrow-muted" style={{ fontSize: 10.5 }}>CUSTOMER</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{co.name}</div>
            <div style={{ color: 'var(--muted2)' }}>
              NIDA {normaliseNida(sa.nida)}
              <br />
              {sa.jobTitle ? `${sa.jobTitle}, ` : ''}
              {sa.employer} · Check no. {sa.checkNumber}
              <br />
              Account {accMasked} · {co.phone}
            </div>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ paddingLeft: 0 }}>Goods</th>
                <th>Model</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right', paddingRight: 0 }}>Cash price</th>
              </tr>
            </thead>
            <tbody>
              {cart.lines.map((l) => (
                <tr key={l.productId}>
                  <td style={{ paddingLeft: 0, fontWeight: 500 }}>{l.name}</td>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {l.model}
                  </td>
                  <td style={{ textAlign: 'center' }}>{l.qty}</td>
                  <td style={{ textAlign: 'right', paddingRight: 0 }}>{fmt(l.price * l.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="contract-boxes">
          <div>
            <span>Total cash price</span>
            <b>{fmt(cart.total)}</b>
          </div>
          <div>
            <span>Term</span>
            <b>{months} months</b>
          </div>
          <div className="hi">
            <span>Monthly instalment</span>
            <b>{fmt(monthly)}</b>
          </div>
          <div>
            <span>First deduction</span>
            <b>{fmtDate(first)}</b>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Repayment schedule</div>
          <div className="schedule">
            {schedule.map((r) => (
              <div key={r.n}>
                <span style={{ color: 'var(--muted2)' }}>
                  {r.n}. {fmtDate(r.dueDate)}
                </span>
                <b>{fmt(r.amount)}</b>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Key terms</div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.65, color: '#2E3245' }}>
            {terms.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
        </div>
        <div className="contract-sign">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label className="field">
              Type your full name to sign
              <input className="input" value={sig} onChange={(e) => setSig(e.target.value)} placeholder={co.name} name="signature" data-testid="signature" />
            </label>
            {CONTRACT_CONSENTS.map((text, i) => (
              <label key={text} className="check">
                <input type="checkbox" checked={consents[i]} onChange={(e) => setConsents((c) => (i === 0 ? [e.target.checked, c[1]] : [c[0], e.target.checked]))} data-testid={`consent-${i}`} />
                <span>{text}</span>
              </label>
            ))}
          </div>
          <div style={{ borderBottom: '1.5px solid var(--text)', minHeight: 70, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 6, gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-caveat), cursive', fontSize: 38, color: '#1D2366', lineHeight: 1 }}>{sig}</span>
            <span style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'right' }}>Customer e-signature · {fmtDate(now)}</span>
          </div>
        </div>
      </article>
      <div className="row no-print" style={{ marginTop: 18, flexWrap: 'wrap' }}>
        <button type="button" style={{ fontSize: 14.5, fontWeight: 600, minHeight: 44 }} onClick={() => setStep('apply')}>
          ← Edit details
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span className="err" role="alert">
            {formErr}
          </span>
          <button type="button" className="btn" style={{ background: canSign ? 'var(--p)' : '#B9BCC9', color: '#fff' }} onClick={sign} disabled={pending} data-testid="sign-submit">
            {pending ? 'Submitting…' : 'Sign and submit to Azania Bank'}
          </button>
        </div>
      </div>
    </>
  );
}
