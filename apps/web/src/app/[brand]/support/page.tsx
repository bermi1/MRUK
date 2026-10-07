import type { Metadata } from 'next';
import Link from 'next/link';
import { SupportForm } from '@/components/store/SupportForm';
import { formatTzPhone, waLink } from '@/lib/format';
import type { BrandKey } from '@/lib/types';
import { getBrand, getProducts } from '@/server/catalog';
import { currentCustomer } from '@/server/session';

export const metadata: Metadata = { title: 'Support' };

export default async function SupportPage({ params }: { params: Promise<{ brand: string }> }) {
  const { brand: key } = (await params) as { brand: BrandKey };
  const [brand, products, customer] = await Promise.all([getBrand(key), getProducts(key), currentCustomer()]);
  return (
    <div className="wrap page-top">
      <div className="support-top">
        <div>
          <div className="eyebrow">Support</div>
          <h1 className="h1-xl">How can we help?</h1>
          <div style={{ fontSize: 15, color: 'var(--muted2)', marginTop: 6 }}>Send details and photos straight to the {brand.name} support team, or chat on WhatsApp.</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <Link href={`/${key}/track`} style={{ borderRadius: 18, background: 'var(--surface)', padding: 16 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>Track order</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginTop: 2 }}>Live status</div>
          </Link>
          <Link href={`/${key}/suppliers`} style={{ borderRadius: 18, background: 'var(--surface)', padding: 16 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>Service centres</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginTop: 2 }}>Near you</div>
          </Link>
          <a href={waLink(brand.whatsapp, `Hello ${brand.name}, I need help.`)} target="_blank" rel="noopener noreferrer" style={{ borderRadius: 18, background: 'var(--wa)', color: '#fff', padding: 16 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>WhatsApp</div>
            <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 2 }}>Chat now</div>
          </a>
        </div>
      </div>
      <SupportForm brand={key} brandName={brand.name} whatsapp={brand.whatsapp} products={products.map((p) => ({ id: p.id, label: `${p.model} · ${p.name}` }))} prefill={{ name: customer?.name ?? '', phone: customer ? formatTzPhone(customer.phone) : '' }} />
    </div>
  );
}
