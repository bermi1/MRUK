'use client';
import { useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearCompareAction, toggleCompareAction } from '@/app/actions/store';
import { CloseIcon, CompareIcon } from '../icons';
import { useMessages } from './Messages';
import { PImg } from './PImg';

export interface TrayItem {
  id: string;
  name: string;
  model: string;
  img: string;
}

/**
 * Floating compare tray: the products picked so far (one category), remove buttons and
 * "Compare now". Hidden on the compare, cart, checkout and payment pages.
 */
export function CompareTray({ brand, items, max }: { brand: string; items: TrayItem[]; max: number }) {
  const path = usePathname();
  const router = useRouter();
  const t = useMessages();
  const [pending, start] = useTransition();
  if (!items.length || /\/(compare|cart|checkout|pay|order|account)(\/|$)/.test(path)) return null;
  return (
    <aside className="cmp-tray" aria-label={t('cmpTray', { n: items.length, max })} data-testid="compare-tray">
      <span className="cmp-tray-t">
        <CompareIcon size={18} /> {t('cmpTray', { n: items.length, max })}
      </span>
      <ul>
        {items.map((p) => (
          <li key={p.id}>
            <PImg src={p.img} alt="" model={p.model} size="xs" className="cmp-tray-img" />
            <span className="cmp-tray-n">{p.name}</span>
            <button
              type="button"
              aria-label={t('cmpRemove', { name: p.name })}
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await toggleCompareAction(brand, p.id);
                  router.refresh();
                })
              }
            >
              <CloseIcon size={14} />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="cmp-tray-clear"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await clearCompareAction(brand);
            router.refresh();
          })
        }
      >
        {t('cmpClearAll')}
      </button>
      <Link href={`/${brand}/compare`} className="btn btn-primary btn-sm cmp-tray-go">
        {t('cmpNow')}
      </Link>
    </aside>
  );
}
