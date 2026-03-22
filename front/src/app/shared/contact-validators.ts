/**
 * Client-side checks aligned with backend rules (authoritative validation on API).
 */

const EMAIL_MAX = 254;
/** Simplified RFC 5322-style local@domain check; backend uses email-validator. */
const EMAIL_PART = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function contactEmailValid(raw: string): boolean {
  const s = (raw || '').trim();
  if (!s || s.length > EMAIL_MAX) return false;
  if (s.includes('..') || s.startsWith('@') || s.endsWith('@')) return false;
  return EMAIL_PART.test(s);
}

/** At least 8 digits, at most 15 (E.164 max significant digits). */
export function contactPhoneValid(raw: string): boolean {
  const digits = (raw || '').replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

export function contactEmailValidator(control: { value: unknown }): Record<string, true> | null {
  const v = control.value;
  if (v == null || v === '') return null;
  return contactEmailValid(String(v)) ? null : { contactEmail: true };
}

export function contactPhoneValidator(control: { value: unknown }): Record<string, true> | null {
  const v = control.value;
  if (v == null || v === '') return { contactPhone: true };
  return contactPhoneValid(String(v)) ? null : { contactPhone: true };
}

/** Use when phone is optional: empty is valid. */
export function optionalContactPhoneValidator(control: { value: unknown }): Record<string, true> | null {
  const v = control.value;
  if (v == null || String(v).trim() === '') return null;
  return contactPhoneValid(String(v)) ? null : { contactPhone: true };
}
