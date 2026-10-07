'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addBundleAction, addToCartAction, toggleCompareAction } from '@/app/actions/store';
import { useToast } from './Toast';

function stop(e: React.MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

/** Quick add (+) used on product cards. */
export function AddButton({ brand, id, name, className = 'plus', label = '+', ariaLabel }: { brand: string; id: string; name: string; className?: string; label?: React.ReactNode; ariaLabel?: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel ?? `Add ${name} to cart`}
      disabled={pending}
      onClick={(e) => {
        stop(e);
        start(async () => {
          const r = await addToCartAction(brand, id);
          toast(r.ok ? `${name} added to cart` : r.error);
          router.refresh();
        });
      }}
    >
      {pending ? '…' : label}
    </button>
  );
}

export function CompareToggle({ brand, id, on, long = false, className }: { brand: string; id: string; on: boolean; long?: boolean; className?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const label = long ? (on ? '✓ Added to compare' : '+ Add to compare') : on ? '✓ Compare' : '+ Compare';
  return (
    <button
      type="button"
      className={className ?? `cmp-tag ${on ? 'on' : ''}`}
      aria-pressed={on}
      disabled={pending}
      onClick={(e) => {
        stop(e);
        start(async () => {
          await toggleCompareAction(brand, id);
          router.refresh();
        });
      }}
    >
      {label}
    </button>
  );
}

export function AddBundleButton({ brand, ids, className = 'btn btn-primary btn-sm' }: { brand: string; ids: string[]; className?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await addBundleAction(brand, ids);
          if (!r.ok) return toast(r.error);
          router.push(`/${brand}/cart`);
        })
      }
    >
      {pending ? 'Adding…' : 'Add bundle'}
    </button>
  );
}
