# Offline-capable POS client (#319, #333)

**Status:** Phase 0 ADR + MVP cash sync + deferred card intent (#333)  
**Related:** umbrella [#52](https://github.com/satisfecho/pos/issues/52) Issue 4 in [0050](0050-github-issue-52-split-plan.md); fiscal caveats [#203](https://github.com/satisfecho/pos/issues/203) / [0018](0018-verifactu-fiscal-invoicing.md); card/fiscal slice [#333](https://github.com/satisfecho/pos/issues/333)

## Decision summary

| Topic | Choice |
|-------|--------|
| **MVP surface** | Staff-only: take-away sale queued offline, synced with an **idempotency key**. |
| **Cash** | On sync: paid cash order (`POST /orders/offline-cash`, `payment_intent=cash`). |
| **Card** | **Deferred online card** only: queue `payment_intent=card` (metadata). On sync: **unpaid** open order; staff collects card/terminal/Stripe/Revolut **after reconnect**. No PAN/CVV on device. |
| **True offline card** | **Blocked / out of scope.** Stripe/Revolut PaymentIntents and certified terminals need connectivity; storing card data locally is unsafe and not PCI-friendly. |
| **Fiscal / VeriFactu** | **Online-only, after payment.** Offline queue and sync **must not** allocate fiscal series or call issue. Staff issues invoices when online on a **paid** order ([0018](0018-verifactu-fiscal-invoicing.md)). Deferred numbering is **not** approved. |
| **German TSE** | Auto-sign on **paid** offline-cash sync only; deferred-card orders sign on later mark-paid. |
| **Target offline duration** | **Minutes to ~2 hours** of intermittent Wi‑Fi / backend blips during service - not “full day airplane mode”. |
| **Read path** | Local product + take-away table cache refreshed while online (no service worker yet). |
| **Write path** | Browser `localStorage` queue → authenticated `POST /orders/offline-cash` on reconnect. |
| **Conflict rule** | Server wins on idempotency key: first accepted payload is canonical; retries with the **same key** return the existing order (no double sale). |

## Architecture (MVP + deferred card)

```text
Staff device                    Backend (tenant-scoped)
─────────────                   ───────────────────────
ConnectivityService ──ping──►   GET /health
Product/table cache (LS)
Offline sale UI ──enqueue──►    localStorage queue
  payment_intent: cash|card
     │ online + auth
     └─ flush ───────────────►  POST /orders/offline-cash
                                   idempotency_key UNIQUE(tenant_id, key)
                                   cash → paid order + OfflineOrderIdempotency
                                   card → unpaid order + ledger (needs_payment)
                                   → staff mark-paid / card online (no fiscal offline)
```

- Reuses existing auth, tenant scoping, product resolution - **no parallel unauthenticated order API**.
- Fiscal numbering stays **online-only**: do not call fiscal issue from the offline queue.
- Stripe/Revolut intents require connectivity; offline UI offers **cash** (paid on sync) or **card intent** (pay after sync).

## Card / fiscal policy (#333)

| Option | Decision |
|--------|----------|
| Capture card PAN/CVV offline | **No** - never store cardholder data in `localStorage` or the queue. |
| Stripe Terminal / Revolut offline mode | **Not implemented** - would need provider-specific hardware SDKs and compliance review. |
| Deferred card after reconnect | **Yes** - queue intent; sync creates unpaid take-away order with `[offline-card-intent]` note; staff uses existing pay flows. |
| Issue VeriFactu / live fiscal number while offline | **No** - regulators expect sequential online issuance; unpaid orders cannot issue. |
| Deferred fiscal numbering while disconnected | **Rejected** unless a future explicit policy + legal review says otherwise (documented here as blocked). |

## Threat model (MVP)

| Risk | Mitigation |
|------|------------|
| **Duplicate orders** on flaky sync | Client UUID `idempotency_key`; unique `(tenant_id, key)`; replay returns same `order_id`. |
| **Fraud / forged offline sales** | Same JWT + `order:update_status` + `order:mark_paid` as finish/cash pay; no public offline write. |
| **Fiscal/VeriFactu gaps** | Offline sync does **not** allocate fiscal numbers; staff issue invoices after pay when online. |
| **Card data theft from device** | Queue holds product ids + quantities + `payment_intent` only - **no card numbers**. |
| **Unpaid deferred-card tickets** | Order stays open on Take Away `active_order_id`; staff must collect payment online; TSE/inventory follow paid path. |
| **Clock skew** | Server `paid_at` / `created_at` use server UTC; optional `client_created_at` is advisory only. |
| **Stale prices** | Cache may be outdated; server re-prices from current `Product` at sync time. |
| **Wrong table** | MVP prefers take-away table names; table must belong to tenant. |
| **Device theft with queue** | Queue holds product ids + quantities (no card data); auth token still required to sync. |

## Conflict / double-submit rules

1. Generate `idempotency_key` **once** when the staff confirms the offline sale; never regenerate on retry.
2. Successful HTTP 200/201 with that key → mark queue item synced; do not re-POST.
3. Network error / 5xx → keep queued; retry with same body + key (including `payment_intent`).
4. 4xx validation (unknown product, bad table, bad intent) → mark failed with server detail; do not infinite-retry.
5. Do **not** invent a second client-side “local order id” as the business key - only the idempotency key + server `order_id` after sync.

## Phases (beyond current ship)

1. Service worker + IndexedDB for menu assets.
2. Broader staff writes (add item to open table) with richer conflict UI.
3. Optional cash-only tips on offline cash path.
4. Provider-certified offline card (Terminal SDK) only if product + compliance require it - still separate from VeriFactu offline (which remains rejected).

## Acceptance

- [x] Written ADR + threat model (this doc).
- [x] Prototype: staff cash sale offline → sync on reconnect via idempotent API (#319).
- [x] Deferred card intent: unpaid order on sync; collect card online (#333).
- [x] Fiscal policy documented: online-only after payment; no offline series allocation.
- [x] Clear UI indicator for offline / pending sync + payment intent in queue list.
