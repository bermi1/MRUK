'use client';
import { useEffect, useState } from 'react';

/** Flash deals end at midnight (Dar es Salaam time, UTC+3). */
function remaining() {
  const now = Date.now();
  const eat = new Date(now + 3 * 3600_000);
  const end = Date.UTC(eat.getUTCFullYear(), eat.getUTCMonth(), eat.getUTCDate() + 1) - 3 * 3600_000;
  let s = Math.max(0, Math.floor((end - now) / 1000));
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  return [h, m, s - m * 60];
}

export function Countdown({ compact = false }: { compact?: boolean }) {
  const [t, setT] = useState<number[] | null>(null);
  useEffect(() => {
    setT(remaining());
    const i = window.setInterval(() => setT(remaining()), 1000);
    return () => window.clearInterval(i);
  }, []);
  const labels = ['hours', 'mins', 'secs'];
  return (
    <div style={{ display: 'flex', gap: compact ? 6 : 8 }} role="timer" aria-label="Time left for flash deals">
      {labels.map((l, i) => (
        <div key={l} style={{ background: 'rgba(255,255,255,.12)', borderRadius: compact ? 12 : 14, padding: compact ? '8px 10px' : '12px 14px', minWidth: compact ? 52 : 66, textAlign: 'center' }}>
          <div className="mono" style={{ fontSize: compact ? 20 : 30, fontWeight: 600 }}>
            {t ? String(t[i]).padStart(2, '0') : '--'}
          </div>
          <div style={{ fontSize: compact ? 10 : 11, opacity: 0.7 }}>{l}</div>
        </div>
      ))}
    </div>
  );
}
