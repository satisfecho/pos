-- Kitchen / bar prep stations: per-tenant stations, product mapping, defaults for unmapped lines
CREATE TABLE IF NOT EXISTS kitchen_station (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  display_route VARCHAR(16) NOT NULL DEFAULT 'kitchen',
  CONSTRAINT kitchen_station_display_route_chk CHECK (display_route IN ('kitchen', 'bar'))
);

CREATE INDEX IF NOT EXISTS ix_kitchen_station_tenant_id ON kitchen_station(tenant_id);
CREATE INDEX IF NOT EXISTS ix_kitchen_station_tenant_route ON kitchen_station(tenant_id, display_route);

ALTER TABLE tenant
  ADD COLUMN IF NOT EXISTS default_kitchen_station_id INTEGER REFERENCES kitchen_station(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_bar_station_id INTEGER REFERENCES kitchen_station(id) ON DELETE SET NULL;

ALTER TABLE product
  ADD COLUMN IF NOT EXISTS kitchen_station_id INTEGER REFERENCES kitchen_station(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_product_kitchen_station_id ON product(kitchen_station_id);

COMMENT ON TABLE kitchen_station IS 'Prep station for KDS filtering and product routing (kitchen vs bar display)';
COMMENT ON COLUMN kitchen_station.display_route IS 'kitchen = /kitchen KDS, bar = /bar KDS';
COMMENT ON COLUMN product.kitchen_station_id IS 'Explicit prep station; null uses tenant default by category/route';
