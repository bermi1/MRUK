'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setLocaleAction } from '@/app/actions/store';
import { GlobeIcon } from '../icons';

/** Compact EN / SW switch for the desktop header (the phone drawer has its own). */
export function LangSwitch({ locale, label, className = '' }: { locale: 'en' | 'sw'; label: string; className?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className={`lang-sw ${className}`} role="group" aria-label={label}>
      <GlobeIcon size={14} />
      {(['en', 'sw'] as const).map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          className={locale === l ? 'on' : ''}
          aria-pressed={locale === l}
          aria-label={l === 'en' ? 'English' : 'Kiswahili'}
          disabled={pending || locale === l}
          onClick={() =>
            start(async () => {
              await setLocaleAction(l);
              router.refresh();
            })
          }
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
