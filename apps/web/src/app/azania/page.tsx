import { redirect } from 'next/navigation';
import { maskTzPhone, miniAppOpen } from '@bt/core';
import { MiniApp, type MiniBrand, type MiniCustomer } from '@/components/mini/MiniApp';
import { MiniGate } from '@/components/mini/MiniGate';
import { MiniSoon } from '@/components/mini/MiniSoon';
import { getBrand, getCategories, getProducts } from '@/server/catalog';
import { getT } from '@/server/locale';
import { currentAzaniaCustomer, demoSignInAllowed } from '@/server/mini/azania';
import { payLaterAdminStates } from '@/server/paylater';
import type { BrandKey } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function loadBrand(key: BrandKey): Promise<MiniBrand> {
  const [b, cats, products] = await Promise.all([getBrand(key), getCategories(key), getProducts(key)]);
  return {
    key,
    name: b.name,
    legal: b.legal,
    primary: b.primary,
    dark: b.dark,
    cats: cats.filter((c) => c.count > 0).map((c) => ({ id: c.id, short: c.short })),
    products: [...products]
      .sort((a, z) => Number(!!z.img) - Number(!!a.img))
      .map((p) => ({ id: p.id, cat: p.cat, sub: p.sub, model: p.model, name: p.name, price: p.price, stock: p.stock, img: p.img, features: p.features.slice(0, 3) })),
  };
}

export default async function AzaniaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  // SSO entry from the Azania app: exchange the token for a cookie, then come back without it in the URL.
  if (typeof sp.token === 'string' && sp.token) redirect(`/azania/sso?token=${encodeURIComponent(sp.token)}`);

  // Pay Later is the only way to buy here: brands with it switched off are left out; none on = "coming soon".
  const pl = await payLaterAdminStates();
  const open = (['mruk', 'skywood'] as const).filter((k) => pl[k].enabled);
  if (!miniAppOpen(pl)) {
    const t = await getT();
    return <MiniSoon labels={{ title: t('miniSoonTitle'), body: t('miniSoonBody'), shop: t('miniSoonShop') }} />;
  }

  const customer = await currentAzaniaCustomer();
  if (!customer) return <MiniGate error={typeof sp.e === 'string' ? sp.e : undefined} demo={demoSignInAllowed()} />;

  const brands: Partial<Record<BrandKey, MiniBrand>> = Object.fromEntries(await Promise.all(open.map(async (k) => [k, await loadBrand(k)] as const)));
  const nidaDigits = customer.nida.replace(/\D/g, '');
  const acct = customer.account.replace(/\D/g, '');
  const c: MiniCustomer = {
    fullName: customer.fullName,
    nidaMasked: `${nidaDigits.slice(0, 4)}${'•'.repeat(Math.max(0, nidaDigits.length - 6))}${nidaDigits.slice(-2)}`,
    phoneMasked: maskTzPhone(customer.phone),
    employer: customer.employer,
    jobTitle: customer.jobTitle,
    netSalary: customer.netSalary,
    accountLast4: acct.slice(-4),
    limit: customer.preApprovedLimit,
  };
  return <MiniApp customer={c} brands={brands} />;
}
