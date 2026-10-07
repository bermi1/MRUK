import { prisma, type Prisma } from '@bt/db';
import { fmtDateTime } from '@bt/core';
import { createStaffAction, resetStaffTotpAction, saveNotificationsAction, saveSecurityAction, updateStaffAction } from '@/app/actions/admin';
import { ActBtn } from '@/components/admin/ActBtn';
import { AForm } from '@/components/admin/AForm';
import { Forbidden, Pill } from '@/components/admin/ui';
import { adapterStatus } from '@/server/admin/files';
import { requireStaff } from '@/server/auth';

export const metadata = { title: 'Settings and users' };

const PERMS: [string, string][] = [
  ['dashboard', 'Dashboard'],
  ['orders', 'Orders'],
  ['orders.write', 'Update orders'],
  ['advance', 'Salary Advance'],
  ['advance.write', 'Decide advances'],
  ['invoices', 'Invoices'],
  ['invoices.write', 'Mark paid / void'],
  ['customers', 'Customers'],
  ['products', 'Products'],
  ['products.write', 'Edit catalogue'],
  ['inventory', 'Inventory / restock'],
  ['catalog', 'Brands and categories'],
  ['promos', 'Promotions'],
  ['promos.write', 'Edit promotions'],
  ['cms', 'Website CMS'],
  ['cms.write', 'Publish CMS'],
  ['tickets', 'Support tickets'],
  ['tickets.write', 'Reply to tickets'],
  ['reports', 'Reports'],
  ['settings', 'Settings and users'],
];
const NOTIFS: [string, string, string][] = [
  ['orders', 'New order', 'Email and SMS to store managers'],
  ['bank', 'Azania Bank decision', 'When a Salary Advance is approved or declined'],
  ['stock', 'Low stock', 'When a product drops to 5 units or fewer'],
  ['tickets', 'New support ticket', 'Push to the support team'],
  ['daily', 'Daily sales summary', 'Email at 8:00 PM'],
];
const brandText = (b: string[]) => (b.includes('*') ? 'Both brands' : b.map((x) => (x === 'mruk' ? 'Mr UK' : 'Skywood')).join(', ') || 'None');

function BrandBoxes({ brands }: { brands?: string[] }) {
  const all = !brands || brands.includes('*');
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', gap: 14 }}>
      <legend className="ad-muted" style={{ fontSize: 12, padding: 0 }}>
        Brand access
      </legend>
      {[
        ['mruk', 'Mr UK'],
        ['skywood', 'Skywood'],
      ].map(([k, l]) => (
        <label className="ad-check" key={k}>
          <input type="checkbox" name="brands" value={k} defaultChecked={all || brands!.includes(k!)} /> {l}
        </label>
      ))}
    </fieldset>
  );
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff();
  if (!ctx.can('settings')) return <Forbidden what="settings and users" />;
  const sp = await searchParams;
  const actor = (sp.actor ?? '').trim().slice(0, 80);
  const entity = (sp.entity ?? '').trim().slice(0, 40);
  const auditWhere: Prisma.AuditLogWhereInput = { ...(actor ? { actor: { contains: actor, mode: 'insensitive' } } : {}), ...(entity ? { entity: { equals: entity } } : {}) };
  const [staff, roles, settings, logs, entities] = await Promise.all([
    prisma.staffUser.findMany({ include: { role: true }, orderBy: [{ active: 'desc' }, { name: 'asc' }] }),
    prisma.role.findMany({ orderBy: { id: 'asc' } }),
    prisma.setting.findMany({ where: { key: { in: ['notifications', 'security'] } } }),
    prisma.auditLog.findMany({ where: auditWhere, orderBy: { at: 'desc' }, take: 200 }),
    prisma.auditLog.findMany({ distinct: ['entity'], select: { entity: true }, orderBy: { entity: 'asc' } }),
  ]);
  const notif = (settings.find((s) => s.key === 'notifications')?.value ?? {}) as Record<string, boolean>;
  const sec = (settings.find((s) => s.key === 'security')?.value ?? {}) as { sessionTimeoutMinutes?: number; require2fa?: boolean; backups?: string };
  const adapters = adapterStatus();
  const roleOptions = roles.map((r) => (
    <option key={r.id} value={r.id}>
      {r.name}
    </option>
  ));

  return (
    <div className="ad-stack">
      <div className="ad-grid2" style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)' }}>
        <div className="ad-stack">
          <section className="ad-card">
            <h2 className="ad-h">Admin users</h2>
            <div className="ad-scroll">
              <table className="ad-table" style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Brand access</th>
                    <th>2FA</th>
                    <th>Last sign-in</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((u) => (
                    <tr key={u.id} style={u.active ? undefined : { opacity: 0.55 }}>
                      <td style={{ verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 600 }}>
                          {u.name}
                          {!u.active && ' (inactive)'}
                        </div>
                        <div className="ad-muted" style={{ fontSize: 11.5 }}>
                          {u.email}
                        </div>
                        <details className="ad-more">
                          <summary>Manage</summary>
                          <div style={{ width: 'min(460px, 70vw)' }}>
                            <AForm action={updateStaffAction.bind(null, u.id)} className="ad-stack s8" label={`Manage ${u.name}`}>
                              <label className="ad-field">
                                Role
                                <select name="role" defaultValue={u.roleId}>
                                  {roleOptions}
                                </select>
                              </label>
                              <BrandBoxes brands={u.brands} />
                              <label className="ad-check">
                                <input type="checkbox" name="active" defaultChecked={u.active} /> Active (can sign in)
                              </label>
                            </AForm>
                            {u.totpEnabled && (
                              <div className="ad-row" style={{ marginTop: 8 }}>
                                <ActBtn action={resetStaffTotpAction.bind(null, u.id)} className="ad-btn danger sm" confirm={`Reset two-factor sign-in for ${u.name}? They will enrol a new authenticator at next sign-in.`} showOk>
                                  Reset 2FA
                                </ActBtn>
                              </div>
                            )}
                          </div>
                        </details>
                      </td>
                      <td style={{ verticalAlign: 'top' }}>
                        <Pill cls="pill-navy">{u.role.name}</Pill>
                      </td>
                      <td className="ad-muted2" style={{ verticalAlign: 'top' }}>
                        {brandText(u.brands)}
                      </td>
                      <td style={{ verticalAlign: 'top' }}>{u.totpEnabled ? <Pill cls="pill-green">On</Pill> : <Pill cls="pill-amber">Not set up</Pill>}</td>
                      <td className="ad-muted2" style={{ verticalAlign: 'top', fontSize: 12.5 }}>
                        {u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <details className="ad-more" style={{ marginTop: 10 }}>
              <summary>+ Invite user</summary>
              <AForm action={createStaffAction} submit="Create user" className="ad-form" resetOnOk label="Invite user">
                <label className="ad-field">
                  Full name
                  <input name="name" required maxLength={80} />
                </label>
                <label className="ad-field">
                  Work email
                  <input name="email" type="email" required maxLength={160} />
                </label>
                <label className="ad-field">
                  Role
                  <select name="role" defaultValue="support">
                    {roleOptions}
                  </select>
                </label>
                <BrandBoxes />
              </AForm>
            </details>
          </section>
          <section className="ad-card">
            <h2 className="ad-h">Integrations</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
              {adapters.map((a) => (
                <div key={a.key} style={{ borderRadius: 14, border: '1px solid #ECEDF2', padding: 14 }}>
                  <div className="ad-between">
                    <b style={{ fontSize: 14 }}>{a.name}</b>
                    <Pill cls={a.mode === 'live' ? 'pill-green' : a.mode === 'out of scope' ? 'pill-grey' : 'pill-amber'}>{a.mode === 'out of scope' ? 'Out of scope this phase' : a.mode === 'live' ? 'Live' : a.mode === 'local' ? 'Local disk' : 'Mock'}</Pill>
                  </div>
                  <div className="ad-muted2" style={{ fontSize: 12.5, marginTop: 4 }}>
                    {a.desc}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
        <div className="ad-stack">
          <section className="ad-card">
            <h2 className="ad-h">Notifications</h2>
            <AForm action={saveNotificationsAction} submit="Save notifications" label="Notifications">
              {NOTIFS.map(([k, l, d]) => (
                <label className="ad-toggle" key={k}>
                  <span>
                    <b>{l}</b>
                    <small>{d}</small>
                  </span>
                  <input type="checkbox" name={k} defaultChecked={notif[k] ?? k !== 'daily'} />
                  <span className="sw" aria-hidden="true" />
                </label>
              ))}
            </AForm>
          </section>
          <section className="ad-card">
            <h2 className="ad-h">Security</h2>
            <AForm action={saveSecurityAction} submit="Save security" className="ad-stack s8" label="Security">
              <label className="ad-field">
                Staff session timeout (minutes of inactivity)
                <input name="sessionTimeoutMinutes" type="number" min={5} max={480} defaultValue={sec.sessionTimeoutMinutes ?? 30} required />
              </label>
              <label className="ad-check">
                <input type="checkbox" name="require2fa" defaultChecked={sec.require2fa ?? true} /> Require two-factor sign-in for all staff
              </label>
              <p className="ad-muted2" style={{ fontSize: 12, margin: 0 }}>
                Two-factor (TOTP) is currently enforced for every staff sign-in regardless of this setting.
              </p>
            </AForm>
            <div className="ad-stack s8" style={{ marginTop: 14, fontSize: 13.5 }}>
              <div className="ad-kv">
                <span>Password lockout</span>
                <span>5 failed attempts · 15 minutes</span>
              </div>
              <div className="ad-kv">
                <span>Last penetration test</span>
                <span>Scheduled for Phase 5</span>
              </div>
              <div className="ad-kv">
                <span>Backups</span>
                <span>{sec.backups === 'daily' ? 'Daily · encrypted (managed Postgres)' : (sec.backups ?? 'Not configured')}</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="ad-card">
        <h2 className="ad-h">Roles and permissions</h2>
        <div className="ad-scroll">
          <table className="ad-table" style={{ marginTop: 10, fontSize: 12.5 }}>
            <thead>
              <tr>
                <th>Permission</th>
                {roles.map((r) => (
                  <th key={r.id} className="c">
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMS.map(([p, l]) => (
                <tr key={p}>
                  <td>
                    {l} <span className="mono ad-muted" style={{ fontSize: 11 }}>{p}</span>
                  </td>
                  {roles.map((r) => {
                    const on = r.permissions.includes('*') || r.permissions.includes(p);
                    return (
                      <td key={r.id} className="c" aria-label={on ? 'Allowed' : 'Not allowed'} style={{ color: on ? '#16825D' : '#C8CBD8', fontWeight: 700 }}>
                        {on ? '✓' : '–'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ad-card">
        <div className="ad-between">
          <div>
            <h2 className="ad-h">Audit log</h2>
            <p className="ad-sub">Latest 200 entries. Every admin change is recorded; no personal data is stored in the diff.</p>
          </div>
          <form action="/admin/settings" className="ad-row" role="search">
            <input className="ad-input" name="actor" defaultValue={actor} placeholder="Actor email" aria-label="Filter by actor" style={{ width: 200 }} />
            <select className="ad-input" name="entity" defaultValue={entity} aria-label="Filter by entity" style={{ width: 190 }}>
              <option value="">All entities</option>
              {entities.map((e) => (
                <option key={e.entity}>{e.entity}</option>
              ))}
            </select>
            <button className="ad-btn line" type="submit">
              Filter
            </button>
          </form>
        </div>
        <div className="ad-scroll">
          <table className="ad-table" style={{ marginTop: 10, fontSize: 12.5 }}>
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="ad-muted2" style={{ whiteSpace: 'nowrap' }}>
                    {fmtDateTime(l.at)}
                  </td>
                  <td>{l.actor}</td>
                  <td className="mono" style={{ fontSize: 11.5 }}>
                    {l.action}
                  </td>
                  <td>
                    {l.entity} <span className="mono ad-muted" style={{ fontSize: 11 }}>{l.entityId}</span>
                  </td>
                  <td className="mono ad-muted2" style={{ fontSize: 11, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.diff ? JSON.stringify(l.diff) : ''}>
                    {l.diff ? JSON.stringify(l.diff) : ''}
                  </td>
                  <td className="ad-muted" style={{ fontSize: 11.5 }}>
                    {l.ip}
                  </td>
                </tr>
              ))}
              {!logs.length && (
                <tr>
                  <td colSpan={6} className="ad-empty">
                    No entries
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
