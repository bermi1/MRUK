import Link from 'next/link';
import { decrypt, prisma } from '@bt/db';
import { fmtDate, fmtDateTime, fmtTZS, formatTzPhone, maskTzPhone } from '@bt/core';
import { advanceLifecycleAction, bankDecisionAction, decideAdvanceAction, instalmentPaidAction } from '@/app/actions/admin';
import { ActBtn } from '@/components/admin/ActBtn';
import { AForm } from '@/components/admin/AForm';
import { AdvancePill, Forbidden, Meter } from '@/components/admin/ui';
import { adminFilters, ago, monthName, orderWhere, startOfMonthEAT } from '@/server/admin/context';
import { audit } from '@/server/audit';
import { requireStaff } from '@/server/auth';
import { integrations } from '@/server/integrations';

export const metadata = { title: 'Salary Advance' };

const COLS = [
  ['submitted', 'Submitted'],
  ['approved', 'Approved'],
  ['disbursed', 'Disbursed'],
  ['repaying', 'Repaying'],
] as const;

function safeDecrypt(v: string): string {
  try {
    return decrypt(v);
  } catch {
    return '(unreadable)';
  }
}

export default async function AdvancePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff();
  if (!ctx.can('advance')) return <Forbidden what="Salary Advance applications" />;
  const sp = await searchParams;
  const f = await adminFilters(ctx);
  const ow = orderWhere(f);
  const view = sp.view === 'rejected' || sp.view === 'closed' ? sp.view : 'pipeline';
  const month = startOfMonthEAT();
  const include = { order: { select: { number: true, brandKey: true, items: { select: { name: true }, take: 2 } } }, contract: { select: { number: true } } } as const;
  const [financed, colRows, counts, listRows] = await Promise.all([
    prisma.salaryAdvanceApplication.aggregate({ where: { order: ow, status: { in: ['approved', 'disbursed', 'repaying', 'closed'] }, decidedAt: { gte: month } }, _sum: { total: true } }),
    view === 'pipeline' ? Promise.all(COLS.map(([s]) => prisma.salaryAdvanceApplication.findMany({ where: { order: ow, status: s }, include, orderBy: { createdAt: s === 'submitted' ? 'asc' : 'desc' }, take: 30 }))) : Promise.resolve([]),
    prisma.salaryAdvanceApplication.groupBy({ by: ['status'], where: { order: ow }, _count: { _all: true } }),
    view !== 'pipeline' ? prisma.salaryAdvanceApplication.findMany({ where: { order: ow, status: view }, include, orderBy: { updatedAt: 'desc' }, take: 100 }) : Promise.resolve([]),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const id = sp.id && /^[a-z0-9]{10,40}$/.test(sp.id) ? sp.id : null;
  const a = id
    ? await prisma.salaryAdvanceApplication.findFirst({
        where: { id, order: { brandKey: { in: f.allowed } } },
        include: { order: { include: { items: true } }, schedule: { orderBy: { n: 'asc' } }, contract: true },
      })
    : null;
  const reveal = !!a && sp.reveal === '1';
  if (a && reveal) await audit(ctx.email, 'advance.view_pii', 'SalaryAdvanceApplication', a.id);
  const write = ctx.can('advance.write');
  const paid = a ? a.schedule.filter((s) => s.paidAt) : [];
  const href = (extra: Record<string, string>) => `/admin/advance?${new URLSearchParams({ ...(view !== 'pipeline' ? { view } : {}), ...extra })}`;
  const card = (r: (typeof listRows)[number]) => (
    <Link key={r.id} href={href({ id: r.id })} className={`ad-pcard ${r.id === a?.id ? 'sel' : ''}`}>
      <span className="top">
        <span className="mono">{r.contract?.number ?? r.order.number}</span>
        <span>{ago(r.createdAt)}</span>
      </span>
      <span className="nm">{r.fullName}</span>
      <span className="emp">{r.employer}</span>
      <span className="bot">
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.order.items[0]?.name ?? r.order.number}</span>
        <b>
          {r.termMonths} mo · {fmtTZS(r.monthly)}
        </b>
      </span>
    </Link>
  );

  return (
    <div className="ad-stack">
      <div className="ad-banner">
        <span className="ic">
          <img src="/brand/azania-mark.png" alt="Azania Bank" />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Azania Bank Salary Advance pipeline</div>
          <p>Decisions come from {integrations.bank.name}. Stock is reserved when an application is submitted.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12.5, color: '#E3F4FC' }}>Financed in {monthName(new Date())}</div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{fmtTZS(financed._sum.total ?? 0)}</div>
        </div>
      </div>

      <nav className="ad-tabs" aria-label="Application view">
        <Link className="ad-tab" href="/admin/advance" aria-current={view === 'pipeline' ? 'true' : undefined}>
          Pipeline <span>{COLS.reduce((s, [k]) => s + count(k), 0)}</span>
        </Link>
        <Link className="ad-tab" href="/admin/advance?view=rejected" aria-current={view === 'rejected' ? 'true' : undefined}>
          Rejected <span>{count('rejected')}</span>
        </Link>
        <Link className="ad-tab" href="/admin/advance?view=closed" aria-current={view === 'closed' ? 'true' : undefined}>
          Closed <span>{count('closed')}</span>
        </Link>
      </nav>

      {a && (
        <section className="ad-card ad-stack s12" aria-label={`Application for order ${a.order.number}`}>
          <div className="ad-between">
            <div className="ad-row" style={{ gap: 12 }}>
              <h2 className="ad-h" style={{ fontSize: 17 }}>
                {a.fullName}
              </h2>
              <AdvancePill status={a.status} />
              <span className="mono ad-muted2" style={{ fontSize: 12 }}>
                {a.contract?.number} · <Link href={`/admin/orders?o=${a.order.number}`}>{a.order.number}</Link>
              </span>
            </div>
            <div className="ad-row">
              {reveal ? (
                <Link className="ad-btn line sm" href={href({ id: a.id })}>
                  Hide details
                </Link>
              ) : (
                <Link className="ad-btn line sm" href={href({ id: a.id, reveal: '1' })}>
                  Show full details
                </Link>
              )}
              <Link className="ad-btn line sm" href={href({})} aria-label="Close application">
                Close
              </Link>
            </div>
          </div>
          <div className="ad-grid4" style={{ gap: 12 }}>
            <div className="ad-box">
              <div className="ad-cap" style={{ marginTop: 0 }}>
                APPLICANT
              </div>
              <div className="ad-kv">
                <span>Phone</span>
                <span>{reveal ? formatTzPhone(a.phone) : maskTzPhone(a.phone)}</span>
              </div>
              <div className="ad-kv">
                <span>NIDA</span>
                <span className="mono">{reveal ? safeDecrypt(a.nidaEnc) : `•••• ${a.nidaLast4}`}</span>
              </div>
              <div className="ad-kv">
                <span>Azania account</span>
                <span className="mono">{reveal ? safeDecrypt(a.accountEnc) : `•••• ${a.accountLast4}`}</span>
              </div>
              <div className="ad-kv">
                <span>Channel</span>
                <span>{a.channel === 'azania' ? 'Azania app' : a.channel}</span>
              </div>
            </div>
            <div className="ad-box">
              <div className="ad-cap" style={{ marginTop: 0 }}>
                EMPLOYER
              </div>
              <div className="ad-kv">
                <span>Employer</span>
                <span>{a.employer}</span>
              </div>
              <div className="ad-kv">
                <span>Job title</span>
                <span>{a.jobTitle}</span>
              </div>
              <div className="ad-kv">
                <span>Check no.</span>
                <span className="mono">{reveal ? a.checkNumber : '••••••'}</span>
              </div>
              <div className="ad-kv">
                <span>Net salary</span>
                <span>{reveal ? fmtTZS(Number(safeDecrypt(a.netSalaryEnc)) || 0) : 'TZS •••'}</span>
              </div>
            </div>
            <div className="ad-box">
              <div className="ad-cap" style={{ marginTop: 0 }}>
                PLAN
              </div>
              <div className="ad-kv">
                <span>Financed</span>
                <span>{fmtTZS(a.total)}</span>
              </div>
              <div className="ad-kv">
                <span>Term</span>
                <span>
                  {a.termMonths} × {fmtTZS(a.monthly)}
                </span>
              </div>
              <div className="ad-kv">
                <span>Affordability</span>
                <span className={a.ratioPercent > 33 ? 'ad-bad' : 'ad-ok'}>{a.ratioPercent}% of salary</span>
              </div>
              <Meter pct={(a.ratioPercent / 50) * 100} color={a.ratioPercent > 33 ? '#B4462E' : '#16825D'} />
            </div>
            <div className="ad-box">
              <div className="ad-cap" style={{ marginTop: 0 }}>
                DECISION
              </div>
              <div className="ad-kv">
                <span>Submitted</span>
                <span>{fmtDateTime(a.createdAt)}</span>
              </div>
              <div className="ad-kv">
                <span>Bank ref</span>
                <span className="mono">{a.bankReference || '—'}</span>
              </div>
              <div className="ad-kv">
                <span>Decided</span>
                <span>{a.decidedAt ? `${fmtDateTime(a.decidedAt)} · ${a.decidedBy ?? ''}` : 'Pending'}</span>
              </div>
              {a.decisionNote && <div style={{ fontSize: 12.5, marginTop: 4 }}>{a.decisionNote}</div>}
            </div>
          </div>
          <div className="ad-between">
            <div style={{ fontSize: 13 }}>
              <b>Goods:</b> {a.order.items.map((i) => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(', ')}
            </div>
            {a.contract && (
              <a className="ad-btn ghost sm" href={`/api/admin/contracts/${a.contract.number}`} target="_blank" rel="noopener">
                Contract PDF · signed {fmtDate(a.contract.signedAt)}
              </a>
            )}
          </div>
          {write && a.status === 'submitted' && (
            <div className="ad-stack s8">
              <div className="ad-btns">
                <ActBtn action={bankDecisionAction.bind(null, a.id)} className="ad-btn az" showOk>
                  Ask Azania Bank for decision
                </ActBtn>
              </div>
              <details className="ad-more">
                <summary>Manual decision (with note)</summary>
                <div className="ad-grid2">
                  <AForm action={decideAdvanceAction.bind(null, a.id, 'approved')} submit="Approve manually" submitClass="ad-btn ok" className="ad-form one">
                    <label className="ad-field">
                      Note (optional)
                      <input name="note" maxLength={300} placeholder="e.g. Approved by phone with Azania ops" />
                    </label>
                  </AForm>
                  <AForm action={decideAdvanceAction.bind(null, a.id, 'rejected')} submit="Reject" submitClass="ad-btn danger" className="ad-form one" confirm="Reject this application? Reserved stock is released.">
                    <label className="ad-field">
                      Reason (required)
                      <input name="note" maxLength={300} required minLength={3} placeholder="e.g. Employer not on the scheme" />
                    </label>
                  </AForm>
                </div>
              </details>
            </div>
          )}
          {write && ['approved', 'disbursed', 'repaying'].includes(a.status) && (
            <div className="ad-btns" style={{ maxWidth: 520 }}>
              {a.status === 'approved' && <ActBtn action={advanceLifecycleAction.bind(null, a.id, 'disbursed')}>Mark disbursed</ActBtn>}
              {a.status === 'disbursed' && <ActBtn action={advanceLifecycleAction.bind(null, a.id, 'repaying')}>Mark repaying</ActBtn>}
              {a.status === 'repaying' && (
                <ActBtn action={advanceLifecycleAction.bind(null, a.id, 'closed')} className="ad-btn line" confirm="Close this advance even though instalments may be outstanding?">
                  Mark closed
                </ActBtn>
              )}
            </div>
          )}
          <div>
            <div className="ad-between" style={{ marginBottom: 8 }}>
              <h3 className="ad-h" style={{ fontSize: 13.5 }}>
                Repayment schedule
              </h3>
              <span className="ad-muted2" style={{ fontSize: 12.5 }}>
                {paid.length} of {a.schedule.length} paid · {fmtTZS(paid.reduce((s, x) => s + x.amount, 0))} received
              </span>
            </div>
            <div className="ad-sched">
              {a.schedule.map((s) => (
                <div key={s.id} className={s.paidAt ? 'paid' : undefined}>
                  <b>
                    #{s.n} · {fmtTZS(s.amount)}
                  </b>
                  <span className="ad-muted2">Due {fmtDate(s.dueDate)}</span>
                  {s.paidAt ? (
                    <span className="ad-ok" style={{ fontWeight: 600 }}>
                      Paid {fmtDate(s.paidAt)}
                    </span>
                  ) : write && ['disbursed', 'repaying'].includes(a.status) ? (
                    <ActBtn action={instalmentPaidAction.bind(null, a.id, s.n)} className="ad-btn line sm">
                      Mark paid
                    </ActBtn>
                  ) : (
                    <span className="ad-muted">Unpaid</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          {!write && <p className="ad-muted2" style={{ fontSize: 12.5, margin: 0 }}>Your role can view applications. Decisions need the Finance or Super admin role.</p>}
        </section>
      )}

      {view === 'pipeline' ? (
        <div className="ad-pipe">
          {COLS.map(([s, title], i) => (
            <section className="ad-col" key={s} aria-label={title}>
              <h3>
                {title} <span>{count(s)}</span>
              </h3>
              {(colRows[i] ?? []).map(card)}
              {!(colRows[i] ?? []).length && <div className="ad-empty">None</div>}
            </section>
          ))}
        </div>
      ) : (
        <section className="ad-card">
          <div className="ad-scroll">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Contract</th>
                  <th>Applicant</th>
                  <th>Employer</th>
                  <th>Plan</th>
                  <th>Updated</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {listRows.map((r) => (
                  <tr key={r.id} className={r.id === a?.id ? 'sel' : undefined}>
                    <td>
                      <Link className="num" href={href({ id: r.id })}>
                        {r.contract?.number ?? r.order.number}
                      </Link>
                    </td>
                    <td>{r.fullName}</td>
                    <td className="ad-muted2">{r.employer}</td>
                    <td>
                      {r.termMonths} × {fmtTZS(r.monthly)}
                    </td>
                    <td className="ad-muted2">{fmtDateTime(r.updatedAt)}</td>
                    <td className="ad-muted2" style={{ fontSize: 12.5 }}>
                      {r.decisionNote}
                    </td>
                  </tr>
                ))}
                {!listRows.length && (
                  <tr>
                    <td colSpan={6} className="ad-empty">
                      No {view} applications
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
