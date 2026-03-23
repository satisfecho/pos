# Billing Customers (Factura)

## Overview

Restaurants often need to issue **tax invoices (Factura)** to B2B customers or anyone who requires company details on the invoice (e.g. for VAT deduction). This feature lets you:

- **Register billing customers** with company name, tax ID (CIF/NIF/VAT), address, email, and phone.
- **Search** existing customers by name, company, tax ID, or email.
- **Print an invoice (Factura)** for any order with a selected billing customer; the printed document includes a “Bill to” block with the customer’s company details.
- Optionally **link the billing customer to the order** so it is remembered for future prints.

---

## Customers page (`/customers`)

- **Access**: Staff with order access (owner, admin, waiter, receptionist). Write (add/edit/delete) requires `billing_customer:write` (owner, admin, waiter).
- **List**: All billing customers for the tenant, with search by name, company name, tax ID, or email.
- **Add**: “Add customer” opens a form: Name (required), Company name, Tax ID / CIF, Address, Email, Phone, optional **Birth date** (CRM / occasions; not printed on the tax invoice).
- **Edit / Delete**: From the table; delete does not remove the link on orders that already reference the customer (order keeps the saved data).

---

## Print Factura from Orders

- **Where**: On **Orders** (`/orders`), for any order card (Pedidos Activos, Sin Pagar) or from **Historial de Pedidos** (grid: “Print Factura” column).
- **Flow**:
  1. Click **Print Factura** for an order.
  2. A modal opens with the order summary and a **Customer for invoice** dropdown (list of billing customers).
  3. Select a customer (or “None” for a receipt without company block).
  4. Click **Print invoice**. A new window opens with the invoice; if a customer was selected, a **Bill to** block shows company name, tax ID, address, and email. The browser print dialog opens.
  5. If you selected a customer, the order is updated to link that billing customer so next time it is pre-selected.

---

## Backend

- **Model**: `BillingCustomer` (tenant-scoped): `name`, `company_name`, `tax_id`, `address`, `email`, `phone`, optional `birth_date` (date only).
- **Order**: Optional `billing_customer_id`; `GET /orders` includes `billing_customer_id` and nested `billing_customer` when set.
- **Endpoints**:
  - `GET /billing-customers?search=...` — list (with optional search).
  - `POST /billing-customers` — create.
  - `GET /billing-customers/:id` — get one.
  - `PUT /billing-customers/:id` — update.
  - `DELETE /billing-customers/:id` — delete.
  - `PUT /orders/:id/billing-customer` — set or clear `billing_customer_id` (body: `{ "billing_customer_id": number | null }`).
- **Permissions**: `billing_customer:read`, `billing_customer:write` (see `back/app/permissions.py`).
- **Migration**: `back/migrations/20260316140000_add_billing_customer.sql` (creates `billing_customer` table and `order.billing_customer_id`).

---

## i18n

- **CUSTOMERS**: title, add, edit, name, company, tax ID, address, email, phone, search placeholder, loading, none, delete confirm, Print Factura, Select customer for invoice, Bill to.
- **NAV.CUSTOMERS**: “Customers (Factura)” (or equivalent).

Locales: English, Spanish (others can be added following the same keys).
