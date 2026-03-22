"""
Localized column and sheet titles for GET /reports/export (CSV / Excel).
"""

from __future__ import annotations

from .language_service import normalize_language_code

_EN: dict[str, str] = {
    "sheet_summary": "Summary",
    "sheet_reservations": "Reservations",
    "sheet_by_product": "By product",
    "sheet_by_category": "By category",
    "sheet_by_table": "By table",
    "sheet_by_waiter": "By waiter",
    "date": "Date",
    "revenue_cents": "Revenue (cents)",
    "cost_cents": "Cost (cents)",
    "profit_cents": "Profit (cents)",
    "orders": "Orders",
    "total": "Total",
    "source": "Source",
    "count": "Count",
    "status": "Status",
    "product": "Product",
    "category": "Category",
    "quantity": "Quantity",
    "table": "Table",
    "waiter": "Waiter",
}

_ES: dict[str, str] = {
    **_EN,
    "sheet_summary": "Resumen",
    "sheet_reservations": "Reservas",
    "sheet_by_product": "Por producto",
    "sheet_by_category": "Por categoría",
    "sheet_by_table": "Por mesa",
    "sheet_by_waiter": "Por camarero",
    "date": "Fecha",
    "revenue_cents": "Ingresos (céntimos)",
    "cost_cents": "Coste (céntimos)",
    "profit_cents": "Beneficio (céntimos)",
    "orders": "Pedidos",
    "total": "Total",
    "source": "Origen",
    "count": "Cantidad",
    "status": "Estado",
    "product": "Producto",
    "category": "Categoría",
    "quantity": "Cantidad",
    "table": "Mesa",
    "waiter": "Camarero",
}

_DE: dict[str, str] = {
    **_EN,
    "sheet_summary": "Übersicht",
    "sheet_reservations": "Reservierungen",
    "sheet_by_product": "Nach Produkt",
    "sheet_by_category": "Nach Kategorie",
    "sheet_by_table": "Nach Tisch",
    "sheet_by_waiter": "Nach Kellner",
    "date": "Datum",
    "revenue_cents": "Umsatz (Cent)",
    "cost_cents": "Kosten (Cent)",
    "profit_cents": "Gewinn (Cent)",
    "orders": "Bestellungen",
    "total": "Gesamt",
    "source": "Quelle",
    "count": "Anzahl",
    "status": "Status",
    "product": "Produkt",
    "category": "Kategorie",
    "quantity": "Menge",
    "table": "Tisch",
    "waiter": "Kellner",
}

_CA: dict[str, str] = {
    **_EN,
    "sheet_summary": "Resum",
    "sheet_reservations": "Reserves",
    "sheet_by_product": "Per producte",
    "sheet_by_category": "Per categoria",
    "sheet_by_table": "Per taula",
    "sheet_by_waiter": "Per cambrer",
    "date": "Data",
    "revenue_cents": "Ingressos (cèntims)",
    "cost_cents": "Cost (cèntims)",
    "profit_cents": "Benefici (cèntims)",
    "orders": "Comandes",
    "total": "Total",
    "source": "Origen",
    "count": "Quantitat",
    "status": "Estat",
    "product": "Producte",
    "category": "Categoria",
    "quantity": "Quantitat",
    "table": "Taula",
    "waiter": "Cambrer",
}

_FR: dict[str, str] = {
    **_EN,
    "sheet_summary": "Résumé",
    "sheet_reservations": "Réservations",
    "sheet_by_product": "Par produit",
    "sheet_by_category": "Par catégorie",
    "sheet_by_table": "Par table",
    "sheet_by_waiter": "Par serveur",
    "date": "Date",
    "revenue_cents": "Chiffre d'affaires (centimes)",
    "cost_cents": "Coût (centimes)",
    "profit_cents": "Profit (centimes)",
    "orders": "Commandes",
    "total": "Total",
    "source": "Source",
    "count": "Nombre",
    "status": "Statut",
    "product": "Produit",
    "category": "Catégorie",
    "quantity": "Quantité",
    "table": "Table",
    "waiter": "Serveur",
}

_ZH: dict[str, str] = {
    **_EN,
    "sheet_summary": "汇总",
    "sheet_reservations": "预订",
    "sheet_by_product": "按产品",
    "sheet_by_category": "按类别",
    "sheet_by_table": "按餐桌",
    "sheet_by_waiter": "按服务员",
    "date": "日期",
    "revenue_cents": "收入（分）",
    "cost_cents": "成本（分）",
    "profit_cents": "利润（分）",
    "orders": "订单数",
    "total": "合计",
    "source": "来源",
    "count": "数量",
    "status": "状态",
    "product": "产品",
    "category": "类别",
    "quantity": "数量",
    "table": "餐桌",
    "waiter": "服务员",
}

_HI: dict[str, str] = {
    **_EN,
    "sheet_summary": "सारांश",
    "sheet_reservations": "आरक्षण",
    "sheet_by_product": "उत्पाद अनुसार",
    "sheet_by_category": "श्रेणी अनुसार",
    "sheet_by_table": "टेबल अनुसार",
    "sheet_by_waiter": "वेटर अनुसार",
    "date": "तारीख",
    "revenue_cents": "राजस्व (पैसे)",
    "cost_cents": "लागत (पैसे)",
    "profit_cents": "लाभ (पैसे)",
    "orders": "ऑर्डर",
    "total": "कुल",
    "source": "स्रोत",
    "count": "गिनती",
    "status": "स्थिति",
    "product": "उत्पाद",
    "category": "श्रेणी",
    "quantity": "मात्रा",
    "table": "टेबल",
    "waiter": "वेटर",
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


def report_export_labels(lang: str | None) -> dict[str, str]:
    """Return label map for export headers; falls back to English."""
    if not lang:
        return _LABELS["en"]
    code = normalize_language_code(lang.strip())
    if not code:
        return _LABELS["en"]
    return _LABELS.get(code, _LABELS["en"])
