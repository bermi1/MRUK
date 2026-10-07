import type { Metadata, Viewport } from 'next';
import '@/styles/mini.css';

export const metadata: Metadata = {
  title: 'Azania Shop · Mr UK and Skywood',
  description: 'Buy on Azania Bank Salary Advance inside the Azania app.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: '#FFFFFF', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function AzaniaLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mn-shell">
      <div className="mn-frame">{children}</div>
    </main>
  );
}
