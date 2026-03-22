from pathlib import Path

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


_PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Only use absolute paths so loading works regardless of CWD (e.g. uvicorn reload subprocess).
# Include only paths that exist to avoid FileNotFoundError when a path is missing.
_ENV_FILE_PATHS = [
    p for p in (_PROJECT_ROOT / "config.env", _PROJECT_ROOT / ".env")
    if p.exists()
]


class Settings(BaseSettings):
    """
    App configuration.

    This project uses `config.env` (non-dot env file) because some environments
    block creating `.env*` files. If you do have a `.env`, it will also be read.
    """

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE_PATHS if _ENV_FILE_PATHS else None,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    db_host: str = Field(default="localhost", validation_alias="DB_HOST")
    db_port: int = Field(default=5432, validation_alias="DB_PORT")
    db_user: str = Field(default="pos", validation_alias="DB_USER")
    db_password: str = Field(default="pos", validation_alias="DB_PASSWORD")
    db_name: str = Field(default="pos", validation_alias="DB_NAME")

    secret_key: str = Field(
        default="CHANGE_THIS_IN_PRODUCTION", validation_alias="SECRET_KEY"
    )
    algorithm: str = Field(default="HS256", validation_alias="ALGORITHM")
    access_token_expire_minutes: int = Field(
        default=30, validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES"
    )

    # Refresh token settings (separate secret for security)
    refresh_secret_key: str = Field(
        default="CHANGE_THIS_REFRESH_SECRET_IN_PRODUCTION",
        validation_alias="REFRESH_SECRET_KEY",
    )
    refresh_token_expire_days: int = Field(
        default=7, validation_alias="REFRESH_TOKEN_EXPIRE_DAYS"
    )

    stripe_secret_key: str = Field(default="", validation_alias="STRIPE_SECRET_KEY")
    stripe_publishable_key: str = Field(
        default="", validation_alias="STRIPE_PUBLISHABLE_KEY"
    )
    stripe_currency: str = Field(default="eur", validation_alias="STRIPE_CURRENCY")

    # Revolut Merchant API (optional global fallback; tenants can set per-tenant key)
    revolut_merchant_secret: str = Field(
        default="", validation_alias="REVOLUT_MERCHANT_SECRET"
    )

    # CORS configuration
    cors_origins: str = Field(
        default="http://localhost:4200", validation_alias="CORS_ORIGINS"
    )
    
    # Email configuration
    smtp_host: str = Field(default="smtp.gmail.com", validation_alias="SMTP_HOST")
    smtp_port: int = Field(default=587, validation_alias="SMTP_PORT")
    smtp_user: str = Field(default="", validation_alias="SMTP_USER")
    smtp_password: str = Field(default="", validation_alias="SMTP_PASSWORD")
    smtp_use_tls: bool = Field(default=True, validation_alias="SMTP_USE_TLS")
    email_from: str = Field(
        default="noreply@satisfecho.de",
        validation_alias="EMAIL_FROM",
        description="From address when tenant has none; use a domain you control (not example.com).",
    )
    email_from_name: str = Field(default="POS2 System", validation_alias="EMAIL_FROM_NAME")

    # WhatsApp (Twilio) – optional; when set, reminders can be sent via WhatsApp when customer_phone is present
    twilio_account_sid: str = Field(default="", validation_alias="TWILIO_ACCOUNT_SID")
    twilio_auth_token: str = Field(default="", validation_alias="TWILIO_AUTH_TOKEN")
    twilio_whatsapp_from: str = Field(
        default="",
        validation_alias="TWILIO_WHATSAPP_FROM",
        description="E.g. +14155238886 (Twilio sandbox) or your WhatsApp Business number",
    )
    default_phone_country: str = Field(
        default="ES",
        validation_alias="DEFAULT_PHONE_COUNTRY",
        description="ISO 3166-1 alpha-2 country code for normalizing phone numbers without + prefix",
    )
    # Base URL of the public frontend (for links in emails, e.g. reservation view/cancel).
    # When set, reservation reminder emails include a link to /reservation?token=...
    public_app_base_url: str = Field(
        default="",
        validation_alias="PUBLIC_APP_BASE_URL",
        description="e.g. https://example.com or http://localhost:4200",
    )

    # Production mode (enables secure cookies, stricter CORS, etc.)
    is_production: bool = Field(default=False, validation_alias="PRODUCTION")

    # When behind a reverse proxy that mounts the API at a subpath (e.g. /api), set this so
    # OpenAPI docs and spec URLs are correct (e.g. /api/docs, /api/openapi.json).
    root_path: str = Field(default="", validation_alias="ROOT_PATH")

    # Rate limiting (see ROADMAP.md / satisfecho/pos ROADMAP)
    rate_limit_enabled: bool = Field(default=True, validation_alias="RATE_LIMIT_ENABLED")
    rate_limit_redis_url: str = Field(
        default="", validation_alias="RATE_LIMIT_REDIS_URL"
    )  # Empty = use REDIS_URL
    rate_limit_global_per_minute: int = Field(
        default=100, validation_alias="RATE_LIMIT_GLOBAL_PER_MINUTE"
    )
    rate_limit_login_per_15min: int = Field(
        default=5, validation_alias="RATE_LIMIT_LOGIN_PER_15MIN"
    )
    rate_limit_register_per_hour: int = Field(
        default=3, validation_alias="RATE_LIMIT_REGISTER_PER_HOUR"
    )
    rate_limit_payment_per_minute: int = Field(
        default=10, validation_alias="RATE_LIMIT_PAYMENT_PER_MINUTE"
    )
    rate_limit_public_menu_per_minute: int = Field(
        default=30, validation_alias="RATE_LIMIT_PUBLIC_MENU_PER_MINUTE"
    )
    rate_limit_upload_per_hour: int = Field(
        default=10, validation_alias="RATE_LIMIT_UPLOAD_PER_HOUR"
    )
    rate_limit_admin_per_minute: int = Field(
        default=30, validation_alias="RATE_LIMIT_ADMIN_PER_MINUTE"
    )
    rate_limit_payment_per_order_per_hour: int = Field(
        default=3, validation_alias="RATE_LIMIT_PAYMENT_PER_ORDER_PER_HOUR"
    )
    rate_limit_reservation_delay_per_hour: int = Field(
        default=8,
        validation_alias="RATE_LIMIT_RESERVATION_DELAY_PER_HOUR",
        description="Max delay-notice submissions per IP per reservation per hour (public token flow)",
    )
    rate_limit_guest_feedback_per_hour: int = Field(
        default=15,
        validation_alias="RATE_LIMIT_GUEST_FEEDBACK_PER_HOUR",
        description="Max guest feedback submissions per IP per hour (public form)",
    )

    @model_validator(mode="after")
    def _relax_rate_limits_in_dev(self) -> "Settings":
        """Use higher rate limits when not in production so DEV is less restrictive."""
        if not self.is_production:
            self.rate_limit_global_per_minute = 2000
            self.rate_limit_login_per_15min = 100
            self.rate_limit_register_per_hour = 100
            self.rate_limit_payment_per_minute = 200
            self.rate_limit_public_menu_per_minute = 500
            self.rate_limit_upload_per_hour = 500
            self.rate_limit_admin_per_minute = 500
            self.rate_limit_payment_per_order_per_hour = 100
            self.rate_limit_reservation_delay_per_hour = 200
            self.rate_limit_guest_feedback_per_hour = 200
        return self

    @property
    def database_url(self) -> str:
        # SQLModel uses SQLAlchemy under the hood; this uses the psycopg driver (v3).
        # If you prefer psycopg2, change to: postgresql://user:pass@host:port/db
        return (
            f"postgresql+psycopg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


settings = Settings()
