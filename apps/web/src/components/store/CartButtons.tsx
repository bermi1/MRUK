'use client';
import { useOptimistic, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addBundleAction, addToCartAction, clearCompareAction, toggleCompareAction } from '@/app/actions/store';
import { useMessages } from './Messages';
import { PlusIcon, TickIcon } from '../icons';
import { useToast } from './Toast';

function stop(e: React.MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

/** Quick add (+) used on product cards. */
export function AddButton({ brand, id, name, className = 'plus', label = <PlusIcon size={18} strokeWidth={2} />, ariaLabel }: { brand: string; id: string; name: string; className?: string; label?: React.ReactNode; ariaLabel?: string }) {
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

export function CompareToggle({ brand, id, name = '', on, long = false, className }: { brand: string; id: string; name?: string; on: boolean; long?: boolean; className?: string }) {
  const [pending, start] = useTransition();
  const [shown, setShown] = useOptimistic(on);
  const router = useRouter();
  const toast = useToast();
  const t = useMessages();
  const label = long ? (shown ? t('addedCompare') : t('addCompare')) : t('compare');
  return (
    <button
      type="button"
      className={className ?? `cmp-tag ${shown ? 'on' : ''}`}
      aria-pressed={shown}
      aria-label={name ? t(shown ? 'cmpRemove' : 'cmpAddAria', { name }) : undefined}
      disabled={pending}
      data-testid="compare-toggle"
      onClick={(e) => {
        stop(e);
        start(async () => {
          setShown(!shown);
          const r = await toggleCompareAction(brand, id);
          if (!r.ok) toast(r.error);
          else if (r.data!.full) toast(t('cmpLimit', { max: r.data!.max }));
          else if (name) toast(t(r.data!.added ? 'cmpAdded' : 'cmpRemoved', { name }));
          router.refresh();
        });
      }}
    >
      {shown ? <TickIcon size={14} strokeWidth={2.4} /> : <PlusIcon size={14} strokeWidth={2.2} />}
      <span className="cmp-l">{label}</span>
    </button>
  );
}

/** Empties the compare list (compare page). */
export function ClearCompareButton({ brand, className = 'link-u' }: { brand: string; className?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const t = useMessages();
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      data-testid="compare-clear"
      onClick={() =>
        start(async () => {
          const r = await clearCompareAction(brand);
          if (!r.ok) toast(r.error);
          router.refresh();
        })
      }
    >
      {t('cmpClearAll')}
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
