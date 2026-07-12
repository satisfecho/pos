"""Per-tenant UI module toggles (sidebar, dashboard, route guards)."""

from __future__ import annotations

from typing import Any

# Keys stored in tenant.ui_modules JSONB (only false values persisted; missing = enabled).
TENANT_UI_MODULE_KEYS: tuple[str, ...] = (
    "tables",
    "working_plan",
    "providers",
    "reservations",
    "kitchen_bar",
    "inventory",
    "contracts",
    "users",
)

# Signup defaults for newly provisioned tenants (existing tenants keep null → all enabled).
_NEW_TENANT_UI_MODULE_DEFAULTS: dict[str, bool] = {
    "tables": True,
    "working_plan": False,
    "providers": False,
    "reservations": True,
    "kitchen_bar": True,
    "inventory": False,
    "contracts": False,
    "users": False,
}

_TENANT_UI_MODULE_KEY_SET = frozenset(TENANT_UI_MODULE_KEYS)


def resolve_tenant_ui_modules(stored: dict[str, Any] | None) -> dict[str, bool]:
    """Effective flags for API responses and auth checks (default: all enabled)."""
    out = {k: True for k in TENANT_UI_MODULE_KEYS}
    if isinstance(stored, dict):
        for k in TENANT_UI_MODULE_KEYS:
            if k in stored and isinstance(stored[k], bool):
                out[k] = stored[k]
    return out


def compact_tenant_ui_modules(effective: dict[str, bool]) -> dict[str, bool] | None:
    """Persist only disabled modules; None means all enabled."""
    neg = {k: False for k in TENANT_UI_MODULE_KEYS if effective.get(k) is False}
    return neg or None


def new_tenant_ui_modules_stored() -> dict[str, bool]:
    """Compact JSONB for tenant.ui_modules at registration (disabled keys only)."""
    return {k: False for k in TENANT_UI_MODULE_KEYS if not _NEW_TENANT_UI_MODULE_DEFAULTS[k]}


def merge_tenant_ui_modules_patch(
    existing_stored: dict[str, Any] | None, patch: dict[str, Any]
) -> dict[str, bool] | None:
    """Apply a partial patch from PUT /tenant/settings; returns value for tenant.ui_modules."""
    effective = resolve_tenant_ui_modules(
        existing_stored if isinstance(existing_stored, dict) else None
    )
    for k, v in patch.items():
        if k in _TENANT_UI_MODULE_KEY_SET and isinstance(v, bool):
            effective[k] = v
    return compact_tenant_ui_modules(effective)
