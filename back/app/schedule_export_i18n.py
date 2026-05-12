"""
Localized column titles for GET /schedule/export (Excel).
"""

from __future__ import annotations

from .language_service import normalize_language_code

_EN: dict[str, str] = {
    "sheet": "Schedule",
    "date": "Date",
    "start_time": "Start",
    "end_time": "End",
    "label": "Label",
    "employee": "Employee",
    "role": "Role",
    "tips_month": "Tips (month total, cents)",
}

_ES: dict[str, str] = {
    **_EN,
    "sheet": "Horario",
    "date": "Fecha",
    "start_time": "Inicio",
    "end_time": "Fin",
    "label": "Etiqueta",
    "employee": "Empleado",
    "role": "Rol",
}

_DE: dict[str, str] = {
    **_EN,
    "sheet": "Dienstplan",
    "date": "Datum",
    "start_time": "Beginn",
    "end_time": "Ende",
    "label": "Notiz",
    "employee": "Mitarbeiter",
    "role": "Rolle",
}

_CA: dict[str, str] = {
    **_EN,
    "sheet": "Horari",
    "date": "Data",
    "start_time": "Inici",
    "end_time": "Fi",
    "label": "Etiqueta",
    "employee": "Empleat",
    "role": "Rol",
}

_FR: dict[str, str] = {
    **_EN,
    "sheet": "Planning",
    "date": "Date",
    "start_time": "Début",
    "end_time": "Fin",
    "label": "Libellé",
    "employee": "Employé",
    "role": "Rôle",
}

_ZH: dict[str, str] = {
    **_EN,
    "sheet": "排班",
    "date": "日期",
    "start_time": "开始",
    "end_time": "结束",
    "label": "备注",
    "employee": "员工",
    "role": "角色",
}

_HI: dict[str, str] = {
    **_EN,
    "sheet": "शिफ्ट",
    "date": "तारीख",
    "start_time": "शुरू",
    "end_time": "समाप्ति",
    "label": "लेबल",
    "employee": "कर्मचारी",
    "role": "भूमिका",
}

_UR: dict[str, str] = {
    **_EN,
    "sheet": "شیڈول",
    "date": "تاریخ",
    "start_time": "شروع",
    "end_time": "ختم",
    "label": "لیبل",
    "employee": "ملازم",
    "role": "کردار",
}

_BG: dict[str, str] = {
    **_EN,
    "sheet": "График",
    "date": "Дата",
    "start_time": "Начало",
    "end_time": "Край",
    "label": "Бележка",
    "employee": "Служител",
    "role": "Роля",
}

_LABELS: dict[str, dict[str, str]] = {
    "en": _EN,
    "es": _ES,
    "de": _DE,
    "ca": _CA,
    "fr": _FR,
    "bg": _BG,
    "zh-CN": _ZH,
    "hi": _HI,
    "ur": _UR,
}


def schedule_export_labels(lang: str | None) -> dict[str, str]:
    """Return label map for schedule export headers; falls back to English."""
    if not lang or not str(lang).strip():
        return _LABELS["en"]
    raw = str(lang).strip()
    code = normalize_language_code(raw)
    if code:
        return _LABELS.get(code, _LABELS["en"])
    low = raw.lower().replace("_", "-")
    if low in _LABELS:
        return _LABELS[low]
    return _LABELS["en"]


# --- Planned vs clocked (GET /schedule/planned-vs-actual/export) ---

_PVA_EN: dict[str, str] = {
    "sheet": "Planned vs clocked",
    "date": "Date",
    "staff": "Staff",
    "planned": "Planned",
    "clocked": "Clocked",
    "variance": "Variance",
    "totals": "Totals",
    "scope_all": "All staff",
}

_PVA_DE: dict[str, str] = {
    **_PVA_EN,
    "sheet": "Plan vs gestempelt",
    "date": "Datum",
    "staff": "Mitarbeiter",
    "planned": "Geplant",
    "clocked": "Gestempelt",
    "variance": "Abweichung",
    "totals": "Summen",
    "scope_all": "Alle Mitarbeitenden",
}

_PVA_ES: dict[str, str] = {
    **_PVA_EN,
    "sheet": "Planificado vs fichado",
    "date": "Fecha",
    "staff": "Personal",
    "planned": "Planificado",
    "clocked": "Fichado",
    "variance": "Diferencia",
    "totals": "Totales",
    "scope_all": "Todo el personal",
}

_PVA_CA: dict[str, str] = {
    **_PVA_EN,
    "sheet": "Planificat vs fitxat",
    "date": "Data",
    "staff": "Personal",
    "planned": "Planificat",
    "clocked": "Fitxat",
    "variance": "Diferència",
    "totals": "Totals",
    "scope_all": "Tot el personal",
}

_PVA_FR: dict[str, str] = {
    **_PVA_EN,
    "sheet": "Prévu vs pointé",
    "date": "Date",
    "staff": "Personnel",
    "planned": "Prévu",
    "clocked": "Pointé",
    "variance": "Écart",
    "totals": "Totaux",
    "scope_all": "Tout le personnel",
}

_PVA_BG: dict[str, str] = {
    **_PVA_EN,
    "sheet": "План vs отчетено",
    "date": "Дата",
    "staff": "Служител",
    "planned": "Планирано",
    "clocked": "Отчетено",
    "variance": "Отклонение",
    "totals": "Общо",
    "scope_all": "Целият персонал",
}

_PVA_ZH: dict[str, str] = {
    **_PVA_EN,
    "sheet": "计划与实际打卡",
    "date": "日期",
    "staff": "员工",
    "planned": "计划",
    "clocked": "打卡",
    "variance": "差异",
    "totals": "合计",
    "scope_all": "全体员工",
}

_PVA_HI: dict[str, str] = {
    **_PVA_EN,
    "sheet": "योजना बनाम घड़ी",
    "date": "तारीख",
    "staff": "कर्मचारी",
    "planned": "योजना",
    "clocked": "समय",
    "variance": "अंतर",
    "totals": "कुल",
    "scope_all": "सभी कर्मचारी",
}

_PVA_UR: dict[str, str] = {
    **_PVA_EN,
    "sheet": "منصوبہ بمقابلہ کلاک شدہ",
    "date": "تاریخ",
    "staff": "عملہ",
    "planned": "منصوبہ بند",
    "clocked": "کلاک شدہ",
    "variance": "فرق",
    "totals": "کل",
    "scope_all": "تمام عملہ",
}

_PVA_LABELS: dict[str, dict[str, str]] = {
    "en": _PVA_EN,
    "es": _PVA_ES,
    "de": _PVA_DE,
    "ca": _PVA_CA,
    "fr": _PVA_FR,
    "bg": _PVA_BG,
    "zh-CN": _PVA_ZH,
    "hi": _PVA_HI,
    "ur": _PVA_UR,
}


def planned_vs_export_labels(lang: str | None) -> dict[str, str]:
    """Column headers for planned-vs-clocked Excel export."""
    if not lang or not str(lang).strip():
        return _PVA_LABELS["en"]
    raw = str(lang).strip()
    code = normalize_language_code(raw)
    if code:
        return _PVA_LABELS.get(code, _PVA_LABELS["en"])
    low = raw.lower().replace("_", "-")
    if low in _PVA_LABELS:
        return _PVA_LABELS[low]
    return _PVA_LABELS["en"]
