import { NextResponse, type NextRequest } from 'next/server';

/**
 * 1. Brand by host: shop.mruk.co.tz → /mruk/*, shop.skywood.co.tz → /skywood/*.
 * 2. Strict Content-Security-Policy with a per-request nonce.
 * 3. Cheap gate for /admin (real session checks run on the server).
 */
const HOST_BRAND: Record<string, string> = {
  'shop.mruk.co.tz': 'mruk',
  'shop.skywood.co.tz': 'skywood',
};

const PASS_THROUGH = /^\/(mruk|skywood|admin|azania|api|_next|brand|img|icons|sw\.js|manifest\.webmanifest|favicon|robots\.txt|sitemap\.xml|offline)/;

function csp(nonce: string, dev: boolean) {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    // Inline style attributes are used for brand theming; no inline scripts are allowed.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https://www.mruk.co.tz https://www.skywood.co.tz`,
    `font-src 'self' data:`,
    `connect-src 'self'${dev ? ' ws:' : ''}`,
    `frame-src https://maps.google.com https://www.google.com`,
    `frame-ancestors ${process.env.AZANIA_FRAME_ANCESTORS || "'self'"}`,
    `form-action 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    ...(dev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const host = (req.headers.get('host') ?? '').split(':')[0]!.toLowerCase();
  const brand = HOST_BRAND[host];

  if (url.pathname.startsWith('/admin') && !url.pathname.startsWith('/admin/login') && !req.cookies.get('bt_staff')) {
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }

  const nonce = btoa(crypto.randomUUID());
  const policy = csp(nonce, process.env.NODE_ENV !== 'production');
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', policy);

  let res: NextResponse;
  if (brand && !PASS_THROUGH.test(url.pathname)) {
    url.pathname = `/${brand}${url.pathname === '/' ? '' : url.pathname}`;
    res = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  } else {
    res = NextResponse.next({ request: { headers: requestHeaders } });
  }
  res.headers.set('Content-Security-Policy', policy);
  return res;
}

export const config = {
  matcher: [{ source: '/((?!_next/static|_next/image|favicon.ico).*)', missing: [{ type: 'header', key: 'next-router-prefetch' }] }],
};
