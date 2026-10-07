import Link from 'next/link';
import { fmtDate, fmtTZS } from '@bt/core';
import { PrintButton } from '@/components/admin/PrintButton';
import { Forbidden, Kpi, Meter } from '@/components/admin/ui';
import { adminFilters, BRAND_NAME, isoDayEAT, parseDayEAT, startOfDayEAT, startOfMonthEAT } from '@/server/admin/context';
import { reportData } from '@/server/admin/reports';
import { requireStaff } from '@/server/auth';

export const metadata = { title: 'Reports' };

const M = (n: number) => `TZS ${(n / 1e6).toFixed(1)}M`;
function pct(now: number, before: number) {
  if (!before) return now ? 'New this period' : '—';
  const p = ((now - before) / before) * 100;
  return `${p >= 0 ? '+' : ''}${p.toFixed(1)}% vs previous period`;
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff();
  if (!ctx.can('reports')) return <Forbidden what="reports" />;
  const sp = await searchParams;
  const f = await adminFilters(ctx);
  const tomorrow = new Date(startOfDayEAT().getTime() + 86_400_000);
  const from = parseDayEAT(sp.from) ?? startOfMonthEAT();
  const toIncl = parseDayEAT(sp.to);
  let to = toIncl ? new Date(toIncl.getTime() + 86_400_000) : tomorrow;
  if (to <= from) to = new Date(from.getTime() + 86_400_000);
  if (to.getTime() - from.getTime() > 400 * 86_400_000) to = new Date(from.getTime() + 400 * 86_400_000);
  const r = await reportData(f, from, to);
  const fromS = isoDayEAT(from);
  const toS = isoDayEAT(new Date(to.getTime() - 1));
  const presets = [
    ['This month', isoDayEAT(startOfMonthEAT()), isoDayEAT(new Date(tomorrow.getTime() - 1))],
    ['Last month', isoDayEAT(startOfMonthEAT(new Date(), -1)), isoDayEAT(new Date(startOfMonthEAT().getTime() - 1))],
    ['Last 90 days', isoDayEAT(new Date(tomorrow.getTime() - 90 * 86_400_000)), isoDayEAT(new Date(tomorrow.getTime() - 1))],
  ] as const;
  const maxBrand = Math.max(1, ...r.byBrand.map((b) => b.revenue));
  const maxCat = Math.max(1, ...r.byCategory.map((b) => b.revenue));
  const maxReg = Math.max(1, ...r.byRegion.map((b) => b.revenue));

  return (
    <div className="ad-stack">
      <div className="ad-between no-print">
        <div className="ad-row" style={{ flexWrap: 'wrap' }}>
          {presets.map(([l, a, b]) => (
            <Link key={l} href={`/admin/reports?from=${a}&to=${b}`} className={a === fromS && b === toS ? 'ad-btn sm' : 'ad-btn line sm'}>
              {l}
            </Link>
          ))}
          <form action="/admin/reports" className="ad-row" aria-label="Custom date range">
            <label className="ad-field" style={{ flexDirection: 'row', alignItems: 'center' }}>
              From <input type="date" name="from" defaultValue={fromS} className="ad-input" style={{ width: 150, minHeight: 36, padding: '6px 8px' }} />
            </label>
            <label className="ad-field" style={{ flexDirection: 'row', alignItems: 'center' }}>
              to <input type="date" name="to" defaultValue={toS} className="ad-input" style={{ width: 150, minHeight: 36, padding: '6px 8px' }} />
            </label>
            <button className="ad-btn line sm" type="submit">
              Apply
            </button>
          </form>
        </div>
        <div className="ad-row">
          <a className="ad-btn line" href={`/api/admin/reports?from=${fromS}&to=${toS}&format=csv`}>
            Export Excel (CSV)
          </a>
          <PrintButton />
        </div>
      </div>
      <h2 className="ad-h" style={{ fontSize: 16 }}>
        Sales report · {fmtDate(from)} – {fmtDate(new Date(to.getTime() - 1))} · {f.brand === 'all' ? 'All brands' : BRAND_NAME[f.brand]}
        {f.branch ? ` · ${f.branch}` : ''}
      </h2>
      <div className="ad-grid4">
        <Kpi label="Revenue" value={M(r.revenue)} delta={pct(r.revenue, r.prev.revenue)} />
        <Kpi label="Orders" value={r.orders.toLocaleString('en-US')} delta={pct(r.orders, r.prev.orders)} />
        <Kpi label="Average order" value={fmtTZS(r.aov)} delta={pct(r.aov, r.prev.aov)} />
        <Kpi label="Salary Advance share" value={`${r.saShare}%`} delta={`${r.saShare - r.prev.saShare >= 0 ? '+' : ''}${r.saShare - r.prev.saShare} pts`} color="#0070A8" />
      </div>
      <p className="ad-muted" style={{ fontSize: 12, margin: '-6px 0 0' }}>
        Confirmed orders only (processing, packed, out for delivery, delivered). Amounts include VAT.
      </p>
      <div className="ad-grid2">
        <section className="ad-card">
          <h2 className="ad-h">Revenue by brand</h2>
          {r.byBrand.map((b) => (
            <div key={b.key} style={{ marginTop: 14 }}>
              <div className="ad-between" style={{ fontSize: 13.5 }}>
                <span>{BRAND_NAME[b.key]}</span>
                <b>{M(b.revenue)}</b>
              </div>
              <Meter lg pct={(b.revenue / maxBrand) * 100} color={b.key === 'mruk' ? '#1D2366' : '#111216'} />
            </div>
          ))}
          <h2 className="ad-h" style={{ marginTop: 22 }}>
            Sales by category
          </h2>
          {r.byCategory.map((c) => (
            <div className="ad-hbar" key={c.name} style={{ gridTemplateColumns: '150px 1fr 70px' }}>
              <span>{c.name}</span>
              <Meter pct={(c.revenue / maxCat) * 100} />
              <b>{(c.revenue / 1e6).toFixed(1)}M</b>
            </div>
          ))}
          {!r.byCategory.length && <div className="ad-empty">No sales in this period</div>}
        </section>
        <div className="ad-stack">
          <section className="ad-card">
            <h2 className="ad-h">Top products</h2>
            <table className="ad-table" style={{ marginTop: 10 }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Brand</th>
                  <th className="r">Units</th>
                  <th className="r">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {r.top.map((p) => (
                  <tr key={p.name + p.brand}>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td className="ad-muted2">{BRAND_NAME[p.brand]}</td>
                    <td className="r">{p.units}</td>
                    <td className="r" style={{ fontWeight: 600 }}>
                      {M(p.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="ad-card">
            <h2 className="ad-h">Sales by region</h2>
            {r.byRegion.map((g) => (
              <div className="ad-hbar" key={g.name}>
                <span>{g.name}</span>
                <Meter pct={(g.revenue / maxReg) * 100} />
                <b>{(g.revenue / 1e6).toFixed(1)}M</b>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
