import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService, PublicTableLookupChoice, TenantSummary } from '../services/api.service';
import { FormsModule } from '@angular/forms';
import { LanguagePickerComponent } from '../shared/language-picker.component';
import { LegalLinksComponent } from '../shared/legal-links.component';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, TranslateModule, FormsModule, LanguagePickerComponent, LegalLinksComponent],
  template: `
    <div class="landing-page">
      <app-language-picker class="landing-language-picker"></app-language-picker>

      <header class="landing-hero">
        <div class="landing-hero__inner">
          <h1 class="landing-hero__title">{{ 'LANDING.TITLE' | translate }}</h1>
          <p class="landing-hero__subtitle">{{ 'LANDING.SUBTITLE' | translate }}</p>
          <ul class="landing-values" aria-label="{{ 'LANDING.VALUES_LABEL' | translate }}">
            <li class="landing-value">
              <span class="landing-value__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
              <span class="landing-value__text">{{ 'LANDING.VALUE_BOOKING' | translate }}</span>
            </li>
            <li class="landing-value">
              <span class="landing-value__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <span class="landing-value__text">{{ 'LANDING.VALUE_DINE_IN' | translate }}</span>
            </li>
            <li class="landing-value">
              <span class="landing-value__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              <span class="landing-value__text">{{ 'LANDING.VALUE_STAFF' | translate }}</span>
            </li>
          </ul>
        </div>
      </header>

      <main class="landing-main">
        <div class="landing-split">
          <section
            class="landing-panel landing-panel--guests"
            aria-labelledby="landing-guests-heading"
          >
            <h2 id="landing-guests-heading" class="landing-panel__title">
              {{ 'LANDING.SECTION_GUESTS' | translate }}
            </h2>
            <p class="landing-panel__lede">{{ 'LANDING.SECTION_GUESTS_LEDE' | translate }}</p>
            <div class="table-code-section" aria-label="{{ 'LANDING.AT_TABLE_LABEL' | translate }}">
              <p class="table-code-hint">{{ 'LANDING.AT_TABLE_HINT' | translate }}</p>
              <div class="table-code-row">
                <input
                  type="text"
                  [(ngModel)]="tableCode"
                  [placeholder]="'LANDING.TABLE_CODE_PLACEHOLDER' | translate"
                  class="table-code-input"
                  (ngModelChange)="onTableCodeInput()"
                  (keyup.enter)="goToTableMenu()"
                />
                <button
                  type="button"
                  class="btn-go"
                  [disabled]="tableLookupLoading()"
                  (click)="goToTableMenu()"
                >
                  {{ 'LANDING.GO' | translate }}
                </button>
              </div>
              @if (tableLookupError()) {
                <p class="table-lookup-error" role="alert">{{ tableLookupError() }}</p>
              }
              @if (tableLookupChoices().length > 0) {
                <p class="table-lookup-pick-title">{{ 'LANDING.TABLE_MULTIPLE_TITLE' | translate }}</p>
                <p class="table-lookup-pick-hint">{{ 'LANDING.TABLE_MULTIPLE_HINT' | translate }}</p>
                <ul class="table-lookup-choices">
                  @for (c of tableLookupChoices(); track c.tenant_id + '-' + c.table_token) {
                    <li>
                      <button type="button" class="table-lookup-choice-btn" (click)="selectRestaurantForTable(c)">
                        {{ c.tenant_name }}
                      </button>
                    </li>
                  }
                </ul>
              }
              <p class="takeaway-hint">
                <a routerLink="/orders" class="link-takeaway">{{ 'LANDING.ORDER_TAKEAWAY' | translate }}</a>
              </p>
            </div>
          </section>

          <section class="landing-panel landing-panel--team" aria-labelledby="landing-team-heading">
            <h2 id="landing-team-heading" class="landing-panel__title">
              {{ 'LANDING.SECTION_TEAM' | translate }}
            </h2>
            <p class="landing-panel__lede">{{ 'LANDING.SECTION_TEAM_LEDE' | translate }}</p>
            <a routerLink="/register" class="btn-team-register" data-testid="landing-staff-register">
              {{ 'LANDING.TEAM_REGISTER' | translate }}
            </a>
            <p class="landing-panel__hint">{{ 'LANDING.SECTION_TEAM_HINT' | translate }}</p>
          </section>
        </div>

        <section class="landing-restaurants" aria-labelledby="landing-restaurants-heading">
          <h2 id="landing-restaurants-heading" class="landing-section-heading">
            {{ 'LANDING.RESTAURANTS_HEADING' | translate }}
          </h2>
          @if (loading()) {
            <p class="loading">{{ 'COMMON.LOADING' | translate }}</p>
          } @else if (error()) {
            <p class="error">{{ error() }}</p>
          } @else if (tenants().length === 0) {
            <p class="empty">{{ 'LANDING.NO_TENANTS' | translate }}</p>
          } @else {
            <div class="tenant-grid">
              @for (tenant of tenants(); track tenant.id) {
                <article class="tenant-card">
                  @if (getLogoUrl(tenant)) {
                    <img [src]="getLogoUrl(tenant)!" [alt]="tenant.name" class="tenant-logo" />
                  }
                  <h3 class="tenant-name">{{ tenant.name }}</h3>
                  <div class="tenant-actions">
                    <a [routerLink]="['/book', tenant.id]" class="btn-book">
                      {{ 'LANDING.BOOK_TABLE' | translate }}
                    </a>
                    <a [routerLink]="['/login']" [queryParams]="{ tenant: tenant.id }" class="btn-login">
                      {{ 'LANDING.LOGIN' | translate }}
                    </a>
                  </div>
                </article>
              }
            </div>
          }
        </section>
      </main>

      <div class="landing-footer">
        <span>{{ 'AUTH.DONT_HAVE_ACCOUNT' | translate }}</span>
        <a routerLink="/register">{{ 'AUTH.CREATE_ACCOUNT' | translate }}</a>
        <span class="footer-sep">·</span>
        <a routerLink="/provider/login" data-testid="landing-provider-login">{{ 'LANDING.PROVIDER_LOGIN' | translate }}</a>
        <span class="footer-sep">·</span>
        <a routerLink="/provider/register" data-testid="landing-provider-register">{{ 'LANDING.REGISTER_AS_PROVIDER' | translate }}</a>
        <span class="footer-sep">·</span>
        <a href="mailto:sales@satisfecho.de" data-testid="landing-contact-us">{{ 'LANDING.CONTACT_US' | translate }}</a>
        <app-legal-links class="landing-legal-links" [termsUrl]="legalTermsUrl()" [privacyUrl]="legalPrivacyUrl()" />
      </div>
      <div class="landing-version-bar" data-testid="landing-version">{{ version || '0.0.0' }} <span class="landing-commit">{{ commitHash || '' }}</span></div>
    </div>
  `,
  styles: [`
    .landing-page {
      min-height: 100vh;
      padding: var(--space-8) var(--space-4) calc(var(--space-8) + 36px);
      background: var(--color-bg);
      display: flex;
      flex-direction: column;
      align-items: stretch;
      position: relative;
    }

    .landing-version-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: var(--space-2) var(--space-4);
      font-size: 0.6875rem;
      color: var(--color-text-muted);
      background: var(--color-surface);
      border-top: 1px solid var(--color-border);
      text-align: center;
      opacity: 0.9;
      z-index: 5;
    }

    .landing-version-bar .landing-commit {
      margin-left: 4px;
      font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
      font-size: 0.625rem;
    }

    .landing-language-picker {
      position: absolute;
      top: var(--space-4);
      right: var(--space-4);
      z-index: 10;
    }

    .landing-hero {
      width: 100%;
      padding: var(--space-6) var(--space-4) var(--space-8);
      margin-bottom: var(--space-2);
      background: radial-gradient(
        120% 80% at 50% 0%,
        var(--color-primary-light) 0%,
        transparent 65%
      );
      border-bottom: 1px solid var(--color-border);
    }

    .landing-hero__inner {
      max-width: 42rem;
      margin: 0 auto;
      text-align: center;
      padding-top: var(--space-2);
    }

    .landing-hero__title {
      font-size: clamp(1.75rem, 4vw, 2.25rem);
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--color-text);
      line-height: 1.2;
      margin: 0 0 var(--space-3);
    }

    .landing-hero__subtitle {
      color: var(--color-text-muted);
      font-size: clamp(1rem, 2.5vw, 1.125rem);
      line-height: 1.55;
      margin: 0 auto var(--space-6);
      max-width: 36rem;
    }

    .landing-values {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3) var(--space-5);
      justify-content: center;
      align-items: flex-start;
    }

    .landing-value {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text);
      text-align: left;
      max-width: 14rem;
    }

    .landing-value__icon {
      flex-shrink: 0;
      display: flex;
      color: var(--color-primary);
    }

    .landing-value__text {
      line-height: 1.35;
    }

    .landing-main {
      width: 100%;
      max-width: 960px;
      margin: 0 auto;
      padding: 0 var(--space-2);
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
    }

    .landing-split {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-6);
      align-items: start;
    }

    @media (min-width: 768px) {
      .landing-split {
        grid-template-columns: 1fr 1fr;
        gap: var(--space-6);
      }
    }

    .landing-panel {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-sm);
      padding: var(--space-5);
    }

    .landing-panel__title {
      font-size: 1.0625rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0 0 var(--space-2);
    }

    .landing-panel__lede {
      font-size: 0.875rem;
      color: var(--color-text-muted);
      line-height: 1.5;
      margin: 0 0 var(--space-4);
    }

    .landing-panel--team .landing-panel__lede {
      margin-bottom: var(--space-4);
    }

    .btn-team-register {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: var(--space-3) var(--space-5);
      background: var(--color-primary);
      color: #fff;
      border-radius: var(--radius-md);
      font-weight: 600;
      font-size: 0.9375rem;
      text-decoration: none;
      transition: background 0.15s ease;
    }

    .btn-team-register:hover {
      background: var(--color-primary-hover);
      text-decoration: none;
    }

    .landing-panel__hint {
      margin: var(--space-4) 0 0;
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      line-height: 1.45;
    }

    .landing-section-heading {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0 0 var(--space-4);
      text-align: center;
    }

    .landing-restaurants {
      width: 100%;
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
      gap: var(--space-5);
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

    .table-code-section {
      width: 100%;
      margin: 0;
      padding: var(--space-4);
      background: var(--color-bg);
      border-radius: var(--radius-md);
      border: 1px dashed var(--color-border);
    }

    .table-code-hint {
      margin: 0 0 var(--space-3);
      font-size: 0.9375rem;
      color: var(--color-text-muted);
    }

    .table-code-row {
      display: flex;
      gap: var(--space-2);
    }

    .table-code-input {
      flex: 1;
      padding: var(--space-3) var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: 1rem;
    }

    .btn-go {
      padding: var(--space-3) var(--space-5);
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-weight: 500;
      cursor: pointer;
    }

    .btn-go:hover {
      background: var(--color-primary-hover);
    }

    .btn-go:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .table-lookup-error {
      margin: var(--space-3) 0 0;
      font-size: 0.875rem;
      color: var(--color-error);
    }

    .table-lookup-pick-title {
      margin: var(--space-4) 0 var(--space-2);
      font-weight: 600;
      font-size: 0.9375rem;
      color: var(--color-text);
    }

    .table-lookup-pick-hint {
      margin: 0 0 var(--space-3);
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }

    .table-lookup-choices {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .table-lookup-choice-btn {
      width: 100%;
      padding: var(--space-3) var(--space-4);
      text-align: center;
      background: var(--color-surface);
      color: var(--color-primary);
      border: 1px solid var(--color-primary);
      border-radius: var(--radius-md);
      font-weight: 500;
      font-size: 0.9375rem;
      cursor: pointer;
    }

    .table-lookup-choice-btn:hover {
      background: var(--color-primary);
      color: white;
    }

    .takeaway-hint {
      margin: var(--space-4) 0 0;
      text-align: center;
      font-size: 0.9375rem;
      color: var(--color-text-muted);
    }

    .link-takeaway {
      color: var(--color-primary);
      font-weight: 500;
      text-decoration: none;
    }

    .link-takeaway:hover {
      text-decoration: underline;
    }

    .tenant-name {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0;
      text-align: center;
    }

    .tenant-actions {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      width: 100%;
      align-items: stretch;
    }

    .btn-book {
      display: inline-block;
      padding: var(--space-3) var(--space-5);
      background: transparent;
      color: var(--color-primary);
      border: 1px solid var(--color-primary);
      border-radius: var(--radius-md);
      font-weight: 500;
      text-decoration: none;
      text-align: center;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .btn-book:hover {
      background: var(--color-primary);
      color: white;
    }

    .btn-login {
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

    .btn-login:hover {
      background: var(--color-primary-hover);
    }

    .landing-footer {
      margin-top: auto;
      padding-top: var(--space-6);
      align-self: center;
      max-width: 960px;
      width: 100%;
      text-align: center;
      font-size: 0.9375rem;
      color: var(--color-text-muted);
    }

    .landing-footer a {
      color: var(--color-primary);
      font-weight: 500;
      margin-left: var(--space-2);
      text-decoration: none;
    }

    .landing-footer a:hover {
      text-decoration: underline;
    }

    .landing-footer .footer-sep {
      margin: 0 var(--space-2);
      color: var(--color-text-muted);
    }

    .landing-legal-links {
      display: block;
      width: 100%;
    }
  `],
})
export class LandingComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private translate = inject(TranslateService);

  version = environment.version;
  commitHash = environment.commitHash;

  tenants = signal<TenantSummary[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  tableCode = '';
  tableLookupLoading = signal(false);
  tableLookupError = signal<string | null>(null);
  tableLookupChoices = signal<PublicTableLookupChoice[]>([]);
  legalTermsUrl = signal<string | null>(null);
  legalPrivacyUrl = signal<string | null>(null);

  ngOnInit(): void {
    this.api.getPublicLegalUrls().subscribe({
      next: (u) => {
        this.legalTermsUrl.set(u.terms_of_service_url ?? null);
        this.legalPrivacyUrl.set(u.privacy_policy_url ?? null);
      },
      error: () => {},
    });
    // `ApiService` constructor already calls `checkAuth()` once; avoid a second `/users/me` (extra 401 noise).
    this.api.waitForInitialAuthCheck().subscribe(() => {
      const user = this.api.getCurrentUser();
      if (user) {
        void this.router.navigate(['/dashboard']);
        return;
      }
      this.loadTenants();
    });
  }

  private loadTenants(): void {
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

  onTableCodeInput(): void {
    this.tableLookupError.set(null);
    if (this.tableLookupChoices().length > 0) {
      this.tableLookupChoices.set([]);
    }
  }

  goToTableMenu(): void {
    const raw = this.tableCode?.trim();
    if (!raw) {
      return;
    }
    this.tableLookupError.set(null);
    this.tableLookupChoices.set([]);
    this.tableLookupLoading.set(true);
    this.api.lookupPublicTable(raw).subscribe({
      next: (res) => {
        this.tableLookupLoading.set(false);
        if (res.table_token) {
          void this.router.navigate(['/menu', res.table_token]);
          return;
        }
        if (res.ambiguous && res.choices?.length) {
          this.tableLookupChoices.set(res.choices);
          return;
        }
        this.tableLookupError.set(this.translate.instant('LANDING.TABLE_LOOKUP_FAILED'));
      },
      error: (err) => {
        this.tableLookupLoading.set(false);
        if (err?.status === 404) {
          this.tableLookupError.set(this.translate.instant('LANDING.TABLE_NOT_FOUND'));
        } else {
          this.tableLookupError.set(this.translate.instant('LANDING.TABLE_LOOKUP_FAILED'));
        }
      },
    });
  }

  selectRestaurantForTable(choice: PublicTableLookupChoice): void {
    this.tableLookupChoices.set([]);
    this.tableLookupError.set(null);
    void this.router.navigate(['/menu', choice.table_token]);
  }
}
