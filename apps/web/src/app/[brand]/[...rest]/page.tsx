import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

/** Any unknown path under a brand renders the branded 404 (header, footer, theme) instead of Next's generic one. */
export const metadata: Metadata = { title: 'Page not found', robots: { index: false } };

export default function UnknownBrandPath(): never {
  notFound();
}
