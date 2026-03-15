-- Remove orders that have no products (no order_items, or all items removed/cancelled).
-- Unlink such orders from table.active_order_id, then delete their items and the orders.

-- 1. Unlink tables from empty orders (so FK is not violated)
UPDATE "table" SET active_order_id = NULL
WHERE active_order_id IN (
  SELECT o.id FROM "order" o
  WHERE NOT EXISTS (
    SELECT 1 FROM orderitem oi
    WHERE oi.order_id = o.id
      AND oi.removed_by_customer = false
      AND (oi.removed_by_user_id IS NULL)
      AND oi.status != 'cancelled'
  )
);

-- 2. Delete order_items belonging to those orders
DELETE FROM orderitem
WHERE order_id IN (
  SELECT o.id FROM "order" o
  WHERE NOT EXISTS (
    SELECT 1 FROM orderitem oi
    WHERE oi.order_id = o.id
      AND oi.removed_by_customer = false
      AND (oi.removed_by_user_id IS NULL)
      AND oi.status != 'cancelled'
  )
);

-- 3. Delete the empty orders
DELETE FROM "order"
WHERE id IN (
  SELECT o.id FROM "order" o
  WHERE NOT EXISTS (
    SELECT 1 FROM orderitem oi
    WHERE oi.order_id = o.id
      AND oi.removed_by_customer = false
      AND (oi.removed_by_user_id IS NULL)
      AND oi.status != 'cancelled'
  )
);
