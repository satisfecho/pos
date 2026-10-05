#!/usr/bin/env python3
"""Merge FEATURE_DETAIL i18n into all front/public/i18n/*.json locale files.

Run from repo root after editing FEATURE_DETAIL content in this script:
  python3 scripts/seed-feature-detail-i18n.py
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
I18N_DIR = ROOT / "front" / "public" / "i18n"

COMMON = {
    "en": {
        "BACK_TO_ALL": "All features",
        "LEARN_MORE": "Learn more",
        "BENEFITS_TITLE": "Why it matters",
        "HOW_TITLE": "How it works",
        "CTA_TITLE": "Ready to get started?",
        "CTA_BODY": "Create your restaurant account and explore this feature in minutes.",
        "NOT_FOUND_TITLE": "Feature not found",
        "NOT_FOUND_BODY": "That feature page does not exist. Browse the full list on the features page.",
    },
    "de": {
        "BACK_TO_ALL": "Alle Funktionen",
        "LEARN_MORE": "Mehr erfahren",
        "BENEFITS_TITLE": "Warum es wichtig ist",
        "HOW_TITLE": "So funktioniert es",
        "CTA_TITLE": "Bereit loszulegen?",
        "CTA_BODY": "Erstellen Sie Ihr Restaurantkonto und testen Sie diese Funktion in wenigen Minuten.",
        "NOT_FOUND_TITLE": "Funktion nicht gefunden",
        "NOT_FOUND_BODY": "Diese Funktionsseite existiert nicht. Sehen Sie sich die vollständige Liste auf der Funktionsseite an.",
    },
    "es": {
        "BACK_TO_ALL": "Todas las funciones",
        "LEARN_MORE": "Más información",
        "BENEFITS_TITLE": "Por qué importa",
        "HOW_TITLE": "Cómo funciona",
        "CTA_TITLE": "¿Listo para empezar?",
        "CTA_BODY": "Cree la cuenta de su restaurante y pruebe esta función en minutos.",
        "NOT_FOUND_TITLE": "Función no encontrada",
        "NOT_FOUND_BODY": "Esa página de función no existe. Consulte la lista completa en la página de funciones.",
    },
}

# Per-slug detail copy (English source). Other locales fall back to English unless listed.
ITEMS_EN: dict[str, dict[str, str]] = {
    "qr-menu": {
        "HERO_TITLE": "QR digital menu",
        "HERO_SUBTITLE": "Give guests a fast mobile menu without installing an app — scan, browse, and order from any phone.",
        "BENEFIT_1": "Update dishes and prices once — every QR link shows the current menu instantly.",
        "BENEFIT_2": "Reduce print costs and reprints when your menu changes seasonally.",
        "BENEFIT_3": "Works alongside table ordering so guests can browse before they order.",
        "HOW_1": "Publish your menu in the product editor with categories, photos, and prices.",
        "HOW_2": "Download or print QR codes that link to your public menu page.",
        "HOW_3": "Guests scan the code and browse on their phone — no login required.",
    },
    "table-ordering": {
        "HERO_TITLE": "Table ordering",
        "HERO_SUBTITLE": "Let guests order from their seat with a table code or QR link — orders flow straight to staff, kitchen, and bar.",
        "BENEFIT_1": "Reduce wait time — guests order when they are ready instead of flagging staff.",
        "BENEFIT_2": "Fewer order mistakes because guests confirm items on their own screen.",
        "BENEFIT_3": "Combine with kitchen and bar displays so tickets arrive in the right place.",
        "HOW_1": "Assign each table a code or QR link in the floor plan.",
        "HOW_2": "Guests open the link, add items to the cart, and submit the order.",
        "HOW_3": "Staff see the order on the dashboard; kitchen and bar get filtered tickets.",
    },
    "takeaway": {
        "HERO_TITLE": "Take away & delivery",
        "HERO_SUBTITLE": "Run collection and home orders from one menu — dedicated take-away flow without mixing dine-in tickets.",
        "BENEFIT_1": "Separate take-away orders from table service on staff screens.",
        "BENEFIT_2": "Offer collection times and notes so the kitchen can plan ahead.",
        "BENEFIT_3": "Extend to home delivery when you enable Satisfecho Delivery or your own process.",
        "HOW_1": "Enable the take-away table or channel in settings.",
        "HOW_2": "Share your public ordering link or QR for guests to order ahead.",
        "HOW_3": "Staff track and complete orders on the orders dashboard.",
    },
    "reservations": {
        "HERO_TITLE": "Online reservations",
        "HERO_SUBTITLE": "Public booking pages with live availability, email confirmations, and optional prepayment — no phone tag for your team.",
        "BENEFIT_1": "Guests book 24/7 from a link you share on your website or social media.",
        "BENEFIT_2": "Optional prepayment via Stripe or Revolut reduces no-shows.",
        "BENEFIT_3": "Staff manage the diary in one place alongside the waiting list.",
        "HOW_1": "Set opening hours, table capacity, and booking rules in settings.",
        "HOW_2": "Share your public booking URL (e.g. /book/your-restaurant).",
        "HOW_3": "Guests pick date, time, and party size; you confirm or adjust in Reservations.",
    },
    "waitlist": {
        "HERO_TITLE": "Waiting list",
        "HERO_SUBTITLE": "When every table is full, let guests join a queue with name, party size, and phone — staff notify when a table is ready.",
        "BENEFIT_1": "Keep walk-ins happy instead of turning them away without a system.",
        "BENEFIT_2": "Estimate wait times and send notifications when a table frees up.",
        "BENEFIT_3": "Works with reservations so front-of-house has one queue view.",
        "HOW_1": "Share your public waitlist link or tablet at the entrance.",
        "HOW_2": "Guests join with party size and contact details.",
        "HOW_3": "Staff seat guests from the Reservations screen when ready.",
    },
    "satisfecho-delivery": {
        "HERO_TITLE": "Satisfecho Delivery",
        "HERO_SUBTITLE": "Guests order delivery online with address, zone-based fees, payment, and live order tracking for staff and couriers.",
        "BENEFIT_1": "Own your delivery channel without a third-party marketplace commission on every order.",
        "BENEFIT_2": "Zone fees and minimum order rules keep delivery profitable.",
        "BENEFIT_3": "Couriers use a dedicated portal; customers track status on a public page.",
        "HOW_1": "Configure delivery zones, fees, and menu availability in settings.",
        "HOW_2": "Guests order at your public delivery URL with address and payment.",
        "HOW_3": "Kitchen prepares; courier picks up; guest tracks until delivered.",
    },
    "payments": {
        "HERO_TITLE": "Online payments",
        "HERO_SUBTITLE": "Accept card payments at the table or when booking — Stripe and Revolut Checkout integrated into guest flows.",
        "BENEFIT_1": "Guests pay when it suits them — at the table or when confirming a reservation.",
        "BENEFIT_2": "Reduce cash handling and speed up table turns.",
        "BENEFIT_3": "Payment status appears on staff orders and reservation records.",
        "HOW_1": "Connect Stripe or Revolut in restaurant settings.",
        "HOW_2": "Enable pay-at-table on QR menus or prepayment on booking pages.",
        "HOW_3": "Guests complete checkout; staff see paid status on the order or booking.",
    },
    "order-comments": {
        "HERO_TITLE": "Order comments",
        "HERO_SUBTITLE": "Guests add notes per item or for the whole order — allergies, spice level, and special requests reach kitchen and bar.",
        "BENEFIT_1": "Fewer mistakes on modifications and allergy requests.",
        "BENEFIT_2": "Comments appear on kitchen, bar, and staff order cards.",
        "BENEFIT_3": "Improves guest satisfaction without extra staff training.",
        "HOW_1": "Guests add item notes or an order-level comment at checkout.",
        "HOW_2": "Tickets show comments prominently on kitchen and bar displays.",
        "HOW_3": "Staff can reference comments when serving or clarifying.",
    },
    "guest-feedback": {
        "HERO_TITLE": "Guest feedback",
        "HERO_SUBTITLE": "Collect ratings and comments after visits — spot issues early and improve service with real guest voices.",
        "BENEFIT_1": "Structured feedback instead of scattered social media reviews.",
        "BENEFIT_2": "Staff and owners see trends in the guest feedback module.",
        "BENEFIT_3": "Share a simple public link after the meal or in confirmation emails.",
        "HOW_1": "Enable guest feedback in settings and share your public feedback URL.",
        "HOW_2": "Guests submit a rating and optional comment.",
        "HOW_3": "Review responses in the staff app and act on recurring themes.",
    },
    "kitchen-display": {
        "HERO_TITLE": "Kitchen Display",
        "HERO_SUBTITLE": "Full-screen kitchen view filtered to main courses and food items — clear tickets, faster prep, less paper.",
        "BENEFIT_1": "Kitchen staff see only food items — no drink tickets cluttering the screen.",
        "BENEFIT_2": "Order comments and modifiers show on each ticket.",
        "BENEFIT_3": "Mark items done to keep front-of-house in sync.",
        "HOW_1": "Open /kitchen on a tablet or wall-mounted screen in the kitchen.",
        "HOW_2": "New orders appear automatically as guests or staff submit them.",
        "HOW_3": "Bump tickets when ready; bar display handles beverages separately.",
    },
    "bar-display": {
        "HERO_TITLE": "Bar Display",
        "HERO_SUBTITLE": "Separate bar screen for beverages and drinks-only tickets — keep bar and kitchen workflows independent.",
        "BENEFIT_1": "Bar staff focus on drinks without food tickets on the same screen.",
        "BENEFIT_2": "Faster drink service during busy periods.",
        "BENEFIT_3": "Same order source — no duplicate entry for staff.",
        "HOW_1": "Open /bar on a bar-facing screen or tablet.",
        "HOW_2": "Drink items from table, take-away, and delivery orders appear here.",
        "HOW_3": "Mark drinks served; kitchen display handles food separately.",
    },
    "order-management": {
        "HERO_TITLE": "Order management",
        "HERO_SUBTITLE": "Staff dashboard to track, update, and complete orders across dine-in, take-away, and delivery.",
        "BENEFIT_1": "One view for all channels — no switching between tools.",
        "BENEFIT_2": "Update status so guests and couriers see progress.",
        "BENEFIT_3": "Filter and search during rush hours.",
        "HOW_1": "Staff open Orders from the main navigation after login.",
        "HOW_2": "New orders appear in real time with channel and table info.",
        "HOW_3": "Update status until complete; kitchen and bar displays stay in sync.",
    },
    "tables": {
        "HERO_TITLE": "Tables & floor plan",
        "HERO_SUBTITLE": "Manage tables, seat counts, and a visual floor canvas — link each table to QR ordering and reservations.",
        "BENEFIT_1": "Visual floor plan helps hosts seat guests and track occupancy.",
        "BENEFIT_2": "Seat counts feed reservation capacity rules.",
        "BENEFIT_3": "Each table can have its own ordering link or code.",
        "HOW_1": "Add tables with names and seat counts in the Tables module.",
        "HOW_2": "Arrange tables on the canvas to match your dining room.",
        "HOW_3": "Connect table codes to QR ordering and reservation assignments.",
    },
    "my-shift": {
        "HERO_TITLE": "My shift & time tracking",
        "HERO_SUBTITLE": "Staff clock in and out to record working hours — simple time tracking built into the staff app.",
        "BENEFIT_1": "Accurate hours for payroll without a separate timeclock system.",
        "BENEFIT_2": "Staff use the same login they already have for orders.",
        "BENEFIT_3": "Owners review hours alongside shift planning.",
        "HOW_1": "Staff open My shift from the navigation when starting work.",
        "HOW_2": "Clock in at shift start and clock out when leaving.",
        "HOW_3": "Managers cross-check hours with the working plan calendar.",
    },
    "products": {
        "HERO_TITLE": "Menu & products",
        "HERO_SUBTITLE": "Manage categories, dishes, prices, images, and modifiers in one menu editor — changes propagate to QR menus and ordering.",
        "BENEFIT_1": "One source of truth for dine-in, take-away, and delivery menus.",
        "BENEFIT_2": "Photos and descriptions improve conversion on public pages.",
        "BENEFIT_3": "Modifiers and options handle sizes, extras, and dietary choices.",
        "HOW_1": "Create categories and products in the Products module.",
        "HOW_2": "Upload images and set prices, availability, and modifiers.",
        "HOW_3": "Public menus and ordering flows use the same catalog automatically.",
    },
    "reports": {
        "HERO_TITLE": "Sales & revenue reports",
        "HERO_SUBTITLE": "Analyze sales, tips, and revenue trends over time — data owners need without exporting to spreadsheets first.",
        "BENEFIT_1": "See daily and weekly performance at a glance.",
        "BENEFIT_2": "Track tips and payment methods for reconciliation.",
        "BENEFIT_3": "Inform staffing and menu decisions with real numbers.",
        "HOW_1": "Owners and admins open Reports from the navigation.",
        "HOW_2": "Pick a date range and review sales summaries.",
        "HOW_3": "Drill into trends to compare periods or channels.",
    },
    "working-plan": {
        "HERO_TITLE": "Shift management",
        "HERO_SUBTITLE": "Plan kitchen, bar, and waiter shifts on a calendar or week view — everyone knows who works when.",
        "BENEFIT_1": "Reduce scheduling conflicts and last-minute confusion.",
        "BENEFIT_2": "Staff see their shifts in the app; managers edit centrally.",
        "BENEFIT_3": "Works alongside My shift time tracking.",
        "HOW_1": "Open Working plan and choose calendar or week view.",
        "HOW_2": "Assign shifts by role and day.",
        "HOW_3": "Staff confirm their schedule in the staff app.",
    },
    "inventory": {
        "HERO_TITLE": "Inventory",
        "HERO_SUBTITLE": "Track stock, suppliers, purchase orders, and inventory reports — know what you have before service.",
        "BENEFIT_1": "Reduce waste by tracking usage and par levels.",
        "BENEFIT_2": "Purchase orders link suppliers to incoming stock.",
        "BENEFIT_3": "Reports help costing and menu pricing decisions.",
        "HOW_1": "Set up inventory items and units in the Inventory module.",
        "HOW_2": "Record receipts and adjustments as stock moves.",
        "HOW_3": "Review reports and create purchase orders when low.",
    },
    "invoicing": {
        "HERO_TITLE": "Invoice customers",
        "HERO_SUBTITLE": "Bill corporate customers and prepare Spain VeriFactu records in test mode — live AEAT filing uses certified middleware when you unlock it.",
        "BENEFIT_1": "Staff billing customers (Factura) integrated with your tenant data.",
        "BENEFIT_2": "VeriFactu preparation: hash chain, QR, and test-mode export — honest about certification status.",
        "BENEFIT_3": "Live filing path via Fiskaly SIGN ES when production credentials are verified — not marketed as certified until then.",
        "HOW_1": "Manage billing customers in the Customers module.",
        "HOW_2": "Issue invoices with line items tied to your catalog.",
        "HOW_3": "Enable VeriFactu test mode in settings; unlock live middleware when ready.",
    },
    "tse": {
        "HERO_TITLE": "German TSE (KassenSichV preparation)",
        "HERO_SUBTITLE": "Optional per-tenant TSE test and live modes with signed transaction stubs, receipt fields, and export preparation — not marketed as BSI-certified until production credentials are verified.",
        "BENEFIT_1": "Prepare for KassenSichV with test-mode signed stubs and receipt metadata.",
        "BENEFIT_2": "DSFinV-K date-range export stub for reconciliation workflows.",
        "BENEFIT_3": "Live mode uses a cloud TSE provider (Fiskaly SIGN DE) when unlocked — certification claims only after verification.",
        "HOW_1": "Enable TSE mode in tenant settings (test first).",
        "HOW_2": "Transactions record TSE fields on receipts in test mode.",
        "HOW_3": "Unlock live provider credentials when ready for production compliance review.",
    },
    "contracts": {
        "HERO_TITLE": "Staff contracts",
        "HERO_SUBTITLE": "Store and manage staff employment contracts and templates — HR paperwork alongside your operational tools.",
        "BENEFIT_1": "Central repository instead of scattered files.",
        "BENEFIT_2": "Templates speed up onboarding for new hires.",
        "BENEFIT_3": "Access controlled by admin roles.",
        "HOW_1": "Upload contract templates in the Contracts module.",
        "HOW_2": "Attach executed contracts to staff records.",
        "HOW_3": "Review and update as employment terms change.",
    },
    "restaurant-groups": {
        "HERO_TITLE": "Restaurant groups",
        "HERO_SUBTITLE": "Link multiple locations with a join code — optionally share customers and products across the group.",
        "BENEFIT_1": "Multi-site brands manage locations from related tenants.",
        "BENEFIT_2": "Shared catalog reduces duplicate menu maintenance.",
        "BENEFIT_3": "Shared customers improve loyalty across venues.",
        "HOW_1": "Create a group and share the join code with sister locations.",
        "HOW_2": "Each tenant accepts the invite in settings.",
        "HOW_3": "Choose which data to share: customers, products, or both.",
    },
    "provider-catalog": {
        "HERO_TITLE": "Provider catalog",
        "HERO_SUBTITLE": "Supplier portal for shared product catalogs — providers manage items restaurants can import.",
        "BENEFIT_1": "Suppliers update catalogs once; many restaurants benefit.",
        "BENEFIT_2": "Restaurants browse and import provider products.",
        "BENEFIT_3": "Separate provider login keeps supplier data isolated.",
        "HOW_1": "Providers register at /provider and maintain their catalog.",
        "HOW_2": "Restaurants browse the provider catalog from the staff app.",
        "HOW_3": "Import items into the local menu with one action.",
    },
    "courier-portal": {
        "HERO_TITLE": "Courier portal",
        "HERO_SUBTITLE": "Delivery staff sign in to view and manage delivery orders — lightweight portal for drivers.",
        "BENEFIT_1": "Couriers see assigned orders without full staff access.",
        "BENEFIT_2": "Update delivery status for guest tracking pages.",
        "BENEFIT_3": "Works with Satisfecho Delivery end-to-end.",
        "HOW_1": "Create courier users with delivery role access.",
        "HOW_2": "Couriers log in at /courier on phone or tablet.",
        "HOW_3": "Pick up orders and mark delivered; guests see live status.",
    },
    "users-roles": {
        "HERO_TITLE": "Users & roles",
        "HERO_SUBTITLE": "Invite staff with role-based access — admin, waiters, kitchen, and custom permissions.",
        "BENEFIT_1": "Least-privilege access: staff see only what their role needs.",
        "BENEFIT_2": "Invite by email; no shared passwords.",
        "BENEFIT_3": "Deactivate users instantly when someone leaves.",
        "HOW_1": "Admins open Users and invite staff by email.",
        "HOW_2": "Assign a role: admin, waiter, kitchen, etc.",
        "HOW_3": "Staff log in and land on the modules their role allows.",
    },
    "settings": {
        "HERO_TITLE": "Settings & branding",
        "HERO_SUBTITLE": "Configure your restaurant, payments, languages, modules, and branding — one control panel for the tenant.",
        "BENEFIT_1": "Enable only the modules you need (reservations, inventory, delivery, etc.).",
        "BENEFIT_2": "Upload logo and header images for public guest pages.",
        "BENEFIT_3": "Connect payment providers and set default language.",
        "HOW_1": "Admins open Settings from the navigation.",
        "HOW_2": "Toggle modules, branding, payments, and fiscal options.",
        "HOW_3": "Changes apply to public pages and staff app immediately.",
    },
    "guided-signup": {
        "HERO_TITLE": "Guided signup",
        "HERO_SUBTITLE": "Multi-step onboarding collects address, starter beverages, optional photos, and a QR for your public menu — live faster.",
        "BENEFIT_1": "New restaurants finish setup without hunting every settings screen.",
        "BENEFIT_2": "Starter menu items get you online on day one.",
        "BENEFIT_3": "QR download at the end of signup for immediate use.",
        "HOW_1": "Register at /register and follow the guided steps.",
        "HOW_2": "Add address, phone, and initial menu items.",
        "HOW_3": "Download your QR and share the public menu link.",
    },
    "saas-paywall": {
        "HERO_TITLE": "SaaS trial & paywall",
        "HERO_SUBTITLE": "Optionally require new restaurants to start a free trial or subscribe before using the staff app — for hosted SaaS operators.",
        "BENEFIT_1": "Free trial without card reduces signup friction.",
        "BENEFIT_2": "Paywall after trial for sustainable hosted pricing.",
        "BENEFIT_3": "Self-hosters under AGPLv3 are unaffected.",
        "HOW_1": "Platform operator enables billing in deployment config.",
        "HOW_2": "New tenants start a trial on registration.",
        "HOW_3": "Subscribe to continue staff access after trial ends.",
    },
    "platform-operator": {
        "HERO_TITLE": "Platform oversight",
        "HERO_SUBTITLE": "SaaS operators view tenant activity, contacts, and public page links from a dedicated platform portal.",
        "BENEFIT_1": "See all tenants on one dashboard.",
        "BENEFIT_2": "Drill into tenant detail for support and sales follow-up.",
        "BENEFIT_3": "Separate platform login — not mixed with restaurant staff.",
        "HOW_1": "Platform admins log in at /platform.",
        "HOW_2": "Browse tenants and open detail views.",
        "HOW_3": "Use public links to verify guest-facing pages.",
    },
    "i18n": {
        "HERO_TITLE": "Multi-language",
        "HERO_SUBTITLE": "Guest and staff UI in multiple languages with per-tenant defaults — serve international guests and teams.",
        "BENEFIT_1": "Guests switch language on public pages.",
        "BENEFIT_2": "Staff use the app in their preferred language.",
        "BENEFIT_3": "Set a default language per restaurant.",
        "HOW_1": "Enable languages in restaurant settings.",
        "HOW_2": "Guests pick language from the picker on public pages.",
        "HOW_3": "Staff change language in the app header.",
    },
    "open-source": {
        "HERO_TITLE": "Open source",
        "HERO_SUBTITLE": "Self-host or run in the cloud under AGPLv3 — inspect, extend, and avoid vendor lock-in.",
        "BENEFIT_1": "Full source access on GitHub.",
        "BENEFIT_2": "Self-host for zero license fees or use hosted Satisfecho.",
        "BENEFIT_3": "Community and commercial support via Amvara.",
        "HOW_1": "Clone the repository and follow README setup.",
        "HOW_2": "Run with Docker Compose on your infrastructure.",
        "HOW_3": "Or register for hosted Satisfecho with managed updates.",
    },
}

LOCALE_FILES = {
    "en": "en.json",
    "de": "de.json",
    "es": "es.json",
    "fr": "fr.json",
    "ca": "ca.json",
    "bg": "bg.json",
    "hi": "hi.json",
    "ur": "ur.json",
    "zh-CN": "zh-CN.json",
}


def build_feature_detail(locale: str) -> dict:
    common = COMMON.get(locale, COMMON["en"])
    items: dict[str, dict[str, str]] = {}
    for slug, en_item in ITEMS_EN.items():
        items[slug] = dict(en_item)
    return {**common, "ITEMS": items}


def main() -> None:
    for locale, filename in LOCALE_FILES.items():
        path = I18N_DIR / filename
        data = json.loads(path.read_text(encoding="utf-8"))
        data["FEATURE_DETAIL"] = build_feature_detail(locale)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Updated {path.name}")


if __name__ == "__main__":
    main()
