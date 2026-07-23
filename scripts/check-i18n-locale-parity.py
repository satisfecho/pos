#!/usr/bin/env python3
"""Check that every UI locale has the same leaf keys as front/public/i18n/en.json.

Exit codes:
  0 — all locales match en.json leaf keys (missing count is 0 for each)
  1 — one or more locales are missing keys present in en.json
  2 — usage / IO error

Warn-only (exit 0 even when keys are missing):
  --warn-only   or   I18N_PARITY_WARN_ONLY=1

Examples (from repo root):
  python3 scripts/check-i18n-locale-parity.py
  python3 scripts/check-i18n-locale-parity.py --sample 10
  I18N_PARITY_WARN_ONLY=1 python3 scripts/check-i18n-locale-parity.py
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path


def repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def flatten_leaves(obj: object, prefix: str = "") -> set[str]:
    """Return dotted paths for JSON leaf values (non-dict nodes)."""
    keys: set[str] = set()
    if isinstance(obj, dict):
        for key, value in obj.items():
            path = f"{prefix}.{key}" if prefix else str(key)
            if isinstance(value, dict):
                keys |= flatten_leaves(value, path)
            else:
                keys.add(path)
    return keys


def load_json(path: Path) -> object:
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fail when any front/public/i18n locale misses leaf keys from en.json."
    )
    parser.add_argument(
        "--i18n-dir",
        type=Path,
        default=None,
        help="Locale JSON directory (default: <repo>/front/public/i18n)",
    )
    parser.add_argument(
        "--sample",
        type=int,
        default=8,
        metavar="N",
        help="Max missing key paths to print per locale (default: 8)",
    )
    parser.add_argument(
        "--warn-only",
        action="store_true",
        help="Print drift but exit 0 (also set via I18N_PARITY_WARN_ONLY=1)",
    )
    args = parser.parse_args()

    warn_only = args.warn_only or os.environ.get("I18N_PARITY_WARN_ONLY", "").strip() in (
        "1",
        "true",
        "yes",
    )
    i18n_dir = args.i18n_dir or (repo_root() / "front" / "public" / "i18n")
    en_path = i18n_dir / "en.json"

    if not en_path.is_file():
        print(f"ERROR: missing reference locale: {en_path}", file=sys.stderr)
        return 2

    try:
        en_keys = flatten_leaves(load_json(en_path))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"ERROR: cannot read {en_path}: {exc}", file=sys.stderr)
        return 2

    locale_paths = sorted(
        p for p in i18n_dir.glob("*.json") if p.name != "en.json" and p.is_file()
    )
    if not locale_paths:
        print(f"ERROR: no locale JSON files found beside en.json in {i18n_dir}", file=sys.stderr)
        return 2

    print(f"i18n leaf-parity vs en.json ({len(en_keys)} leaves) in {i18n_dir}")
    print("-" * 60)

    failed = False
    for path in locale_paths:
        try:
            loc_keys = flatten_leaves(load_json(path))
        except (OSError, json.JSONDecodeError) as exc:
            print(f"{path.name}: ERROR — {exc}")
            failed = True
            continue

        missing = sorted(en_keys - loc_keys)
        extra = sorted(loc_keys - en_keys)
        status = "OK" if not missing else "MISSING"
        if missing:
            failed = True

        line = f"{path.stem:8} {status:7} missing={len(missing):4d}  extra={len(extra):4d}"
        print(line)
        if missing and args.sample > 0:
            sample = missing[: max(0, args.sample)]
            for key in sample:
                print(f"         - {key}")
            if len(missing) > len(sample):
                print(f"         … and {len(missing) - len(sample)} more")

    print("-" * 60)
    if failed:
        msg = "FAIL: one or more locales miss keys present in en.json"
        if warn_only:
            print(f"WARN: {msg} (warn-only; exit 0)")
            return 0
        print(msg)
        return 1

    print("PASS: all locales have every en.json leaf key")
    return 0


if __name__ == "__main__":
    sys.exit(main())
