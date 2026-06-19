import { Component, OnDestroy, OnInit, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { intlLocaleFromTranslate } from '../shared/intl-locale';
import type { UnitOfMeasure } from '../inventory/inventory.types';
import {
  PricingService,
  type PricingSuggestQuery,
  type PricingSuggestResponse,
  type PricingSimulateRequest,
} from './pricing.service';

@Component({
  selector: 'app-pricing-helper',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div
      class="pricing-helper-overlay"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="'PRICING.TITLE' | translate"
      [attr.aria-describedby]="preview() ? 'ph-preview-panel' : null"
      (click)="onOverlay($event)"
    >
      <div class="pricing-helper-dialog" (click)="$event.stopPropagation()">
        <div class="pricing-helper-header">
          <h2 class="pricing-helper-title">{{ 'PRICING.TITLE' | translate }}</h2>
          <button type="button" class="icon-btn" (click)="closed.emit()" [attr.aria-label]="'COMMON.CLOSE' | translate">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p class="pricing-helper-example">{{ 'PRICING.EXAMPLE_LINE' | translate }}</p>

        <div class="pricing-helper-body">
          @if (productId() != null) {
            <section class="pricing-helper-section" [attr.aria-label]="'PRICING.SECTION_MODE' | translate">
              <div class="segmented-control mode-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  [class.active]="uiMode === 'recipe'"
                  [attr.aria-selected]="uiMode === 'recipe'"
                  (click)="setUiMode('recipe')"
                >
                  {{ 'PRICING.MODE_RECIPE' | translate }}
                </button>
                <button
                  type="button"
                  role="tab"
                  [class.active]="uiMode === 'simulate'"
                  [attr.aria-selected]="uiMode === 'simulate'"
                  (click)="setUiMode('simulate')"
                >
                  {{ 'PRICING.MODE_SIMULATE' | translate }}
                </button>
              </div>
              <p class="field-hint">{{ modeHintI18n() | translate }}</p>
            </section>
          }

          @if (uiMode === 'simulate') {
            <section class="pricing-helper-section" [attr.aria-label]="'PRICING.SECTION_CONTAINER' | translate">
              <h3 class="pricing-helper-section-title">{{ 'PRICING.SECTION_CONTAINER' | translate }}</h3>
              <div class="form-grid">
                <div class="form-group full-row">
                  <label for="ph-container-cost">{{ 'PRICING.CONTAINER_TOTAL' | translate }}</label>
                  <input
                    id="ph-container-cost"
                    type="number"
                    step="0.01"
                    min="0.01"
                    [(ngModel)]="simContainerCostMajor"
                    (ngModelChange)="scheduleRefresh()"
                  />
                  <small class="field-hint">{{ 'PRICING.CONTAINER_TOTAL_HINT' | translate }}</small>
                </div>
                <div class="form-group full-row qty-unit-pair">
                  <label for="ph-cqty">{{ 'PRICING.CONTAINER_AMOUNT' | translate }}</label>
                  <div class="qty-unit-row">
                    <input
                      id="ph-cqty"
                      type="number"
                      step="any"
                      min="0.0001"
                      [(ngModel)]="simContainerQty"
                      (ngModelChange)="scheduleRefresh()"
                    />
                    <select
                      id="ph-cunit"
                      class="unit-select"
                      [(ngModel)]="simContainerUnit"
                      (ngModelChange)="scheduleRefresh()"
                      [attr.aria-label]="'INVENTORY.ITEMS.UNIT' | translate"
                    >
                      @for (u of units; track u) {
                        <option [value]="u">{{ unitLabel(u) | translate }}</option>
                      }
                    </select>
                  </div>
                  <small class="field-hint">{{ 'PRICING.CONTAINER_AMOUNT_HINT' | translate }}</small>
                </div>
                <div class="form-group full-row qty-unit-pair">
                  <label for="ph-sqty">{{ 'PRICING.SERVING_SIZE' | translate }}</label>
                  <div class="qty-unit-row">
                    <input
                      id="ph-sqty"
                      type="number"
                      step="any"
                      min="0.0001"
                      [(ngModel)]="simServingQty"
                      (ngModelChange)="scheduleRefresh()"
                    />
                    <select
                      id="ph-sunit"
                      class="unit-select"
                      [(ngModel)]="simServingUnit"
                      (ngModelChange)="scheduleRefresh()"
                      [attr.aria-label]="'INVENTORY.ITEMS.UNIT' | translate"
                    >
                      @for (u of units; track u) {
                        <option [value]="u">{{ unitLabel(u) | translate }}</option>
                      }
                    </select>
                  </div>
                  <small class="field-hint">{{ 'PRICING.SERVING_SIZE_HINT' | translate }}</small>
                </div>
              </div>
            </section>
          }

          <section class="pricing-helper-section" [attr.aria-label]="'PRICING.SECTION_GARNISHES' | translate">
            <h3 class="pricing-helper-section-title">{{ 'PRICING.SECTION_GARNISHES' | translate }}</h3>
            <p class="field-hint">{{ 'PRICING.GARNISHES_HINT' | translate }}</p>
            <div class="form-grid garnish-grid">
              <div class="form-group">
                <label for="ph-garnish-ice">{{ 'PRICING.GARNISH_ICE' | translate }}</label>
                <input
                  id="ph-garnish-ice"
                  type="number"
                  step="0.01"
                  min="0"
                  [(ngModel)]="garnishIceMajor"
                  (ngModelChange)="scheduleRefresh()"
                />
                <small class="field-hint">{{ 'PRICING.GARNISH_ICE_HINT' | translate }}</small>
              </div>
              <div class="form-group">
                <label for="ph-garnish-lemon">{{ 'PRICING.GARNISH_LEMON' | translate }}</label>
                <input
                  id="ph-garnish-lemon"
                  type="number"
                  step="0.01"
                  min="0"
                  [(ngModel)]="garnishLemonMajor"
                  (ngModelChange)="scheduleRefresh()"
                />
                <small class="field-hint">{{ 'PRICING.GARNISH_LEMON_HINT' | translate }}</small>
              </div>
              <div class="form-group">
                <label for="ph-garnish-other">{{ 'PRICING.GARNISH_OTHER' | translate }}</label>
                <input
                  id="ph-garnish-other"
                  type="number"
                  step="0.01"
                  min="0"
                  [(ngModel)]="garnishOtherMajor"
                  (ngModelChange)="scheduleRefresh()"
                />
                <small class="field-hint">{{ 'PRICING.GARNISH_OTHER_HINT' | translate }}</small>
              </div>
            </div>
          </section>

          <section class="pricing-helper-section" [attr.aria-label]="'PRICING.SECTION_TARGET' | translate">
            <div class="section-title-row">
              <h3 class="pricing-helper-section-title">{{ 'PRICING.SECTION_TARGET' | translate }}</h3>
              <button
                type="button"
                class="strategy-info-btn"
                [attr.aria-label]="'PRICING.STRATEGY_INFO' | translate"
                [attr.title]="'PRICING.STRATEGY_INFO' | translate"
              >
                <span aria-hidden="true">ⓘ</span>
              </button>
            </div>
            <div class="segmented-control target-segments" role="group">
              <button
                type="button"
                [class.active]="targetKind === 'pour'"
                (click)="setTargetKind('pour')"
              >
                {{ 'PRICING.TARGET_POUR_COST' | translate }}
              </button>
              <button
                type="button"
                [class.active]="targetKind === 'margin'"
                (click)="setTargetKind('margin')"
              >
                {{ 'PRICING.TARGET_MARGIN' | translate }}
              </button>
              <button
                type="button"
                [class.active]="targetKind === 'markup'"
                (click)="setTargetKind('markup')"
              >
                {{ 'PRICING.TARGET_MARKUP' | translate }}
              </button>
            </div>
            <p class="field-hint strategy-tab-hint">{{ targetStrategyHintI18n() | translate }}</p>
            <div class="form-group">
              <label for="ph-target-val">{{ targetValueLabelI18n() | translate }} (%)</label>
              <input id="ph-target-val" type="number" step="0.1" [(ngModel)]="targetValue" (ngModelChange)="scheduleRefresh()" />
            </div>
          </section>

          <section class="pricing-helper-section" [attr.aria-label]="'PRICING.SECTION_ADVANCED' | translate">
            <button
              type="button"
              class="more-options-toggle"
              [attr.aria-expanded]="advancedOpen"
              (click)="advancedOpen = !advancedOpen"
            >
              <span>{{ 'PRICING.MORE_OPTIONS' | translate }}</span>
              <svg
                class="more-options-chevron"
                [class.open]="advancedOpen"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <polyline points="6,9 12,15 18,9" />
              </svg>
            </button>
            @if (advancedOpen) {
              <div class="form-grid advanced-fields">
                <div class="form-group">
                  <label for="ph-waste">{{ 'PRICING.WASTE_PCT' | translate }}</label>
                  <input id="ph-waste" type="number" step="0.1" min="0" [(ngModel)]="wastePct" (ngModelChange)="scheduleRefresh()" />
                  <small class="field-hint">{{ 'PRICING.WASTE_PCT_HINT' | translate }}</small>
                </div>
                <div class="form-group">
                  <label for="ph-extra">{{ 'PRICING.EXTRA_FIXED_COST' | translate }}</label>
                  <input id="ph-extra" type="number" step="0.01" min="0" [(ngModel)]="extraFixedMajor" (ngModelChange)="scheduleRefresh()" />
                  <small class="field-hint">{{ 'PRICING.EXTRA_FIXED_COST_HINT' | translate }}</small>
                </div>
                <div class="form-group full-row">
                  <label for="ph-round">{{ 'PRICING.ROUNDING' | translate }}</label>
                  <input id="ph-round" type="number" step="0.01" min="0.01" [(ngModel)]="roundingMajor" (ngModelChange)="scheduleRefresh()" />
                  <small class="field-hint">{{ 'PRICING.ROUNDING_HINT' | translate }}</small>
                </div>
              </div>
            }
          </section>

          <section class="pricing-helper-section" [attr.aria-label]="'PRICING.SECTION_RESULTS' | translate">
            <h3 class="pricing-helper-section-title">{{ 'PRICING.SECTION_RESULTS' | translate }}</h3>
            @if (loading()) {
              <p class="status-message">{{ 'COMMON.LOADING' | translate }}</p>
            } @else if (errorMsg()) {
              <p class="error-text">{{ errorMsg() }}</p>
            } @else if (preview()) {
              <div id="ph-preview-panel" class="preview-panel">
                <div class="preview-hero">
                  <span class="preview-hero-label">{{ 'PRICING.SUGGESTED_PRICE' | translate }}</span>
                  <span class="preview-hero-value">{{ formatMoney(preview()!.suggested_price_cents) }}</span>
                </div>
                <hr class="preview-divider" />
                <div class="preview-metrics">
                  <div class="preview-row">
                    <span>{{ 'PRICING.COST_PER_SERVING' | translate }}</span>
                    <span>{{ formatMoney(preview()!.cost_per_serving_cents) }}</span>
                  </div>
                  <div class="preview-row">
                    <span>{{ 'PRICING.PROFIT_PER_SERVING' | translate }}</span>
                    <span>{{ formatMoney(preview()!.profit_per_serving_cents) }}</span>
                  </div>
                  <div class="preview-row">
                    <span>{{ 'PRICING.POUR_RESULT' | translate }}</span>
                    <span>{{ preview()!.pour_cost_pct | number: '1.1-1' }}%</span>
                  </div>
                  <div class="preview-row">
                    <span>{{ 'PRICING.MARGIN_RESULT' | translate }}</span>
                    <span>{{ preview()!.margin_pct | number: '1.1-1' }}%</span>
                  </div>
                  <div class="preview-row">
                    <span>{{ 'PRICING.MARKUP_RESULT' | translate }}</span>
                    <span>{{ preview()!.markup_pct | number: '1.1-1' }}%</span>
                  </div>
                  @if (preview()!.servings_in_container != null) {
                    <div class="preview-row">
                      <span>{{ 'PRICING.SERVINGS_IN_CONTAINER' | translate }}</span>
                      <span>{{ preview()!.servings_in_container | number: '1.0-2' }}</span>
                    </div>
                  }
                  @if (preview()!.break_even_servings != null) {
                    <div class="preview-row">
                      <span>{{ 'PRICING.BREAK_EVEN' | translate }}</span>
                      <span>{{ preview()!.break_even_servings }}</span>
                    </div>
                  }
                  @if (preview()!.total_profit_if_sold_out_cents != null) {
                    <div class="preview-row">
                      <span>{{ 'PRICING.TOTAL_PROFIT_IF_SOLD_OUT' | translate }}</span>
                      <span>{{ formatMoney(preview()!.total_profit_if_sold_out_cents!) }}</span>
                    </div>
                  }
                </div>
              </div>
            }
          </section>
        </div>

        <div class="pricing-helper-footer">
          <button type="button" class="btn btn-secondary" (click)="closed.emit()">{{ 'COMMON.CANCEL' | translate }}</button>
          <button type="button" class="btn btn-primary" [disabled]="!preview()" (click)="usePrice()">
            {{ 'PRICING.USE_THIS_PRICE' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrl: './pricing-helper.component.scss',
})
export class PricingHelperComponent implements OnInit, OnDestroy {
  private pricingApi = inject(PricingService);
  private translate = inject(TranslateService);

  productId = input<number | null>(null);
  productCategory = input<string | null>(null);
  currencyCode = input<string | null>(null);
  currencySymbol = input<string>('$');

  closed = output<void>();
  applyMajor = output<number>();

  readonly units: UnitOfMeasure[] = [
    'milliliter',
    'centiliter',
    'liter',
    'fluid_ounce',
    'cup',
    'gallon',
    'gram',
    'kilogram',
    'ounce',
    'pound',
    'piece',
  ];

  uiMode: 'recipe' | 'simulate' = 'recipe';
  targetKind: 'pour' | 'margin' | 'markup' = 'pour';
  advancedOpen = false;
  targetValue = 25;
  wastePct = 0;
  extraFixedMajor = 0;
  garnishIceMajor = 0;
  garnishLemonMajor = 0;
  garnishOtherMajor = 0;
  roundingMajor = 0.5;

  simContainerCostMajor = 50;
  simContainerQty = 20;
  simContainerUnit: UnitOfMeasure = 'liter';
  simServingQty = 200;
  simServingUnit: UnitOfMeasure = 'milliliter';

  preview = signal<PricingSuggestResponse | null>(null);
  loading = signal(false);
  errorMsg = signal('');

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    if (this.productId() == null) {
      this.uiMode = 'simulate';
    } else {
      this.uiMode = 'recipe';
    }
    this.applyCategoryDefaults();
    this.scheduleRefresh();
  }

  ngOnDestroy(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  unitLabel(unit: UnitOfMeasure): string {
    return `INVENTORY.UNITS.${unit.toUpperCase()}`;
  }

  targetValueLabelI18n(): string {
    if (this.targetKind === 'margin') return 'PRICING.TARGET_MARGIN';
    if (this.targetKind === 'markup') return 'PRICING.TARGET_MARKUP';
    return 'PRICING.TARGET_POUR_COST';
  }

  modeHintI18n(): string {
    return this.uiMode === 'simulate' ? 'PRICING.MODE_SIMULATE_HINT' : 'PRICING.MODE_RECIPE_HINT';
  }

  targetStrategyHintI18n(): string {
    if (this.targetKind === 'margin') return 'PRICING.TARGET_MARGIN_HINT';
    if (this.targetKind === 'markup') return 'PRICING.TARGET_MARKUP_HINT';
    return 'PRICING.TARGET_POUR_COST_HINT';
  }

  onOverlay(ev: MouseEvent): void {
    if ((ev.target as HTMLElement).classList.contains('pricing-helper-overlay')) {
      this.closed.emit();
    }
  }

  setUiMode(mode: 'recipe' | 'simulate'): void {
    this.uiMode = mode;
    this.scheduleRefresh();
  }

  setTargetKind(k: 'pour' | 'margin' | 'markup'): void {
    this.targetKind = k;
    if (k === 'pour') {
      this.targetValue = this.defaultPourPct();
    } else if (k === 'margin') {
      this.targetValue = 35;
    } else {
      this.targetValue = 50;
    }
    this.scheduleRefresh();
  }

  scheduleRefresh(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.runRefresh(), 380);
  }

  private defaultPourPct(): number {
    const c = this.productCategory();
    return c === 'Beverages' ? 25 : 30;
  }

  private applyCategoryDefaults(): void {
    this.targetKind = 'pour';
    this.targetValue = this.defaultPourPct();
  }

  private totalExtraFixedCents(): number {
    const garnish =
      Math.round((this.garnishIceMajor || 0) * 100) +
      Math.round((this.garnishLemonMajor || 0) * 100) +
      Math.round((this.garnishOtherMajor || 0) * 100);
    const advanced = Math.round((this.extraFixedMajor || 0) * 100);
    return garnish + advanced;
  }

  private buildQueryBase(): PricingSuggestQuery {
    const step = Math.max(1, Math.round(this.roundingMajor * 100));
    const q: PricingSuggestQuery = {
      extraFixedCents: this.totalExtraFixedCents(),
      wastePct: this.wastePct || 0,
      roundingStepCents: step,
    };
    if (this.targetKind === 'pour') q.targetPourCostPct = this.targetValue;
    else if (this.targetKind === 'margin') q.targetMarginPct = this.targetValue;
    else q.targetMarkupPct = this.targetValue;
    return q;
  }

  private runRefresh(): void {
    this.errorMsg.set('');
    this.preview.set(null);

    if (this.uiMode === 'recipe' && this.productId() != null) {
      this.loading.set(true);
      this.pricingApi.suggestProduct(this.productId()!, this.buildQueryBase()).subscribe({
        next: (r) => {
          this.preview.set(r);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          const d = err?.error?.detail;
          this.errorMsg.set(typeof d === 'string' ? d : this.translate.instant('PRICING.NO_COST_BASIS'));
        },
      });
      return;
    }

    const costCents = Math.round((this.simContainerCostMajor || 0) * 100);
    if (costCents <= 0 || !this.simContainerQty || !this.simServingQty) {
      this.errorMsg.set(this.translate.instant('PRICING.SIMULATE_INVALID'));
      return;
    }

    const body: PricingSimulateRequest = {
      container_cost_cents: costCents,
      container_quantity: String(this.simContainerQty),
      container_unit: this.simContainerUnit,
      serving_quantity: String(this.simServingQty),
      serving_unit: this.simServingUnit,
      extra_fixed_cents: this.totalExtraFixedCents(),
      waste_pct: this.wastePct || 0,
      rounding_step_cents: Math.max(1, Math.round(this.roundingMajor * 100)),
    };
    if (this.targetKind === 'pour') body.target_pour_cost_pct = this.targetValue;
    else if (this.targetKind === 'margin') body.target_margin_pct = this.targetValue;
    else body.target_markup_pct = this.targetValue;

    this.loading.set(true);
    this.pricingApi.simulate(body).subscribe({
      next: (r) => {
        this.preview.set(r);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        const d = err?.error?.detail;
        this.errorMsg.set(typeof d === 'string' ? d : this.translate.instant('COMMON.ERROR'));
      },
    });
  }

  formatMoney(cents: number): string {
    const code = this.currencyCode();
    const locale = intlLocaleFromTranslate(this.translate);
    if (code) {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        currencyDisplay: 'symbol',
      }).format(cents / 100);
    }
    return `${this.currencySymbol()}${(cents / 100).toFixed(2)}`;
  }

  usePrice(): void {
    const p = this.preview();
    if (!p) return;
    this.applyMajor.emit(p.suggested_price_cents / 100);
    this.closed.emit();
  }
}
