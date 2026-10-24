# Import / migration from an existing POS (CSV cutover)

**Status:** MVP shipped (#321) - products + categories via CSV CLI; staff UI CSV (#336).  
**Related:** umbrella [#52](https://github.com/satisfecho/pos/issues/52), `docs/0050-github-issue-52-split-plan.md` Issue 5, `docs/0032-github-issues-roadmap.md`, [#336](https://github.com/satisfecho/pos/issues/336).

## Approach (how others ingest menus → Satisfecho)

Common POS / menu tools usually pick one of:

| Approach | Pros | Cons |
|----------|------|------|
| **Strict CSV column map** | Predictable, auditable, easy to test | Vendor exports need renaming |
| **AI / fuzzy column mapping** | Handles messy headers | Needs API key; must still preview before write |
| **Vision from photos/PDFs** | Works when there is no spreadsheet | OCR/layout errors; privacy notice |

**Satisfecho recommendation:** one pipeline - **parse → preview → explicit confirm** (create/update-by-name). Staff **Products → bulk import** accepts **JSON**, **CSV/TSV** (aliases + optional AI header map), and **menu-photo vision**. The CLI (`import_products_csv`) reuses the same parse/preview/confirm for large cutovers. Never auto-write without confirm. Excel `.xlsx` stays out of scope (export CSV first).

## What it does

Restaurants switching from another system can load a **menu catalog** (product name, price, category, optional subcategory/description/ingredients/cost) with:

1. A documented **sample CSV** and column map.
2. An **idempotent CLI** (`--dry-run` then `--apply`) that validates every row before any write.
3. The same create/update-by-name rules as staff **Products → bulk import** (JSON / CSV / vision).

Tables, customers, and historical orders are **out of scope** for this MVP (follow-up).

## Column map (CSV ↔ `Product`)

| CSV column | Required | Maps to | Notes |
|------------|----------|---------|--------|
| `name` | yes | `Product.name` | Match key for idempotent update (case-insensitive, trimmed). |
| `price` | one of price / price_cents | `price_cents` | Major units (e.g. `12.50`); comma decimal accepted. |
| `price_cents` | one of price / price_cents | `Product.price_cents` | Integer cents; must be &gt; 0. |
| `cost` | no | `cost_cents` | Major units. |
| `cost_cents` | no | `Product.cost_cents` | Integer ≥ 0. |
| `category` | no | `Product.category` | Normalized to canonical English keys (e.g. Entrantes → Starters). |
| `subcategory` | no | `Product.subcategory` | Free text. |
| `description` | no | `Product.description` | |
| `ingredients` | no | `Product.ingredients` | Comma-separated list string. |

**Aliases** (case-insensitive) are accepted in staff UI and CLI parse, e.g. `producto`/`product`/`item` → `name`, `precio`/`preis`/`prix` → `price`, `categoria`/`kategorie` → `category`. See `CSV_HEADER_ALIASES` in `back/app/product_bulk_import.py`.

Unknown columns cause a hard parse error unless **AI column mapping** is enabled in the staff CSV tab (`use_ai_mapping`, requires `PRODUCT_VISION_*`). AI may map leftover headers to canonical fields or drop non-product columns (SKU, stock); unmapped leftovers still error. Header names are case-insensitive. UTF-8 with optional BOM (Excel) is supported; **TSV** (tab) and `;`-delimited files are sniffable. Max **500** data rows per file.

Sample file: `back/fixtures/migration/sample_products.csv`.

## Staff UI vs CLI

| Path | Formats | Writes |
|------|---------|--------|
| **Products → bulk import** | JSON paste/file; CSV/TSV paste/file (+ optional AI header map); menu photo (vision) | Only after preview **confirm** via `POST /products/bulk-import/confirm` |
| **CLI** `python -m app.seeds.import_products_csv` | CSV file path | `--dry-run` (no write) or `--apply` (refuses if any row invalid) |

API: `POST /products/bulk-import/preview-csv` with `{ "csv": "...", "use_ai_mapping": false }`.

## Pre-cutover checklist

1. Confirm the **target tenant id** (never import without `--tenant-id`).
2. Export the old POS menu to CSV; rename columns to the map above (or rely on aliases / staff AI mapping).
3. Copy the file into the backend container tree (e.g. `back/fixtures/migration/your_menu.csv` → `/app/fixtures/migration/your_menu.csv`).
4. Prefer a maintenance window; take a DB backup / snapshot if the tenant already has live orders.
5. Run **dry-run** until `invalid=0`.

## Dry-run

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back \
  python -m app.seeds.import_products_csv \
  --tenant-id 1 \
  --csv /app/fixtures/migration/sample_products.csv \
  --dry-run
```

Prints a per-row report (`create` / `update` / `INVALID`) and **writes nothing**. Exit code `1` if any row is invalid; `2` on parse/IO errors.

## Apply

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back \
  python -m app.seeds.import_products_csv \
  --tenant-id 1 \
  --csv /app/fixtures/migration/sample_products.csv \
  --apply
```

- Refuses to write if **any** row is invalid (fix the CSV first).
- Creates new products; **updates** existing products with the same name for that tenant.
- Does not delete products missing from the CSV.

## Rollback

- There is no automatic undo. Prefer dry-run + backup before apply.
- To remove mistaken imports: delete or edit products in the staff **Products** UI, or restore the DB backup.
- Re-running `--apply` with corrected prices/categories is safe for matching names.

## Smoke tests after apply

1. Staff app → **Products**: new/updated names and categories visible.
2. Public menu / delivery menu for the tenant shows the imported dishes (if those channels are enabled).
3. Optional API: `GET /products` as a tenant owner.
4. Backend unit tests: `python3 -m pytest tests/test_import_products_csv.py tests/test_product_bulk_import.py -q` inside the `back` container.

## Alternative: staff UI (JSON / CSV)

Operators can use **Products → bulk import** with JSON or CSV/TSV through the same preview + confirm flow (no CLI required). Same validation and idempotency.

## Non-goals (MVP)

- Tables, floors, customers, historical orders
- Multi-file / multi-tenant batch in one command
- Full Excel / `.xlsx` parser (export CSV first)
- Images / SKU barcodes / stock quantities as first-class import columns (SKU may be dropped only via explicit/AI map)
- Provider catalog import
