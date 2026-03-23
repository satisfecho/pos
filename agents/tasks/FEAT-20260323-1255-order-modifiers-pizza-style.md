# Change plate ordered with products like pizza

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/50

## Problem / goal
During ordering, staff (or customers where applicable) need to **customize** composite products—e.g. remove pepperoni and add another cheese—similar to pizza-style modifiers, without breaking pricing, kitchen tickets, or catalog sync.

## High-level instructions for coder
- Review current **order line** model: options, notes, variants, and any existing modifier or “special request” fields in `back/` and `front/`.
- Define whether modifiers are **free-text**, **predefined options**, or **catalog-driven** (e.g. linked to `Product` or `ProviderProduct`); align with multi-tenant and reporting needs.
- Extend API and UI so lines can record add/remove (or substitute) in a structured way that prints clearly on kitchen/output and appears correctly on invoices.
- Add or extend tests (pytest + relevant UI smoke if front changes); update **`CHANGELOG.md`** **`[Unreleased]`** for operator-facing behaviour.
