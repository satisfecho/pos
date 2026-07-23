import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService, type SaasSubscription } from '../services/api.service';
import { ApiErrorMessageService } from '../services/api-error-message.service';
import { LanguagePickerComponent } from '../shared/language-picker.component';

@Component({
  selector: 'app-paywall',
  standalone: true,
  imports: [TranslateModule, RouterLink, LanguagePickerComponent],
  template: `
    <div class="paywall-page" data-testid="paywall-page">
      <div class="paywall-card">
        <div class="paywall-header">
          <div>
            <p class="brand">Satisfecho</p>
            <h1>{{ 'PAYWALL.TITLE' | translate }}</h1>
            <p class="lead">{{ 'PAYWALL.LEAD' | translate }}</p>
          </div>
          <app-language-picker></app-language-picker>
        </div>

        @if (loading()) {
          <p class="muted">{{ 'COMMON.LOADING' | translate }}</p>
        } @else if (sub(); as s) {
          <div class="price-block" data-testid="paywall-price">
            <span class="price">{{ formatPrice(s.price_cents, s.currency) }}</span>
            <span class="period">{{ 'PAYWALL.PER_MONTH' | translate }}</span>
          </div>
          <ul class="features">
            <li>{{ 'PAYWALL.FEATURE_TRIAL' | translate: { days: s.trial_days } }}</li>
            <li>{{ 'PAYWALL.FEATURE_CANCEL' | translate }}</li>
            <li>{{ 'PAYWALL.FEATURE_ALL' | translate }}</li>
          </ul>

          @if (error()) {
            <div class="error-banner">{{ error() }}</div>
          }

          <div class="cta-stack">
            @if (!s.has_access) {
              <button
                type="button"
                class="btn-primary"
                data-testid="paywall-start-trial"
                [disabled]="busy()"
                (click)="startTrial()"
              >
                {{ busy() ? ('COMMON.SAVING' | translate) : ('PAYWALL.START_TRIAL' | translate: { days: s.trial_days }) }}
              </button>
              @if (s.stripe_checkout_available) {
                <button
                  type="button"
                  class="btn-secondary"
                  data-testid="paywall-subscribe"
                  [disabled]="busy()"
                  (click)="subscribe()"
                >
                  {{ 'PAYWALL.SUBSCRIBE' | translate }}
                </button>
              }
            } @else {
              <p class="success" data-testid="paywall-unlocked">{{ 'PAYWALL.ALREADY_ACCESS' | translate }}</p>
              <a routerLink="/dashboard" class="btn-primary btn-link">{{ 'PAYWALL.GO_DASHBOARD' | translate }}</a>
            }
          </div>
        }

        <div class="foot">
          <a routerLink="/login">{{ 'AUTH.SIGN_IN_LINK' | translate }}</a>
          <button type="button" class="linkish" (click)="logout()">{{ 'AUTH.LOGOUT' | translate }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .paywall-page {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--space-5);
        background:
          radial-gradient(ellipse at 20% 0%, rgba(30, 90, 60, 0.12), transparent 50%),
          radial-gradient(ellipse at 80% 100%, rgba(20, 60, 100, 0.1), transparent 45%),
          var(--color-bg);
      }
      .paywall-card {
        width: 100%;
        max-width: 440px;
        background: var(--color-surface);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        padding: var(--space-8);
      }
      .paywall-header {
        display: flex;
        justify-content: space-between;
        gap: var(--space-4);
        margin-bottom: var(--space-6);
      }
      .brand {
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--color-text);
        margin: 0 0 var(--space-3);
        letter-spacing: -0.02em;
      }
      h1 {
        font-size: 1.35rem;
        margin: 0 0 var(--space-2);
        color: var(--color-text);
      }
      .lead {
        color: var(--color-text-muted);
        margin: 0;
        line-height: 1.45;
        font-size: 0.95rem;
      }
      .price-block {
        display: flex;
        align-items: baseline;
        gap: var(--space-2);
        margin-bottom: var(--space-5);
      }
      .price {
        font-size: 2.25rem;
        font-weight: 700;
        color: var(--color-text);
      }
      .period {
        color: var(--color-text-muted);
      }
      .features {
        margin: 0 0 var(--space-6);
        padding-left: var(--space-5);
        color: var(--color-text);
        line-height: 1.6;
      }
      .cta-stack {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }
      .btn-primary,
      .btn-secondary {
        padding: var(--space-3) var(--space-5);
        border-radius: var(--radius-md);
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        border: none;
        text-align: center;
      }
      .btn-primary {
        background: var(--color-primary);
        color: #fff;
      }
      .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .btn-secondary {
        background: transparent;
        border: 1px solid var(--color-border);
        color: var(--color-text);
      }
      .btn-link {
        text-decoration: none;
        display: block;
      }
      .error-banner {
        background: rgba(220, 38, 38, 0.1);
        color: var(--color-error);
        padding: var(--space-3);
        border-radius: var(--radius-md);
        margin-bottom: var(--space-4);
        font-size: 0.875rem;
      }
      .success {
        color: var(--color-text);
        margin: 0;
      }
      .muted {
        color: var(--color-text-muted);
      }
      .foot {
        margin-top: var(--space-6);
        display: flex;
        justify-content: space-between;
        font-size: 0.875rem;
      }
      .foot a,
      .linkish {
        color: var(--color-primary);
        background: none;
        border: none;
        cursor: pointer;
        font-size: inherit;
        padding: 0;
      }
    `,
  ],
})
export class PaywallComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private apiErr = inject(ApiErrorMessageService);
  translate = inject(TranslateService);

  loading = signal(true);
  busy = signal(false);
  error = signal('');
  sub = signal<SaasSubscription | null>(null);

  ngOnInit(): void {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');
    if (sessionId) {
      this.busy.set(true);
      this.api.confirmSaasCheckout(sessionId).subscribe({
        next: (s: SaasSubscription) => {
          this.sub.set(s);
          this.busy.set(false);
          this.loading.set(false);
          if (s.has_access) {
            void this.router.navigate(['/dashboard']);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(this.apiErr.fromHttpError(err, 'COMMON.API_REQUEST_FAILED'));
          this.busy.set(false);
          this.load();
        },
      });
      return;
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.getSaasSubscription().subscribe({
      next: (s: SaasSubscription) => {
        this.sub.set(s);
        this.loading.set(false);
        if (!s.enabled) {
          void this.router.navigate(['/dashboard']);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 401) {
          void this.router.navigate(['/login']);
          return;
        }
        this.error.set(this.apiErr.fromHttpError(err, 'COMMON.API_REQUEST_FAILED'));
      },
    });
  }

  formatPrice(cents: number, currency: string): string {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: (currency || 'EUR').toUpperCase(),
        maximumFractionDigits: 0,
      }).format(cents / 100);
    } catch {
      return `${(cents / 100).toFixed(0)} ${(currency || 'eur').toUpperCase()}`;
    }
  }

  startTrial(): void {
    this.error.set('');
    this.busy.set(true);
    this.api.startSaasTrial().subscribe({
      next: (s: SaasSubscription) => {
        this.sub.set(s);
        this.busy.set(false);
        if (s.has_access) {
          void this.router.navigate(['/dashboard']);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(this.apiErr.fromHttpError(err, 'COMMON.API_REQUEST_FAILED'));
      },
    });
  }

  subscribe(): void {
    this.error.set('');
    this.busy.set(true);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const successUrl = `${origin}/paywall?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/paywall`;
    this.api.createSaasCheckoutSession(successUrl, cancelUrl).subscribe({
      next: (res: { url: string }) => {
        this.busy.set(false);
        if (res.url) {
          window.location.href = res.url;
        }
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(this.apiErr.fromHttpError(err, 'COMMON.API_REQUEST_FAILED'));
      },
    });
  }

  logout(): void {
    this.api.logout().subscribe({
      next: () => void this.router.navigate(['/login']),
      error: () => void this.router.navigate(['/login']),
    });
  }
}
