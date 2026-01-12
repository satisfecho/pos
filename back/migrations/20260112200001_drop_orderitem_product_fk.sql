-- Drop the FK constraint on orderitem.product_id to allow TenantProduct IDs
-- The product_id field now stores either Product.id OR TenantProduct.id
ALTER TABLE orderitem DROP CONSTRAINT IF EXISTS orderitem_product_id_fkey;
