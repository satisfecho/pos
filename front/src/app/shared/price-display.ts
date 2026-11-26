/** Guest/staff unit price display (#455). Billed amounts stay tax-inclusive. */

export type PriceDisplayMode = 'inclusive' | 'exclusive';

export function normalizePriceDisplayMode(raw: string | null | undefined): PriceDisplayMode {
  return (raw || '').trim().toLowerCase() === 'exclusive' ? 'exclusive' : 'inclusive';
}

/** Unit cents to show on menus; use product.price_cents for cart/billing. */
export function menuDisplayUnitCents(product: {
  price_cents: number;
  display_price_cents?: number | null;
}): number {
  if (product.display_price_cents != null && product.display_price_cents >= 0) {
    return product.display_price_cents;
  }
  return product.price_cents ?? 0;
}

export function menuDisplayListUnitCents(product: {
  list_price_cents?: number | null;
  display_list_price_cents?: number | null;
}): number | null {
  if (product.display_list_price_cents != null && product.display_list_price_cents >= 0) {
    return product.display_list_price_cents;
  }
  if (product.list_price_cents != null && product.list_price_cents >= 0) {
    return product.list_price_cents;
  }
  return null;
}
