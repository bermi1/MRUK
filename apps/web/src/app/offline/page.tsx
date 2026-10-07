import type { Metadata } from 'next';
import { RetryButton } from './RetryButton';

export const metadata: Metadata = { title: "You're offline · Mr UK and Skywood", robots: { index: false } };

/** Offline shell served by the service worker when there is no connection. No data access. */
export default function OfflinePage() {
  return (
    <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#EEF0F8' }}>
      <div style={{ maxWidth: 380, width: '100%', background: '#fff', borderRadius: 22, padding: '36px 28px', textAlign: 'center', boxShadow: '0 10px 30px rgba(18,22,74,.10)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center' }}>
          <img src="/brand/mruk.png" alt="Mr UK" style={{ height: 30, width: 'auto' }} />
          <img src="/brand/skywood.png" alt="Skywood" style={{ height: 30, width: 'auto' }} />
        </div>
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#1D2366" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <path d="M2 8.8a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16.1a5 5 0 0 1 7 0" />
          <circle cx="12" cy="19.5" r="1" fill="#1D2366" />
          <path d="M3 3l18 18" stroke="#B4462E" />
        </svg>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', color: '#12152B' }}>You&apos;re offline</h1>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: '#5E6378' }}>
          Check your mobile data or Wi-Fi and try again. Pages you opened recently are still available, and your cart is saved for when you&apos;re back online.
        </p>
        <RetryButton />
      </div>
    </main>
  );
}
