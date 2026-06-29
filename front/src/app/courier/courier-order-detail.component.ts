import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService, CourierOrderDetail } from '../services/api.service';

@Component({
  selector: 'app-courier-order-detail',
  standalone: true,
  imports: [TranslateModule, RouterLink],
  template: `
    <div class="courier-page">
      <header class="courier-header">
        <a routerLink="/courier" class="btn-back">{{ 'COURIER_ORDERS.BACK' | translate }}</a>
        <span class="courier-status" [attr.data-status]="order()?.status">
          @if (order()) {
            {{ statusLabelKey(order()!.status) | translate }}
          }
        </span>
      </header>

      @if (loading()) {
        <p class="courier-muted">{{ 'COMMON.LOADING' | translate }}</p>
      } @else if (error()) {
        <p class="courier-error">{{ error() | translate }}</p>
      } @else if (order()) {
        <section class="courier-card">
          <h1 class="courier-title">{{ 'COURIER_ORDERS.ORDER_TITLE' | translate:{ id: order()!.id } }}</h1>
          @if (order()!.customer_name) {
            <p class="courier-row">
              <span class="label">{{ 'COURIER_ORDERS.CUSTOMER' | translate }}</span>
              <span>{{ order()!.customer_name }}</span>
            </p>
          }
          <p class="courier-row">
            <span class="label">{{ 'COURIER_ORDERS.CREATED' | translate }}</span>
            <span>{{ formatCreatedAt(order()!.created_at) }}</span>
          </p>
        </section>

        <section class="courier-card">
          <h2>{{ 'COURIER_ORDERS.PICKUP' | translate }}</h2>
          @if (order()!.pickup_name) {
            <p class="courier-strong">{{ order()!.pickup_name }}</p>
          }
          @if (order()!.pickup_address) {
            <p class="courier-muted">{{ order()!.pickup_address }}</p>
          } @else {
            <p class="courier-muted">{{ 'COURIER_ORDERS.NO_ADDRESS' | translate }}</p>
          }
        </section>

        <section class="courier-card">
          <h2>{{ 'COURIER_ORDERS.DELIVERY' | translate }}</h2>
          @if (order()!.delivery_address) {
            <p>{{ order()!.delivery_address }}</p>
          } @else {
            <p class="courier-muted">{{ 'COURIER_ORDERS.DELIVERY_ADDRESS_UNAVAILABLE' | translate }}</p>
          }
          @if (order()!.delivery_notes) {
            <p class="courier-notes">
              <span class="label">{{ 'COURIER_ORDERS.NOTES' | translate }}</span>
              {{ order()!.delivery_notes }}
            </p>
          }
          @if (order()!.external_order_ref) {
            <p class="courier-muted">{{ 'COURIER_ORDERS.EXTERNAL_REF' | translate }}: {{ order()!.external_order_ref }}</p>
          }
        </section>

        <section class="courier-card">
          <h2>{{ 'COURIER_ORDERS.ITEMS' | translate }}</h2>
          <ul class="courier-item-list">
            @for (item of order()!.items; track $index) {
              <li>
                <span class="qty">{{ item.quantity }}×</span>
                <span>{{ item.product_name }}</span>
                @if (item.customization_summary) {
                  <span class="custom">{{ item.customization_summary }}</span>
                }
                @if (item.notes) {
                  <span class="custom">{{ item.notes }}</span>
                }
              </li>
            }
          </ul>
          <p class="courier-total">
            {{ 'COURIER_ORDERS.TOTAL' | translate }}:
            {{ formatMoney(order()!.total_cents) }}
          </p>
        </section>
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
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      margin-bottom: var(--space-4);
    }
    .btn-back {
      color: var(--color-primary);
      text-decoration: none;
      font-weight: 500;
    }
    .courier-status {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
    }
    .courier-card {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--color-border);
      padding: var(--space-4);
      margin-bottom: var(--space-3);
    }
    .courier-card h2 {
      margin: 0 0 var(--space-3);
      font-size: 1rem;
      font-weight: 600;
    }
    .courier-title {
      margin: 0 0 var(--space-3);
      font-size: 1.25rem;
    }
    .courier-row {
      display: flex;
      justify-content: space-between;
      gap: var(--space-3);
      margin: 0 0 var(--space-2);
      font-size: 0.95rem;
    }
    .label { color: var(--color-text-muted); }
    .courier-strong { font-weight: 600; margin: 0 0 var(--space-1); }
    .courier-muted { color: var(--color-text-muted); margin: 0; }
    .courier-notes { margin: var(--space-3) 0 0; line-height: 1.4; }
    .courier-item-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }
    .courier-item-list li {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      align-items: baseline;
    }
    .qty { font-weight: 600; }
    .custom {
      width: 100%;
      font-size: 0.85rem;
      color: var(--color-text-muted);
    }
    .courier-total {
      margin: var(--space-4) 0 0;
      font-weight: 600;
      text-align: right;
    }
    .courier-error { color: var(--color-error); }
  `]
})
export class CourierOrderDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  error = signal('');
  order = signal<CourierOrderDetail | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.loading.set(false);
      this.error.set('COURIER_ORDERS.NOT_FOUND');
      return;
    }
    this.api.getCourierOrder(id).subscribe({
      next: (detail) => {
        this.order.set(detail);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.status === 404 ? 'COURIER_ORDERS.NOT_FOUND' : 'COURIER_ORDERS.LOAD_FAILED');
      }
    });
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
    return (cents / 100).toFixed(2);
  }
}
