import { TranslateService } from '@ngx-translate/core';

/**
 * BCP 47 locale for Intl.NumberFormat / Date from the active UI language (ngx-translate).
 */
export function intlLocaleFromTranslate(translate: TranslateService): string {
  const raw = (translate.currentLang || '').trim().toLowerCase();
  if (!raw) {
    return typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';
  }
  if (raw.startsWith('zh')) {
    return 'zh-CN';
  }
  const base = raw.split('-')[0];
  const map: Record<string, string> = {
    en: 'en-GB',
    es: 'es-ES',
    de: 'de-DE',
    fr: 'fr-FR',
    ca: 'ca-ES',
    bg: 'bg-BG',
    hi: 'hi-IN',
    ur: 'ur-PK',
  };
  return map[base] || (typeof navigator !== 'undefined' && navigator.language) || 'en-US';
}
