"""
Reservation confirmation emails: simple {{placeholder}} substitution only.

Security: no Jinja/format eval — only an allowlist of placeholder names is replaced.
Dynamic values are HTML-escaped in the HTML part; static template text is escaped too,
except for reservation_link_block_html (server-generated <a> only).
"""

from __future__ import annotations

import html
import re
from typing import TYPE_CHECKING

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
        "cancellation_policy",
        "prepayment_text",
        "prepayment_notice",
        "dress_code",
        "arrival_note",
        "restaurant_phone",
        "restaurant_email",
    }
)

# Injected as raw HTML (built only from server-side URL); never from user-controlled template text alone.
_TRUSTED_HTML_PLACEHOLDERS: frozenset[str] = frozenset({"reservation_link_block_html"})

MAX_SUBJECT_LEN = 200
MAX_BODY_LEN = 32000

DEFAULT_SUBJECT = "Reservation confirmed at {{restaurant_name}}"

DEFAULT_BODY = """Hi {{customer_name}},

Your reservation at {{restaurant_name}} is confirmed.

Date: {{date}}
Time: {{time}}
Party size: {{party_size}}

{{cancellation_policy}}

{{prepayment_notice}}

{{dress_code}}

{{arrival_note}}

{{reservation_link_block_html}}

We look forward to seeing you.

---
{{restaurant_name}}
"""


def _format_money_line(cents: int | None, currency_code: str | None) -> str:
    if cents is None or cents <= 0:
        return ""
    code = (currency_code or "EUR").strip().upper()
    amount = cents / 100.0
    return f"Prepayment amount: {amount:.2f} {code}"


def _prepayment_notice(tenant: Tenant) -> str:
    parts: list[str] = []
    line = _format_money_line(tenant.reservation_prepayment_cents, tenant.currency_code)
    if line:
        parts.append(line)
    pt = (tenant.reservation_prepayment_text or "").strip()
    if pt:
        parts.append(pt)
    return "\n".join(parts)


def _arrival_note(tenant: Tenant) -> str:
    m = tenant.reservation_arrival_tolerance_minutes
    if m is None or m <= 0:
        return ""
    return f"Please arrive within {m} minutes of your booking time."


def _link_block_plain(view_url: str | None) -> str:
    if not view_url:
        return ""
    return f"View or change your reservation online:\n{view_url}"


def _link_block_html(view_url: str | None) -> str:
    if not view_url:
        return ""
    safe_href = html.escape(view_url, quote=True)
    return (
        f'<p><a href="{safe_href}">View or change your reservation online</a></p>'
    )


def build_value_maps(
    tenant: Tenant,
    customer_name: str,
    reservation_date: str,
    reservation_time: str,
    party_size: int,
    view_url: str | None,
) -> tuple[dict[str, str], dict[str, str]]:
    """Plain values for text/*; html_map has the same keys with scalars escaped, plus trusted HTML block."""
    plain: dict[str, str] = {
        "restaurant_name": tenant.name or "",
        "customer_name": customer_name or "",
        "date": reservation_date or "",
        "time": reservation_time or "",
        "party_size": str(party_size),
        "reservation_url": view_url or "",
        "reservation_link_block_html": _link_block_plain(view_url),
        "cancellation_policy": (tenant.reservation_cancellation_policy or "").strip(),
        "prepayment_text": (tenant.reservation_prepayment_text or "").strip(),
        "prepayment_notice": _prepayment_notice(tenant),
        "dress_code": (tenant.reservation_dress_code or "").strip(),
        "arrival_note": _arrival_note(tenant),
        "restaurant_phone": (tenant.phone or "").strip(),
        "restaurant_email": (tenant.email or "").strip(),
    }
    html_map: dict[str, str] = {}
    for k, v in plain.items():
        if k in _TRUSTED_HTML_PLACEHOLDERS:
            continue
        html_map[k] = html.escape(v, quote=False)
    html_map["reservation_link_block_html"] = _link_block_html(view_url)
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
) -> tuple[str, str, str]:
    """
    Returns (subject_plain, text_body, html_fragment_body).

    html_fragment_body is inner content only; email_service wraps it in a minimal document.
    """
    sub_t = (tenant.reservation_confirmation_email_subject or "").strip() or DEFAULT_SUBJECT
    body_t = (tenant.reservation_confirmation_email_body or "").strip() or DEFAULT_BODY

    plain, html_map = build_value_maps(
        tenant, customer_name, reservation_date, reservation_time, party_size, view_url
    )
    subject = normalize_subject(render_plain_body(sub_t, plain))
    text_body = _collapse_blank_lines(render_plain_body(body_t, plain))
    html_inner = render_html_body(body_t, html_map)
    return subject, text_body, html_inner


def wrap_html_email(inner_html: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333;">
<div style="max-width: 600px; margin: 0 auto; padding: 16px;">
{inner_html}
</div>
</body>
</html>"""
