import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService, CourierInfo, CourierOrderSummary } from '../services/api.service';

type CourierTab = 'available' | 'mine' | 'completed';

const OPEN_STATUSES = new Set([
  'pending',
  'preparing',
  'ready',
  'out_for_delivery',
  'partially_delivered',
]);
const COMPLETED_STATUSES = new Set(['paid', 'completed', 'cancelled']);

@Component({
  selector: 'app-courier-home',
  standalone: true,
  imports: [TranslateModule, RouterLink],
  template: `
    <div class="courier-page">
      <header class="courier-header">
        <div>
          <h1>{{ 'COURIER_HOME.TITLE' | translate }}</h1>
          @if (profile()?.tenant_name) {
            <p class="courier-subtitle">{{ profile()!.tenant_name }}</p>
          }
        </div>
        <div class="courier-header-actions">
          <button
            type="button"
            class="btn-refresh"
            (click)="refresh()"
            [disabled]="ordersLoading()"
          >
            {{ 'COURIER_HOME.REFRESH' | translate }}
          </button>
          <button type="button" class="btn-logout" (click)="logout()">
            {{ 'COURIER_HOME.LOGOUT' | translate }}
          </button>
        </div>
      </header>

      @if (profileLoading()) {
        <p class="courier-muted">{{ 'COMMON.LOADING' | translate }}</p>
      } @else if (profileError()) {
        <p class="courier-error">{{ profileError() | translate }}</p>
      } @else {
        <nav class="courier-tabs" aria-label="Order filters">
          <button
            type="button"
            class="courier-tab"
            [class.active]="activeTab() === 'available'"
            (click)="setTab('available')"
          >
            {{ 'COURIER_ORDERS.TAB_AVAILABLE' | translate }}
          </button>
          <button
            type="button"
            class="courier-tab"
            [class.active]="activeTab() === 'mine'"
            (click)="setTab('mine')"
          >
            {{ 'COURIER_ORDERS.TAB_MINE' | translate }}
          </button>
          <button
            type="button"
            class="courier-tab"
            [class.active]="activeTab() === 'completed'"
            (click)="setTab('completed')"
          >
            {{ 'COURIER_ORDERS.TAB_COMPLETED' | translate }}
          </button>
        </nav>

        @if (ordersLoading()) {
          <p class="courier-muted">{{ 'COMMON.LOADING' | translate }}</p>
        } @else if (ordersError()) {
          <p class="courier-error">{{ ordersError() | translate }}</p>
        } @else if (filteredOrders().length === 0) {
          <p class="courier-empty">{{ emptyMessageKey() | translate }}</p>
        } @else {
          <ul class="courier-order-list">
            @for (order of filteredOrders(); track order.id) {
              <li>
                <a class="courier-order-card" [routerLink]="['/courier/orders', order.id]">
                  <div class="courier-order-top">
                    <span class="courier-order-id">#{{ order.id }}</span>
                    <span class="courier-status" [attr.data-status]="order.status">
                      {{ statusLabelKey(order.status) | translate }}
                    </span>
                  </div>
                  @if (order.customer_name) {
                    <p class="courier-customer">{{ order.customer_name }}</p>
                  }
                  @if (order.customer_phone) {
                    <p class="courier-phone">{{ order.customer_phone }}</p>
                  }
                  @if (order.delivery_address) {
                    <p class="courier-address">{{ order.delivery_address }}</p>
                  }
                  <p class="courier-items">{{ order.item_summary }}</p>
                  <div class="courier-order-bottom">
                    <p class="courier-time">{{ formatCreatedAt(order.created_at) }}</p>
                    @if (order.total_cents != null) {
                      <p class="courier-total">{{ formatMoney(order.total_cents) }}</p>
                    }
                  </div>
                </a>
              </li>
            }
          </ul>
        }
      }
    </div>
  `,
  styles: [`
    .courier-page {
      min-height: 100vh;
      padding: var(--space-4) var(--space-4) var(--space-8);
      background: var(--color-bg);
      color: var(--color-text);
      max-width: 560px;
      margin: 0 auto;
    }
    .courier-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
      margin-bottom: var(--space-4);
    }
    .courier-header h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
    }
    .courier-subtitle {
      margin: var(--space-1) 0 0;
      color: var(--color-text-muted);
      font-size: 0.9rem;
    }
    .courier-header-actions {
      display: flex;
      gap: var(--space-2);
      flex-shrink: 0;
    }
    .btn-logout,
    .btn-refresh {
      padding: var(--space-2) var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;
    }
    .btn-logout:hover,
    .btn-refresh:hover:not(:disabled) {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
    .btn-refresh:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .courier-tabs {
      display: flex;
      gap: var(--space-2);
      margin-bottom: var(--space-4);
      overflow-x: auto;
    }
    .courier-tab {
      flex: 1;
      min-width: 0;
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text-muted);
      cursor: pointer;
      font-size: 0.875rem;
    }
    .courier-tab.active {
      border-color: var(--color-primary);
      color: var(--color-primary);
      font-weight: 600;
    }
    .courier-order-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }
    .courier-order-card {
      display: block;
      padding: var(--space-4);
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--color-border);
      text-decoration: none;
      color: inherit;
    }
    .courier-order-card:active { border-color: var(--color-primary); }
    .courier-order-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      margin-bottom: var(--space-2);
    }
    .courier-order-id { font-weight: 600; }
    .courier-status {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-sm);
      background: var(--color-bg);
      color: var(--color-text-muted);
    }
    .courier-status[data-status='ready'],
    .courier-status[data-status='preparing'],
    .courier-status[data-status='out_for_delivery'] {
      color: var(--color-primary);
    }
    .courier-customer { font-weight: 500; margin: 0 0 var(--space-1); }
    .courier-phone,
    .courier-address {
      margin: 0 0 var(--space-1);
      font-size: 0.9rem;
    }
    .courier-address { color: var(--color-text); }
    .courier-phone { color: var(--color-text-muted); }
    .courier-items {
      margin: 0 0 var(--space-2);
      color: var(--color-text-muted);
      font-size: 0.9rem;
      line-height: 1.4;
    }
    .courier-order-bottom {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--space-2);
    }
    .courier-time {
      margin: 0;
      font-size: 0.8rem;
      color: var(--color-text-muted);
    }
    .courier-total {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 600;
    }
    .courier-muted, .courier-empty { color: var(--color-text-muted); }
    .courier-error { color: var(--color-error); }
  `]
})
export class CourierHomeComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  profileLoading = signal(true);
  profileError = signal('');
  profile = signal<CourierInfo | null>(null);

  ordersLoading = signal(true);
  ordersError = signal('');
  orders = signal<CourierOrderSummary[]>([]);
  activeTab = signal<CourierTab>('available');

  filteredOrders = computed(() => {
    const tab = this.activeTab();
    const all = this.orders();
    const myId = this.profile()?.id ?? null;
    if (tab === 'available') {
      return all.filter(
        (o) => OPEN_STATUSES.has(o.status) && (o.courier_user_id == null)
      );
    }
    if (tab === 'completed') {
      return all.filter(
        (o) =>
          COMPLETED_STATUSES.has(o.status) &&
          (o.courier_user_id == null || o.courier_user_id === myId)
      );
    }
    // Mine: open orders assigned to this courier
    if (myId == null) {
      return [];
    }
    return all.filter(
      (o) => OPEN_STATUSES.has(o.status) && o.courier_user_id === myId
    );
  });

  emptyMessageKey = computed(() => {
    if (this.activeTab() === 'mine') {
      return 'COURIER_ORDERS.EMPTY_MINE';
    }
    if (this.activeTab() === 'completed') {
      return 'COURIER_ORDERS.EMPTY_COMPLETED';
    }
    return 'COURIER_ORDERS.EMPTY_AVAILABLE';
  });

  ngOnInit(): void {
    this.api.getCourierMe().subscribe({
      next: (info) => {
        this.profile.set(info);
        this.profileLoading.set(false);
        this.loadOrders();
      },
      error: () => {
        this.profileLoading.set(false);
        this.profileError.set('COURIER_HOME.LOAD_FAILED');
      }
    });
  }

  setTab(tab: CourierTab): void {
    this.activeTab.set(tab);
  }

  refresh(): void {
    if (this.profileLoading() || this.profileError()) {
      return;
    }
    this.loadOrders();
  }

  statusLabelKey(status: string): string {
    return `COURIER_ORDERS.STATUS_${status.toUpperCase()}`;
  }

  formatCreatedAt(iso: string): string {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  formatMoney(cents: number): string {
    return (cents / 100).toLocaleString(undefined, {
      style: 'currency',
      currency: 'EUR',
    });
  }

  logout(): void {
    this.api.logout().subscribe(() => {
      void this.router.navigate(['/courier/login']);
    });
  }

  private loadOrders(): void {
    this.ordersLoading.set(true);
    this.ordersError.set('');
    this.api.getCourierOrders().subscribe({
      next: (rows) => {
        this.orders.set(rows);
        this.ordersLoading.set(false);
      },
      error: () => {
        this.ordersLoading.set(false);
        this.ordersError.set('COURIER_ORDERS.LOAD_FAILED');
      }
    });
  }
}
