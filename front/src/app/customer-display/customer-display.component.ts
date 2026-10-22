import {
  Component,
  OnDestroy,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService, MenuResponse } from '../services/api.service';
import { environment } from '../../environments/environment';
import {
  pickContrastingForeground,
  resolvePublicPrimaryColor,
} from '../shared/public-brand-colors';

const REFRESH_MS = 8000;

export interface DisplayOrderItem {
  id: number;
  product_name: string;
  quantity: number;
  price_cents: number;
  notes?: string | null;
  line_modifiers_summary?: string | null;
}

export interface DisplayPaymentOptions {
  cash: boolean;
  card_terminal: boolean;
  stripe: boolean;
  revolut: boolean;
}

export interface DisplayOrder {
  id: number;
  status: string;
  items: DisplayOrderItem[];
  subtotal_cents: number;
  loyalty_discount_cents?: number;
  tip_amount_cents?: number | null;
  total_cents: number;
  invoice_email?: string | null;
  paid_at?: string | null;
  payment_method?: string | null;
  payment_options?: DisplayPaymentOptions;
  customer_name?: string | null;
}

@Component({
  selector: 'app-customer-display',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslateModule],
  template: `
    <div
      class="cd-root"
      [style.--cd-bg]="bgColor()"
      [style.--cd-fg]="fgColor()"
      [style.--cd-primary]="primaryColor()"
      [style.--cd-on-primary]="onPrimaryColor()"
      data-testid="customer-display"
    >
      <header class="cd-header">
        @if (logoUrl()) {
          <img class="cd-logo" [src]="logoUrl()!" [alt]="tenantName()" />
        }
        <div class="cd-brand">
          <h1 class="cd-title">{{ tenantName() || ('CUSTOMER_DISPLAY.TITLE' | translate) }}</h1>
          @if (tableName()) {
            <p class="cd-table">{{ tableName() }}</p>
          }
        </div>
      </header>

      @if (loading()) {
        <p class="cd-muted" data-testid="cd-loading">{{ 'CUSTOMER_DISPLAY.LOADING' | translate }}</p>
      } @else if (error()) {
        <p class="cd-error" data-testid="cd-error">{{ 'CUSTOMER_DISPLAY.ERROR' | translate }}</p>
      } @else if (isPaid()) {
        <section class="cd-paid" data-testid="cd-paid">
          <h2>{{ 'CUSTOMER_DISPLAY.THANK_YOU' | translate }}</h2>
          <p class="cd-total-lg">{{ formatPrice(order()?.total_cents || 0) }}</p>
          @if (order()?.invoice_email) {
            <p class="cd-muted">{{ 'CUSTOMER_DISPLAY.INVOICE_SAVED' | translate }}: {{ order()!.invoice_email }}</p>
          }
        </section>
      } @else if (!order() || !order()!.items.length) {
        <section class="cd-empty" data-testid="cd-empty">
          <h2>{{ 'CUSTOMER_DISPLAY.WAITING' | translate }}</h2>
          <p class="cd-muted">{{ 'CUSTOMER_DISPLAY.WAITING_HINT' | translate }}</p>
        </section>
      } @else {
        <section class="cd-order" data-testid="cd-order">
          <h2 class="cd-section-title">{{ 'CUSTOMER_DISPLAY.YOUR_ORDER' | translate }}</h2>
          <ul class="cd-lines">
            @for (item of order()!.items; track item.id) {
              <li class="cd-line">
                <span class="cd-qty">{{ item.quantity }}×</span>
                <div class="cd-line-body">
                  <span class="cd-name">{{ item.product_name }}</span>
                  @if (item.line_modifiers_summary) {
                    <span class="cd-mod">{{ item.line_modifiers_summary }}</span>
                  }
                  @if (item.notes) {
                    <span class="cd-mod">{{ item.notes }}</span>
                  }
                </div>
                <span class="cd-line-price">{{ formatPrice(item.price_cents * item.quantity) }}</span>
              </li>
            }
          </ul>

          <div class="cd-totals">
            <div class="cd-row">
              <span>{{ 'CUSTOMER_DISPLAY.SUBTOTAL' | translate }}</span>
              <span>{{ formatPrice(order()!.subtotal_cents) }}</span>
            </div>
            @if ((order()!.loyalty_discount_cents || 0) > 0) {
              <div class="cd-row cd-discount" data-testid="cd-discount">
                <span>{{ 'CUSTOMER_DISPLAY.DISCOUNT' | translate }}</span>
                <span>−{{ formatPrice(order()!.loyalty_discount_cents || 0) }}</span>
              </div>
            }
            @if ((order()!.tip_amount_cents || 0) > 0) {
              <div class="cd-row">
                <span>{{ 'CUSTOMER_DISPLAY.TIP' | translate }}</span>
                <span>{{ formatPrice(order()!.tip_amount_cents || 0) }}</span>
              </div>
            }
            <div class="cd-row cd-total" data-testid="cd-total">
              <span>{{ 'CUSTOMER_DISPLAY.TOTAL' | translate }}</span>
              <span>{{ formatPrice(order()!.total_cents) }}</span>
            </div>
          </div>

          <div class="cd-pay" data-testid="cd-payment-options">
            <h3 class="cd-section-title">{{ 'CUSTOMER_DISPLAY.PAYMENT_OPTIONS' | translate }}</h3>
            <ul class="cd-pay-list">
              @if (payOpts().cash) {
                <li>{{ 'CUSTOMER_DISPLAY.PAY_CASH' | translate }}</li>
              }
              @if (payOpts().card_terminal) {
                <li>{{ 'CUSTOMER_DISPLAY.PAY_CARD' | translate }}</li>
              }
              @if (payOpts().stripe || payOpts().revolut) {
                <li>{{ 'CUSTOMER_DISPLAY.PAY_ONLINE' | translate }}</li>
              }
            </ul>
            <p class="cd-muted cd-pay-hint">{{ 'CUSTOMER_DISPLAY.PAYMENT_STAFF_HINT' | translate }}</p>
          </div>

          <div class="cd-email" data-testid="cd-email">
            <h3 class="cd-section-title">{{ 'CUSTOMER_DISPLAY.INVOICE_EMAIL' | translate }}</h3>
            <p class="cd-muted">{{ 'CUSTOMER_DISPLAY.INVOICE_EMAIL_HINT' | translate }}</p>
            @if (order()!.invoice_email && !editingEmail()) {
              <p class="cd-saved-email" data-testid="cd-email-saved">
                {{ order()!.invoice_email }}
                <button type="button" class="cd-link" (click)="editingEmail.set(true)">
                  {{ 'COMMON.EDIT' | translate }}
                </button>
              </p>
            } @else {
              <form class="cd-email-form" (ngSubmit)="submitEmail()">
                <input
                  type="email"
                  name="invoiceEmail"
                  class="cd-input"
                  data-testid="cd-email-input"
                  [(ngModel)]="emailDraft"
                  [placeholder]="'CUSTOMER_DISPLAY.EMAIL_PLACEHOLDER' | translate"
                  autocomplete="email"
                  required
                />
                <button
                  type="submit"
                  class="cd-btn"
                  data-testid="cd-email-submit"
                  [disabled]="emailSaving()"
                >
                  {{ emailSaving() ? ('COMMON.SAVING' | translate) : ('CUSTOMER_DISPLAY.SAVE_EMAIL' | translate) }}
                </button>
              </form>
              @if (emailError()) {
                <p class="cd-error">{{ emailError() }}</p>
              }
              @if (emailOk()) {
                <p class="cd-ok" data-testid="cd-email-ok">{{ 'CUSTOMER_DISPLAY.EMAIL_SAVED' | translate }}</p>
              }
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .cd-root {
      min-height: 100vh;
      box-sizing: border-box;
      padding: 1.5rem clamp(1rem, 4vw, 2.5rem) 2.5rem;
      background: var(--cd-bg, #f5f5f4);
      color: var(--cd-fg, #1c1917);
      font-family: 'Segoe UI', system-ui, sans-serif;
    }
    .cd-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.75rem;
    }
    .cd-logo {
      width: 64px;
      height: 64px;
      object-fit: contain;
      border-radius: 8px;
    }
    .cd-title {
      margin: 0;
      font-size: clamp(1.5rem, 4vw, 2.25rem);
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .cd-table {
      margin: 0.25rem 0 0;
      opacity: 0.75;
      font-size: 1rem;
    }
    .cd-section-title {
      margin: 0 0 0.75rem;
      font-size: 1.1rem;
      font-weight: 600;
    }
    .cd-lines {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .cd-line {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.75rem;
      align-items: start;
      font-size: clamp(1.05rem, 2.5vw, 1.35rem);
    }
    .cd-qty {
      font-weight: 700;
      opacity: 0.8;
    }
    .cd-line-body {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .cd-mod {
      font-size: 0.9rem;
      opacity: 0.7;
    }
    .cd-line-price {
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }
    .cd-totals {
      margin-top: 1.25rem;
      padding-top: 1rem;
      border-top: 2px solid color-mix(in srgb, var(--cd-fg) 18%, transparent);
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .cd-row {
      display: flex;
      justify-content: space-between;
      font-size: 1.05rem;
    }
    .cd-discount {
      color: color-mix(in srgb, var(--cd-primary) 80%, var(--cd-fg));
    }
    .cd-total {
      font-size: clamp(1.4rem, 3.5vw, 1.9rem);
      font-weight: 800;
      margin-top: 0.35rem;
    }
    .cd-pay,
    .cd-email {
      margin-top: 1.75rem;
    }
    .cd-pay-list {
      margin: 0;
      padding-left: 1.25rem;
      font-size: 1.15rem;
      line-height: 1.6;
    }
    .cd-pay-hint,
    .cd-muted {
      opacity: 0.72;
      font-size: 0.95rem;
    }
    .cd-email-form {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .cd-input {
      flex: 1 1 12rem;
      min-height: 2.75rem;
      padding: 0.5rem 0.75rem;
      border: 2px solid color-mix(in srgb, var(--cd-fg) 25%, transparent);
      border-radius: 8px;
      font-size: 1.05rem;
      background: color-mix(in srgb, var(--cd-bg) 92%, #fff);
      color: var(--cd-fg);
    }
    .cd-btn {
      min-height: 2.75rem;
      padding: 0.5rem 1.1rem;
      border: none;
      border-radius: 8px;
      background: var(--cd-primary);
      color: var(--cd-on-primary);
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
    }
    .cd-btn:disabled {
      opacity: 0.6;
      cursor: wait;
    }
    .cd-link {
      margin-left: 0.5rem;
      background: none;
      border: none;
      color: var(--cd-primary);
      text-decoration: underline;
      cursor: pointer;
      font-size: inherit;
    }
    .cd-empty,
    .cd-paid {
      text-align: center;
      padding: 3rem 1rem;
    }
    .cd-total-lg {
      font-size: clamp(2rem, 6vw, 3rem);
      font-weight: 800;
      margin: 0.5rem 0;
    }
    .cd-error {
      color: #b91c1c;
      margin-top: 0.5rem;
    }
    .cd-ok {
      color: #15803d;
      margin-top: 0.5rem;
    }
  `,
})
export class CustomerDisplayComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly order = signal<DisplayOrder | null>(null);
  readonly menu = signal<MenuResponse | null>(null);
  readonly editingEmail = signal(false);
  readonly emailSaving = signal(false);
  readonly emailError = signal<string | null>(null);
  readonly emailOk = signal(false);

  emailDraft = '';
  private tableToken = '';
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private ws: WebSocket | null = null;
  private currencyCode = 'EUR';

  readonly tenantName = computed(() => this.menu()?.tenant_name || '');
  readonly tableName = computed(() => this.menu()?.table_name || '');
  readonly logoUrl = computed(() => {
    const m = this.menu();
    if (!m?.tenant_logo || !m.tenant_id) return null;
    return `${environment.apiUrl}/uploads/${m.tenant_id}/logo/${m.tenant_logo}`;
  });
  readonly bgColor = computed(() => this.menu()?.tenant_public_background_color || '#F5F5F4');
  readonly primaryColor = computed(() =>
    resolvePublicPrimaryColor(this.menu()?.tenant_public_primary_color ?? null),
  );
  readonly fgColor = computed(() => pickContrastingForeground(this.bgColor()));
  readonly onPrimaryColor = computed(() => pickContrastingForeground(this.primaryColor()));
  readonly isPaid = computed(() => {
    const o = this.order();
    return !!(o && (o.status === 'paid' || o.paid_at));
  });
  readonly payOpts = computed((): DisplayPaymentOptions => {
    const o = this.order()?.payment_options;
    if (o) return o;
    const m = this.menu();
    return {
      cash: true,
      card_terminal: true,
      stripe: !!m?.tenant_stripe_publishable_key,
      revolut: !!m?.tenant_revolut_configured,
    };
  });

  ngOnInit(): void {
    this.tableToken = this.route.snapshot.paramMap.get('tableToken') || '';
    if (!this.tableToken) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }
    this.loadMenu();
    this.refreshOrder();
    this.connectWebSocket();
    this.pollTimer = setInterval(() => this.refreshOrder(true), REFRESH_MS);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.ws?.close();
    this.ws = null;
  }

  formatPrice(cents: number): string {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: this.currencyCode || 'EUR',
      }).format((cents || 0) / 100);
    } catch {
      return `${((cents || 0) / 100).toFixed(2)} ${this.currencyCode}`;
    }
  }

  submitEmail(): void {
    const email = (this.emailDraft || '').trim();
    if (!email || !this.tableToken) return;
    this.emailSaving.set(true);
    this.emailError.set(null);
    this.emailOk.set(false);
    this.api.setOrderInvoiceEmail(this.tableToken, email).subscribe({
      next: (res) => {
        this.emailSaving.set(false);
        this.emailOk.set(true);
        this.editingEmail.set(false);
        this.order.update((o) => (o ? { ...o, invoice_email: res.invoice_email } : o));
      },
      error: () => {
        this.emailSaving.set(false);
        this.emailError.set(this.translate.instant('CUSTOMER_DISPLAY.EMAIL_ERROR'));
      },
    });
  }

  private loadMenu(): void {
    this.api.getMenu(this.tableToken).subscribe({
      next: (data) => {
        this.menu.set(data);
        this.currencyCode = data.tenant_currency_code || data.tenant_currency || 'EUR';
      },
      error: () => this.error.set(true),
    });
  }

  private refreshOrder(quiet = false): void {
    if (!quiet) this.loading.set(true);
    this.api.getCurrentOrder(this.tableToken, undefined, true).subscribe({
      next: (res) => {
        const o = (res?.order || null) as DisplayOrder | null;
        this.order.set(o);
        if (o?.invoice_email) {
          this.emailDraft = o.invoice_email;
        }
        this.loading.set(false);
        this.error.set(false);
      },
      error: () => {
        if (!quiet) {
          this.error.set(true);
          this.loading.set(false);
        }
      },
    });
  }

  private connectWebSocket(): void {
    if (this.ws || !this.tableToken) return;
    let wsUrl = environment.wsUrl;
    if (wsUrl.startsWith('/')) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}${wsUrl}`;
    } else if (wsUrl.startsWith('http')) {
      wsUrl = wsUrl.replace(/^http/, 'ws').replace(/^https/, 'wss');
    }
    this.ws = new WebSocket(`${wsUrl}/table/${this.tableToken}`);
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const t = data?.type;
        if (
          t === 'new_order' ||
          t === 'items_added' ||
          t === 'item_updated' ||
          t === 'item_removed' ||
          t === 'item_cancelled' ||
          t === 'status_update' ||
          t === 'order_paid' ||
          t === 'order_payment_recorded' ||
          t === 'order_cancelled' ||
          t === 'invoice_email_set'
        ) {
          this.refreshOrder(true);
        }
      } catch {
        /* ignore */
      }
    };
    this.ws.onclose = () => {
      this.ws = null;
      setTimeout(() => this.connectWebSocket(), 5000);
    };
  }
}
