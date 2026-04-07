# Reports: staff hint above dropdown — Monthly attendance (Excel) layout

## GitHub Issues
- [github.com/satisfecho/pos/issues](https://github.com/satisfecho/pos/issues)
- `gh issue list --repo satisfecho/pos --state open --limit 40`
- Optional: `--json number,title,labels,updatedAt,url`
- **Issue:** https://github.com/satisfecho/pos/issues/171

## Problem / goal
In Reports, the **Monthly attendance (Excel)** / **Asistencia mensual (Excel)** block shows the help text **below** the staff selector. The intended reading order is: optional section label → **hint** → staff control → download actions (or keep button alignment per existing design). Do **not** change i18n copy—only template structure and CSS/layout so the hint appears **above** the dropdown (including fixing flex/order if a horizontal toolbar currently inverts visual order).

## High-level instructions for coder
- Locate the component template for the Monthly attendance (Excel) section (likely `ReportsComponent` or a child template for that block).
- Move the hint element (`<p>` or equivalent) **before** the staff `<select>` / custom multi-select in the DOM.
- If the block uses a horizontal flex toolbar, stack the staff column vertically (`flex-direction: column`) with hint first, control second, so flex does not push the hint under the control.
- Remove or adjust `order`, `flex-wrap`, or `align-items` rules that visually invert hint vs control.
- Do not change translation strings; only structure and CSS.
- After edits, confirm `docker compose … logs front` shows a successful Angular build (no standing template/type errors).
