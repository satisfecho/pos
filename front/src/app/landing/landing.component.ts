import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService, TenantSummary } from '../services/api.service';
import { FormsModule } from '@angular/forms';
import { LanguagePickerComponent } from '../shared/language-picker.component';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, TranslateModule, FormsModule, LanguagePickerComponent],
  template: `
    <div class="landing-page">
      <app-language-picker class="landing-language-picker"></app-language-picker>
      <div class="landing-header">
        <h1>{{ 'LANDING.TITLE' | translate }}</h1>
        <p class="subtitle">{{ 'LANDING.SUBTITLE' | translate }}</p>
      </div>

      <section class="table-code-section" aria-label="{{ 'LANDING.AT_TABLE_LABEL' | translate }}">
        <p class="table-code-hint">{{ 'LANDING.AT_TABLE_HINT' | translate }}</p>
        <div class="table-code-row">
          <input
            type="text"
            [(ngModel)]="tableCode"
            [placeholder]="'LANDING.TABLE_CODE_PLACEHOLDER' | translate"
            class="table-code-input"
            (keyup.enter)="goToTableMenu()"
          />
          <button type="button" class="btn-go" (click)="goToTableMenu()">
            {{ 'LANDING.GO' | translate }}
          </button>
        </div>
      </section>

      @if (loading()) {
        <p class="loading">{{ 'COMMON.LOADING' | translate }}</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else if (tenants().length === 0) {
        <p class="empty">{{ 'LANDING.NO_TENANTS' | translate }}</p>
      } @else {
        <div class="tenant-grid">
          @for (tenant of tenants(); track tenant.id) {
            <div class="tenant-card">
              @if (getLogoUrl(tenant)) {
                <img [src]="getLogoUrl(tenant)!" [alt]="tenant.name" class="tenant-logo" />
              }
              <h2 class="tenant-name">{{ tenant.name }}</h2>
              <div class="tenant-actions">
                <a [routerLink]="['/book', tenant.id]" class="btn-book">
                  {{ 'LANDING.BOOK_TABLE' | translate }}
                </a>
                <a [routerLink]="['/login']" [queryParams]="{ tenant: tenant.id }" class="btn-login">
                  {{ 'LANDING.LOGIN' | translate }}
                </a>
              </div>
            </div>
          }
        </div>
      }

      <div class="landing-footer">
        <span>{{ 'AUTH.DONT_HAVE_ACCOUNT' | translate }}</span>
        <a routerLink="/register">{{ 'AUTH.CREATE_ACCOUNT' | translate }}</a>
        <span class="footer-sep">·</span>
        <a routerLink="/provider/login" data-testid="landing-provider-login">Provider login</a>
        <span class="footer-sep">·</span>
        <a routerLink="/provider/register" data-testid="landing-provider-register">Register as provider</a>
      </div>
      <div class="landing-version-bar" data-testid="landing-version">{{ version || '0.0.0' }} <span class="landing-commit">{{ commitHash || '' }}</span></div>
    </div>
  `,
  styles: [`
    .landing-page {
      min-height: 100vh;
      padding: var(--space-8) var(--space-5) calc(var(--space-6) + 28px);
      background: var(--color-bg);
      display: flex;
      flex-direction: column;
      align-items: center;
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

    .landing-header {
      text-align: center;
      margin-bottom: var(--space-8);

      h1 {
        font-size: 1.75rem;
        font-weight: 600;
        color: var(--color-text);
        margin-bottom: var(--space-2);
      }

      .subtitle {
        color: var(--color-text-muted);
        font-size: 1rem;
      }
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

    .table-code-section {
      width: 100%;
      max-width: 400px;
      margin-bottom: var(--space-8);
      padding: var(--space-5);
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
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
      padding-top: var(--space-8);
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
  `],
})
export class LandingComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  version = environment.version;
  commitHash = environment.commitHash;

  tenants = signal<TenantSummary[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  tableCode = '';

  ngOnInit(): void {
    this.api.checkAuth().subscribe({
      next: (user) => {
        if (user) {
          this.router.navigate(['/dashboard']);
          return;
        }
        this.loadTenants();
      },
      error: () => this.loadTenants(),
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

  goToTableMenu(): void {
    const token = this.tableCode?.trim();
    if (token) {
      this.router.navigate(['/menu', token]);
    }
  }
}
