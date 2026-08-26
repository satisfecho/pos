/** Sellable-unit stock alert helpers (#356). */

export interface ProductStockFields {
  stock_alert_enabled?: boolean;
  stock_qty?: number;
  stock_alert_level?: number;
}

export function isProductLowStock(product: ProductStockFields): boolean {
  if (!product.stock_alert_enabled) return false;
  return (product.stock_qty ?? 0) <= (product.stock_alert_level ?? 0);
}

/** Remaining sellable units when the low-stock message should show; otherwise null. */
export function productStockLeft(product: ProductStockFields): number | null {
  if (!isProductLowStock(product)) return null;
  const qty = product.stock_qty ?? 0;
  return qty > 0 ? qty : null;
}
