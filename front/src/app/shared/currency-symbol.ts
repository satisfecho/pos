import { TranslateService } from '@ngx-translate/core';
import { intlLocaleFromTranslate } from './intl-locale';

/** Symbol for an ISO 4217 code using the active UI locale (ngx-translate). */
export function currencySymbolFromIsoCode(translate: TranslateService, code: string): string {
  const locale = intlLocaleFromTranslate(translate);
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'symbol',
    }).formatToParts(0);
    return parts.find((part) => part.type === 'currency')?.value || code;
  } catch {
    return code;
  }
}
