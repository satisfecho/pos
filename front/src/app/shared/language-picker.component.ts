import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LanguageService, SUPPORTED_LANGUAGES, LanguageCode } from '../services/language.service';

@Component({
  selector: 'app-language-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="language-picker">
      <select
        [(ngModel)]="currentLanguageValue"
        class="language-select"
        aria-label="Select language"
      >
        @for (lang of languages; track lang.code) {
          <option [value]="lang.code">{{ lang.label }}</option>
        }
      </select>
    </div>
  `,
  styles: [`
    .language-picker {
      display: inline-block;
    }

    .language-select {
      padding: 0.375rem 0.75rem;
      font-size: 0.875rem;
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 0.375rem;
      background-color: var(--color-surface, #fff);
      color: var(--color-text, #1f2937);
      cursor: pointer;
      min-width: 120px;

      &:hover {
        border-color: var(--color-border-hover, #d1d5db);
      }

      &:focus {
        outline: none;
        border-color: var(--color-primary, #D35233);
        box-shadow: 0 0 0 2px rgba(211, 82, 51, 0.1);
      }
    }
  `]
})
export class LanguagePickerComponent {
  languageService = inject(LanguageService);
  languages = SUPPORTED_LANGUAGES;

  get currentLanguageValue(): LanguageCode {
    return this.languageService.currentLanguage();
  }

  set currentLanguageValue(value: LanguageCode) {
    this.languageService.setLanguage(value);
  }
}
