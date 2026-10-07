import { NextResponse, type NextRequest } from 'next/server';
import { integrations } from '@/server/integrations';
import { startAzaniaSession } from '@/server/mini/azania';
import { limit, RateLimitError } from '@/server/ratelimit';

export const dynamic = 'force-dynamic';

/** SSO token exchange: /azania/sso?token=… → signed bt_azania cookie → /azania (token stripped from the URL). */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const back = (q = '') => {
    const res = NextResponse.redirect(new URL(`/azania${q}`, req.nextUrl.origin), 303);
    res.headers.set('Cache-Control', 'no-store');
    res.headers.set('Referrer-Policy', 'no-referrer');
    return res;
  };
  try {
    await limit('azania-sso', 20, 15 * 60);
  } catch (e) {
    if (e instanceof RateLimitError) return back('?e=rate');
    throw e;
  }
  if (!token || token.length > 512 || !/^[A-Za-z0-9_.-]+$/.test(token)) return back('?e=sso');
  const customer = await integrations.bank.verifySsoToken(token);
  if (!customer) return back('?e=sso');
  await startAzaniaSession(customer.customerRef);
  return back();
}
