-- Migration 20260315130000: Add user_role value 'bartender'
-- Bartender role prepares drinks and beverages (order:read, order:item_status, product/catalog read).

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'bartender';
