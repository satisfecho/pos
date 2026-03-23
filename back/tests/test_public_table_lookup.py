"""Public table lookup: printed name (e.g. T01) or token → menu token (GitHub #38)."""

import unittest

from pg_client_mixin import PgClientTestCase

from app import models


class TestPublicTableLookup(PgClientTestCase):
    def setUp(self):
        super().setUp()
        self.tenant = models.Tenant(name="Lookup Tenant A")
        self.session.add(self.tenant)
        self.session.commit()
        self.session.refresh(self.tenant)

        self.floor = models.Floor(name="Main", tenant_id=self.tenant.id)
        self.session.add(self.floor)
        self.session.commit()
        self.session.refresh(self.floor)

        # Avoid colliding with seeded demo tables named T01–T10 on shared dev DBs.
        self.table = models.Table(
            name="LU-SINGLE-38",
            tenant_id=self.tenant.id,
            floor_id=self.floor.id,
            is_active=True,
        )
        self.session.add(self.table)
        self.session.commit()
        self.session.refresh(self.table)

    def test_lookup_by_token(self):
        r = self.client.get("/public/table-lookup", params={"q": self.table.token})
        self.assertEqual(r.status_code, 200, r.text)
        b = r.json()
        self.assertEqual(b["table_token"], self.table.token)
        self.assertFalse(b["ambiguous"])
        self.assertEqual(b["choices"], [])

    def test_lookup_by_printed_name_case_insensitive(self):
        r = self.client.get("/public/table-lookup", params={"q": "lu-single-38"})
        self.assertEqual(r.status_code, 200, r.text)
        b = r.json()
        self.assertEqual(b["table_token"], self.table.token)
        self.assertFalse(b["ambiguous"])

    def test_lookup_unknown_returns_404(self):
        r = self.client.get("/public/table-lookup", params={"q": "NO_SUCH_TABLE_XYZ"})
        self.assertEqual(r.status_code, 404, r.text)

    def test_lookup_ambiguous_same_name_two_tenants(self):
        t2 = models.Tenant(name="Lookup Tenant B")
        self.session.add(t2)
        self.session.commit()
        self.session.refresh(t2)
        f2 = models.Floor(name="Main", tenant_id=t2.id)
        self.session.add(f2)
        self.session.commit()
        self.session.refresh(f2)
        tab2 = models.Table(
            name="LU-AMB-38",
            tenant_id=t2.id,
            floor_id=f2.id,
            is_active=True,
        )
        self.session.add(tab2)
        self.session.commit()
        self.session.refresh(tab2)

        self.table.name = "LU-AMB-38"
        self.session.add(self.table)
        self.session.commit()
        self.session.refresh(self.table)

        r = self.client.get("/public/table-lookup", params={"q": "lu-amb-38"})
        self.assertEqual(r.status_code, 200, r.text)
        b = r.json()
        self.assertIsNone(b["table_token"])
        self.assertTrue(b["ambiguous"])
        self.assertEqual(len(b["choices"]), 2)
        tokens = {c["table_token"] for c in b["choices"]}
        self.assertEqual(tokens, {self.table.token, tab2.token})
        tenant_names = {c["tenant_name"] for c in b["choices"]}
        self.assertEqual(tenant_names, {"Lookup Tenant A", "Lookup Tenant B"})


if __name__ == "__main__":
    unittest.main()
