# Partner API quickstart (sandbox)

For partner engineers integrating with the Mr UK / Skywood Commerce Hub. Full contract: `openapi.yaml`. Design and states: `PARTNER-API.md`. Security rules: `../security/PARTNER-API-SECURITY.md`.

Base URL (sandbox): `https://sandbox.partners.<hub-domain>/api/partner/v1` (domain to be confirmed). Amounts are integer TZS. One merchant (`mruk` or `skywood`) per quote and order.

## 1. Get sandbox keys

Bermi Techs issues, through a secure channel (never email in plain text):
- `client_id` and `client_secret` (OAuth 2.0 client credentials);
- a **signing secret** for payment, refund and remittance confirmations;
- your merchant grants (for example `skywood` only).

Webhooks from the Hub are signed with the same signing secret. Store all secrets in your vault. Sandbox and live keys are different.

```bash
export HUB=https://sandbox.partners.<hub-domain>/api/partner/v1
export CLIENT_ID=... CLIENT_SECRET=... SIGNING_SECRET=...   # from your vault
```

## 2. Get a token

```bash
TOKEN=$(curl -s -u "$CLIENT_ID:$CLIENT_SECRET" \
  -d grant_type=client_credentials \
  -d "scope=catalog:read orders:read orders:write payments:write refunds:write webhooks:manage" \
  "$HUB/oauth/token" | jq -r .access_token)
```

Tokens are short-lived (`expires_in`, 10 minutes). Cache and refresh before expiry; do not request one per call (the token endpoint is rate limited).

## 3. List products

```bash
curl -s -H "Authorization: Bearer $TOKEN" "$HUB/merchants"
curl -s -H "Authorization: Bearer $TOKEN" \
  "$HUB/merchants/skywood/products?category=living&inStock=true&limit=50"
```

Follow `nextCursor` until it is `null`. For daily sync, send `updatedSince=<last sync time>` and `If-None-Match: <ETag>` (a `304` means nothing changed). Products with `"available": false` must be hidden in your app. Prices are indicative until quoted.

## 4. Quote

```bash
curl -s -X POST "$HUB/quotes" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"merchant":"skywood","region":"Dar es Salaam","lines":[{"productId":"sw-sofa-3s-oslo","qty":1}]}'
```

Show the customer `items`, `deliveryFee` and `total`. The quote expires at `expiresAt` (about 15 minutes) and can be used for one order only; after that, quote again.

## 5. Create the order

```bash
curl -s -X POST "$HUB/orders" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: 6c1f0e8a-order-AZ-ORD-000123" \
  -d '{"quoteId":"<quote id>","partnerOrderRef":"AZ-ORD-000123","partnerCustomerRef":"CUST-88812",
       "contact":{"name":"Asha Mushi","phone":"+255712345678","email":""},
       "delivery":{"region":"Dar es Salaam","addressLine":"Plot 12, Msasani Peninsula"},
       "consentAt":"2026-11-27T09:29:40Z"}'
```

Response: `status: "pending_payment"`, `number` (for example `SW-20391`), `amountDue`, `holdExpiresAt`. Stock is held until `holdExpiresAt`. If the network fails, **retry with the same Idempotency-Key**; you will get the same order, never a duplicate. Send only the data shown; never send account numbers, PINs or balances.

## 6. Collect payment, then confirm it (signed)

Debit the customer on your rails for exactly `amountDue`, before `holdExpiresAt` (avoid the last 60 seconds). Then confirm. The signature is `HMAC-SHA256(signingSecret, t + "." + rawBody)` in hex, where `t` is the current Unix time in seconds. Sign the **exact bytes** you send.

**curl + openssl**

```bash
BODY='{"amount":1450000,"currency":"TZS","partnerTransactionRef":"AZ-TXN-9F31C2","rail":"bank_account","paidAt":"2026-11-27T09:31:00Z"}'
T=$(date +%s)
SIG=$(printf '%s.%s' "$T" "$BODY" | openssl dgst -sha256 -hmac "$SIGNING_SECRET" -hex | sed 's/^.* //')
curl -s -X POST "$HUB/orders/<order id>/payments" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: pay-AZ-TXN-9F31C2" \
  -H "X-Hub-Signature: t=$T,v1=$SIG" \
  --data-binary "$BODY"
```

**Node.js (18+)**

```js
import crypto from 'node:crypto';

export async function confirmPayment(hub, token, signingSecret, orderId, payment) {
  const body = JSON.stringify(payment);
  const t = Math.floor(Date.now() / 1000);
  const v1 = crypto.createHmac('sha256', signingSecret).update(`${t}.${body}`).digest('hex');
  const res = await fetch(`${hub}/orders/${orderId}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `pay-${payment.partnerTransactionRef}`,
      'X-Hub-Signature': `t=${t},v1=${v1}`,
    },
    body,
  });
  if (!res.ok) throw Object.assign(new Error('confirm failed'), { problem: await res.json() });
  return res.json(); // { status: "captured", orderStatus: "paid", ... }
}
```

Keep your server clock in sync (NTP): signatures older than 5 minutes are rejected. Errors you must handle: `409 order_expired` (reverse the debit to the customer), `409 order_not_payable`, `422 amount_mismatch`, `401 invalid_signature`. A repeat with the same `partnerTransactionRef` returns the existing payment and never captures twice.

## 7. Receive webhooks and verify them

Register an endpoint:

```bash
curl -s -X POST "$HUB/webhook-endpoints" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -H "Idempotency-Key: $(uuidgen)" \
  -d '{"url":"https://api.partner.example/hub/webhooks","events":["order.paid","order.dispatched","order.delivered","order.cancelled","order.expired","refund.created"]}'
```

Verify every delivery against the **raw** body with your signing secret:

```js
import crypto from 'node:crypto';
import express from 'express';

const app = express();
app.post('/hub/webhooks', express.raw({ type: 'application/json' }), (req, res) => {
  const header = req.get('X-Hub-Signature') ?? '';
  const { t, v1 } = Object.fromEntries(header.split(',').map((p) => p.split('=')));
  const expected = crypto.createHmac('sha256', process.env.HUB_SIGNING_SECRET).update(`${t}.${req.body}`).digest('hex');
  const fresh = Math.abs(Date.now() / 1000 - Number(t)) <= 300;
  const ok = v1?.length === 64 && crypto.timingSafeEqual(Buffer.from(v1, 'hex'), Buffer.from(expected, 'hex'));
  if (!fresh || !ok) return res.sendStatus(401);
  const event = JSON.parse(req.body);
  // Deduplicate by event.id; ignore if data.order.version is older than what you hold.
  queue.push(event); // process asynchronously
  res.sendStatus(200); // reply within 5 s
});
```

Delivery is at least once and may arrive out of order; failed deliveries retry for up to 24 hours. Missed something? Read `GET /events?cursor=…`. For `refund.created`, return the money to the customer, then call `POST /refunds/{id}/confirm` signed exactly like a payment confirmation.

## 8. Test in sandbox

No money or real stock moves in sandbox. Drive fulfilment yourself:

```bash
curl -s -X POST "$HUB/sandbox/orders/<order id>/simulate" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -H "Idempotency-Key: $(uuidgen)" -d '{"action":"dispatch"}'
```

Actions: `pack`, `dispatch`, `deliver`, `cancel`, `expire`, `approve_cancellation`, `close_settlement`.

## 9. Go live

1. Complete the test plan in `PARTNER-API.md` §8 and send the request ids as evidence.
2. Agreements signed with each merchant (commercial terms and settlement timing to be agreed) and the data processing agreement.
3. Provide live IP ranges, webhook URLs and, optionally, your mTLS client certificate.
4. Bermi Techs promotes your organisation to live and issues **new** live credentials. Sandbox keys never work in live.
5. Settle each merchant separately to its own account; download `GET /settlements/{id}/lines` and report the transfer with `POST /settlements/{id}/remittance` (signed).
