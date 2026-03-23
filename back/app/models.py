from datetime import date, datetime, time, timezone
from enum import Enum
from typing import Any
from uuid import uuid4

from sqlalchemy import Column, Date, DateTime, Enum as SAEnum, Time
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship, SQLModel


# ============ TAX (VAT/IVA) ============


class Tax(SQLModel, table=True):
    """
    Per-tenant tax rates (e.g. IVA 10%, 21%, 0%) with validity period.
    Prices are tax-inclusive; used for invoice breakdown and reporting.
    """
    __tablename__ = "tax"
    id: int | None = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenant.id", index=True)
    name: str = Field(max_length=128)  # e.g. "IVA 10%", "IVA reducido"
    rate_percent: int = Field()  # 0, 10, 21
    valid_from: date = Field(sa_column=Column(Date, nullable=False))
    valid_to: date | None = Field(default=None, sa_column=Column(Date, nullable=True))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TaxCreate(SQLModel):
    """Create a tax rate (e.g. IVA 10%, 21%, 0%)."""
    name: str = Field(max_length=128)
    rate_percent: int = Field(ge=0, le=100)
    valid_from: date
    valid_to: date | None = None


class TaxUpdate(SQLModel):
    """Update tax (e.g. set valid_to when rate changes)."""
    name: str | None = None
    rate_percent: int | None = Field(default=None, ge=0, le=100)
    valid_from: date | None = None
    valid_to: date | None = None


class OrderStatus(str, Enum):
    pending = "pending"
    preparing = "preparing"
    ready = "ready"
    partially_delivered = "partially_delivered"  # Some items delivered, some not
    paid = "paid"
    completed = "completed"
    cancelled = "cancelled"


class BusinessType(str, Enum):
    restaurant = "restaurant"
    bar = "bar"
    cafe = "cafe"
    retail = "retail"
    service = "service"
    other = "other"


class UserRole(str, Enum):
    owner = "owner"
    admin = "admin"
    kitchen = "kitchen"
    bartender = "bartender"  # Prepares drinks and beverages
    waiter = "waiter"
    receptionist = "receptionist"
    provider = "provider"  # Product provider (supplier) – no tenant, has provider_id


class Tenant(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Business Profile Fields
    business_type: BusinessType | None = Field(default=None)
    description: str | None = None
    phone: str | None = None
    whatsapp: str | None = None
    email: str | None = None
    address: str | None = None
    website: str | None = None
    tax_id: str | None = None  # Tax ID / VAT number (e.g. DE123456789)
    cif: str | None = None  # CIF / NIF (Spain: B12345678)
    logo_filename: str | None = None  # Stored in uploads/{tenant_id}/logo/
    header_background_filename: str | None = None  # Stored in uploads/{tenant_id}/header/
    # Public-facing pages (book, menu, reservation view): background color as hex (e.g. #1E22AA for RAL5002 Azul)
    public_background_color: str | None = None
    opening_hours: str | None = (
        None  # JSON string: {"monday": {"open": "09:00", "close": "22:00", "closed": false}, ...}
    )
    immediate_payment_required: bool = Field(
        default=False
    )  # Require immediate payment for orders

    # Currency: store ISO 4217 code internally; frontend derives symbol via Intl.
    # Keep `currency` (symbol) for backward compatibility.
    currency_code: str | None = Field(
        default=None
    )  # ISO 4217, e.g. EUR, USD, MXN, INR, CNY, TWD
    currency: str | None = Field(default=None)  # Legacy symbol (€, $, etc.)

    # Default UI language for this tenant (e.g. en, es, ca, de, zh-CN, hi)
    default_language: str | None = Field(default=None)

    # IANA timezone for this tenant (e.g. America/Mazatlan, Europe/Madrid)
    timezone: str | None = Field(default=None)

    stripe_secret_key: str | None = Field(
        default=None
    )  # Stripe secret key for this tenant
    stripe_publishable_key: str | None = Field(
        default=None
    )  # Stripe publishable key for this tenant

    revolut_merchant_secret: str | None = Field(
        default=None
    )  # Revolut Merchant API secret for this tenant (online payments via Revolut)

    # Inventory Management (commented out - migration not applied)
    # inventory_tracking_enabled: bool = Field(
    #     default=False
    # )  # Enable auto-deduction on orders

    # Location verification for GPS-based order validation
    latitude: float | None = Field(default=None)
    longitude: float | None = Field(default=None)
    location_radius_meters: int = Field(default=100)  # Default 100m radius
    location_check_enabled: bool = Field(default=False)

    # Per-tenant SMTP / email (optional; fallback to global config.env)
    smtp_host: str | None = Field(default=None)
    smtp_port: int | None = Field(default=None)
    smtp_use_tls: bool | None = Field(default=None)
    smtp_user: str | None = Field(default=None)
    smtp_password: str | None = Field(default=None)
    email_from: str | None = Field(default=None)
    email_from_name: str | None = Field(default=None)
    # Reservation confirmation email (plain text with {{placeholders}}; see reservation_email_template.py)
    reservation_confirmation_email_subject: str | None = Field(default=None)
    reservation_confirmation_email_body: str | None = Field(default=None)

    # Working plan: notify owner when staff update the schedule
    working_plan_updated_at: datetime | None = Field(default=None)
    working_plan_owner_seen_at: datetime | None = Field(default=None)

    # Reservation options: pre-payment (discounted on meal), policies, reminders
    reservation_prepayment_cents: int | None = Field(default=None)
    reservation_prepayment_text: str | None = Field(default=None)  # Configurable text for end user
    reservation_cancellation_policy: str | None = Field(default=None)
    reservation_arrival_tolerance_minutes: int | None = Field(default=None)  # e.g. 15
    # Planning: average seated session length; used to free tables for later reservation slots (null = legacy same-day block)
    reservation_average_table_turn_minutes: int | None = Field(default=None)
    # Tables kept out of reservation pool so walk-ins can be seated (smallest tables dropped first from pool)
    reservation_walk_in_tables_reserved: int = Field(default=0)
    reservation_dress_code: str | None = Field(default=None)
    reservation_reminder_24h_enabled: bool = Field(default=False)
    reservation_reminder_2h_enabled: bool = Field(default=False)

    # Public feedback page: optional "Write a review" link (Google Business Profile / Maps)
    public_google_review_url: str | None = Field(default=None, max_length=2048)
    # Public pages: optional Google Maps place or directions URL (Share link from Maps)
    public_google_maps_url: str | None = Field(default=None, max_length=2048)

    # Kitchen/Bar display: wait-time thresholds (minutes) for card color (green -> yellow -> orange -> red)
    kitchen_display_timer_yellow_minutes: int | None = Field(default=5)
    kitchen_display_timer_orange_minutes: int | None = Field(default=10)
    kitchen_display_timer_red_minutes: int | None = Field(default=15)

    # POS checkout: up to 4 tip percentages (e.g. 5,10,15,20); empty list disables tips; null = legacy default in API
    tip_preset_percents: list | None = Field(default=None, sa_column=Column(JSONB, nullable=True))
    # VAT/IVA rate (0–100) applied to tip amount for invoice breakdown (tax-inclusive tip, same basis as menu prices)
    tip_tax_rate_percent: int | None = Field(default=0)

    # Default tax (IVA) applied system-wide when product has no tax override
    default_tax_id: int | None = Field(default=None, foreign_key="tax.id", index=True)

    users: list["User"] = Relationship(back_populates="tenant")


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    full_name: str | None = None
    token_version: int = Field(default=0)  # Increment to invalidate all tokens
    # DB type is user_role (migrations); SQLAlchemy default would be userrole — bind explicitly.
    role: UserRole = Field(
        default=UserRole.waiter,
        sa_column=Column(
            SAEnum(
                UserRole,
                name="user_role",
                native_enum=True,
                create_type=False,
                values_callable=lambda cls: [m.value for m in cls],
            ),
            nullable=False,
        ),
    )

    tenant_id: int | None = Field(default=None, foreign_key="tenant.id")
    tenant: Tenant | None = Relationship(back_populates="users")

    # Provider users: tenant_id is None, provider_id set; they manage provider catalog
    provider_id: int | None = Field(default=None, foreign_key="provider.id", index=True)

    # Optional TOTP (one-time password) for two-factor authentication
    otp_secret: str | None = Field(default=None, exclude=True)  # Never serialized in API responses
    otp_enabled: bool = Field(default=False)


class TenantMixin(SQLModel):
    tenant_id: int = Field(foreign_key="tenant.id")


class Product(TenantMixin, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    price_cents: int
    cost_cents: int | None = None  # Cost price for profit calculation
    description: str | None = None
    image_filename: str | None = None  # Stored in uploads/{tenant_id}/products/
    ingredients: str | None = None  # Comma-separated list
    category: str | None = Field(
        default=None, index=True
    )  # Main category: "Starters", "Main Course", "Desserts", "Beverages", "Sides"
    subcategory: str | None = Field(
        default=None, index=True
    )  # Subcategory: "Red Wine", "Appetizers", etc.
    tax_id: int | None = Field(default=None, foreign_key="tax.id", index=True)  # Override default tax
    # Availability window: customer-facing menu shows product only when today is in [available_from, available_until]
    available_from: date | None = Field(default=None, sa_column=Column(Date, nullable=True))
    available_until: date | None = Field(default=None, sa_column=Column(Date, nullable=True))


class ProductQuestionType(str, Enum):
    """Type of product customization question."""
    choice = "choice"   # Single choice from options (e.g. Rare, Medium, Well done)
    scale = "scale"     # Numeric scale (e.g. spiciness 1-10)
    text = "text"       # Free text (e.g. personal note)


class ProductQuestion(TenantMixin, table=True):
    """
    Optional question/customization attached to a product (e.g. meat doneness, spice level).
    Linked to Product so it applies to both legacy products and products linked from TenantProduct.
    """
    __tablename__ = "product_question"
    id: int | None = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="product.id", index=True)
    type: ProductQuestionType = Field(index=True)
    label: str = Field(max_length=256)  # e.g. "How would you like your meat?"
    # JSON: choice = list of strings OR {"choices": [...], "multi": bool}; scale = {"min", "max"}; text = null
    options: dict | list | None = Field(default=None, sa_column=Column(JSONB, nullable=True))
    sort_order: int = Field(default=0)
    required: bool = Field(default=False)


class ProductQuestionCreate(SQLModel):
    """Create a product customization question."""
    type: ProductQuestionType
    label: str = Field(max_length=256)
    # choice: list of strings; scale: {"min": int, "max": int}; text: omit or null
    options: dict | list | None = None
    sort_order: int = 0
    required: bool = False


class ProductQuestionUpdate(SQLModel):
    """Partial update for a product customization question (staff)."""

    type: ProductQuestionType | None = None
    label: str | None = Field(default=None, max_length=256)
    options: dict | list | None = None
    sort_order: int | None = None
    required: bool | None = None


class ProductQuestionReorder(SQLModel):
    """Set display order for all questions of a product (staff)."""

    question_ids: list[int]


# ============ PROVIDER & CATALOG SYSTEM ============


class Provider(SQLModel, table=True):
    """Product providers (wine suppliers, food distributors, etc.).
    When tenant_id is set, the provider is owned by that tenant (personal provider);
    only that tenant can add products to it. When tenant_id is None, it is a global
    provider (self-registered or platform); only provider users manage its products."""

    id: int | None = Field(default=None, primary_key=True)
    tenant_id: int | None = Field(
        default=None, foreign_key="tenant.id", index=True
    )  # If set, tenant-owned (personal) provider
    name: str = Field(index=True)  # Unique per tenant: (tenant_id, name)
    token: str = Field(
        default_factory=lambda: str(uuid4()), unique=True, index=True
    )  # Unique hash for secure URL access
    url: str | None = None
    api_endpoint: str | None = None
    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Company / contact details (from registration or profile update)
    full_company_name: str | None = None
    address: str | None = None
    tax_number: str | None = None  # VAT ID / tax number
    phone: str | None = None
    email: str | None = None  # Company contact email
    bank_iban: str | None = None
    bank_bic: str | None = None
    bank_name: str | None = None
    bank_account_holder: str | None = None


class ProductCatalog(SQLModel, table=True):
    """
    Normalized product catalog - same product from different providers links here.
    This is the master product list that restaurants browse.
    """

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    description: str | None = None
    category: str | None = Field(index=True)  # e.g., "Wine", "Food", "Beverage"
    subcategory: str | None = Field(index=True)  # e.g., "Red Wine", "Appetizer"
    barcode: str | None = Field(index=True)  # For product matching across providers
    brand: str | None = None
    # Metadata for matching products across providers
    normalized_name: str | None = Field(
        index=True
    )  # Lowercased, normalized for matching
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProviderProduct(SQLModel, table=True):
    """
    Provider-specific product data (prices, images, availability).
    Same ProductCatalog item can have multiple ProviderProduct entries.
    """

    id: int | None = Field(default=None, primary_key=True)
    catalog_id: int = Field(
        foreign_key="productcatalog.id", index=True
    )  # Links to normalized product
    provider_id: int = Field(foreign_key="provider.id", index=True)
    external_id: str = Field(index=True)  # ID from provider's system
    name: str  # Provider's name for this product (may differ from catalog)
    price_cents: int | None = None  # Provider's price
    image_url: str | None = None  # Original remote URL
    image_filename: str | None = (
        None  # Local filename stored in uploads/providers/{provider_id}/products/
    )
    availability: bool = Field(default=True, index=True)
    # Additional provider-specific metadata
    country: str | None = None
    region: str | None = None
    grape_variety: str | None = None  # For wines
    volume_ml: int | None = None  # For beverages
    unit: str | None = None  # e.g., "bottle", "case", "kg"
    wine_category_id: str | None = (
        None  # Category ID from provider API (e.g., "18010" for Red Wine, "18011" for White Wine)
    )
    # Detailed wine information
    detailed_description: str | None = None  # Full detailed description from provider
    wine_style: str | None = None  # e.g., "Afrutados", "Crianza", etc.
    vintage: int | None = None  # Vintage year (anada)
    winery: str | None = None  # Winery/Bodega name
    aromas: str | None = None  # Aromas/flavors (comma-separated)
    elaboration: str | None = None  # Elaboration details (e.g., "Inox", "Barrica")
    # Timestamps for sync
    last_synced_at: datetime | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TenantProduct(SQLModel, table=True):
    """
    Restaurant's selected products with their own pricing.
    Links tenant's Product to ProductCatalog, optionally to a specific ProviderProduct.
    """

    id: int | None = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenant.id", index=True)
    catalog_id: int = Field(foreign_key="productcatalog.id", index=True)
    provider_product_id: int | None = Field(
        default=None, foreign_key="providerproduct.id", index=True
    )
    # Link to existing Product table for backward compatibility
    product_id: int | None = Field(default=None, foreign_key="product.id", index=True)
    # Restaurant's own data
    name: str  # Restaurant can customize the name
    price_cents: int  # Restaurant's selling price (can add markup)
    cost_cents: int | None = None  # Cost price for profit calculation
    image_filename: str | None = None  # Restaurant's own image
    ingredients: str | None = None
    is_active: bool = Field(default=True, index=True)
    tax_id: int | None = Field(default=None, foreign_key="tax.id", index=True)  # Override default tax
    # Availability window: customer-facing menu shows product only when today is in [available_from, available_until]
    available_from: date | None = Field(default=None, sa_column=Column(Date, nullable=True))
    available_until: date | None = Field(default=None, sa_column=Column(Date, nullable=True))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Floor(TenantMixin, table=True):
    """Restaurant floor/zone for canvas layout (e.g., Main Floor, Terrace, VIP)"""

    id: int | None = Field(default=None, primary_key=True)
    name: str  # e.g., "Main Floor", "Terrace"
    sort_order: int = Field(default=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Default waiter for tables on this floor (fallback when table has no explicit assignment)
    default_waiter_id: int | None = Field(default=None, foreign_key="user.id")


class Table(TenantMixin, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str  # e.g., "Table 5"
    token: str = Field(default_factory=lambda: str(uuid4()), unique=True, index=True)
    # Canvas layout properties
    floor_id: int | None = Field(default=None, foreign_key="floor.id")
    x_position: float = Field(default=0)
    y_position: float = Field(default=0)
    rotation: float = Field(default=0)
    shape: str = Field(default="rectangle")  # rectangle, circle, oval
    width: float = Field(default=100)
    height: float = Field(default=60)
    seat_count: int = Field(default=4)

    # Waiter assignment (overrides floor-level default)
    assigned_waiter_id: int | None = Field(default=None, foreign_key="user.id")

    # Table session and PIN security
    order_pin: str | None = Field(default=None)  # 4-digit PIN for ordering
    is_active: bool = Field(default=False, index=True)  # Whether table is accepting orders
    active_order_id: int | None = Field(default=None)  # Current shared order for this table
    activated_at: datetime | None = Field(default=None)  # When table was activated


class Shift(TenantMixin, table=True):
    """Working plan: who is scheduled to work on which date and time slot (kitchen, bar, waiters)."""
    __tablename__ = "shift"
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    shift_date: date = Field(sa_column=Column(Date, nullable=False))
    start_time: time = Field(sa_column=Column(Time, nullable=False))
    end_time: time = Field(sa_column=Column(Time, nullable=False))
    label: str | None = Field(default=None, max_length=64)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WorkSession(TenantMixin, table=True):
    """Recorded clock-in/out times for tenant staff (payroll / attendance); not the planned working plan."""

    __tablename__ = "work_session"
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    started_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    ended_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True), nullable=True))
    start_ip: str | None = Field(default=None, max_length=45)
    end_ip: str | None = Field(default=None, max_length=45)


class ReservationStatus(str, Enum):
    booked = "booked"
    seated = "seated"
    finished = "finished"
    cancelled = "cancelled"
    no_show = "no_show"


class Reservation(TenantMixin, table=True):
    """Table reservation: booked -> (optional) seated at table -> finished or cancelled."""
    __tablename__ = "reservation"
    id: int | None = Field(default=None, primary_key=True)
    customer_name: str
    customer_phone: str
    customer_email: str | None = Field(default=None, index=True)
    reservation_date: date = Field(sa_column=Column(Date, nullable=False))
    reservation_time: time = Field(sa_column=Column(Time, nullable=False))
    party_size: int
    status: ReservationStatus = Field(default=ReservationStatus.booked, index=True)
    table_id: int | None = Field(default=None, foreign_key="table.id")
    seated_at: datetime | None = Field(default=None)  # UTC when staff seated party (turn-time capacity)
    token: str | None = Field(default=None, unique=True, index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # Notes: reservation notes (this visit, e.g. baby stroller); customer profile (e.g. allergies); owner/internal
    client_notes: str | None = Field(default=None)  # Reservation notes (e.g. "We will arrive with a baby stroller")
    customer_notes: str | None = Field(default=None)  # Customer profile notes (e.g. "Allergic to nuts")
    owner_notes: str | None = Field(default=None)
    delay_notice: str | None = Field(default=None)  # Customer-notified delay (e.g. "We will arrive 1 hour late")
    # Client technical info (who created the reservation): IP, user-agent, fingerprint, screen
    client_ip: str | None = Field(default=None, max_length=45)
    client_user_agent: str | None = Field(default=None, max_length=512)
    client_fingerprint: str | None = Field(default=None, max_length=256)
    client_screen_width: int | None = Field(default=None)
    client_screen_height: int | None = Field(default=None)
    # When each reminder was sent (by staff or by heartbeat); null = not sent yet
    reminder_24h_sent_at: datetime | None = Field(default=None)
    reminder_2h_sent_at: datetime | None = Field(default=None)


class GuestFeedback(TenantMixin, table=True):
    """Anonymous guest feedback submitted from the public /feedback/:tenantId page."""

    __tablename__ = "guest_feedback"
    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    rating: int = Field(ge=1, le=5)
    comment: str | None = None
    contact_name: str | None = Field(default=None, max_length=200)
    contact_email: str | None = Field(default=None, max_length=320)
    contact_phone: str | None = Field(default=None, max_length=40)
    reservation_id: int | None = Field(default=None, foreign_key="reservation.id")
    client_ip: str | None = Field(default=None, max_length=45)
    client_user_agent: str | None = Field(default=None, max_length=512)


class BillingCustomer(TenantMixin, table=True):
    """Customer registered for tax invoicing (Factura). Company details for printing invoices."""
    __tablename__ = "billing_customer"
    id: int | None = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenant.id", index=True)
    name: str = Field(index=True)  # Contact or company name
    company_name: str | None = Field(default=None, index=True)  # Legal / company name for invoice
    tax_id: str | None = Field(default=None, index=True)  # CIF / NIF / VAT number
    address: str | None = None
    email: str | None = Field(default=None, index=True)
    phone: str | None = None
    birth_date: date | None = Field(default=None, sa_column=Column(Date, nullable=True))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    orders: list["Order"] = Relationship(back_populates="billing_customer")


class Order(TenantMixin, table=True):
    id: int | None = Field(default=None, primary_key=True)
    table_id: int = Field(foreign_key="table.id")
    status: OrderStatus = Field(default=OrderStatus.pending)
    notes: str | None = None  # General order notes
    session_id: str | None = Field(default=None, index=True)  # Unique session identifier per browser
    customer_name: str | None = Field(default=None, index=True)  # Optional customer name for restaurant staff
    billing_customer_id: int | None = Field(default=None, foreign_key="billing_customer.id", index=True)  # For Factura
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Cancellation tracking
    cancelled_at: datetime | None = None
    cancelled_by: str | None = None  # 'customer' or 'staff'
    
    # Payment tracking
    paid_at: datetime | None = None
    paid_by_user_id: int | None = None  # Who marked it as paid (staff)
    payment_method: str | None = None  # 'stripe', 'cash', 'terminal', 'revolut', etc.
    revolut_order_id: str | None = None  # Revolut Merchant order id when paying via Revolut
    tip_percent_applied: int | None = None  # Preset % charged as tip when staff marked paid (null = no tip)
    tip_amount_cents: int | None = None  # Tip amount in cents (gross; VAT split uses tenant tip_tax_rate_percent)

    # Location verification tracking
    location_verified: bool | None = Field(default=None)  # None=not checked, True=inside, False=outside
    flagged_for_review: bool = Field(default=False)  # Order needs staff attention
    flag_reason: str | None = Field(default=None)  # Why order was flagged

    # Soft delete: exclude from orders list and book-keeping (e.g. test orders)
    deleted_at: datetime | None = Field(default=None)  # When marked as deleted
    deleted_by_user_id: int | None = Field(default=None, foreign_key="user.id")  # Who deleted it

    # Waiter marked urgent — guest is waiting for food (kitchen/bar display)
    staff_urgent: bool = Field(default=False, index=True)
    
    items: list["OrderItem"] = Relationship(back_populates="order")
    billing_customer: BillingCustomer | None = Relationship(back_populates="orders")


class OrderItemStatus(str, Enum):
    pending = "pending"
    preparing = "preparing"
    ready = "ready"
    delivered = "delivered"
    cancelled = "cancelled"


class OrderItem(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="order.id")
    product_id: int = Field(foreign_key="product.id")
    product_name: str  # Snapshot of product name at order time
    quantity: int
    price_cents: int  # Snapshot of price at order time (tax-inclusive)
    cost_cents: int | None = None  # Snapshot of cost at order time for profit
    notes: str | None = None  # Item-specific notes (e.g., "no onions")
    # Structured answers to product questions: {"question_id": value} (value: str for choice/text, int for scale, list[str] for multi choice)
    customization_answers: dict | None = Field(default=None, sa_column=Column(JSONB, nullable=True))
    # Human-readable snapshot at order time: "Q1: A · Q2: B, C" (kitchen / invoices)
    customization_summary: str | None = Field(default=None, max_length=1024)
    # Pizza-style modifiers: {"remove": [...], "add": [...], "substitute": [{"from","to"}, ...]}
    line_modifiers: dict | None = Field(default=None, sa_column=Column(JSONB, nullable=True))
    line_modifiers_summary: str | None = Field(default=None, max_length=1024)
    # Tax snapshot at order time for invoice breakdown
    tax_id: int | None = Field(default=None, foreign_key="tax.id", index=True)
    tax_rate_percent: int | None = None  # e.g. 10, 21, 0
    tax_amount_cents: int | None = None  # Total tax for this line (quantity * unit_tax)
    
    # Item-level status tracking
    status: OrderItemStatus = Field(default=OrderItemStatus.pending, index=True)
    status_updated_at: datetime | None = None
    prepared_by_user_id: int | None = None  # Who marked it as ready
    delivered_by_user_id: int | None = None  # Who delivered it
    
    # Soft delete fields (NEVER actually delete)
    removed_by_customer: bool = Field(default=False, index=True)
    removed_at: datetime | None = None
    removed_reason: str | None = None
    removed_by_user_id: int | None = None  # If removed by staff
    
    # Audit fields for modifications
    modified_by_user_id: int | None = None  # Who modified this item (staff)
    modified_at: datetime | None = None  # When was it modified
    cancelled_reason: str | None = None  # Required when cancelling ready items (for tax authorities)

    # Session tracking and location flagging
    added_by_session: str | None = Field(default=None)  # Which browser session added this item
    location_flagged: bool = Field(default=False)  # Item was added from suspicious location
    
    order: Order = Relationship(back_populates="items")


# Request/Response Models
class UserRegister(SQLModel):
    tenant_name: str
    email: str
    password: str
    full_name: str | None = None


class UserCreate(SQLModel):
    """Model for creating a new user within a tenant (by admin/owner)."""
    email: str
    password: str
    full_name: str | None = None
    role: UserRole = UserRole.waiter


class UserUpdate(SQLModel):
    """Model for updating an existing user."""
    email: str | None = None
    full_name: str | None = None
    role: UserRole | None = None
    password: str | None = None  # Optional: only update if provided


class UserResponse(SQLModel):
    """Model for user response (without sensitive data)."""
    id: int
    email: str
    full_name: str | None = None
    role: UserRole
    tenant_id: int | None = None
    provider_id: int | None = None


class ProductUpdate(SQLModel):
    name: str | None = None
    price_cents: int | None = None
    cost_cents: int | None = None
    ingredients: str | None = None
    category: str | None = None
    subcategory: str | None = None
    tax_id: int | None = None  # Override default tax; null = use tenant default
    available_from: date | None = None
    available_until: date | None = None


class TableCreate(SQLModel):
    name: str
    floor_id: int | None = None


class TableUpdate(SQLModel):
    name: str | None = None
    floor_id: int | None = None
    x_position: float | None = None
    y_position: float | None = None
    rotation: float | None = None
    shape: str | None = None
    width: float | None = None
    height: float | None = None
    seat_count: int | None = None
    assigned_waiter_id: int | None = None


class ReservationCreate(SQLModel):
    customer_name: str
    customer_phone: str
    customer_email: str | None = None
    reservation_date: str  # YYYY-MM-DD
    reservation_time: str  # HH:MM or HH:MM:SS
    party_size: int
    tenant_id: int | None = None  # Required only for public (no auth); staff ignore
    client_notes: str | None = None  # Reservation notes (e.g. baby stroller)
    customer_notes: str | None = None  # Customer profile (e.g. allergies)
    # Optional client technical info (sent by public booking form)
    client_fingerprint: str | None = None
    client_screen_width: int | None = None
    client_screen_height: int | None = None


class ReservationUpdate(SQLModel):
    customer_name: str | None = None
    customer_phone: str | None = None
    customer_email: str | None = None
    reservation_date: str | None = None
    reservation_time: str | None = None
    party_size: int | None = None
    client_notes: str | None = None
    customer_notes: str | None = None
    owner_notes: str | None = None
    delay_notice: str | None = Field(default=None, max_length=500)


class ReservationStatusUpdate(SQLModel):
    status: ReservationStatus


class ReservationSeat(SQLModel):
    table_id: int


class GuestFeedbackCreate(SQLModel):
    """Public POST body for /public/tenants/{id}/guest-feedback."""

    rating: int = Field(ge=1, le=5)
    comment: str | None = None
    contact_name: str | None = Field(default=None, max_length=200)
    contact_email: str | None = Field(default=None, max_length=320)
    contact_phone: str | None = Field(default=None, max_length=40)
    reservation_token: str | None = Field(default=None, max_length=128)


class PublicReservationCreate(SQLModel):
    """Public booking: tenant_id required. Staff use ReservationCreate (no tenant_id)."""
    tenant_id: int
    customer_name: str
    customer_phone: str
    customer_email: str | None = None
    reservation_date: str
    reservation_time: str
    party_size: int
    client_notes: str | None = None
    customer_notes: str | None = None
    client_fingerprint: str | None = None
    client_screen_width: int | None = None
    client_screen_height: int | None = None


class PublicReservationUpdate(SQLModel):
    """Public update by token: delay notice, reservation notes, customer notes (only when status is booked)."""
    delay_notice: str | None = Field(default=None, max_length=500)
    client_notes: str | None = None
    customer_notes: str | None = None


class FloorCreate(SQLModel):
    name: str
    sort_order: int | None = None


class FloorUpdate(SQLModel):
    name: str | None = None
    sort_order: int | None = None
    default_waiter_id: int | None = None


class ShiftCreate(SQLModel):
    user_id: int
    date: str  # YYYY-MM-DD
    start_time: str  # HH:MM or HH:MM:SS
    end_time: str  # HH:MM or HH:MM:SS
    label: str | None = None


class ShiftUpdate(SQLModel):
    user_id: int | None = None
    date: str | None = None  # YYYY-MM-DD
    start_time: str | None = None
    end_time: str | None = None
    label: str | None = None


class OrderItemCreate(SQLModel):
    product_id: int
    quantity: int
    notes: str | None = None
    source: str | None = None  # "tenant_product" or "product" to distinguish between TenantProduct and legacy Product
    # Values: str | int | list[str] (multi-select choice), etc.
    customization_answers: dict[str, Any] | None = None  # {"question_id": value}
    # Structured remove/add/substitute (validated in API); optional extra on top of product questions
    line_modifiers: dict[str, Any] | None = None


class OrderCreate(SQLModel):
    items: list[OrderItemCreate]
    notes: str | None = None
    session_id: str | None = None  # Session identifier for order isolation
    customer_name: str | None = None  # Optional customer name
    pin: str | None = None  # Required PIN for table ordering
    staff_access: str | None = None  # Staff link token: when valid, PIN is not required
    latitude: float | None = None  # Optional GPS latitude for location verification
    longitude: float | None = None  # Optional GPS longitude for location verification


class OrderStatusUpdate(SQLModel):
    status: OrderStatus


class OrderItemStatusUpdate(SQLModel):
    status: OrderItemStatus
    user_id: int | None = None  # Optional: who made the change


class OrderItemRemove(SQLModel):
    reason: str | None = None  # Optional reason for removal


class OrderItemUpdate(SQLModel):
    quantity: int


class OrderItemCancel(SQLModel):
    reason: str  # Required reason when cancelling ready items (for tax authorities)


class OrderMarkPaid(SQLModel):
    payment_method: str = "cash"  # 'cash', 'terminal', 'stripe', etc.
    tip_percent: int | None = None  # 0 or omitted = no tip; otherwise must be in tenant tip_preset_percents


class OrderBillingCustomerSet(SQLModel):
    """Set or clear the billing customer (Factura) for an order."""
    billing_customer_id: int | None = None


class OrderStaffUrgentUpdate(SQLModel):
    """Mark or clear kitchen urgency (guest waiting for food)."""
    urgent: bool


class BillingCustomerCreate(SQLModel):
    name: str
    company_name: str | None = None
    tax_id: str | None = None
    address: str | None = None
    email: str | None = None
    phone: str | None = None
    birth_date: date | None = None


class BillingCustomerUpdate(SQLModel):
    name: str | None = None
    company_name: str | None = None
    tax_id: str | None = None
    address: str | None = None
    email: str | None = None
    phone: str | None = None
    birth_date: date | None = None


class OrderItemStaffUpdate(SQLModel):
    quantity: int | None = None
    notes: str | None = None
    line_modifiers: dict[str, Any] | None = None


class TenantUpdate(SQLModel):
    name: str | None = None
    business_type: BusinessType | None = None
    description: str | None = None
    phone: str | None = None
    whatsapp: str | None = None
    email: str | None = None
    address: str | None = None
    website: str | None = None
    tax_id: str | None = None
    cif: str | None = None
    opening_hours: str | None = None  # JSON string
    immediate_payment_required: bool | None = None

    # Preferred configuration: ISO 4217 currency code.
    currency_code: str | None = None

    # Legacy symbol (still accepted, but currency_code is used for Stripe/formatting).
    currency: str | None = None

    default_language: str | None = None
    timezone: str | None = None

    default_tax_id: int | None = None  # FK to tax.id; system-wide default IVA

    stripe_secret_key: str | None = None
    stripe_publishable_key: str | None = None
    revolut_merchant_secret: str | None = None
    # inventory_tracking_enabled: bool | None = None  # Commented out - migration not applied

    # Location verification settings
    latitude: float | None = None
    longitude: float | None = None
    location_radius_meters: int | None = None
    location_check_enabled: bool | None = None

    # Per-tenant SMTP / email (optional; fallback to global config)
    smtp_host: str | None = None
    smtp_port: int | None = None
    smtp_use_tls: bool | None = None
    smtp_user: str | None = None
    smtp_password: str | None = None
    email_from: str | None = None
    email_from_name: str | None = None
    reservation_confirmation_email_subject: str | None = None
    reservation_confirmation_email_body: str | None = None

    # Public-facing pages background color (hex, e.g. #1E22AA for RAL5002 Azul)
    public_background_color: str | None = None

    # Reservation options (pre-payment, policies, reminders)
    reservation_prepayment_cents: int | None = None
    reservation_prepayment_text: str | None = None
    reservation_cancellation_policy: str | None = None
    reservation_arrival_tolerance_minutes: int | None = None
    reservation_average_table_turn_minutes: int | None = None
    reservation_walk_in_tables_reserved: int | None = None
    reservation_dress_code: str | None = None
    reservation_reminder_24h_enabled: bool | None = None
    reservation_reminder_2h_enabled: bool | None = None

    # Public Google / Maps review link (shown on feedback thank-you page)
    public_google_review_url: str | None = None
    # Google Maps place or directions URL (book, reservation view, feedback)
    public_google_maps_url: str | None = None

    # Kitchen/Bar display timer thresholds (minutes)
    kitchen_display_timer_yellow_minutes: int | None = None
    kitchen_display_timer_orange_minutes: int | None = None
    kitchen_display_timer_red_minutes: int | None = None

    # POS tips: up to 4 percentages (0–100 each); empty list disables tip buttons
    tip_preset_percents: list | None = None
    tip_tax_rate_percent: int | None = Field(default=None, ge=0, le=100)


class TenantProductCreate(SQLModel):
    catalog_id: int
    provider_product_id: int | None = None
    name: str | None = None
    price_cents: int | None = None
    cost_cents: int | None = None
    available_from: date | None = None
    available_until: date | None = None


class ProviderCreate(SQLModel):
    """Body for tenant creating a personal provider (name required; optional contact)."""

    name: str
    url: str | None = None
    full_company_name: str | None = None
    address: str | None = None
    tax_number: str | None = None
    phone: str | None = None
    email: str | None = None


class ProviderRegister(SQLModel):
    """Body for provider self-registration."""
    provider_name: str
    email: str
    password: str
    full_name: str | None = None
    full_company_name: str | None = None
    address: str | None = None
    tax_number: str | None = None
    phone: str | None = None
    bank_iban: str | None = None
    bank_bic: str | None = None
    bank_name: str | None = None
    bank_account_holder: str | None = None


class ProviderUpdate(SQLModel):
    """Body for provider profile update (company details)."""
    full_company_name: str | None = None
    address: str | None = None
    tax_number: str | None = None
    phone: str | None = None
    email: str | None = None
    bank_iban: str | None = None
    bank_bic: str | None = None
    bank_name: str | None = None
    bank_account_holder: str | None = None


class ProviderProductCreate(SQLModel):
    """Create a provider product: link to existing catalog item or create new catalog + product."""
    catalog_id: int | None = None  # If set, link to existing catalog item
    # For new catalog item (when catalog_id is None):
    name: str  # Product name (used for catalog and provider product)
    category: str | None = None
    subcategory: str | None = None
    description: str | None = None
    brand: str | None = None
    barcode: str | None = None
    # Provider product fields
    external_id: str = ""  # Provider's own ID
    price_cents: int | None = None
    availability: bool = True
    country: str | None = None
    region: str | None = None
    grape_variety: str | None = None
    volume_ml: int | None = None
    unit: str | None = None
    detailed_description: str | None = None
    wine_style: str | None = None
    vintage: int | None = None
    winery: str | None = None
    aromas: str | None = None
    elaboration: str | None = None


class ProviderProductUpdate(SQLModel):
    """Partial update for provider product."""
    name: str | None = None
    price_cents: int | None = None
    availability: bool | None = None
    country: str | None = None
    region: str | None = None
    grape_variety: str | None = None
    volume_ml: int | None = None
    unit: str | None = None
    detailed_description: str | None = None
    wine_style: str | None = None
    vintage: int | None = None
    winery: str | None = None
    aromas: str | None = None
    elaboration: str | None = None


class TenantProductUpdate(SQLModel):
    name: str | None = None
    price_cents: int | None = None
    cost_cents: int | None = None
    is_active: bool | None = None
    tax_id: int | None = None  # Override default tax; null = use tenant default
    available_from: date | None = None
    available_until: date | None = None


class I18nText(SQLModel, table=True):
    """Generic translated text storage.

    - `tenant_id` NULL: global/base translations (seeded).
    - `tenant_id` set: tenant overrides.
    """

    id: int | None = Field(default=None, primary_key=True)
    tenant_id: int | None = Field(default=None, foreign_key="tenant.id", index=True)

    entity_type: str = Field(index=True)  # e.g. "tenant", "product", "product_catalog"
    entity_id: int = Field(index=True)
    field: str = Field(index=True)  # e.g. "name", "description"
    lang: str = Field(index=True)  # e.g. "en", "es", "zh-CN"

    text: str
