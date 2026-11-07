import 'server-only';
import { prisma } from '@bt/db';
import type { EditorCategory } from '@/components/admin/ProductEditor';

/** Categories per brand the staff member may edit (for the editor's brand → category → sub-category pickers). */
export async function editorCategories(brands: string[]): Promise<Record<string, EditorCategory[]>> {
  const rows = await prisma.category.findMany({ where: { brandKey: { in: brands } }, orderBy: { sort: 'asc' }, select: { brandKey: true, slug: true, name: true, subs: true } });
  const out: Record<string, EditorCategory[]> = {};
  for (const r of rows) (out[r.brandKey] ??= []).push({ slug: r.slug, name: r.name, subs: r.subs });
  return out;
}
