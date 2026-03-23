-- Structured line modifiers (e.g. pizza: remove / add / substitute) for kitchen and invoices.
ALTER TABLE orderitem
    ADD COLUMN IF NOT EXISTS line_modifiers JSONB,
    ADD COLUMN IF NOT EXISTS line_modifiers_summary VARCHAR(1024);

COMMENT ON COLUMN orderitem.line_modifiers IS 'Structured modifiers: remove[], add[], substitute[{from,to}]';
COMMENT ON COLUMN orderitem.line_modifiers_summary IS 'Human-readable snapshot at order time';
