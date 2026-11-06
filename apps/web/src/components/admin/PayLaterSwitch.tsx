import Link from 'next/link';
import { fmtDateTime, type PayLaterBrand, type PayLaterState } from '@bt/core';
import { setPayLaterAction } from '@/app/actions/admin';
import { ActBtn } from './ActBtn';
import { Pill } from './ui';

const NAME: Record<PayLaterBrand, string> = { mruk: 'Mr UK', skywood: 'Skywood' };

/**
 * Settings › "Pay Later by Azania Bank": one On/Off switch per brand (owner/manager, confirm, audit-logged).
 * Off hides Pay Later everywhere on that brand's storefront and blocks new applications on the server;
 * existing applications keep being processed in Salary Advance.
 */
export function PayLaterSwitch({ states, brands, canToggle }: { states: Record<PayLaterBrand, PayLaterState>; brands: PayLaterBrand[]; canToggle: boolean }) {
  return (
    <section className="ad-card" id="paylater" data-testid="paylater-settings">
      <h2 className="ad-h">Pay Later by Azania Bank</h2>
      <p className="ad-sub">Off hides Pay Later, monthly prices and the Azania partner marks on that store, and new Pay Later orders are refused. Existing applications stay in Salary Advance.</p>
      <div style={{ marginTop: 6 }}>
        {brands.map((b) => {
          const s = states[b];
          const label = `Pay Later by Azania Bank: ${s.enabled ? 'On' : 'Off'}`;
          return (
            <div key={b} className="ad-plrow" data-testid={`paylater-${b}`} data-state={s.enabled ? 'on' : 'off'}>
              <span className="ad-plrow-txt">
                <b>{NAME[b]}</b>
                <span>
                  Pay Later by Azania Bank: <Pill cls={s.enabled ? 'pill-green' : 'pill-grey'}>{s.enabled ? 'On' : 'Off'}</Pill>
                </span>
                <small>{s.at ? `Changed by ${s.updatedBy || 'system'} · ${fmtDateTime(new Date(s.at))}` : 'Never switched on (default off)'}</small>
              </span>
              {canToggle && (
                <span className="ad-row" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <ActBtn
                    action={setPayLaterAction.bind(null, b, !s.enabled)}
                    className={s.enabled ? 'ad-btn danger sm' : 'ad-btn sm'}
                    label={`${NAME[b]}: ${label}. ${s.enabled ? 'Turn off' : 'Turn on'}`}
                    confirm={
                      s.enabled
                        ? `Turn OFF Pay Later by Azania Bank for ${NAME[b]}? Customers will no longer see Pay Later or monthly prices, and new Pay Later orders are refused. Existing applications are not affected.`
                        : `Turn ON Pay Later by Azania Bank for ${NAME[b]}? Customers will see Pay Later and monthly prices and can apply at checkout.`
                    }
                    showOk
                  >
                    {s.enabled ? 'Turn off' : 'Turn on'}
                  </ActBtn>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Compact state for the dashboard and the Salary Advance page header. */
export function PayLaterStatus({ states, brands, canChange, light = false }: { states: Record<PayLaterBrand, PayLaterState>; brands: PayLaterBrand[]; canChange: boolean; light?: boolean }) {
  return (
    <span className={`ad-plstat ${light ? 'light' : ''}`} data-testid="paylater-status">
      <span>Pay Later by Azania Bank:</span>
      {brands.map((b) => (
        <span key={b} className="ad-row" style={{ gap: 4 }} data-brand={b} data-state={states[b].enabled ? 'on' : 'off'}>
          {NAME[b]} <Pill cls={states[b].enabled ? 'pill-green' : 'pill-grey'}>{states[b].enabled ? 'On' : 'Off'}</Pill>
        </span>
      ))}
      {canChange && (
        <Link href="/admin/settings#paylater" className={light ? '' : 'ad-wlink'} style={light ? { color: '#fff', textDecoration: 'underline' } : undefined}>
          Change
        </Link>
      )}
    </span>
  );
}
