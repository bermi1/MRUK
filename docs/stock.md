# How stock is counted

One number per product: `Product.stock` is the **available** quantity, the units that can still be sold.
There is no per-branch stock yet.

## Checkout reserves stock

When a customer places an order, each line is taken off `stock` in the same database transaction that
creates the order (`reserveStock()` in `apps/web/src/server/orders.ts`). The update only succeeds while
`stock >= qty`, so two shoppers can never buy the last unit twice. What happens next depends on payment:

| Payment | Order status after checkout | Stock |
|---|---|---|
| Pay on delivery | Processing (`approved`) | Sold. Stays off `stock`. |
| Card / Azania account, not paid yet | Awaiting payment (`placed`), `reservedUntil` = now + 30 min | **Reserved** for 30 minutes. |
| Card / Azania account, paid | Processing (`approved`) | Sold. |
| Salary Advance (Pay Later) | Bank review (`bank_review`) | **Reserved** until Azania Bank decides. |

Admin › Inventory shows **Available** (`Product.stock`) and **Reserved** (units in orders that are
`placed` or `bank_review`). Units on the shelf = available + reserved.

## Stock comes back

Reserved or sold units are added back to `stock` (`restock()` in `server/orders.ts`) when:

- an unpaid order passes its 30-minute hold: `releaseExpiredReservations()` cancels it (it runs when
  a customer checks out, when the Orders or Inventory page opens, and from the staff task sweep);
- staff cancel an order, or reject it (Orders page), at any status before dispatch;
- Azania Bank (or Finance, manually) rejects a Salary Advance application.

Approval of a Salary Advance or a card payment does not change stock: the units were already reserved.

## Staff changes

- **Inventory › Quick restock** adds the quantity entered (1 to 10,000) to available stock, atomically,
  so it is safe while orders are being placed. Audit log: `product.restock` with the units added and the new total.
- **Products › Available** (inline edit) sets the available number exactly (0 to 100,000), e.g. after a
  count. Audit log: `product.stock` with the old and new value. Use restock to record a delivery.
- Stock can never go below zero: checkout only takes what is there, and both staff inputs refuse negatives.
- Every change refreshes the storefront catalogue cache at once, so shoppers see the new number on the next page load,
  and re-checks the low-stock tasks (low at 6 or fewer, reorder at 3 or fewer).
