"""Ranking system contract template presets for a tenant (country + language heuristics)."""

from __future__ import annotations

from sqlmodel import Session, select

from . import models


def _primary_subtag(tag: str | None) -> str:
    if not tag or not str(tag).strip():
        return ""
    return str(tag).strip().lower().split("-")[0].split("_")[0]


def infer_tenant_country_code(tenant: models.Tenant) -> str | None:
    """Explicit country_code, else light heuristics (currency, CIF, timezone)."""
    if tenant.country_code and str(tenant.country_code).strip():
        cc = str(tenant.country_code).strip().upper()[:2]
        if len(cc) == 2 and cc.isalpha():
            return cc
    cur = (tenant.currency_code or "").strip().upper()
    if cur == "INR":
        return "IN"
    if tenant.cif and str(tenant.cif).strip():
        return "ES"
    tz = (tenant.timezone or "").lower()
    if "madrid" in tz or "barcelona" in tz:
        return "ES"
    if "kolkata" in tz or "calcutta" in tz or "mumbai" in tz:
        return "IN"
    return None


def _locale_matches_tenant(preset_locale: str, tenant_lang: str | None) -> bool:
    pl = preset_locale.strip().lower()
    tl = _primary_subtag(tenant_lang)
    if not tl:
        return True
    if pl == tl:
        return True
    return pl.startswith(tl + "-") or pl.startswith(tl + "_")


def preset_relevance(tenant: models.Tenant, row: models.StaffContractTemplatePreset) -> tuple[int, str]:
    """
    Sort key (lower = more relevant) and a short label for the API.
    """
    cc = infer_tenant_country_code(tenant)
    region = (row.region_code or "").strip().upper()
    tenant_lang = tenant.default_language
    lang_ok = _locale_matches_tenant(row.locale, tenant_lang)

    is_global = region == "*" or region == ""
    region_ok = is_global or (cc is not None and region == cc)

    if region_ok and not is_global and lang_ok:
        return (0, "region_language")
    if region_ok and not is_global:
        return (1, "region")
    if is_global and lang_ok:
        return (2, "global_language")
    if is_global:
        return (3, "global")
    return (4, "other_region")


def list_presets_for_tenant(session: Session, tenant: models.Tenant) -> list[models.StaffContractTemplatePresetRead]:
    rows = session.exec(select(models.StaffContractTemplatePreset)).all()
    scored: list[tuple[int, str, str, models.StaffContractTemplatePreset]] = []
    for r in rows:
        rank, rel = preset_relevance(tenant, r)
        scored.append((rank, r.template_key, rel, r))
    scored.sort(key=lambda x: (x[0], x[1]))

    return [
        models.StaffContractTemplatePresetRead(
            id=r.id,
            region_code=r.region_code,
            locale=r.locale,
            template_key=r.template_key,
            name=r.name,
            body=r.body,
            kind=r.kind,
            relevance=rel,
        )
        for _, _, rel, r in scored
    ]
