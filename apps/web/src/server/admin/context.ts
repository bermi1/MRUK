import 'server-only';
import { cookies } from 'next/headers';
import { prisma, type Prisma } from '@bt/db';
import { brandScope, type StaffContext } from '../auth';
import { currentStaffSession } from '../session';

export const BRAND_COOKIE = 'bt_admin_brand';
export const BRANCH_COOKIE = 'bt_admin_branch';

export type AdminBrand = 'all' | 'mruk' | 'skywood';

export interface AdminFilters {
  /** Brand keys the current page may show (staff scope ∩ header filter). */
  brands: string[];
  /** All brands the staff member may see. */
  allowed: string[];
  /** Header segmented control value. */
  brand: AdminBrand;
  /** Order.branch filter (region name) or null for all branches. */
  branch: string | null;
}

export const BRAND_NAME: Record<string, string> = { mruk: 'Mr UK', skywood: 'Skywood' };

/** Header filters from cookies, always narrowed to the staff member's brand scope. */
export async function adminFilters(ctx: StaffContext): Promise<AdminFilters> {
  const jar = await cookies();
  const b = jar.get(BRAND_COOKIE)?.value;
  const requested = b === 'mruk' || b === 'skywood' ? b : null;
  const brands = brandScope(ctx, requested);
  const brand: AdminBrand = brands.length === 1 && requested === brands[0] ? (requested as AdminBrand) : brands.length === 1 ? (brands[0] as AdminBrand) : 'all';
  const br = jar.get(BRANCH_COOKIE)?.value ?? '';
  const branch = br && br !== 'all' && /^[A-Za-z .'-]{2,40}$/.test(br) ? br : null;
  return { brands, allowed: brandScope(ctx, null), brand, branch };
}

export function orderWhere(f: AdminFilters): Prisma.OrderWhereInput {
  return { brandKey: { in: f.brands }, ...(f.branch ? { branch: f.branch } : {}) };
}

/** Brand key from a page query (?b=) limited to scope; falls back to the header filter, then the first allowed brand. */
export function pickBrand(ctx: StaffContext, f: AdminFilters, q?: string | string[]): 'mruk' | 'skywood' | null {
  const allowed = brandScope(ctx, null);
  const v = typeof q === 'string' ? q : '';
  if (allowed.includes(v)) return v as 'mruk' | 'skywood';
  if (f.brand !== 'all' && allowed.includes(f.brand)) return f.brand;
  return (allowed[0] as 'mruk' | 'skywood' | undefined) ?? null;
}

/** Staff context for route handlers: never redirects, returns null when not signed in. */
export async function staffForRoute(): Promise<StaffContext | null> {
  const s = await currentStaffSession();
  if (!s || s.kind !== 'staff' || !s.staff) return null;
  const staff = s.staff;
  const permissions = staff.role.permissions;
  const can = (p: string) => permissions.includes('*') || permissions.includes(p);
  return {
    id: staff.id,
    email: staff.email,
    name: staff.name,
    role: staff.roleId,
    roleName: staff.role.name,
    permissions,
    brands: staff.brands,
    can,
    canBrand: (b: string) => staff.brands.includes('*') || staff.brands.includes(b),
  };
}

/** Live counts for the sidebar badges. */
export async function navCounts(ctx: StaffContext, f: AdminFilters) {
  const ow = orderWhere(f);
  const [orders, advances, lowStock, tickets] = await Promise.all([
    ctx.can('orders') ? prisma.order.count({ where: { ...ow, status: { in: ['approved', 'packed'] } } }) : 0,
    ctx.can('advance') ? prisma.salaryAdvanceApplication.count({ where: { status: 'submitted', order: ow } }) : 0,
    ctx.can('inventory') ? prisma.product.count({ where: { brandKey: { in: f.brands }, hidden: false, stock: { lte: 5 } } }) : 0,
    ctx.can('tickets') ? prisma.ticket.count({ where: { brandKey: { in: f.brands }, status: 'new' } }) : 0,
  ]);
  return { orders, advances, lowStock, tickets };
}

export async function branchOptions(): Promise<string[]> {
  const rows = await prisma.order.findMany({ distinct: ['branch'], select: { branch: true }, orderBy: { branch: 'asc' } });
  return rows.map((r) => r.branch).filter(Boolean);
}

// Time (East Africa Time, UTC+3, no DST) ------------------------------------------------

const EAT = 3 * 3_600_000;

export function startOfDayEAT(d = new Date()): Date {
  const t = d.getTime() + EAT;
  return new Date(t - (t % 86_400_000) - EAT);
}

export function startOfMonthEAT(d = new Date(), addMonths = 0): Date {
  const local = new Date(d.getTime() + EAT);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + addMonths, 1) - EAT);
}

export function monthName(d: Date): string {
  return d.toLocaleDateString('en-GB', { month: 'long', timeZone: 'Africa/Dar_es_Salaam' });
}

/** YYYY-MM-DD in EAT. */
export function isoDayEAT(d: Date): string {
  return new Date(d.getTime() + EAT).toISOString().slice(0, 10);
}

/** Parse YYYY-MM-DD as the start of that day in EAT. */
export function parseDayEAT(s: string | undefined | null): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const t = Date.parse(`${s}T00:00:00Z`);
  return Number.isFinite(t) ? new Date(t - EAT) : null;
}

export function ago(d: Date): string {
  const m = Math.max(0, Math.round((Date.now() - d.getTime()) / 60_000));
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export function durationLabel(ms: number): string {
  const m = Math.round(ms / 60_000);
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m}m`;
}

/** Revenue counts orders that are confirmed (paid or approved), not awaiting payment, cancelled or rejected. */
export const REVENUE_STATUSES = ['approved', 'packed', 'out_for_delivery', 'delivered'];
