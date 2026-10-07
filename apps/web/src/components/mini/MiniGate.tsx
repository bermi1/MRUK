import Link from 'next/link';
import { miniDemoSignInAction } from '@/app/actions/mini';

const ERRORS: Record<string, string> = {
  sso: 'That sign-in link has expired or is not valid. Close this page and open the shop again from the Azania Bank app.',
  rate: 'Too many sign-in attempts. Please wait a few minutes and try again.',
};

/** Shown when there is no valid bt_azania session. */
export function MiniGate({ error, demo }: { error?: string; demo: boolean }) {
  const msg = error ? ERRORS[error] : undefined;
  return (
    <div className="mn-screen white">
      <div className="mn-gate">
        <div className="logos">
          <img className="az" src="/brand/azania-mark.png" alt="Azania Bank" />
        </div>
        <div className="mn-eyebrow">MINI APP IN AZANIA</div>
        <h1>Open this from the Azania Bank app</h1>
        <p>Shop Mr UK and Skywood and pay monthly on Salary Advance. Sign in to the Azania Bank app and tap Shop to continue. Your details come from the bank, so there are no forms to fill.</p>
        <div className="logos" aria-hidden="true">
          <img src="/brand/mruk.png" alt="" />
          <img src="/brand/skywood.png" alt="" />
        </div>
        {msg && (
          <div className="mn-error" role="alert">
            {msg}
          </div>
        )}
        <Link className="mn-link" href="/">
          Shop on the website instead
        </Link>
        {demo && (
          <form className="demo" action={miniDemoSignInAction}>
            <button type="submit" className="mn-cta">
              Demo: sign in as Neema Mushi (mock SSO)
            </button>
            <small>Development only. Not shown in production.</small>
          </form>
        )}
      </div>
    </div>
  );
}
