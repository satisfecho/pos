import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService, PlatformInfo, PlatformMetrics, PlatformTenantSummary } from '../services/api.service';

@Component({
  selector: 'app-platform-dashboard',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  template: `
    <div class="platform-page">
      <header class="platform-header">
        <div>
          <h1>{{ 'PLATFORM_DASHBOARD.TITLE' | translate }}</h1>
          @if (profile()?.email) {
            <p class="platform-subtitle">{{ 'PLATFORM_DASHBOARD.SIGNED_IN_AS' | translate }} {{ profile()!.email }}</p>
          }
        </div>
        <button type="button" class="btn-logout" (click)="logout()">
          {{ 'PLATFORM_DASHBOARD.LOGOUT' | translate }}
        </button>
      </header>

      @if (loading()) {
        <p class="platform-muted">{{ 'COMMON.LOADING' | translate }}</p>
      } @else if (error()) {
        <p class="platform-error">{{ error() | translate }}</p>
      } @else if (metrics()) {
        <section class="metrics-grid">
          <article class="metric-card">
            <h2>{{ 'PLATFORM_DASHBOARD.TENANT_COUNT' | translate }}</h2>
            <p class="metric-value">{{ metrics()!.tenant_count }}</p>
          </article>
          <article class="metric-card">
            <h2>{{ 'PLATFORM_DASHBOARD.SIGNUPS_30D' | translate }}</h2>
            <p class="metric-value">{{ metrics()!.signups_last_30_days }}</p>
          </article>
          <article class="metric-card">
            <h2>{{ 'PLATFORM_DASHBOARD.LOGINS_24H' | translate }}</h2>
            <p class="metric-value">{{ metrics()!.logins_last_24_hours }}</p>
          </article>
          <article class="metric-card">
            <h2>{{ 'PLATFORM_DASHBOARD.LOGINS_7D' | translate }}</h2>
            <p class="metric-value">{{ metrics()!.logins_last_7_days }}</p>
          </article>
        </section>

        <section class="platform-section">
          <h2>{{ 'PLATFORM_DASHBOARD.ALL_TENANTS' | translate }}</h2>
          <p class="platform-muted section-hint">{{ 'PLATFORM_DASHBOARD.ALL_TENANTS_HINT' | translate }}</p>
          @if (tenants().length === 0) {
            <p class="platform-muted">{{ 'PLATFORM_DASHBOARD.NO_TENANTS' | translate }}</p>
          } @else {
            <div class="table-wrap">
              <table class="platform-table">
                <thead>
                  <tr>
                    <th>{{ 'PLATFORM_DASHBOARD.COL_ID' | translate }}</th>
                    <th>{{ 'PLATFORM_DASHBOARD.COL_NAME' | translate }}</th>
                    <th>{{ 'PLATFORM_DASHBOARD.OWNER_CONTACT' | translate }}</th>
                    <th>{{ 'PLATFORM_DASHBOARD.COL_PRODUCTS' | translate }}</th>
                    <th>{{ 'PLATFORM_DASHBOARD.COL_CREATED' | translate }}</th>
                    <th>{{ 'PLATFORM_DASHBOARD.COL_ACTIONS' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (t of tenants(); track t.id) {
                    <tr>
                      <td>{{ t.id }}</td>
                      <td>
                        <a [routerLink]="['/platform/tenants', t.id]" class="tenant-link">{{ t.name }}</a>
                      </td>
                      <td>
                        @if (t.owner_email) {
                          <a [href]="'mailto:' + t.owner_email">{{ t.owner_name || t.owner_email }}</a>
                        } @else {
                          <span class="platform-muted">{{ 'PLATFORM_DASHBOARD.NO_CONTACT' | translate }}</span>
                        }
                      </td>
                      <td>{{ t.product_count }}</td>
                      <td>{{ formatDate(t.created_at) }}</td>
                      <td class="actions-cell">
                        <a [href]="publicUrl('public-menu', t.id)" target="_blank" rel="noopener noreferrer" class="action-link">
                          {{ 'PLATFORM_DASHBOARD.LINK_MENU' | translate }}
                        </a>
                        <a [routerLink]="['/platform/tenants', t.id]" class="action-link">
                          {{ 'PLATFORM_DASHBOARD.VIEW_TENANT' | translate }}
                        </a>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>

        <section class="platform-section">
          <h2>{{ 'PLATFORM_DASHBOARD.RECENT_LOGINS' | translate }}</h2>
          @if (metrics()!.recent_logins.length === 0) {
            <p class="platform-muted">{{ 'PLATFORM_DASHBOARD.NO_LOGINS' | translate }}</p>
          } @else {
            <div class="table-wrap">
              <table class="platform-table">
                <thead>
                  <tr>
                    <th>{{ 'PLATFORM_DASHBOARD.COL_TIME' | translate }}</th>
                    <th>{{ 'PLATFORM_DASHBOARD.COL_EMAIL' | translate }}</th>
                    <th>{{ 'PLATFORM_DASHBOARD.COL_ROLE' | translate }}</th>
                    <th>{{ 'PLATFORM_DASHBOARD.COL_TENANT' | translate }}</th>
                    <th>{{ 'PLATFORM_DASHBOARD.COL_SCOPE' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of metrics()!.recent_logins; track row.logged_in_at) {
                    <tr>
                      <td>{{ formatDate(row.logged_in_at) }}</td>
                      <td>{{ row.user_email ?? '—' }}</td>
                      <td>{{ row.role ?? '—' }}</td>
                      <td>
                        @if (row.tenant_id) {
                          <a [routerLink]="['/platform/tenants', row.tenant_id]">
                            {{ row.tenant_name || row.tenant_id }}
                          </a>
                        } @else {
                          —
                        }
                      </td>
                      <td>{{ row.login_scope ?? '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    .platform-page {
      min-height: 100vh;
      padding: var(--space-6);
      background: var(--color-bg);
      color: var(--color-text);
      max-width: 1200px;
      margin: 0 auto;
    }
    .platform-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--space-4);
      margin-bottom: var(--space-6);
    }
    .platform-header h1 { font-size: 1.5rem; font-weight: 600; margin: 0; }
    .platform-subtitle { color: var(--color-text-muted); font-size: 0.9375rem; margin: var(--space-1) 0 0; }
    .btn-logout {
      padding: var(--space-2) var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      cursor: pointer;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--space-4);
      margin-bottom: var(--space-8);
    }
    .metric-card {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: var(--space-5);
      box-shadow: var(--shadow-sm);
    }
    .metric-card h2 {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-muted);
      margin: 0 0 var(--space-2);
    }
    .metric-value { font-size: 2rem; font-weight: 600; margin: 0; }
    .platform-section { margin-bottom: var(--space-8); }
    .platform-section h2 { font-size: 1.125rem; margin-bottom: var(--space-2); }
    .section-hint { margin: 0 0 var(--space-3); font-size: 0.875rem; }
    .table-wrap { overflow-x: auto; }
    .platform-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--color-surface);
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    .platform-table th,
    .platform-table td {
      padding: var(--space-3) var(--space-4);
      text-align: left;
      border-bottom: 1px solid var(--color-border);
      font-size: 0.875rem;
      vertical-align: top;
    }
    .platform-table th { background: var(--color-bg); font-weight: 500; white-space: nowrap; }
    .tenant-link { font-weight: 500; }
    .actions-cell { white-space: nowrap; }
    .action-link {
      display: inline-block;
      margin-right: var(--space-3);
      font-size: 0.8125rem;
    }
    .platform-muted { color: var(--color-text-muted); }
    .platform-error { color: var(--color-error); }
  `]
})
export class PlatformDashboardComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  profile = signal<PlatformInfo | null>(null);
  metrics = signal<PlatformMetrics | null>(null);
  tenants = signal<PlatformTenantSummary[]>([]);
  loading = signal(true);
  error = signal('');

  ngOnInit(): void {
    let metricsDone = false;
    let tenantsDone = false;
    const maybeDone = () => {
      if (metricsDone && tenantsDone) this.loading.set(false);
    };

    this.api.getPlatformMe().subscribe({
      next: (p) => this.profile.set(p),
      error: () => this.error.set('PLATFORM_DASHBOARD.LOAD_FAILED'),
    });
    this.api.getPlatformMetrics().subscribe({
      next: (m) => {
        this.metrics.set(m);
        metricsDone = true;
        maybeDone();
      },
      error: () => {
        this.error.set('PLATFORM_DASHBOARD.LOAD_FAILED');
        this.loading.set(false);
      },
    });
    this.api.getPlatformTenants().subscribe({
      next: (list) => {
        this.tenants.set(list);
        tenantsDone = true;
        maybeDone();
      },
      error: () => {
        this.error.set('PLATFORM_DASHBOARD.LOAD_FAILED');
        this.loading.set(false);
      },
    });
  }

  formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  publicUrl(segment: string, tenantId: number): string {
    if (typeof window === 'undefined') return `/${segment}/${tenantId}`;
    return `${window.location.origin}/${segment}/${tenantId}`;
  }

  logout(): void {
    this.api.logout().subscribe(() => this.router.navigate(['/platform/login']));
  }
}
