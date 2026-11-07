import { ldJson } from '@/server/seo';

/**
 * Server-rendered schema.org data. `type="application/ld+json"` is data, not script: browsers
 * never execute it, so the CSP script-src (nonce + strict-dynamic) does not apply and no nonce
 * is set (a nonce here caused a hydration mismatch before). Rendered only from Server Components.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(data) }} />;
}

/**
 * Open Graph product tags (og:type=product, product:price:*) with the `property` attribute that
 * Facebook/WhatsApp expect; Next's metadata API can only emit them as `name`. React hoists <meta>
 * into <head>.
 */
export function OgProduct({ price, availability, brand }: { price: number; availability: 'in stock' | 'out of stock'; brand: string }) {
  return (
    <>
      <meta property="og:type" content="product" />
      <meta property="product:price:amount" content={String(Math.round(price))} />
      <meta property="product:price:currency" content="TZS" />
      <meta property="product:availability" content={availability} />
      <meta property="product:brand" content={brand} />
    </>
  );
}
