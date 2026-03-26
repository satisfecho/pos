"""Merge {{placeholders}} in contract templates with escaped values (print-safe HTML)."""

from __future__ import annotations

import html
from datetime import date

from . import models


def merge_placeholders(template_body: str, values: dict[str, str]) -> str:
    out = template_body
    for key, raw in values.items():
        token = "{{" + key + "}}"
        out = out.replace(token, html.escape(raw or "", quote=True))
    return out


def placeholder_values_for_contract(
    tenant: models.Tenant,
    contract: models.StaffContract,
    subject: models.User,
) -> dict[str, str]:
    def fmt_date(d: date | None) -> str:
        return d.isoformat() if d else ""

    return {
        "employer_name": tenant.name or "",
        "employer_address": (tenant.address or "").strip(),
        "employer_email": (tenant.email or "").strip(),
        "employer_tax_id": (tenant.tax_id or tenant.cif or "").strip(),
        "worker_name": (subject.full_name or "").strip(),
        "worker_email": (subject.email or "").strip(),
        "role_title": (contract.role_title or "").strip(),
        "start_date": fmt_date(contract.start_date),
        "end_date": fmt_date(contract.end_date),
        "compensation_summary": (contract.compensation_summary or "").strip(),
        "payment_terms": (contract.payment_terms or "").strip(),
        "jurisdiction_note": (contract.jurisdiction_note or "").strip(),
        "kind": contract.kind.value if contract.kind else "",
        "payment_structure": contract.payment_structure.value if contract.payment_structure else "",
        "contract_version": str(contract.version),
        "contract_status": contract.status.value if contract.status else "",
    }


def fallback_contract_html(values: dict[str, str]) -> str:
    """Structured summary when no template is linked."""
    rows = [
        ("role_title", "Role / title"),
        ("kind", "Type"),
        ("start_date", "Start date"),
        ("end_date", "End date"),
        ("compensation_summary", "Compensation"),
        ("payment_structure", "Payment structure"),
        ("payment_terms", "Payment terms"),
        ("jurisdiction_note", "Jurisdiction / note"),
        ("contract_status", "Status"),
        ("contract_version", "Version"),
    ]
    parts = ["<h1>Contract summary</h1>", "<dl>"]
    for key, label in rows:
        v = values.get(key, "")
        if not v:
            continue
        parts.append(f"<dt>{html.escape(label)}</dt><dd>{html.escape(v)}</dd>")
    parts.append("</dl>")
    parts.append(
        "<p><strong>Worker:</strong> "
        f"{html.escape(values.get('worker_name', ''))} "
        f"&lt;{html.escape(values.get('worker_email', ''))}&gt;</p>"
    )
    parts.append(
        "<p><strong>Employer:</strong> "
        f"{html.escape(values.get('employer_name', ''))}</p>"
    )
    return "\n".join(parts)


PRINT_CSS = """
@page { margin: 18mm; }
body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; font-size: 11pt; line-height: 1.45; color: #111; max-width: 210mm; margin: 0 auto; padding: 12px; }
.contract-print h1 { font-size: 1.25rem; margin-top: 0; }
.contract-print .sig-block { margin-top: 3rem; page-break-inside: avoid; }
.contract-print .sig-row { display: flex; justify-content: space-between; gap: 2rem; margin-top: 2.5rem; }
.contract-print .sig-cell { flex: 1; border-top: 1px solid #333; padding-top: 0.35rem; text-align: center; font-size: 0.85rem; }
@media print { body { padding: 0; } }
"""


def wrap_print_html(inner_body: str, values: dict[str, str]) -> str:
    sig_tpl = (
        '<div class="sig-block">'
        '<div class="sig-row">'
        '<div class="sig-cell">{{employer_name}}<br/><span style="font-size:0.8rem">Employer / company</span></div>'
        '<div class="sig-cell">{{worker_name}}<br/><span style="font-size:0.8rem">Worker</span></div>'
        "</div></div>"
    )
    sig = merge_placeholders(sig_tpl, values)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Contract</title>
<style>{PRINT_CSS}</style>
</head>
<body>
<article class="contract-print">
{inner_body}
{sig}
</article>
</body>
</html>"""
