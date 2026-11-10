"""Build newsletter HTML: wrap body, inject open pixel and click redirects (#435)."""

from __future__ import annotations

import html
import re
from typing import TYPE_CHECKING
from urllib.parse import quote, urlparse

if TYPE_CHECKING:
    from .models import Tenant

_HREF_RE = re.compile(
    r"""(?P<prefix><a\b[^>]*?\bhref\s*=\s*)(?P<q>["'])(?P<url>[^"']+)(?P=q)""",
    re.IGNORECASE,
)

# 1x1 transparent GIF
PIXEL_GIF = (
    b"GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00"
    b"\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
)

MAX_NEWSLETTER_SUBJECT_LEN = 200
MAX_NEWSLETTER_BODY_LEN = 100_000


def _public_api_base() -> str:
    from .settings import settings

    base = (settings.public_app_base_url or "").strip().rstrip("/")
    if not base:
        return ""
    rp = (settings.root_path or "").strip().rstrip("/")
    return f"{base}{rp}" if rp else base


def is_safe_http_url(url: str) -> bool:
    try:
        parsed = urlparse(url.strip())
    except Exception:
        return False
    if parsed.scheme not in ("http", "https"):
        return False
    if not parsed.netloc:
        return False
    return True


def click_redirect_url(tracking_token: str, target_url: str) -> str:
    base = _public_api_base()
    if not base:
        return target_url
    return f"{base}/public/newsletter/c/{tracking_token}?u={quote(target_url, safe='')}"


def open_pixel_url(tracking_token: str) -> str:
    base = _public_api_base()
    if not base:
        return ""
    return f"{base}/public/newsletter/o/{tracking_token}"


def rewrite_links_for_tracking(body_html: str, tracking_token: str) -> str:
    def _repl(m: re.Match[str]) -> str:
        url = m.group("url").strip()
        if not is_safe_http_url(url):
            return m.group(0)
        tracked = click_redirect_url(tracking_token, url)
        return f"{m.group('prefix')}{m.group('q')}{tracked}{m.group('q')}"

    return _HREF_RE.sub(_repl, body_html)


def wrap_newsletter_document(
    body_html: str,
    *,
    tenant: Tenant | None,
    tracking_token: str | None = None,
) -> str:
    """Wrap staff HTML fragment in a simple branded document; optionally add tracking."""
    name = html.escape((tenant.name if tenant else None) or "Restaurant")
    inner = body_html or ""
    if tracking_token:
        inner = rewrite_links_for_tracking(inner, tracking_token)
        pixel = open_pixel_url(tracking_token)
        if pixel:
            inner += (
                f'<img src="{html.escape(pixel)}" width="1" height="1" alt="" '
                f'style="display:block;width:1px;height:1px;border:0" />'
            )

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{name}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" style="max-width:600px;background:#ffffff;border-radius:8px;">
          <tr>
            <td style="padding:20px 24px 8px;font-size:18px;font-weight:700;border-bottom:1px solid #eee;">
              {name}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px 28px;font-size:16px;line-height:1.55;">
              {inner}
            </td>
          </tr>
          <tr>
            <td style="padding:12px 24px 20px;font-size:12px;color:#666;border-top:1px solid #eee;">
              You received this email because you are a customer of {name}.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def plain_fallback(body_html: str, body_text: str | None) -> str:
    if body_text and body_text.strip():
        return body_text.strip()
    # Crude strip of tags for multipart alternative
    text = re.sub(r"<br\s*/?>", "\n", body_html or "", flags=re.IGNORECASE)
    text = re.sub(r"</p\s*>", "\n\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    return html.unescape(text).strip() or "(no content)"
