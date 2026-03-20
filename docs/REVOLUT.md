# Revolut Merchant API integration

This document describes how Revolut is used in this POS and how to set up the Revolut sandbox (including the required CSR and certificates).

## What we use

- **Revolut Merchant API** — scope: **Accept Payments through a checkout extension**
- We create orders via the Merchant API and redirect customers to Revolut Checkout. After payment, Revolut redirects back to our app; we then confirm the payment and mark the order as paid.

We do **not** use Open Banking (AISP/PISP/CBPII) or Revolut Reader / Tap to Pay. We only need the checkout-extension scope.

---

## Sandbox setup

The Revolut sandbox may require you to complete **Redirect URLs** and **Sandbox certificates (CSR)** before you can continue. Both are documented below.

### 1. Enable the right scope

In the Revolut sandbox / developer portal:

- Enable **Merchant API** → **Accept Payments through a checkout extension**
- This allows creating and managing orders, and using the checkout so customers can pay for goods and services.

### 2. Redirect URLs

Add every base URL where the customer menu and payment-success page are served. Revolut will only accept `redirect_url` values that match these (by origin or prefix, depending on Revolut’s rules).

**Recommended values:**

- Production: `https://satisfecho.de`
- Local: `http://localhost:4202` (or the port you use, e.g. `4200` if not using Docker)

Separate multiple URLs with a comma or semicolon as indicated on the Revolut form.

**What we send as `redirect_url`:**  
The backend builds:

- Success: `{PUBLIC_APP_BASE_URL}/menu/{table_token}/payment-success?order_id={order_id}`
- Cancel: `{PUBLIC_APP_BASE_URL}/menu/{table_token}`

So the base URL (e.g. `https://satisfecho.de`) must be registered. If Revolut validates by path prefix, use e.g. `https://satisfecho.de/menu/` and `http://localhost:4202/menu/`.

### 3. Sandbox certificates (CSR) — required to continue

If the sandbox blocks “Continue” until a CSR is uploaded, you must generate a CSR and upload it so Revolut can issue sandbox certificates (e.g. transport and signing). Follow the steps below.

#### 3.1 Generate a CSR and private key

Run **one** of the following, depending on what Revolut’s page shows.

**Option A — Revolut gives you an exact command**  
Use the exact command from the Revolut sandbox page (including `-subj` and `-outform der`). It may look like:

```bash
openssl req -new -newkey rsa:2048 -nodes -out revolut.csr -keyout private.key \
  -subj '/C=GB/ST=/L=/O=YOUR_ORG_NAME/OU=YOUR_OU/CN=YOUR_CN' \
  -sha256 -outform der
```

Replace `YOUR_ORG_NAME`, `YOUR_OU`, and `YOUR_CN` with the values Revolut specifies (e.g. organisation, organisational unit, and a client/app identifier).

**Option B — Generic command (if Revolut does not give one)**

From a **temporary directory** (not inside the repo, so the private key is never committed):

```bash
mkdir -p ~/revolut-certs && cd ~/revolut-certs
openssl req -new -newkey rsa:2048 -nodes -out revolut.csr -keyout private.key \
  -subj "/C=ES/ST=State/L=City/O=Your Company Name/OU=IT/CN=sandbox-pos" \
  -sha256 -outform der
```

Adjust `-subj` to your details:

- `C` — ISO 3166-1 alpha-2 country (e.g. ES, GB)
- `ST` — State (can be empty)
- `L` — Locality/City
- `O` — Organisation name
- `OU` — Organisational unit (optional)
- `CN` — Common name (e.g. app/sandbox identifier; use Revolut’s value if they provide one)

Revolut often expects the CSR in **DER** format (`-outform der`). If their form asks for PEM, generate again without `-outform der` and upload the `.csr` file they produce.

#### 3.2 Upload the CSR and get certificates

1. In the sandbox, open the **Sandbox certificates** / **CSR** section.
2. Choose **OBIE** or **eIDAS** as required by the form.
3. Upload the generated **`revolut.csr`** file.
4. Submit and download the certificates Revolut returns (e.g. transport and signing).
5. Store them (and the private key) in a **secure location outside the repository** (e.g. `~/revolut-certs/` or a secrets store).  
   **Do not commit `private.key` or the certificate files to git.**

#### 3.3 Use of certificates in this app

For **Merchant API** (checkout extension), we authenticate with the **Merchant API secret** (Bearer token), not with client certificates. The CSR and certificates are needed only to satisfy the sandbox registration flow. After that, use the **Merchant API secret** from the Revolut dashboard for API calls (see “App configuration” below).

If you later integrate **Open Banking** (AISP/PISP/CBPII), the same certificates may be used for those APIs.

---

## App configuration

### Where the Revolut secret is configured

- **Production tenants:** Set **Revolut Merchant API Secret** in **Settings** (UI or API). Each tenant uses their own Revolut Business account; the secret is stored per-tenant in the database.
- **Testing / demo tenants:** Use the **system-wide** fallback so demo and dev don’t need per-tenant setup. Set `REVOLUT_MERCHANT_SECRET` in `config.env`. If a tenant has no Revolut secret in Settings, the backend uses this global value.

The backend uses `tenant.revolut_merchant_secret` when present; otherwise it falls back to `REVOLUT_MERCHANT_SECRET` from the environment. The menu “How do you want to pay?” sheet shows the Revolut option when either the tenant or the global secret is set (so demo tenants work with only the system-wide key).

### Environment / config

Put these in **`config.env`** (copy from `config.env.example` if needed). The file is gitignored; do not commit real secrets.

- **`REVOLUT_MERCHANT_SECRET`** (system-wide fallback for testing/demo only)  
  Used only when a tenant has not set a Revolut secret in Settings. Production tenants should configure their key in **Settings**, not rely on this.  
  Example for local/sandbox:
  ```bash
  REVOLUT_MERCHANT_SECRET=sk_your_sandbox_secret_here
  ```

- **`PUBLIC_APP_BASE_URL`** (required for Revolut redirects)  
  Base URL of the public frontend. Used to build `redirect_url` and `cancel_url` when creating a Revolut order.  
  Examples:
  - Production: `PUBLIC_APP_BASE_URL=https://satisfecho.de`
  - Local: `PUBLIC_APP_BASE_URL=http://localhost:4202`

---

## Flow in this app

1. **Create Revolut order**  
   Customer chooses “Pay with Revolut” on the menu. Frontend calls:
   - `POST /orders/{order_id}/create-revolut-order?table_token=...`  
   Backend calls Revolut “Create order” with amount, currency, `merchant_order_ext_ref`, and optional `redirect_url` / `cancel_url`. Backend stores `revolut_order_id` on the order and returns `checkout_url`.

2. **Customer pays**  
   Frontend redirects the browser to `checkout_url`. Customer completes payment on Revolut’s page.

3. **Redirect back**  
   Revolut redirects the browser to:
   - Success: `{PUBLIC_APP_BASE_URL}/menu/{table_token}/payment-success?order_id={order_id}`
   - Cancel: `{PUBLIC_APP_BASE_URL}/menu/{table_token}`

4. **Confirm payment**  
   On the payment-success page, frontend calls:
   - `POST /orders/{order_id}/confirm-revolut-payment?table_token=...`  
   Backend uses **GET order** with the stored `revolut_order_id` to verify state (e.g. COMPLETED/AUTHORISED/CAPTURED), then marks the order as paid and sets `payment_method = 'revolut'`.

---

## Backend implementation notes

- **Revolut API base:** `https://merchant.revolut.com/api/1.0` (production). Sandbox base URL may differ; check Revolut docs.
- **Revolut API version header:** `Revolut-Api-Version: 2024-05-01` (see `back/app/main.py`).
- **Create order** sends: `amount` (integer, cents), `currency`, `merchant_order_ext_ref` (our order id), and optionally `redirect_url` and `cancel_url`.
- **Response:** we use `id` (or `order_id`) and `checkout_url`; we store the Revolut order id in `Order.revolut_order_id`.

---

## Security

- **Never commit** the Revolut private key (`private.key`), certificate files, or the Merchant API secret.
- Keep `REVOLUT_MERCHANT_SECRET` and per-tenant Revolut secrets in environment or a secrets manager, not in code or in the repo.
- Ensure `config.env` and any file containing the merchant secret are in `.gitignore`.

---

## References

- [Revolut Merchant API — Orders](https://developer.revolut.com/docs/merchant/orders)
- [Revolut Create an order](https://developer.revolut.com/docs/merchant/create-order)
- [Order and payment lifecycle](https://developer.revolut.com/docs/guides/accept-payments/other-resources/order-payment-flow) (if linked from Revolut docs)
