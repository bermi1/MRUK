import { describe, expect, it } from 'vitest';
import { ROLE_DEFS, roleDef, splitRoles } from '../src/index';

describe('staff roles', () => {
  it('has the nine roles in priority order with unique ids', () => {
    expect(ROLE_DEFS.map((r) => r.name)).toEqual(['Admin', 'Management', 'Marketing', 'Finance', 'Order desk', 'Storekeeper', 'Store control', 'IT and website', 'Client support']);
    expect(new Set(ROLE_DEFS.map((r) => r.id)).size).toBe(ROLE_DEFS.length);
  });
  it('Admin and Management have everything; others only their jobs', () => {
    expect(roleDef('owner')?.permissions).toEqual(['*']);
    expect(roleDef('manager')?.permissions).toEqual(['*']);
    expect(roleDef('warehouse')?.permissions).not.toContain('products.write');
    expect(roleDef('catalogue')?.permissions).toContain('products.write');
    expect(roleDef('website')?.permissions).toContain('cms.write');
    expect(roleDef('support')?.permissions).not.toContain('invoices');
  });
  it('splits ticked roles into a main role and the others, in registry order', () => {
    expect(splitRoles(['support', 'orderdesk'])).toEqual({ main: 'orderdesk', extra: ['support'] });
    expect(splitRoles(['finance', 'owner'])).toEqual({ main: 'owner', extra: [] });
    expect(splitRoles(['nope'])).toBeNull();
    expect(splitRoles([])).toBeNull();
  });
});

describe('dashboards follow the roles', () => {
  it('each role gets its own panels; the full support panel stays with Client support', async () => {
    const { dashboardSections } = await import('../src/index');
    const perms = (id: string) => [...roleDef(id)!.permissions];
    expect(dashboardSections(perms('manager')).sections).toEqual(['tasks', 'overview', 'teams', 'marketing']);
    expect(dashboardSections(perms('finance')).sections).toEqual(['tasks', 'finance']);
    expect(dashboardSections(perms('support')).sections).toEqual(['tasks', 'support']);
    expect(dashboardSections(perms('warehouse')).sections).toEqual(['tasks', 'warehouse']);
    expect(dashboardSections(perms('catalogue')).sections).toEqual(['tasks', 'catalogue']);
    expect(dashboardSections(perms('marketing')).sections).toEqual(['tasks', 'marketing']);
  });
});
