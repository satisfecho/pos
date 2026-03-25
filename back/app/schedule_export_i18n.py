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

_LABELS: dict[str, dict[str, str]] = {
    "en": _EN,
    "es": _ES,
    "de": _DE,
    "ca": _CA,
    "fr": _FR,
    "zh-CN": _ZH,
    "hi": _HI,
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
