# Provider portal – Documentation

This document describes the **provider portal**: registration, login, and catalog management for product providers (suppliers). It is intended for developers and operators.

---

## 1. Overview

**Providers** are suppliers who offer products (e.g. wines, beverages) to the platform. They can:

- **Register** a provider account with company name, full legal name, address, tax number, phone, email, password, and bank details (IBAN, BIC, bank name, account holder).
- **Log in** to a dedicated provider portal (separate from staff/tenant login).
- **Manage their catalog**: list, add, edit, delete their products and upload product images.

Provider users are stored in the same `User` table as tenant staff, but with `tenant_id = NULL` and `provider_id` set. Authentication uses the same cookie-based JWT flow, with the token carrying `provider_id` instead of `tenant_id` when the user is a provider.

---

## 2. URLs and flows

### 2.1 Public URLs (no auth)

| Purpose | URL | Notes |
|--------|-----|------|
| Provider login | `/provider/login` | Email + password; use scope `provider` on token. |
| Provider registration | `/provider/register` | Company name, full legal name, address, tax/VAT, phone, email, password, bank details (account holder, IBAN, BIC, bank name). |

The main **landing page** (`/`) footer includes a link **“Provider portal”** that goes to `/provider/login`.

### 2.2 Protected URL (provider auth required)

| Purpose | URL | Notes |
|--------|-----|------|
| Provider dashboard | `/provider` | Lists provider’s products with tile/list view and search; add/edit/delete, upload image; company details (with toast on save). |

If a user without `provider_id` (or not logged in) opens `/provider`, they are redirected to `/provider/login`.

---

## 3. Backend API

Base path is the same as the rest of the API (e.g. `/api`). All provider-scoped endpoints require a valid JWT that contains `provider_id` (i.e. the user must have logged in with `scope=provider`).

### 3.1 Auth (no provider auth yet)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/register/provider` | Register a new provider. Body: `provider_name`, `email`, `password`, optional `full_name`, `full_company_name`, `address`, `tax_number`, `phone`, `bank_iban`, `bank_bic`, `bank_name`, `bank_account_holder`. Creates `Provider` (with company/bank fields) and first `User` with `role=provider`, `tenant_id=null`, `provider_id` set. |
| `POST` | `/token?scope=provider` | Provider login. Same body as staff login (e.g. `application/x-www-form-urlencoded`: `username`, `password`). Returns cookies (access + refresh) with token payload including `provider_id` (and `tenant_id=null`). |

Logout and refresh use the same endpoints as tenant users (`/logout`, `/refresh`); the backend fills the new token from the current user (tenant or provider).

### 3.2 Provider-scoped endpoints (require provider JWT)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/provider/me` | Current provider info: `id`, `name`, `token`, `url`, `is_active`, and company details (`full_company_name`, `address`, `tax_number`, `phone`, `email`, `bank_iban`, `bank_bic`, `bank_name`, `bank_account_holder`). |
| `PUT` | `/provider/me` | Update provider company/contact details. Body: partial update (same company/bank fields as in GET response, all optional). |
| `GET` | `/provider/catalog` | Catalog items for linking. Query: `search` (optional). Returns list of `{ id, name, category, subcategory }` (e.g. for dropdown when adding a product to an existing catalog item). |
| `GET` | `/provider/products` | List all products for the current provider (with `image_url`, `catalog_name`, etc.). |
| `POST` | `/provider/products` | Create a provider product. Body: see **ProviderProductCreate** below. Can set `catalog_id` to link to an existing catalog item, or omit it and send `name`, `category`, `subcategory`, etc. to create a new catalog item and product. |
| `PUT` | `/provider/products/:id` | Update own product. Body: partial **ProviderProductUpdate** (e.g. `name`, `price_cents`, `availability`). |
| `DELETE` | `/provider/products/:id` | Delete own product. |
| `POST` | `/provider/products/:id/image` | Upload image for the product. Body: multipart form with `file` (image). Same rules as tenant product images (type, size). |

**ProviderProductCreate** (backend: `ProviderProductCreate`):  
`catalog_id` (optional), `name`, `category`, `subcategory`, `description`, `brand`, `barcode`, `external_id`, `price_cents`, `availability`, `country`, `region`, `grape_variety`, `volume_ml`, `unit`, `detailed_description`, `wine_style`, `vintage`, `winery`, `aromas`, `elaboration`.

**ProviderProductUpdate** (backend: `ProviderProductUpdate`):  
Same fields as above, all optional (partial update).

---

## 4. Data model (relevant parts)

- **User**: `provider_id` (optional FK to `Provider`). Provider users have `tenant_id = NULL`, `provider_id` set, `role = provider`.
- **Provider**: `id`, `name`, `token` (unique, used in upload paths), `url`, `api_endpoint`, `is_active`, `created_at`; optional company/contact: `full_company_name`, `address`, `tax_number`, `phone`, `email`, `bank_iban`, `bank_bic`, `bank_name`, `bank_account_holder`.
- **ProviderProduct**: `catalog_id`, `provider_id`, `external_id`, `name`, `price_cents`, `image_filename`, `availability`, and optional wine/product metadata. Images are stored under `uploads/providers/{provider.token}/products/`.
- **ProductCatalog**: Normalized catalog; one record per logical product. A provider product can link to an existing catalog item (`catalog_id`) or create a new one when creating a product without `catalog_id`.

---

## 5. Migration (existing databases)

If the database already existed before this feature, apply the following (SQLModel’s `create_all` does not alter existing tables or enums):

**1. Add `provider_id` column to `user`:**

```sql
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS provider_id INTEGER REFERENCES provider(id);
```

**2. Add `provider` to the `user_role` enum (PostgreSQL):**

```sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'provider';
```

Without step 2, provider registration returns 500 (`invalid input value for enum user_role: "provider"`). Adjust for your DB dialect if needed.

---

## 6. Frontend (Angular)

- **Provider login** (`/provider/login`): Form → `ApiService.login(formData, undefined, 'provider')` → redirect to `/provider`.
- **Provider register** (`/provider/register`): Form → `ApiService.registerProvider(...)` → redirect to `/provider/login` (user then signs in).
- **Provider dashboard** (`/provider`): Guard `providerGuard` ensures `user.provider_id != null`. Loads `/provider/me` and `/provider/products`; supports add product (modal), edit, delete, and image upload via the API above.

The **landing** component links to “Provider portal” in the footer, pointing to `/provider/login`.
