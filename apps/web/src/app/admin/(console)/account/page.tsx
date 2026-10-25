import { prisma } from '@bt/db';
import { fmtDateTime } from '@bt/core';
import { PasswordForm } from '@/components/admin/PasswordForm';
import { Pill } from '@/components/admin/ui';
import { requireStaff } from '@/server/auth';

export const metadata = { title: 'My account' };

const brandText = (b: string[]) => (b.includes('*') ? 'Both brands' : b.map((x) => (x === 'mruk' ? 'Mr UK' : 'Skywood')).join(', ') || 'None');

export default async function AccountPage() {
  const ctx = await requireStaff(undefined, { allowPasswordChange: true });
  const [u, sessions] = await Promise.all([
    prisma.staffUser.findUniqueOrThrow({ where: { id: ctx.id }, select: { lastLoginAt: true, passwordChangedAt: true, totpEnabled: true } }),
    prisma.session.count({ where: { staffId: ctx.id, kind: 'staff', expiresAt: { gt: new Date() } } }),
  ]);
  return (
    <div className="ad-grid2" style={{ alignItems: 'start' }}>
      <section className="ad-card ad-stack s12">
        <div>
          <h2 className="ad-h">Change password</h2>
          {ctx.mustChangePassword ? (
            <div className="ad-alert" role="alert" style={{ marginTop: 10 }}>
              You signed in with a temporary password. Choose your own password to continue.
            </div>
          ) : ctx.usingIssuedPassword ? (
            <div className="ad-alert warn" style={{ marginTop: 10 }}>
              You are still using the password you were given. Choose your own password now.
            </div>
          ) : (
            <p className="ad-sub">Changing your password signs you out on every other device.</p>
          )}
        </div>
        <PasswordForm email={ctx.email} required={ctx.mustChangePassword} />
      </section>
      <section className="ad-card ad-stack s8">
        <h2 className="ad-h">Your account</h2>
        <div className="ad-kv">
          <span>Name</span>
          <span>{ctx.name}</span>
        </div>
        <div className="ad-kv">
          <span>Email</span>
          <span>{ctx.email}</span>
        </div>
        <div className="ad-kv">
          <span>Role</span>
          <Pill cls="pill-navy">{ctx.roleName}</Pill>
        </div>
        <div className="ad-kv">
          <span>Brand access</span>
          <span>{brandText(ctx.brands)}</span>
        </div>
        <div className="ad-kv">
          <span>Two-factor sign-in</span>
          <span>{u.totpEnabled ? <Pill cls="pill-green">On</Pill> : <Pill cls="pill-amber">Not set up</Pill>}</span>
        </div>
        <div className="ad-kv">
          <span>Password last changed</span>
          <span>{u.passwordChangedAt ? fmtDateTime(u.passwordChangedAt) : 'Never'}</span>
        </div>
        <div className="ad-kv">
          <span>Last sign-in</span>
          <span>{u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : '—'}</span>
        </div>
        <div className="ad-kv">
          <span>Signed-in devices</span>
          <span>{sessions}</span>
        </div>
        <p className="ad-muted2" style={{ fontSize: 12.5, margin: 0 }}>
          Lost your authenticator app? Ask a Super admin to reset your two-factor sign-in in Settings and users.
        </p>
      </section>
    </div>
  );
}
