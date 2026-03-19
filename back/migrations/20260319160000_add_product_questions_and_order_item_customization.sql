-- Product questions (e.g. meat doneness, spice level) and order item customization answers
-- ProductQuestion: optional questions per product (choice, scale, text)
-- OrderItem.customization_answers: JSON object storing customer answers per question

CREATE TABLE IF NOT EXISTS product_question (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL,
    label VARCHAR(256) NOT NULL,
    options JSONB NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    required BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_product_question_tenant_product ON product_question(tenant_id, product_id);

ALTER TABLE orderitem ADD COLUMN IF NOT EXISTS customization_answers JSONB NULL;
