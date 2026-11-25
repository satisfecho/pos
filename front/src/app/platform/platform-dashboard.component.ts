import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  ApiService,
  PlatformInfo,
  PlatformMetrics,
  PlatformTenantSummary,
  PlatformUsageDay,
} from '../services/api.service';

type TenantSortKey =
  | 'id'
  | 'name'
  | 'owner'
  | 'owner_logins'
  | 'owner_last_login'
  | 'products'
  | 'created';

type UsageDays = 7 | 30 | 90;

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
          <article class="metric-card" data-metric="tenant_count">
            <h2>{{ 'PLATFORM_DASHBOARD.TENANT_COUNT' | translate }}</h2>
            <p class="metric-value">{{ metrics()!.tenant_count }}</p>
          </article>
          <article class="metric-card" data-metric="signups_30d">
            <h2>{{ 'PLATFORM_DASHBOARD.SIGNUPS_30D' | translate }}</h2>
            <p class="metric-value">{{ metrics()!.signups_last_30_days }}</p>
          </article>
          <article class="metric-card" data-metric="logins_total">
            <h2>{{ 'PLATFORM_DASHBOARD.LOGINS_TOTAL' | translate }}</h2>
            <p class="metric-value">{{ metrics()!.logins_total }}</p>
          </article>
          <article class="metric-card" data-metric="last_login">
            <h2>{{ 'PLATFORM_DASHBOARD.LAST_LOGIN' | translate }}</h2>
            <p class="metric-value metric-value-sm">
              @if (metrics()!.last_login_at) {
                {{ formatDate(metrics()!.last_login_at!) }}
              } @else {
                {{ 'PLATFORM_DASHBOARD.NO_LOGINS' | translate }}
              }
            </p>
          </article>
          <article class="metric-card" data-metric="logins_24h">
            <h2>{{ 'PLATFORM_DASHBOARD.LOGINS_24H' | translate }}</h2>
            <p class="metric-value">{{ metrics()!.logins_last_24_hours }}</p>
          </article>
          <article class="metric-card" data-metric="logins_7d">
            <h2>{{ 'PLATFORM_DASHBOARD.LOGINS_7D' | translate }}</h2>
            <p class="metric-value">{{ metrics()!.logins_last_7_days }}</p>
          </article>
        </section>

        <section class="platform-section usage-section" data-testid="usage-chart">
          <div class="usage-head">
            <h2>{{ 'PLATFORM_DASHBOARD.USAGE_OVER_TIME' | translate }}</h2>
            <div class="usage-period" role="group" [attr.aria-label]="'PLATFORM_DASHBOARD.USAGE_PERIOD' | translate">
              @for (d of usagePeriods; track d) {
                <button
                  type="button"
                  class="period-btn"
                  [class.active]="usageDays() === d"
                  [attr.data-testid]="'usage-days-' + d"
                  [attr.aria-pressed]="usageDays() === d"
                  (click)="setUsageDays(d)"
                  [disabled]="usageLoading()"
                >
                  {{ ('PLATFORM_DASHBOARD.USAGE_DAYS_' + d) | translate }}
                </button>
              }
            </div>
          </div>
          @if (usageLoading() && usageSeries().length === 0) {
            <p class="platform-muted">{{ 'COMMON.LOADING' | translate }}</p>
          } @else if (usageSeries().length === 0) {
            <p class="platform-muted">{{ 'PLATFORM_DASHBOARD.USAGE_EMPTY' | translate }}</p>
          } @else {
            <div class="usage-legend">
              <span class="legend-item legend-logins">{{ 'PLATFORM_DASHBOARD.USAGE_LOGINS' | translate }}</span>
              <span class="legend-item legend-signups">{{ 'PLATFORM_DASHBOARD.USAGE_SIGNUPS' | translate }}</span>
            </div>
            <div class="usage-graph-wrap" [class.usage-loading]="usageLoading()">
              <svg
                class="usage-graph"
                [attr.viewBox]="'0 0 ' + chartWidth + ' ' + chartHeight"
                preserveAspectRatio="xMidYMid meet"
                role="img"
                [attr.aria-label]="'PLATFORM_DASHBOARD.USAGE_OVER_TIME' | translate"
              >
                <defs>
                  <linearGradient id="usageLoginsGrad" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stop-color="var(--color-primary, #0d9488)" stop-opacity="0.18"/>
                    <stop offset="100%" stop-color="var(--color-primary, #0d9488)" stop-opacity="0.02"/>
                  </linearGradient>
                </defs>
                @for (tick of usageYLabels(); track tick.y) {
                  <line
                    class="usage-grid"
                    [attr.x1]="chartPad.left"
                    [attr.x2]="chartWidth - chartPad.right"
                    [attr.y1]="tick.y"
                    [attr.y2]="tick.y"
                  />
                  <text class="usage-y-label" [attr.x]="chartPad.left - 6" [attr.y]="tick.y + 4" text-anchor="end">
                    {{ tick.value }}
                  </text>
                }
                @for (tick of usageXLabels(); track tick.date) {
                  <text class="usage-x-label" [attr.x]="tick.x" [attr.y]="chartHeight - 6" text-anchor="middle">
                    {{ tick.label }}
                  </text>
                }
                <path [attr.d]="loginsAreaPath()" fill="url(#usageLoginsGrad)" />
                <polyline [attr.points]="loginsLinePoints()" class="usage-line usage-line-logins" fill="none" />
                <polyline [attr.points]="signupsLinePoints()" class="usage-line usage-line-signups" fill="none" />
              </svg>
            </div>
          }
        </section>

        <section class="platform-section">
          <div class="section-head">
            <div>
              <h2>{{ 'PLATFORM_DASHBOARD.ALL_TENANTS' | translate }}</h2>
              <p class="platform-muted section-hint">{{ 'PLATFORM_DASHBOARD.ALL_TENANTS_HINT' | translate }}</p>
            </div>
            <label class="tenant-filter">
              <span class="sr-only">{{ 'PLATFORM_DASHBOARD.FILTER_TENANTS' | translate }}</span>
              <input
                type="search"
                data-testid="tenant-filter"
                [placeholder]="'PLATFORM_DASHBOARD.FILTER_PLACEHOLDER' | translate"
                [value]="tenantFilter()"
                (input)="onFilterInput($event)"
              />
            </label>
          </div>
          @if (tenants().length === 0) {
            <p class="platform-muted">{{ 'PLATFORM_DASHBOARD.NO_TENANTS' | translate }}</p>
          } @else if (filteredTenants().length === 0) {
            <p class="platform-muted">{{ 'PLATFORM_DASHBOARD.NO_FILTER_MATCH' | translate }}</p>
          } @else {
            <div class="table-wrap">
              <table class="platform-table tenants-table">
                <thead>
                  <tr>
                    <th class="col-id">
                      <button type="button" class="sort-btn" (click)="toggleSort('id')">
                        {{ 'PLATFORM_DASHBOARD.COL_ID' | translate }}{{ sortMark('id') }}
                      </button>
                    </th>
                    <th class="col-name">
                      <button type="button" class="sort-btn" (click)="toggleSort('name')">
                        {{ 'PLATFORM_DASHBOARD.COL_NAME' | translate }}{{ sortMark('name') }}
                      </button>
                    </th>
                    <th class="col-owner">
                      <button type="button" class="sort-btn" (click)="toggleSort('owner')">
                        {{ 'PLATFORM_DASHBOARD.OWNER_CONTACT' | translate }}{{ sortMark('owner') }}
                      </button>
                    </th>
                    <th class="col-activity">
                      <button type="button" class="sort-btn" (click)="toggleSort('owner_logins')">
                        {{ 'PLATFORM_DASHBOARD.COL_OWNER_ACTIVITY' | translate }}{{ sortMark('owner_logins') }}
                      </button>
                    </th>
                    <th class="col-products">
                      <button type="button" class="sort-btn" (click)="toggleSort('products')">
                        {{ 'PLATFORM_DASHBOARD.COL_PRODUCTS' | translate }}{{ sortMark('products') }}
                      </button>
                    </th>
                    <th class="col-created">
                      <button type="button" class="sort-btn" (click)="toggleSort('created')">
                        {{ 'PLATFORM_DASHBOARD.COL_CREATED' | translate }}{{ sortMark('created') }}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  @for (t of filteredTenants(); track t.id) {
                    <tr>
                      <td class="col-id">{{ t.id }}</td>
                      <td class="col-name">
                        <a [routerLink]="['/platform/tenants', t.id]" class="tenant-link">{{ t.name }}</a>
                        <div class="row-links">
                          <a
                            [href]="publicUrl('public-menu', t)"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="action-link"
                          >
                            {{ 'PLATFORM_DASHBOARD.LINK_MENU' | translate }}
                          </a>
                          <a [routerLink]="['/platform/tenants', t.id]" class="action-link">
                            {{ 'PLATFORM_DASHBOARD.VIEW_TENANT' | translate }}
                          </a>
                        </div>
                      </td>
                      <td class="col-owner">
                        @if (t.owner_email) {
                          <a class="owner-link" [href]="'mailto:' + t.owner_email" [title]="t.owner_email">
                            {{ t.owner_name || t.owner_email }}
                          </a>
                        } @else {
                          <span class="platform-muted">{{ 'PLATFORM_DASHBOARD.NO_CONTACT' | translate }}</span>
                        }
                      </td>
                      <td class="col-activity" data-testid="owner-login-count">
                        <span class="activity-count">{{ t.owner_login_count ?? 0 }}</span>
                        <span class="activity-last" data-testid="owner-last-login">
                          @if (t.owner_last_login_at) {
                            {{ formatShortDate(t.owner_last_login_at) }}
                          } @else {
                            <span class="platform-muted">—</span>
                          }
                        </span>
                      </td>
                      <td class="col-products">{{ t.product_count }}</td>
                      <td class="col-created">{{ formatShortDate(t.created_at) }}</td>
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
              <table class="platform-table recent-logins-table">
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
                      <td class="cell-ellipsis" [title]="row.user_email || ''">{{ row.user_email ?? '—' }}</td>
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
      max-width: 1120px;
      margin: 0 auto;
      box-sizing: border-box;
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
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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
    .metric-value-sm { font-size: 1.125rem; line-height: 1.35; word-break: break-word; }
    .platform-section { margin-bottom: var(--space-8); }
    .platform-section h2 { font-size: 1.125rem; margin: 0 0 var(--space-2); }
    .section-hint { margin: 0; font-size: 0.875rem; }
    .section-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-end;
      gap: var(--space-3);
      margin-bottom: var(--space-3);
    }
    .usage-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-3);
      margin-bottom: var(--space-3);
    }
    .usage-head h2 { margin-bottom: 0; }
    .usage-period {
      display: inline-flex;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      overflow: hidden;
      background: var(--color-surface);
    }
    .period-btn {
      border: 0;
      background: transparent;
      color: var(--color-text-muted);
      font: inherit;
      font-size: 0.8125rem;
      padding: 0.4rem 0.75rem;
      cursor: pointer;
      border-right: 1px solid var(--color-border);
    }
    .period-btn:last-child { border-right: 0; }
    .period-btn.active {
      background: var(--color-primary, #0d9488);
      color: var(--color-on-primary, #fff);
    }
    .period-btn:disabled { opacity: 0.6; cursor: wait; }
    .usage-graph-wrap.usage-loading { opacity: 0.55; }
    .tenant-filter input {
      min-width: min(100%, 260px);
      padding: 0.45rem 0.7rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
      font-size: 0.875rem;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
    }
    .usage-legend {
      display: flex;
      gap: var(--space-4);
      margin-bottom: var(--space-2);
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }
    .legend-item::before {
      content: '';
      display: inline-block;
      width: 0.75rem;
      height: 0.2rem;
      margin-right: 0.4rem;
      vertical-align: middle;
      border-radius: 999px;
    }
    .legend-logins::before { background: var(--color-primary, #0d9488); }
    .legend-signups::before { background: var(--color-warning, #d97706); }
    .usage-graph-wrap {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: var(--space-3) var(--space-2) var(--space-2);
      box-shadow: var(--shadow-sm);
    }
    .usage-graph { width: 100%; height: auto; display: block; }
    .usage-grid { stroke: var(--color-border); stroke-width: 1; }
    .usage-y-label,
    .usage-x-label {
      fill: var(--color-text-muted);
      font-size: 10px;
    }
    .usage-line { stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
    .usage-line-logins { stroke: var(--color-primary, #0d9488); }
    .usage-line-signups { stroke: var(--color-warning, #d97706); stroke-dasharray: 4 3; }
    .table-wrap { overflow-x: auto; }
    .platform-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--color-surface);
      border-radius: var(--radius-md);
      overflow: hidden;
      table-layout: fixed;
    }
    .platform-table th,
    .platform-table td {
      padding: 0.55rem 0.65rem;
      text-align: left;
      border-bottom: 1px solid var(--color-border);
      font-size: 0.8125rem;
      vertical-align: top;
    }
    .platform-table th { background: var(--color-bg); font-weight: 500; }
    .sort-btn {
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      font-weight: 500;
      padding: 0;
      cursor: pointer;
      text-align: left;
    }
    .sort-btn:hover { text-decoration: underline; }
    .tenants-table .col-id { width: 3.25rem; }
    .tenants-table .col-name { width: 28%; }
    .tenants-table .col-owner { width: 24%; }
    .tenants-table .col-activity { width: 7.5rem; }
    .tenants-table .col-products { width: 5.5rem; }
    .tenants-table .col-created { width: 6.25rem; }
    .tenant-link {
      font-weight: 500;
      display: inline-block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .row-links {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem 0.75rem;
      margin-top: 0.2rem;
    }
    .action-link { font-size: 0.75rem; }
    .owner-link {
      display: inline-block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .activity-count { display: block; font-weight: 600; }
    .activity-last { display: block; color: var(--color-text-muted); font-size: 0.75rem; }
    .cell-ellipsis {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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
  tenantFilter = signal('');
  sortKey = signal<TenantSortKey>('created');
  sortDir = signal<'asc' | 'desc'>('desc');
  usageDays = signal<UsageDays>(30);
  usageSeries = signal<PlatformUsageDay[]>([]);
  usageLoading = signal(false);

  readonly usagePeriods: UsageDays[] = [7, 30, 90];
  readonly chartPad = { left: 36, right: 10, top: 12, bottom: 28 };
  readonly chartWidth = 640;
  readonly chartHeight = 200;

  filteredTenants = computed(() => {
    const q = this.tenantFilter().trim().toLowerCase();
    let rows = [...this.tenants()];
    if (q) {
      rows = rows.filter((t) => {
        const hay = [String(t.id), t.name, t.owner_name, t.owner_email, t.city]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }
    const key = this.sortKey();
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    rows.sort((a, b) => dir * this.compareTenants(a, b, key));
    return rows;
  });

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
    this.api.getPlatformMetrics(this.usageDays()).subscribe({
      next: (m) => {
        this.metrics.set(m);
        this.applyUsageFromMetrics(m);
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

  setUsageDays(days: UsageDays): void {
    if (this.usageDays() === days || this.usageLoading()) return;
    this.usageDays.set(days);
    this.usageLoading.set(true);
    this.api.getPlatformUsage(days).subscribe({
      next: (res) => {
        this.usageSeries.set(res.usage_series ?? []);
        this.usageDays.set((res.usage_days as UsageDays) || days);
        this.usageLoading.set(false);
      },
      error: () => {
        this.usageLoading.set(false);
        this.error.set('PLATFORM_DASHBOARD.LOAD_FAILED');
      },
    });
  }

  private applyUsageFromMetrics(m: PlatformMetrics): void {
    const series = m.usage_series ?? m.usage_last_30_days ?? [];
    this.usageSeries.set(series);
    if (m.usage_days === 7 || m.usage_days === 30 || m.usage_days === 90) {
      this.usageDays.set(m.usage_days);
    }
  }

  onFilterInput(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.tenantFilter.set(value);
  }

  toggleSort(key: TenantSortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
      return;
    }
    this.sortKey.set(key);
    this.sortDir.set(key === 'name' || key === 'owner' ? 'asc' : 'desc');
  }

  sortMark(key: TenantSortKey): string {
    if (this.sortKey() !== key) return '';
    return this.sortDir() === 'asc' ? ' ↑' : ' ↓';
  }

  private compareTenants(a: PlatformTenantSummary, b: PlatformTenantSummary, key: TenantSortKey): number {
    switch (key) {
      case 'id':
        return a.id - b.id;
      case 'name':
        return a.name.localeCompare(b.name);
      case 'owner':
        return (a.owner_name || a.owner_email || '').localeCompare(b.owner_name || b.owner_email || '');
      case 'owner_logins':
        return (a.owner_login_count ?? 0) - (b.owner_login_count ?? 0);
      case 'owner_last_login':
        return this.ts(a.owner_last_login_at) - this.ts(b.owner_last_login_at);
      case 'products':
        return a.product_count - b.product_count;
      case 'created':
      default:
        return this.ts(a.created_at) - this.ts(b.created_at);
    }
  }

  private ts(value?: string | null): number {
    if (!value) return 0;
    const n = Date.parse(value);
    return Number.isFinite(n) ? n : 0;
  }

  private usageMax(): number {
    const series = this.usageSeries();
    return Math.max(1, ...series.map((d) => Math.max(d.logins, d.signups)));
  }

  private seriesPoints(getter: (d: PlatformUsageDay) => number): string {
    const series = this.usageSeries();
    if (!series.length) return '';
    const max = this.usageMax();
    const w = this.chartWidth - this.chartPad.left - this.chartPad.right;
    const h = this.chartHeight - this.chartPad.top - this.chartPad.bottom;
    return series
      .map((d, i) => {
        const x = this.chartPad.left + (i / (series.length - 1 || 1)) * w;
        const y = this.chartPad.top + h - (getter(d) / max) * h;
        return `${x},${y}`;
      })
      .join(' ');
  }

  loginsLinePoints(): string {
    return this.seriesPoints((d) => d.logins);
  }

  signupsLinePoints(): string {
    return this.seriesPoints((d) => d.signups);
  }

  loginsAreaPath(): string {
    const series = this.usageSeries();
    if (!series.length) return '';
    const points = this.loginsLinePoints().split(' ');
    const w = this.chartWidth - this.chartPad.left - this.chartPad.right;
    const h = this.chartHeight - this.chartPad.top - this.chartPad.bottom;
    const baseY = this.chartPad.top + h;
    const firstX = this.chartPad.left;
    const lastX = this.chartPad.left + w;
    return `M ${firstX},${baseY} L ${points.join(' L ')} L ${lastX},${baseY} Z`;
  }

  usageYLabels(): { value: number; y: number }[] {
    const max = this.usageMax();
    const h = this.chartHeight - this.chartPad.top - this.chartPad.bottom;
    return [
      { value: max, y: this.chartPad.top },
      { value: Math.round(max / 2), y: this.chartPad.top + h / 2 },
      { value: 0, y: this.chartPad.top + h },
    ];
  }

  usageXLabels(): { date: string; label: string; x: number }[] {
    const series = this.usageSeries();
    if (!series.length) return [];
    const w = this.chartWidth - this.chartPad.left - this.chartPad.right;
    const indices =
      series.length === 1 ? [0] : [0, Math.floor((series.length - 1) / 2), series.length - 1];
    return indices.map((i) => ({
      date: series[i].date,
      label: this.formatAxisDate(series[i].date),
      x: this.chartPad.left + (i / (series.length - 1 || 1)) * w,
    }));
  }

  formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  formatShortDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: '2-digit',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  formatAxisDate(isoDate: string): string {
    try {
      return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoDate;
    }
  }

  publicUrl(segment: string, tenant: { id: number; public_slug?: string | null }): string {
    if (segment === 'book' && tenant.public_slug?.trim()) {
      const path = `/${tenant.public_slug.trim()}/book`;
      if (typeof window === 'undefined') return path;
      return `${window.location.origin}${path}`;
    }
    const ref =
      segment === 'public-menu' && tenant.public_slug?.trim()
        ? tenant.public_slug.trim()
        : tenant.id;
    if (typeof window === 'undefined') return `/${segment}/${ref}`;
    return `${window.location.origin}/${segment}/${ref}`;
  }

  logout(): void {
    this.api.logout().subscribe(() => this.router.navigate(['/platform/login']));
  }
}
