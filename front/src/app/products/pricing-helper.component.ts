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
        <div class="pricing-helper-body">
          @if (productId() != null) {
            <div class="mode-tabs">
              <button
                type="button"
                class="btn"
                [class.btn-primary]="uiMode === 'recipe'"
                [class.btn-secondary]="uiMode !== 'recipe'"
                (click)="setUiMode('recipe')"
              >
                {{ 'PRICING.MODE_RECIPE' | translate }}
              </button>
              <button
                type="button"
                class="btn"
                [class.btn-primary]="uiMode === 'simulate'"
                [class.btn-secondary]="uiMode !== 'simulate'"
                (click)="setUiMode('simulate')"
              >
                {{ 'PRICING.MODE_SIMULATE' | translate }}
              </button>
            </div>
          }

          @if (uiMode === 'simulate') {
            <div class="form-grid">
              <div class="full-row">
                <label class="field-label" for="ph-container-cost">{{ 'PRICING.CONTAINER_TOTAL' | translate }}</label>
                <input
                  id="ph-container-cost"
                  type="number"
                  step="0.01"
                  min="0.01"
                  [(ngModel)]="simContainerCostMajor"
                  (ngModelChange)="scheduleRefresh()"
                />
              </div>
              <div>
                <label class="field-label" for="ph-cqty">{{ 'PRICING.CONTAINER_QTY' | translate }}</label>
                <input id="ph-cqty" type="number" step="any" min="0.0001" [(ngModel)]="simContainerQty" (ngModelChange)="scheduleRefresh()" />
              </div>
              <div>
                <label class="field-label" for="ph-cunit">{{ 'PRICING.CONTAINER_UNIT' | translate }}</label>
                <select id="ph-cunit" class="unit-select" [(ngModel)]="simContainerUnit" (ngModelChange)="scheduleRefresh()">
                  @for (u of units; track u) {
                    <option [value]="u">{{ u }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="field-label" for="ph-sqty">{{ 'PRICING.SERVING_QTY' | translate }}</label>
                <input id="ph-sqty" type="number" step="any" min="0.0001" [(ngModel)]="simServingQty" (ngModelChange)="scheduleRefresh()" />
              </div>
              <div>
                <label class="field-label" for="ph-sunit">{{ 'PRICING.SERVING_UNIT' | translate }}</label>
                <select id="ph-sunit" class="unit-select" [(ngModel)]="simServingUnit" (ngModelChange)="scheduleRefresh()">
                  @for (u of units; track u) {
                    <option [value]="u">{{ u }}</option>
                  }
                </select>
              </div>
            </div>
          }

          <div class="target-segments">
            <button
              type="button"
              class="btn btn-sm"
              [class.btn-primary]="targetKind === 'pour'"
              [class.btn-secondary]="targetKind !== 'pour'"
              (click)="setTargetKind('pour')"
            >
              {{ 'PRICING.TARGET_POUR_COST' | translate }}
            </button>
            <button
              type="button"
              class="btn btn-sm"
              [class.btn-primary]="targetKind === 'margin'"
              [class.btn-secondary]="targetKind !== 'margin'"
              (click)="setTargetKind('margin')"
            >
              {{ 'PRICING.TARGET_MARGIN' | translate }}
            </button>
            <button
              type="button"
              class="btn btn-sm"
              [class.btn-primary]="targetKind === 'markup'"
              [class.btn-secondary]="targetKind !== 'markup'"
              (click)="setTargetKind('markup')"
            >
              {{ 'PRICING.TARGET_MARKUP' | translate }}
            </button>
          </div>
          <div>
            <label class="field-label" for="ph-target-val">{{ targetValueLabelI18n() | translate }} (%)</label>
            <input id="ph-target-val" type="number" step="0.1" [(ngModel)]="targetValue" (ngModelChange)="scheduleRefresh()" />
          </div>
          <div class="form-grid">
            <div>
              <label class="field-label" for="ph-waste">{{ 'PRICING.WASTE_PCT' | translate }}</label>
              <input id="ph-waste" type="number" step="0.1" min="0" [(ngModel)]="wastePct" (ngModelChange)="scheduleRefresh()" />
            </div>
            <div>
              <label class="field-label" for="ph-extra">{{ 'PRICING.EXTRA_FIXED_COST' | translate }}</label>
              <input id="ph-extra" type="number" step="0.01" min="0" [(ngModel)]="extraFixedMajor" (ngModelChange)="scheduleRefresh()" />
            </div>
            <div class="full-row">
              <label class="field-label" for="ph-round">{{ 'PRICING.ROUNDING' | translate }}</label>
              <input id="ph-round" type="number" step="0.01" min="0.01" [(ngModel)]="roundingMajor" (ngModelChange)="scheduleRefresh()" />
            </div>
          </div>

          @if (loading()) {
            <p>{{ 'COMMON.LOADING' | translate }}</p>
          } @else if (errorMsg()) {
            <p class="error-text">{{ errorMsg() }}</p>
          } @else if (preview()) {
            <div class="preview-panel">
              <div class="preview-row">
                <span>{{ 'PRICING.COST_PER_SERVING' | translate }}</span>
                <span>{{ formatMoney(preview()!.cost_per_serving_cents) }}</span>
              </div>
              <div class="preview-row">
                <span>{{ 'PRICING.SUGGESTED_PRICE' | translate }}</span>
                <span>{{ formatMoney(preview()!.suggested_price_cents) }}</span>
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
          }

          <div class="actions-row">
            <button type="button" class="btn btn-secondary" (click)="closed.emit()">{{ 'COMMON.CANCEL' | translate }}</button>
            <button type="button" class="btn btn-primary" [disabled]="!preview()" (click)="usePrice()">
              {{ 'PRICING.USE_THIS_PRICE' | translate }}
            </button>
          </div>
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
  targetValue = 25;
  wastePct = 0;
  extraFixedMajor = 0;
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

  targetValueLabelI18n(): string {
    if (this.targetKind === 'margin') return 'PRICING.TARGET_MARGIN';
    if (this.targetKind === 'markup') return 'PRICING.TARGET_MARKUP';
    return 'PRICING.TARGET_POUR_COST';
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

  private buildQueryBase(): PricingSuggestQuery {
    const step = Math.max(1, Math.round(this.roundingMajor * 100));
    const q: PricingSuggestQuery = {
      extraFixedCents: Math.round((this.extraFixedMajor || 0) * 100),
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
      extra_fixed_cents: Math.round((this.extraFixedMajor || 0) * 100),
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
