'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';

/** Track order / Home links for the brand 404 (not-found pages get no params, so read them here). */
export function NotFoundLinks({ track, home }: { track: string; home: string }) {
  const params = useParams<{ brand?: string }>();
  const brand = params.brand === 'skywood' ? 'skywood' : 'mruk';
  return (
    <div className="nf-links">
      <Link href={`/${brand}/track`} className="btn btn-primary">
        {track}
      </Link>
      <Link href={`/${brand}`} className="btn btn-outline">
        {home}
      </Link>
    </div>
  );
}
