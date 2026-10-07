import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/admin/LoginForm';
import { currentStaffSession } from '@/server/session';

export const metadata = { title: 'Sign in' };

export default async function AdminLogin() {
  const s = await currentStaffSession();
  if (s?.kind === 'staff') redirect('/admin');
  return (
    <main className="ad-login">
      <section className="art" aria-hidden="true">
        <div className="ad-row" style={{ gap: 12 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: '5px 7px', display: 'flex' }}>
            <img src="/brand/mruk.png" alt="" style={{ height: 26 }} />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>Commerce OS</div>
            <div style={{ fontSize: 12, color: '#AEB6D8' }}>Mr UK and Skywood</div>
          </div>
        </div>
        <div>
          <h1>One portal for both brands.</h1>
          <p>Orders, Azania Bank Salary Advance, catalogue, website content, support and reports, live across every surface.</p>
        </div>
        <div className="ad-row" style={{ gap: 10, fontSize: 12.5, color: '#AEB6D8' }}>
          <img src="/brand/azania-mark.png" alt="" style={{ height: 26, background: '#fff', borderRadius: 6, padding: 2 }} />
          In partnership with Azania Bank · Built by Bermi Techs
        </div>
      </section>
      <section className="pane">
        <LoginForm />
      </section>
    </main>
  );
}
