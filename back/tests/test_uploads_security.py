"""Regression: sensitive upload paths must not be served by the public /uploads StaticFiles mount."""
from __future__ import annotations

import shutil
import unittest
from pathlib import Path

from pg_client_mixin import PgClientTestCase

from app.main import UPLOADS_DIR


class TestUploadsSecurity(PgClientTestCase):
    def tearDown(self) -> None:
        d = UPLOADS_DIR / "999001" / "contracts"
        if d.exists():
            shutil.rmtree(UPLOADS_DIR / "999001", ignore_errors=True)
        super().tearDown()

    def test_contracts_path_not_served_publicly(self) -> None:
        """Signed PDFs under uploads/{tid}/contracts/ must not be readable without auth."""
        tenant_dir = UPLOADS_DIR / "999001" / "contracts"
        tenant_dir.mkdir(parents=True, exist_ok=True)
        pdf_path = tenant_dir / "secret.pdf"
        pdf_path.write_bytes(b"%PDF-1.4 fake contract content for security test")

        r = self.client.get("/uploads/999001/contracts/secret.pdf")
        self.assertEqual(r.status_code, 403, r.text)
        self.assertIn("not available", r.json().get("detail", "").lower())


if __name__ == "__main__":
    unittest.main()
