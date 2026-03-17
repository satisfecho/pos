"""
0025 overbooking: one-empty-table and full-slot scenarios.

Uses app.seeds.check_overbooking_0025 which creates test data, asserts capacity/demand,
and cleans up. Requires tenant 1 and demo tables (run seed_demo_tables first).

Run: docker compose exec back python -m app.seeds.check_overbooking_0025
     (exit 0 = pass)
Or:  docker compose exec back python back/tests/test_overbooking_0025.py
"""

import sys
import os
import unittest

# Path: from repo root use "back.app"; from container (cwd=/app) use "app"
_back_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_repo_root = os.path.dirname(_back_dir)
sys.path.insert(0, _back_dir)
# Only add repo root when it's not filesystem root (container has _back_dir=/app, _repo_root=/)
if _repo_root and _repo_root not in sys.path and os.path.basename(_back_dir) == "back":
    sys.path.insert(0, _repo_root)
try:
    from back.app.seeds.check_overbooking_0025 import run as run_overbooking_check
except ImportError:
    from app.seeds.check_overbooking_0025 import run as run_overbooking_check


class TestOverbooking0025(unittest.TestCase):
    """Scenario 1: slot with N-1 parties has tables_left=1; 10th allowed, 11th over.
    Scenario 2: slot with N parties has tables_left=0; next would be over."""

    def test_one_empty_table_and_full_slot(self):
        exit_code = run_overbooking_check()
        self.assertEqual(exit_code, 0, "run seed_demo_tables if missing tenant/tables")


if __name__ == "__main__":
    unittest.main()
