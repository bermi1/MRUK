/**
 * Staff roles: one building block per job. A person holds one or more roles (Admin › Settings › Manage),
 * and gets the menus, dashboard panels and task queues of every role they hold.
 * Ids are stable (stored on staff and tasks); names and descriptions are what staff see.
 * Order = priority: the first role a person holds is shown as their main role.
 */
export interface RoleDef {
  id: string;
  name: string;
  description: string;
  permissions: readonly string[];
}

export const ROLE_DEFS: readonly RoleDef[] = [
  { id: 'owner', name: 'Admin', description: 'Bermi Techs. Everything, including staff, roles, security and system settings.', permissions: ['*'] },
  { id: 'manager', name: 'Management', description: 'Mr UK management. Full access to every part of the admin.', permissions: ['*'] },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Campaigns, subscribers, bundles, offers, promo codes, ambassadors, campaign analytics and reports.',
    permissions: ['dashboard', 'marketing', 'marketing.write', 'promos', 'promos.write', 'customers', 'reports'],
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Approves payments, issues and settles invoices, Pay Later decisions, payment queries from customers.',
    permissions: ['dashboard', 'orders', 'advance', 'advance.write', 'invoices', 'invoices.write', 'customers', 'reports', 'tickets', 'tickets.write'],
  },
  {
    id: 'orderdesk',
    name: 'Order desk',
    description: 'Receives new orders, calls the customer, edits and confirms the order, sends the invoice, follows up delivery queries.',
    permissions: ['dashboard', 'orders', 'orders.write', 'invoices', 'invoices.write', 'customers', 'tickets', 'tickets.write'],
  },
  {
    id: 'warehouse',
    name: 'Storekeeper',
    description: 'Dispatches orders cleared by Finance and marks them delivered on the delivery person’s confirmation.',
    permissions: ['dashboard', 'orders', 'orders.write', 'inventory'],
  },
  {
    id: 'catalogue',
    name: 'Store control',
    description: 'Manages all products and stock: adds new items, sets stock numbers, brands and categories.',
    permissions: ['dashboard', 'orders', 'products', 'products.write', 'inventory', 'catalog'],
  },
  {
    id: 'website',
    name: 'IT and website',
    description: 'Runs the website content (CMS) and oversees how the site works.',
    permissions: ['dashboard', 'cms', 'cms.write', 'products'],
  },
  {
    id: 'support',
    name: 'Client support',
    description: 'Answers customers: installation, repairs and every query that is not about delivery or payment.',
    permissions: ['dashboard', 'orders', 'customers', 'tickets', 'tickets.write'],
  },
];

export const ROLE_IDS = ROLE_DEFS.map((r) => r.id);

export function roleDef(id: string): RoleDef | undefined {
  return ROLE_DEFS.find((r) => r.id === id);
}

/** Main role + others, in registry order, from the roles ticked for a person. Admin covers everything, so it stands alone. */
export function splitRoles(ticked: readonly string[]): { main: string; extra: string[] } | null {
  const ids = ROLE_IDS.filter((id) => ticked.includes(id));
  if (!ids.length) return null;
  if (ids[0] === 'owner') return { main: 'owner', extra: [] };
  return { main: ids[0]!, extra: ids.slice(1) };
}
