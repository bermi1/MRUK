import Link from 'next/link';
import { prisma } from '@bt/db';
import { fmtDate, fmtTZS, formatTzPhone } from '@bt/core';
import { OrderPill, Pill, INVOICE_PILL, Thumb } from '@/components/admin/ui';
import { adminFilters, BRAND_NAME, orderWhere } from '@/server/admin/context';
import { requireStaff } from '@/server/auth';

export const metadata = { title: 'Search' };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff();
  const f = await adminFilters(ctx);
  const q = ((await searchParams).q ?? '').trim().slice(0, 80);
  if (q.length < 2) return <div className="ad-card ad-empty">Type at least 2 characters to search orders, products, customers and invoices.</div>;
  const digits = q.replace(/\D/g, '').replace(/^0/, '').replace(/^255/, '');
  const up = q.toUpperCase();
  const ow = orderWhere(f);
  const [orders, products, invoices, customers] = await Promise.all([
    ctx.can('orders')
      ? prisma.order.findMany({ where: { ...ow, OR: [{ number: { contains: up } }, { contactName: { contains: q, mode: 'insensitive' } }, ...(digits.length >= 3 ? [{ contactPhone: { contains: digits } }] : [])] }, orderBy: { createdAt: 'desc' }, take: 20 })
      : Promise.resolve([]),
    ctx.can('products') ? prisma.product.findMany({ where: { brandKey: { in: f.brands }, OR: [{ model: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }, { id: { contains: q.toLowerCase() } }] }, take: 20 }) : Promise.resolve([]),
    ctx.can('invoices') ? prisma.invoice.findMany({ where: { order: ow, number: { contains: up } }, include: { order: { select: { number: true, contactName: true } } }, take: 20 }) : Promise.resolve([]),
    ctx.can('customers')
      ? prisma.customer.findMany({ where: { deletedAt: null, orders: { some: ow }, OR: [{ name: { contains: q, mode: 'insensitive' } }, ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : [])] }, take: 20 })
      : Promise.resolve([]),
  ]);
  const none = !orders.length && !products.length && !invoices.length && !customers.length;
  return (
    <div className="ad-stack">
      <p className="ad-muted2" style={{ margin: 0 }}>
        Results for <b>“{q}”</b>
      </p>
      {none && <div className="ad-card ad-empty">Nothing found.</div>}
      {orders.length > 0 && (
        <section className="ad-card">
          <h2 className="ad-h">Orders</h2>
          <table className="ad-table" style={{ marginTop: 8 }}>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link className="num" href={`/admin/orders?o=${o.number}`}>
                      {o.number}
                    </Link>
                  </td>
                  <td>{o.contactName}</td>
                  <td className="ad-muted2">{formatTzPhone(o.contactPhone)}</td>
                  <td>
                    <OrderPill status={o.status} />
                  </td>
                  <td className="r">{fmtTZS(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {products.length > 0 && (
        <section className="ad-card">
          <h2 className="ad-h">Products</h2>
          <table className="ad-table" style={{ marginTop: 8 }}>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td style={{ width: 56 }}>
                    <Thumb src={p.images[0]} model={p.model} />
                  </td>
                  <td>
                    <Link href={`/admin/products?b=${p.brandKey}&q=${encodeURIComponent(p.model)}`} style={{ fontWeight: 500 }}>
                      {p.name}
                    </Link>
                    <div className="mono ad-muted" style={{ fontSize: 11.5 }}>
                      {p.model}
                    </div>
                  </td>
                  <td className="ad-muted2">{BRAND_NAME[p.brandKey]}</td>
                  <td>{p.stock} in stock</td>
                  <td className="r">{fmtTZS(p.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {invoices.length > 0 && (
        <section className="ad-card">
          <h2 className="ad-h">Invoices</h2>
          <table className="ad-table" style={{ marginTop: 8 }}>
            <tbody>
              {invoices.map((v) => (
                <tr key={v.id}>
                  <td>
                    <Link className="num" href={`/admin/invoices?no=${v.number}`}>
                      {v.number}
                    </Link>
                  </td>
                  <td>
                    {v.order.contactName} · {v.order.number}
                  </td>
                  <td className="ad-muted2">{fmtDate(v.issuedAt)}</td>
                  <td>
                    <Pill cls={INVOICE_PILL[v.status] ?? 'pill-grey'}>{v.status}</Pill>
                  </td>
                  <td className="r">{fmtTZS(v.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {customers.length > 0 && (
        <section className="ad-card">
          <h2 className="ad-h">Customers</h2>
          <table className="ad-table" style={{ marginTop: 8 }}>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }}>{c.name || 'Unnamed'}</td>
                  <td className="ad-muted2">{formatTzPhone(c.phone)}</td>
                  <td className="r">
                    <Link href={`/admin/orders?q=${encodeURIComponent(c.phone.slice(4))}`}>View orders</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
