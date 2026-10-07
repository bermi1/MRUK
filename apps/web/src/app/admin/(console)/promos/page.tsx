import Link from 'next/link';
import { prisma } from '@bt/db';
import { fmtDate, fmtTZS } from '@bt/core';
import { createFlashAction, deleteDiscountAction, deleteFlashAction, saveDiscountAction, toggleDiscountAction, toggleFlashAction, toggleHotAction } from '@/app/actions/admin';
import { ActBtn } from '@/components/admin/ActBtn';
import { AForm } from '@/components/admin/AForm';
import { Forbidden, Kpi, Pill } from '@/components/admin/ui';
import { adminFilters, BRAND_NAME, isoDayEAT, monthName, orderWhere, startOfMonthEAT } from '@/server/admin/context';
import { requireStaff } from '@/server/auth';

export const metadata = { title: 'Promotions and deals' };

type Code = Awaited<ReturnType<typeof prisma.discountCode.findMany>>[number];

function CodeFields({ c, allowed }: { c?: Code; allowed: string[] }) {
  return (
    <>
      {c && <input type="hidden" name="id" value={c.id} />}
      <label className="ad-field">
        Code
        <input name="code" defaultValue={c?.code} required maxLength={20} placeholder="KARIBU10" style={{ textTransform: 'uppercase' }} />
      </label>
      <label className="ad-field">
        Discount %
        <input name="percent" defaultValue={c?.percent ?? 10} required inputMode="numeric" />
      </label>
      <label className="ad-field">
        Brand
        <select name="brand" defaultValue={c ? (c.brandKey ?? 'both') : allowed.length > 1 ? 'both' : allowed[0]}>
          {allowed.length > 1 && <option value="both">Both brands</option>}
          {allowed.map((b) => (
            <option key={b} value={b}>
              {BRAND_NAME[b]}
            </option>
          ))}
        </select>
      </label>
      <label className="ad-field">
        Min. subtotal (TZS)
        <input name="minSubtotal" defaultValue={c?.minSubtotal ?? ''} inputMode="numeric" placeholder="none" />
      </label>
      <label className="ad-field">
        Max uses
        <input name="maxUses" defaultValue={c?.maxUses ?? ''} inputMode="numeric" placeholder="unlimited" />
      </label>
      <label className="ad-field">
        Ends
        <input type="date" name="expiresAt" defaultValue={c?.expiresAt ? isoDayEAT(c.expiresAt) : ''} />
      </label>
      <label className="ad-check">
        <input type="checkbox" name="active" defaultChecked={c ? c.active : true} /> Active
      </label>
    </>
  );
}

export default async function PromosPage() {
  const ctx = await requireStaff();
  if (!ctx.can('promos')) return <Forbidden what="promotions" />;
  const f = await adminFilters(ctx);
  const write = ctx.can('promos.write');
  const month = startOfMonthEAT();
  const [hotBlocks, dealBlocks, products, flash, codes, promoRev] = await Promise.all([
    prisma.cmsBlock.findMany({ where: { brandKey: { in: f.brands }, key: 'hot' } }),
    prisma.cmsBlock.findMany({ where: { brandKey: { in: f.brands }, key: 'deals' } }),
    prisma.product.findMany({ where: { brandKey: { in: f.brands }, hidden: false }, select: { id: true, brandKey: true, name: true, model: true, price: true, images: true }, orderBy: { name: 'asc' } }),
    prisma.promotion.findMany({ where: { brandKey: { in: f.brands }, kind: 'flash' }, orderBy: { createdAt: 'desc' } }),
    prisma.discountCode.findMany({ where: { OR: [{ brandKey: { in: f.brands } }, ...(f.brands.length === 2 || f.allowed.length === 2 ? [{ brandKey: null }] : [])] }, orderBy: [{ active: 'desc' }, { code: 'asc' }] }),
    prisma.order.aggregate({ where: { ...orderWhere(f), createdAt: { gte: month }, discount: { gt: 0 }, status: { notIn: ['cancelled', 'rejected'] } }, _sum: { discount: true, total: true }, _count: { _all: true } }),
  ]);
  const hot = new Set(hotBlocks.flatMap((b) => (b.json as string[]) ?? []));
  const byId = new Map(products.map((p) => [p.id, p]));
  const combos = dealBlocks.flatMap((b) => ((b.json as { title: string; save: number; items: string[] }[]) ?? []).map((d) => ({ ...d, brand: b.brandKey })));
  const picks = [...products].sort((a, b) => Number(hot.has(b.id)) - Number(hot.has(a.id)) || Number(!!b.images[0]) - Number(!!a.images[0])).slice(0, 40);
  const now = new Date();

  return (
    <div className="ad-stack">
      <div className="ad-grid4">
        <Kpi label="Active combos" value={combos.length} />
        <Kpi label="Hot products" value={[...hot].filter((id) => byId.has(id)).length} />
        <Kpi label="Active discount codes" value={codes.filter((c) => c.active && (!c.expiresAt || c.expiresAt > now)).length} />
        <Kpi label={`Promo revenue, ${monthName(now)}`} value={`TZS ${((promoRev._sum.total ?? 0) / 1e6).toFixed(1)}M`} delta={`${promoRev._count._all} orders · ${fmtTZS(promoRev._sum.discount ?? 0)} discounted`} color="#5E6378" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)', gap: 16, alignItems: 'start' }} className="ad-cmsgrid">
        <section className="ad-card">
          <div className="ad-between">
            <h2 className="ad-h">Hot products</h2>
            <span className="ad-muted" style={{ fontSize: 12.5 }}>
              {write ? 'Tap to feature on the landing page' : 'Featured on the landing page'}
            </span>
          </div>
          <div className="ad-hot" style={{ marginTop: 12 }}>
            {picks.map((p) => {
              const on = hot.has(p.id);
              const body = (
                <>
                  <span className="im">{p.images[0] ? <img src={p.images[0]} alt="" loading="lazy" /> : p.model.slice(0, 10)}</span>
                  <span className="nm">{p.name}</span>
                  <span className="ad-between" style={{ width: '100%' }}>
                    <span className="ad-muted" style={{ fontSize: 11 }}>
                      {BRAND_NAME[p.brandKey]}
                    </span>
                    <span className={`ad-pill ${on ? 'pill-hot' : 'pill-grey'}`} style={{ fontSize: 10.5, padding: '2px 8px' }}>
                      {on ? 'HOT' : 'Off'}
                    </span>
                  </span>
                </>
              );
              return write ? (
                <ActBtn key={p.id} action={toggleHotAction.bind(null, p.brandKey, p.id)} className="" pressed={on} label={`${on ? 'Remove' : 'Feature'} ${p.name} ${on ? 'from' : 'as'} hot pick`}>
                  {body}
                </ActBtn>
              ) : (
                <button key={p.id} type="button" disabled aria-pressed={on}>
                  {body}
                </button>
              );
            })}
          </div>
        </section>
        <div className="ad-stack">
          <section className="ad-card">
            <div className="ad-between">
              <h2 className="ad-h">Combo deals</h2>
              {ctx.can('cms') && (
                <Link href="/admin/cms" style={{ fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  Edit in CMS
                </Link>
              )}
            </div>
            {combos.map((c, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2px 10px', padding: '10px 0', borderBottom: '1px solid #F0F1F5' }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{c.title}</span>
                <Pill cls="pill-green">−{c.save}%</Pill>
                <span className="ad-muted" style={{ fontSize: 12 }}>
                  {BRAND_NAME[c.brand]} · {c.items.map((id) => byId.get(id)?.name).filter(Boolean).join(' + ')}
                </span>
                <span className="ad-ok" style={{ fontSize: 12, textAlign: 'right' }}>
                  Live
                </span>
              </div>
            ))}
            {!combos.length && <div className="ad-empty">No bundles</div>}
          </section>
          <section className="ad-card">
            <h2 className="ad-h">Flash deals</h2>
            <table className="ad-table" style={{ marginTop: 8 }}>
              <tbody>
                {flash.map((pr) => {
                  const p = pr.productId ? byId.get(pr.productId) : undefined;
                  return (
                    <tr key={pr.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{p?.name ?? pr.productId ?? pr.title}</div>
                        <div className="ad-muted" style={{ fontSize: 11.5 }}>
                          {BRAND_NAME[pr.brandKey]} · −{pr.percent}%{p ? ` · ${fmtTZS(Math.round((p.price * (100 - pr.percent)) / 100))}` : ''}
                        </div>
                      </td>
                      <td className="r">
                        <span className="ad-row" style={{ justifyContent: 'flex-end' }}>
                          {write ? (
                            <>
                              <ActBtn action={toggleFlashAction.bind(null, pr.id)} className={`ad-pill ${pr.active ? 'pill-green' : 'pill-grey'}`} label={`${pr.active ? 'Pause' : 'Activate'} flash deal`}>
                                {pr.active ? 'Active' : 'Paused'}
                              </ActBtn>
                              <ActBtn action={deleteFlashAction.bind(null, pr.id)} className="ad-btn danger sm" confirm="Delete this flash deal?">
                                Delete
                              </ActBtn>
                            </>
                          ) : (
                            <Pill cls={pr.active ? 'pill-green' : 'pill-grey'}>{pr.active ? 'Active' : 'Paused'}</Pill>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {write && (
              <details className="ad-more" style={{ marginTop: 8 }}>
                <summary>+ New flash deal</summary>
                <AForm action={createFlashAction} submit="Start flash deal" className="ad-form" resetOnOk>
                  <label className="ad-field full">
                    Product
                    <select name="productId" required>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {BRAND_NAME[p.brandKey]} · {p.name} ({fmtTZS(p.price)})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ad-field">
                    Percent off
                    <input name="percent" required inputMode="numeric" defaultValue="10" />
                  </label>
                </AForm>
              </details>
            )}
          </section>
        </div>
      </div>
      <section className="ad-card">
        <div className="ad-between">
          <h2 className="ad-h">Discount codes</h2>
        </div>
        <div className="ad-scroll">
          <table className="ad-table" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Brand</th>
                <th>Discount</th>
                <th>Min. subtotal</th>
                <th>Uses</th>
                <th>Ends</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => {
                const expired = !!c.expiresAt && c.expiresAt < now;
                return (
                  <tr key={c.id}>
                    <td className="mono" style={{ fontWeight: 600, verticalAlign: 'top' }}>
                      {c.code}
                      {write && (
                        <details className="ad-more" style={{ fontFamily: 'var(--font-geist)', fontWeight: 400 }}>
                          <summary>Edit</summary>
                          <div style={{ width: 'min(640px, 80vw)' }}>
                            <AForm action={saveDiscountAction} submit="Save code" className="ad-form three">
                              <CodeFields c={c} allowed={f.allowed} />
                            </AForm>
                          </div>
                        </details>
                      )}
                    </td>
                    <td style={{ verticalAlign: 'top' }}>{c.brandKey ? BRAND_NAME[c.brandKey] : 'Both'}</td>
                    <td style={{ verticalAlign: 'top' }}>{c.percent ? `${c.percent}% off` : 'Promo (0%)'}</td>
                    <td className="ad-muted2" style={{ verticalAlign: 'top' }}>
                      {c.minSubtotal ? fmtTZS(c.minSubtotal) : '—'}
                    </td>
                    <td style={{ verticalAlign: 'top' }}>
                      {c.uses}
                      {c.maxUses ? ` / ${c.maxUses}` : ''}
                    </td>
                    <td className="ad-muted2" style={{ verticalAlign: 'top' }}>
                      {c.expiresAt ? fmtDate(c.expiresAt) : '—'}
                    </td>
                    <td style={{ verticalAlign: 'top' }}>
                      {write ? (
                        <ActBtn action={toggleDiscountAction.bind(null, c.id)} className={`ad-pill ${c.active && !expired ? 'pill-green' : 'pill-grey'}`} label={`${c.active ? 'Pause' : 'Activate'} ${c.code}`}>
                          {expired ? 'Expired' : c.active ? 'Active' : 'Paused'}
                        </ActBtn>
                      ) : (
                        <Pill cls={c.active && !expired ? 'pill-green' : 'pill-grey'}>{expired ? 'Expired' : c.active ? 'Active' : 'Paused'}</Pill>
                      )}
                    </td>
                    <td className="r" style={{ verticalAlign: 'top' }}>
                      {write && (
                        <ActBtn action={deleteDiscountAction.bind(null, c.id)} className="ad-btn danger sm" confirm={`Delete code ${c.code}?`}>
                          Delete
                        </ActBtn>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {write && (
          <details className="ad-more" style={{ marginTop: 10 }}>
            <summary>+ New discount code</summary>
            <AForm action={saveDiscountAction} submit="Create code" className="ad-form three" resetOnOk>
              <CodeFields allowed={f.allowed} />
            </AForm>
          </details>
        )}
      </section>
    </div>
  );
}
