-- Spanish labour: Código Cuenta de Cotización (CCC) for registro horario / legal headers
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS ccc TEXT DEFAULT NULL;
