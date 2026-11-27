"""Platform monthly feature digest helpers (#453)."""

from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Any

from sqlmodel import Session, select

from . import models
from .settings import settings


ALLOWED_LOCALES = frozenset({"en", "es", "de", "fr", "ca", "ar", "bg", "hi", "ur", "zh-CN"})
MAX_SUBJECT_LEN = 200
MAX_BODY_LEN = 100_000


def ensure_unsub_token(user: models.User, session: Session, *, commit: bool = True) -> str:
    """Ensure owner has an opaque unsubscribe token; returns it."""
    existing = (getattr(user, "feature_digest_unsub_token", None) or "").strip()
    if existing:
        return existing
    token = secrets.token_urlsafe(24)
    user.feature_digest_unsub_token = token
    session.add(user)
    if commit:
        session.commit()
        session.refresh(user)
    return token


def get_or_create_mail_settings(session: Session) -> models.PlatformMailSettings:
    row = session.get(models.PlatformMailSettings, 1)
    if row is not None:
        return row
    row = models.PlatformMailSettings(id=1, locale="en")
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


def normalize_locale(raw: str | None) -> str:
    loc = (raw or "en").strip() or "en"
    if loc in ALLOWED_LOCALES:
        return loc
    # Accept zh_CN style
    if loc.replace("_", "-") in ALLOWED_LOCALES:
        return loc.replace("_", "-")
    return "en"


def platform_smtp_config(session: Session) -> dict[str, Any]:
    """
    SMTP for platform-owned mail: platform_mail_settings when credentials set,
    else global config.env SMTP (not tenant newsletter SMTP).
    """
    row = get_or_create_mail_settings(session)
    use_platform = bool((row.smtp_user or "").strip() and (row.smtp_password or "").strip())
    if use_platform:
        return {
            "host": (row.smtp_host or settings.smtp_host or "smtp.gmail.com").strip(),
            "port": int(row.smtp_port if row.smtp_port is not None else settings.smtp_port),
            "use_tls": bool(row.smtp_use_tls if row.smtp_use_tls is not None else settings.smtp_use_tls),
            "user": (row.smtp_user or "").strip(),
            "password": row.smtp_password or "",
            "from_email": (row.email_from or settings.email_from or "").strip(),
            "from_name": (row.email_from_name or settings.email_from_name or "Satisfecho").strip(),
        }
    return {
        "host": settings.smtp_host,
        "port": settings.smtp_port,
        "use_tls": settings.smtp_use_tls,
        "user": settings.smtp_user,
        "password": settings.smtp_password,
        "from_email": settings.email_from,
        "from_name": settings.email_from_name or "Satisfecho",
    }


def platform_smtp_configured(session: Session) -> bool:
    cfg = platform_smtp_config(session)
    return bool(cfg.get("user") and cfg.get("password"))


def subscribed_owner_audience(session: Session) -> list[models.User]:
    """Verified restaurant owners who have not unsubscribed (all sign-ups / customers)."""
    rows = session.exec(
        select(models.User).where(
            models.User.role == models.UserRole.owner,
            models.User.tenant_id.is_not(None),  # type: ignore[union-attr]
            models.User.email_verified == True,  # noqa: E712
            models.User.feature_digest_subscribed == True,  # noqa: E712
        )
    ).all()
    out: list[models.User] = []
    for u in rows:
        email = (u.email or "").strip()
        if not email or "@" not in email:
            continue
        # Soft-deleted tenants are skipped
        tenant = session.get(models.Tenant, u.tenant_id) if u.tenant_id else None
        if tenant and getattr(tenant, "soft_deleted_at", None):
            continue
        out.append(u)
    return out


def unsubscribe_url(token: str) -> str:
    base = (settings.public_app_base_url or "").strip().rstrip("/")
    rp = (settings.root_path or "").strip().rstrip("/")
    api_base = f"{base}{rp}" if rp else base
    if not api_base:
        return f"/public/feature-digest/unsubscribe/{token}"
    return f"{api_base}/public/feature-digest/unsubscribe/{token}"


def wrap_digest_html(body_html: str, *, unsubscribe_href: str, lang: str = "en") -> str:
    import html as html_lib

    from .messages import get_message

    brand = "Satisfecho"
    unsub_label = html_lib.escape(get_message("email_feature_digest_unsubscribe_link", lang))
    footer = html_lib.escape(get_message("email_feature_digest_footer", lang))
    href = html_lib.escape(unsubscribe_href, quote=True)
    inner = body_html or ""
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{brand}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" style="max-width:600px;background:#ffffff;border-radius:8px;">
          <tr>
            <td style="padding:20px 24px 8px;font-size:18px;font-weight:700;border-bottom:1px solid #eee;">
              {brand}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px 28px;font-size:16px;line-height:1.55;">
              {inner}
            </td>
          </tr>
          <tr>
            <td style="padding:12px 24px 20px;font-size:12px;color:#666;border-top:1px solid #eee;">
              <p style="margin:0 0 8px;">{footer}</p>
              <p style="margin:0;"><a href="{href}">{unsub_label}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def apply_unsubscribe(session: Session, token: str) -> bool:
    tok = (token or "").strip()
    if not tok:
        return False
    user = session.exec(
        select(models.User).where(models.User.feature_digest_unsub_token == tok)
    ).first()
    if user is None:
        return False
    user.feature_digest_subscribed = False
    user.feature_digest_unsub_token = tok  # keep token stable
    session.add(user)
    session.commit()
    return True


def stamp_now() -> datetime:
    return datetime.now(timezone.utc)
