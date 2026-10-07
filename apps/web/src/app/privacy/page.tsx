import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Privacy notice' };

export default function Privacy() {
  return (
    <main className="wrap-narrow" style={{ padding: '48px 24px', lineHeight: 1.7, maxWidth: 760 }}>
      <Link href="/" className="link-u">← Mr UK and Skywood</Link>
      <h1 className="h1">Privacy notice</h1>
      <p>MR UK Corporation Ltd and Skywood Tanzania process personal data under the Tanzania Personal Data Protection Act, 2022.</p>
      <h2>What we collect</h2>
      <p>Your name, phone number, email (optional), delivery region and address, and your orders. For Azania Bank Salary Advance we also collect your NIDA number, employer, check number, job title, net salary and Azania Bank account number. These bank fields are encrypted at rest and shared only with Azania Bank to assess your application.</p>
      <h2>Why</h2>
      <p>To deliver your order, process payment, provide warranty and support, and meet tax obligations. We do not sell your data and do not use it for advertising without your consent.</p>
      <h2>How long</h2>
      <p>Order and invoice records are kept for 7 years (tax law). Salary Advance applications are kept for the life of the plan plus 7 years. Support tickets are kept for 2 years. One-time codes expire after 5 minutes. See docs/data-retention.md.</p>
      <h2>Your rights</h2>
      <p>Signed in, you can download your data and delete your account from the Account page. You can also ask our support team for access, correction or deletion.</p>
    </main>
  );
}
