# Plan: pay with crypto (#439)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/439
- **439**

## Status
- **Blocked - waiting for human** (product direction): plan drafted below; need decisions on approach, MVP surface, provider, assets, refunds before any code.
- **Waiting notice posted:** 2026-11-07T10:15:36Z
- **Note:** `gh issue comment` for the plan + waiting notice **failed** with Bad credentials (HTTP 401) at that timestamp. Re-post the plan body from **Adaptation plan (010)** once `gh auth` works; do not treat the missing issue comment as a human reply.

## Problem / goal
Product ask: explore **payment via cryptocurrency**. Issue explicitly says **think and plan, do not code**. Deliver a concrete adaptation plan for Satisfecho POS (staff + public menu payment options), aligned with existing card/online flows (Stripe/Revolut - see `docs/REVOLUT.md`, split-bill / offline payment docs). No implementation in this task.

## High-level instructions for coder
- **Do not implement** crypto checkout, wallets, or new payment providers in `back/` or `front/` under this FEAT.
- Research options at product level only: custodial processor vs on-chain wallet, supported assets, FX/settlement to EUR, refunds, KYC/AML, and how a paid state would map to existing order payment + Factura/VeriFactu rules.
- Compare against current payment UX (cash, card terminal, Revolut/Stripe online) and offline queue rules (`docs/0063-offline-capable-client.md` - offline must not store sensitive payment material).
- Write a short plan (issue comment and/or a small `docs/` design note if product agrees) covering: recommended approach, out-of-scope items, risks, and a phased MVP vs later work.
- After posting the plan on the GitHub issue, park with **Waiting notice posted** (leave as FEAT; no WIP/code) until a human chooses direction - see `agents2/TASKS-README.md` waiting-for-human flow.
- Do not add payment provider API keys or sandbox credentials to the repo.

## Adaptation plan (010) - 2026-11-07T10:15:36Z

### Current payment map (POS today)
| Path | How it settles | Paid mark |
|------|----------------|-----------|
| Staff cash / terminal / other | `PUT mark-paid` / finish / `order_payment` legs | `Order.paid_at`, `payment_method` cash/terminal/… or `split` |
| Guest Stripe | PaymentIntent create + confirm | `payment_method=stripe`, one `order_payment` leg |
| Guest Revolut | Create Merchant order → checkout redirect → confirm | `payment_method=revolut`, `revolut_order_id` |
| Offline | Cash paid on sync; card = unpaid intent only | No PAN/secrets in queue (`docs/0063`) |
| Fiscal | One alta per **fully paid** order | `docs/0018`, `docs/0071` |

Public UX: menu “How do you want to pay?” sheet shows Stripe/Revolut when configured (`docs/REVOLUT.md`). Delivery has a parallel payment-success confirm path.

### Options compared
| Option | Pros | Cons for Satisfecho |
|--------|------|---------------------|
| **A. Custodial processor, fiat settlement (EUR)** | Same shape as Revolut/Stripe; processor handles wallet UX, sanctions screening, conversion; restaurant gets EUR; refunds API | Provider fees; country eligibility; extra Settings secret / webhook |
| **B. Restaurant on-chain wallet** | “True” crypto, no processor fee narrative | Volatility, refunds, KYC/AML on tenant, messy EUR for VeriFactu, custody risk, ops |
| **C. Stripe Crypto / stablecoins on existing Stripe** | Reuses tenant Stripe keys and confirm patterns | As of research (2026): stablecoin **acceptance** still largely US-merchant gated; **verify ES/EU** before betting MVP on this alone |

### Recommendation
**Option A (custodial, EUR-settled)** for any MVP. Prefer **reusing Stripe** only if Crypto/stablecoin is enabled for the tenant jurisdiction; otherwise shortlist BitPay / Coinbase Commerce / similar with EUR settlement and hosted checkout.

Do **not** build wallet custody, seed handling, or raw chain monitoring in `back/`/`front/`.

### Mapping to paid + fiscal
- Treat crypto like Revolut: unpaid until provider confirms success → then set `paid_at` / `status=paid` and `payment_method` (`crypto` or provider slug).
- Persist provider charge id on the order or `order_payment` (mirror `stripe_payment_intent_id` / `revolut_order_id`).
- Invoice / VeriFactu: keep **one fiscal alta after full EUR settlement**; record EUR cents due at pay time (no crypto amount on the Factura as primary).
- Split-bill: crypto as one leg only after confirm; defer multi-intent crypto until after MVP (`docs/0071`).
- Offline: **online-only**; never store crypto payment material in the offline queue.

### Phased work (after human decide)
1. **MVP:** one processor, tenant toggle + secret in Settings, public menu (+ delivery if APIs match), confirm/webhook → mark paid, i18n pay option, no new secrets in git.
2. **Next:** staff POS crypto option / split leg; reporting filter; refund path.
3. **Out of scope:** on-chain treasury, DeFi, crypto tips, offline crypto, multi-chain DIY.

### Risks
- EU/ES merchant eligibility (especially Stripe Crypto).
- Refunds in crypto vs EUR staff adjustment.
- AML/sanctions at processor vs restaurant liability.
- FX if presentment currency ≠ EUR.
- Guest UX latency (chain confirmations) vs card.

### Decisions needed on #439
1. Approach: **A** custodial fiat-settled (recommended) vs **B** restaurant wallet.
2. MVP surface: public menu only / staff only / both.
3. Provider: Stripe-if-EU / BitPay / Coinbase Commerce / other / agent short spike.
4. Assets: stablecoins only vs BTC/ETH too.
5. Refunds: processor crypto refund vs staff EUR cash/card.
6. OK to add a short `docs/` design note after the choice?

### Agent notes
- Synced `development`; left task as **FEAT** (no WIP / no product code).
- Plan written here; GitHub comment blocked by invalid `gh` token (same class of failure as FEAT-438).
- When humans reply with decisions and `gh` works: clear blocked status, implement the agreed slice in a later 010 pass (then FEAT → WIP).
