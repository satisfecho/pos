# Visual error at product section

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/33

## Problem / goal
The products UI shows a small white gap (likely last row **`td`** height or table/footer styling). Screenshot in the issue: white strip in the product section.

## High-level instructions for coder
- Reproduce on the staff **products** view (tenant with enough rows to see the table footer/last row).
- Inspect table/card layout and CSS for the last row or container; remove the unintended gap while keeping existing spacing consistent with **`products`** / shared table styles.
- Verify in light theme (and dark if applicable) and add a brief note in **`CHANGELOG.md`** under **`[Unreleased]`** if user-visible.
