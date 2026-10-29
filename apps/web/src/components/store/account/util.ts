import { MESSAGES, translate, type Locale, type MessageKey } from '@/lib/i18n';

/** Shared by the server panels and the client widgets of the customer dashboard. */
export type T = (key: MessageKey, vars?: Record<string, string | number>) => string;

export function makeT(locale: Locale): T {
  return (key, vars) => translate(locale, key, vars);
}

/** Action errors are message keys ("accErr*"); anything else is shown as a generic error. */
export function errText(t: T, error: string): string {
  return error in MESSAGES.en ? t(error as MessageKey) : t('accErrGeneric');
}

const TZ = 'Africa/Dar_es_Salaam';

export function fmtDay(locale: Locale, d: Date | string, withYear = true): string {
  return new Date(d).toLocaleDateString(locale === 'sw' ? 'sw-TZ' : 'en-GB', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}), timeZone: TZ });
}

export const ACCOUNT_TABS = ['overview', 'orders', 'paylater', 'rewards', 'support', 'addresses', 'settings'] as const;
export type AccountTab = (typeof ACCOUNT_TABS)[number];

export function parseTab(v: string | undefined): AccountTab {
  return (ACCOUNT_TABS as readonly string[]).includes(v ?? '') ? (v as AccountTab) : 'overview';
}
