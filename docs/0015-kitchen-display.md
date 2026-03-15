# Kitchen display

The **kitchen display** is a dedicated full-screen view for the kitchen: large, readable order cards with auto-refresh and optional sound on new orders.

## URL and access

- **URL:** `/kitchen` (e.g. `http://localhost:4202/kitchen`)
- **Access:** Same as Orders — authenticated users with order access (owner, admin, kitchen, bartender, waiter, receptionist). Route protected by `authGuard` and `orderAccessGuard`.

## Features

- **Full-screen layout** — No sidebar; header with title, “Back to orders” link, sound toggle, and last-refresh time.
- **Large order cards** — Order #, table name, customer (if any), relative order time; list of items with quantity, name, notes, and item status (pending / preparing / ready / delivered).
- **Read-only** — No status change controls; status updates are done from the main Orders page (`/orders`).
- **Active orders only** — Shows orders in status: pending, preparing, ready, partially_delivered. Completed/paid/cancelled are not shown.
- **Auto-refresh** — Polling every 15 seconds plus live updates via WebSocket when order data changes.
- **Optional sound** — Toggle “Sound on” / “Sound off”. When on, a short double beep plays on WebSocket events `new_order` and `items_added`. Preference is stored in `localStorage` (`kitchen-display-sound`).

## Navigation

- Sidebar: link **“Kitchen display”** (same nav block as Orders). Opens `/kitchen`.
- From kitchen view: **“Back to orders”** returns to `/orders`.

## i18n

Translation keys under `KITCHEN_DISPLAY.*` and `NAV.KITCHEN_DISPLAY` in `front/public/i18n/` (en, de, es, ca).

## Technical

- **Component:** `front/src/app/kitchen-display/kitchen-display.component.ts`
- **Route:** `app.routes.ts` — `/kitchen` with `authGuard` and `orderAccessGuard`
- **API:** Uses existing `ApiService.getOrders(false)` and WebSocket `orderUpdates$`
- **Tests:** `front/src/app/kitchen-display/kitchen-display.component.spec.ts`
