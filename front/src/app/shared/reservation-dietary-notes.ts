/** Merged allergies / dietary text for list/detail UI (single line when possible). */
export function reservationDietaryNotesDisplay(r: {
  allergies_detail?: string | null;
  customer_notes?: string | null;
}): string | null {
  const ad = (r.allergies_detail ?? '').trim();
  const cn = (r.customer_notes ?? '').trim();
  if (!ad && !cn) return null;
  if (!ad) return cn;
  if (!cn || ad === cn) return ad;
  return `${ad} · ${cn}`;
}

/** Value for the unified dietary textarea when editing (preserves two distinct legacy values). */
export function reservationDietaryNotesFormValue(r: {
  allergies_detail?: string | null;
  customer_notes?: string | null;
}): string {
  const ad = (r.allergies_detail ?? '').trim();
  const cn = (r.customer_notes ?? '').trim();
  if (!ad) return cn;
  if (!cn || ad === cn) return ad;
  return `${ad}\n${cn}`;
}
