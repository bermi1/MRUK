'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { newOrdersAction } from '@/app/actions/admin';

/**
 * New-order alert for staff who process orders: checks every 45 s while the tab is open and shows a
 * banner (and a count in the browser tab title) when a new paid / confirmed order arrives.
 */
export function OrderAlert({ initial }: { initial: { count: number; latest: string | null } }) {
  const router = useRouter();
  const seen = useRef(initial.latest);
  const [fresh, setFresh] = useState<{ count: number; latest: string } | null>(null);

  useEffect(() => {
    const tick = async () => {
      if (document.visibilityState !== 'visible') return;
      const r = await newOrdersAction().catch(() => null);
      if (!r?.ok || !r.data?.latest || r.data.latest === seen.current) return;
      seen.current = r.data.latest;
      setFresh({ count: r.data.count, latest: r.data.latest });
      router.refresh(); // sidebar badge and lists
    };
    const t = window.setInterval(tick, 45_000);
    return () => window.clearInterval(t);
  }, [router]);

  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) /, '');
    document.title = fresh ? `(${fresh.count}) ${base}` : base;
  }, [fresh]);

  if (!fresh) return null;
  return (
    <div className="ad-neworder" role="status" data-testid="new-order-alert">
      <span>
        New order <b className="mono">{fresh.latest}</b> · {fresh.count} waiting to be packed
      </span>
      <Link className="ad-btn sm" href={`/admin/orders?status=approved&o=${fresh.latest}`} onClick={() => setFresh(null)}>
        Open
      </Link>
      <button type="button" className="ad-btn line sm" onClick={() => setFresh(null)} aria-label="Dismiss new order alert">
        ✕
      </button>
    </div>
  );
}
