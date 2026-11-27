import type { Metadata } from 'next';
import Link from 'next/link';
import { payLaterOn } from '@/server/paylater';
import { BRAND_LABEL, siteName, storeBrand } from '@/lib/site';

// A single-brand site names only its own company (client rule); the combined development site names both.
const single = storeBrand();
const controller = single ? BRAND_LABEL[single].legal : `${BRAND_LABEL.mruk.legal} and ${BRAND_LABEL.skywood.legal}`;
const controllerVerb = single ? 'processes' : 'process';

export const metadata: Metadata = {
  title: `Privacy notice · ${siteName()}`,
  description: `How ${controller} ${single ? 'collects, uses and keeps' : 'collect, use and keep'} personal data under the Tanzania Personal Data Protection Act, 2022.`,
  alternates: { canonical: '/privacy' },
};

export default async function Privacy() {
  // Pay Later (Azania Bank) wording only while either store has it switched on.
  const payLater = single ? await payLaterOn(single) : (await payLaterOn('mruk')) || (await payLaterOn('skywood'));
  return (
    <main className="wrap-narrow" style={{ padding: '48px 24px', lineHeight: 1.7, maxWidth: 760 }}>
      <Link href="/" className="link-u">← {siteName()}</Link>
      <h1 className="h1">Privacy notice</h1>
      <p>{controller} {controllerVerb} personal data under the Tanzania Personal Data Protection Act, 2022.</p>
      <h2>What we collect</h2>
      <p>Your name, phone number, email (optional), delivery region and address, and your orders.{payLater && ' For Pay Later by Azania Bank we also collect your NIDA number, employer, check number, job title, net salary and Azania Bank account number. These bank fields are encrypted at rest and shared only with Azania Bank to assess your application.'}</p>
      <h2>Why</h2>
      <p>To deliver your order, process payment, provide warranty and support, and meet tax obligations. We do not sell your data and do not use it for advertising without your consent.</p>
      <h2>How long</h2>
      <p>Order and invoice records are kept for 7 years (tax law).{payLater && ' Pay Later applications are kept for the life of the plan plus 7 years.'} Support tickets are kept for 2 years. One-time codes expire after 5 minutes. See docs/data-retention.md.</p>
      <h2>Your rights</h2>
      <p>Signed in, you can download your data and delete your account from the Account page. You can also ask our support team for access, correction or deletion.</p>
    </main>
  );
}
