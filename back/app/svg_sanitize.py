"""Sanitize tenant-uploaded SVG logos before storage (GitHub #419).

Allowlist-only rewrite: drops scripts, event handlers, external references, and
unknown elements/attributes. Rejects unparseable or empty results.
"""
from __future__ import annotations

import re
from xml.etree import ElementTree as ET

# Tags commonly needed for simple logo SVGs (local-name, lowercased).
_ALLOWED_TAGS = frozenset(
    {
        "svg",
        "g",
        "path",
        "circle",
        "rect",
        "ellipse",
        "line",
        "polyline",
        "polygon",
        "defs",
        "clippath",
        "mask",
        "symbol",
        "use",
        "lineargradient",
        "radialgradient",
        "stop",
        "title",
        "desc",
        "text",
        "tspan",
        "metadata",
    }
)

# Attribute local-names allowed after lowercasing (no on* handlers).
_ALLOWED_ATTRS = frozenset(
    {
        "id",
        "class",
        "viewbox",
        "xmlns",
        "xmlns:xlink",
        "width",
        "height",
        "x",
        "y",
        "x1",
        "y1",
        "x2",
        "y2",
        "cx",
        "cy",
        "r",
        "rx",
        "ry",
        "d",
        "fill",
        "stroke",
        "stroke-width",
        "stroke-linecap",
        "stroke-linejoin",
        "stroke-dasharray",
        "stroke-opacity",
        "fill-opacity",
        "opacity",
        "transform",
        "gradientunits",
        "gradienttransform",
        "spreadmethod",
        "offset",
        "stop-color",
        "stop-opacity",
        "clip-path",
        "clip-rule",
        "fill-rule",
        "points",
        "preserveaspectratio",
        "version",
        "role",
        "aria-hidden",
        "aria-label",
        "focusable",
        "overflow",
        "font-family",
        "font-size",
        "font-weight",
        "text-anchor",
        "dominant-baseline",
        "href",
        "xlink:href",
    }
)

_BLOCKED_TAG_RE = re.compile(
    r"<\s*(?:script|foreignobject|iframe|embed|object|animate|set|handler)\b",
    re.IGNORECASE,
)
_EVENT_ATTR_RE = re.compile(r"\son[a-z]+\s*=", re.IGNORECASE)
_JS_URL_RE = re.compile(r"(?:href|xlink:href|src)\s*=\s*[\"']?\s*javascript:", re.IGNORECASE)
_DOCTYPE_RE = re.compile(r"<!DOCTYPE|<!ENTITY", re.IGNORECASE)


class SvgSanitizeError(ValueError):
    """Raised when SVG bytes are unsafe or not a usable SVG logo."""


def _local_name(tag: str) -> str:
    if "}" in tag:
        return tag.rsplit("}", 1)[-1].lower()
    return tag.lower()


def _attr_local(name: str) -> str:
    if "}" in name:
        # Clark notation: {ns}href → href; keep xlink:href style for allowlist
        local = name.rsplit("}", 1)[-1].lower()
        if name.startswith("{http://www.w3.org/1999/xlink}"):
            return f"xlink:{local}"
        return local
    return name.lower()


def _is_safe_url(value: str) -> bool:
    v = (value or "").strip()
    if not v:
        return False
    lower = v.lower()
    if lower.startswith("javascript:") or lower.startswith("data:text/html"):
        return False
    if lower.startswith("data:image/"):
        return True
    # Fragment-only or relative path (no scheme)
    if v.startswith("#") or "://" not in v:
        return True
    return False


def _strip_element(el: ET.Element) -> ET.Element | None:
    name = _local_name(el.tag)
    if name not in _ALLOWED_TAGS:
        return None

    kept_attrs: dict[str, str] = {}
    for key, val in list(el.attrib.items()):
        local = _attr_local(key)
        if local.startswith("on"):
            raise SvgSanitizeError("SVG contains disallowed content")
        if local not in _ALLOWED_ATTRS:
            continue
        if local in ("href", "xlink:href"):
            if not _is_safe_url(val):
                raise SvgSanitizeError("SVG contains disallowed content")
        kept_attrs[key] = val
    el.attrib.clear()
    el.attrib.update(kept_attrs)

    for child in list(el):
        cleaned = _strip_element(child)
        if cleaned is None:
            el.remove(child)
    return el


def sanitize_svg(data: bytes) -> bytes:
    """Return a rewritten SVG, or raise SvgSanitizeError."""
    if not data or not data.strip():
        raise SvgSanitizeError("Empty SVG")
    if len(data) > 5 * 1024 * 1024:
        raise SvgSanitizeError("SVG too large")

    # Reject clearly dangerous raw patterns before parse (defense in depth).
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise SvgSanitizeError("SVG must be UTF-8 text") from exc

    if _DOCTYPE_RE.search(text) or _BLOCKED_TAG_RE.search(text) or _EVENT_ATTR_RE.search(text) or _JS_URL_RE.search(text):
        raise SvgSanitizeError("SVG contains disallowed content")

    try:
        root = ET.fromstring(data)
    except ET.ParseError as exc:
        raise SvgSanitizeError("Invalid SVG") from exc

    if _local_name(root.tag) != "svg":
        raise SvgSanitizeError("Root element must be svg")

    cleaned = _strip_element(root)
    if cleaned is None:
        raise SvgSanitizeError("SVG contains disallowed content")

    # Default SVG namespace (avoid ns0: prefixes that some clients mishandle).
    ET.register_namespace("", "http://www.w3.org/2000/svg")
    ET.register_namespace("xlink", "http://www.w3.org/1999/xlink")
    if "xmlns" not in cleaned.attrib and not cleaned.tag.startswith("{"):
        cleaned.set("xmlns", "http://www.w3.org/2000/svg")

    out = ET.tostring(cleaned, encoding="utf-8", xml_declaration=False)
    if not out.strip():
        raise SvgSanitizeError("SVG empty after sanitize")
    return out
