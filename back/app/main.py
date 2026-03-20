import asyncio
import base64
import hashlib
import hmac
import json
import logging
import os
import time as _time
from datetime import date, timedelta, datetime, time, timezone

import requests
from zoneinfo import ZoneInfo
from io import BytesIO
from pathlib import Path
from typing import Annotated, Dict
from uuid import uuid4

from PIL import Image
import redis
import stripe
from fastapi import BackgroundTasks, Body, Depends, FastAPI, HTTPException, UploadFile, File, status, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse, Response
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel as _BaseModel
from sqlmodel import Session, select

from . import models, security
from .db import check_db_connection, create_db_and_tables, get_session, engine
from .settings import settings
from .inventory_routes import router as inventory_router
from .reports_routes import router as reports_router
from .inventory_service import deduct_inventory_for_order
from . import inventory_models
from .translation_service import TranslationService
from .messages import get_message
from .permissions import Permission, require_permission, require_role, has_permission
from . import email_service as email_svc
from . import whatsapp_service as whatsapp_svc
from .phone_utils import normalize_phone_to_e164

# Rate limiting (slowapi)
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    _SLOWAPI_AVAILABLE = True
except ImportError:
    _SLOWAPI_AVAILABLE = False
    Limiter = None  # type: ignore[misc, assignment]
    RateLimitExceeded = None  # type: ignore[misc, assignment]


def _rate_limit_key(request: Request) -> str:
    """Client IP for rate limiting: X-Forwarded-For (first hop) when behind proxy, else client host."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # First IP is the client when behind a single trusted proxy (e.g. HAProxy)
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def _rate_limit_key_user(request: Request) -> str:
    """Per-user rate limit key when authenticated, else IP (for upload/admin limits)."""
    from . import security

    user_key = security.get_rate_limit_user_key(request)
    return user_key if user_key else _rate_limit_key(request)


def _rate_limit_key_payment_order(request: Request) -> str:
    """Per-order per-IP key for payment attempt limits (e.g. 3/hour per order)."""
    # Path is /orders/{order_id}/create-payment-intent or /orders/{order_id}/confirm-payment
    parts = request.url.path.rstrip("/").split("/")
    order_id = "0"
    for i, p in enumerate(parts):
        if p == "orders" and i + 1 < len(parts) and parts[i + 1].isdigit():
            order_id = parts[i + 1]
            break
    return f"po:{order_id}:{_rate_limit_key(request)}"


def _rate_limit_exceeded_handler_log(request: Request, exc: "RateLimitExceeded"):
    """Log rate limit violations then return 429 (for security monitoring)."""
    logger.warning(
        "Rate limit exceeded: path=%s method=%s client=%s",
        request.url.path,
        request.method,
        _rate_limit_key(request),
    )
    return _rate_limit_exceeded_handler(request, exc)


class _NoOpLimiter:
    """No-op limiter when slowapi is not installed; allows same decorator pattern."""

    @staticmethod
    def limit(*args, **kwargs):
        def decorator(f):
            return f
        return decorator

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Configure Stripe (global fallback - will be overridden by tenant-specific keys)
# Note: stripe.api_key is set globally but individual API calls use api_key parameter
stripe.api_key = settings.stripe_secret_key or ""


def _get_stripe_currency_code(currency_symbol: str | None) -> str | None:
    """
    Map currency symbol to Stripe currency code.
    Returns None if symbol is not recognized.
    """
    if not currency_symbol:
        return None

    # Common currency symbol to Stripe currency code mapping
    currency_map = {
        "€": "eur",
        "$": "usd",
        "£": "gbp",
        "¥": "jpy",
        "₹": "inr",
        "₽": "rub",
        "₩": "krw",
        "₨": "pkr",
        "₦": "ngn",
        "₴": "uah",
        "₫": "vnd",
        "₪": "ils",
        "₡": "crc",
        "₱": "php",
        "₨": "lkr",
        "₦": "ngn",
        "₨": "npr",
        "₨": "mru",
        "MXN": "mxn",
        "mxn": "mxn",
        "EUR": "eur",
        "eur": "eur",
        "USD": "usd",
        "usd": "usd",
        "GBP": "gbp",
        "gbp": "gbp",
    }

    # Try direct lookup
    if currency_symbol in currency_map:
        return currency_map[currency_symbol]

    # Try case-insensitive lookup for 3-letter codes
    currency_upper = currency_symbol.upper()
    if currency_upper in currency_map:
        return currency_map[currency_upper]

    # If it's already a 3-letter code, return as-is (Stripe will validate)
    if len(currency_symbol) == 3:
        return currency_symbol.lower()

    return None


def _get_requested_language(
    lang: str | None = Query(None, description="Language code (e.g. en, es, zh-CN)"),
    accept_language: str | None = Query(
        None, alias="accept-language", description="Accept-Language header"
    ),
) -> str:
    """
    Determine the requested language based on query param or Accept-Language header.
    Returns normalized language code or 'en' as fallback.
    """
    from .language_service import normalize_language_code

    # 1. Check explicit lang query parameter
    if lang:
        normalized = normalize_language_code(lang)
        if normalized:
            return normalized

    # 2. Parse Accept-Language header
    if accept_language:
        # Simple parsing - take the first language with highest quality
        # Format: "en-US,en;q=0.9,es;q=0.8"
        languages = []
        for part in accept_language.split(","):
            lang_part = part.strip().split(";")[0].strip()
            if lang_part:
                normalized = normalize_language_code(lang_part)
                if normalized:
                    languages.append(normalized)

        if languages:
            return languages[0]  # Return highest priority

    # 3. Fallback to English
    return "en"


# Backend always serves the spec at /openapi.json (HAProxy strips /api before forwarding).
# When behind a proxy at ROOT_PATH=/api, Swagger UI must fetch the spec from /api/openapi.json
# so the browser request goes through HAProxy correctly; we pass that via swagger_ui_parameters.
_swagger_ui_params = {"faviconUrl": "/favicon.ico"}
if settings.root_path:
    _swagger_ui_params["url"] = f"{settings.root_path.rstrip('/')}/openapi.json"
app = FastAPI(
    title="POS API",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    root_path=settings.root_path,
    swagger_ui_parameters=_swagger_ui_params,
)

# Parse CORS origins from environment (comma-separated)
cors_origins_list = [
    origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()
]
# Add wildcard for public menu access if not already present
# Add wildcard for public menu access if not already present
# if "*" not in cors_origins_list:
#     cors_origins_list.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiter (global + per-route limits; Redis or in-memory fallback)
if _SLOWAPI_AVAILABLE and Limiter is not None and RateLimitExceeded is not None:
    _rate_limit_storage = (
        settings.rate_limit_redis_url
        or os.getenv("REDIS_URL", "redis://localhost:6379")
    )
    _global_limit = f"{settings.rate_limit_global_per_minute}/minute"
    limiter = Limiter(
        key_func=_rate_limit_key,
        default_limits=[_global_limit],
        storage_uri=_rate_limit_storage,
        enabled=settings.rate_limit_enabled,
        headers_enabled=True,
        swallow_errors=True,
        in_memory_fallback_enabled=True,
        in_memory_fallback=[_global_limit],
    )
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler_log)
else:
    limiter = _NoOpLimiter()

# Uploads directory for product images
UPLOADS_DIR = Path(__file__).parent.parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/avif"}
MAX_IMAGE_SIZE = 2 * 1024 * 1024  # 2MB

# Image optimization settings
MAX_IMAGE_WIDTH = 1920  # Maximum width in pixels
MAX_IMAGE_HEIGHT = 1920  # Maximum height in pixels
JPEG_QUALITY = 85  # JPEG quality (1-100, 85 is a good balance)
PNG_OPTIMIZE = True  # Enable PNG optimization
WEBP_QUALITY = 85  # WebP quality (1-100)
AVIF_QUALITY = 85  # AVIF quality (1-100)

# Static files directory for favicon and other assets
STATIC_DIR = Path(__file__).parent.parent
STATIC_DIR.mkdir(exist_ok=True)

# Serve tenant logos via explicit route so path resolution is reliable (StaticFiles 404 in some setups)
@app.get("/uploads/{tenant_id}/logo/{filename}", include_in_schema=False)
def serve_tenant_logo(tenant_id: int, filename: str):
    """Serve a tenant logo file. Filename must be a single path component (no slashes)."""
    if "/" in filename or "\\" in filename or filename.startswith("."):
        raise HTTPException(status_code=404, detail="Invalid filename")
    path = UPLOADS_DIR / str(tenant_id) / "logo" / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Logo not found")
    media_type = "image/svg+xml" if filename.lower().endswith(".svg") else None
    return FileResponse(path, media_type=media_type)


@app.get("/uploads/{tenant_id}/header/{filename}", include_in_schema=False)
def serve_tenant_header_background(tenant_id: int, filename: str):
    """Serve tenant header background image. Filename must be a single path component (no slashes)."""
    if "/" in filename or "\\" in filename or filename.startswith("."):
        raise HTTPException(status_code=404, detail="Invalid filename")
    path = UPLOADS_DIR / str(tenant_id) / "header" / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Header image not found")
    media_type = "image/svg+xml" if filename.lower().endswith(".svg") else None
    return FileResponse(path, media_type=media_type)


# Serve provider product images via explicit route (StaticFiles often 404s on nested paths behind a proxy)
@app.get("/uploads/providers/{provider_token}/products/{filename}", include_in_schema=False)
def serve_provider_product_image(provider_token: str, filename: str):
    """Serve a provider product image. Filename must be a single path component (no slashes)."""
    if "/" in filename or "\\" in filename or filename.startswith("."):
        raise HTTPException(status_code=404, detail="Invalid filename")
    path = UPLOADS_DIR / "providers" / provider_token / "products" / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path)


# Serve tenant product images (StaticFiles often 404s on nested paths behind a proxy)
@app.get("/uploads/{tenant_id}/products/{filename}", include_in_schema=False)
def serve_tenant_product_image(tenant_id: int, filename: str):
    """Serve a tenant product image. Filename must be a single path component (no slashes)."""
    if "/" in filename or "\\" in filename or filename.startswith("."):
        raise HTTPException(status_code=404, detail="Invalid filename")
    path = UPLOADS_DIR / str(tenant_id) / "products" / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path)


# Mount static files for serving images (fallback for any other uploads paths)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Register Inventory API router
app.include_router(inventory_router, prefix="/inventory", tags=["Inventory"])
# Reports (sales / revenue analysis)
app.include_router(reports_router, prefix="/reports", tags=["Reports"])


# ============ IMAGE OPTIMIZATION ============


def get_file_size(file_path: Path) -> int | None:
    """Get file size in bytes. Returns None if file doesn't exist."""
    try:
        if file_path.exists():
            return file_path.stat().st_size
    except Exception:
        pass
    return None


def format_file_size(size_bytes: int | None) -> str:
    """Format file size in human-readable format."""
    if size_bytes is None:
        return "Unknown"
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f} MB"


def optimize_image(image_data: bytes, content_type: str) -> bytes:
    """
    Optimize image locally using Pillow.
    - Resizes if too large
    - Compresses JPEG/WebP with quality settings
    - Optimizes PNG files
    Returns optimized image data.
    """
    try:
        # Open image from bytes
        image = Image.open(BytesIO(image_data))
        original_format = image.format
        original_size = len(image_data)

        # Convert RGBA to RGB for JPEG (JPEG doesn't support transparency)
        if (
            content_type == "image/jpeg" or original_format == "JPEG"
        ) and image.mode in ("RGBA", "LA", "P"):
            # Create white background
            background = Image.new("RGB", image.size, (255, 255, 255))
            if image.mode == "P":
                image = image.convert("RGBA")
            background.paste(
                image, mask=image.split()[-1] if image.mode == "RGBA" else None
            )
            image = background
        elif image.mode not in ("RGB", "L"):
            image = image.convert("RGB")

        # Resize if image is too large
        width, height = image.size
        if width > MAX_IMAGE_WIDTH or height > MAX_IMAGE_HEIGHT:
            # Calculate new dimensions maintaining aspect ratio
            ratio = min(MAX_IMAGE_WIDTH / width, MAX_IMAGE_HEIGHT / height)
            new_width = int(width * ratio)
            new_height = int(height * ratio)
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            logger.info(f"Image resized: {width}x{height} -> {new_width}x{new_height}")

        # Save optimized image to bytes
        output = BytesIO()

        if content_type == "image/jpeg" or original_format == "JPEG":
            image.save(output, format="JPEG", quality=JPEG_QUALITY, optimize=True)
        elif content_type == "image/webp" or original_format == "WEBP":
            image.save(output, format="WEBP", quality=WEBP_QUALITY, method=6)
        elif content_type == "image/png" or original_format == "PNG":
            # PNG optimization
            image.save(output, format="PNG", optimize=PNG_OPTIMIZE)
        elif content_type == "image/avif" or original_format == "AVIF":
            image.save(output, format="AVIF", quality=AVIF_QUALITY)
        else:
            # Default to JPEG
            image.save(output, format="JPEG", quality=JPEG_QUALITY, optimize=True)

        optimized_data = output.getvalue()
        optimized_size = len(optimized_data)
        reduction = ((original_size - optimized_size) / original_size) * 100

        logger.info(
            f"Image optimized: {original_size / 1024:.1f}KB -> "
            f"{optimized_size / 1024:.1f}KB ({reduction:.1f}% reduction)"
        )

        return optimized_data

    except Exception as e:
        logger.warning(f"Error optimizing image: {e}, using original image")
        return image_data


# Serve favicon for API docs (blue icon to distinguish from frontend)
@app.get("/favicon.ico", include_in_schema=False)
@app.head("/favicon.ico", include_in_schema=False)
async def favicon():
    from fastapi.responses import FileResponse, Response

    favicon_path = STATIC_DIR / "favicon.svg"
    if favicon_path.exists():
        response = FileResponse(
            str(favicon_path),
            media_type="image/svg+xml",
            headers={
                "Cache-Control": "public, max-age=3600",
                "X-Favicon-Source": "backend",
            },
        )
        return response
    raise HTTPException(status_code=404)


# Redis client for pub/sub
redis_client: redis.Redis | None = None


def get_redis() -> redis.Redis | None:
    global redis_client
    if redis_client is None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        try:
            redis_client = redis.from_url(redis_url)
            redis_client.ping()
        except Exception:
            redis_client = None
    return redis_client


PIN_MAX_ATTEMPTS = 5
PIN_ATTEMPT_WINDOW_SECONDS = 600
PIN_LOCKOUT_SECONDS = 600


def get_pin_client_key(request: Request, session_id: str | None) -> str:
    ip = request.client.host if request.client else "unknown"
    if session_id:
        return f"{ip}:{session_id}"
    return ip

def publish_order_update(tenant_id: int, order_data: dict, table_id: int | None = None) -> None:
    """Publish order update to Redis for WebSocket bridge.
    
    Publishes to both:
    - orders:tenant:{tenant_id} - for restaurant owners (all tenant orders)
    - orders:table:{table_id} - for customers (table-specific orders, if table_id provided)
    """
    r = get_redis()
    if r:
        try:
            # Always publish to tenant channel for restaurant owners
            r.publish(f"orders:tenant:{tenant_id}", json.dumps(order_data))
            
            # Also publish to table channel if table_id is provided (for customers)
            if table_id is not None:
                r.publish(f"orders:table:{table_id}", json.dumps(order_data))
        except Exception:
            pass  # Fail silently if Redis unavailable


def publish_reservation_update(tenant_id: int, reservation_data: dict) -> None:
    """Publish reservation update to Redis for WebSocket bridge.
    Channel: reservations:tenant:{tenant_id} (for restaurant owners).
    """
    r = get_redis()
    if r:
        try:
            r.publish(f"reservations:tenant:{tenant_id}", json.dumps(reservation_data))
        except Exception:
            pass  # Fail silently if Redis unavailable


@app.on_event("startup")
async def on_startup() -> None:
    logger.info("Starting application...")
    create_db_and_tables()
    # Run database migrations
    try:
        from .migrate import MigrationRunner
        from pathlib import Path

        migrations_dir = Path(__file__).parent.parent / "migrations"
        runner = MigrationRunner(migrations_dir)
        db_version = runner.run_migrations()
        logger.info(f"Database schema version: {db_version}")
    except Exception as e:
        # Log but don't fail startup - migrations can be run manually
        logger.warning(f"Migration check failed: {e}", exc_info=True)
    # Autonomous reservation reminder heartbeat (no cron needed)
    from .reservation_reminder_heartbeat import reservation_reminder_heartbeat_loop

    stop_heartbeat = asyncio.Event()
    heartbeat_task = asyncio.create_task(reservation_reminder_heartbeat_loop(stop=stop_heartbeat))
    app.state.reservation_reminder_stop = stop_heartbeat
    app.state.reservation_reminder_task = heartbeat_task
    logger.info("Reservation reminder heartbeat started (runs every 5 minutes)")


@app.on_event("shutdown")
async def on_shutdown() -> None:
    """Cancel the reservation reminder heartbeat so it exits cleanly."""
    stop = getattr(app.state, "reservation_reminder_stop", None)
    task = getattr(app.state, "reservation_reminder_task", None)
    if stop:
        stop.set()
    if task and not task.done():
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    logger.info("Reservation reminder heartbeat stopped")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


def _changelog_path() -> Path | None:
    """Resolve CHANGELOG.md: back dir (Docker mount) or project root (local)."""
    base = Path(__file__).resolve().parent.parent  # back/
    for candidate in (base / "CHANGELOG.md", base.parent / "CHANGELOG.md"):
        if candidate.is_file():
            return candidate
    return None


@app.get("/changelog", response_class=PlainTextResponse)
def get_changelog(
    current_user: Annotated[models.User, Depends(security.get_current_user)],
) -> str:
    """Return the project CHANGELOG.md as plain text. Requires authentication."""
    path = _changelog_path()
    if not path:
        raise HTTPException(status_code=404, detail="Changelog not found")
    return path.read_text(encoding="utf-8")


@app.get("/health/db")
def health_db(session: Session = Depends(get_session)) -> dict:
    """Check database connection and version."""
    try:
        check_db_connection()

        # Get database schema version
        try:
            from .migrate import MigrationRunner
            from pathlib import Path

            migrations_dir = Path(__file__).parent.parent / "migrations"
            runner = MigrationRunner(migrations_dir)
            db_version = runner.get_current_version(session)
        except Exception:
            db_version = None

        return {"status": "ok", "database": "connected", "schema_version": db_version}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database error: {e}")


# ============ PUBLIC TENANTS (no auth) ============


class TenantSummary(_BaseModel):
    """Public tenant info for landing page / tenant picker / book page."""

    id: int
    name: str
    logo_filename: str | None = None
    header_background_filename: str | None = None
    description: str | None = None
    phone: str | None = None
    email: str | None = None
    whatsapp: str | None = None
    opening_hours: str | None = None
    public_background_color: str | None = None
    take_away_table_token: str | None = None  # Token for take-away/home ordering if a table is configured
    # Reservation rules (for book page and reservation view)
    reservation_prepayment_cents: int | None = None
    reservation_prepayment_text: str | None = None
    reservation_cancellation_policy: str | None = None
    reservation_arrival_tolerance_minutes: int | None = None
    reservation_dress_code: str | None = None


TAKE_AWAY_TABLE_NAMES = ("take away", "home ordering", "takeaway", "take-away")


def _is_take_away_table(table) -> bool:
    """True if table name indicates take-away/home ordering (no PIN required for ordering)."""
    if not table or not getattr(table, "name", None):
        return False
    return (table.name or "").strip().lower() in TAKE_AWAY_TABLE_NAMES


# Staff menu link: time-limited signed token so staff can open public menu without PIN
STAFF_MENU_TOKEN_EXPIRY = 3600  # 1 hour


def _sign_staff_menu_token(table_token: str) -> str:
    """Produce a signed token for staff to open menu for this table without PIN."""
    expiry = int(_time.time()) + STAFF_MENU_TOKEN_EXPIRY
    payload = f"{table_token}:{expiry}"
    sig = hmac.new(
        settings.secret_key.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return base64.urlsafe_b64encode(f"{payload}".encode("utf-8") + b"." + sig).decode("ascii").rstrip("=")


def _verify_staff_menu_token(table_token: str, token: str) -> bool:
    """Verify staff_access token for this table_token; returns True if valid and not expired."""
    if not token or not table_token:
        return False
    try:
        # Restore padding if stripped
        padded = token + "=" * (4 - len(token) % 4) if len(token) % 4 else token
        raw = base64.urlsafe_b64decode(padded)
        payload_b, _, sig_b = raw.rpartition(b".")
        if not payload_b or not sig_b:
            return False
        payload = payload_b.decode("utf-8")
        tt, exp_str = payload.split(":", 1)
        if tt != table_token:
            return False
        if int(exp_str) < _time.time():
            return False
        expected = hmac.new(
            settings.secret_key.encode("utf-8"),
            payload.encode("utf-8"),
            hashlib.sha256,
        ).digest()
        return hmac.compare_digest(sig_b, expected)
    except Exception:
        return False


def _take_away_table_token(session: Session, tenant_id: int) -> str | None:
    """Return token of the first active table named 'Take away' or 'Home ordering' (case-insensitive) for tenant."""
    tables = session.exec(
        select(models.Table).where(models.Table.tenant_id == tenant_id).where(models.Table.is_active == True)
    ).all()
    for t in tables:
        if _is_take_away_table(t):
            return t.token
    return None


def _tenant_to_summary(t: models.Tenant, session: Session) -> TenantSummary:
    take_away_token = _take_away_table_token(session, t.id)
    return TenantSummary(
        id=t.id,
        name=t.name,
        logo_filename=t.logo_filename,
        header_background_filename=t.header_background_filename,
        description=t.description,
        phone=t.phone,
        email=t.email,
        whatsapp=t.whatsapp,
        opening_hours=t.opening_hours,
        public_background_color=t.public_background_color,
        take_away_table_token=take_away_token,
        reservation_prepayment_cents=t.reservation_prepayment_cents,
        reservation_prepayment_text=t.reservation_prepayment_text,
        reservation_cancellation_policy=t.reservation_cancellation_policy,
        reservation_arrival_tolerance_minutes=t.reservation_arrival_tolerance_minutes,
        reservation_dress_code=t.reservation_dress_code,
    )


@app.get("/public/tenants", response_model=list[TenantSummary])
def list_public_tenants(session: Session = Depends(get_session)) -> list:
    """List all tenants (id, name, logo, description, phone, email). Public, no authentication."""
    tenants = session.exec(select(models.Tenant).order_by(models.Tenant.name)).all()
    return [_tenant_to_summary(t, session) for t in tenants]


@app.get("/public/tenants/{tenant_id}")
def get_public_tenant(
    tenant_id: int,
    session: Session = Depends(get_session),
) -> JSONResponse:
    """Get one tenant's public info for book page (name, logo, phone, email, whatsapp, opening_hours). Public, no authentication."""
    tenant = session.get(models.Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    summary = _tenant_to_summary(tenant, session)
    # Return explicit JSON so whatsapp is always present (same tenant as /tenant/settings)
    body = {
        "id": summary.id,
        "name": summary.name,
        "logo_filename": summary.logo_filename,
        "header_background_filename": summary.header_background_filename,
        "description": summary.description,
        "phone": summary.phone,
        "email": summary.email,
        "whatsapp": summary.whatsapp,
        "opening_hours": summary.opening_hours,
        "public_background_color": summary.public_background_color,
        "take_away_table_token": summary.take_away_table_token,
        "reservation_prepayment_cents": summary.reservation_prepayment_cents,
        "reservation_prepayment_text": summary.reservation_prepayment_text,
        "reservation_cancellation_policy": summary.reservation_cancellation_policy,
        "reservation_arrival_tolerance_minutes": summary.reservation_arrival_tolerance_minutes,
        "reservation_dress_code": summary.reservation_dress_code,
    }
    return JSONResponse(content=body)


# ============ AUTH ============


@app.post("/register")
@limiter.limit(f"{getattr(settings, 'rate_limit_register_per_hour', 3)}/hour")
def register(
    request: Request,
    tenant_name: str,
    email: str,
    password: str,
    full_name: str | None = None,
    lang: str = Depends(_get_requested_language),
    session: Session = Depends(get_session),
) -> dict:
    existing_user = session.exec(
        select(models.User).where(models.User.email == email)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=400, detail=get_message("email_already_registered", lang)
        )

    # Virgin deployment: if exactly one tenant exists and has no users, first registrant becomes its owner
    tenant_count = session.exec(select(models.Tenant)).all()
    user_count = session.exec(select(models.User)).all()
    if len(user_count) == 0 and len(tenant_count) == 1:
        tenant = tenant_count[0]
    else:
        tenant = models.Tenant(name=tenant_name)
        session.add(tenant)
        session.commit()
        session.refresh(tenant)

    hashed_password = security.get_password_hash(password)
    user = models.User(
        email=email,
        hashed_password=hashed_password,
        full_name=full_name,
        tenant_id=tenant.id,
        role=models.UserRole.owner,  # First user of a tenant is always the owner
    )
    session.add(user)
    session.commit()

    return {"status": "created", "tenant_id": tenant.id, "email": email}


@app.post("/register/provider")
@limiter.limit(f"{getattr(settings, 'rate_limit_register_per_hour', 3)}/hour")
def register_provider(
    request: Request,
    body: models.ProviderRegister,
    lang: str = Depends(_get_requested_language),
    session: Session = Depends(get_session),
) -> dict:
    """Provider self-registration: creates Provider and first provider user."""
    existing = session.exec(
        select(models.User).where(models.User.email == body.email)
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=get_message("email_already_registered", lang),
        )
    existing_provider = session.exec(
        select(models.Provider).where(models.Provider.name == body.provider_name)
    ).first()
    if existing_provider:
        raise HTTPException(
            status_code=400,
            detail="Provider name already registered",
        )
    provider = models.Provider(
        name=body.provider_name,
        is_active=True,
        full_company_name=body.full_company_name,
        address=body.address,
        tax_number=body.tax_number,
        phone=body.phone,
        email=body.email,
        bank_iban=body.bank_iban,
        bank_bic=body.bank_bic,
        bank_name=body.bank_name,
        bank_account_holder=body.bank_account_holder,
    )
    session.add(provider)
    session.commit()
    session.refresh(provider)
    hashed_password = security.get_password_hash(body.password)
    user = models.User(
        email=body.email,
        hashed_password=hashed_password,
        full_name=body.full_name,
        tenant_id=None,
        provider_id=provider.id,
        role=models.UserRole.provider,
    )
    session.add(user)
    session.commit()
    return {"status": "created", "provider_id": provider.id, "email": body.email}


def _token_data_for_user(user: models.User) -> dict:
    """Build JWT payload for user (tenant or provider)."""
    return {
        "sub": user.email,
        "tenant_id": user.tenant_id,
        "provider_id": getattr(user, "provider_id", None),
        "token_version": user.token_version,
    }


@app.post("/token")
@limiter.limit(f"{getattr(settings, 'rate_limit_login_per_15min', 5)}/15 minutes")
def login_for_access_token(
    request: Request,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    tenant_id: int | None = Query(None, description="Optional tenant id from tenant picker"),
    scope: str | None = Query(None, description="Login scope: 'provider' for provider portal"),
    lang: str = Depends(_get_requested_language),
    session: Session = Depends(get_session),
) -> dict:
    statement = select(models.User).where(models.User.email == form_data.username)
    if scope == "provider":
        statement = statement.where(
            models.User.provider_id.is_not(None),
            models.User.tenant_id.is_(None),
        )
    elif tenant_id is not None:
        statement = statement.where(models.User.tenant_id == tenant_id)
    user = session.exec(statement).first()

    if not user or not security.verify_password(
        form_data.password, user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=get_message("incorrect_username_or_password", lang),
            headers={"WWW-Authenticate": "Bearer"},
        )

    # If OTP is enabled, require second factor; do not issue tokens yet
    if getattr(user, "otp_enabled", False) and getattr(user, "otp_secret", None):
        token_data = _token_data_for_user(user)
        temp_token = security.create_otp_pending_token(token_data)
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": "OTP required", "require_otp": True, "temp_token": temp_token},
        )

    token_data = _token_data_for_user(user)

    access_token = security.create_access_token(
        data=token_data,
        expires_delta=security.timedelta(minutes=settings.access_token_expire_minutes),
    )
    
    refresh_token = security.create_refresh_token(
        data=token_data,
        expires_delta=security.timedelta(days=settings.refresh_token_expire_days),
    )

    response = JSONResponse(content={"status": "success", "message": "Logged in"})
    
    # Set access token (short-lived, for all paths)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.is_production,  # Only enforce HTTPS in production
        samesite="lax",
        path="/",  # Ensure cookie is sent with all API requests
        max_age=settings.access_token_expire_minutes * 60,
    )
    
    # Set refresh token (long-lived)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path="/",  # Send to all paths so it works with proxy prefixes like /api/refresh
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
    )
    
    return response


class OTPVerifyBody(_BaseModel):
    """Body for POST /token/otp: exchange temp token + OTP code for real tokens."""
    temp_token: str
    code: str


@app.post("/token/otp")
@limiter.limit(f"{getattr(settings, 'rate_limit_login_per_15min', 5)}/15 minutes")
def login_with_otp(
    request: Request,
    body: OTPVerifyBody,
    session: Session = Depends(get_session),
) -> JSONResponse:
    """After password login returned require_otp, submit OTP code to get access and refresh tokens."""
    try:
        payload = security.decode_otp_pending_token(body.temp_token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OTP session. Please log in again.",
        )
    email = payload.get("sub")
    tenant_id = payload.get("tenant_id")
    provider_id = payload.get("provider_id")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    statement = select(models.User).where(models.User.email == email)
    if tenant_id is not None:
        statement = statement.where(models.User.tenant_id == tenant_id)
    elif provider_id is not None:
        statement = statement.where(models.User.provider_id == provider_id)
    else:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = session.exec(statement).first()
    if not user or not getattr(user, "otp_secret", None) or not getattr(user, "otp_enabled", False):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid OTP session")
    import pyotp
    totp = pyotp.TOTP(user.otp_secret)
    if not totp.verify(body.code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OTP code",
        )
    token_data = _token_data_for_user(user)
    access_token = security.create_access_token(
        data=token_data,
        expires_delta=security.timedelta(minutes=settings.access_token_expire_minutes),
    )
    refresh_token = security.create_refresh_token(
        data=token_data,
        expires_delta=security.timedelta(days=settings.refresh_token_expire_days),
    )
    response = JSONResponse(content={"status": "success", "message": "Logged in"})
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path="/",
        max_age=settings.access_token_expire_minutes * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path="/",
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
    )
    return response


@app.post("/logout")
def logout():
    response = JSONResponse(content={"status": "success", "message": "Logged out"})
    # Clear both access and refresh tokens
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return response


@app.post("/refresh")
def refresh_access_token(
    request: Request,
    session: Session = Depends(get_session),
) -> JSONResponse:
    """
    Exchange a valid refresh token for a new access token.
    The refresh token remains valid until it expires or is revoked.
    """
    refresh_token = request.cookies.get("refresh_token")
    
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token provided",
        )
    
    # Validate refresh token and get user
    user = security.validate_refresh_token(refresh_token, session)
    token_data = _token_data_for_user(user)
    
    access_token = security.create_access_token(
        data=token_data,
        expires_delta=security.timedelta(minutes=settings.access_token_expire_minutes),
    )
    
    response = JSONResponse(content={"status": "success", "message": "Token refreshed"})
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path="/",
        max_age=settings.access_token_expire_minutes * 60,
    )
    
    return response


@app.get("/ws-token")
def get_ws_token(
    request: Request,
    current_user: Annotated[models.User, Depends(security.get_current_user)],
) -> dict:
    """Return the current access token for WebSocket auth (query param). Cookie may not be sent on WS upgrade from some origins."""
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No access token")
    return {"access_token": token}


@app.get("/users/me")
def read_users_me(
    current_user: Annotated[models.User, Depends(security.get_current_user)],
) -> models.User:
    return current_user


# ============ USER OTP (optional two-factor) ============


@app.get("/users/me/otp/status")
def get_otp_status(
    current_user: Annotated[models.User, Depends(security.get_current_user)],
) -> dict:
    """Return whether OTP is enabled for the current user (no secret)."""
    return {"otp_enabled": getattr(current_user, "otp_enabled", False)}


class OTPConfirmBody(_BaseModel):
    code: str


@app.post("/users/me/otp/setup")
def otp_setup(
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    session: Session = Depends(get_session),
) -> dict:
    """Generate a new OTP secret and return provisioning URI and secret for QR. OTP is not enabled until confirm is called."""
    import pyotp
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    issuer = "POS"
    label = current_user.email or "user"
    provisioning_uri = totp.provisioning_uri(name=label, issuer_name=issuer)
    # Store secret but do not enable OTP until user confirms with a code
    user = session.get(models.User, current_user.id)
    if user:
        user.otp_secret = secret
        user.otp_enabled = False
        session.add(user)
        session.commit()
    return {"secret": secret, "provisioning_uri": provisioning_uri}


@app.post("/users/me/otp/confirm")
def otp_confirm(
    body: OTPConfirmBody,
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    session: Session = Depends(get_session),
) -> dict:
    """Verify the OTP code and enable OTP for this user."""
    import pyotp
    user = session.get(models.User, current_user.id)
    if not user or not getattr(user, "otp_secret", None):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Run setup first")
    totp = pyotp.TOTP(user.otp_secret)
    if not totp.verify(body.code, valid_window=1):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")
    user.otp_enabled = True
    session.add(user)
    session.commit()
    return {"status": "ok", "otp_enabled": True}


@app.post("/users/me/otp/disable")
def otp_disable(
    body: OTPConfirmBody,
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    session: Session = Depends(get_session),
) -> dict:
    """Verify the OTP code and disable OTP for this user."""
    import pyotp
    user = session.get(models.User, current_user.id)
    if not user or not getattr(user, "otp_secret", None):
        return {"status": "ok", "otp_enabled": False}
    totp = pyotp.TOTP(user.otp_secret)
    if not totp.verify(body.code, valid_window=1):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")
    user.otp_secret = None
    user.otp_enabled = False
    session.add(user)
    session.commit()
    return {"status": "ok", "otp_enabled": False}


# ============ USER MANAGEMENT ============


@app.get("/users")
def list_users(
    current_user: Annotated[models.User, Depends(require_permission(Permission.USER_READ))],
    session: Session = Depends(get_session),
) -> list[models.UserResponse]:
    """List all users in the tenant."""
    users = session.exec(
        select(models.User).where(models.User.tenant_id == current_user.tenant_id)
    ).all()
    return [
        models.UserResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            tenant_id=u.tenant_id,
            provider_id=getattr(u, "provider_id", None),
        )
        for u in users
    ]


@app.post("/users")
def create_user(
    user_data: models.UserCreate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.USER_CREATE))],
    session: Session = Depends(get_session),
) -> models.UserResponse:
    """Create a new user in the tenant."""
    from .permissions import can_manage_user
    
    # Check if current user can create users with the specified role
    if not can_manage_user(current_user, user_data.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cannot create user with role '{user_data.role.value}'"
        )
    
    # Check if email already exists
    existing = session.exec(
        select(models.User).where(models.User.email == user_data.email)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create the user
    new_user = models.User(
        email=user_data.email,
        hashed_password=security.get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role,
        tenant_id=current_user.tenant_id,
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    
    return models.UserResponse(
        id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role,
        tenant_id=new_user.tenant_id,
        provider_id=getattr(new_user, "provider_id", None),
    )


@app.put("/users/{user_id}")
def update_user(
    user_id: int,
    user_data: models.UserUpdate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.USER_UPDATE))],
    session: Session = Depends(get_session),
) -> models.UserResponse:
    """Update a user's details."""
    from .permissions import can_modify_user, can_manage_user
    
    # Get the target user
    target_user = session.exec(
        select(models.User).where(
            models.User.id == user_id,
            models.User.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if current user can modify this user
    if not can_modify_user(current_user, target_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify this user"
        )
    
    # Check if trying to change role
    if user_data.role is not None and user_data.role != target_user.role:
        # Verify can assign this role
        if not can_manage_user(current_user, user_data.role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Cannot assign role '{user_data.role.value}'"
            )
        
        # Prevent owner from demoting themselves
        if current_user.id == target_user.id and current_user.role == models.UserRole.owner:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote yourself from owner role"
            )
        
        target_user.role = user_data.role
    
    # Update other fields
    if user_data.email is not None:
        # Check if email is already taken
        existing = session.exec(
            select(models.User).where(
                models.User.email == user_data.email,
                models.User.id != user_id
            )
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
        target_user.email = user_data.email
    
    if user_data.full_name is not None:
        target_user.full_name = user_data.full_name
    
    if user_data.password is not None:
        target_user.hashed_password = security.get_password_hash(user_data.password)
        # Increment token version to invalidate existing tokens
        target_user.token_version += 1
    
    session.add(target_user)
    session.commit()
    session.refresh(target_user)
    
    return models.UserResponse(
        id=target_user.id,
        email=target_user.email,
        full_name=target_user.full_name,
        role=target_user.role,
        tenant_id=target_user.tenant_id,
        provider_id=getattr(target_user, "provider_id", None),
    )


@app.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.USER_DELETE))],
    session: Session = Depends(get_session),
) -> dict:
    """Delete a user (owner only)."""
    # Get the target user
    target_user = session.exec(
        select(models.User).where(
            models.User.id == user_id,
            models.User.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cannot delete yourself
    if target_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself"
        )
    
    # Cannot delete another owner
    if target_user.role == models.UserRole.owner:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete an owner"
        )
    
    session.delete(target_user)
    session.commit()
    
    return {"message": "User deleted successfully"}


# ============ TRANSLATIONS ============


@app.get("/i18n/{entity_type}/{entity_id}")
def get_translations_for_entity(
    entity_type: str,
    entity_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.TRANSLATION_READ))],
    session: Session = Depends(get_session),
) -> dict:
    """Get all translations for a specific entity."""
    # Validate entity type and ensure user has access
    allowed_types = ["tenant", "product", "tenant_product", "product_catalog"]
    if entity_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid entity type. Allowed: {', '.join(allowed_types)}",
        )

    # Check tenant ownership for tenant-scoped entities
    if entity_type in ["tenant", "product", "tenant_product"]:
        # For tenant entity, entity_id should match current tenant
        if entity_type == "tenant" and entity_id != current_user.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        # For products, check tenant ownership
        elif entity_type == "product":
            product = session.exec(
                select(models.Product).where(models.Product.id == entity_id)
            ).first()
            if not product or product.tenant_id != current_user.tenant_id:
                raise HTTPException(status_code=404, detail="Product not found")
        elif entity_type == "tenant_product":
            tp = session.exec(
                select(models.TenantProduct).where(models.TenantProduct.id == entity_id)
            ).first()
            if not tp or tp.tenant_id != current_user.tenant_id:
                raise HTTPException(status_code=404, detail="Product not found")

    # Get all translations for this entity
    translations = TranslationService.get_all_translations_for_entity(
        session, current_user.tenant_id, entity_type, entity_id
    )

    return {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "translations": translations,
    }


@app.put("/i18n/{entity_type}/{entity_id}")
def update_translations_for_entity(
    entity_type: str,
    entity_id: int,
    translations: Dict[str, Dict[str, str]],  # {field: {lang: text}}
    current_user: Annotated[models.User, Depends(require_permission(Permission.TRANSLATION_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    """Update translations for a specific entity."""
    # Validate entity type
    allowed_types = ["tenant", "product", "tenant_product", "product_catalog"]
    if entity_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid entity type. Allowed: {', '.join(allowed_types)}",
        )

    # Check tenant ownership for tenant-scoped entities
    if entity_type in ["tenant", "product", "tenant_product"]:
        if entity_type == "tenant" and entity_id != current_user.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        elif entity_type == "product":
            product = session.exec(
                select(models.Product).where(models.Product.id == entity_id)
            ).first()
            if not product or product.tenant_id != current_user.tenant_id:
                raise HTTPException(status_code=404, detail="Product not found")
        elif entity_type == "tenant_product":
            tp = session.exec(
                select(models.TenantProduct).where(models.TenantProduct.id == entity_id)
            ).first()
            if not tp or tp.tenant_id != current_user.tenant_id:
                raise HTTPException(status_code=404, detail="Product not found")

    # Update translations
    updated_fields = []
    for field, lang_translations in translations.items():
        for lang, text in lang_translations.items():
            # Skip empty strings (use None to delete)
            if text.strip() == "":
                continue

            TranslationService.set_translation(
                session,
                current_user.tenant_id,
                entity_type,
                entity_id,
                field,
                lang,
                text.strip(),
            )
            updated_fields.append(f"{field}.{lang}")

    session.commit()
    return {
        "message": f"Updated {len(updated_fields)} translations",
        "updated": updated_fields,
    }


# ============ TENANT SETTINGS ============


@app.get("/tenant/settings")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_admin_per_minute', 30)}/minute",
    key_func=_rate_limit_key_user,
)
def get_tenant_settings(
    request: Request,
    response: Response,
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_READ))],
    session: Session = Depends(get_session),
) -> dict:
    """Get tenant/business profile settings."""
    tenant = session.exec(
        select(models.Tenant).where(models.Tenant.id == current_user.tenant_id)
    ).first()

    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Get logo file size if exists
    logo_size = None
    if tenant.logo_filename:
        logo_path = (
            UPLOADS_DIR / str(current_user.tenant_id) / "logo" / tenant.logo_filename
        )
        logo_size = get_file_size(logo_path)

    # Convert tenant to dict and add file size (ensure id is present for client logo URL)
    # Exclude relationship to avoid serialization issues (users list)
    tenant_dict = tenant.model_dump(exclude={"users"})
    tenant_dict["id"] = tenant.id
    tenant_dict["logo_size_bytes"] = logo_size
    tenant_dict["logo_size_formatted"] = format_file_size(logo_size)

    # Don't expose full secret key - only show last 4 characters for verification
    if tenant_dict.get("stripe_secret_key"):
        secret_key = tenant_dict["stripe_secret_key"]
        tenant_dict["stripe_secret_key"] = (
            f"{secret_key[:7]}...{secret_key[-4:]}" if len(secret_key) > 11 else "***"
        )
    if tenant_dict.get("revolut_merchant_secret"):
        sk = tenant_dict["revolut_merchant_secret"]
        tenant_dict["revolut_merchant_secret"] = (
            f"{sk[:7]}...{sk[-4:]}" if len(sk) > 11 else "***"
        )

    # Don't expose SMTP password; indicate if configured
    if tenant_dict.get("smtp_password"):
        tenant_dict["smtp_password"] = "********"

    return tenant_dict


@app.put("/tenant/settings")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_admin_per_minute', 30)}/minute",
    key_func=_rate_limit_key_user,
)
def update_tenant_settings(
    request: Request,
    response: Response,
    tenant_update: models.TenantUpdate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_UPDATE))],
    session: Session = Depends(get_session),
) -> dict:
    """Update tenant/business profile settings."""
    tenant = session.exec(
        select(models.Tenant).where(models.Tenant.id == current_user.tenant_id)
    ).first()

    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Update fields if provided (convert empty strings to None)
    if tenant_update.name is not None:
        tenant.name = (
            tenant_update.name.strip()
            if isinstance(tenant_update.name, str)
            else tenant_update.name
        )
    if tenant_update.business_type is not None:
        tenant.business_type = (
            tenant_update.business_type if tenant_update.business_type else None
        )
    if tenant_update.description is not None:
        tenant.description = (
            tenant_update.description.strip() if tenant_update.description else None
        )
    if tenant_update.phone is not None:
        tenant.phone = tenant_update.phone.strip() if tenant_update.phone else None
    if tenant_update.whatsapp is not None:
        tenant.whatsapp = (
            tenant_update.whatsapp.strip() if tenant_update.whatsapp else None
        )
    if tenant_update.email is not None:
        tenant.email = tenant_update.email.strip() if tenant_update.email else None
    if tenant_update.address is not None:
        tenant.address = (
            tenant_update.address.strip() if tenant_update.address else None
        )
    if tenant_update.website is not None:
        tenant.website = (
            tenant_update.website.strip() if tenant_update.website else None
        )
    if tenant_update.tax_id is not None:
        tenant.tax_id = (
            tenant_update.tax_id.strip() if tenant_update.tax_id else None
        )
    if tenant_update.cif is not None:
        tenant.cif = (
            tenant_update.cif.strip() if tenant_update.cif else None
        )
    if tenant_update.opening_hours is not None:
        tenant.opening_hours = (
            tenant_update.opening_hours.strip() if tenant_update.opening_hours else None
        )
    if tenant_update.immediate_payment_required is not None:
        tenant.immediate_payment_required = tenant_update.immediate_payment_required
    if tenant_update.default_tax_id is not None:
        # Validate tax belongs to tenant
        if tenant_update.default_tax_id:
            tax = session.get(models.Tax, tenant_update.default_tax_id)
            if not tax or tax.tenant_id != current_user.tenant_id:
                raise HTTPException(status_code=400, detail="Invalid default tax")
        tenant.default_tax_id = tenant_update.default_tax_id or None

    if tenant_update.currency_code is not None:
        currency_code = (
            tenant_update.currency_code.strip().upper()
            if isinstance(tenant_update.currency_code, str)
            else None
        )
        if currency_code:
            if len(currency_code) != 3 or not currency_code.isalpha():
                raise HTTPException(
                    status_code=400,
                    detail="currency_code must be a 3-letter ISO code (e.g. EUR)",
                )
            tenant.currency_code = currency_code
        else:
            tenant.currency_code = None

    # Legacy currency symbol (still accepted; not used for Stripe anymore if currency_code is set)
    if tenant_update.currency is not None:
        tenant.currency = (
            tenant_update.currency.strip()
            if isinstance(tenant_update.currency, str)
            and tenant_update.currency.strip()
            else None
        )

    if tenant_update.default_language is not None:
        lang = (
            tenant_update.default_language.strip()
            if isinstance(tenant_update.default_language, str)
            else None
        )
        tenant.default_language = lang or None

    if tenant_update.timezone is not None:
        tz_val = (
            tenant_update.timezone.strip()
            if isinstance(tenant_update.timezone, str)
            else None
        )
        if tz_val:
            try:
                ZoneInfo(tz_val)
            except (KeyError, ValueError):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid timezone: {tz_val}. Use IANA format (e.g. America/Mazatlan)",
                )
            tenant.timezone = tz_val
        else:
            tenant.timezone = None

    if tenant_update.stripe_secret_key is not None:
        # Only update if a non-empty value is provided
        # Empty string or None means don't change the existing value
        if (
            tenant_update.stripe_secret_key
            and isinstance(tenant_update.stripe_secret_key, str)
            and tenant_update.stripe_secret_key.strip()
        ):
            tenant.stripe_secret_key = tenant_update.stripe_secret_key.strip()
        # If empty/None, we don't update (keep existing value)
    if tenant_update.stripe_publishable_key is not None:
        tenant.stripe_publishable_key = (
            tenant_update.stripe_publishable_key.strip()
            if isinstance(tenant_update.stripe_publishable_key, str)
            and tenant_update.stripe_publishable_key.strip()
            else None
        )
    if tenant_update.revolut_merchant_secret is not None:
        if (
            isinstance(tenant_update.revolut_merchant_secret, str)
            and tenant_update.revolut_merchant_secret.strip()
        ):
            tenant.revolut_merchant_secret = tenant_update.revolut_merchant_secret.strip()
        # Empty = don't change (same as Stripe secret)

    # Per-tenant SMTP / email (optional; fallback to global config)
    if tenant_update.smtp_host is not None:
        tenant.smtp_host = (
            tenant_update.smtp_host.strip()
            if isinstance(tenant_update.smtp_host, str) and tenant_update.smtp_host.strip()
            else None
        )
    if tenant_update.smtp_port is not None:
        tenant.smtp_port = tenant_update.smtp_port if tenant_update.smtp_port > 0 else None
    if tenant_update.smtp_use_tls is not None:
        tenant.smtp_use_tls = tenant_update.smtp_use_tls
    if tenant_update.smtp_user is not None:
        tenant.smtp_user = (
            tenant_update.smtp_user.strip()
            if isinstance(tenant_update.smtp_user, str) and tenant_update.smtp_user.strip()
            else None
        )
    if tenant_update.smtp_password is not None and isinstance(tenant_update.smtp_password, str):
        # Only update if non-empty (empty = keep existing)
        if tenant_update.smtp_password.strip():
            tenant.smtp_password = tenant_update.smtp_password.strip()
    if tenant_update.email_from is not None:
        tenant.email_from = (
            tenant_update.email_from.strip()
            if isinstance(tenant_update.email_from, str) and tenant_update.email_from.strip()
            else None
        )
    if tenant_update.email_from_name is not None:
        tenant.email_from_name = (
            tenant_update.email_from_name.strip()
            if isinstance(tenant_update.email_from_name, str)
            and tenant_update.email_from_name.strip()
            else None
        )

    if tenant_update.public_background_color is not None:
        val = (
            tenant_update.public_background_color.strip()
            if isinstance(tenant_update.public_background_color, str)
            else None
        )
        if val:
            if not val.startswith("#"):
                val = "#" + val
            if len(val) <= 20 and all(c in "0123456789abcdefABCDEF#" for c in val):
                tenant.public_background_color = val
            else:
                tenant.public_background_color = None
        else:
            tenant.public_background_color = None

    # Reservation options (pre-payment, policies, reminders)
    if tenant_update.reservation_prepayment_cents is not None:
        v = tenant_update.reservation_prepayment_cents
        tenant.reservation_prepayment_cents = v if v >= 0 else None
    if tenant_update.reservation_prepayment_text is not None:
        tenant.reservation_prepayment_text = (
            tenant_update.reservation_prepayment_text.strip()
            if isinstance(tenant_update.reservation_prepayment_text, str)
            and tenant_update.reservation_prepayment_text.strip()
            else None
        )
    if tenant_update.reservation_cancellation_policy is not None:
        tenant.reservation_cancellation_policy = (
            tenant_update.reservation_cancellation_policy.strip()
            if isinstance(tenant_update.reservation_cancellation_policy, str)
            and tenant_update.reservation_cancellation_policy.strip()
            else None
        )
    if tenant_update.reservation_arrival_tolerance_minutes is not None:
        v = tenant_update.reservation_arrival_tolerance_minutes
        tenant.reservation_arrival_tolerance_minutes = v if v >= 0 else None
    if tenant_update.reservation_dress_code is not None:
        tenant.reservation_dress_code = (
            tenant_update.reservation_dress_code.strip()
            if isinstance(tenant_update.reservation_dress_code, str)
            and tenant_update.reservation_dress_code.strip()
            else None
        )
    if tenant_update.reservation_reminder_24h_enabled is not None:
        tenant.reservation_reminder_24h_enabled = tenant_update.reservation_reminder_24h_enabled
    if tenant_update.reservation_reminder_2h_enabled is not None:
        tenant.reservation_reminder_2h_enabled = tenant_update.reservation_reminder_2h_enabled

    # Kitchen/Bar display timer thresholds (minutes)
    if tenant_update.kitchen_display_timer_yellow_minutes is not None:
        tenant.kitchen_display_timer_yellow_minutes = max(0, tenant_update.kitchen_display_timer_yellow_minutes)
    if tenant_update.kitchen_display_timer_orange_minutes is not None:
        tenant.kitchen_display_timer_orange_minutes = max(0, tenant_update.kitchen_display_timer_orange_minutes)
    if tenant_update.kitchen_display_timer_red_minutes is not None:
        tenant.kitchen_display_timer_red_minutes = max(0, tenant_update.kitchen_display_timer_red_minutes)

    session.add(tenant)
    session.commit()
    session.refresh(tenant)

    # Get logo file size if exists
    logo_size = None
    if tenant.logo_filename:
        logo_path = (
            UPLOADS_DIR / str(current_user.tenant_id) / "logo" / tenant.logo_filename
        )
        logo_size = get_file_size(logo_path)

    # Convert tenant to dict and add file size (ensure id for client logo URL)
    # Exclude relationship to avoid serialization issues (users list)
    tenant_dict = tenant.model_dump(exclude={"users"})
    tenant_dict["id"] = tenant.id
    tenant_dict["logo_size_bytes"] = logo_size
    tenant_dict["logo_size_formatted"] = format_file_size(logo_size)

    # Don't expose full secret key - only show last 4 characters for verification
    if tenant_dict.get("stripe_secret_key"):
        secret_key = tenant_dict["stripe_secret_key"]
        tenant_dict["stripe_secret_key"] = (
            f"{secret_key[:7]}...{secret_key[-4:]}" if len(secret_key) > 11 else "***"
        )
    if tenant_dict.get("revolut_merchant_secret"):
        sk = tenant_dict["revolut_merchant_secret"]
        tenant_dict["revolut_merchant_secret"] = (
            f"{sk[:7]}...{sk[-4:]}" if len(sk) > 11 else "***"
        )

    # Don't expose SMTP password; indicate if configured
    if tenant_dict.get("smtp_password"):
        tenant_dict["smtp_password"] = "********"

    return tenant_dict


# Kitchen/Bar display timer settings (read/update by anyone with order access)
@app.get("/tenant/kitchen-display-settings")
def get_kitchen_display_settings(
    current_user: Annotated[models.User, Depends(require_permission(Permission.ORDER_READ))],
    session: Session = Depends(get_session),
) -> dict:
    """Get kitchen/bar display timer thresholds (minutes). Used for wait-time card colors."""
    tenant = session.exec(
        select(models.Tenant).where(models.Tenant.id == current_user.tenant_id)
    ).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return {
        "yellow_minutes": tenant.kitchen_display_timer_yellow_minutes if tenant.kitchen_display_timer_yellow_minutes is not None else 5,
        "orange_minutes": tenant.kitchen_display_timer_orange_minutes if tenant.kitchen_display_timer_orange_minutes is not None else 10,
        "red_minutes": tenant.kitchen_display_timer_red_minutes if tenant.kitchen_display_timer_red_minutes is not None else 15,
    }


@app.put("/tenant/kitchen-display-settings")
def update_kitchen_display_settings(
    body: dict,
    current_user: Annotated[models.User, Depends(require_permission(Permission.ORDER_READ))],
    session: Session = Depends(get_session),
) -> dict:
    """Update kitchen/bar display timer thresholds (minutes)."""
    tenant = session.exec(
        select(models.Tenant).where(models.Tenant.id == current_user.tenant_id)
    ).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    yellow = body.get("yellow_minutes")
    orange = body.get("orange_minutes")
    red = body.get("red_minutes")
    if yellow is not None:
        tenant.kitchen_display_timer_yellow_minutes = max(0, int(yellow))
    if orange is not None:
        tenant.kitchen_display_timer_orange_minutes = max(0, int(orange))
    if red is not None:
        tenant.kitchen_display_timer_red_minutes = max(0, int(red))
    session.add(tenant)
    session.commit()
    session.refresh(tenant)
    return {
        "yellow_minutes": tenant.kitchen_display_timer_yellow_minutes or 5,
        "orange_minutes": tenant.kitchen_display_timer_orange_minutes or 10,
        "red_minutes": tenant.kitchen_display_timer_red_minutes or 15,
    }


# ============ TAXES (IVA) ============


@app.get("/taxes")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_admin_per_minute', 30)}/minute",
    key_func=_rate_limit_key_user,
)
def list_taxes(
    request: Request,
    response: Response,
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_READ))],
    session: Session = Depends(get_session),
    current_only: bool = Query(True, description="If true, only return taxes valid today"),
) -> list[dict]:
    """List taxes for the current tenant. Optionally filter to those valid today."""
    query = select(models.Tax).where(models.Tax.tenant_id == current_user.tenant_id)
    if current_only:
        today = date.today()
        query = query.where(models.Tax.valid_from <= today).where(
            (models.Tax.valid_to.is_(None)) | (models.Tax.valid_to >= today)
        )
    taxes = session.exec(query.order_by(models.Tax.valid_from.desc())).all()
    return [
        {
            "id": t.id,
            "tenant_id": t.tenant_id,
            "name": t.name,
            "rate_percent": t.rate_percent,
            "valid_from": t.valid_from.isoformat() if t.valid_from else None,
            "valid_to": t.valid_to.isoformat() if t.valid_to else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in taxes
    ]


@app.post("/taxes")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_admin_per_minute', 30)}/minute",
    key_func=_rate_limit_key_user,
)
def create_tax(
    request: Request,
    response: Response,
    data: models.TaxCreate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_UPDATE))],
    session: Session = Depends(get_session),
) -> dict:
    """Create a tax rate for the tenant."""
    if data.valid_to is not None and data.valid_from > data.valid_to:
        raise HTTPException(status_code=400, detail="valid_from must be before valid_to")
    tax = models.Tax(
        tenant_id=current_user.tenant_id,
        name=data.name,
        rate_percent=data.rate_percent,
        valid_from=data.valid_from,
        valid_to=data.valid_to,
    )
    session.add(tax)
    session.commit()
    session.refresh(tax)
    return {
        "id": tax.id,
        "tenant_id": tax.tenant_id,
        "name": tax.name,
        "rate_percent": tax.rate_percent,
        "valid_from": tax.valid_from.isoformat(),
        "valid_to": tax.valid_to.isoformat() if tax.valid_to else None,
        "created_at": tax.created_at.isoformat() if tax.created_at else None,
    }


@app.put("/taxes/{tax_id}")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_admin_per_minute', 30)}/minute",
    key_func=_rate_limit_key_user,
)
def update_tax(
    request: Request,
    response: Response,
    tax_id: int,
    data: models.TaxUpdate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_UPDATE))],
    session: Session = Depends(get_session),
) -> dict:
    """Update a tax (e.g. set valid_to when rate changes)."""
    tax = session.exec(
        select(models.Tax).where(
            models.Tax.id == tax_id,
            models.Tax.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not tax:
        raise HTTPException(status_code=404, detail="Tax not found")
    if data.name is not None:
        tax.name = data.name
    if data.rate_percent is not None:
        tax.rate_percent = data.rate_percent
    if data.valid_from is not None:
        tax.valid_from = data.valid_from
    if data.valid_to is not None:
        tax.valid_to = data.valid_to
    if tax.valid_to is not None and tax.valid_from > tax.valid_to:
        raise HTTPException(status_code=400, detail="valid_from must be before valid_to")
    session.add(tax)
    session.commit()
    session.refresh(tax)
    return {
        "id": tax.id,
        "tenant_id": tax.tenant_id,
        "name": tax.name,
        "rate_percent": tax.rate_percent,
        "valid_from": tax.valid_from.isoformat(),
        "valid_to": tax.valid_to.isoformat() if tax.valid_to else None,
        "created_at": tax.created_at.isoformat() if tax.created_at else None,
    }


@app.delete("/taxes/{tax_id}")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_admin_per_minute', 30)}/minute",
    key_func=_rate_limit_key_user,
)
def delete_tax(
    request: Request,
    response: Response,
    tax_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_UPDATE))],
    session: Session = Depends(get_session),
) -> dict:
    """Delete a tax. Fails if it is the tenant default or used by products."""
    tax = session.exec(
        select(models.Tax).where(
            models.Tax.id == tax_id,
            models.Tax.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not tax:
        raise HTTPException(status_code=404, detail="Tax not found")
    tenant = session.get(models.Tenant, current_user.tenant_id)
    if tenant and getattr(tenant, "default_tax_id", None) == tax_id:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete the default tax. Set another tax as default first.",
        )
    session.delete(tax)
    session.commit()
    return {"status": "deleted", "id": tax_id}


def _infer_content_type_from_filename(filename: str | None) -> str | None:
    """Infer image content type from file extension when client does not send Content-Type."""
    if not filename:
        return None
    ext = Path(filename).suffix.lower()
    mapping = {
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".avif": "image/avif",
    }
    return mapping.get(ext)


@app.post("/tenant/logo")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_upload_per_hour', 10)}/hour",
    key_func=_rate_limit_key_user,
)
async def upload_tenant_logo(
    request: Request,
    response: Response,
    file: Annotated[UploadFile, File()],
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_UPDATE))],
    session: Session = Depends(get_session),
) -> dict:
    """Upload a logo for the tenant/business."""
    tenant = session.exec(
        select(models.Tenant).where(models.Tenant.id == current_user.tenant_id)
    ).first()

    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Validate content type (logo allows SVG in addition to raster images)
    # Some clients do not send Content-Type for multipart file; infer from filename
    allowed_logo_types = ALLOWED_IMAGE_TYPES | {"image/svg+xml"}
    content_type = file.content_type or _infer_content_type_from_filename(file.filename)
    if content_type not in allowed_logo_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(sorted(allowed_logo_types))}",
        )

    # Read file and check size
    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {MAX_IMAGE_SIZE // (1024 * 1024)}MB",
        )

    is_svg = content_type == "image/svg+xml"
    if not is_svg:
        # Optimize raster image locally (SVG is stored as-is)
        contents = optimize_image(contents, content_type)

    # Create tenant logo directory
    tenant_dir = UPLOADS_DIR / str(current_user.tenant_id) / "logo"
    tenant_dir.mkdir(parents=True, exist_ok=True)

    # Delete old logo if exists
    if tenant.logo_filename:
        old_path = tenant_dir / tenant.logo_filename
        if old_path.exists():
            old_path.unlink()

    # Generate unique filename
    ext = Path(file.filename or ("logo.svg" if is_svg else "logo.jpg")).suffix.lower()
    if is_svg:
        if ext != ".svg":
            ext = ".svg"
    elif ext not in [".jpg", ".jpeg", ".png", ".webp", ".avif"]:
        ext = ".jpg"
    new_filename = f"{uuid4()}{ext}"

    # Save file
    file_path = tenant_dir / new_filename
    file_path.write_bytes(contents)

    # Update tenant
    tenant.logo_filename = new_filename
    session.add(tenant)
    session.commit()
    session.refresh(tenant)

    # Get file size for response (ensure id for client logo URL)
    # Exclude relationship to avoid serialization issues (users list)
    logo_size = get_file_size(file_path)
    tenant_dict = tenant.model_dump(exclude={"users"})
    tenant_dict["id"] = tenant.id
    tenant_dict["logo_size_bytes"] = logo_size
    tenant_dict["logo_size_formatted"] = format_file_size(logo_size)

    # Don't expose full secret key - only show last 4 characters for verification
    if tenant_dict.get("stripe_secret_key"):
        secret_key = tenant_dict["stripe_secret_key"]
        tenant_dict["stripe_secret_key"] = (
            f"{secret_key[:7]}...{secret_key[-4:]}" if len(secret_key) > 11 else "***"
        )
    if tenant_dict.get("revolut_merchant_secret"):
        sk = tenant_dict["revolut_merchant_secret"]
        tenant_dict["revolut_merchant_secret"] = (
            f"{sk[:7]}...{sk[-4:]}" if len(sk) > 11 else "***"
        )
    # Don't expose SMTP password; indicate if configured
    if tenant_dict.get("smtp_password"):
        tenant_dict["smtp_password"] = "********"

    return tenant_dict


@app.post("/tenant/header-background")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_upload_per_hour', 10)}/hour",
    key_func=_rate_limit_key_user,
)
async def upload_tenant_header_background(
    request: Request,
    file: Annotated[UploadFile, File()],
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_UPDATE))],
    session: Session = Depends(get_session),
) -> dict:
    """Upload a header background image for public-facing pages (book, menu, reservation view)."""
    tenant = session.exec(
        select(models.Tenant).where(models.Tenant.id == current_user.tenant_id)
    ).first()

    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    content_type = file.content_type or _infer_content_type_from_filename(file.filename)
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(sorted(ALLOWED_IMAGE_TYPES))}",
        )

    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {MAX_IMAGE_SIZE // (1024 * 1024)}MB",
        )

    contents = optimize_image(contents, content_type)

    tenant_dir = UPLOADS_DIR / str(current_user.tenant_id) / "header"
    tenant_dir.mkdir(parents=True, exist_ok=True)

    if tenant.header_background_filename:
        old_path = tenant_dir / tenant.header_background_filename
        if old_path.exists():
            old_path.unlink()

    ext = Path(file.filename or "header.jpg").suffix.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".avif"]:
        ext = ".jpg"
    new_filename = f"{uuid4()}{ext}"

    file_path = tenant_dir / new_filename
    file_path.write_bytes(contents)

    tenant.header_background_filename = new_filename
    session.add(tenant)
    session.commit()
    session.refresh(tenant)

    tenant_dict = tenant.model_dump(mode="json", exclude={"users"})
    tenant_dict["id"] = tenant.id
    if tenant_dict.get("stripe_secret_key"):
        secret_key = tenant_dict["stripe_secret_key"]
        tenant_dict["stripe_secret_key"] = (
            f"{secret_key[:7]}...{secret_key[-4:]}" if len(secret_key) > 11 else "***"
        )
    if tenant_dict.get("revolut_merchant_secret"):
        sk = tenant_dict["revolut_merchant_secret"]
        tenant_dict["revolut_merchant_secret"] = (
            f"{sk[:7]}...{sk[-4:]}" if len(sk) > 11 else "***"
        )
    if tenant_dict.get("smtp_password"):
        tenant_dict["smtp_password"] = "********"
    return JSONResponse(content=tenant_dict)


@app.delete("/tenant/header-background")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_admin_per_minute', 30)}/minute",
    key_func=_rate_limit_key_user,
)
def delete_tenant_header_background(
    request: Request,
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_UPDATE))],
    session: Session = Depends(get_session),
) -> dict:
    """Remove the tenant header background image."""
    tenant = session.exec(
        select(models.Tenant).where(models.Tenant.id == current_user.tenant_id)
    ).first()

    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if tenant.header_background_filename:
        tenant_dir = UPLOADS_DIR / str(current_user.tenant_id) / "header"
        path = tenant_dir / tenant.header_background_filename
        if path.exists():
            path.unlink()
        tenant.header_background_filename = None
        session.add(tenant)
        session.commit()
        session.refresh(tenant)

    tenant_dict = tenant.model_dump(mode="json", exclude={"users"})
    tenant_dict["id"] = tenant.id
    if tenant_dict.get("stripe_secret_key"):
        secret_key = tenant_dict["stripe_secret_key"]
        tenant_dict["stripe_secret_key"] = (
            f"{secret_key[:7]}...{secret_key[-4:]}" if len(secret_key) > 11 else "***"
        )
    if tenant_dict.get("revolut_merchant_secret"):
        sk = tenant_dict["revolut_merchant_secret"]
        tenant_dict["revolut_merchant_secret"] = (
            f"{sk[:7]}...{sk[-4:]}" if len(sk) > 11 else "***"
        )
    if tenant_dict.get("smtp_password"):
        tenant_dict["smtp_password"] = "********"
    return JSONResponse(content=tenant_dict)


# ============ PRODUCTS ============


@app.get("/products")
def list_products(
    current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_READ))],
    session: Session = Depends(get_session),
) -> list[models.Product]:
    """List all products for the tenant.
    
    Returns all Product entries. Also:
    1. Creates Product entries for TenantProducts that don't have a linked Product entry
    2. Updates existing Product entries that are missing images but have a linked TenantProduct with provider_product
    """
    # Get all Product entries
    products = session.exec(
        select(models.Product).where(models.Product.tenant_id == current_user.tenant_id)
    ).all()
    
    # Get TenantProducts that don't have a linked Product entry
    tenant_products_without_product = session.exec(
        select(models.TenantProduct).where(
            models.TenantProduct.tenant_id == current_user.tenant_id,
            models.TenantProduct.product_id.is_(None)
        )
    ).all()
    
    # Create Product entries for TenantProducts that don't have one
    for tp in tenant_products_without_product:
        # Get catalog item for category/subcategory
        catalog_item = session.exec(
            select(models.ProductCatalog).where(models.ProductCatalog.id == tp.catalog_id)
        ).first()
        
        # Get image from TenantProduct or provider product
        image_filename = tp.image_filename
        if not image_filename and tp.provider_product_id:
            # Try to get image from provider product
            provider_product = session.exec(
                select(models.ProviderProduct).where(models.ProviderProduct.id == tp.provider_product_id)
            ).first()
            if provider_product and provider_product.image_filename:
                provider = session.exec(
                    select(models.Provider).where(models.Provider.id == provider_product.provider_id)
                ).first()
                if provider:
                    image_filename = f"providers/{provider.token}/products/{provider_product.image_filename}"
        
        # Create Product entry
        product = models.Product(
            tenant_id=tp.tenant_id,
            name=tp.name,
            price_cents=tp.price_cents,
            description=catalog_item.description if catalog_item else None,
            image_filename=image_filename,
            ingredients=tp.ingredients,
            category=catalog_item.category if catalog_item else None,
            subcategory=catalog_item.subcategory if catalog_item else None,
        )
        session.add(product)
        session.flush()  # Flush to get the ID
        session.refresh(product)
        
        # Link TenantProduct to the new Product
        tp.product_id = product.id
        session.add(tp)
        
        products.append(product)
    
    # Update existing Product entries that are missing images or descriptions
    updated_count = 0
    for product in products:
        # Find linked TenantProduct
        tenant_product = session.exec(
            select(models.TenantProduct).where(
                models.TenantProduct.product_id == product.id,
                models.TenantProduct.tenant_id == current_user.tenant_id
            )
        ).first()

        if tenant_product:
            # Backfill description from catalog if missing
            if not product.description and tenant_product.catalog_id:
                catalog_item = session.exec(
                    select(models.ProductCatalog).where(models.ProductCatalog.id == tenant_product.catalog_id)
                ).first()
                if catalog_item and catalog_item.description:
                    product.description = catalog_item.description
                    session.add(product)
                    updated_count += 1

            # Backfill image from provider if missing
            if not product.image_filename and tenant_product.provider_product_id:
                # Get image from provider product
                provider_product = session.exec(
                    select(models.ProviderProduct).where(
                        models.ProviderProduct.id == tenant_product.provider_product_id
                    )
                ).first()
                if provider_product and provider_product.image_filename:
                    provider = session.exec(
                        select(models.Provider).where(models.Provider.id == provider_product.provider_id)
                    ).first()
                    if provider:
                        product.image_filename = f"providers/{provider.token}/products/{provider_product.image_filename}"
                        session.add(product)
                        updated_count += 1
    
    # Commit all changes
    if tenant_products_without_product or updated_count > 0:
        session.commit()
        # Refresh products to get updated image_filename
        for product in products:
            session.refresh(product)
    
    return products


@app.post("/products")
def create_product(
    product: models.Product,
    current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))],
    session: Session = Depends(get_session),
) -> models.Product:
    product.tenant_id = current_user.tenant_id
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


@app.put("/products/{product_id}")
def update_product(
    product_id: int,
    product_update: models.ProductUpdate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))],
    session: Session = Depends(get_session),
) -> models.Product:
    product = session.exec(
        select(models.Product).where(
            models.Product.id == product_id,
            models.Product.tenant_id == current_user.tenant_id,
        )
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if product_update.name is not None:
        product.name = product_update.name
    if product_update.price_cents is not None:
        product.price_cents = product_update.price_cents
    if product_update.cost_cents is not None:
        product.cost_cents = product_update.cost_cents
    if product_update.ingredients is not None:
        product.ingredients = product_update.ingredients
    if product_update.category is not None:
        product.category = product_update.category
    if product_update.subcategory is not None:
        product.subcategory = product_update.subcategory
    if product_update.tax_id is not None:
        if product_update.tax_id:
            tax = session.get(models.Tax, product_update.tax_id)
            if not tax or tax.tenant_id != current_user.tenant_id:
                raise HTTPException(status_code=400, detail="Invalid tax")
        product.tax_id = product_update.tax_id or None
    if product_update.available_from is not None:
        product.available_from = product_update.available_from
    if product_update.available_until is not None:
        product.available_until = product_update.available_until

    session.add(product)
    # Sync availability dates to linked TenantProduct(s) so customer menu stays consistent
    if product_update.available_from is not None or product_update.available_until is not None:
        linked = session.exec(
            select(models.TenantProduct).where(
                models.TenantProduct.product_id == product.id,
                models.TenantProduct.tenant_id == current_user.tenant_id,
            )
        ).all()
        for tp in linked:
            if product_update.available_from is not None:
                tp.available_from = product_update.available_from
            if product_update.available_until is not None:
                tp.available_until = product_update.available_until
            session.add(tp)
    session.commit()
    session.refresh(product)
    return product


@app.delete("/products/{product_id}")
def delete_product(
    product_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    product = session.exec(
        select(models.Product).where(
            models.Product.id == product_id,
            models.Product.tenant_id == current_user.tenant_id,
        )
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    session.delete(product)
    session.commit()
    return {"status": "deleted", "id": product_id}


@app.post("/products/{product_id}/image")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_upload_per_hour', 10)}/hour",
    key_func=_rate_limit_key_user,
)
async def upload_product_image(
    request: Request,
    product_id: int,
    file: Annotated[UploadFile, File()],
    current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))],
    session: Session = Depends(get_session),
) -> models.Product:
    """Upload an image for a product. Validates file type and size."""
    product = session.exec(
        select(models.Product).where(
            models.Product.id == product_id,
            models.Product.tenant_id == current_user.tenant_id,
        )
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Validate content type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}",
        )

    # Read file and check size
    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {MAX_IMAGE_SIZE // (1024 * 1024)}MB",
        )

    # Optimize image locally
    contents = optimize_image(contents, file.content_type)

    # Create tenant upload directory
    tenant_dir = UPLOADS_DIR / str(current_user.tenant_id) / "products"
    tenant_dir.mkdir(parents=True, exist_ok=True)

    # Delete old image if exists
    if product.image_filename:
        old_path = tenant_dir / product.image_filename
        if old_path.exists():
            old_path.unlink()

    # Generate unique filename
    ext = Path(file.filename or "image.jpg").suffix.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".avif"]:
        ext = ".jpg"
    new_filename = f"{uuid4()}{ext}"

    # Save file
    file_path = tenant_dir / new_filename
    file_path.write_bytes(contents)

    # Update product
    product.image_filename = new_filename
    session.add(product)
    session.commit()
    session.refresh(product)

    # Get file size for response
    image_size = get_file_size(file_path)
    product_dict = product.model_dump()
    product_dict["image_size_bytes"] = image_size
    product_dict["image_size_formatted"] = format_file_size(image_size)

    return product_dict


@app.get("/products/{product_id}/questions")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_admin_per_minute', 30)}/minute",
    key_func=_rate_limit_key_user,
)
def list_product_questions(
    request: Request,
    product_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_READ))],
    session: Session = Depends(get_session),
) -> list[dict]:
    """List customization questions for a product (staff)."""
    product = session.exec(
        select(models.Product).where(
            models.Product.id == product_id,
            models.Product.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    questions = session.exec(
        select(models.ProductQuestion).where(
            models.ProductQuestion.product_id == product_id,
            models.ProductQuestion.tenant_id == current_user.tenant_id,
        ).order_by(models.ProductQuestion.sort_order, models.ProductQuestion.id)
    ).all()
    return [
        {
            "id": q.id,
            "type": q.type.value if hasattr(q.type, "value") else str(q.type),
            "label": q.label,
            "options": q.options,
            "sort_order": q.sort_order,
            "required": q.required,
        }
        for q in questions
    ]


@app.post("/products/{product_id}/questions")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_admin_per_minute', 30)}/minute",
    key_func=_rate_limit_key_user,
)
def create_product_question(
    request: Request,
    product_id: int,
    body: models.ProductQuestionCreate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    """Add a customization question to a product (staff)."""
    product = session.exec(
        select(models.Product).where(
            models.Product.id == product_id,
            models.Product.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    question = models.ProductQuestion(
        tenant_id=current_user.tenant_id,
        product_id=product_id,
        type=body.type,
        label=body.label,
        options=body.options,
        sort_order=body.sort_order,
        required=body.required,
    )
    session.add(question)
    session.commit()
    session.refresh(question)
    return {
        "id": question.id,
        "type": question.type.value if hasattr(question.type, "value") else str(question.type),
        "label": question.label,
        "options": question.options,
        "sort_order": question.sort_order,
        "required": question.required,
    }


# ============ PROVIDERS ============


@app.get("/providers")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_admin_per_minute', 30)}/minute",
    key_func=_rate_limit_key_user,
)
def list_providers(
    request: Request,
    response: Response,
    current_user: Annotated[models.User, Depends(require_permission(Permission.CATALOG_READ))],
    session: Session = Depends(get_session),
    active_only: bool = True,
) -> list[models.Provider]:
    """List product providers: global (tenant_id is null) and this tenant's personal providers."""
    query = select(models.Provider).where(
        (models.Provider.tenant_id.is_(None)) | (models.Provider.tenant_id == current_user.tenant_id)
    )
    if active_only:
        query = query.where(models.Provider.is_active == True)
    return session.exec(query.order_by(models.Provider.name)).all()


@app.get("/providers/{provider_id}")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_admin_per_minute', 30)}/minute",
    key_func=_rate_limit_key_user,
)
def get_provider(
    request: Request,
    response: Response,
    provider_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.CATALOG_READ))],
    session: Session = Depends(get_session),
) -> models.Provider:
    """Get a specific provider (global or owned by current tenant)."""
    provider = session.exec(
        select(models.Provider).where(models.Provider.id == provider_id)
    ).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    if provider.tenant_id is not None and provider.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Provider not found")
    return provider


@app.post("/providers")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_admin_per_minute', 30)}/minute",
    key_func=_rate_limit_key_user,
)
def create_provider(
    request: Request,
    response: Response,
    body: models.ProviderCreate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.CATALOG_WRITE))],
    session: Session = Depends(get_session),
) -> models.Provider:
    """Create a personal provider for the current tenant (owner/admin). Name is unique per tenant."""
    if current_user.tenant_id is None:
        raise HTTPException(status_code=403, detail="Tenant required")
    existing = session.exec(
        select(models.Provider).where(
            models.Provider.tenant_id == current_user.tenant_id,
            models.Provider.name == body.name,
        )
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="A provider with this name already exists")
    provider = models.Provider(
        tenant_id=current_user.tenant_id,
        name=body.name,
        url=body.url,
        full_company_name=body.full_company_name,
        address=body.address,
        tax_number=body.tax_number,
        phone=body.phone,
        email=body.email,
    )
    session.add(provider)
    session.commit()
    session.refresh(provider)
    return provider


# ============ PRODUCT CATALOG ============


@app.get("/catalog")
async def list_catalog(
    request: Request,
    response: Response,
    current_user: Annotated[models.User, Depends(require_permission(Permission.CATALOG_READ))],
    session: Session = Depends(get_session),
    category: str | None = None,
    subcategory: str | None = None,
    search: str | None = None,
):
    """List products from catalog with price comparison across providers."""
    query = select(models.ProductCatalog)

    if category:
        query = query.where(models.ProductCatalog.category == category)
    if subcategory:
        query = query.where(models.ProductCatalog.subcategory == subcategory)
    if search:
        search_term = f"%{search.lower()}%"
        query = query.where(
            (models.ProductCatalog.name.ilike(search_term))
            | (models.ProductCatalog.description.ilike(search_term))
        )

    catalog_items = session.exec(query.order_by(models.ProductCatalog.name)).all()

    result = []
    for item in catalog_items:
        # Get all provider products for this catalog item
        provider_products = session.exec(
            select(models.ProviderProduct).where(
                models.ProviderProduct.catalog_id == item.id,
                models.ProviderProduct.availability == True,
            )
        ).all()

        # Get provider info
        providers_data = []
        for pp in provider_products:
            provider = session.exec(
                select(models.Provider).where(models.Provider.id == pp.provider_id)
            ).first()
            if provider:
                # Construct image URL - only use local images, never external URLs
                image_url = None
                if pp.image_filename:
                    image_url = f"/uploads/providers/{provider.token}/products/{pp.image_filename}"

                providers_data.append(
                    {
                        "provider_id": provider.id,
                        "provider_name": provider.name,
                        "provider_product_id": pp.id,
                        "price_cents": pp.price_cents,
                        "image_url": image_url,
                        "country": pp.country,
                        "region": pp.region,
                        "grape_variety": pp.grape_variety,
                        "volume_ml": pp.volume_ml,
                        "unit": pp.unit,
                        "detailed_description": pp.detailed_description,
                        "wine_style": pp.wine_style,
                        "vintage": pp.vintage,
                        "winery": pp.winery,
                        "aromas": pp.aromas,
                        "elaboration": pp.elaboration,
                    }
                )

        # Sort providers by price (lowest first)
        providers_data.sort(
            key=lambda x: x["price_cents"] if x["price_cents"] else float("inf")
        )

        # Get main image from first provider (if available)
        main_image_url = None
        if providers_data and providers_data[0].get("image_url"):
            main_image_url = providers_data[0]["image_url"]

        # Get origin (country/region) and detailed info from first provider - this is product-level info
        origin_country = None
        origin_region = None
        detailed_description = None
        wine_style = None
        vintage = None
        winery = None
        grape_variety = None
        aromas = None
        elaboration = None

        if providers_data:
            # Use first provider's data (most common case)
            origin_country = providers_data[0].get("country")
            origin_region = providers_data[0].get("region")
            detailed_description = providers_data[0].get("detailed_description")
            wine_style = providers_data[0].get("wine_style")
            vintage = providers_data[0].get("vintage")
            winery = providers_data[0].get("winery")
            grape_variety = providers_data[0].get("grape_variety")
            aromas = providers_data[0].get("aromas")
            elaboration = providers_data[0].get("elaboration")

        result.append(
            {
                "id": item.id,
                "name": item.name,
                "description": item.description,
                "detailed_description": detailed_description,
                "category": item.category,
                "subcategory": item.subcategory,
                "barcode": item.barcode,
                "brand": item.brand,
                "image_url": main_image_url,
                "country": origin_country,
                "region": origin_region,
                "wine_style": wine_style,
                "vintage": vintage,
                "winery": winery,
                "grape_variety": grape_variety,
                "aromas": aromas,
                "elaboration": elaboration,
                "providers": providers_data,
                "min_price_cents": min(
                    [p["price_cents"] for p in providers_data if p["price_cents"]],
                    default=None,
                ),
                "max_price_cents": max(
                    [p["price_cents"] for p in providers_data if p["price_cents"]],
                    default=None,
                ),
            }
        )

    return JSONResponse(content=result)


@app.get("/catalog/categories")
async def get_catalog_categories(
    request: Request,
    response: Response,
    current_user: Annotated[models.User, Depends(require_permission(Permission.CATALOG_READ))],
    session: Session = Depends(get_session),
) -> dict:
    """Get all categories and subcategories from catalog."""
    catalog_items = session.exec(select(models.ProductCatalog)).all()

    categories = {}
    for item in catalog_items:
        if item.category:
            if item.category not in categories:
                categories[item.category] = set()
            if item.subcategory:
                categories[item.category].add(item.subcategory)

    return JSONResponse(content={cat: sorted(list(subcats)) for cat, subcats in categories.items()})


@app.get("/catalog/{catalog_id}")
async def get_catalog_item(
    request: Request,
    response: Response,
    catalog_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.CATALOG_READ))],
    session: Session = Depends(get_session),
) -> dict:
    """Get a specific catalog item with price comparison."""
    catalog_item = session.exec(
        select(models.ProductCatalog).where(models.ProductCatalog.id == catalog_id)
    ).first()

    if not catalog_item:
        raise HTTPException(status_code=404, detail="Catalog item not found")

    # Get all provider products
    provider_products = session.exec(
        select(models.ProviderProduct).where(
            models.ProviderProduct.catalog_id == catalog_id,
            models.ProviderProduct.availability == True,
        )
    ).all()

    providers_data = []
    for pp in provider_products:
        provider = session.exec(
            select(models.Provider).where(models.Provider.id == pp.provider_id)
        ).first()
        if provider:
            # Construct image URL - only use local images, never external URLs
            image_url = None
            if pp.image_filename:
                image_url = (
                    f"/uploads/providers/{provider.token}/products/{pp.image_filename}"
                )

            providers_data.append(
                {
                    "provider_id": provider.id,
                    "provider_name": provider.name,
                    "price_cents": pp.price_cents,
                    "image_url": image_url,
                    "country": pp.country,
                    "region": pp.region,
                    "grape_variety": pp.grape_variety,
                    "volume_ml": pp.volume_ml,
                    "unit": pp.unit,
                }
            )

    providers_data.sort(
        key=lambda x: x["price_cents"] if x["price_cents"] else float("inf")
    )

    # Get main image from first provider (if available)
    main_image_url = None
    if providers_data and providers_data[0].get("image_url"):
        main_image_url = providers_data[0]["image_url"]

    # Get origin (country/region) and detailed info from first provider - this is product-level info
    origin_country = None
    origin_region = None
    detailed_description = None
    wine_style = None
    vintage = None
    winery = None
    grape_variety = None
    aromas = None
    elaboration = None

    if providers_data:
        origin_country = providers_data[0].get("country")
        origin_region = providers_data[0].get("region")
        detailed_description = providers_data[0].get("detailed_description")
        wine_style = providers_data[0].get("wine_style")
        vintage = providers_data[0].get("vintage")
        winery = providers_data[0].get("winery")
        grape_variety = providers_data[0].get("grape_variety")
        aromas = providers_data[0].get("aromas")
        elaboration = providers_data[0].get("elaboration")

    payload = {
        "id": catalog_item.id,
        "name": catalog_item.name,
        "description": catalog_item.description,
        "detailed_description": detailed_description,
        "category": catalog_item.category,
        "subcategory": catalog_item.subcategory,
        "barcode": catalog_item.barcode,
        "brand": catalog_item.brand,
        "image_url": main_image_url,
        "country": origin_country,
        "region": origin_region,
        "wine_style": wine_style,
        "vintage": vintage,
        "winery": winery,
        "grape_variety": grape_variety,
        "aromas": aromas,
        "elaboration": elaboration,
        "providers": providers_data,
        "min_price_cents": min(
            [p["price_cents"] for p in providers_data if p["price_cents"]], default=None
        ),
        "max_price_cents": max(
            [p["price_cents"] for p in providers_data if p["price_cents"]], default=None
        ),
    }
    return JSONResponse(content=payload)


# ============ PROVIDER PRODUCTS ============


@app.get("/providers/{provider_id}/products")
def list_provider_products(
    provider_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.CATALOG_READ))],
    session: Session = Depends(get_session),
) -> list[models.ProviderProduct]:
    """List all products from a specific provider (global or owned by current tenant)."""
    provider = session.exec(
        select(models.Provider).where(models.Provider.id == provider_id)
    ).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    if provider.tenant_id is not None and provider.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Provider not found")

    return session.exec(
        select(models.ProviderProduct)
        .where(models.ProviderProduct.provider_id == provider_id)
        .order_by(models.ProviderProduct.name)
    ).all()


@app.post("/providers/{provider_id}/products")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_admin_per_minute', 30)}/minute",
    key_func=_rate_limit_key_user,
)
def create_provider_product_for_tenant(
    request: Request,
    provider_id: int,
    body: models.ProviderProductCreate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.CATALOG_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    """Create a product on a tenant-owned (personal) provider. Only allowed when provider.tenant_id == current tenant."""
    provider = session.exec(
        select(models.Provider).where(models.Provider.id == provider_id)
    ).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    if provider.tenant_id is None or provider.tenant_id != current_user.tenant_id:
        raise HTTPException(
            status_code=403,
            detail="You can only add products to providers you created",
        )
    try:
        catalog_id = body.catalog_id
        if catalog_id is not None:
            catalog_item = session.get(models.ProductCatalog, catalog_id)
            if not catalog_item:
                raise HTTPException(status_code=404, detail="Catalog item not found")
            name = body.name or catalog_item.name
        else:
            normalized = _catalog_normalized_name(body.name)
            existing = session.exec(
                select(models.ProductCatalog).where(
                    models.ProductCatalog.normalized_name == normalized
                )
            ).first()
            if existing:
                catalog_item = existing
                name = body.name or catalog_item.name
            else:
                catalog_item = models.ProductCatalog(
                    name=body.name,
                    normalized_name=normalized,
                    category=body.category,
                    subcategory=body.subcategory,
                    description=body.description,
                    brand=body.brand,
                    barcode=body.barcode,
                )
                session.add(catalog_item)
                session.commit()
                session.refresh(catalog_item)
                name = body.name
            catalog_id = catalog_item.id
        external_id = body.external_id or f"pp-{provider.id}-{uuid4().hex[:12]}"
        pp = models.ProviderProduct(
            catalog_id=catalog_id,
            provider_id=provider.id,
            external_id=external_id,
            name=name,
            price_cents=body.price_cents,
            availability=body.availability,
            country=body.country,
            region=body.region,
            grape_variety=body.grape_variety,
            volume_ml=body.volume_ml,
            unit=body.unit,
            detailed_description=body.detailed_description,
            wine_style=body.wine_style,
            vintage=body.vintage,
            winery=body.winery,
            aromas=body.aromas,
            elaboration=body.elaboration,
        )
        session.add(pp)
        session.commit()
        session.refresh(pp)
        return pp.model_dump(mode="json")
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        session.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create product: {e!s}",
        ) from e


# ============ PROVIDER PORTAL (provider-scoped auth) ============


def _catalog_normalized_name(name: str) -> str:
    """Normalize product name for catalog matching."""
    return " ".join(name.lower().strip().split())


@app.get("/provider/me")
def provider_me(
    current: Annotated[
        tuple[models.User, models.Provider],
        Depends(security.get_current_provider_user),
    ],
    session: Session = Depends(get_session),
) -> dict:
    """Return current provider info (for provider portal)."""
    _user, provider = current
    return {
        "id": provider.id,
        "name": provider.name,
        "token": provider.token,
        "url": provider.url,
        "is_active": provider.is_active,
        "full_company_name": provider.full_company_name,
        "address": provider.address,
        "tax_number": provider.tax_number,
        "phone": provider.phone,
        "email": provider.email,
        "bank_iban": provider.bank_iban,
        "bank_bic": provider.bank_bic,
        "bank_name": provider.bank_name,
        "bank_account_holder": provider.bank_account_holder,
    }


@app.put("/provider/me")
def provider_update_me(
    body: models.ProviderUpdate,
    current: Annotated[
        tuple[models.User, models.Provider],
        Depends(security.get_current_provider_user),
    ],
    session: Session = Depends(get_session),
) -> dict:
    """Update current provider company/contact details."""
    _user, provider = current
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(provider, k, v)
    session.add(provider)
    session.commit()
    session.refresh(provider)
    return {
        "id": provider.id,
        "name": provider.name,
        "token": provider.token,
        "url": provider.url,
        "is_active": provider.is_active,
        "full_company_name": provider.full_company_name,
        "address": provider.address,
        "tax_number": provider.tax_number,
        "phone": provider.phone,
        "email": provider.email,
        "bank_iban": provider.bank_iban,
        "bank_bic": provider.bank_bic,
        "bank_name": provider.bank_name,
        "bank_account_holder": provider.bank_account_holder,
    }


@app.get("/provider/catalog")
def provider_list_catalog(
    current: Annotated[
        tuple[models.User, models.Provider],
        Depends(security.get_current_provider_user),
    ],
    session: Session = Depends(get_session),
    search: str | None = None,
) -> list[dict]:
    """List catalog items (id, name, category) for linking provider products."""
    _user, _provider = current
    query = select(models.ProductCatalog).order_by(models.ProductCatalog.name)
    if search:
        term = f"%{search.lower()}%"
        query = query.where(models.ProductCatalog.name.ilike(term))
    items = session.exec(query.limit(200)).all()
    return [{"id": c.id, "name": c.name, "category": c.category, "subcategory": c.subcategory} for c in items]


@app.get("/provider/products")
def provider_list_products(
    current: Annotated[
        tuple[models.User, models.Provider],
        Depends(security.get_current_provider_user),
    ],
    session: Session = Depends(get_session),
) -> list[dict]:
    """List all products for the current provider."""
    _user, provider = current
    products = session.exec(
        select(models.ProviderProduct)
        .where(models.ProviderProduct.provider_id == provider.id)
        .order_by(models.ProviderProduct.name)
    ).all()
    result = []
    for pp in products:
        catalog_item = session.get(models.ProductCatalog, pp.catalog_id)
        image_url = None
        if pp.image_filename:
            image_url = f"/uploads/providers/{provider.token}/products/{pp.image_filename}"
        result.append(
            {
                "id": pp.id,
                "catalog_id": pp.catalog_id,
                "catalog_name": catalog_item.name if catalog_item else None,
                "name": pp.name,
                "price_cents": pp.price_cents,
                "availability": pp.availability,
                "image_url": image_url,
                "external_id": pp.external_id,
                "country": pp.country,
                "region": pp.region,
                "volume_ml": pp.volume_ml,
                "unit": pp.unit,
                "detailed_description": pp.detailed_description,
                "grape_variety": pp.grape_variety,
                "wine_style": pp.wine_style,
                "vintage": pp.vintage,
                "winery": pp.winery,
                "aromas": pp.aromas,
                "elaboration": pp.elaboration,
            }
        )
    return result


@app.post("/provider/products")
def provider_create_product(
    current: Annotated[
        tuple[models.User, models.Provider],
        Depends(security.get_current_provider_user),
    ],
    body: models.ProviderProductCreate,
    session: Session = Depends(get_session),
) -> dict:
    """Create a provider product; create new catalog item if catalog_id not provided."""
    _user, provider = current
    try:
        catalog_id = body.catalog_id
        if catalog_id is not None:
            catalog_item = session.get(models.ProductCatalog, catalog_id)
            if not catalog_item:
                raise HTTPException(status_code=404, detail="Catalog item not found")
            name = body.name or catalog_item.name
        else:
            # Create new catalog item
            normalized = _catalog_normalized_name(body.name)
            existing = session.exec(
                select(models.ProductCatalog).where(
                    models.ProductCatalog.normalized_name == normalized
                )
            ).first()
            if existing:
                catalog_item = existing
                name = body.name or catalog_item.name
            else:
                catalog_item = models.ProductCatalog(
                    name=body.name,
                    normalized_name=normalized,
                    category=body.category,
                    subcategory=body.subcategory,
                    description=body.description,
                    brand=body.brand,
                    barcode=body.barcode,
                )
                session.add(catalog_item)
                session.commit()
                session.refresh(catalog_item)
                name = body.name
            catalog_id = catalog_item.id
        external_id = body.external_id or f"pp-{provider.id}-{uuid4().hex[:12]}"
        pp = models.ProviderProduct(
            catalog_id=catalog_id,
            provider_id=provider.id,
            external_id=external_id,
            name=name,
            price_cents=body.price_cents,
            availability=body.availability,
            country=body.country,
            region=body.region,
            grape_variety=body.grape_variety,
            volume_ml=body.volume_ml,
            unit=body.unit,
            detailed_description=body.detailed_description,
            wine_style=body.wine_style,
            vintage=body.vintage,
            winery=body.winery,
            aromas=body.aromas,
            elaboration=body.elaboration,
        )
        session.add(pp)
        session.commit()
        session.refresh(pp)
        return pp.model_dump(mode="json")
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        session.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create product: {e!s}",
        ) from e


@app.put("/provider/products/{product_id}")
def provider_update_product(
    product_id: int,
    current: Annotated[
        tuple[models.User, models.Provider],
        Depends(security.get_current_provider_user),
    ],
    body: models.ProviderProductUpdate,
    session: Session = Depends(get_session),
) -> models.ProviderProduct:
    """Update a provider product (own products only)."""
    _user, provider = current
    pp = session.exec(
        select(models.ProviderProduct).where(
            models.ProviderProduct.id == product_id,
            models.ProviderProduct.provider_id == provider.id,
        )
    ).first()
    if not pp:
        raise HTTPException(status_code=404, detail="Product not found")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(pp, k, v)
    session.add(pp)
    session.commit()
    session.refresh(pp)
    return pp


@app.delete("/provider/products/{product_id}")
def provider_delete_product(
    product_id: int,
    current: Annotated[
        tuple[models.User, models.Provider],
        Depends(security.get_current_provider_user),
    ],
    session: Session = Depends(get_session),
) -> dict:
    """Delete a provider product (own products only)."""
    _user, provider = current
    pp = session.exec(
        select(models.ProviderProduct).where(
            models.ProviderProduct.id == product_id,
            models.ProviderProduct.provider_id == provider.id,
        )
    ).first()
    if not pp:
        raise HTTPException(status_code=404, detail="Product not found")
    session.delete(pp)
    session.commit()
    return {"status": "deleted", "id": product_id}


@app.post("/provider/products/{product_id}/image")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_upload_per_hour', 10)}/hour",
    key_func=_rate_limit_key_user,
)
async def provider_upload_product_image(
    request: Request,
    product_id: int,
    current: Annotated[
        tuple[models.User, models.Provider],
        Depends(security.get_current_provider_user),
    ],
    file: Annotated[UploadFile, File()],
    session: Session = Depends(get_session),
) -> dict:
    """Upload image for a provider product."""
    _user, provider = current
    pp = session.exec(
        select(models.ProviderProduct).where(
            models.ProviderProduct.id == product_id,
            models.ProviderProduct.provider_id == provider.id,
        )
    ).first()
    if not pp:
        raise HTTPException(status_code=404, detail="Product not found")
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}",
        )
    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {MAX_IMAGE_SIZE // (1024 * 1024)}MB",
        )
    contents = optimize_image(contents, file.content_type)
    provider_dir = UPLOADS_DIR / "providers" / provider.token / "products"
    provider_dir.mkdir(parents=True, exist_ok=True)
    if pp.image_filename:
        old_path = provider_dir / pp.image_filename
        if old_path.exists():
            old_path.unlink()
    ext = Path(file.filename or "image.jpg").suffix.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".avif"]:
        ext = ".jpg"
    new_filename = f"{uuid4()}{ext}"
    (provider_dir / new_filename).write_bytes(contents)
    pp.image_filename = new_filename
    session.add(pp)
    session.commit()
    session.refresh(pp)
    image_url = f"/uploads/providers/{provider.token}/products/{pp.image_filename}"
    return {"id": pp.id, "image_filename": pp.image_filename, "image_url": image_url}


# ============ TENANT PRODUCTS ============


@app.get("/tenant-products")
def list_tenant_products(
    request: Request,
    response: Response,
    current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_READ))],
    session: Session = Depends(get_session),
    active_only: bool = True,
) -> list[dict]:
    """List products selected by the tenant (restaurant)."""
    query = select(models.TenantProduct).where(
        models.TenantProduct.tenant_id == current_user.tenant_id
    )

    if active_only:
        query = query.where(models.TenantProduct.is_active == True)

    tenant_products = session.exec(query.order_by(models.TenantProduct.name)).all()

    result = []
    for tp in tenant_products:
        # Get catalog item info
        catalog_item = session.exec(
            select(models.ProductCatalog).where(
                models.ProductCatalog.id == tp.catalog_id
            )
        ).first()

        # Get provider product info if linked
        provider_info = None
        if tp.provider_product_id:
            provider_product = session.exec(
                select(models.ProviderProduct).where(
                    models.ProviderProduct.id == tp.provider_product_id
                )
            ).first()
            if provider_product:
                provider = session.exec(
                    select(models.Provider).where(
                        models.Provider.id == provider_product.provider_id
                    )
                ).first()
                if provider:
                    provider_info = {
                        "provider_id": provider.id,
                        "provider_name": provider.name,
                        "provider_price_cents": provider_product.price_cents,
                    }

        result.append(
            {
                "id": tp.id,
                "name": tp.name,
                "price_cents": tp.price_cents,
                "image_filename": tp.image_filename,
                "ingredients": tp.ingredients,
                "is_active": tp.is_active,
                "catalog_id": tp.catalog_id,
                "catalog_name": catalog_item.name if catalog_item else None,
                "provider_info": provider_info,
                "product_id": tp.product_id,  # For backward compatibility
                "available_from": tp.available_from.isoformat() if tp.available_from else None,
                "available_until": tp.available_until.isoformat() if tp.available_until else None,
            }
        )

    return JSONResponse(content=result)


@app.post("/tenant-products")
def create_tenant_product(
    product_data: models.TenantProductCreate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))],
    session: Session = Depends(get_session),
) -> models.TenantProduct:
    """Add a product from catalog to tenant's menu.

    This creates BOTH:
    1. A Product entry (shows on /products page)
    2. A TenantProduct entry (links to catalog for metadata)
    """
    # Get catalog item
    catalog_item = session.exec(
        select(models.ProductCatalog).where(
            models.ProductCatalog.id == product_data.catalog_id
        )
    ).first()
    if not catalog_item:
        raise HTTPException(status_code=404, detail="Catalog item not found")

    # Get provider product for additional info if specified
    provider_product = None
    if product_data.provider_product_id:
        provider_product = session.exec(
            select(models.ProviderProduct).where(
                models.ProviderProduct.id == product_data.provider_product_id,
                models.ProviderProduct.catalog_id == product_data.catalog_id,
            )
        ).first()
        if not provider_product:
            raise HTTPException(
                status_code=404,
                detail="Provider product not found or doesn't match catalog",
            )

    # Use catalog name if name not provided
    product_name = product_data.name or catalog_item.name

    # Determine price
    price_cents = product_data.price_cents
    if price_cents is None and provider_product:
        price_cents = provider_product.price_cents
    if price_cents is None:
        raise HTTPException(status_code=400, detail="Price is required")
    # Cost: optional; default from provider price when adding from catalog
    cost_cents = product_data.cost_cents
    if cost_cents is None and provider_product and provider_product.price_cents is not None:
        cost_cents = provider_product.price_cents

    # Determine category and subcategory from catalog
    category = catalog_item.category
    subcategory = catalog_item.subcategory

    # Get image from provider product if available
    image_filename = None
    if provider_product and provider_product.image_filename:
        provider = session.exec(
            select(models.Provider).where(
                models.Provider.id == provider_product.provider_id
            )
        ).first()
        if provider:
            image_filename = (
                f"providers/{provider.token}/products/{provider_product.image_filename}"
            )

    # 1. Create the actual Product (shows on /products page)
    product = models.Product(
        tenant_id=current_user.tenant_id,
        name=product_name,
        price_cents=price_cents,
        cost_cents=cost_cents,
        description=catalog_item.description,
        image_filename=image_filename,
        category=category,
        subcategory=subcategory,
        available_from=product_data.available_from,
        available_until=product_data.available_until,
    )
    session.add(product)
    session.commit()
    session.refresh(product)

    # 2. Create TenantProduct (links to catalog for metadata tracking)
    tenant_product = models.TenantProduct(
        tenant_id=current_user.tenant_id,
        catalog_id=product_data.catalog_id,
        provider_product_id=product_data.provider_product_id,
        product_id=product.id,  # Link to the actual Product
        name=product_name,
        price_cents=price_cents,
        cost_cents=cost_cents,
        available_from=product_data.available_from,
        available_until=product_data.available_until,
    )

    session.add(tenant_product)
    session.commit()
    session.refresh(tenant_product)

    # 3. Create or find inventory Supplier from Provider (if provider selected)
    inventory_supplier_id = None
    if provider_product:
        provider = session.exec(
            select(models.Provider).where(
                models.Provider.id == provider_product.provider_id
            )
        ).first()
        if provider:
            # Check if Supplier already exists for this provider+tenant
            existing_supplier = session.exec(
                select(inventory_models.Supplier).where(
                    inventory_models.Supplier.tenant_id == current_user.tenant_id,
                    inventory_models.Supplier.code == f"PROV-{provider.id}",
                    inventory_models.Supplier.is_deleted == False,
                )
            ).first()

            if existing_supplier:
                inventory_supplier_id = existing_supplier.id
            else:
                # Create new Supplier from Provider
                new_supplier = inventory_models.Supplier(
                    tenant_id=current_user.tenant_id,
                    name=provider.name,
                    code=f"PROV-{provider.id}",
                    notes=f"Auto-created from catalog provider: {provider.name}",
                )
                session.add(new_supplier)
                session.commit()
                session.refresh(new_supplier)
                inventory_supplier_id = new_supplier.id

    # 4. Create InventoryItem for this product (if inventory tracking enabled)
    tenant = session.exec(
        select(models.Tenant).where(models.Tenant.id == current_user.tenant_id)
    ).first()

    if tenant:
        # Generate SKU from catalog info
        sku_base = catalog_item.name[:20].upper().replace(" ", "-").replace(".", "")
        sku = f"CAT-{catalog_item.id}-{sku_base}"

        # Check if InventoryItem already exists (by SKU)
        existing_item = session.exec(
            select(inventory_models.InventoryItem).where(
                inventory_models.InventoryItem.tenant_id == current_user.tenant_id,
                inventory_models.InventoryItem.sku == sku,
                inventory_models.InventoryItem.is_deleted == False,
            )
        ).first()

        if not existing_item:
            # Map catalog category to inventory category
            inv_category = "other"
            if category:
                cat_lower = category.lower()
                if (
                    "wine" in cat_lower
                    or "beverage" in cat_lower
                    or "drink" in cat_lower
                ):
                    inv_category = "beverages"
                elif (
                    "food" in cat_lower or "main" in cat_lower or "starter" in cat_lower
                ):
                    inv_category = "ingredients"

            # Create InventoryItem
            inventory_item = inventory_models.InventoryItem(
                tenant_id=current_user.tenant_id,
                sku=sku,
                name=product_name,
                description=catalog_item.description,
                unit="piece",  # Default to piece for catalog items
                category=inv_category,
                reorder_level=5,  # Default reorder level
                reorder_quantity=10,  # Default reorder quantity
                default_supplier_id=inventory_supplier_id,
                current_quantity=0,  # Start with 0 stock
                average_cost_cents=provider_product.price_cents
                if provider_product and provider_product.price_cents
                else 0,
            )
            session.add(inventory_item)
            session.commit()

    return tenant_product


@app.put("/tenant-products/{tenant_product_id}")
def update_tenant_product(
    tenant_product_id: int,
    product_update: models.TenantProductUpdate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))],
    session: Session = Depends(get_session),
) -> models.TenantProduct:
    """Update a tenant product."""
    tenant_product = session.exec(
        select(models.TenantProduct).where(
            models.TenantProduct.id == tenant_product_id,
            models.TenantProduct.tenant_id == current_user.tenant_id,
        )
    ).first()

    if not tenant_product:
        raise HTTPException(status_code=404, detail="Tenant product not found")

    if product_update.name is not None:
        tenant_product.name = product_update.name
    if product_update.price_cents is not None:
        tenant_product.price_cents = product_update.price_cents
    if product_update.cost_cents is not None:
        tenant_product.cost_cents = product_update.cost_cents
    if product_update.is_active is not None:
        tenant_product.is_active = product_update.is_active
    if product_update.tax_id is not None:
        if product_update.tax_id:
            tax = session.get(models.Tax, product_update.tax_id)
            if not tax or tax.tenant_id != current_user.tenant_id:
                raise HTTPException(status_code=400, detail="Invalid tax")
        tenant_product.tax_id = product_update.tax_id or None
    if product_update.available_from is not None:
        tenant_product.available_from = product_update.available_from
    if product_update.available_until is not None:
        tenant_product.available_until = product_update.available_until

    session.add(tenant_product)
    session.commit()
    session.refresh(tenant_product)
    return tenant_product


@app.delete("/tenant-products/{tenant_product_id}")
def delete_tenant_product(
    tenant_product_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    """Delete a tenant product."""
    tenant_product = session.exec(
        select(models.TenantProduct).where(
            models.TenantProduct.id == tenant_product_id,
            models.TenantProduct.tenant_id == current_user.tenant_id,
        )
    ).first()

    if not tenant_product:
        raise HTTPException(status_code=404, detail="Tenant product not found")

    session.delete(tenant_product)
    session.commit()
    return {"status": "deleted", "id": tenant_product_id}


# ============ FLOORS ============


@app.get("/floors")
def list_floors(
    current_user: Annotated[models.User, Depends(require_permission(Permission.FLOOR_READ))],
    session: Session = Depends(get_session),
) -> list[dict]:
    """List all floors for this tenant, including default waiter info."""
    floors = session.exec(
        select(models.Floor)
        .where(models.Floor.tenant_id == current_user.tenant_id)
        .order_by(models.Floor.sort_order, models.Floor.name)
    ).all()

    # Collect waiter IDs to resolve names in one query
    waiter_ids = {f.default_waiter_id for f in floors if f.default_waiter_id}
    waiter_map: dict[int, str] = {}
    if waiter_ids:
        waiters = session.exec(
            select(models.User).where(models.User.id.in_(waiter_ids))
        ).all()
        waiter_map = {w.id: (w.full_name or w.email) for w in waiters}

    result = []
    for f in floors:
        d = f.model_dump()
        d["default_waiter_name"] = waiter_map.get(f.default_waiter_id) if f.default_waiter_id else None
        result.append(d)
    return result


@app.post("/floors")
def create_floor(
    floor_data: models.FloorCreate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.FLOOR_WRITE))],
    session: Session = Depends(get_session),
) -> models.Floor:
    """Create a new floor/zone."""
    # Auto-assign sort_order if not provided
    sort_order = floor_data.sort_order
    if sort_order is None:
        max_order = session.exec(
            select(models.Floor.sort_order)
            .where(models.Floor.tenant_id == current_user.tenant_id)
            .order_by(models.Floor.sort_order.desc())
        ).first()
        sort_order = (max_order or 0) + 1

    floor = models.Floor(
        name=floor_data.name, sort_order=sort_order, tenant_id=current_user.tenant_id
    )
    session.add(floor)
    session.commit()
    session.refresh(floor)
    return floor


@app.put("/floors/{floor_id}")
def update_floor(
    floor_id: int,
    floor_update: models.FloorUpdate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.FLOOR_WRITE))],
    session: Session = Depends(get_session),
) -> models.Floor:
    """Update a floor."""
    floor = session.exec(
        select(models.Floor).where(
            models.Floor.id == floor_id,
            models.Floor.tenant_id == current_user.tenant_id,
        )
    ).first()

    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")

    if floor_update.name is not None:
        floor.name = floor_update.name
    if floor_update.sort_order is not None:
        floor.sort_order = floor_update.sort_order
    if floor_update.default_waiter_id is not None:
        if floor_update.default_waiter_id == 0:
            floor.default_waiter_id = None
        else:
            waiter = session.exec(
                select(models.User).where(
                    models.User.id == floor_update.default_waiter_id,
                    models.User.tenant_id == current_user.tenant_id,
                    models.User.role == models.UserRole.waiter,
                )
            ).first()
            if not waiter:
                raise HTTPException(status_code=400, detail="Waiter not found")
            floor.default_waiter_id = waiter.id

    session.add(floor)
    session.commit()
    session.refresh(floor)
    return floor


@app.delete("/floors/{floor_id}")
def delete_floor(
    floor_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.FLOOR_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    """Delete a floor. Tables on this floor will have floor_id set to null."""
    floor = session.exec(
        select(models.Floor).where(
            models.Floor.id == floor_id,
            models.Floor.tenant_id == current_user.tenant_id,
        )
    ).first()

    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")

    session.delete(floor)
    session.commit()
    return {"status": "deleted", "id": floor_id}


@app.put("/floors/{floor_id}/assign-waiter")
def assign_waiter_to_floor(
    floor_id: int,
    body: dict,
    current_user: Annotated[models.User, Depends(require_permission(Permission.TABLE_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    """Assign a default waiter to a floor. Send waiter_id=null to unassign."""
    floor = session.exec(
        select(models.Floor).where(
            models.Floor.id == floor_id,
            models.Floor.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")

    waiter_id = body.get("waiter_id")
    if waiter_id is not None:
        waiter = session.exec(
            select(models.User).where(
                models.User.id == waiter_id,
                models.User.tenant_id == current_user.tenant_id,
                models.User.role == models.UserRole.waiter,
            )
        ).first()
        if not waiter:
            raise HTTPException(status_code=400, detail="Waiter not found or not a waiter role")
        floor.default_waiter_id = waiter.id
    else:
        floor.default_waiter_id = None

    session.add(floor)
    session.commit()
    session.refresh(floor)

    # Resolve waiter name for response
    waiter_name = None
    if floor.default_waiter_id:
        w = session.get(models.User, floor.default_waiter_id)
        waiter_name = w.full_name or w.email if w else None

    return {
        "floor_id": floor.id,
        "default_waiter_id": floor.default_waiter_id,
        "default_waiter_name": waiter_name,
    }


# ============ WORKING PLAN (SCHEDULE) ============

def _shift_to_dict(shift: models.Shift, user_name: str, user_role: str) -> dict:
    """Build shift response with user name and role."""
    return {
        "id": shift.id,
        "tenant_id": shift.tenant_id,
        "user_id": shift.user_id,
        "user_name": user_name,
        "user_role": user_role,
        "date": shift.shift_date.isoformat() if shift.shift_date else None,
        "start_time": shift.start_time.strftime("%H:%M") if shift.start_time else None,
        "end_time": shift.end_time.strftime("%H:%M") if shift.end_time else None,
        "label": shift.label,
        "created_at": shift.created_at.isoformat() if shift.created_at else None,
        "updated_at": shift.updated_at.isoformat() if shift.updated_at else None,
    }


def _mark_working_plan_updated(session: Session, tenant_id: int) -> None:
    """Set tenant.working_plan_updated_at so owner sees the '*' in nav."""
    tenant = session.get(models.Tenant, tenant_id)
    if tenant:
        tenant.working_plan_updated_at = datetime.now(timezone.utc)
        session.add(tenant)


def _mark_working_plan_seen_by_owner(session: Session, tenant_id: int) -> None:
    """Set tenant.working_plan_owner_seen_at when owner views the working plan."""
    tenant = session.get(models.Tenant, tenant_id)
    if tenant:
        tenant.working_plan_owner_seen_at = datetime.now(timezone.utc)
        session.add(tenant)


@app.get("/schedule/notification")
def schedule_notification(
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    session: Session = Depends(get_session),
) -> dict:
    """Return whether the owner has unseen working plan updates (for '*' in nav). Only owners get has_updates."""
    if current_user.tenant_id is None or current_user.role != models.UserRole.owner:
        return {"has_updates": False}
    tenant = session.get(models.Tenant, current_user.tenant_id)
    if not tenant or not tenant.working_plan_updated_at:
        return {"has_updates": False}
    if not tenant.working_plan_owner_seen_at:
        return {"has_updates": True}
    return {"has_updates": tenant.working_plan_updated_at > tenant.working_plan_owner_seen_at}


@app.get("/schedule")
def list_schedule(
    current_user: Annotated[models.User, Depends(require_permission(Permission.SCHEDULE_READ))],
    session: Session = Depends(get_session),
    from_date: str = Query(..., description="Start date YYYY-MM-DD"),
    to_date: str = Query(..., description="End date YYYY-MM-DD"),
) -> list[dict]:
    """List shifts for the tenant in the given date range (inclusive)."""
    from datetime import datetime as dt_parse
    try:
        fd = dt_parse.strptime(from_date, "%Y-%m-%d").date()
        td = dt_parse.strptime(to_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format; use YYYY-MM-DD")
    if fd > td:
        raise HTTPException(status_code=400, detail="from_date must be <= to_date")
    shifts = session.exec(
        select(models.Shift)
        .where(models.Shift.tenant_id == current_user.tenant_id)
        .where(models.Shift.shift_date >= fd)
        .where(models.Shift.shift_date <= td)
    ).all()
    user_ids = {s.user_id for s in shifts}
    user_map: dict[int, tuple[str, str]] = {}
    if user_ids:
        users = session.exec(
            select(models.User).where(models.User.id.in_(user_ids))
        ).all()
        for u in users:
            user_map[u.id] = (u.full_name or u.email or "", u.role.value if u.role else "")
    if current_user.role == models.UserRole.owner and current_user.tenant_id:
        _mark_working_plan_seen_by_owner(session, current_user.tenant_id)
        session.commit()
    return [_shift_to_dict(s, user_map.get(s.user_id, ("", ""))[0], user_map.get(s.user_id, ("", ""))[1]) for s in shifts]


@app.get("/schedule/{shift_id}")
def get_shift(
    shift_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.SCHEDULE_READ))],
    session: Session = Depends(get_session),
) -> dict:
    """Get one shift by id."""
    shift = session.exec(
        select(models.Shift).where(
            models.Shift.id == shift_id,
            models.Shift.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    user = session.get(models.User, shift.user_id)
    user_name = (user.full_name or user.email or "") if user else ""
    user_role = user.role.value if user and user.role else ""
    return _shift_to_dict(shift, user_name, user_role)


@app.post("/schedule")
def create_shift(
    body: models.ShiftCreate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.SCHEDULE_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    """Create a shift. User must belong to tenant and have role owner, admin, kitchen, bartender, waiter, or receptionist."""
    from datetime import datetime as dt_parse
    if current_user.tenant_id is None:
        raise HTTPException(status_code=403, detail="Tenant required")
    user = session.exec(
        select(models.User).where(
            models.User.id == body.user_id,
            models.User.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    if user.role not in (models.UserRole.owner, models.UserRole.admin, models.UserRole.kitchen, models.UserRole.bartender, models.UserRole.waiter, models.UserRole.receptionist):
        raise HTTPException(status_code=400, detail="User must have role owner, admin, kitchen, bartender, waiter, or receptionist")
    try:
        shift_date = dt_parse.strptime(body.date, "%Y-%m-%d").date()
        start_time = dt_parse.strptime(body.start_time[:5], "%H:%M").time()
        end_time = dt_parse.strptime(body.end_time[:5], "%H:%M").time()
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid date or time format; use YYYY-MM-DD and HH:MM")
    if start_time >= end_time:
        raise HTTPException(status_code=400, detail="start_time must be before end_time")
    shift = models.Shift(
        tenant_id=current_user.tenant_id,
        user_id=body.user_id,
        shift_date=shift_date,
        start_time=start_time,
        end_time=end_time,
        label=body.label,
    )
    session.add(shift)
    _mark_working_plan_updated(session, current_user.tenant_id)
    session.commit()
    session.refresh(shift)
    user_name = user.full_name or user.email or ""
    return _shift_to_dict(shift, user_name, user.role.value)


@app.put("/schedule/{shift_id}")
def update_shift(
    shift_id: int,
    body: models.ShiftUpdate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.SCHEDULE_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    """Update a shift."""
    shift = session.exec(
        select(models.Shift).where(
            models.Shift.id == shift_id,
            models.Shift.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    from datetime import datetime as dt_parse
    if body.user_id is not None:
        user = session.exec(
            select(models.User).where(
                models.User.id == body.user_id,
                models.User.tenant_id == current_user.tenant_id,
            )
        ).first()
        if not user:
            raise HTTPException(status_code=400, detail="User not found")
        if user.role not in (models.UserRole.owner, models.UserRole.admin, models.UserRole.kitchen, models.UserRole.bartender, models.UserRole.waiter, models.UserRole.receptionist):
            raise HTTPException(status_code=400, detail="User must have role owner, admin, kitchen, bartender, waiter, or receptionist")
        shift.user_id = body.user_id
    if body.date is not None:
        try:
            shift.shift_date = dt_parse.strptime(body.date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format; use YYYY-MM-DD")
    if body.start_time is not None:
        try:
            shift.start_time = dt_parse.strptime(body.start_time[:5], "%H:%M").time()
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid start_time; use HH:MM")
    if body.end_time is not None:
        try:
            shift.end_time = dt_parse.strptime(body.end_time[:5], "%H:%M").time()
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid end_time; use HH:MM")
    if body.label is not None:
        shift.label = body.label
    if shift.start_time >= shift.end_time:
        raise HTTPException(status_code=400, detail="start_time must be before end_time")
    shift.updated_at = datetime.now(timezone.utc)
    session.add(shift)
    _mark_working_plan_updated(session, current_user.tenant_id)
    session.commit()
    session.refresh(shift)
    user = session.get(models.User, shift.user_id)
    user_name = (user.full_name or user.email or "") if user else ""
    user_role = user.role.value if user and user.role else ""
    return _shift_to_dict(shift, user_name, user_role)


@app.delete("/schedule/{shift_id}")
def delete_shift(
    shift_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.SCHEDULE_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    """Delete a shift."""
    shift = session.exec(
        select(models.Shift).where(
            models.Shift.id == shift_id,
            models.Shift.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    _mark_working_plan_updated(session, current_user.tenant_id)
    session.delete(shift)
    session.commit()
    return {"deleted": True, "id": shift_id}


# ============ TABLES ============


@app.get("/tables")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_admin_per_minute', 30)}/minute",
    key_func=_rate_limit_key_user,
)
def list_tables(
    request: Request,
    response: Response,
    current_user: Annotated[models.User, Depends(require_permission(Permission.TABLE_READ))],
    session: Session = Depends(get_session),
) -> list[dict]:
    tables = session.exec(
        select(models.Table).where(models.Table.tenant_id == current_user.tenant_id)
    ).all()

    # Resolve assigned waiter names (table-level and floor-level fallback)
    waiter_ids = set()
    floor_ids = set()
    for t in tables:
        if t.assigned_waiter_id:
            waiter_ids.add(t.assigned_waiter_id)
        if t.floor_id:
            floor_ids.add(t.floor_id)

    # Get floors for fallback waiter
    floor_waiter_map: dict[int, int | None] = {}
    if floor_ids:
        floors = session.exec(
            select(models.Floor).where(models.Floor.id.in_(floor_ids))
        ).all()
        for f in floors:
            floor_waiter_map[f.id] = f.default_waiter_id
            if f.default_waiter_id:
                waiter_ids.add(f.default_waiter_id)

    waiter_map: dict[int, str] = {}
    if waiter_ids:
        waiters = session.exec(
            select(models.User).where(models.User.id.in_(waiter_ids))
        ).all()
        waiter_map = {w.id: (w.full_name or w.email) for w in waiters}

    result = []
    for t in tables:
        d = t.model_dump()
        effective_waiter_id = t.assigned_waiter_id or floor_waiter_map.get(t.floor_id)
        d["assigned_waiter_name"] = waiter_map.get(t.assigned_waiter_id) if t.assigned_waiter_id else None
        d["effective_waiter_id"] = effective_waiter_id
        d["effective_waiter_name"] = waiter_map.get(effective_waiter_id) if effective_waiter_id else None
        result.append(d)
    return result


@app.get("/tables/with-status")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_admin_per_minute', 30)}/minute",
    key_func=_rate_limit_key_user,
)
def list_tables_with_status(
    request: Request,
    response: Response,
    current_user: Annotated[models.User, Depends(require_permission(Permission.TABLE_READ))],
    session: Session = Depends(get_session),
) -> list[dict]:
    """List tables with computed status: available, reserved, or occupied. Reserved tables include upcoming_reservation when time is in the future."""
    tables = session.exec(
        select(models.Table).where(models.Table.tenant_id == current_user.tenant_id)
    ).all()
    today_utc = datetime.now(timezone.utc).date()
    now_utc = datetime.now(timezone.utc).time()

    waiter_ids = set()
    floor_ids = set()
    for t in tables:
        if t.assigned_waiter_id:
            waiter_ids.add(t.assigned_waiter_id)
        if t.floor_id:
            floor_ids.add(t.floor_id)

    floor_waiter_map: dict[int, int | None] = {}
    if floor_ids:
        floors = session.exec(
            select(models.Floor).where(models.Floor.id.in_(floor_ids))
        ).all()
        for f in floors:
            floor_waiter_map[f.id] = f.default_waiter_id
            if f.default_waiter_id:
                waiter_ids.add(f.default_waiter_id)

    waiter_map: dict[int, str] = {}
    if waiter_ids:
        waiters = session.exec(
            select(models.User).where(models.User.id.in_(waiter_ids))
        ).all()
        waiter_map = {w.id: (w.full_name or w.email) for w in waiters}

    result = []
    for table in tables:
        active_order = session.exec(
            select(models.Order).where(
                models.Order.table_id == table.id,
                models.Order.status.in_(["pending", "preparing", "ready"]),
            )
        ).first()
        seated_here = session.exec(
            select(models.Reservation).where(
                models.Reservation.table_id == table.id,
                models.Reservation.status == models.ReservationStatus.seated,
            )
        ).first()
        if active_order or seated_here:
            status = "occupied"
            upcoming_reservation = None
        else:
            reserved_here = session.exec(
                select(models.Reservation).where(
                    models.Reservation.table_id == table.id,
                    models.Reservation.status == models.ReservationStatus.booked,
                    models.Reservation.reservation_date >= today_utc,
                )
            ).first()
            status = "reserved" if reserved_here else "available"
            upcoming_reservation = None
            if reserved_here and (reserved_here.reservation_date > today_utc or reserved_here.reservation_time > now_utc):
                upcoming_reservation = {
                    "reservation_id": reserved_here.id,
                    "reservation_time": reserved_here.reservation_time.strftime("%H:%M"),
                    "customer_name": reserved_here.customer_name or "",
                }
        effective_waiter_id = table.assigned_waiter_id or floor_waiter_map.get(table.floor_id)

        row = {
            "id": table.id,
            "name": table.name,
            "token": table.token,
            "tenant_id": table.tenant_id,
            "floor_id": table.floor_id,
            "x_position": table.x_position,
            "y_position": table.y_position,
            "rotation": table.rotation,
            "shape": table.shape,
            "width": table.width,
            "height": table.height,
            "seat_count": table.seat_count,
            "status": status,
            "assigned_waiter_id": table.assigned_waiter_id,
            "assigned_waiter_name": waiter_map.get(table.assigned_waiter_id) if table.assigned_waiter_id else None,
            "effective_waiter_id": effective_waiter_id,
            "effective_waiter_name": waiter_map.get(effective_waiter_id) if effective_waiter_id else None,
        }
        if upcoming_reservation is not None:
            row["upcoming_reservation"] = upcoming_reservation
        result.append(row)

    return result


@app.post("/tables")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_admin_per_minute', 30)}/minute",
    key_func=_rate_limit_key_user,
)
def create_table(
    request: Request,
    table_data: models.TableCreate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.TABLE_WRITE))],
    session: Session = Depends(get_session),
) -> JSONResponse:
    table = models.Table(
        name=table_data.name,
        tenant_id=current_user.tenant_id,
        floor_id=table_data.floor_id,
    )
    session.add(table)
    session.commit()
    session.refresh(table)
    # Return JSONResponse so slowapi can inject rate-limit headers (it requires a Response instance)
    return JSONResponse(
        content=table.model_dump(mode="json"),
        status_code=status.HTTP_201_CREATED,
    )


@app.put("/tables/{table_id}")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_admin_per_minute', 30)}/minute",
    key_func=_rate_limit_key_user,
)
def update_table(
    request: Request,
    table_id: int,
    table_update: models.TableUpdate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.TABLE_WRITE))],
    session: Session = Depends(get_session),
) -> JSONResponse:
    """Update table properties including canvas layout."""
    table = session.exec(
        select(models.Table).where(
            models.Table.id == table_id,
            models.Table.tenant_id == current_user.tenant_id,
        )
    ).first()

    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    # Update all provided fields
    if table_update.name is not None:
        table.name = table_update.name
    if table_update.floor_id is not None:
        table.floor_id = table_update.floor_id
    if table_update.x_position is not None:
        table.x_position = table_update.x_position
    if table_update.y_position is not None:
        table.y_position = table_update.y_position
    if table_update.rotation is not None:
        table.rotation = table_update.rotation
    if table_update.shape is not None:
        table.shape = table_update.shape
    if table_update.width is not None:
        table.width = table_update.width
    if table_update.height is not None:
        table.height = table_update.height
    if table_update.seat_count is not None:
        table.seat_count = table_update.seat_count

    session.add(table)
    session.commit()
    session.refresh(table)
    # Return JSONResponse so slowapi can inject rate-limit headers (it requires a Response instance)
    return JSONResponse(
        content=table.model_dump(mode="json"),
        status_code=status.HTTP_200_OK,
    )


@app.delete("/tables/{table_id}")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_admin_per_minute', 30)}/minute",
    key_func=_rate_limit_key_user,
)
def delete_table(
    request: Request,
    table_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.TABLE_WRITE))],
    session: Session = Depends(get_session),
    reassign_to_table_id: int | None = Query(None, description="Reassign orders and reservations to this table before deleting"),
) -> JSONResponse:
    table = session.exec(
        select(models.Table).where(
            models.Table.id == table_id,
            models.Table.tenant_id == current_user.tenant_id,
        )
    ).first()

    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    has_orders = session.exec(
        select(models.Order).where(
            models.Order.tenant_id == current_user.tenant_id,
            models.Order.table_id == table_id,
        )
    ).first() is not None

    if has_orders and not reassign_to_table_id:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete table: it has orders. Reassign to another table or close orders first.",
        )

    if reassign_to_table_id is not None:
        if reassign_to_table_id == table_id:
            raise HTTPException(status_code=400, detail="Reassign target must be a different table.")
        target = session.exec(
            select(models.Table).where(
                models.Table.id == reassign_to_table_id,
                models.Table.tenant_id == current_user.tenant_id,
            )
        ).first()
        if not target:
            raise HTTPException(status_code=404, detail="Reassign target table not found.")
        # Reassign orders
        orders_linked = session.exec(
            select(models.Order).where(
                models.Order.tenant_id == current_user.tenant_id,
                models.Order.table_id == table_id,
            )
        ).all()
        for order in orders_linked:
            order.table_id = reassign_to_table_id
            session.add(order)
        # Reassign reservations (optional link)
        reservations_linked = session.exec(
            select(models.Reservation).where(
                models.Reservation.tenant_id == current_user.tenant_id,
                models.Reservation.table_id == table_id,
            )
        ).all()
        for res in reservations_linked:
            res.table_id = reassign_to_table_id
            res.updated_at = datetime.now(timezone.utc)
            session.add(res)
    else:
        # No orders: just unlink reservations (set to null) before delete
        reservations_linked = session.exec(
            select(models.Reservation).where(
                models.Reservation.tenant_id == current_user.tenant_id,
                models.Reservation.table_id == table_id,
            )
        ).all()
        for res in reservations_linked:
            res.table_id = None
            res.updated_at = datetime.now(timezone.utc)
            session.add(res)

    session.delete(table)
    session.commit()
    return JSONResponse(
        content={"status": "deleted", "id": table_id},
        status_code=status.HTTP_200_OK,
    )


# ============ RESERVATIONS ============


def _parse_reservation_date(s: str) -> date:
    """Parse YYYY-MM-DD to date. Accepts full ISO datetime strings (takes first 10 chars)."""
    s = s.strip()
    if len(s) < 10:
        raise ValueError(f"Invalid date format: {s!r}. Use YYYY-MM-DD.")
    try:
        return datetime.strptime(s[:10], "%Y-%m-%d").date()
    except ValueError as e:
        raise ValueError(f"Invalid date format: {s[:10]!r}. Use YYYY-MM-DD.") from e


def _parse_reservation_time(s: str) -> time:
    """Parse HH:MM or HH:MM:SS to time. Accepts longer strings (takes first 8 chars for HH:MM:SS)."""
    s = s.strip()
    if len(s) < 5:
        raise ValueError(f"Invalid time format: {s!r}. Use HH:MM or HH:MM:SS.")
    try:
        if len(s) <= 5:
            return datetime.strptime(s[:5], "%H:%M").time()
        return datetime.strptime(s[:8], "%H:%M:%S").time()
    except ValueError as e:
        raise ValueError(f"Invalid time format: {s[:8]!r}. Use HH:MM or HH:MM:SS.") from e


def _closing_time_for_date(tenant: models.Tenant, res_date: date) -> time | None:
    """Return closing time for the given date from tenant opening_hours, or None if closed/no hours."""
    opening_hours: dict = {}
    if tenant.opening_hours:
        try:
            opening_hours = json.loads(tenant.opening_hours)
        except (json.JSONDecodeError, TypeError):
            return None
    day_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    day_key = day_names[res_date.weekday()]
    day_hours = opening_hours.get(day_key, {})
    if day_hours.get("closed", False) or not day_hours.get("open") or not day_hours.get("close"):
        return None
    close_str = day_hours.get("eveningClose") or day_hours.get("close")
    if not close_str:
        return None
    try:
        parts = close_str.split(":")
        close_h, close_m = int(parts[0]), int(parts[1]) if len(parts) > 1 else 0
        return time(close_h, close_m)
    except (ValueError, AttributeError):
        return None


def _reservation_time_allowed_before_closing(reservation_time: time, closing_time: time) -> bool:
    """True if reservation_time is at least 1 hour before closing_time."""
    close_mins = closing_time.hour * 60 + closing_time.minute
    last_mins = (close_mins - 60) % (24 * 60)
    res_mins = reservation_time.hour * 60 + reservation_time.minute
    return res_mins <= last_mins


def _reservation_to_dict(
    r: models.Reservation, session: Session | None = None, include_client_tech: bool = False
) -> dict:
    """Serialize reservation for JSON (date/time as ISO strings). Includes table_name when table_id set if session provided.
    include_client_tech: when True (staff), include client_ip, user_agent, fingerprint, screen; never expose to public."""
    out = {
        "id": r.id,
        "tenant_id": r.tenant_id,
        "customer_name": r.customer_name,
        "customer_phone": r.customer_phone,
        "customer_email": r.customer_email,
        "reservation_date": r.reservation_date.isoformat() if r.reservation_date else None,
        "reservation_time": r.reservation_time.strftime("%H:%M") if r.reservation_time else None,
        "party_size": r.party_size,
        "status": r.status.value,
        "table_id": r.table_id,
        "token": r.token,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        "client_notes": r.client_notes,
        "customer_notes": getattr(r, "customer_notes", None),
        "owner_notes": r.owner_notes,
        "delay_notice": getattr(r, "delay_notice", None),
    }
    if session and r.table_id is not None:
        table = session.get(models.Table, r.table_id)
        out["table_name"] = table.name if table else None
    else:
        out["table_name"] = None
    if include_client_tech:
        out["client_ip"] = r.client_ip
        out["client_user_agent"] = r.client_user_agent
        out["client_fingerprint"] = r.client_fingerprint
        out["client_screen_width"] = r.client_screen_width
        out["client_screen_height"] = r.client_screen_height
    return out


def _capacity_for_tenant(session: Session, tenant_id: int) -> tuple[int, int]:
    """Return (total_seats, total_tables) for the tenant."""
    tables = session.exec(
        select(models.Table).where(models.Table.tenant_id == tenant_id)
    ).all()
    total_seats = sum(t.seat_count for t in tables)
    return (total_seats, len(tables))


def _demand_for_slot(
    session: Session,
    tenant_id: int,
    slot_date: date,
    slot_time: time,
    exclude_reservation_id: int | None = None,
) -> tuple[int, int]:
    """Return (reserved_guests, reserved_parties) for the slot. Active = booked, seated."""
    q = select(models.Reservation).where(
        models.Reservation.tenant_id == tenant_id,
        models.Reservation.reservation_date == slot_date,
        models.Reservation.reservation_time == slot_time,
        models.Reservation.status.in_([models.ReservationStatus.booked, models.ReservationStatus.seated]),
    )
    if exclude_reservation_id is not None:
        q = q.where(models.Reservation.id != exclude_reservation_id)
    reservations = session.exec(q).all()
    reserved_guests = sum(r.party_size for r in reservations)
    return (reserved_guests, len(reservations))


@app.get("/reservations/slot-capacity")
def get_slot_capacity(
    current_user: Annotated[models.User, Depends(require_permission(Permission.RESERVATION_READ))],
    session: Session = Depends(get_session),
    date_str: str = Query(..., description="Date YYYY-MM-DD"),
    time_str: str = Query(..., description="Time HH:MM"),
    exclude_reservation_id: int | None = Query(None, description="Exclude this reservation (for edit)"),
) -> dict:
    """Capacity and demand for one slot (for create/edit form). Staff only."""
    try:
        d = _parse_reservation_date(date_str)
        slot_time = _parse_reservation_time(time_str)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    tenant_id = current_user.tenant_id
    total_seats, total_tables = _capacity_for_tenant(session, tenant_id)
    reserved_guests, reserved_parties = _demand_for_slot(
        session, tenant_id, d, slot_time, exclude_reservation_id=exclude_reservation_id
    )
    return {
        "total_seats": total_seats,
        "total_tables": total_tables,
        "reserved_guests": reserved_guests,
        "reserved_parties": reserved_parties,
        "seats_left": max(0, total_seats - reserved_guests),
        "tables_left": max(0, total_tables - reserved_parties),
    }


@app.get("/reservations/upcoming-no-table-count")
def get_upcoming_reservations_no_table_count(
    current_user: Annotated[models.User, Depends(require_permission(Permission.RESERVATION_READ))],
    session: Session = Depends(get_session),
    date_str: str = Query(..., description="Date YYYY-MM-DD (e.g. reservation date for seat modal)"),
    reservation_id: int | None = Query(None, description="If seating this reservation, exclude it and count others at same time or later"),
) -> dict:
    """Count of other booked reservations on the given date with no table assigned (for seat modal warning). Staff only."""
    try:
        d = _parse_reservation_date(date_str)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    tenant_id = current_user.tenant_id

    q = select(models.Reservation).where(
        models.Reservation.tenant_id == tenant_id,
        models.Reservation.reservation_date == d,
        models.Reservation.status == models.ReservationStatus.booked,
        models.Reservation.table_id.is_(None),
    )
    if reservation_id is not None:
        res = session.exec(
            select(models.Reservation).where(
                models.Reservation.id == reservation_id,
                models.Reservation.tenant_id == tenant_id,
            )
        ).first()
        if res:
            q = q.where(models.Reservation.id != reservation_id)
            q = q.where(models.Reservation.reservation_time >= res.reservation_time)
        # else reservation not found; count all
    else:
        today_utc = datetime.now(timezone.utc).date()
        now_utc = datetime.now(timezone.utc).time()
        if d == today_utc:
            q = q.where(models.Reservation.reservation_time > now_utc)

    count = len(session.exec(q).all())
    return {"count": count}


@app.get("/reservations/overbooking-report")
def get_reservations_overbooking_report(
    current_user: Annotated[models.User, Depends(require_permission(Permission.RESERVATION_READ))],
    session: Session = Depends(get_session),
    date_str: str = Query(..., description="Date YYYY-MM-DD"),
    time_from: str | None = Query(None, description="Start time HH:MM (optional)"),
    time_to: str | None = Query(None, description="End time HH:MM (optional)"),
) -> dict:
    """Per-slot overbooking metrics for the given date. Staff only."""
    try:
        d = _parse_reservation_date(date_str)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    tenant_id = current_user.tenant_id
    total_seats, total_tables = _capacity_for_tenant(session, tenant_id)

    # Collect slot times: distinct reservation times on that date, or default 08:00–23:00 in 15-min steps
    reservations_on_date = session.exec(
        select(models.Reservation.reservation_time).where(
            models.Reservation.tenant_id == tenant_id,
            models.Reservation.reservation_date == d,
            models.Reservation.status.in_([models.ReservationStatus.booked, models.ReservationStatus.seated]),
        ).distinct()
    ).all()
    slot_times_set: set[time] = set(reservations_on_date)
    if not slot_times_set:
        for h in range(8, 23):
            for m in (0, 15, 30, 45):
                slot_times_set.add(time(h, m))
    slot_times = sorted(slot_times_set)

    time_from_parsed: time | None = None
    time_to_parsed: time | None = None
    if time_from:
        try:
            time_from_parsed = _parse_reservation_time(time_from)
        except ValueError:
            pass
    if time_to:
        try:
            time_to_parsed = _parse_reservation_time(time_to)
        except ValueError:
            pass
    if time_from_parsed is not None:
        slot_times = [t for t in slot_times if t >= time_from_parsed]
    if time_to_parsed is not None:
        slot_times = [t for t in slot_times if t <= time_to_parsed]

    slots = []
    for slot_time in slot_times:
        reserved_guests, reserved_parties = _demand_for_slot(session, tenant_id, d, slot_time)
        over_seats = reserved_guests > total_seats
        over_tables = reserved_parties > total_tables
        slots.append({
            "reservation_time": slot_time.strftime("%H:%M"),
            "total_seats": total_seats,
            "total_tables": total_tables,
            "reserved_guests": reserved_guests,
            "reserved_parties": reserved_parties,
            "over_seats": over_seats,
            "over_tables": over_tables,
        })
    return {
        "date": d.isoformat(),
        "total_seats": total_seats,
        "total_tables": total_tables,
        "slots": slots,
    }


def _client_ip_from_request(request: Request) -> str | None:
    """Client IP: X-Forwarded-For (first hop) or request.client.host."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


def _send_reservation_confirmation_background(tenant_id: int, reservation_id: int) -> None:
    """Background task: load tenant and reservation, send confirmation email (public bookings only)."""
    with Session(engine) as session:
        tenant = session.get(models.Tenant, tenant_id)
        reservation = session.get(models.Reservation, reservation_id)
        if not tenant or not reservation:
            logger.warning("Reservation confirmation skipped: tenant_id=%s reservation_id=%s not found", tenant_id, reservation_id)
            return
        if not (reservation.customer_email and reservation.customer_email.strip()):
            logger.info("Reservation confirmation skipped: reservation_id=%s has no customer_email", reservation_id)
            return
        if not tenant.smtp_user or not tenant.smtp_password:
            logger.warning(
                "Reservation confirmation skipped: tenant_id=%s (name=%s) has no SMTP configured (smtp_user/smtp_password). "
                "Configure Email settings in Settings → Email for this tenant, or set global SMTP_* in config.env.",
                tenant_id,
                tenant.name,
            )
            return
        view_url = None
        if settings.public_app_base_url and reservation.token:
            view_url = f"{settings.public_app_base_url.rstrip('/')}/reservation?token={reservation.token}"
        date_str = reservation.reservation_date.isoformat() if reservation.reservation_date else ""
        time_str = reservation.reservation_time.strftime("%H:%M") if reservation.reservation_time else ""
        try:
            asyncio.run(
                email_svc.send_reservation_confirmation(
                    to_email=reservation.customer_email.strip(),
                    customer_name=reservation.customer_name,
                    reservation_date=date_str,
                    reservation_time=time_str,
                    party_size=reservation.party_size,
                    tenant_name=tenant.name,
                    view_url=view_url,
                    tenant=tenant,
                )
            )
            logger.info("Reservation confirmation email sent for reservation_id=%s to %s", reservation_id, reservation.customer_email.strip())
        except Exception as e:
            logger.exception("Reservation confirmation email failed for reservation_id=%s: %s", reservation_id, e)


@app.post("/reservations")
def create_reservation(
    request: Request,
    body: models.ReservationCreate,
    current_user: Annotated[models.User | None, Depends(security.get_current_user_optional)],
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
) -> dict:
    """Create a reservation. Authenticated: tenant from user. Public: tenant_id required in body."""
    if current_user:
        tenant_id = current_user.tenant_id
        data = body
    else:
        if body.tenant_id is None:
            raise HTTPException(status_code=400, detail="tenant_id required for public booking")
        tenant_id = body.tenant_id
        data = body
    # Validate tenant exists
    tenant = session.get(models.Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    try:
        res_date = _parse_reservation_date(data.reservation_date)
        res_time = _parse_reservation_time(data.reservation_time)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    # Reject past date/time (use business timezone if configured, else UTC)
    tz = ZoneInfo(tenant.timezone) if tenant.timezone else timezone.utc
    now_local = datetime.now(tz)
    if res_date < now_local.date():
        raise HTTPException(status_code=400, detail="Reservation date must be today or in the future")
    if res_date == now_local.date():
        if res_time <= now_local.time():
            raise HTTPException(status_code=400, detail="Reservation time must be in the future")
    # Only accept reservations until 1 hour before closing
    closing_time = _closing_time_for_date(tenant, res_date)
    if closing_time is not None and not _reservation_time_allowed_before_closing(res_time, closing_time):
        raise HTTPException(
            status_code=400,
            detail=f"Reservations are only accepted until 1 hour before closing (closing at {closing_time.strftime('%H:%M')}).",
        )
    total_seats, total_tables = _capacity_for_tenant(session, tenant_id)
    reserved_guests, reserved_parties = _demand_for_slot(session, tenant_id, res_date, res_time, exclude_reservation_id=None)
    if reserved_guests + data.party_size > total_seats or reserved_parties + 1 > total_tables:
        raise HTTPException(
            status_code=400,
            detail=f"Slot is over capacity: {reserved_guests + data.party_size} guests / {reserved_parties + 1} parties for this time (max {total_seats} seats, {total_tables} tables).",
        )
    token_str = str(uuid4()) if not current_user else None
    client_ip = _client_ip_from_request(request)
    user_agent = (request.headers.get("user-agent") or "")[:512]
    reservation = models.Reservation(
        tenant_id=tenant_id,
        customer_name=data.customer_name,
        customer_phone=data.customer_phone,
        customer_email=data.customer_email,
        reservation_date=res_date,
        reservation_time=res_time,
        party_size=data.party_size,
        status=models.ReservationStatus.booked,
        token=token_str,
        client_notes=data.client_notes,
        customer_notes=getattr(data, "customer_notes", None),
        owner_notes=None,
        client_ip=client_ip,
        client_user_agent=user_agent or None,
        client_fingerprint=data.client_fingerprint,
        client_screen_width=data.client_screen_width,
        client_screen_height=data.client_screen_height,
    )
    session.add(reservation)
    session.commit()
    session.refresh(reservation)
    # Send confirmation email for public bookings when customer email and tenant SMTP are set
    if not current_user and reservation.customer_email and reservation.customer_email.strip() and reservation.token:
        background_tasks.add_task(_send_reservation_confirmation_background, tenant_id, reservation.id)
    out = _reservation_to_dict(reservation, session, include_client_tech=current_user is not None)
    publish_reservation_update(tenant_id, {"type": "new_reservation", "reservation": out})
    return out


@app.get("/reservations")
def list_reservations(
    current_user: Annotated[models.User, Depends(require_permission(Permission.RESERVATION_READ))],
    session: Session = Depends(get_session),
    reservation_date: str | None = Query(None, description="Filter by date YYYY-MM-DD"),
    status: str | None = Query(None, description="Filter by status"),
    phone: str | None = Query(None, description="Search by phone (partial)"),
) -> list[dict]:
    """List reservations for the tenant. Staff only."""
    q = select(models.Reservation).where(models.Reservation.tenant_id == current_user.tenant_id)
    if reservation_date:
        try:
            d = _parse_reservation_date(reservation_date)
            q = q.where(models.Reservation.reservation_date == d)
        except ValueError:
            pass
    if status:
        q = q.where(models.Reservation.status == status)
    if phone and phone.strip():
        q = q.where(models.Reservation.customer_phone.contains(phone.strip()))
    q = q.order_by(models.Reservation.reservation_date, models.Reservation.reservation_time)
    reservations = session.exec(q).all()
    return [_reservation_to_dict(r, session, include_client_tech=True) for r in reservations]


@app.get("/reservations/prefill-by-phone")
def get_reservation_prefill_by_phone(
    current_user: Annotated[models.User, Depends(require_permission(Permission.RESERVATION_READ))],
    session: Session = Depends(get_session),
    phone: str = Query(..., min_length=1, description="Customer phone (partial match)"),
) -> dict:
    """Return the most recent reservation for this tenant matching the phone, for pre-filling a new reservation form. Staff only."""
    if not phone or not phone.strip():
        raise HTTPException(status_code=400, detail="Phone is required")
    q = (
        select(models.Reservation)
        .where(models.Reservation.tenant_id == current_user.tenant_id)
        .where(models.Reservation.customer_phone.contains(phone.strip()))
        .order_by(
            models.Reservation.reservation_date.desc(),
            models.Reservation.reservation_time.desc(),
        )
        .limit(1)
    )
    r = session.exec(q).first()
    if not r:
        raise HTTPException(status_code=404, detail="No previous reservation found for this phone")
    return _reservation_to_dict(r, session, include_client_tech=False)


@app.get("/reservations/next-available")
def get_next_available_reservation_time(
    tenant_id: int = Query(...),
    date_str: str = Query(..., alias="date"),
    party_size: int = Query(2, ge=1, le=100, description="Party size for capacity check"),
    session: Session = Depends(get_session),
) -> dict:
    """Public: find the next slot with capacity (by seats and table count)."""
    tenant = session.get(models.Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    tz = ZoneInfo(tenant.timezone) if tenant.timezone else timezone.utc
    now_local = datetime.now(tz)
    total_seats, total_tables = _capacity_for_tenant(session, tenant_id)

    opening_hours = {}
    if tenant.opening_hours:
        try:
            opening_hours = json.loads(tenant.opening_hours)
        except (json.JSONDecodeError, TypeError):
            pass

    day_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

    try:
        check_date = _parse_reservation_date(date_str)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    for day_offset in range(8):
        d = check_date + timedelta(days=day_offset)
        day_key = day_names[d.weekday()]
        day_hours = opening_hours.get(day_key, {})

        if day_hours.get("closed", False) or not day_hours.get("open") or not day_hours.get("close"):
            continue

        try:
            open_h, open_m = map(int, day_hours["open"].split(":"))
            close_str = day_hours.get("eveningClose") or day_hours["close"]
            close_h, close_m = map(int, close_str.split(":"))
        except (ValueError, AttributeError, KeyError):
            continue

        closing_time = time(close_h, close_m)

        for slot_hour in range(open_h, close_h + 1):
            for slot_min in (0, 15, 30, 45):
                if slot_hour == close_h and slot_min >= close_m:
                    break
                slot_time = time(slot_hour, slot_min)

                if not _reservation_time_allowed_before_closing(slot_time, closing_time):
                    continue

                if d == now_local.date() and slot_time <= now_local.time():
                    continue

                reserved_guests, reserved_parties = _demand_for_slot(session, tenant_id, d, slot_time, exclude_reservation_id=None)
                if reserved_guests + party_size <= total_seats and reserved_parties + 1 <= total_tables:
                    return {
                        "date": d.isoformat(),
                        "time": slot_time.strftime("%H:%M"),
                    }

    raise HTTPException(status_code=404, detail="No available time slots found")


@app.get("/reservations/by-token")
def get_reservation_by_token(
    token: str = Query(..., description="Reservation token from booking confirmation"),
    session: Session = Depends(get_session),
) -> dict:
    """Public: get one reservation by token (for view/cancel)."""
    reservation = session.exec(
        select(models.Reservation).where(models.Reservation.token == token)
    ).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return _reservation_to_dict(reservation, session)


@app.get("/reservations/{reservation_id}")
def get_reservation(
    reservation_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.RESERVATION_READ))],
    session: Session = Depends(get_session),
) -> dict:
    """Get one reservation by id. Staff only."""
    reservation = session.exec(
        select(models.Reservation).where(
            models.Reservation.id == reservation_id,
            models.Reservation.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return _reservation_to_dict(reservation, session, include_client_tech=True)


@app.put("/reservations/{reservation_id}")
def update_reservation(
    reservation_id: int,
    body: models.ReservationUpdate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.RESERVATION_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    """Update reservation. Only when status is booked. Staff only."""
    reservation = session.exec(
        select(models.Reservation).where(
            models.Reservation.id == reservation_id,
            models.Reservation.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if reservation.status != models.ReservationStatus.booked:
        raise HTTPException(status_code=400, detail="Can only edit reservations that are booked")
    if body.customer_name is not None:
        reservation.customer_name = body.customer_name
    if body.customer_phone is not None:
        reservation.customer_phone = body.customer_phone
    if body.customer_email is not None:
        reservation.customer_email = body.customer_email
    if body.client_notes is not None:
        reservation.client_notes = body.client_notes
    if body.customer_notes is not None:
        reservation.customer_notes = body.customer_notes
    if body.owner_notes is not None:
        reservation.owner_notes = body.owner_notes
    if body.delay_notice is not None:
        reservation.delay_notice = body.delay_notice
    if body.reservation_date is not None:
        reservation.reservation_date = _parse_reservation_date(body.reservation_date)
    if body.reservation_time is not None:
        reservation.reservation_time = _parse_reservation_time(body.reservation_time)
    if body.party_size is not None:
        reservation.party_size = body.party_size
    # Only accept reservations until 1 hour before closing
    tenant = session.get(models.Tenant, reservation.tenant_id)
    if tenant:
        closing_time = _closing_time_for_date(tenant, reservation.reservation_date)
        if closing_time is not None and not _reservation_time_allowed_before_closing(
            reservation.reservation_time, closing_time
        ):
            raise HTTPException(
                status_code=400,
                detail=f"Reservations are only accepted until 1 hour before closing (closing at {closing_time.strftime('%H:%M')}).",
            )
    total_seats, total_tables = _capacity_for_tenant(session, current_user.tenant_id)
    reserved_guests, reserved_parties = _demand_for_slot(
        session,
        current_user.tenant_id,
        reservation.reservation_date,
        reservation.reservation_time,
        exclude_reservation_id=reservation_id,
    )
    if reserved_guests + reservation.party_size > total_seats or reserved_parties + 1 > total_tables:
        raise HTTPException(
            status_code=400,
            detail=f"Slot is over capacity: {reserved_guests + reservation.party_size} guests / {reserved_parties + 1} parties for this time (max {total_seats} seats, {total_tables} tables).",
        )
    reservation.updated_at = datetime.now(timezone.utc)
    session.add(reservation)
    session.commit()
    session.refresh(reservation)
    out = _reservation_to_dict(reservation, session, include_client_tech=True)
    publish_reservation_update(current_user.tenant_id, {"type": "reservation_updated", "reservation": out})
    return out


@app.put("/reservations/{reservation_id}/status")
def update_reservation_status(
    reservation_id: int,
    body: models.ReservationStatusUpdate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.RESERVATION_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    """Update reservation status (e.g. cancel, seat, finish). Staff only."""
    reservation = session.exec(
        select(models.Reservation).where(
            models.Reservation.id == reservation_id,
            models.Reservation.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if body.status == models.ReservationStatus.cancelled:
        reservation.status = models.ReservationStatus.cancelled
        reservation.table_id = None
    elif body.status == models.ReservationStatus.no_show:
        reservation.status = models.ReservationStatus.no_show
        reservation.table_id = None
    elif body.status == models.ReservationStatus.finished:
        reservation.status = models.ReservationStatus.finished
        reservation.table_id = None
    else:
        reservation.status = body.status
    reservation.updated_at = datetime.now(timezone.utc)
    session.add(reservation)
    session.commit()
    session.refresh(reservation)
    out = _reservation_to_dict(reservation, session, include_client_tech=True)
    publish_reservation_update(current_user.tenant_id, {"type": "reservation_status", "reservation": out})
    return out


@app.put("/reservations/{reservation_id}/seat")
def seat_reservation(
    reservation_id: int,
    body: models.ReservationSeat,
    current_user: Annotated[models.User, Depends(require_permission(Permission.RESERVATION_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    """Assign table to reservation (seat the party). Staff only."""
    reservation = session.exec(
        select(models.Reservation).where(
            models.Reservation.id == reservation_id,
            models.Reservation.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if reservation.status != models.ReservationStatus.booked:
        raise HTTPException(status_code=400, detail="Reservation must be booked to seat")
    table = session.exec(
        select(models.Table).where(
            models.Table.id == body.table_id,
            models.Table.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    if table.seat_count < reservation.party_size:
        raise HTTPException(status_code=400, detail="Table capacity is less than party size")
    # Check table not already occupied or reserved by another
    active_order = session.exec(
        select(models.Order).where(
            models.Order.table_id == table.id,
            models.Order.status.in_(["pending", "preparing", "ready"]),
        )
    ).first()
    if active_order:
        raise HTTPException(status_code=400, detail="Table is already occupied")
    other_reserved = session.exec(
        select(models.Reservation).where(
            models.Reservation.table_id == table.id,
            models.Reservation.status == models.ReservationStatus.booked,
            models.Reservation.id != reservation_id,
        )
    ).first()
    if other_reserved:
        raise HTTPException(status_code=400, detail="Table is already reserved")
    reservation.table_id = body.table_id
    reservation.status = models.ReservationStatus.seated
    reservation.updated_at = datetime.now(timezone.utc)
    session.add(reservation)
    session.commit()
    session.refresh(reservation)
    out = _reservation_to_dict(reservation, session, include_client_tech=True)
    publish_reservation_update(current_user.tenant_id, {"type": "reservation_seated", "reservation": out})
    return out


@app.put("/reservations/{reservation_id}/finish")
def finish_reservation(
    reservation_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.RESERVATION_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    """Clear table assignment and mark reservation finished. Staff only."""
    reservation = session.exec(
        select(models.Reservation).where(
            models.Reservation.id == reservation_id,
            models.Reservation.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    reservation.status = models.ReservationStatus.finished
    reservation.table_id = None
    reservation.updated_at = datetime.now(timezone.utc)
    session.add(reservation)
    session.commit()
    session.refresh(reservation)
    out = _reservation_to_dict(reservation, session, include_client_tech=True)
    publish_reservation_update(current_user.tenant_id, {"type": "reservation_finished", "reservation": out})
    return out


@app.put("/reservations/{reservation_id}/cancel")
def cancel_reservation_public(
    reservation_id: int,
    token: str = Query(..., description="Reservation token"),
    session: Session = Depends(get_session),
) -> dict:
    """Public: cancel reservation with token."""
    reservation = session.exec(
        select(models.Reservation).where(
            models.Reservation.id == reservation_id,
            models.Reservation.token == token,
        )
    ).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if reservation.status == models.ReservationStatus.cancelled:
        return _reservation_to_dict(reservation, session)
    reservation.status = models.ReservationStatus.cancelled
    reservation.table_id = None
    reservation.updated_at = datetime.now(timezone.utc)
    session.add(reservation)
    session.commit()
    session.refresh(reservation)
    out = _reservation_to_dict(reservation, session)
    publish_reservation_update(reservation.tenant_id, {"type": "reservation_cancelled", "reservation": out})
    return out


@app.put("/reservations/{reservation_id}/public")
def update_reservation_public(
    reservation_id: int,
    token: str = Query(..., description="Reservation token from booking confirmation"),
    body: models.PublicReservationUpdate | None = Body(None),
    session: Session = Depends(get_session),
) -> dict:
    """Public: update reservation by token (delay notice, reservation notes, customer notes). Only when status is booked."""
    reservation = session.exec(
        select(models.Reservation).where(
            models.Reservation.id == reservation_id,
            models.Reservation.token == token,
        )
    ).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if reservation.status != models.ReservationStatus.booked:
        raise HTTPException(status_code=400, detail="Can only update a booked reservation")
    if body:
        if body.delay_notice is not None:
            reservation.delay_notice = body.delay_notice.strip() if isinstance(body.delay_notice, str) and body.delay_notice.strip() else None
        if body.client_notes is not None:
            reservation.client_notes = body.client_notes.strip() if isinstance(body.client_notes, str) and body.client_notes.strip() else None
        if body.customer_notes is not None:
            reservation.customer_notes = body.customer_notes.strip() if isinstance(body.customer_notes, str) and body.customer_notes.strip() else None
    reservation.updated_at = datetime.now(timezone.utc)
    session.add(reservation)
    session.commit()
    session.refresh(reservation)
    out = _reservation_to_dict(reservation, session)
    publish_reservation_update(reservation.tenant_id, {"type": "reservation_updated", "reservation": out})
    return out


@app.post("/reservations/{reservation_id}/send-reminder")
async def send_reservation_reminder(
    reservation_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.RESERVATION_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    """Send a reminder for an upcoming reservation via email and/or WhatsApp. Staff only.
    Requires at least one of customer_email or customer_phone (when WhatsApp is configured)."""
    reservation = session.exec(
        select(models.Reservation).where(
            models.Reservation.id == reservation_id,
            models.Reservation.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if reservation.status != models.ReservationStatus.booked:
        raise HTTPException(status_code=400, detail="Can only send reminders for booked reservations")

    has_email = bool(reservation.customer_email and reservation.customer_email.strip())
    has_phone = bool(reservation.customer_phone and reservation.customer_phone.strip())
    whatsapp_ok = whatsapp_svc.is_whatsapp_configured()

    if not has_email and not (has_phone and whatsapp_ok):
        raise HTTPException(
            status_code=400,
            detail="Reservation has no email address and no phone for WhatsApp reminder (or WhatsApp is not configured)",
        )

    tenant = session.get(models.Tenant, reservation.tenant_id)
    tenant_name = tenant.name if tenant else "Restaurant"
    date_str = reservation.reservation_date.isoformat() if reservation.reservation_date else ""
    time_str = reservation.reservation_time.strftime("%H:%M") if reservation.reservation_time else ""
    default_country = settings.default_phone_country or "ES"
    if tenant and tenant.timezone:
        # Optional: derive country from timezone (e.g. Europe/Madrid -> ES); for now use global default
        pass

    email_sent = False
    whatsapp_sent = False
    to_email = reservation.customer_email.strip() if has_email else None
    to_phone = None

    if has_email:
        view_url = None
        if reservation.token and settings.public_app_base_url:
            base = settings.public_app_base_url.rstrip("/")
            view_url = f"{base}/reservation?token={reservation.token}"
        ok = await email_svc.send_reservation_reminder(
            to_email=reservation.customer_email.strip(),
            customer_name=reservation.customer_name,
            reservation_date=date_str,
            reservation_time=time_str,
            party_size=reservation.party_size,
            tenant_name=tenant_name,
            view_url=view_url,
            tenant=tenant,
        )
        email_sent = ok

    if has_phone and whatsapp_ok:
        ok_wa = await whatsapp_svc.send_reservation_reminder_whatsapp_async(
            to_phone=reservation.customer_phone.strip(),
            customer_name=reservation.customer_name,
            reservation_date=date_str,
            reservation_time=time_str,
            party_size=reservation.party_size,
            tenant_name=tenant_name,
            default_country=default_country,
        )
        whatsapp_sent = ok_wa
        if ok_wa:
            normalized = normalize_phone_to_e164(reservation.customer_phone.strip(), default_country)
            to_phone = normalized

    # Mark both reminder slots as sent so the autonomous heartbeat won't send again
    now_utc = datetime.now(timezone.utc)
    reservation.reminder_24h_sent_at = now_utc
    reservation.reminder_2h_sent_at = now_utc
    session.add(reservation)
    session.commit()

    return {
        "email_sent": email_sent,
        "whatsapp_sent": whatsapp_sent,
        "to_email": to_email,
        "to_phone": to_phone,
    }


# ============ TABLE SESSION MANAGEMENT ============


@app.post("/tables/{table_id}/activate")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_admin_per_minute', 30)}/minute",
    key_func=_rate_limit_key_user,
)
def activate_table(
    request: Request,
    table_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.TABLE_ACTIVATE))],
    session: Session = Depends(get_session),
) -> dict:
    """
    Activate a table for ordering.
    Generates a PIN; no order is created until the first item is added via the menu.
    """
    import secrets

    table = session.exec(
        select(models.Table).where(
            models.Table.id == table_id,
            models.Table.tenant_id == current_user.tenant_id,
        )
    ).first()

    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    # Generate a cryptographically random 4-digit PIN
    pin = str(secrets.randbelow(9000) + 1000)

    # Activate table only; order is created when customer adds first items via POST /menu/.../order
    table.order_pin = pin
    table.is_active = True
    table.active_order_id = None
    table.activated_at = datetime.now(timezone.utc)

    session.commit()
    session.refresh(table)

    return JSONResponse(content={
        "id": table.id,
        "name": table.name,
        "pin": pin,
        "is_active": True,
        "active_order_id": None,
        "activated_at": table.activated_at.isoformat() if table.activated_at else None,
    })


@app.post("/tables/{table_id}/close")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_admin_per_minute', 30)}/minute",
    key_func=_rate_limit_key_user,
)
def close_table(
    request: Request,
    table_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.TABLE_ACTIVATE))],
    session: Session = Depends(get_session),
) -> dict:
    """
    Close a table session.
    Clears the PIN and deactivates the table. Deletes the active order if it has no items.
    """
    table = session.exec(
        select(models.Table).where(
            models.Table.id == table_id,
            models.Table.tenant_id == current_user.tenant_id,
        )
    ).first()

    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    # If there is an active order with no (active) items, delete it so we don't keep empty orders
    if table.active_order_id:
        order = session.get(models.Order, table.active_order_id)
        if order:
            all_items = session.exec(
                select(models.OrderItem).where(models.OrderItem.order_id == order.id)
            ).all()
            active_count = sum(
                1 for it in all_items
                if not it.removed_by_customer and it.removed_by_user_id is None and it.status != models.OrderItemStatus.cancelled
            )
            if active_count == 0:
                for it in all_items:
                    session.delete(it)
                session.delete(order)

    # Clear session data
    table.order_pin = None
    table.is_active = False
    table.active_order_id = None

    session.commit()
    session.refresh(table)

    # Notify connected customers via WebSocket that the table has been closed
    publish_order_update(
        tenant_id=current_user.tenant_id,
        order_data={"type": "table_closed", "table_id": table_id},
        table_id=table_id,
    )

    return JSONResponse(content={
        "id": table.id,
        "name": table.name,
        "is_active": False,
        "message": "Table closed successfully",
    })


@app.post("/tables/{table_id}/regenerate-pin")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_admin_per_minute', 30)}/minute",
    key_func=_rate_limit_key_user,
)
def regenerate_table_pin(
    request: Request,
    table_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.TABLE_ACTIVATE))],
    session: Session = Depends(get_session),
) -> dict:
    """
    Generate a new PIN for an active table without closing it.
    Useful when staff suspects PIN has been shared.
    """
    import secrets

    table = session.exec(
        select(models.Table).where(
            models.Table.id == table_id,
            models.Table.tenant_id == current_user.tenant_id,
        )
    ).first()

    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    if not table.is_active:
        raise HTTPException(status_code=400, detail="Table is not active. Activate it first.")

    # Generate a cryptographically random 4-digit PIN
    pin = str(secrets.randbelow(9000) + 1000)
    table.order_pin = pin

    session.commit()
    session.refresh(table)

    return JSONResponse(content={
        "id": table.id,
        "name": table.name,
        "pin": pin,
        "is_active": True,
    })


@app.put("/tables/{table_id}/assign-waiter")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_admin_per_minute', 30)}/minute",
    key_func=_rate_limit_key_user,
)
def assign_waiter_to_table(
    request: Request,
    table_id: int,
    body: dict,
    current_user: Annotated[models.User, Depends(require_permission(Permission.TABLE_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    """Assign a waiter to a specific table. Send waiter_id=null to unassign."""
    table = session.exec(
        select(models.Table).where(
            models.Table.id == table_id,
            models.Table.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    waiter_id = body.get("waiter_id")
    if waiter_id is not None:
        waiter = session.exec(
            select(models.User).where(
                models.User.id == waiter_id,
                models.User.tenant_id == current_user.tenant_id,
                models.User.role == models.UserRole.waiter,
            )
        ).first()
        if not waiter:
            raise HTTPException(status_code=400, detail="Waiter not found or not a waiter role")
        table.assigned_waiter_id = waiter.id
    else:
        table.assigned_waiter_id = None

    session.add(table)
    session.commit()
    session.refresh(table)

    # Resolve waiter name for response
    waiter_name = None
    if table.assigned_waiter_id:
        w = session.get(models.User, table.assigned_waiter_id)
        waiter_name = w.full_name or w.email if w else None

    return JSONResponse(content={
        "table_id": table.id,
        "assigned_waiter_id": table.assigned_waiter_id,
        "assigned_waiter_name": waiter_name,
    })


@app.get("/tables/{table_id}/staff-menu-token")
def get_staff_menu_token(
    table_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.ORDER_READ))],
    session: Session = Depends(get_session),
) -> dict:
    """Return a short-lived token for opening the public menu for this table without PIN (staff link)."""
    table = session.exec(
        select(models.Table).where(
            models.Table.id == table_id,
            models.Table.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    token = _sign_staff_menu_token(table.token)
    return {
        "token": token,
        "table_token": table.token,
        "expires_in": STAFF_MENU_TOKEN_EXPIRY,
    }


# ============ INTERNAL VALIDATION (for ws-bridge) ============

@app.get("/internal/validate-table/{table_token}")
def validate_table_token(
    table_token: str,
    session: Session = Depends(get_session)
) -> dict:
    """Internal endpoint for ws-bridge to validate table tokens."""
    table = session.exec(select(models.Table).where(models.Table.token == table_token)).first()
    
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    return {
        "table_id": table.id,
        "tenant_id": table.tenant_id,
        "valid": True
    }


# ============ PUBLIC MENU ============


@app.get("/menu/{table_token}")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_public_menu_per_minute', 30)}/minute"
)
def get_menu(
    request: Request,
    table_token: str,
    staff_access: str | None = Query(None, description="Staff link token: when valid, PIN is not required"),
    lang: str = Depends(_get_requested_language),
    session: Session = Depends(get_session),
) -> dict:
    """Public endpoint - get menu for a table by its token."""
    if staff_access and not _verify_staff_menu_token(table_token, staff_access):
        logger.warning("Menu staff_access token invalid or expired for table_token=%s", table_token[:8] + "...")
    # Use raw SQL to avoid SQLAlchemy model issues
    from sqlalchemy import text

    try:
        result = session.execute(
            text("""
            SELECT id, tenant_id, name, token, is_active, order_pin, active_order_id
            FROM "table"
            WHERE token = :token
        """),
            {"token": table_token},
        )
        table_row = result.fetchone()
        print(f"[DEBUG] Query result: {table_row}")
    except Exception as e:
        print(f"[DEBUG] Query error: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    if not table_row:
        print(f"[DEBUG] Table not found for token: {table_token}")
        raise HTTPException(status_code=404, detail="Table not found")

    # Create a simple object with the needed attributes
    class TableData:
        def __init__(self, id, tenant_id, name, token, is_active, order_pin, active_order_id):
            self.id = id
            self.tenant_id = tenant_id
            self.name = name
            self.token = token
            self.is_active = is_active or False
            self.order_pin = order_pin
            self.active_order_id = active_order_id

    table = TableData(
        table_row[0],
        table_row[1],
        table_row[2],
        table_row[3],
        table_row[4],
        table_row[5],
        table_row[6],
    )

    if not table.is_active:
        # Return tenant/table info so the frontend can show a branded "table closed" page
        tenant = session.exec(
            select(models.Tenant).where(models.Tenant.id == table.tenant_id)
        ).first()
        raise HTTPException(
            status_code=403,
            detail={
                "code": "TABLE_CLOSED",
                "message": "This table is currently closed.",
                "table_name": table.name,
                "tenant_name": tenant.name if tenant else None,
                "tenant_logo": tenant.logo_filename if tenant else None,
                "tenant_header_background_filename": tenant.header_background_filename if tenant else None,
                "tenant_id": table.tenant_id,
                "tenant_public_background_color": tenant.public_background_color if tenant else None,
            },
        )

    # Get products from TenantProduct (new catalog system) and Product (legacy)
    tenant_products = session.exec(
        select(models.TenantProduct).where(
            models.TenantProduct.tenant_id == table.tenant_id,
            models.TenantProduct.is_active == True,
        )
    ).all()

    legacy_products = session.exec(
        select(models.Product).where(models.Product.tenant_id == table.tenant_id)
    ).all()

    tenant = session.exec(
        select(models.Tenant).where(models.Tenant.id == table.tenant_id)
    ).first()

    # Customer-facing: only show products available today (within available_from..available_until)
    try:
        tz = ZoneInfo(tenant.timezone) if tenant and tenant.timezone else timezone.utc
    except Exception:
        tz = timezone.utc
    today = datetime.now(tz).date()
    def _is_available(available_from, available_until):
        if available_from is not None and available_from > today:
            return False
        if available_until is not None and available_until < today:
            return False
        return True
    tenant_products = [tp for tp in tenant_products if _is_available(tp.available_from, tp.available_until)]
    legacy_products = [p for p in legacy_products if _is_available(p.available_from, p.available_until)]

    # Load product questions for all effective product IDs (for customization e.g. doneness, spice level)
    effective_product_ids = [tp.product_id for tp in tenant_products if tp.product_id is not None]
    effective_product_ids.extend(lp.id for lp in legacy_products)
    questions_by_product: dict[int, list[dict]] = {}
    if effective_product_ids:
        product_questions = session.exec(
            select(models.ProductQuestion).where(
                models.ProductQuestion.tenant_id == table.tenant_id,
                models.ProductQuestion.product_id.in_(effective_product_ids),
            ).order_by(models.ProductQuestion.sort_order, models.ProductQuestion.id)
        ).all()
        for q in product_questions:
            questions_by_product.setdefault(q.product_id, []).append({
                "id": q.id,
                "type": q.type.value if hasattr(q.type, "value") else str(q.type),
                "label": q.label,
                "options": q.options,
                "required": q.required,
            })

    # Combine products from both sources
    products_list = []

    # Add TenantProducts (from catalog)
    for tp in tenant_products:
        # Get image from provider product if available, otherwise use tenant product image
        image_filename = tp.image_filename
        provider_product = None
        catalog_item = None

        # Get catalog item for description
        catalog_item = session.exec(
            select(models.ProductCatalog).where(
                models.ProductCatalog.id == tp.catalog_id
            )
        ).first()

        # Get provider product for detailed wine info
        if tp.provider_product_id:
            provider_product = session.exec(
                select(models.ProviderProduct).where(
                    models.ProviderProduct.id == tp.provider_product_id
                )
            ).first()
            if provider_product and provider_product.image_filename:
                provider = session.exec(
                    select(models.Provider).where(
                        models.Provider.id == provider_product.provider_id
                    )
                ).first()
                if provider:
                    # Construct path to provider image
                    image_filename = f"providers/{provider.token}/products/{provider_product.image_filename}"

        # Build product data with detailed wine information
        product_data = {
            "id": tp.id,
            "name": tp.name or "",
            "price_cents": tp.price_cents,
            "image_filename": image_filename,
            "tenant_id": tp.tenant_id,
            "ingredients": tp.ingredients,
            "_source": "tenant_product",  # Indicate this is from TenantProduct table
        }

        # Get the actual product record to check for customized description
        if tp.product_id:
            custom_product = session.get(models.Product, tp.product_id)
            if custom_product and custom_product.description:
                product_data["description"] = custom_product.description

        # Add translations for tenant product
        if lang != "en":  # Only add if different from default
            display_name = TranslationService.get_translated_field(
                session,
                table.tenant_id,
                "tenant_product",
                tp.id,
                "name",
                lang,
                tp.name or "",
            )
            if display_name != (tp.name or ""):
                product_data["display_name"] = display_name

            if tp.ingredients:
                display_ingredients = TranslationService.get_translated_field(
                    session,
                    table.tenant_id,
                    "tenant_product",
                    tp.id,
                    "ingredients",
                    lang,
                    tp.ingredients,
                )
                if display_ingredients != tp.ingredients:
                    product_data["display_ingredients"] = display_ingredients

        # Add catalog category, subcategory and description
        # Use codes for internationalization
        if catalog_item:
            if catalog_item.category:
                from .category_codes import get_category_code

                product_data["category"] = catalog_item.category
                product_data["category_code"] = get_category_code(catalog_item.category)
            if catalog_item.subcategory:
                product_data["subcategory"] = catalog_item.subcategory
            if catalog_item.description and not product_data.get("description"):
                product_data["description"] = catalog_item.description

                # Add translated description if available
                if lang != "en":
                    display_description = TranslationService.get_translated_field(
                        session,
                        table.tenant_id,
                        "product_catalog",
                        catalog_item.id,
                        "description",
                        lang,
                        catalog_item.description,
                    )
                    if display_description != catalog_item.description:
                        product_data["display_description"] = display_description

        # Extract wine type - use API category ID first, but check description for conflicts
        wine_type = None
        description_wine_type = None

        # Get description text first to check for conflicts
        description_text = ""
        if provider_product and provider_product.detailed_description:
            description_text = provider_product.detailed_description.lower()
        elif catalog_item and catalog_item.description:
            description_text = catalog_item.description.lower()

        # Extract wine type from description
        if description_text:
            if "vino blanco" in description_text:
                description_wine_type = "White Wine"
            elif "vino tinto" in description_text:
                description_wine_type = "Red Wine"
            elif "espumoso" in description_text or "cava" in description_text:
                description_wine_type = "Sparkling Wine"
            elif "rosado" in description_text or "rosé" in description_text:
                description_wine_type = "Rosé Wine"

        # First, use the category ID from provider product (direct from API)
        category_wine_type = None
        if provider_product and provider_product.wine_category_id:
            from app.seeds.wine_import import get_category_name

            category_wine_type = get_category_name(
                provider_product.wine_category_id, None
            )
            # If we got a valid wine type, use it
            if category_wine_type and category_wine_type == "Wine":
                category_wine_type = None

        # If description explicitly contradicts category, trust description (more reliable)
        if description_wine_type and category_wine_type:
            if description_wine_type != category_wine_type:
                # Description contradicts category - trust description
                wine_type = description_wine_type
            else:
                # They match - use category (from API)
                wine_type = category_wine_type
        elif description_wine_type:
            # Only description available
            wine_type = description_wine_type
        elif category_wine_type:
            # Only category available
            wine_type = category_wine_type

        # If still no wine type, try subcategory as last resort
        if not wine_type and catalog_item and catalog_item.subcategory:
            # Subcategory format: "Red Wine - D.O. Empordà - Wine by Glass"
            # Extract first part before first " - "
            subcategory_parts = catalog_item.subcategory.split(" - ")
            first_part = subcategory_parts[0].strip()
            # Check if it's a known wine type
            wine_types = [
                "Red Wine",
                "White Wine",
                "Sparkling Wine",
                "Rosé Wine",
                "Sweet Wine",
                "Fortified Wine",
            ]
            if first_part in wine_types:
                wine_type = first_part
            # Also check for Spanish terms
            elif "Red" in first_part or "Tinto" in first_part or "Tintos" in first_part:
                wine_type = "Red Wine"
            elif (
                "White" in first_part
                or "Blanco" in first_part
                or "Blancos" in first_part
            ):
                wine_type = "White Wine"
            elif (
                "Sparkling" in first_part
                or "Espumoso" in first_part
                or "Cava" in first_part
            ):
                wine_type = "Sparkling Wine"
            elif "Rosé" in first_part or "Rosado" in first_part:
                wine_type = "Rosé Wine"

        # Now build subcategory_codes AFTER wine_type is determined
        # This ensures wine_type takes precedence over subcategory string
        subcategory_codes = []

        # First, extract all non-wine-type codes from subcategory (e.g., WINE_BY_GLASS)
        if catalog_item and catalog_item.subcategory:
            from .category_codes import (
                get_all_subcategory_codes,
                extract_wine_type_code,
            )

            all_codes = get_all_subcategory_codes(catalog_item.subcategory)
            # Remove wine type codes - we'll add the correct one based on wine_type
            wine_type_codes = [
                "WINE_RED",
                "WINE_WHITE",
                "WINE_SPARKLING",
                "WINE_ROSE",
                "WINE_SWEET",
                "WINE_FORTIFIED",
            ]
            for code in all_codes:
                if code not in wine_type_codes:
                    subcategory_codes.append(code)

        # Add the correct wine type code based on determined wine_type
        if wine_type:
            product_data["wine_type"] = wine_type
            from .category_codes import extract_wine_type_code

            wine_type_code = extract_wine_type_code(wine_type)
            if wine_type_code and wine_type_code not in subcategory_codes:
                subcategory_codes.append(wine_type_code)

        # Set subcategory_codes if we have any
        if subcategory_codes:
            product_data["subcategory_codes"] = subcategory_codes

        # Product customization questions (e.g. doneness, spice level)
        if tp.product_id is not None:
            product_data["questions"] = questions_by_product.get(tp.product_id, [])
        else:
            product_data["questions"] = []

        # Add detailed wine information from provider product
        if provider_product:
            if provider_product.detailed_description:
                product_data["detailed_description"] = (
                    provider_product.detailed_description
                )
            if provider_product.country:
                product_data["country"] = provider_product.country
            if provider_product.region:
                product_data["region"] = provider_product.region
            if provider_product.wine_style:
                product_data["wine_style"] = provider_product.wine_style
            if provider_product.vintage:
                product_data["vintage"] = provider_product.vintage
            if provider_product.winery:
                product_data["winery"] = provider_product.winery
            if provider_product.grape_variety:
                product_data["grape_variety"] = provider_product.grape_variety
            if provider_product.aromas:
                product_data["aromas"] = provider_product.aromas
            if provider_product.elaboration:
                product_data["elaboration"] = provider_product.elaboration

        products_list.append(product_data)

    # Add legacy Products
    for lp in legacy_products:
        product_data = {
            "id": lp.id,
            "name": lp.name,
            "price_cents": lp.price_cents,
            "description": lp.description,
            "image_filename": lp.image_filename,
            "tenant_id": lp.tenant_id,
            "ingredients": lp.ingredients,
            "category": lp.category,
            "subcategory": lp.subcategory,
            "_source": "product",
        }

        # Add translations for legacy product
        if lang != "en":
            display_name = TranslationService.get_translated_field(
                session, table.tenant_id, "product", lp.id, "name", lang, lp.name or ""
            )
            if display_name != (lp.name or ""):
                product_data["display_name"] = display_name

            if lp.ingredients:
                display_ingredients = TranslationService.get_translated_field(
                    session,
                    table.tenant_id,
                    "product",
                    lp.id,
                    "ingredients",
                    lang,
                    lp.ingredients,
                )
                if display_ingredients != lp.ingredients:
                    product_data["display_ingredients"] = display_ingredients

        # Add category and subcategory if they exist
        if lp.category:
            product_data["category"] = lp.category
            from .category_codes import get_category_code

            product_data["category_code"] = get_category_code(lp.category)

        if lp.subcategory:
            product_data["subcategory"] = lp.subcategory
            from .category_codes import get_all_subcategory_codes

            subcategory_codes = get_all_subcategory_codes(lp.subcategory)
            if subcategory_codes:
                product_data["subcategory_codes"] = subcategory_codes

        # Product customization questions
        product_data["questions"] = questions_by_product.get(lp.id, [])

        products_list.append(product_data)

    # Build tenant response data
    tenant_data = {
        "table_name": table.name,
        "table_id": table.id,
        "tenant_id": table.tenant_id,  # For WebSocket connection
        "tenant_name": tenant.name if tenant else "Unknown",
        "tenant_logo": tenant.logo_filename if tenant else None,
        "tenant_header_background_filename": tenant.header_background_filename if tenant else None,
        "tenant_description": tenant.description if tenant else None,
        "tenant_phone": tenant.phone if tenant else None,
        "tenant_whatsapp": tenant.whatsapp if tenant else None,
        "tenant_address": tenant.address if tenant else None,
        "tenant_website": tenant.website if tenant else None,
        "tenant_currency": tenant.currency if tenant else None,
        "tenant_currency_code": tenant.currency_code if tenant else None,
        "tenant_stripe_publishable_key": tenant.stripe_publishable_key
        if tenant
        else None,
        "tenant_revolut_configured": bool(
            tenant
            and (
                (tenant.revolut_merchant_secret and tenant.revolut_merchant_secret.strip())
                or (settings.revolut_merchant_secret and settings.revolut_merchant_secret.strip())
            )
        ),
        "tenant_immediate_payment_required": tenant.immediate_payment_required
        if tenant
        else False,
        "tenant_public_background_color": tenant.public_background_color if tenant else None,
        # Table session status (take-away/home ordering tables do not require PIN; staff_access also skips PIN)
        "table_is_active": table.is_active,
        "table_requires_pin": False
        if _is_take_away_table(table)
        or (staff_access and _verify_staff_menu_token(table.token, staff_access))
        else (table.is_active and table.order_pin is not None),
        "active_order_id": table.active_order_id,
        "products": products_list,
    }

    # Add translations for tenant fields if requested language differs from default
    if tenant and lang != "en":
        # Translate tenant name
        display_name = TranslationService.get_translated_field(
            session, tenant.id, "tenant", tenant.id, "name", lang, tenant.name or ""
        )
        if display_name != (tenant.name or ""):
            tenant_data["display_tenant_name"] = display_name

        # Translate tenant description
        if tenant.description:
            display_description = TranslationService.get_translated_field(
                session,
                tenant.id,
                "tenant",
                tenant.id,
                "description",
                lang,
                tenant.description,
            )
            if display_description != tenant.description:
                tenant_data["display_tenant_description"] = display_description

        # Translate tenant address
        if tenant.address:
            display_address = TranslationService.get_translated_field(
                session, tenant.id, "tenant", tenant.id, "address", lang, tenant.address
            )
            if display_address != tenant.address:
                tenant_data["display_tenant_address"] = display_address

    return JSONResponse(content=tenant_data)


@app.get("/menu/{table_token}/order")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_public_menu_per_minute', 30)}/minute"
)
def get_current_order(
    request: Request,
    table_token: str,
    session_id: str | None = Query(None, description="Session identifier for order isolation"),
    session: Session = Depends(get_session),
) -> dict:
    """Public endpoint - get current active order for a table (if any)."""
    table = session.exec(
        select(models.Table).where(models.Table.token == table_token)
    ).first()

    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    active_order = None

    # Prefer the table's shared active order (created when staff activates the table).
    # This is the canonical order for the PIN-based shared-order model.
    if table.active_order_id:
        shared_order = session.get(models.Order, table.active_order_id)
        if (
            shared_order
            and shared_order.status != models.OrderStatus.paid
            and "[PAID:" not in (shared_order.notes or "")
        ):
            active_order = shared_order

    # Fallback: search by session_id or any unpaid order (backward compatibility
    # for tables activated before the shared-order model was introduced).
    if not active_order:
        if session_id:
            potential_orders = session.exec(
                select(models.Order).where(
                    models.Order.table_id == table.id,
                    models.Order.session_id == session_id,
                    models.Order.status != models.OrderStatus.paid
                ).order_by(models.Order.created_at.desc())
            ).all()
        else:
            potential_orders = session.exec(
                select(models.Order).where(
                    models.Order.table_id == table.id,
                    models.Order.status != models.OrderStatus.paid
                ).order_by(models.Order.created_at.desc())
            ).all()

        for order in potential_orders:
            if order.status == models.OrderStatus.paid:
                continue
            if "[PAID:" not in (order.notes or ""):
                active_order = order
                break

    # Table shared order: when no order matched session_id, use table's active order so customer sees current order
    if not active_order and table.active_order_id:
        active_order = session.get(models.Order, table.active_order_id)
        if active_order and active_order.status == models.OrderStatus.paid:
            active_order = None
        if active_order and "[PAID:" in (active_order.notes or ""):
            active_order = None

    if not active_order:
        return JSONResponse(content={"order": None})

    # Get order items (exclude removed items for customer view)
    # Order by ID descending so newest items appear first (for customer view)
    items = session.exec(
        select(models.OrderItem).where(
            models.OrderItem.order_id == active_order.id,
            models.OrderItem.removed_by_customer == False
        ).order_by(models.OrderItem.id.desc())
    ).all()
    
    # Compute order status from items
    all_items = session.exec(select(models.OrderItem).where(models.OrderItem.order_id == active_order.id)).all()
    computed_status = compute_order_status_from_items(all_items)

    payload = {
        "order": {
            "id": active_order.id,
            "status": computed_status.value,
            "notes": active_order.notes,
            "session_id": active_order.session_id,
            "customer_name": active_order.customer_name,
            "created_at": active_order.created_at.isoformat(),
            "items": [
                {
                    "id": item.id,
                    "product_id": item.product_id,
                    "product_name": item.product_name,
                    "quantity": item.quantity,
                    "price_cents": item.price_cents,
                    "notes": item.notes,
                    "customization_answers": getattr(item, "customization_answers", None) or None,
                    "status": item.status.value if hasattr(item.status, "value") else str(item.status),
                    "tax_rate_percent": getattr(item, "tax_rate_percent", None),
                    "tax_amount_cents": getattr(item, "tax_amount_cents", None),
                }
                for item in items
            ],
            "total_cents": sum(item.price_cents * item.quantity for item in items),
        }
    }
    return JSONResponse(content=payload)


@app.get("/menu/{table_token}/order-history")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_public_menu_per_minute', 30)}/minute"
)
def get_table_order_history(
    request: Request,
    table_token: str,
    limit: int = Query(10, ge=1, le=50),
    session: Session = Depends(get_session),
) -> list[dict]:
    """Public endpoint - recent paid/completed orders for this table (for customer order history)."""
    table = session.exec(
        select(models.Table).where(models.Table.token == table_token)
    ).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    orders = session.exec(
        select(models.Order)
        .where(
            models.Order.table_id == table.id,
            models.Order.deleted_at.is_(None),
            models.Order.status.in_([models.OrderStatus.paid, models.OrderStatus.completed]),
        )
        .order_by(models.Order.created_at.desc())
        .limit(limit)
    ).all()

    result = []
    for order in orders:
        items = session.exec(
            select(models.OrderItem).where(
                models.OrderItem.order_id == order.id,
                models.OrderItem.removed_by_customer == False,
            )
        ).all()
        total_cents = sum(item.price_cents * item.quantity for item in items)
        result.append({
            "id": order.id,
            "status": order.status.value,
            "created_at": order.created_at.isoformat(),
            "paid_at": order.paid_at.isoformat() if order.paid_at else None,
            "items": [
                {
                    "id": item.id,
                    "product_name": item.product_name,
                    "quantity": item.quantity,
                    "price_cents": item.price_cents,
                    "customization_answers": getattr(item, "customization_answers", None) or None,
                }
                for item in items
            ],
            "total_cents": total_cents,
        })
    return JSONResponse(content=result)


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the distance in meters between two GPS coordinates using Haversine formula."""
    import math
    R = 6371000  # Earth's radius in meters
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


def _get_effective_tax(
    session: Session,
    tenant_id: int,
    product_tax_id: int | None,
    as_of: date | None = None,
) -> models.Tax | None:
    """
    Resolve the tax to apply for a product: product override or tenant default, valid at as_of date.
    Returns the Tax row or None (meaning 0% / exempt).
    """
    as_of = as_of or date.today()
    tax_id = product_tax_id
    if not tax_id:
        tenant = session.get(models.Tenant, tenant_id)
        if tenant and getattr(tenant, "default_tax_id", None):
            tax_id = tenant.default_tax_id
    if not tax_id:
        return None
    tax = session.get(models.Tax, tax_id)
    if not tax or tax.tenant_id != tenant_id:
        return None
    if tax.valid_from and as_of < tax.valid_from:
        return None
    if tax.valid_to is not None and as_of > tax.valid_to:
        return None
    return tax


def _tax_amount_cents_inclusive(price_cents: int, quantity: int, rate_percent: int) -> int:
    """Tax amount from tax-inclusive price. rate_percent e.g. 10, 21, 0."""
    if rate_percent <= 0:
        return 0
    total_incl = price_cents * quantity
    return round(total_incl * rate_percent / (100 + rate_percent))


@app.post("/menu/{table_token}/order")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_public_menu_per_minute', 30)}/minute"
)
def create_order(
    table_token: str,
    order_data: models.OrderCreate,
    request: Request,
    session: Session = Depends(get_session),
) -> dict:
    """Public endpoint - add items to the table's shared order."""
    table = session.exec(
        select(models.Table).where(models.Table.token == table_token)
    ).first()

    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    if not order_data.items:
        raise HTTPException(status_code=400, detail="Order must have at least one item")

    # Get tenant for location verification
    tenant = session.get(models.Tenant, table.tenant_id)

    # ============ TABLE ACTIVATION & PIN VALIDATION ============
    # Check if table is active (staff has opened it)
    if not table.is_active:
        raise HTTPException(
            status_code=403, 
            detail="Table is not accepting orders. Please ask staff to activate the table."
        )

    # Validate PIN (with rate limiting). Skip for take-away/home ordering tables or valid staff_access.
    staff_skip_pin = order_data.staff_access and _verify_staff_menu_token(table_token, order_data.staff_access)
    if not _is_take_away_table(table) and not staff_skip_pin:
        redis_conn = get_redis()
        attempts_key = None
        lock_key = None
        if redis_conn:
            client_key = get_pin_client_key(request, order_data.session_id)
            attempts_key = f"pin_attempts:{table_token}:{client_key}"
            lock_key = f"pin_lock:{table_token}:{client_key}"
            lock_ttl = redis_conn.ttl(lock_key)
            if lock_ttl and lock_ttl > 0:
                raise HTTPException(
                    status_code=429,
                    detail=f"Too many PIN attempts. Try again in {lock_ttl} seconds."
                )
        else:
            logger.warning(
                "Redis is unavailable -- PIN rate limiting is disabled. "
                "Brute-force protection will not work until Redis is restored."
            )

        if not order_data.pin:
            raise HTTPException(
                status_code=403,
                detail="PIN required. Please enter the table PIN to place an order."
            )

        if order_data.pin != table.order_pin:
            if redis_conn and attempts_key and lock_key:
                attempts = redis_conn.incr(attempts_key)
                if attempts == 1:
                    redis_conn.expire(attempts_key, PIN_ATTEMPT_WINDOW_SECONDS)
                if attempts >= PIN_MAX_ATTEMPTS:
                    redis_conn.setex(lock_key, PIN_LOCKOUT_SECONDS, "1")
                    redis_conn.delete(attempts_key)
                    raise HTTPException(
                        status_code=429,
                        detail=f"Too many PIN attempts. Try again in {PIN_LOCKOUT_SECONDS} seconds."
                    )
            raise HTTPException(
                status_code=403,
                detail="Invalid PIN. Please check the PIN displayed at your table."
            )

        if redis_conn and attempts_key and lock_key:
            redis_conn.delete(attempts_key)
            redis_conn.delete(lock_key)

    # ============ GET OR CREATE SHARED ORDER ============
    # Order is created when table is activated only as a slot; we create it on first item add.
    # If no active order yet, we will create one below (requires at least one item).
    order = None
    if table.active_order_id:
        order = session.get(models.Order, table.active_order_id)
        if order and order.status == models.OrderStatus.paid:
            order = None  # Will create a new order below if we have items

    if order is None:
        # No order yet, or previous order was paid: create new order only if customer is adding items
        if not order_data.items or len(order_data.items) == 0:
            raise HTTPException(
                status_code=400,
                detail="Add at least one product to place an order.",
            )
        new_order = models.Order(
            table_id=table.id,
            tenant_id=table.tenant_id,
            status=models.OrderStatus.pending,
            session_id=None,
        )
        session.add(new_order)
        session.flush()
        table.active_order_id = new_order.id
        session.add(table)
        session.flush()
        order = new_order
        is_new_order = True
    else:
        is_new_order = False

    print(f"\n{'=' * 60}")
    print(f"[DEBUG] POST /menu/{table_token}/order")
    print(f"[DEBUG] Table: id={table.id}, name={table.name}, is_active={table.is_active}")
    print(f"[DEBUG] Using shared order #{order.id}")

    # ============ LOCATION VERIFICATION ============
    location_flagged = False
    if tenant and tenant.location_check_enabled and tenant.latitude and tenant.longitude:
        if order_data.latitude is not None and order_data.longitude is not None:
            distance = haversine_distance(
                tenant.latitude, tenant.longitude,
                order_data.latitude, order_data.longitude
            )
            print(f"[DEBUG] Location check: customer at {order_data.latitude}, {order_data.longitude}")
            print(f"[DEBUG] Distance from restaurant: {distance:.0f}m (radius: {tenant.location_radius_meters}m)")
            
            if distance > tenant.location_radius_meters:
                location_flagged = True
                order.flagged_for_review = True
                order.flag_reason = f"Order placed from {distance:.0f}m away (limit: {tenant.location_radius_meters}m)"
                print(f"[DEBUG] ORDER FLAGGED: {order.flag_reason}")
        else:
            print(f"[DEBUG] Location not provided by customer")
    
    # Update customer name if provided (for display purposes)
    if order_data.customer_name and not order.customer_name:
        order.customer_name = order_data.customer_name

    # Append notes if provided
    if order_data.notes:
        order.notes = f"{order.notes or ''}\n{order_data.notes}".strip()

    print(f"[DEBUG] Final order #{order.id}, status={order.status!r}")
    print(f"{'=' * 60}\n")
    
    is_new_order = False  # We're always adding to existing shared order

    # Add order items
    order_date = order.created_at.date() if order.created_at else date.today()
    for item in order_data.items:
        # Use source indicator if provided, otherwise try TenantProduct first, then legacy Product
        product_name = None
        price_cents = None
        cost_cents: int | None = None
        product_tax_id: int | None = None
        effective_product_id: int  # Must be Product.id (OrderItem.product_id FK references product.id)

        if item.source == "tenant_product":
            # Explicitly look up TenantProduct (menu sends TenantProduct.id as product_id)
            tenant_product = session.exec(
                select(models.TenantProduct).where(
                    models.TenantProduct.id == item.product_id,
                    models.TenantProduct.tenant_id == table.tenant_id
                )
            ).first()
            if not tenant_product:
                raise HTTPException(status_code=400, detail=f"TenantProduct {item.product_id} not found")
            product_name = tenant_product.name
            price_cents = tenant_product.price_cents
            cost_cents = getattr(tenant_product, "cost_cents", None)
            product_tax_id = getattr(tenant_product, "tax_id", None)
            if tenant_product.product_id is not None:
                effective_product_id = tenant_product.product_id
            else:
                # TenantProduct not yet linked to Product (e.g. catalog-only) - create Product and link
                new_product = models.Product(
                    name=tenant_product.name,
                    price_cents=tenant_product.price_cents,
                    cost_cents=cost_cents,
                    tenant_id=table.tenant_id,
                )
                session.add(new_product)
                session.flush()
                effective_product_id = new_product.id
                tenant_product.product_id = new_product.id
                session.add(tenant_product)
        elif item.source == "product":
            # Explicitly look up legacy Product
            product = session.exec(
                select(models.Product).where(
                    models.Product.id == item.product_id,
                    models.Product.tenant_id == table.tenant_id,
                )
            ).first()
            if not product:
                raise HTTPException(status_code=400, detail=f"Product {item.product_id} not found")
            product_name = product.name
            price_cents = product.price_cents
            cost_cents = getattr(product, "cost_cents", None)
            product_tax_id = getattr(product, "tax_id", None)
            effective_product_id = product.id
        else:
            # No source specified - try TenantProduct first, then fallback to legacy Product
            tenant_product = session.exec(
                select(models.TenantProduct).where(
                    models.TenantProduct.id == item.product_id,
                    models.TenantProduct.tenant_id == table.tenant_id
                )
            ).first()

            if tenant_product:
                product_name = tenant_product.name
                price_cents = tenant_product.price_cents
                cost_cents = getattr(tenant_product, "cost_cents", None)
                product_tax_id = getattr(tenant_product, "tax_id", None)
                if tenant_product.product_id is not None:
                    effective_product_id = tenant_product.product_id
                else:
                    new_product = models.Product(
                        name=tenant_product.name,
                        price_cents=tenant_product.price_cents,
                        cost_cents=cost_cents,
                        tenant_id=table.tenant_id,
                    )
                    session.add(new_product)
                    session.flush()
                    effective_product_id = new_product.id
                    tenant_product.product_id = new_product.id
                    session.add(tenant_product)
            else:
                # Fallback to legacy Product table
                product = session.exec(
                    select(models.Product).where(
                        models.Product.id == item.product_id,
                        models.Product.tenant_id == table.tenant_id
                    )
                ).first()
                if not product:
                    raise HTTPException(status_code=400, detail=f"Product {item.product_id} not found")
                product_name = product.name
                price_cents = product.price_cents
                cost_cents = getattr(product, "cost_cents", None)
                product_tax_id = getattr(product, "tax_id", None)
                effective_product_id = product.id

        # Resolve tax for this line (product override or tenant default)
        effective_tax = _get_effective_tax(session, table.tenant_id, product_tax_id, order_date)
        tax_id = effective_tax.id if effective_tax else None
        tax_rate = effective_tax.rate_percent if effective_tax else 0
        line_tax_cents = _tax_amount_cents_inclusive(price_cents, item.quantity, tax_rate) if effective_tax else 0

        # Check if this product already exists in the order with same customization (only active, non-removed items)
        # Match by effective_product_id and same customization_answers so we merge only when preferences match
        item_answers = (item.customization_answers or {}) if hasattr(item, "customization_answers") else {}
        existing_items = session.exec(
            select(models.OrderItem).where(
                models.OrderItem.order_id == order.id,
                models.OrderItem.product_id == effective_product_id,
                models.OrderItem.removed_by_customer == False,
                models.OrderItem.status != models.OrderItemStatus.delivered
            )
        ).all()
        existing_item = None
        for ei in existing_items:
            ei_answers = ei.customization_answers or {}
            if ei_answers == item_answers:
                existing_item = ei
                break

        if existing_item:
            existing_item.quantity += item.quantity
            if item.notes:
                existing_item.notes = (
                    f"{existing_item.notes or ''}, {item.notes}".strip(", ")
                )
            if location_flagged:
                existing_item.location_flagged = True
            # Recompute tax for new total quantity
            existing_item.tax_id = tax_id
            existing_item.tax_rate_percent = tax_rate if effective_tax else None
            existing_item.tax_amount_cents = _tax_amount_cents_inclusive(
                price_cents, existing_item.quantity, tax_rate
            ) if effective_tax else None
            session.add(existing_item)
        else:
            order_item = models.OrderItem(
                order_id=order.id,
                product_id=effective_product_id,
                product_name=product_name,
                quantity=item.quantity,
                price_cents=price_cents,
                cost_cents=cost_cents,
                notes=item.notes,
                customization_answers=item_answers if item_answers else None,
                status=models.OrderItemStatus.pending,
                added_by_session=order_data.session_id,
                location_flagged=location_flagged,
                tax_id=tax_id,
                tax_rate_percent=tax_rate if effective_tax else None,
                tax_amount_cents=line_tax_cents if effective_tax else None,
            )
            session.add(order_item)
    
    # After adding items, recompute order status from all items (if not paid or cancelled)
    # This ensures correct status like 'partially_delivered' when there are both delivered and undelivered items
    if order.status not in [models.OrderStatus.paid, models.OrderStatus.cancelled]:
        all_items = session.exec(select(models.OrderItem).where(models.OrderItem.order_id == order.id)).all()
        computed_status = compute_order_status_from_items(all_items)
        order.status = computed_status
        print(f"[DEBUG] Recomputed order status from items: {computed_status.value}")
    
    session.commit()
    session.refresh(order)

    # Auto-deduct inventory if enabled for tenant
    tenant = session.get(models.Tenant, table.tenant_id)
    if tenant and getattr(tenant, "inventory_tracking_enabled", False):
        try:
            deduct_inventory_for_order(session, order, tenant)
            session.commit()
            logger.info(f"Inventory deducted for order #{order.id}")
        except Exception as e:
            # Log but don't fail the order - inventory can go negative
            logger.warning(f"Inventory deduction warning for order #{order.id}: {e}")

    # Publish to Redis for real-time updates
    publish_order_update(table.tenant_id, {
        "type": "new_order" if is_new_order else "items_added",
        "order_id": order.id,
        "table_name": table.name,
        "status": order.status.value,
        "created_at": order.created_at.isoformat()
    }, table_id=table.id)

    return JSONResponse(content={
        "status": "created" if is_new_order else "updated",
        "order_id": order.id,
        "session_id": order.session_id,
        "customer_name": order.customer_name,
    })


# ============ PUBLIC: PAYMENT REQUEST & CALL WAITER ============


class PaymentRequest(_BaseModel):
    payment_method: str  # 'cash', 'card_terminal'
    message: str | None = None  # Optional message/observation from customer


@app.post("/menu/{table_token}/order/{order_id}/request-payment")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_public_menu_per_minute', 30)}/minute"
)
def request_payment(
    request: Request,
    table_token: str,
    order_id: int,
    payment_request: PaymentRequest,
    session: Session = Depends(get_session),
) -> dict:
    """
    Public endpoint - customer requests payment via cash or card terminal.
    Notifies staff via WebSocket so they can come to the table.
    """
    table = session.exec(
        select(models.Table).where(models.Table.token == table_token)
    ).first()

    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    if not table.is_active:
        raise HTTPException(status_code=403, detail="Table is not active.")

    order = session.get(models.Order, order_id)
    if not order or order.table_id != table.id:
        raise HTTPException(status_code=404, detail="Order not found for this table.")

    if order.status == models.OrderStatus.paid:
        raise HTTPException(status_code=400, detail="Order is already paid.")

    # Store the requested payment method on the order
    order.payment_method = payment_request.payment_method

    # Append customer message to notes if provided
    if payment_request.message:
        order.notes = f"{order.notes or ''}\n[CUSTOMER NOTE] {payment_request.message}".strip()

    session.commit()
    session.refresh(order)

    # Resolve assigned waiter (table-level, then floor-level fallback)
    effective_waiter_id = table.assigned_waiter_id
    effective_waiter_name = None
    if not effective_waiter_id and table.floor_id:
        floor = session.get(models.Floor, table.floor_id)
        if floor:
            effective_waiter_id = floor.default_waiter_id
    if effective_waiter_id:
        waiter = session.get(models.User, effective_waiter_id)
        if waiter:
            effective_waiter_name = waiter.full_name or waiter.email

    # Notify staff via WebSocket
    publish_order_update(table.tenant_id, {
        "type": "payment_requested",
        "order_id": order.id,
        "table_name": table.name,
        "table_id": table.id,
        "payment_method": payment_request.payment_method,
        "message": payment_request.message,
        "assigned_waiter_id": effective_waiter_id,
        "assigned_waiter_name": effective_waiter_name,
    }, table_id=table.id)

    return JSONResponse(content={
        "status": "payment_requested",
        "order_id": order.id,
        "payment_method": payment_request.payment_method,
    })


class CallWaiterRequest(_BaseModel):
    message: str | None = None  # Optional message/reason


@app.post("/menu/{table_token}/call-waiter")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_public_menu_per_minute', 30)}/minute"
)
def call_waiter(
    request: Request,
    table_token: str,
    waiter_request: CallWaiterRequest,
    session: Session = Depends(get_session),
) -> dict:
    """
    Public endpoint - customer requests a waiter to come to the table.
    Sends a real-time notification to staff via WebSocket.
    """
    table = session.exec(
        select(models.Table).where(models.Table.token == table_token)
    ).first()

    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    if not table.is_active:
        raise HTTPException(status_code=403, detail="Table is not active.")

    # Resolve assigned waiter (table-level, then floor-level fallback)
    effective_waiter_id = table.assigned_waiter_id
    effective_waiter_name = None
    if not effective_waiter_id and table.floor_id:
        floor = session.get(models.Floor, table.floor_id)
        if floor:
            effective_waiter_id = floor.default_waiter_id
    if effective_waiter_id:
        waiter = session.get(models.User, effective_waiter_id)
        if waiter:
            effective_waiter_name = waiter.full_name or waiter.email

    # Notify staff via WebSocket
    publish_order_update(table.tenant_id, {
        "type": "call_waiter",
        "table_name": table.name,
        "table_id": table.id,
        "message": waiter_request.message,
        "assigned_waiter_id": effective_waiter_id,
        "assigned_waiter_name": effective_waiter_name,
    }, table_id=table.id)

    return JSONResponse(content={
        "status": "waiter_called",
        "table_name": table.name,
    })


# ============ ORDERS (Protected) ============

def compute_order_status_from_items(items: list[models.OrderItem]) -> models.OrderStatus:
    """Compute order status from item statuses (single source of truth)."""
    if not items:
        return models.OrderStatus.pending
    
    # Filter out removed items for status computation (removed by customer OR staff)
    active_items = [item for item in items if not item.removed_by_customer and item.removed_by_user_id is None]
    if not active_items:
        return models.OrderStatus.cancelled
    
    # Check if all items are delivered
    all_delivered = all(item.status == models.OrderItemStatus.delivered for item in active_items)
    if all_delivered:
        return models.OrderStatus.completed
    
    # Check if some items are delivered (partial delivery)
    any_delivered = any(item.status == models.OrderItemStatus.delivered for item in active_items)
    if any_delivered:
        return models.OrderStatus.partially_delivered
    
    # Check if all items are ready
    all_ready = all(item.status == models.OrderItemStatus.ready for item in active_items)
    if all_ready:
        return models.OrderStatus.ready
    
    # Check if any item is preparing or ready
    any_preparing_or_ready = any(
        item.status in [models.OrderItemStatus.preparing, models.OrderItemStatus.ready] 
        for item in active_items
    )
    if any_preparing_or_ready:
        return models.OrderStatus.preparing
    
    # All items are pending
    return models.OrderStatus.pending


@app.get("/orders")
def list_orders(
    current_user: Annotated[models.User, Depends(require_permission(Permission.ORDER_READ))],
    include_removed: bool = Query(False, description="Include removed items in response"),
    session: Session = Depends(get_session)
) -> list[dict]:
    orders = session.exec(
        select(models.Order)
        .where(models.Order.tenant_id == current_user.tenant_id)
        .where(models.Order.deleted_at.is_(None))
        .order_by(models.Order.created_at.desc())
    ).all()

    result = []
    for order in orders:
        table = session.exec(select(models.Table).where(models.Table.id == order.table_id)).first()
        
        # Get items, optionally including removed ones
        if include_removed:
            items = session.exec(
                select(models.OrderItem)
                .where(models.OrderItem.order_id == order.id)
                .order_by(models.OrderItem.removed_by_customer.asc(), models.OrderItem.id.asc())
            ).all()
        else:
            items = session.exec(
                select(models.OrderItem)
                .where(
                    models.OrderItem.order_id == order.id,
                    models.OrderItem.removed_by_customer == False
                )
            ).all()
        
        # Compute order status from items (if not paid or cancelled)
        computed_status = order.status
        if order.status not in [models.OrderStatus.paid, models.OrderStatus.cancelled]:
            computed_status = compute_order_status_from_items(
                session.exec(select(models.OrderItem).where(models.OrderItem.order_id == order.id)).all()
            )
        
        # Get all items for removed count calculation
        all_items = session.exec(select(models.OrderItem).where(models.OrderItem.order_id == order.id)).all()
        
        # Calculate total from active items only (exclude items removed by customer OR staff, and cancelled)
        active_items = [
            item for item in all_items
            if not item.removed_by_customer and item.removed_by_user_id is None and item.status != models.OrderItemStatus.cancelled
        ]
        # Do not list orders that have no products (empty orders are not allowed)
        if len(active_items) == 0:
            continue
        total_cents = sum(item.price_cents * item.quantity for item in active_items)

        # Product categories for kitchen/bar display filtering (one query per order)
        product_ids = list({i.product_id for i in items})
        product_map = {}
        if product_ids:
            products = session.exec(
                select(models.Product).where(models.Product.id.in_(product_ids))
            ).all()
            product_map = {p.id: p for p in products}
        
        # Billing customer for Factura (if set)
        billing_customer = None
        if order.billing_customer_id:
            bc = session.get(models.BillingCustomer, order.billing_customer_id)
            if bc and bc.tenant_id == current_user.tenant_id:
                billing_customer = {
                    "id": bc.id,
                    "name": bc.name,
                    "company_name": bc.company_name,
                    "tax_id": bc.tax_id,
                    "address": bc.address,
                    "email": bc.email,
                    "phone": bc.phone,
                }

        result.append({
            "id": order.id,
            "table_name": table.name if table else "Unknown",
            "table_id": table.id if table else None,
            "table_token": table.token if table else None,
            "status": computed_status.value,
            "notes": order.notes,
            "session_id": order.session_id,
            "customer_name": order.customer_name,
            "billing_customer_id": order.billing_customer_id,
            "billing_customer": billing_customer,
            "created_at": order.created_at.isoformat(),
            "paid_at": order.paid_at.isoformat() if order.paid_at else None,
            "payment_method": order.payment_method,
            "items": [
                {
                    "id": item.id,
                    "product_name": item.product_name,
                    "quantity": item.quantity,
                    "price_cents": item.price_cents,
                    "notes": item.notes,
                    "customization_answers": getattr(item, "customization_answers", None) or None,
                    "status": item.status.value if hasattr(item.status, 'value') else str(item.status),
                    "removed_by_customer": item.removed_by_customer,
                    "removed_at": item.removed_at.isoformat() if item.removed_at else None,
                    "removed_reason": item.removed_reason,
                    "tax_id": getattr(item, "tax_id", None),
                    "tax_rate_percent": getattr(item, "tax_rate_percent", None),
                    "tax_amount_cents": getattr(item, "tax_amount_cents", None),
                    "category": getattr(product_map.get(item.product_id), "category", None),
                }
                for item in items
            ],
            "total_cents": total_cents,
            "removed_items_count": len([item for item in all_items if item.removed_by_customer])
        })
    
    return result


@app.put("/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    status_update: models.OrderStatusUpdate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.ORDER_UPDATE_STATUS))],
    session: Session = Depends(get_session),
) -> dict:
    order = session.exec(
        select(models.Order).where(
            models.Order.id == order_id,
            models.Order.tenant_id == current_user.tenant_id,
        )
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Order not found")

    # Update order status
    order.status = status_update.status

    # For backward compatibility: if updating order-level status, update all active items
    # Map order status to item status
    items = session.exec(select(models.OrderItem).where(models.OrderItem.order_id == order_id)).all()
    active_items = [item for item in items if not item.removed_by_customer]
    
    if active_items:
        status_mapping = {
            models.OrderStatus.pending: models.OrderItemStatus.pending,
            models.OrderStatus.preparing: models.OrderItemStatus.preparing,
            models.OrderStatus.ready: models.OrderItemStatus.ready,
            models.OrderStatus.completed: models.OrderItemStatus.delivered,  # completed = all items delivered
            models.OrderStatus.partially_delivered: models.OrderItemStatus.delivered,  # Partial delivery
        }
        
        item_status = status_mapping.get(status_update.status)
        if item_status:
            for item in active_items:
                # Only update if item is not already delivered
                if item.status != models.OrderItemStatus.delivered:
                    item.status = item_status
                    item.status_updated_at = datetime.now(timezone.utc)
                    if item_status == models.OrderItemStatus.ready:
                        item.prepared_by_user_id = current_user.id
                    elif item_status == models.OrderItemStatus.delivered:
                        item.delivered_by_user_id = current_user.id
                    session.add(item)
    
    session.add(order)
    session.commit()

    # Publish status update
    table = session.exec(select(models.Table).where(models.Table.id == order.table_id)).first()
    publish_order_update(current_user.tenant_id, {
        "type": "status_update",
        "order_id": order.id,
        "table_name": table.name if table else "Unknown",
        "status": order.status.value
    }, table_id=order.table_id)
    
    return {"status": "updated", "order_id": order.id, "new_status": order.status.value}


@app.put("/orders/{order_id}/mark-paid")
def mark_order_paid(
    order_id: int,
    payment_data: models.OrderMarkPaid,
    current_user: Annotated[models.User, Depends(require_permission(Permission.ORDER_MARK_PAID))],
    session: Session = Depends(get_session)
) -> dict:
    """Mark order as paid manually (for cash/terminal payments)."""
    order = session.exec(
        select(models.Order).where(
            models.Order.id == order_id,
            models.Order.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status == models.OrderStatus.paid or order.paid_at:
        raise HTTPException(status_code=400, detail="Order is already paid.")
    if order.status == models.OrderStatus.cancelled:
        raise HTTPException(status_code=400, detail="Cannot mark a cancelled order as paid.")
    
    # Allow pre-pay: staff can mark as paid even when not all items are delivered (e.g. customer pays before food is ready).
    # Mark as paid
    order.status = models.OrderStatus.paid
    order.paid_at = datetime.now(timezone.utc)
    order.paid_by_user_id = current_user.id
    order.payment_method = payment_data.payment_method
    
    session.add(order)
    session.commit()
    
    # Publish update
    table = session.exec(select(models.Table).where(models.Table.id == order.table_id)).first()
    publish_order_update(current_user.tenant_id, {
        "type": "order_paid",
        "order_id": order.id,
        "table_name": table.name if table else "Unknown",
        "payment_method": payment_data.payment_method
    }, table_id=order.table_id)
    
    return {
        "status": "paid",
        "order_id": order.id,
        "payment_method": payment_data.payment_method,
        "paid_at": order.paid_at.isoformat()
    }


@app.put("/orders/{order_id}/unmark-paid")
def unmark_order_paid(
    order_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.ORDER_MARK_PAID))],
    session: Session = Depends(get_session)
) -> dict:
    """Unmark order as paid (clear paid mark only; order status is restored from item statuses)."""
    order = session.exec(
        select(models.Order).where(
            models.Order.id == order_id,
            models.Order.tenant_id == current_user.tenant_id
        )
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status == models.OrderStatus.cancelled:
        raise HTTPException(status_code=400, detail="Cannot unmark a cancelled order.")
    if order.status != models.OrderStatus.paid and order.paid_at is None:
        raise HTTPException(status_code=400, detail="Order is not paid.")

    # Clear the paid mark only
    order.paid_at = None
    order.paid_by_user_id = None
    order.payment_method = None
    # Restore workflow status from items (do not leave status as 'paid')
    items = session.exec(select(models.OrderItem).where(models.OrderItem.order_id == order_id)).all()
    order.status = compute_order_status_from_items(list(items))

    session.add(order)
    session.commit()

    table = session.exec(select(models.Table).where(models.Table.id == order.table_id)).first()
    publish_order_update(current_user.tenant_id, {
        "type": "status_update",
        "order_id": order.id,
        "table_name": table.name if table else "Unknown",
        "status": order.status.value
    }, table_id=order.table_id)

    return {"status": "unmarked", "order_id": order.id, "new_status": order.status.value}


@app.delete("/orders/{order_id}")
def delete_order(
    order_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.ORDER_DELETE))],
    session: Session = Depends(get_session)
) -> dict:
    """Soft-delete an order: remove from orders list and from book-keeping (reports). For test/cleanup."""
    order = session.exec(
        select(models.Order).where(
            models.Order.id == order_id,
            models.Order.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.deleted_at is not None:
        raise HTTPException(status_code=400, detail="Order is already deleted")

    order.deleted_at = datetime.now(timezone.utc)
    order.deleted_by_user_id = current_user.id
    # Unlink from table so it no longer appears as active order
    tables = session.exec(
        select(models.Table).where(
            models.Table.tenant_id == current_user.tenant_id,
            models.Table.active_order_id == order_id,
        )
    ).all()
    for table in tables:
        table.active_order_id = None
        session.add(table)
    session.add(order)
    session.commit()
    return {"status": "deleted", "order_id": order.id}


@app.put("/orders/{order_id}/billing-customer")
def set_order_billing_customer(
    order_id: int,
    body: models.OrderBillingCustomerSet,
    current_user: Annotated[models.User, Depends(require_permission(Permission.ORDER_READ))],
    session: Session = Depends(get_session)
) -> dict:
    """Set or clear the billing customer (Factura) for an order."""
    order = session.exec(
        select(models.Order).where(
            models.Order.id == order_id,
            models.Order.tenant_id == current_user.tenant_id
        )
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Order not found")
    customer_id = body.billing_customer_id
    if customer_id is not None:
        customer = session.get(models.BillingCustomer, customer_id)
        if not customer or customer.tenant_id != current_user.tenant_id:
            raise HTTPException(status_code=404, detail="Billing customer not found")
    order.billing_customer_id = customer_id
    session.add(order)
    session.commit()
    return {"order_id": order.id, "billing_customer_id": order.billing_customer_id}


# ---------- Billing customers (Factura) ----------


@app.get("/billing-customers")
def list_billing_customers(
    current_user: Annotated[models.User, Depends(require_permission(Permission.BILLING_CUSTOMER_READ))],
    search: str | None = Query(None, description="Search by name, company_name, tax_id, email"),
    session: Session = Depends(get_session)
) -> list[dict]:
    from sqlalchemy import or_
    if search and search.strip():
        term = f"%{search.strip()}%"
        q = select(models.BillingCustomer).where(
            models.BillingCustomer.tenant_id == current_user.tenant_id
        ).where(
            or_(
                models.BillingCustomer.name.ilike(term),
                models.BillingCustomer.company_name.ilike(term),
                models.BillingCustomer.tax_id.ilike(term),
                models.BillingCustomer.email.ilike(term),
            )
        ).order_by(models.BillingCustomer.name.asc())
    else:
        q = select(models.BillingCustomer).where(
            models.BillingCustomer.tenant_id == current_user.tenant_id
        ).order_by(models.BillingCustomer.name.asc())
    customers = session.exec(q).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "company_name": c.company_name,
            "tax_id": c.tax_id,
            "address": c.address,
            "email": c.email,
            "phone": c.phone,
            "created_at": c.created_at.isoformat(),
        }
        for c in customers
    ]


@app.post("/billing-customers")
def create_billing_customer(
    body: models.BillingCustomerCreate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.BILLING_CUSTOMER_WRITE))],
    session: Session = Depends(get_session)
) -> dict:
    customer = models.BillingCustomer(
        tenant_id=current_user.tenant_id,
        name=body.name,
        company_name=body.company_name,
        tax_id=body.tax_id,
        address=body.address,
        email=body.email,
        phone=body.phone,
    )
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return {
        "id": customer.id,
        "name": customer.name,
        "company_name": customer.company_name,
        "tax_id": customer.tax_id,
        "address": customer.address,
        "email": customer.email,
        "phone": customer.phone,
        "created_at": customer.created_at.isoformat(),
    }


@app.get("/billing-customers/{customer_id}")
def get_billing_customer(
    customer_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.BILLING_CUSTOMER_READ))],
    session: Session = Depends(get_session)
) -> dict:
    customer = session.exec(
        select(models.BillingCustomer).where(
            models.BillingCustomer.id == customer_id,
            models.BillingCustomer.tenant_id == current_user.tenant_id
        )
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Billing customer not found")
    return {
        "id": customer.id,
        "name": customer.name,
        "company_name": customer.company_name,
        "tax_id": customer.tax_id,
        "address": customer.address,
        "email": customer.email,
        "phone": customer.phone,
        "created_at": customer.created_at.isoformat(),
    }


@app.put("/billing-customers/{customer_id}")
def update_billing_customer(
    customer_id: int,
    body: models.BillingCustomerUpdate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.BILLING_CUSTOMER_WRITE))],
    session: Session = Depends(get_session)
) -> dict:
    customer = session.exec(
        select(models.BillingCustomer).where(
            models.BillingCustomer.id == customer_id,
            models.BillingCustomer.tenant_id == current_user.tenant_id
        )
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Billing customer not found")
    if body.name is not None:
        customer.name = body.name
    if body.company_name is not None:
        customer.company_name = body.company_name
    if body.tax_id is not None:
        customer.tax_id = body.tax_id
    if body.address is not None:
        customer.address = body.address
    if body.email is not None:
        customer.email = body.email
    if body.phone is not None:
        customer.phone = body.phone
    customer.updated_at = datetime.now(timezone.utc)
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return {
        "id": customer.id,
        "name": customer.name,
        "company_name": customer.company_name,
        "tax_id": customer.tax_id,
        "address": customer.address,
        "email": customer.email,
        "phone": customer.phone,
        "created_at": customer.created_at.isoformat(),
    }


@app.delete("/billing-customers/{customer_id}")
def delete_billing_customer(
    customer_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.BILLING_CUSTOMER_WRITE))],
    session: Session = Depends(get_session)
) -> None:
    customer = session.exec(
        select(models.BillingCustomer).where(
            models.BillingCustomer.id == customer_id,
            models.BillingCustomer.tenant_id == current_user.tenant_id
        )
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Billing customer not found")
    session.delete(customer)
    session.commit()
    return None


@app.put("/orders/{order_id}/items/{item_id}/status")
def update_order_item_status(
    order_id: int,
    item_id: int,
    status_update: models.OrderItemStatusUpdate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.ORDER_ITEM_STATUS))],
    session: Session = Depends(get_session)
) -> dict:
    """Update individual order item status (restaurant staff)."""
    order = session.exec(
        select(models.Order).where(
            models.Order.id == order_id,
            models.Order.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    item = session.exec(
        select(models.OrderItem).where(
            models.OrderItem.id == item_id,
            models.OrderItem.order_id == order_id
        )
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")
    
    # Update item status
    old_status = item.status
    item.status = status_update.status
    item.status_updated_at = datetime.now(timezone.utc)
    
    # Track who prepared/delivered
    if status_update.status == models.OrderItemStatus.ready:
        item.prepared_by_user_id = status_update.user_id or current_user.id
    elif status_update.status == models.OrderItemStatus.delivered:
        item.delivered_by_user_id = status_update.user_id or current_user.id
    
    session.add(item)
    
    # Recompute order status from items
    all_items = session.exec(select(models.OrderItem).where(models.OrderItem.order_id == order_id)).all()
    if order.status not in [models.OrderStatus.paid, models.OrderStatus.cancelled]:
        order.status = compute_order_status_from_items(all_items)
    
    session.add(order)
    session.commit()
    
    # Publish update
    table = session.exec(select(models.Table).where(models.Table.id == order.table_id)).first()
    publish_order_update(current_user.tenant_id, {
        "type": "item_status_update",
        "order_id": order.id,
        "item_id": item.id,
        "old_status": old_status.value if hasattr(old_status, 'value') else str(old_status),
        "new_status": item.status.value,
        "status": order.status.value if hasattr(order.status, 'value') else str(order.status),  # Include computed order status
        "table_name": table.name if table else "Unknown"
    }, table_id=order.table_id)
    
    return {
        "status": "updated",
        "order_id": order.id,
        "item_id": item.id,
        "item_status": item.status.value,
        "order_status": order.status.value
    }


@app.put("/orders/{order_id}/items/{item_id}/reset-status")
def reset_item_status(
    order_id: int,
    item_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.ORDER_ITEM_STATUS))],
    session: Session = Depends(get_session)
) -> dict:
    """Reset item status from preparing to pending (restaurant staff only)."""
    order = session.exec(
        select(models.Order).where(
            models.Order.id == order_id,
            models.Order.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    item = session.exec(
        select(models.OrderItem).where(
            models.OrderItem.id == item_id,
            models.OrderItem.order_id == order_id
        )
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")
    
    # Validation: Can only reset from preparing to pending
    if item.status != models.OrderItemStatus.preparing:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reset status from {item.status.value}. Only 'preparing' items can be reset to 'pending'."
        )
    
    # Reset status
    old_status = item.status
    item.status = models.OrderItemStatus.pending
    item.status_updated_at = datetime.now(timezone.utc)
    item.prepared_by_user_id = None  # Clear prepared_by since we're resetting
    
    session.add(item)
    
    # Recompute order status
    all_items = session.exec(select(models.OrderItem).where(models.OrderItem.order_id == order_id)).all()
    if order.status not in [models.OrderStatus.paid, models.OrderStatus.cancelled]:
        order.status = compute_order_status_from_items(all_items)
    
    session.add(order)
    session.commit()
    
    # Publish update
    table = session.exec(select(models.Table).where(models.Table.id == order.table_id)).first()
    publish_order_update(current_user.tenant_id, {
        "type": "item_status_update",
        "order_id": order.id,
        "item_id": item.id,
        "old_status": old_status.value,
        "new_status": item.status.value,
        "status": order.status.value,
        "table_name": table.name if table else "Unknown"
    }, table_id=order.table_id)
    
    return {
        "status": "reset",
        "order_id": order.id,
        "item_id": item.id,
        "old_status": old_status.value,
        "new_status": item.status.value,
        "order_status": order.status.value
    }


@app.put("/orders/{order_id}/items/{item_id}/cancel")
def cancel_order_item_staff(
    order_id: int,
    item_id: int,
    cancel_data: models.OrderItemCancel,
    current_user: Annotated[models.User, Depends(require_permission(Permission.ORDER_CANCEL))],
    session: Session = Depends(get_session)
) -> dict:
    """Cancel order item (restaurant staff) - requires reason if item is ready."""
    order = session.exec(
        select(models.Order).where(
            models.Order.id == order_id,
            models.Order.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    item = session.exec(
        select(models.OrderItem).where(
            models.OrderItem.id == item_id,
            models.OrderItem.order_id == order_id
        )
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")
    
    # Validation: Cannot cancel delivered items
    if item.status == models.OrderItemStatus.delivered:
        raise HTTPException(status_code=400, detail="Cannot cancel delivered items")
    
    # Validation: If item is ready, reason is required (for tax authorities)
    if item.status == models.OrderItemStatus.ready and not cancel_data.reason:
        raise HTTPException(
            status_code=400,
            detail="Reason is required when cancelling ready items (required for tax reporting)"
        )
    
    # Cancel item (soft delete)
    item.removed_by_customer = False  # Removed by staff, not customer
    item.removed_by_user_id = current_user.id
    item.removed_at = datetime.now(timezone.utc)
    item.removed_reason = cancel_data.reason
    item.cancelled_reason = cancel_data.reason  # Store for tax reporting
    item.status = models.OrderItemStatus.cancelled
    
    session.add(item)
    
    # Recompute order status and total
    all_items = session.exec(select(models.OrderItem).where(models.OrderItem.order_id == order_id)).all()
    if order.status not in [models.OrderStatus.paid, models.OrderStatus.cancelled]:
        order.status = compute_order_status_from_items(all_items)
    
    session.add(order)
    session.commit()
    
    # Calculate new total
    active_items = [i for i in all_items if not i.removed_by_customer and i.removed_by_user_id is None]
    new_total = sum(i.price_cents * i.quantity for i in active_items)
    
    # Publish update
    table = session.exec(select(models.Table).where(models.Table.id == order.table_id)).first()
    publish_order_update(current_user.tenant_id, {
        "type": "item_cancelled",
        "order_id": order.id,
        "item_id": item.id,
        "cancelled_by": "staff",
        "table_name": table.name if table else "Unknown",
        "new_total_cents": new_total
    }, table_id=order.table_id)
    
    return {
        "status": "item_cancelled",
        "order_id": order.id,
        "item_id": item.id,
        "new_total_cents": new_total
    }


@app.put("/orders/{order_id}/items/{item_id}")
def update_order_item_staff(
    order_id: int,
    item_id: int,
    item_update: models.OrderItemStaffUpdate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.ORDER_REMOVE_ITEM))],
    session: Session = Depends(get_session)
) -> dict:
    """Update order item (restaurant staff) - can modify any item except delivered."""
    order = session.exec(
        select(models.Order).where(
            models.Order.id == order_id,
            models.Order.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    item = session.exec(
        select(models.OrderItem).where(
            models.OrderItem.id == item_id,
            models.OrderItem.order_id == order_id
        )
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")
    
    # Validation: Cannot modify delivered items
    if item.status == models.OrderItemStatus.delivered:
        raise HTTPException(status_code=400, detail="Cannot modify delivered items")
    
    # Update item
    if item_update.quantity is not None:
        if item_update.quantity <= 0:
            # Remove item (soft delete)
            item.removed_by_customer = False
            item.removed_by_user_id = current_user.id
            item.removed_at = datetime.now(timezone.utc)
            item.status = models.OrderItemStatus.cancelled
        else:
            item.quantity = item_update.quantity
            item.modified_by_user_id = current_user.id
            item.modified_at = datetime.now(timezone.utc)
    
    if item_update.notes is not None:
        item.notes = item_update.notes
        item.modified_by_user_id = current_user.id
        item.modified_at = datetime.now(timezone.utc)
    
    session.add(item)
    
    # Recompute order status and total
    all_items = session.exec(select(models.OrderItem).where(models.OrderItem.order_id == order_id)).all()
    if order.status not in [models.OrderStatus.paid, models.OrderStatus.cancelled]:
        order.status = compute_order_status_from_items(all_items)
    
    session.add(order)
    session.commit()
    
    # Calculate new total
    active_items = [i for i in all_items if not i.removed_by_customer and i.removed_by_user_id is None]
    new_total = sum(i.price_cents * i.quantity for i in active_items)
    
    # Publish update
    table = session.exec(select(models.Table).where(models.Table.id == order.table_id)).first()
    publish_order_update(current_user.tenant_id, {
        "type": "item_updated",
        "order_id": order.id,
        "item_id": item.id,
        "new_quantity": item.quantity,
        "table_name": table.name if table else "Unknown",
        "new_total_cents": new_total
    }, table_id=order.table_id)
    
    return {
        "status": "item_updated",
        "order_id": order.id,
        "item_id": item.id,
        "new_quantity": item.quantity,
        "new_total_cents": new_total
    }


@app.delete("/orders/{order_id}/items/{item_id}")
def remove_order_item_staff(
    order_id: int,
    item_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.ORDER_REMOVE_ITEM))],
    reason: str | None = Query(None, description="Required reason when removing ready items"),
    session: Session = Depends(get_session)
) -> dict:
    """Remove order item (restaurant staff). Reason required for ready/delivered items (audit/tax)."""
    order = session.exec(
        select(models.Order).where(
            models.Order.id == order_id,
            models.Order.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    item = session.exec(
        select(models.OrderItem).where(
            models.OrderItem.id == item_id,
            models.OrderItem.order_id == order_id
        )
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")
    
    # Validation: Reason required when removing ready or delivered items (audit/tax)
    if item.status in (models.OrderItemStatus.ready, models.OrderItemStatus.delivered):
        if not reason or not reason.strip():
            raise HTTPException(
                status_code=400,
                detail="Reason is required when removing ready or delivered items (for audit and tax reporting)"
            )
    
    # Soft delete
    item.removed_by_customer = False
    item.removed_by_user_id = current_user.id
    item.removed_at = datetime.now(timezone.utc)
    item.removed_reason = reason
    item.cancelled_reason = reason
    item.status = models.OrderItemStatus.cancelled
    
    session.add(item)
    
    # Recompute order status and total
    all_items = session.exec(select(models.OrderItem).where(models.OrderItem.order_id == order_id)).all()
    if order.status not in [models.OrderStatus.paid, models.OrderStatus.cancelled]:
        order.status = compute_order_status_from_items(all_items)
    
    session.add(order)
    session.commit()
    
    # Calculate new total
    active_items = [i for i in all_items if not i.removed_by_customer and i.removed_by_user_id is None]
    new_total = sum(i.price_cents * i.quantity for i in active_items)
    
    # Publish update
    table = session.exec(select(models.Table).where(models.Table.id == order.table_id)).first()
    publish_order_update(current_user.tenant_id, {
        "type": "item_removed",
        "order_id": order.id,
        "item_id": item.id,
        "removed_by": "staff",
        "table_name": table.name if table else "Unknown",
        "new_total_cents": new_total
    }, table_id=order.table_id)
    
    return {
        "status": "item_removed",
        "order_id": order.id,
        "removed_item_id": item.id,
        "new_total_cents": new_total
    }


# ============ ORDER MODIFICATION (Public - Customer) ============

@app.delete("/menu/{table_token}/order/{order_id}/items/{item_id}")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_public_menu_per_minute', 30)}/minute"
)
def remove_order_item(
    request: Request,
    table_token: str,
    order_id: int,
    item_id: int,
    session_id: str | None = Query(None, description="Session identifier for order validation"),
    reason: str | None = Query(None, description="Optional reason for removal"),
    session: Session = Depends(get_session)
) -> dict:
    """Remove item from order (soft delete - customer)."""
    table = session.exec(select(models.Table).where(models.Table.token == table_token)).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    order = session.exec(
        select(models.Order).where(
            models.Order.id == order_id,
            models.Order.table_id == table.id
        )
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Security: Validate that order belongs to this session
    # If order has a session_id, request must provide matching session_id
    if order.session_id and order.session_id != session_id:
        raise HTTPException(status_code=403, detail="Order does not belong to this session")
    
    item = session.exec(
        select(models.OrderItem).where(
            models.OrderItem.id == item_id,
            models.OrderItem.order_id == order_id
        )
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")
    
    # Validation: Cannot remove items that are already being prepared or delivered
    if item.status in [models.OrderItemStatus.delivered, models.OrderItemStatus.preparing, models.OrderItemStatus.ready]:
        status_label = {
            models.OrderItemStatus.delivered: "delivered",
            models.OrderItemStatus.preparing: "being prepared",
            models.OrderItemStatus.ready: "ready"
        }.get(item.status, "in progress")
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot remove items that are {status_label}. Only pending items can be removed."
        )
    
    # Soft delete: Mark as removed (NEVER actually delete)
    item.removed_by_customer = True
    item.removed_at = datetime.now(timezone.utc)
    item.removed_reason = reason
    item.status = models.OrderItemStatus.cancelled
    
    session.add(item)
    
    # Recompute order status and total
    all_items = session.exec(select(models.OrderItem).where(models.OrderItem.order_id == order_id)).all()
    if order.status not in [models.OrderStatus.paid, models.OrderStatus.cancelled]:
        order.status = compute_order_status_from_items(all_items)
    
    session.add(order)
    session.commit()
    
    # Calculate new total (exclude removed items)
    active_items = [i for i in all_items if not i.removed_by_customer]
    new_total = sum(i.price_cents * i.quantity for i in active_items)
    
    # Publish update
    publish_order_update(order.tenant_id, {
        "type": "item_removed",
        "order_id": order.id,
        "item_id": item.id,
        "table_name": table.name,
        "new_total_cents": new_total
    }, table_id=order.table_id)

    return JSONResponse(content={
        "status": "item_removed",
        "order_id": order.id,
        "removed_item_id": item.id,
        "new_total_cents": new_total,
        "items_remaining": len(active_items),
    })


@app.put("/menu/{table_token}/order/{order_id}/items/{item_id}")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_public_menu_per_minute', 30)}/minute"
)
def update_order_item_quantity(
    request: Request,
    table_token: str,
    order_id: int,
    item_id: int,
    item_update: models.OrderItemUpdate,
    session_id: str | None = Query(None, description="Session identifier for order validation"),
    session: Session = Depends(get_session)
) -> dict:
    """Update order item quantity (customer)."""
    table = session.exec(select(models.Table).where(models.Table.token == table_token)).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    order = session.exec(
        select(models.Order).where(
            models.Order.id == order_id,
            models.Order.table_id == table.id
        )
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Security: Validate that order belongs to this session
    # If order has a session_id, request must provide matching session_id
    if order.session_id and order.session_id != session_id:
        raise HTTPException(status_code=403, detail="Order does not belong to this session")
    
    item = session.exec(
        select(models.OrderItem).where(
            models.OrderItem.id == item_id,
            models.OrderItem.order_id == order_id
        )
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")
    
    # Validation: Cannot modify items that are already being prepared or delivered
    if item.status in [models.OrderItemStatus.delivered, models.OrderItemStatus.preparing, models.OrderItemStatus.ready]:
        status_label = {
            models.OrderItemStatus.delivered: "delivered",
            models.OrderItemStatus.preparing: "being prepared",
            models.OrderItemStatus.ready: "ready"
        }.get(item.status, "in progress")
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot modify items that are {status_label}. Only pending items can be modified."
        )
    
    # If quantity is 0, remove item (soft delete)
    if item_update.quantity <= 0:
        item.removed_by_customer = True
        item.removed_at = datetime.now(timezone.utc)
        item.status = models.OrderItemStatus.cancelled
    else:
        item.quantity = item_update.quantity
    
    session.add(item)
    
    # Recompute order status and total
    all_items = session.exec(select(models.OrderItem).where(models.OrderItem.order_id == order_id)).all()
    if order.status not in [models.OrderStatus.paid, models.OrderStatus.cancelled]:
        order.status = compute_order_status_from_items(all_items)
    
    session.add(order)
    session.commit()
    
    # Calculate new total (exclude items removed by customer OR staff)
    active_items = [i for i in all_items if not i.removed_by_customer and i.removed_by_user_id is None]
    new_total = sum(i.price_cents * i.quantity for i in active_items)
    
    # Publish update
    publish_order_update(order.tenant_id, {
        "type": "item_updated",
        "order_id": order.id,
        "item_id": item.id,
        "new_quantity": item.quantity,
        "table_name": table.name,
        "new_total_cents": new_total
    }, table_id=order.table_id)

    return JSONResponse(content={
        "status": "item_updated",
        "order_id": order.id,
        "item_id": item.id,
        "new_quantity": item.quantity,
        "new_total_cents": new_total,
    })


@app.delete("/menu/{table_token}/order/{order_id}")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_public_menu_per_minute', 30)}/minute"
)
def cancel_order(
    request: Request,
    table_token: str,
    order_id: int,
    session_id: str | None = Query(None, description="Session identifier for order validation"),
    session: Session = Depends(get_session)
) -> dict:
    """Cancel entire order (soft delete - customer)."""
    table = session.exec(select(models.Table).where(models.Table.token == table_token)).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    order = session.exec(
        select(models.Order).where(
            models.Order.id == order_id,
            models.Order.table_id == table.id
        )
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Security: Validate that order belongs to this session
    # If order has a session_id, request must provide matching session_id
    if order.session_id and order.session_id != session_id:
        raise HTTPException(status_code=403, detail="Order does not belong to this session")
    
    # Validation: Cannot cancel if any items are being prepared, ready, or delivered
    items = session.exec(select(models.OrderItem).where(models.OrderItem.order_id == order_id)).all()
    active_items = [item for item in items if not item.removed_by_customer]
    in_progress_items = [
        item for item in active_items 
        if item.status in [models.OrderItemStatus.preparing, models.OrderItemStatus.ready, models.OrderItemStatus.delivered]
    ]
    if in_progress_items:
        statuses = [item.status.value for item in in_progress_items]
        if models.OrderItemStatus.delivered.value in statuses:
            raise HTTPException(status_code=400, detail="Cannot cancel order with delivered items")
        elif models.OrderItemStatus.ready.value in statuses:
            raise HTTPException(status_code=400, detail="Cannot cancel order with items that are ready. Only pending items can be cancelled.")
        else:
            raise HTTPException(status_code=400, detail="Cannot cancel order with items that are being prepared. Only pending items can be cancelled.")
    
    # Soft delete: Mark order and all items as cancelled
    order.status = models.OrderStatus.cancelled
    order.cancelled_at = datetime.now(timezone.utc)
    order.cancelled_by = "customer"
    order.session_id = None  # Prevent order reuse - new orders get new numbers
    
    for item in items:
        if not item.removed_by_customer:  # Only cancel items not already removed
            item.removed_by_customer = True
            item.removed_at = datetime.now(timezone.utc)
            item.status = models.OrderItemStatus.cancelled
    
    session.add(order)
    session.commit()
    
    # Publish update
    publish_order_update(order.tenant_id, {
        "type": "order_cancelled",
        "order_id": order.id,
        "table_name": table.name,
        "cancelled_items": len(items)
    }, table_id=order.table_id)

    return JSONResponse(content={
        "status": "order_cancelled",
        "order_id": order.id,
        "cancelled_items": len(items),
    })


# ============ REVOLUT MERCHANT API ============

REVOLUT_API_BASE = "https://merchant.revolut.com/api/1.0"
REVOLUT_API_VERSION = "2024-05-01"


def _revolut_create_order(
    *,
    secret: str,
    amount_cents: int,
    currency: str,
    merchant_order_ext_ref: str,
    redirect_url: str | None = None,
    cancel_url: str | None = None,
) -> dict:
    """Create a Revolut Merchant order. Returns dict with id, checkout_url, and optionally token/public_id."""
    url = f"{REVOLUT_API_BASE}/order"
    headers = {
        "Authorization": f"Bearer {secret}",
        "Revolut-Api-Version": REVOLUT_API_VERSION,
        "Content-Type": "application/json",
    }
    payload = {
        "amount": amount_cents,
        "currency": currency.upper(),
        "merchant_order_ext_ref": merchant_order_ext_ref,
    }
    if redirect_url:
        payload["redirect_url"] = redirect_url
    if cancel_url:
        payload["cancel_url"] = cancel_url
    resp = requests.post(url, json=payload, headers=headers, timeout=15)
    resp.raise_for_status()
    return resp.json()


def _revolut_retrieve_order(secret: str, revolut_order_id: str) -> dict:
    """Retrieve a Revolut order by id. Returns order dict with state."""
    url = f"{REVOLUT_API_BASE}/order/{revolut_order_id}"
    headers = {
        "Authorization": f"Bearer {secret}",
        "Revolut-Api-Version": REVOLUT_API_VERSION,
    }
    resp = requests.get(url, headers=headers, timeout=10)
    resp.raise_for_status()
    return resp.json()


# ============ PAYMENTS (Public - for customer checkout) ============


@app.post("/orders/{order_id}/create-payment-intent")
@limiter.limit(f"{getattr(settings, 'rate_limit_payment_per_minute', 10)}/minute")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_payment_per_order_per_hour', 3)}/hour",
    key_func=_rate_limit_key_payment_order,
)
def create_payment_intent(
    request: Request,
    order_id: int, table_token: str, session: Session = Depends(get_session)
) -> dict:
    """Create a Stripe PaymentIntent for an order."""
    # Verify table token matches the order
    table = session.exec(
        select(models.Table).where(models.Table.token == table_token)
    ).first()

    if not table:
        raise HTTPException(status_code=404, detail="Invalid table")

    order = session.exec(
        select(models.Order).where(
            models.Order.id == order_id, models.Order.table_id == table.id
        )
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Calculate total from order items
    items = session.exec(
        select(models.OrderItem).where(models.OrderItem.order_id == order_id)
    ).all()

    total_cents = sum(item.price_cents * item.quantity for item in items)

    if total_cents <= 0:
        raise HTTPException(status_code=400, detail="Order has no items")

    # Get tenant for description, currency, and Stripe keys
    tenant = session.exec(
        select(models.Tenant).where(models.Tenant.id == order.tenant_id)
    ).first()

    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Use tenant-specific Stripe keys, fallback to global config
    stripe_secret_key = tenant.stripe_secret_key or settings.stripe_secret_key
    if not stripe_secret_key:
        raise HTTPException(
            status_code=400, detail="Stripe not configured for this tenant"
        )

    # Resolve Stripe currency:
    # 1) tenant.currency_code (ISO 4217) if set
    # 2) legacy tenant.currency symbol mapping
    # 3) global default settings.stripe_currency
    tenant_currency_code = tenant.currency_code
    if tenant_currency_code and isinstance(tenant_currency_code, str):
        stripe_currency = tenant_currency_code.strip().lower()
    else:
        currency_symbol = tenant.currency if tenant.currency else None
        stripe_currency = (
            _get_stripe_currency_code(currency_symbol) or settings.stripe_currency
        ).lower()

    try:
        # Use tenant-specific Stripe key
        intent = stripe.PaymentIntent.create(
            amount=total_cents,
            currency=stripe_currency,
            api_key=stripe_secret_key,
            metadata={
                "order_id": str(order.id),
                "table_id": str(table.id),
                "tenant_id": str(order.tenant_id),
            },
            description=f"Order #{order.id} at {tenant.name} - {table.name}",
        )

        return {
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id,
            "amount": total_cents,
        }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/orders/{order_id}/confirm-payment")
@limiter.limit(f"{getattr(settings, 'rate_limit_payment_per_minute', 10)}/minute")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_payment_per_order_per_hour', 3)}/hour",
    key_func=_rate_limit_key_payment_order,
)
def confirm_payment(
    request: Request,
    order_id: int,
    table_token: str,
    payment_intent_id: str,
    session: Session = Depends(get_session),
) -> dict:
    """Mark order as paid after successful Stripe payment."""
    table = session.exec(
        select(models.Table).where(models.Table.token == table_token)
    ).first()

    if not table:
        raise HTTPException(status_code=404, detail="Invalid table")

    order = session.exec(
        select(models.Order).where(
            models.Order.id == order_id, models.Order.table_id == table.id
        )
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Get tenant for Stripe keys
    tenant = session.exec(
        select(models.Tenant).where(models.Tenant.id == order.tenant_id)
    ).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Use tenant-specific Stripe keys, fallback to global config
    stripe_secret_key = tenant.stripe_secret_key or settings.stripe_secret_key
    if not stripe_secret_key:
        raise HTTPException(
            status_code=400, detail="Stripe not configured for this tenant"
        )

    # Verify payment with Stripe
    try:
        intent = stripe.PaymentIntent.retrieve(
            payment_intent_id, api_key=stripe_secret_key
        )
        if intent.status != "succeeded":
            raise HTTPException(status_code=400, detail="Payment not completed")

        # Validation: Verify intent matches order
        # 1. Check order ID in metadata
        intent_order_id = intent.metadata.get("order_id")
        if not intent_order_id or str(intent_order_id) != str(order.id):
            raise HTTPException(
                status_code=400,
                detail="Payment mismatch: Payment does not belong to this order",
            )

        # 2. Check amount
        items = session.exec(
            select(models.OrderItem).where(models.OrderItem.order_id == order_id)
        ).all()
        total_cents = sum(item.price_cents * item.quantity for item in items)

        if intent.amount != total_cents:
            raise HTTPException(
                status_code=400,
                detail=f"Payment mismatch: Amount {intent.amount} does not match order total {total_cents}",
            )

        # Mark order as paid
        order.status = models.OrderStatus.paid
        order.notes = f"{order.notes or ''}\n[PAID: {payment_intent_id}]".strip()
        session.add(order)
        session.commit()

        # Notify tenant
        publish_order_update(order.tenant_id, {
            "type": "order_paid",
            "order_id": order.id,
            "table_name": table.name,
            "status": order.status.value
        }, table_id=order.table_id)
        
        return {"status": "paid", "order_id": order.id}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/orders/{order_id}/create-revolut-order")
@limiter.limit(f"{getattr(settings, 'rate_limit_payment_per_minute', 10)}/minute")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_payment_per_order_per_hour', 3)}/hour",
    key_func=_rate_limit_key_payment_order,
)
def create_revolut_order(
    request: Request,
    order_id: int,
    table_token: str,
    session: Session = Depends(get_session),
) -> dict:
    """Create a Revolut Merchant order and return checkout_url for redirect."""
    table = session.exec(
        select(models.Table).where(models.Table.token == table_token)
    ).first()
    if not table:
        raise HTTPException(status_code=404, detail="Invalid table")

    order = session.exec(
        select(models.Order).where(
            models.Order.id == order_id, models.Order.table_id == table.id
        )
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    items = session.exec(
        select(models.OrderItem).where(models.OrderItem.order_id == order_id)
    ).all()
    total_cents = sum(item.price_cents * item.quantity for item in items)
    if total_cents <= 0:
        raise HTTPException(status_code=400, detail="Order has no items")

    tenant = session.exec(
        select(models.Tenant).where(models.Tenant.id == order.tenant_id)
    ).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    revolut_secret = tenant.revolut_merchant_secret or settings.revolut_merchant_secret
    if not revolut_secret or not revolut_secret.strip():
        raise HTTPException(
            status_code=400, detail="Revolut is not configured for this tenant"
        )

    currency = "EUR"
    if tenant.currency_code and isinstance(tenant.currency_code, str):
        currency = tenant.currency_code.strip().upper()
    else:
        c = _get_stripe_currency_code(tenant.currency) or settings.stripe_currency
        if c:
            currency = c.upper()

    redirect_url = None
    cancel_url = None
    if settings.public_app_base_url:
        base = settings.public_app_base_url.rstrip("/")
        redirect_url = f"{base}/menu/{table_token}/payment-success?order_id={order_id}"
        cancel_url = f"{base}/menu/{table_token}"

    try:
        rev_order = _revolut_create_order(
            secret=revolut_secret.strip(),
            amount_cents=total_cents,
            currency=currency,
            merchant_order_ext_ref=str(order.id),
            redirect_url=redirect_url,
            cancel_url=cancel_url,
        )
    except requests.RequestException as e:
        logger.exception("Revolut create order failed")
        detail = str(e)
        if getattr(e, "response", None) is not None and hasattr(e.response, "text"):
            try:
                detail = e.response.text or detail
            except Exception:
                pass
        raise HTTPException(status_code=502, detail=f"Revolut request failed: {detail}") from e

    revolut_id = rev_order.get("id") or rev_order.get("order_id")
    checkout_url = rev_order.get("checkout_url")
    if not revolut_id or not checkout_url:
        raise HTTPException(
            status_code=502,
            detail="Invalid response from Revolut (missing id or checkout_url)",
        )

    order.revolut_order_id = str(revolut_id)
    session.add(order)
    session.commit()

    return {
        "checkout_url": checkout_url,
        "revolut_order_id": str(revolut_id),
        "order_id": order.id,
    }


@app.post("/orders/{order_id}/confirm-revolut-payment")
@limiter.limit(f"{getattr(settings, 'rate_limit_payment_per_minute', 10)}/minute")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_payment_per_order_per_hour', 3)}/hour",
    key_func=_rate_limit_key_payment_order,
)
def confirm_revolut_payment(
    request: Request,
    order_id: int,
    table_token: str,
    session: Session = Depends(get_session),
) -> dict:
    """Verify Revolut order is completed and mark our order as paid."""
    table = session.exec(
        select(models.Table).where(models.Table.token == table_token)
    ).first()
    if not table:
        raise HTTPException(status_code=404, detail="Invalid table")

    order = session.exec(
        select(models.Order).where(
            models.Order.id == order_id, models.Order.table_id == table.id
        )
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if not order.revolut_order_id:
        raise HTTPException(
            status_code=400,
            detail="No Revolut order linked; create a Revolut checkout first",
        )

    tenant = session.exec(
        select(models.Tenant).where(models.Tenant.id == order.tenant_id)
    ).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    revolut_secret = tenant.revolut_merchant_secret or settings.revolut_merchant_secret
    if not revolut_secret or not revolut_secret.strip():
        raise HTTPException(
            status_code=400, detail="Revolut is not configured for this tenant"
        )

    try:
        rev_order = _revolut_retrieve_order(
            revolut_secret.strip(), order.revolut_order_id
        )
    except requests.RequestException as e:
        logger.exception("Revolut retrieve order failed")
        raise HTTPException(
            status_code=502,
            detail="Revolut request failed",
        ) from e

    state = (rev_order.get("state") or rev_order.get("status") or "").upper()
    if state not in ("COMPLETED", "AUTHORISED", "CAPTURED"):
        raise HTTPException(
            status_code=400,
            detail=f"Revolut order not completed (state: {state})",
        )

    items = session.exec(
        select(models.OrderItem).where(models.OrderItem.order_id == order_id)
    ).all()
    total_cents = sum(item.price_cents * item.quantity for item in items)
    rev_amount = rev_order.get("order_amount") or rev_order.get("amount")
    if rev_amount is not None and int(rev_amount) != total_cents:
        raise HTTPException(
            status_code=400,
            detail="Payment amount does not match order total",
        )

    order.status = models.OrderStatus.paid
    order.payment_method = "revolut"
    order.paid_at = datetime.now(timezone.utc)
    order.notes = f"{order.notes or ''}\n[PAID: Revolut {order.revolut_order_id}]".strip()
    session.add(order)
    session.commit()

    publish_order_update(
        order.tenant_id,
        {
            "type": "order_paid",
            "order_id": order.id,
            "table_name": table.name,
            "status": order.status.value,
        },
        table_id=order.table_id,
    )

    return {"status": "paid", "order_id": order.id}
