# Kitchen display

**Status:** Shipped / current (reviewed 2026-07-26). Same component powers `/kitchen` and `/bar`.

The **kitchen display** is a dedicated full-screen view for the kitchen: large, readable order cards with auto-refresh and optional sound on new orders.

![Kitchen display — full-screen order cards](screenshots/kitchen.png)

## URL and access

- **URL:** `/kitchen` (e.g. `http://localhost:4202/kitchen`); bar route `/bar` uses the same component with a beverage/station filter.
- **Access:** Same as Orders — authenticated users with order access (owner, admin, kitchen, bartender, waiter, receptionist). Route protected by `authGuard` and `orderAccessGuard`.

## Features

- **Full-screen layout** — No sidebar; header with title, “Back to orders” link, sound toggle, and last-refresh time.
- **Large order cards** — Order #, table name, customer (if any), relative order time; list of items with quantity, name, notes, and item status (pending / preparing / ready / delivered).
- **Read-only (order-level)** — No order-status change controls on the card header; order-level updates stay on the main Orders page (`/orders`). Item status can still be advanced on kitchen/bar when the user has `order:item_status`.
- **Active orders only** — Shows orders whose status is one of: `pending`, `preparing`, `ready`, `partially_delivered`, `paid` — and that still have at least one visible line in `pending` / `preparing` / `ready`. Not shown: `out_for_delivery`, `completed`, `cancelled` (and any other terminal statuses).
- **Auto-refresh** — Polling every 15 seconds plus live updates via WebSocket when order data changes.
- **Optional sound** — Toggle “Sound on” / “Sound off”. When on, a short double beep plays on WebSocket events `new_order` and `items_added`. Preference is stored in `localStorage` (`kitchen-display-sound`).

## Satisfecho Delivery on kitchen / bar

Delivery channel orders appear on `/kitchen` and `/bar` like table orders, with these differences:

- **Table label** — API `table_name` is **`Satisfecho Delivery`** (no physical table; `table_id` is null). See [`docs/0053-satisfecho-delivery-order-channel.md`](0053-satisfecho-delivery-order-channel.md).
- **While prep is open** — Same active filter as above: cards stay until items leave pending/preparing/ready (or the order leaves the active set).
- **After courier pickup** — When the courier marks pickup, order status becomes **`out_for_delivery`**. Kitchen/bar **drop** that order (handoff done); courier track and staff Delivery / courier portal own the rest of the journey.

## Order and item comments (#284)

Optional free-text comments on line items and the whole order (GitHub **#284**). Stored in existing `OrderItem.notes` and `Order.notes`; trimmed and capped at **500** characters (`back/app/order_notes.py`). Comments never block checkout.

| Surface | Behaviour |
|---------|-----------|
| **Public menu** (table / take-away cart) | Per-line **Add comment** toggle + optional order-level notes textarea. Empty comments are omitted. |
| **Staff Orders** (`/orders`) | Same fields visible on order cards; staff can edit item notes (and delivery order notes) when editing an order. |
| **Kitchen / Bar** (`/kitchen`, `/bar`) | Item comments show as a highlighted amber block with a **Comment:** label (full text, no truncation). Order-level notes appear in a matching banner on the card. |

Smoke: `npm run test:order-comments` from `front/` (see `docs/testing.md`). Unit helpers: `back/tests/test_order_notes.py`.

## Navigation

- Sidebar: link **“Kitchen display”** (same nav block as Orders). Opens `/kitchen`.
- From kitchen view: **“Back to orders”** returns to `/orders`.

## i18n

Translation keys under `KITCHEN_DISPLAY.*` and `NAV.KITCHEN_DISPLAY` in `front/public/i18n/` (en, de, es, ca).

## Prep stations (as many displays as you need)

You can run as many prep displays as the restaurant needs. Each product on an order is assigned to one station. That station shows only the lines it must prepare.

Examples:

- A **starters** station has its own display. It shows only starters.
- A **cocktails** station has its own display. It shows only drinks made at the bar.

When a guest or a waiter places an order, each station sees its own products. The rest of the order stays on the other displays.

Set this up under **Settings → Kitchen stations**. Map each product to a station, or use the tenant defaults for unmapped items (food vs beverages). Each order line then includes `kitchen_station_id`, `kitchen_station_name`, and `kitchen_station_route` (`kitchen` | `bar`).

- **Kitchen display** (`/kitchen`) and **Bar display** (`/bar`) show a **Station** filter when at least one station exists for that route. **All stations** shows every line for that display. One station shows only the lines for that station.
- **Bookmark:** open `?station=<id>` for one station. Omit the parameter, or use `all`, to show every station on that display.
- **Printing:** Kitchen and receipt jobs can go to a LAN print agent via `POST /print-jobs` when an agent is online (`docs/0070-hardware-printing.md`). Otherwise browser and invoice print stay the same. A separate printed ticket per station is still a follow-up; see `docs/PRINTING.md`.

## Technical

- **Component:** `front/src/app/kitchen-display/kitchen-display.component.ts`
- **Route:** `app.routes.ts` — `/kitchen` with `authGuard` and `orderAccessGuard`
- **API:** `ApiService.getOrders(false)` and WebSocket `orderUpdates$`; `GET /tenant/kitchen-stations` for the filter; station CRUD and defaults under Settings (owner/admin).
- **Tests:** `front/src/app/kitchen-display/kitchen-display.component.spec.ts`; backend `back/tests/test_kitchen_stations.py` (resolution helpers).
