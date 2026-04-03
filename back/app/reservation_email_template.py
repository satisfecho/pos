"""
Reservation confirmation emails: simple {{placeholder}} substitution only.

Security: no Jinja/format eval — only an allowlist of placeholder names is replaced.
Dynamic values are HTML-escaped in the HTML part; static template text is escaped too,
except for reservation_link_block_html (server-generated <a> only).

Prepayment placeholders (avoid duplicate wording in custom bodies):
- {{prepayment_notice}} — localized prepayment amount line (if any) plus tenant
  reservation_prepayment_text. Prefer this in templates.
- {{prepayment_text}} — tenant reservation_prepayment_text only. Use when you build a
  custom layout without {{prepayment_notice}}; do not use both for the same text.
"""

from __future__ import annotations

import html
import re
from urllib.parse import quote
from typing import TYPE_CHECKING

from .messages import get_message

if TYPE_CHECKING:
    from .models import Tenant

# Placeholders use letters, numbers, underscore; must start with a letter (blocks __builtins__-style names).
_PLACEHOLDER_RE = re.compile(r"\{\{\s*([a-z][a-z0-9_]*)\s*\}\}")

# Every name listed here may be replaced; anything else is left unchanged in the template.
ALLOWED_PLACEHOLDERS: frozenset[str] = frozenset(
    {
        "restaurant_name",
        "customer_name",
        "date",
        "time",
        "party_size",
        "reservation_url",
        "reservation_link_block_html",
        "google_maps_link_block_html",
        "openstreetmap_link_block_html",
        "cancellation_policy",
        "prepayment_text",
        "prepayment_notice",
        "dress_code",
        "arrival_note",
        "restaurant_phone",
        "restaurant_email",
        "restaurant_contact_block_html",
    }
)

# Injected as raw HTML (built only from server-side URL); never from user-controlled template text alone.
_TRUSTED_HTML_PLACEHOLDERS: frozenset[str] = frozenset(
    {
        "reservation_link_block_html",
        "restaurant_contact_block_html",
        "google_maps_link_block_html",
        "openstreetmap_link_block_html",
    }
)

MAX_SUBJECT_LEN = 200
MAX_BODY_LEN = 32000


def default_confirmation_body_template(lang: str = "en") -> str:
    """Built-in body when the tenant has not set reservation_confirmation_email_body."""
    g = get_message("email_reservation_confirmation_greeting", lang)
    intro = get_message("email_reservation_confirmation_intro", lang)
    ld = get_message("email_reservation_confirmation_label_date", lang)
    lt = get_message("email_reservation_confirmation_label_time", lang)
    lp = get_message("email_reservation_confirmation_label_party", lang)
    closing = get_message("email_reservation_confirmation_closing", lang)
    return f"""{g}

{intro}

{ld}: {{{{date}}}}
{lt}: {{{{time}}}}
{lp}: {{{{party_size}}}}

{{{{cancellation_policy}}}}

{{{{prepayment_notice}}}}

{{{{dress_code}}}}

{{{{arrival_note}}}}

{{{{reservation_link_block_html}}}}

{{{{google_maps_link_block_html}}}}
{{{{openstreetmap_link_block_html}}}}

{{{{restaurant_contact_block_html}}}}

{closing}

---
{{{{restaurant_name}}}}
"""


def _format_money_line(cents: int | None, currency_code: str | None, lang: str = "en") -> str:
    if cents is None or cents <= 0:
        return ""
    code = (currency_code or "EUR").strip().upper()
    amount = cents / 100.0
    amount_s = f"{amount:.2f}"
    return get_message("email_reservation_prepayment_amount", lang, amount=amount_s, currency=code)


def _prepayment_notice(tenant: Tenant, lang: str = "en") -> str:
    parts: list[str] = []
    line = _format_money_line(tenant.reservation_prepayment_cents, tenant.currency_code, lang)
    if line:
        parts.append(line)
    pt = (tenant.reservation_prepayment_text or "").strip()
    if pt:
        parts.append(pt)
    return "\n".join(parts)


def _arrival_note(tenant: Tenant, lang: str = "en") -> str:
    m = tenant.reservation_arrival_tolerance_minutes
    if m is None or m <= 0:
        return ""
    return get_message("email_reservation_arrival_tolerance", lang, minutes=m)


def _link_block_plain(view_url: str | None, lang: str = "en") -> str:
    if not view_url:
        return ""
    label = get_message("email_reservation_manage_link_text", lang)
    return f"{label}\n{view_url}"


def _link_block_html(view_url: str | None, lang: str = "en") -> str:
    if not view_url:
        return ""
    safe_href = html.escape(view_url, quote=True)
    label = get_message("email_reservation_manage_link_text", lang)
    safe_label = html.escape(label, quote=False)
    return (
        f'<p style="margin:20px 0 16px 0;text-align:center;">'
        f'<a href="{safe_href}" style="display:inline-block;padding:12px 22px;background-color:#1d4ed8;'
        f"color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;"
        f'font-family:Arial,Helvetica,sans-serif;">{safe_label}</a></p>'
    )


def _map_link_plain(link_label: str, url: str | None) -> str:
    if not url or not str(url).strip():
        return ""
    return f"{link_label}\n{str(url).strip()}"


def _map_link_html(link_label: str, url: str | None) -> str:
    if not url or not str(url).strip():
        return ""
    u = str(url).strip()
    safe_href = html.escape(u, quote=True)
    return f'<p><a href="{safe_href}">{html.escape(link_label, quote=False)}</a></p>'


def google_maps_link_block_plain(tenant: Tenant, lang: str = "en") -> str:
    label = get_message("email_reservation_maps_google", lang)
    return _map_link_plain(label, getattr(tenant, "public_google_maps_url", None))


def google_maps_link_block_html(tenant: Tenant, lang: str = "en") -> str:
    label = get_message("email_reservation_maps_google", lang)
    return _map_link_html(label, getattr(tenant, "public_google_maps_url", None))


def openstreetmap_link_block_plain(tenant: Tenant, lang: str = "en") -> str:
    label = get_message("email_reservation_maps_osm", lang)
    return _map_link_plain(label, getattr(tenant, "public_openstreetmap_url", None))


def openstreetmap_link_block_html(tenant: Tenant, lang: str = "en") -> str:
    label = get_message("email_reservation_maps_osm", lang)
    return _map_link_html(label, getattr(tenant, "public_openstreetmap_url", None))


def _tel_uri(display_phone: str) -> str | None:
    """Build a tel: href from a human-entered number; None if no dialable digits."""
    compact = "".join(c for c in display_phone.strip() if c.isdigit() or c == "+")
    return f"tel:{compact}" if compact else None


def contact_block_plain(tenant: Tenant, lang: str = "en") -> str:
    """Plain-text contact lines (phone + public email); empty if both missing."""
    phone = (tenant.phone or "").strip()
    em = (tenant.email or "").strip()
    if not phone and not em:
        return ""
    heading = get_message("email_reservation_contact_heading", lang)
    phone_l = get_message("email_reservation_contact_phone_label", lang)
    email_l = get_message("email_reservation_contact_email_label", lang)
    lines = [f"{heading}:"]
    if phone:
        lines.append(f"{phone_l}: {phone}")
    if em:
        lines.append(f"{email_l}: {em}")
    return "\n".join(lines)


def contact_block_html(tenant: Tenant, lang: str = "en") -> str:
    """HTML contact block with tel:/mailto: links; empty if both missing."""
    phone = (tenant.phone or "").strip()
    em = (tenant.email or "").strip()
    if not phone and not em:
        return ""
    heading = html.escape(get_message("email_reservation_contact_heading", lang), quote=False)
    phone_l = html.escape(get_message("email_reservation_contact_phone_label", lang), quote=False)
    email_l = html.escape(get_message("email_reservation_contact_email_label", lang), quote=False)
    parts: list[str] = [f"<p><strong>{heading}</strong>"]
    if phone:
        tel = _tel_uri(phone)
        if tel:
            parts.append(
                f'<br>{phone_l}: <a href="{html.escape(tel, quote=True)}">'
                f"{html.escape(phone, quote=False)}</a>"
            )
        else:
            parts.append(f"<br>{phone_l}: {html.escape(phone, quote=False)}")
    if em:
        mailto = f"mailto:{em}"
        parts.append(
            f'<br>{email_l}: <a href="{html.escape(mailto, quote=True)}">'
            f"{html.escape(em, quote=False)}</a>"
        )
    parts.append("</p>")
    return "".join(parts)


def build_value_maps(
    tenant: Tenant,
    customer_name: str,
    reservation_date: str,
    reservation_time: str,
    party_size: int,
    view_url: str | None,
    lang: str = "en",
) -> tuple[dict[str, str], dict[str, str]]:
    """Plain values for text/*; html_map has the same keys with scalars escaped, plus trusted HTML block."""
    plain: dict[str, str] = {
        "restaurant_name": tenant.name or "",
        "customer_name": customer_name or "",
        "date": reservation_date or "",
        "time": reservation_time or "",
        "party_size": str(party_size),
        "reservation_url": view_url or "",
        "reservation_link_block_html": _link_block_plain(view_url, lang),
        "google_maps_link_block_html": google_maps_link_block_plain(tenant, lang),
        "openstreetmap_link_block_html": openstreetmap_link_block_plain(tenant, lang),
        "cancellation_policy": (tenant.reservation_cancellation_policy or "").strip(),
        "prepayment_text": (tenant.reservation_prepayment_text or "").strip(),
        "prepayment_notice": _prepayment_notice(tenant, lang),
        "dress_code": (tenant.reservation_dress_code or "").strip(),
        "arrival_note": _arrival_note(tenant, lang),
        "restaurant_phone": (tenant.phone or "").strip(),
        "restaurant_email": (tenant.email or "").strip(),
        "restaurant_contact_block_html": contact_block_plain(tenant, lang),
    }
    html_map: dict[str, str] = {}
    for k, v in plain.items():
        if k in _TRUSTED_HTML_PLACEHOLDERS:
            continue
        html_map[k] = html.escape(v, quote=False)
    html_map["reservation_link_block_html"] = _link_block_html(view_url, lang)
    html_map["google_maps_link_block_html"] = google_maps_link_block_html(tenant, lang)
    html_map["openstreetmap_link_block_html"] = openstreetmap_link_block_html(tenant, lang)
    html_map["restaurant_contact_block_html"] = contact_block_html(tenant, lang)
    return plain, html_map


def render_plain_body(template: str, plain: dict[str, str]) -> str:
    out: list[str] = []
    last = 0
    for m in _PLACEHOLDER_RE.finditer(template):
        out.append(template[last : m.start()])
        key = m.group(1)
        if key not in ALLOWED_PLACEHOLDERS:
            out.append(m.group(0))
        else:
            out.append(plain.get(key, ""))
        last = m.end()
    out.append(template[last:])
    return "".join(out)


def render_html_body(template: str, html_values: dict[str, str]) -> str:
    out: list[str] = []
    last = 0
    for m in _PLACEHOLDER_RE.finditer(template):
        out.append(html.escape(template[last : m.start()], quote=False))
        key = m.group(1)
        if key not in ALLOWED_PLACEHOLDERS:
            out.append(html.escape(m.group(0), quote=False))
        elif key in _TRUSTED_HTML_PLACEHOLDERS:
            out.append(html_values.get(key, ""))
        else:
            out.append(html_values.get(key, ""))
        last = m.end()
    out.append(html.escape(template[last:], quote=False))
    return "".join(out)


def _collapse_blank_lines(s: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", s.strip())


def normalize_subject(subject: str) -> str:
    one_line = " ".join(subject.split())
    if len(one_line) > MAX_SUBJECT_LEN:
        return one_line[: MAX_SUBJECT_LEN - 1] + "…"
    return one_line


def render_confirmation_email(
    tenant: Tenant,
    customer_name: str,
    reservation_date: str,
    reservation_time: str,
    party_size: int,
    view_url: str | None,
    lang: str = "en",
) -> tuple[str, str, str]:
    """
    Returns (subject_plain, text_body, html_fragment_body).

    html_fragment_body is inner content only; email_service wraps it in a minimal document.
    """
    sub_t = (tenant.reservation_confirmation_email_subject or "").strip() or get_message(
        "email_reservation_confirmation_default_subject", lang
    )
    body_t = (tenant.reservation_confirmation_email_body or "").strip() or default_confirmation_body_template(
        lang
    )

    plain, html_map = build_value_maps(
        tenant, customer_name, reservation_date, reservation_time, party_size, view_url, lang
    )
    subject = normalize_subject(render_plain_body(sub_t, plain))
    text_body = _collapse_blank_lines(render_plain_body(body_t, plain))
    html_inner = render_html_body(body_t, html_map)
    return subject, text_body, html_inner


def tenant_logo_block_html(
    tenant: Tenant | None, public_app_base_url: str | None, lang: str = "en"
) -> str:
    """Centered optional logo when tenant has logo and public base URL is set."""
    if not tenant or not public_app_base_url or not tenant.logo_filename:
        return ""
    tid = tenant.id
    if tid is None:
        return ""
    fn = quote(str(tenant.logo_filename).strip(), safe="/.-_")
    safe_base = public_app_base_url.rstrip("/")
    url = f"{safe_base}/uploads/{tid}/logo/{fn}"
    alt_fb = get_message("email_reservation_logo_alt_fallback", lang)
    alt = html.escape((tenant.name or alt_fb).strip() or alt_fb, quote=False)
    return (
        f'<img src="{html.escape(url, quote=True)}" alt="{alt}" width="200" '
        'style="max-width:220px;height:auto;display:block;margin:0 auto 4px auto;border:0;outline:none;" />'
    )


def reservation_email_document(
    inner_html: str,
    *,
    tenant: Tenant | None = None,
    public_app_base_url: str | None = None,
    lang: str = "en",
    footer_kind: str = "confirmation",
    footer_restaurant_name: str | None = None,
) -> str:
    """
    Shared transactional layout: muted outer background, white card, optional logo, footer strip.
    `footer_kind` is \"confirmation\" or \"reminder\".
    `footer_restaurant_name` overrides the name used in the footer (e.g. when tenant is None in tests).
    """
    logo_html = tenant_logo_block_html(tenant, public_app_base_url, lang)
    brand_plain = (footer_restaurant_name or (tenant.name if tenant else "") or "").strip()
    restaurant = html.escape(brand_plain, quote=False)
    if footer_kind == "reminder":
        footer_line = get_message(
            "email_reservation_reminder_footer",
            lang,
            restaurant_name=brand_plain,
        )
    else:
        footer_line = get_message(
            "email_reservation_confirmation_footer",
            lang,
            restaurant_name=brand_plain,
        )
    safe_footer = html.escape(footer_line, quote=False)

    return f"""<!DOCTYPE html>
<html lang="{html.escape(lang.split("-")[0], quote=True)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>{restaurant}</title>
</head>
<body style="margin:0;padding:0;background-color:#eef1f5;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#eef1f5;border-collapse:collapse;">
<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:14px;border:1px solid #e2e6ec;border-collapse:separate;overflow:hidden;">
<tr><td style="padding:28px 28px 8px 28px;text-align:center;background-color:#fafbfc;border-bottom:1px solid #eef1f5;">
{logo_html}
</td></tr>
<tr><td style="padding:24px 28px 32px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;color:#1f2937;">
{inner_html}
</td></tr>
<tr><td style="padding:16px 28px 22px 28px;background-color:#f8fafc;border-top:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#6b7280;">
{safe_footer}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>"""


def wrap_html_email(
    inner_html: str,
    *,
    tenant: Tenant | None = None,
    public_app_base_url: str | None = None,
    lang: str = "en",
) -> str:
    """Wrap confirmation fragment (from render_html_body) in the shared transactional layout."""
    return reservation_email_document(
        inner_html,
        tenant=tenant,
        public_app_base_url=public_app_base_url,
        lang=lang,
        footer_kind="confirmation",
    )


def render_reminder_email(
    customer_name: str,
    reservation_date: str,
    reservation_time: str,
    party_size: int,
    tenant_name: str,
    view_url: str | None,
    tenant: Tenant | None,
    public_app_base_url: str | None,
    lang: str = "en",
) -> tuple[str, str, str]:
    """
    Subject, plain text, and full HTML for reservation reminder emails.
    Matches confirmation styling and uses the same manage-reservation link pattern as _link_block_html.
    """
    subject = get_message(
        "email_reservation_reminder_subject",
        lang,
        restaurant_name=tenant_name or "",
    )

    heading = get_message("email_reservation_reminder_heading", lang)
    greeting = get_message("email_reservation_reminder_greeting", lang, customer_name=customer_name or "")
    intro = get_message("email_reservation_reminder_intro", lang, restaurant_name=tenant_name or "")
    lb_date = get_message("email_reservation_reminder_label_date", lang)
    lb_time = get_message("email_reservation_reminder_label_time", lang)
    lb_party = get_message("email_reservation_reminder_label_party", lang)
    closing = get_message("email_reservation_reminder_closing", lang)

    maps_html = ""
    maps_plain = ""
    if tenant:
        maps_html = google_maps_link_block_html(tenant, lang) + openstreetmap_link_block_html(
            tenant, lang
        )
        gp = google_maps_link_block_plain(tenant, lang)
        op = openstreetmap_link_block_plain(tenant, lang)
        if gp:
            maps_plain += f"\n{gp}\n"
        if op:
            maps_plain += f"\n{op}\n"

    contact_html = contact_block_html(tenant, lang) if tenant else ""
    contact_plain = contact_block_plain(tenant, lang) if tenant else ""

    view_block = _link_block_html(view_url, lang)

    inner = f"""
<h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.02em;">{html.escape(heading, quote=False)}</h1>
<p style="margin:0 0 12px 0;">{html.escape(greeting, quote=False)}</p>
<p style="margin:0 0 20px 0;">{html.escape(intro, quote=False)}</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;border-radius:10px;border-collapse:separate;margin:0 0 20px 0;">
<tr><td style="padding:16px 18px;font-size:15px;color:#374151;">
<p style="margin:0 0 8px 0;"><strong style="color:#111827;">{html.escape(lb_date, quote=False)}</strong> &nbsp;<span style="white-space:nowrap;">{html.escape(reservation_date, quote=False)}</span></p>
<p style="margin:0 0 8px 0;"><strong style="color:#111827;">{html.escape(lb_time, quote=False)}</strong> &nbsp;<span style="white-space:nowrap;">{html.escape(reservation_time, quote=False)}</span></p>
<p style="margin:0;"><strong style="color:#111827;">{html.escape(lb_party, quote=False)}</strong> &nbsp;{party_size}</p>
</td></tr>
</table>
<p style="margin:0 0 8px 0;">{html.escape(closing, quote=False)}</p>
{view_block}
{maps_html}
{contact_html}
"""

    html_content = reservation_email_document(
        inner,
        tenant=tenant,
        public_app_base_url=public_app_base_url,
        lang=lang,
        footer_kind="reminder",
        footer_restaurant_name=tenant_name,
    )

    text_lines = [
        heading,
        "",
        greeting,
        "",
        intro,
        "",
        f"{lb_date}: {reservation_date}",
        f"{lb_time}: {reservation_time}",
        f"{lb_party}: {party_size}",
        "",
        closing,
    ]
    if view_url:
        text_lines.append("")
        text_lines.append(_link_block_plain(view_url, lang))
    if maps_plain.strip():
        text_lines.append(maps_plain.rstrip())
    if contact_plain:
        text_lines.append("")
        text_lines.append(contact_plain)
    if tenant and tenant.timezone and str(tenant.timezone).strip():
        text_lines.append("")
        text_lines.append(
            get_message(
                "email_reservation_timezone_note",
                lang,
                timezone=str(tenant.timezone).strip(),
            )
        )
    text_lines.append("")
    text_lines.append(
        get_message("email_reservation_reminder_footer", lang, restaurant_name=tenant_name or "")
    )
    text_content = "\n".join(text_lines)

    return subject, text_content, html_content
