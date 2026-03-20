import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService, TenantSummary } from '../services/api.service';
import { LanguagePickerComponent } from '../shared/language-picker.component';

@Component({
  selector: 'app-orders-public',
  standalone: true,
  imports: [RouterLink, TranslateModule, LanguagePickerComponent],
  template: `
    <div class="orders-public-page">
      <app-language-picker class="orders-language-picker"></app-language-picker>
      <div class="orders-header">
        <h1>{{ 'ORDERS_PUBLIC.TITLE' | translate }}</h1>
        <p class="subtitle">{{ 'ORDERS_PUBLIC.SUBTITLE' | translate }}</p>
      </div>

      @if (loading()) {
        <p class="loading">{{ 'COMMON.LOADING' | translate }}</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else if (tenantsWithTakeaway().length === 0) {
        <p class="empty">{{ 'ORDERS_PUBLIC.NO_TAKEAWAY' | translate }}</p>
        <a routerLink="/" class="btn-back">{{ 'COMMON.BACK' | translate }}</a>
      } @else {
        <div class="tenant-grid">
          @for (tenant of tenantsWithTakeaway(); track tenant.id) {
            <div class="tenant-card">
              @if (getLogoUrl(tenant)) {
                <img [src]="getLogoUrl(tenant)!" [alt]="tenant.name" class="tenant-logo" />
              }
              <h2 class="tenant-name">{{ tenant.name }}</h2>
              <div class="tenant-actions">
                <a [routerLink]="['/menu', tenant.take_away_table_token!]" class="btn-order">
                  {{ 'ORDERS_PUBLIC.ORDER_TAKEAWAY' | translate }}
                </a>
              </div>
            </div>
          }
        </div>
        <div class="back-row">
          <a routerLink="/" class="btn-back">{{ 'COMMON.BACK' | translate }}</a>
        </div>
      }

      <div class="orders-footer">
        <a routerLink="/">{{ 'ORDERS_PUBLIC.BACK_HOME' | translate }}</a>
      </div>
    </div>
  `,
  styles: [`
    .orders-public-page {
      min-height: 100vh;
      padding: var(--space-8) var(--space-5) var(--space-8);
      background: var(--color-bg);
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
    }

    .orders-language-picker {
      position: absolute;
      top: var(--space-4);
      right: var(--space-4);
      z-index: 10;
    }

    .orders-header {
      text-align: center;
      margin-bottom: var(--space-8);
    }

    .orders-header h1 {
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: var(--space-2);
    }

    .orders-header .subtitle {
      color: var(--color-text-muted);
      font-size: 1rem;
    }

    .loading, .error, .empty {
      color: var(--color-text-muted);
      margin: var(--space-4) 0;
    }

    .error {
      color: var(--color-error);
    }

    .tenant-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: var(--space-6);
      max-width: 900px;
      width: 100%;
    }

    .tenant-card {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
      padding: var(--space-6);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-4);
      border: 1px solid var(--color-border);
    }

    .tenant-logo {
      width: 64px;
      height: 64px;
      object-fit: contain;
      border-radius: var(--radius-md);
    }

    .tenant-name {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0;
      text-align: center;
    }

    .tenant-actions {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      align-items: stretch;
    }

    .btn-order {
      display: inline-block;
      padding: var(--space-3) var(--space-5);
      background: var(--color-primary);
      color: white;
      border-radius: var(--radius-md);
      font-weight: 500;
      text-decoration: none;
      text-align: center;
      transition: background 0.15s ease;
    }

    .btn-order:hover {
      background: var(--color-primary-hover);
    }

    .back-row {
      margin-top: var(--space-6);
    }

    .btn-back {
      color: var(--color-primary);
      font-weight: 500;
      text-decoration: none;
    }

    .btn-back:hover {
      text-decoration: underline;
    }

    .orders-footer {
      margin-top: auto;
      padding-top: var(--space-8);
      text-align: center;
      font-size: 0.9375rem;
      color: var(--color-text-muted);
    }

    .orders-footer a {
      color: var(--color-primary);
      font-weight: 500;
      text-decoration: none;
    }

    .orders-footer a:hover {
      text-decoration: underline;
    }
  `],
})
export class OrdersPublicComponent implements OnInit {
  private api = inject(ApiService);

  tenants = signal<TenantSummary[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  tenantsWithTakeaway = computed(() =>
    this.tenants().filter((t) => t.take_away_table_token)
  );

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getPublicTenants().subscribe({
      next: (list) => {
        this.tenants.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.detail || 'Failed to load restaurants');
        this.loading.set(false);
      },
    });
  }

  getLogoUrl(tenant: TenantSummary): string | null {
    return this.api.getTenantLogoUrl(tenant.logo_filename ?? undefined, tenant.id);
  }
}
