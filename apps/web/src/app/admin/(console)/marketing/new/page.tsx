import { prisma } from '@bt/db';
import { CampaignBuilder } from '@/components/admin/CampaignBuilder';
import { MarketingTabs } from '@/components/admin/MarketingTabs';
import { Forbidden } from '@/components/admin/ui';
import { adminFilters, pickBrand } from '@/server/admin/context';
import { requireStaff } from '@/server/auth';
import { env } from '@/server/env';

export const metadata = { title: 'New campaign' };

export default async function NewCampaignPage({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  const ctx = await requireStaff();
  if (!ctx.can('marketing.write')) return <Forbidden what="the campaign builder" />;
  const f = await adminFilters(ctx);
  const brand = pickBrand(ctx, f, (await searchParams).b);
  if (!brand) return <Forbidden what="the campaign builder" />;
  const brands = f.allowed.filter((b): b is 'mruk' | 'skywood' => b === 'mruk' || b === 'skywood');
  const now = new Date();
  const [cats, codes] = await Promise.all([
    prisma.category.findMany({ where: { brandKey: { in: brands } }, orderBy: { sort: 'asc' }, select: { brandKey: true, slug: true, name: true } }),
    prisma.discountCode.findMany({ where: { active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }], AND: [{ OR: [{ brandKey: null }, { brandKey: { in: brands } }] }] }, orderBy: { code: 'asc' }, select: { code: true, percent: true, brandKey: true } }),
  ]);
  const categories = { mruk: cats.filter((c) => c.brandKey === 'mruk'), skywood: cats.filter((c) => c.brandKey === 'skywood') };
  return (
    <div className="ad-stack">
      <MarketingTabs current="new" canWrite />
      <CampaignBuilder brands={brands} initialBrand={brand} categories={categories} codes={codes} canCreateCode={ctx.can('promos.write')} appUrl={env.APP_URL} staffName={ctx.name} />
    </div>
  );
}
