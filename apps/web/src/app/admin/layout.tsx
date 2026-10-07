import type { Metadata } from 'next';
import '@/styles/admin.css';

export const metadata: Metadata = {
  title: { default: 'Commerce OS', template: '%s · Commerce OS' },
  robots: { index: false, follow: false },
};

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="ad">{children}</div>;
}
