import 'server-only';
import { cookies } from 'next/headers';
import { translate, type Locale, type MessageKey } from '@/lib/i18n';

export const LOCALE_COOKIE = 'bt_locale';

export async function getLocale(): Promise<Locale> {
  return (await cookies()).get(LOCALE_COOKIE)?.value === 'sw' ? 'sw' : 'en';
}

export async function getT() {
  const locale = await getLocale();
  return (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars);
}
