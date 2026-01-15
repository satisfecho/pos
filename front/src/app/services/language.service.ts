import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', locale: 'en-US' },
  { code: 'es', label: 'Español', locale: 'es-ES' },
  { code: 'ca', label: 'Català', locale: 'ca-ES' },
  { code: 'de', label: 'Deutsch', locale: 'de-DE' },
  { code: 'zh-CN', label: '中文（简体）', locale: 'zh-CN' },
  { code: 'hi', label: 'हिन्दी', locale: 'hi-IN' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

const LANG_STORAGE_KEY = 'pos_language';
const DEFAULT_LANGUAGE: LanguageCode = 'en';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private translate = inject(TranslateService);

  currentLanguage = signal<LanguageCode>(DEFAULT_LANGUAGE);
  currentLocale = signal<string>('en-US');

  constructor() {
    this.initializeLanguage();
  }

  private initializeLanguage(): void {
    // Set available languages
    const langCodes = SUPPORTED_LANGUAGES.map(l => l.code);
    this.translate.addLangs(langCodes);
    this.translate.setDefaultLang(DEFAULT_LANGUAGE);

    // Determine initial language
    const stored = this.getStoredLanguage();
    const browserLang = this.getBrowserLanguage();
    const initialLang = stored || browserLang || DEFAULT_LANGUAGE;

    this.setLanguage(initialLang);
  }

  setLanguage(lang: LanguageCode | string): void {
    const normalizedLang = this.normalizeLanguageCode(lang);
    const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === normalizedLang);

    if (!langConfig) {
      console.warn(`Unsupported language: ${lang}, falling back to ${DEFAULT_LANGUAGE}`);
      this.setLanguage(DEFAULT_LANGUAGE);
      return;
    }

    this.translate.use(normalizedLang);
    this.currentLanguage.set(normalizedLang);
    this.currentLocale.set(langConfig.locale);
    this.storeLanguage(normalizedLang);

    // Update document lang attribute for accessibility
    if (typeof document !== 'undefined') {
      document.documentElement.lang = normalizedLang;
    }
  }

  getLanguage(): LanguageCode {
    return this.currentLanguage();
  }

  getLocale(): string {
    return this.currentLocale();
  }

  getSupportedLanguages() {
    return SUPPORTED_LANGUAGES;
  }

  /**
   * Normalize language codes from various formats:
   * - zh, zh-Hans, zh_CN -> zh-CN
   * - es-MX, es_ES -> es
   * - etc.
   */
  normalizeLanguageCode(lang: string): LanguageCode {
    if (!lang) return DEFAULT_LANGUAGE;

    const lowerLang = lang.toLowerCase().replace('_', '-');

    // Direct match
    const directMatch = SUPPORTED_LANGUAGES.find(
      l => l.code.toLowerCase() === lowerLang
    );
    if (directMatch) return directMatch.code;

    // Chinese variants
    if (lowerLang.startsWith('zh')) {
      return 'zh-CN';
    }

    // Base language match (e.g., es-MX -> es)
    const baseLang = lowerLang.split('-')[0];
    const baseMatch = SUPPORTED_LANGUAGES.find(
      l => l.code.toLowerCase() === baseLang || l.code.toLowerCase().startsWith(baseLang + '-')
    );
    if (baseMatch) return baseMatch.code;

    return DEFAULT_LANGUAGE;
  }

  private getBrowserLanguage(): LanguageCode | null {
    if (typeof navigator === 'undefined') return null;

    const browserLang = navigator.language || (navigator as any).userLanguage;
    if (!browserLang) return null;

    const normalized = this.normalizeLanguageCode(browserLang);
    return SUPPORTED_LANGUAGES.some(l => l.code === normalized) ? normalized : null;
  }

  private getStoredLanguage(): LanguageCode | null {
    if (typeof localStorage === 'undefined') return null;

    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (!stored) return null;

    const normalized = this.normalizeLanguageCode(stored);
    return SUPPORTED_LANGUAGES.some(l => l.code === normalized) ? normalized : null;
  }

  private storeLanguage(lang: LanguageCode): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    }
  }

  /**
   * Format a number using the current locale
   */
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.currentLocale(), options).format(value);
  }

  /**
   * Format currency using the current locale and specified currency code
   */
  formatCurrency(value: number, currencyCode: string): string {
    return new Intl.NumberFormat(this.currentLocale(), {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'symbol'
    }).format(value);
  }

  /**
   * Format a date using the current locale
   */
  formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(this.currentLocale(), options).format(dateObj);
  }

  /**
   * Get Accept-Language header value for API requests
   */
  getAcceptLanguageHeader(): string {
    const current = this.currentLanguage();
    // Include current language with highest priority, then English as fallback
    if (current === 'en') {
      return 'en;q=1.0';
    }
    return `${current};q=1.0, en;q=0.5`;
  }
}
