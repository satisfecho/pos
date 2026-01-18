import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../services/api.service';
import { LanguageService, SUPPORTED_LANGUAGES, LanguageCode } from '../services/language.service';


interface TranslationEntity {
  id: number;
  type: 'tenant' | 'product' | 'tenant_product' | 'product_catalog';
  name: string;
  description?: string;
}

interface TranslationData {
  [field: string]: {
    [lang: string]: string;
  };
}

@Component({
  selector: 'app-translations',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="translations-content">
      <div class="content">
        <!-- Entity Selection -->
        <div class="subsection">
          <h3>{{ 'TRANSLATIONS.SELECT_ITEM_TO_TRANSLATE' | translate }}</h3>

          <div class="entity-selector">
            <div class="form-group">
              <label for="entity-type">{{ 'TRANSLATIONS.ENTITY_TYPE' | translate }}</label>
              <select id="entity-type" [(ngModel)]="selectedEntityType" (change)="loadEntities()">
                <option value="tenant">{{ 'TRANSLATIONS.BUSINESS_INFORMATION' | translate }}</option>
                <option value="product">{{ 'TRANSLATIONS.LEGACY_PRODUCTS' | translate }}</option>
                <option value="tenant_product">{{ 'TRANSLATIONS.MENU_PRODUCTS' | translate }}</option>
                <option value="product_catalog">{{ 'TRANSLATIONS.CATALOG_ITEMS' | translate }}</option>
              </select>
            </div>

            <div class="form-group">
              <label for="entity-select">{{ 'TRANSLATIONS.SELECT_ITEM' | translate }}</label>
              <select id="entity-select" [(ngModel)]="selectedEntityId" (change)="loadTranslations()">
                <option [ngValue]="null">{{ 'TRANSLATIONS.CHOOSE_AN_ITEM' | translate }}</option>
                @for (entity of entities(); track entity.id) {
                  <option [value]="entity.id">{{ entity.name }}</option>
                }
              </select>
            </div>
          </div>
        </div>

        <!-- Translation Editor -->
        @if (selectedEntityId() !== null) {
          <div class="subsection">
            <h3>{{ 'TRANSLATIONS.EDIT_TRANSLATIONS' | translate }}</h3>

            <div class="translation-editor">
              @for (field of getFields(); track field) {
                <div class="field-translations">
                  <h3>{{ getFieldLabel(field) }}</h3>
                  <div class="original-text">
                    <strong>Original ({{ currentLanguage() }}):</strong>
                    {{ getOriginalText(field) }}
                  </div>

                  <div class="language-tabs">
                    @for (lang of supportedLanguages; track lang.code) {
                      @if (lang.code !== currentLanguage()) {
                        <div class="language-tab">
                          <label>{{ lang.label }}</label>
                          <textarea
                            [value]="getTranslation(field, lang.code)"
                            (input)="updateTranslation(field, lang.code, $event)"
                            [placeholder]="('TRANSLATIONS.ENTER_TRANSLATION' | translate)"
                            rows="3"
                          ></textarea>
                        </div>
                      }
                    }
                  </div>
                </div>
              }

              <div class="actions">
                <button
                  class="btn-primary"
                  (click)="saveTranslations()"
                  [disabled]="saving()"
                >
                  {{ saving() ? ('TRANSLATIONS.SAVING' | translate) : ('TRANSLATIONS.SAVE_TRANSLATIONS' | translate) }}
                </button>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Success/Error Messages -->
      @if (success()) {
        <div class="success-message">{{ success() }}</div>
      }
      @if (error()) {
        <div class="error-message">{{ error() }}</div>
      }
    </div>
  `,
  styles: [`
    .translations-page {
      max-width: 1000px;
      margin: 0 auto;
      padding: 2rem;
    }

    .page-header {
      margin-bottom: 2rem;

      h1 {
        font-size: 2rem;
        font-weight: 700;
        color: var(--color-text);
        margin-bottom: 0.5rem;
      }

      p {
        color: var(--color-text-muted);
        font-size: 1rem;
      }
    }

    .content {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .subsection {
      margin-bottom: var(--space-5);

      h3 {
        font-size: 1rem;
        font-weight: 600;
        color: var(--color-text);
        margin-bottom: var(--space-4);
      }
    }

    .entity-selector {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      label {
        font-weight: 500;
        color: var(--color-text);
      }

      select {
        padding: 0.75rem;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-bg);
        color: var(--color-text);
        font-size: 1rem;

        &:focus {
          outline: none;
          border-color: var(--color-primary);
        }
      }
    }

    .translation-editor {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .field-translations {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 1.5rem;

      h3 {
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--color-text);
        margin-bottom: 1rem;
        text-transform: capitalize;
      }

      .original-text {
        background: var(--color-bg);
        padding: 1rem;
        border-radius: var(--radius-md);
        margin-bottom: 1.5rem;
        border-left: 4px solid var(--color-primary);

        strong {
          color: var(--color-text);
          display: block;
          margin-bottom: 0.5rem;
        }
      }
    }

    .language-tabs {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .language-tab {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      label {
        font-weight: 500;
        color: var(--color-text);
      }

      textarea {
        padding: 0.75rem;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-bg);
        color: var(--color-text);
        font-size: 1rem;
        font-family: inherit;
        resize: vertical;
        min-height: 80px;

        &:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        &::placeholder {
          color: var(--color-text-muted);
        }
      }
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      padding-top: 1rem;
      border-top: 1px solid var(--color-border);
    }

    .btn-primary {
      background: var(--color-primary);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: var(--radius-md);
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.15s ease;

      &:hover:not(:disabled) {
        background: var(--color-primary-dark, #c2410c);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .success-message {
      background: var(--color-success-light);
      color: var(--color-success);
      padding: 1rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-success);
      margin-top: 1rem;
    }

    .error-message {
      background: var(--color-error-light);
      color: var(--color-error);
      padding: 1rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-error);
      margin-top: 1rem;
    }
  `]
})
export class TranslationsComponent {
  private api = inject(ApiService);
  private languageService = inject(LanguageService);
  private translate = inject(TranslateService);

  entities = signal<TranslationEntity[]>([]);
  translations = signal<TranslationData | null>(null);
  pendingChanges = signal<TranslationData>({});

  selectedEntityType = signal<'tenant' | 'product' | 'tenant_product' | 'product_catalog'>('tenant');
  selectedEntityId = signal<number | null>(null);

  loading = signal(false);
  saving = signal(false);
  error = signal('');
  success = signal('');

  supportedLanguages = SUPPORTED_LANGUAGES;
  currentLanguage = computed(() => this.languageService.getLanguage());
  hasTranslations = computed(() => {
    const trans = this.translations();
    return trans && Object.keys(trans).length > 0;
  });

  ngOnInit() {
    this.loadEntities();
  }

  loadEntities() {
    this.loading.set(true);
    this.error.set('');
    this.selectedEntityId.set(null);
    this.translations.set(null);

    const entityType = this.selectedEntityType();

    if (entityType === 'tenant') {
      // Load tenant info
      this.api.getTenantSettings().subscribe({
        next: (settings) => {
          this.entities.set([{
            id: settings.id!,
            type: 'tenant',
            name: settings.name,
            description: settings.description || undefined
          }]);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(this.translate.instant('TRANSLATIONS.FAILED_TO_LOAD_TENANT'));
          this.loading.set(false);
        }
      });
    } else if (entityType === 'product') {
      // Load legacy products
      this.api.getProducts().subscribe({
        next: (products) => {
          this.entities.set(products.map(p => ({
            id: p.id!,
            type: 'product',
            name: p.name || 'Unnamed Product',
            description: undefined
          })));
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(this.translate.instant('TRANSLATIONS.FAILED_TO_LOAD_PRODUCTS'));
          this.loading.set(false);
        }
      });
    } else if (entityType === 'tenant_product') {
      // Load menu products
      this.api.getTenantProducts().subscribe({
        next: (products) => {
          this.entities.set(products.map(p => ({
            id: p.id!,
            type: 'tenant_product',
            name: p.name || 'Unnamed Product',
            description: undefined
          })));
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(this.translate.instant('TRANSLATIONS.FAILED_TO_LOAD_PRODUCTS'));
          this.loading.set(false);
        }
      });
    } else if (entityType === 'product_catalog') {
      // Load catalog items
      this.api.getCatalog().subscribe({
        next: (items) => {
          this.entities.set(items.map(item => ({
            id: item.id,
            type: 'product_catalog',
            name: item.name,
            description: item.description || undefined
          })));
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(this.translate.instant('TRANSLATIONS.FAILED_TO_LOAD_PRODUCTS'));
          this.loading.set(false);
        }
      });
    }
  }

  loadTranslations() {
    const entityId = this.selectedEntityId();
    const entityType = this.selectedEntityType();

    if (!entityId) {
      this.translations.set(null);
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.api.getTranslations(entityType, entityId).subscribe({
      next: (response) => {
        this.translations.set(response.translations || {});
        this.pendingChanges.set({}); // Reset pending changes
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(this.translate.instant('TRANSLATIONS.FAILED_TO_LOAD_TRANSLATIONS'));
        this.loading.set(false);
      }
    });
  }

  getFields(): string[] {
    const entityType = this.selectedEntityType();
    const translations = this.translations();

    if (!translations) return [];

    // Return fields that have translations or are commonly translatable
    const availableFields = Object.keys(translations);
    const commonFields = ['name', 'description', 'ingredients', 'address'];

    return [...new Set([...availableFields, ...commonFields])];
  }

  getFieldLabel(field: string): string {
    const labelKeys: Record<string, string> = {
      name: 'TRANSLATIONS.FIELD_NAME',
      description: 'TRANSLATIONS.FIELD_DESCRIPTION',
      ingredients: 'TRANSLATIONS.FIELD_INGREDIENTS',
      address: 'TRANSLATIONS.FIELD_ADDRESS'
    };
    const key = labelKeys[field];
    return key ? this.translate.instant(key) : field;
  }

  getOriginalText(field: string): string {
    // For now, return empty - in a real implementation you'd fetch the original values
    // This would require additional API calls or storing originals in the component
    return this.translate.instant('TRANSLATIONS.ORIGINAL_NOT_LOADED');
  }

  getTranslation(field: string, lang: string): string {
    const pending = this.pendingChanges();
    const current = this.translations();

    // Check pending changes first
    if (pending[field]?.[lang]) {
      return pending[field][lang];
    }

    // Then check existing translations
    return current?.[field]?.[lang] || '';
  }

  updateTranslation(field: string, lang: string, event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    const value = textarea.value;

    this.pendingChanges.update(changes => {
      if (!changes[field]) {
        changes[field] = {};
      }
      changes[field][lang] = value;
      return { ...changes };
    });
  }

  saveTranslations() {
    const entityId = this.selectedEntityId();
    const entityType = this.selectedEntityType();
    const changes = this.pendingChanges();

    if (!entityId || Object.keys(changes).length === 0) {
      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    this.api.updateTranslations(entityType, entityId, changes).subscribe({
      next: (response) => {
        this.success.set(response.message || this.translate.instant('TRANSLATIONS.SAVED_SUCCESS'));
        this.pendingChanges.set({}); // Clear pending changes
        this.loadTranslations(); // Reload to get updated translations
        this.saving.set(false);

        // Clear success message after 5 seconds
        setTimeout(() => this.success.set(''), 5000);
      },
      error: (err) => {
        this.error.set(this.translate.instant('TRANSLATIONS.FAILED_TO_SAVE'));
        this.saving.set(false);
      }
    });
  }
}
