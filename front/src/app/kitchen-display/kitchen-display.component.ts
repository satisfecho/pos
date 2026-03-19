import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, Order, OrderItem } from '../services/api.service';
import { AudioService } from '../services/audio.service';
import { PermissionService } from '../services/permission.service';
import { Subscription } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

const REFRESH_INTERVAL_MS = 15000;
const SOUND_STORAGE_KEY = 'kitchen-display-sound';

@Component({
  selector: 'app-kitchen-display',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslateModule],
  template: `
    <div class="kitchen-view">
      <header class="kitchen-header">
        <a routerLink="/staff/orders" class="back-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
          {{ 'KITCHEN_DISPLAY.BACK_TO_ORDERS' | translate }}
        </a>
        <h1 class="kitchen-title">{{ 'KITCHEN_DISPLAY.TITLE' | translate }}</h1>
        <div class="header-actions">
          <label class="sound-toggle">
            <input type="checkbox" [checked]="soundEnabled()" (change)="toggleSound($event)" />
            <span class="sound-label">{{ soundEnabled() ? ('KITCHEN_DISPLAY.SOUND_ON' | translate) : ('KITCHEN_DISPLAY.SOUND_OFF' | translate) }}</span>
          </label>
          <span class="last-refresh" [title]="lastRefreshExact()">{{ 'KITCHEN_DISPLAY.LAST_REFRESH' | translate }}: {{ lastRefreshRelative() }}</span>
        </div>
      </header>

      <main class="kitchen-main">
        @if (loading()) {
          <div class="empty-state">
            <p>{{ 'ORDERS.LOADING' | translate }}</p>
          </div>
        } @else if (activeOrders().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
            </div>
            <h2>{{ 'KITCHEN_DISPLAY.NO_ACTIVE_ORDERS' | translate }}</h2>
            <p>{{ 'KITCHEN_DISPLAY.NO_ACTIVE_ORDERS_DESC' | translate }}</p>
          </div>
        } @else {
          <div class="order-grid">
            @for (order of activeOrders(); track order.id) {
              <article class="order-card" [class]="'status-' + order.status">
                <div class="order-header">
                  <div class="order-meta">
                    <span class="order-id">#{{ order.id }}</span>
                    <span class="order-table">{{ order.table_name }}</span>
                    @if (order.customer_name) {
                      <span class="order-customer">{{ 'ORDERS.CUSTOMER' | translate }}: {{ order.customer_name }}</span>
                    }
                    <span class="order-time" [title]="formatExactTime(order.created_at)">{{ formatOrderTime(order.created_at) }}</span>
                  </div>
                  <span class="status-badge" [class]="order.status">{{ getStatusLabel(order.status) }}</span>
                </div>
                <ul class="order-items">
                  @for (item of getSortedItems(order.items); track item.id) {
                    @if (!item.removed_by_customer) {
                      <li class="order-item">
                        <span class="item-qty">{{ item.quantity }}×</span>
                        <span class="item-name">{{ item.product_name }}</span>
                        @if (item.customization_answers && Object.keys(item.customization_answers).length > 0) {
                          <span class="item-customization">{{ formatCustomization(item.customization_answers) }}</span>
                        }
                        @if (item.notes) {
                          <span class="item-notes">{{ item.notes }}</span>
                        }
                        @if (canUpdateItemStatus() && item.id != null && item.status !== 'delivered' && item.status !== 'cancelled') {
                          <div class="item-status-control">
                            <button
                              type="button"
                              class="item-status-badge clickable"
                              [class]="'status-' + (item.status || 'pending')"
                              (click)="toggleItemStatusDropdown(order.id, item.id!)"
                              [title]="'ORDERS.CLICK_TO_CHANGE_STATUS' | translate">
                              {{ getItemStatusLabel(item.status || 'pending') }}
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6,9 12,15 18,9"/>
                              </svg>
                            </button>
                            @if (itemStatusDropdownOpen() === order.id + '-' + item.id) {
                              <div class="status-dropdown item-status-dropdown" data-testid="kitchen-item-status-dropdown" (click)="$event.stopPropagation()">
                                @if (getItemStatusTransitions(item.status || 'pending').backward.length > 0) {
                                  <div class="dropdown-section">
                                    <div class="dropdown-label">{{ 'ORDERS.GO_BACK' | translate }}</div>
                                    @for (status of getItemStatusTransitions(item.status || 'pending').backward; track status) {
                                      <button type="button" class="dropdown-item backward" (click)="updateItemStatus(order.id, item.id!, status); itemStatusDropdownOpen.set(null)">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15,18 9,12 15,6"/></svg>
                                        {{ getItemStatusLabel(status) }}
                                      </button>
                                    }
                                  </div>
                                }
                                @if (getItemStatusTransitions(item.status || 'pending').forward.length > 0) {
                                  <div class="dropdown-section">
                                    <div class="dropdown-label">{{ 'ORDERS.MOVE_FORWARD' | translate }}</div>
                                    @for (status of getItemStatusTransitions(item.status || 'pending').forward; track status) {
                                      <button type="button" class="dropdown-item forward" (click)="updateItemStatus(order.id, item.id!, status); itemStatusDropdownOpen.set(null)">
                                        {{ getItemStatusLabel(status) }}
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>
                                      </button>
                                    }
                                  </div>
                                }
                              </div>
                            }
                          </div>
                        } @else {
                          <span class="item-status" [class]="'status-' + (item.status || 'pending')">{{ getItemStatusLabel(item.status || 'pending') }}</span>
                        }
                      </li>
                    }
                  }
                </ul>
                @if (order.notes) {
                  <div class="order-notes">{{ 'KITCHEN_DISPLAY.NOTES' | translate }}: {{ order.notes }}</div>
                }
              </article>
            }
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    .kitchen-view {
      min-height: 100vh;
      background: var(--color-bg);
      display: flex;
      flex-direction: column;
    }
    .kitchen-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--space-4);
      padding: var(--space-4) var(--space-6);
      background: var(--color-surface);
      border-bottom: 2px solid var(--color-border);
      box-shadow: var(--shadow-sm);
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      color: var(--color-primary);
      font-weight: 500;
      text-decoration: none;
      font-size: 1rem;
    }
    .back-link:hover { text-decoration: underline; }
    .kitchen-title {
      font-size: clamp(1.5rem, 4vw, 2.25rem);
      font-weight: 700;
      color: var(--color-text);
      margin: 0;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: var(--space-5);
    }
    .sound-toggle {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      cursor: pointer;
      font-size: 1rem;
      font-weight: 500;
      color: var(--color-text);
    }
    .sound-toggle input { cursor: pointer; width: 18px; height: 18px; }
    .last-refresh {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }
    .kitchen-main {
      flex: 1;
      padding: var(--space-5) var(--space-6);
      overflow: auto;
    }
    .empty-state {
      text-align: center;
      padding: var(--space-8);
      background: var(--color-surface);
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-lg);
    }
    .empty-state .empty-icon { color: var(--color-text-muted); margin-bottom: var(--space-4); }
    .empty-state h2 { margin: 0 0 var(--space-2); font-size: 1.5rem; color: var(--color-text); }
    .empty-state p { margin: 0; color: var(--color-text-muted); }
    .order-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: var(--space-5);
      align-items: start;
    }
    .order-card {
      background: var(--color-surface);
      border: 2px solid var(--color-border);
      border-left: 6px solid var(--color-warning);
      border-radius: var(--radius-lg);
      overflow: visible;
      box-shadow: var(--shadow-md);
    }
    .order-card.status-preparing { border-left-color: #3B82F6; }
    .order-card.status-ready { border-left-color: var(--color-success); }
    .order-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: var(--space-4) var(--space-5);
      border-bottom: 2px solid var(--color-border);
      background: var(--color-bg);
    }
    .order-meta {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }
    .order-id {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text);
    }
    .order-table {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-primary);
    }
    .order-customer { font-size: 1rem; color: var(--color-text-muted); }
    .order-time { font-size: 1rem; color: var(--color-text-muted); }
    .status-badge {
      padding: var(--space-2) var(--space-4);
      border-radius: 20px;
      font-size: 0.9375rem;
      font-weight: 700;
    }
    .status-badge.pending { background: rgba(245, 158, 11, 0.2); color: var(--color-warning); }
    .status-badge.preparing { background: rgba(59, 130, 246, 0.2); color: #3B82F6; }
    .status-badge.ready { background: var(--color-success-light); color: var(--color-success); }
    .status-badge.partially_delivered { background: var(--color-success-light); color: var(--color-success); }
    .order-items {
      list-style: none;
      margin: 0;
      padding: var(--space-4) var(--space-5);
    }
    .order-item {
      display: grid;
      grid-template-columns: auto 1fr auto auto;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) 0;
      font-size: 1.125rem;
      line-height: 1.4;
      border-bottom: 1px solid var(--color-border);
    }
    .order-item:last-child { border-bottom: none; }
    .item-qty {
      font-weight: 700;
      color: var(--color-primary);
      font-size: 1.25rem;
    }
    .item-name { font-weight: 600; color: var(--color-text); }
    .item-notes {
      grid-column: 2 / 4;
      font-size: 0.9375rem;
      color: var(--color-text-muted);
      font-style: italic;
    }
    .item-customization {
      grid-column: 2 / 4;
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }
    .item-status {
      font-size: 0.8125rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 10px;
    }
    .item-status.status-pending { background: rgba(245, 158, 11, 0.15); color: var(--color-warning); }
    .item-status.status-preparing { background: rgba(59, 130, 246, 0.15); color: #3B82F6; }
    .item-status.status-ready { background: var(--color-success-light); color: var(--color-success); }
    .item-status.status-delivered { background: var(--color-bg); color: var(--color-text-muted); }
    .item-status-control {
      position: relative;
      display: inline-flex;
      z-index: 10;
    }
    .order-item:hover .item-status-control {
      z-index: 50;
    }
    .item-status-badge.clickable {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-height: 44px;
      padding: var(--space-2) var(--space-3);
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 14px;
      border: 1px solid var(--color-border);
      cursor: pointer;
      background: inherit;
      transition: all 0.15s;
    }
    .item-status-badge.clickable:hover {
      filter: brightness(0.95);
      transform: scale(1.05);
    }
    .item-status-badge.status-pending.clickable { background: rgba(245, 158, 11, 0.15); color: var(--color-warning); }
    .item-status-badge.status-preparing.clickable { background: rgba(59, 130, 246, 0.15); color: #3B82F6; }
    .item-status-badge.status-ready.clickable { background: var(--color-success-light); color: var(--color-success); }
    .status-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      left: auto;
      margin-top: 6px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 100;
      min-width: 160px;
      overflow: hidden;
    }
    .dropdown-section {
      padding: 8px 0;
    }
    .dropdown-section:not(:last-child) {
      border-bottom: 1px solid var(--color-border);
    }
    .dropdown-label {
      padding: 6px 12px;
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .dropdown-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      width: 100%;
      min-height: 48px;
      padding: var(--space-3) var(--space-4);
      background: none;
      border: none;
      text-align: left;
      font-size: 1rem;
      font-weight: 500;
      color: var(--color-text);
      cursor: pointer;
      transition: background 0.15s;
    }
    .dropdown-item:hover {
      background: var(--color-bg);
    }
    .dropdown-item.forward {
      color: var(--color-primary);
    }
    .dropdown-item.backward {
      color: var(--color-text-muted);
    }
    .dropdown-item svg {
      flex-shrink: 0;
    }
    .order-notes {
      padding: var(--space-3) var(--space-5);
      background: rgba(245, 158, 11, 0.08);
      font-size: 1rem;
      color: var(--color-text);
      border-top: 1px solid var(--color-border);
    }
  `],
})
export class KitchenDisplayComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private audio = inject(AudioService);
  private translate = inject(TranslateService);
  private permissions = inject(PermissionService);

  private refreshIntervalId: ReturnType<typeof setInterval> | null = null;
  private wsSub: Subscription | null = null;

  orders = signal<Order[]>([]);
  loading = signal(true);
  lastRefreshAt = signal<Date | null>(null);
  soundEnabled = signal(true);
  itemStatusDropdownOpen = signal<string | null>(null);

  canUpdateItemStatus = computed(() =>
    this.permissions.hasPermission(this.permissions.getCurrentUser(), 'order:item_status')
  );

  /** Orders that are active and have at least one item still pending or preparing (kitchen work to do). */
  activeOrders = computed(() =>
    this.orders().filter((o) => {
      if (!['pending', 'preparing', 'ready', 'partially_delivered'].includes(o.status)) return false;
      const hasPendingOrPreparing = (o.items ?? []).some(
        (i) => !i.removed_by_customer && (i.status === 'pending' || i.status === 'preparing')
      );
      return hasPendingOrPreparing;
    })
  );

  lastRefreshRelative = computed(() => {
    const at = this.lastRefreshAt();
    if (!at) return '—';
    const sec = Math.floor((Date.now() - at.getTime()) / 1000);
    if (sec < 10) return '< 10s';
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    return `${min}m`;
  });

  lastRefreshExact = computed(() => {
    const at = this.lastRefreshAt();
    return at ? at.toLocaleTimeString() : '';
  });

  ngOnInit(): void {
    const stored = localStorage.getItem(SOUND_STORAGE_KEY);
    this.soundEnabled.set(stored !== 'false');
    this.audio.setEnabled(this.soundEnabled());

    this.loadOrders();
    this.refreshIntervalId = setInterval(() => this.loadOrders(), REFRESH_INTERVAL_MS);

    try {
      this.api.connectWebSocket();
      this.wsSub = this.api.orderUpdates$.subscribe((update: unknown) => {
        if (update && typeof update === 'object' && 'type' in update) {
          const type = (update as { type: string }).type;
          if (this.soundEnabled() && ['new_order', 'items_added'].includes(type)) {
            this.audio.playRestaurantOrderChange();
          }
          this.loadOrders();
        }
      });
    } catch {
      // continue without WebSocket
    }

    document.addEventListener('click', this.closeItemStatusDropdown);
  }

  ngOnDestroy(): void {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
    this.wsSub?.unsubscribe();
    document.removeEventListener('click', this.closeItemStatusDropdown);
  }

  private closeItemStatusDropdown = (e: Event): void => {
    const target = e.target as HTMLElement;
    if (!target.closest('.item-status-control')) {
      this.itemStatusDropdownOpen.set(null);
    }
  };

  loadOrders(): void {
    this.loading.set(true);
    this.api.getOrders(false).subscribe({
      next: (list) => {
        this.orders.set(list);
        this.lastRefreshAt.set(new Date());
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleSound(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.soundEnabled.set(checked);
    this.audio.setEnabled(checked);
    localStorage.setItem(SOUND_STORAGE_KEY, String(checked));
  }

  getStatusLabel(status: string): string {
    return this.translate.instant('ORDER_STATUS.' + status) || status;
  }

  getItemStatusLabel(status: string): string {
    return this.translate.instant('ITEM_STATUS.' + status) || status;
  }

  /** Format customization answers for display (e.g. "Medium · 7"). */
  formatCustomization(answers: Record<string, string | number>): string {
    if (!answers || Object.keys(answers).length === 0) return '';
    return Object.values(answers).join(' · ');
  }

  /** Items sorted by status; for kitchen we only show pending and preparing. */
  getSortedItems(items: OrderItem[]): OrderItem[] {
    const order: Record<string, number> = {
      pending: 0,
      preparing: 1,
      ready: 2,
      delivered: 3,
      cancelled: 4,
    };
    const pendingOrPreparing = [...items].filter(
      (i) => !i.removed_by_customer && (i.status === 'pending' || i.status === 'preparing')
    );
    return pendingOrPreparing.sort((a, b) => {
      const aOrder = order[a.status || 'pending'] ?? 5;
      const bOrder = order[b.status || 'pending'] ?? 5;
      return aOrder - bOrder;
    });
  }

  formatOrderTime(dateString: string): string {
    if (!dateString) return '—';
    const dateStr =
      dateString.endsWith('Z') || dateString.includes('+') || dateString.includes('-', 10)
        ? dateString
        : dateString + 'Z';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 60_000) return '< 1m ago';
    if (diffMs < 3600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
    if (diffMs < 86400_000) return `${Math.floor(diffMs / 3600_000)}h ago`;
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  formatExactTime(dateString: string): string {
    if (!dateString) return '';
    const dateStr =
      dateString.endsWith('Z') || dateString.includes('+') || dateString.includes('-', 10)
        ? dateString
        : dateString + 'Z';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? dateString : date.toLocaleString();
  }

  getItemStatusTransitions(currentStatus: string): { forward: string[]; backward: string[] } {
    const transitions: Record<string, { forward: string[]; backward: string[] }> = {
      pending: { forward: ['preparing'], backward: [] },
      preparing: { forward: ['ready'], backward: ['pending'] },
      ready: { forward: ['delivered'], backward: ['preparing'] },
      delivered: { forward: [], backward: ['ready'] },
      cancelled: { forward: [], backward: [] },
    };
    const key = (currentStatus ?? '').toString().toLowerCase();
    return transitions[key] ?? { forward: [], backward: [] };
  }

  toggleItemStatusDropdown(orderId: number, itemId: number): void {
    const key = `${orderId}-${itemId}`;
    this.itemStatusDropdownOpen.update((current) => (current === key ? null : key));
  }

  updateItemStatus(orderId: number, itemId: number, status: string): void {
    this.itemStatusDropdownOpen.set(null);
    this.api.updateOrderItemStatus(orderId, itemId, status).subscribe({
      next: () => this.loadOrders(),
      error: () => this.loadOrders(),
    });
  }
}
