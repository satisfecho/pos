import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService, type SaasPlanTier, type SaasSubscription } from '../services/api.service';
import { LanguagePickerComponent } from '../shared/language-picker.component';
import { LandingSiteFooterComponent } from '../shared/landing-site-footer.component';

@Component({
  selector: 'app-pricing-page',
  standalone: true,
  imports: [RouterLink, TranslateModule, LanguagePickerComponent, LandingSiteFooterComponent],
  template: `
    <div class="pricing-page" data-testid="pricing-page">
      <div class="pricing-page__bg" aria-hidden="true"></div>

      <nav class="pricing-nav" aria-label="Main">
        <a routerLink="/" class="pricing-nav__brand">
          <span class="pricing-nav__mark" aria-hidden="true"></span>
          <span>{{ 'LANDING.BRAND_NAME' | translate }}</span>
        </a>
        <div class="pricing-nav__links">
          <a routerLink="/features" class="pricing-nav__link">{{ 'LANDING.NAV_FEATURES' | translate }}</a>
          <a routerLink="/pricing" class="pricing-nav__link pricing-nav__link--active">{{
            'LANDING.NAV_PRICING' | translate
          }}</a>
          <a routerLink="/about" class="pricing-nav__link">{{ 'LANDING.NAV_ABOUT' | translate }}</a>
          <a routerLink="/" fragment="guests" class="pricing-nav__link">{{ 'LANDING.NAV_GUESTS' | translate }}</a>
          <a routerLink="/" fragment="demo" class="pricing-nav__link">{{ 'LANDING.NAV_DEMO' | translate }}</a>
        </div>
        <div class="pricing-nav__actions">
          <app-language-picker></app-language-picker>
          <a routerLink="/login" class="pricing-nav__login">{{ 'LANDING.LOGIN' | translate }}</a>
          <a routerLink="/register" class="pricing-nav__cta">{{ 'LANDING.CTA_CREATE_QR_MENU' | translate }}</a>
        </div>
      </nav>

      <header class="pricing-hero">
        <p class="pricing-hero__badge">{{ 'PRICING_PAGE.BADGE' | translate }}</p>
        <h1 class="pricing-hero__title">{{ 'PRICING_PAGE.TITLE' | translate }}</h1>
        <p class="pricing-hero__subtitle">{{ 'PRICING_PAGE.SUBTITLE' | translate }}</p>
        @if (!loading() && !error()) {
          <p class="pricing-hero__callout" data-testid="pricing-qr-callout">
            {{ 'PRICING_PAGE.QR_CALLOUT' | translate }}
          </p>
        }
      </header>

      <main class="pricing-main">
        @if (loading()) {
          <p class="pricing-muted" data-testid="pricing-loading">{{ 'COMMON.LOADING' | translate }}</p>
        } @else if (error()) {
          <p class="pricing-error" data-testid="pricing-error">{{ error() | translate }}</p>
        } @else {
          <div class="pricing-tiers" data-testid="pricing-tiers">
            <article class="pricing-card pricing-card--highlight" data-plan-id="qr_menu" data-testid="pricing-qr-free">
              <h2 class="pricing-card__name">{{ 'PRICING_PAGE.QR_NAME' | translate }}</h2>
              <p class="pricing-card__lede">{{ 'PRICING_PAGE.QR_LEDE' | translate }}</p>
              <div class="pricing-card__price" data-testid="pricing-qr-price">
                <span class="pricing-card__amount">{{ 'PRICING_PAGE.QR_PRICE' | translate }}</span>
                <span class="pricing-card__period">{{ 'PRICING_PAGE.QR_FOREVER' | translate }}</span>
              </div>
              <ul class="pricing-card__includes">
                <li>{{ 'PRICING_PAGE.QR_INCLUDES_1' | translate }}</li>
                <li>{{ 'PRICING_PAGE.QR_INCLUDES_2' | translate }}</li>
                <li>{{ 'PRICING_PAGE.QR_INCLUDES_3' | translate }}</li>
              </ul>
              <a routerLink="/register" class="pricing-btn pricing-btn--primary" data-testid="pricing-cta-qr">
                {{ 'PRICING_PAGE.CTA_QR' | translate }}
              </a>
            </article>

            @for (plan of plans(); track plan.id) {
              <article class="pricing-card" [attr.data-plan-id]="plan.id" data-testid="pricing-plan-card">
                <h2 class="pricing-card__name">{{ 'PRICING_PAGE.HOSTED_NAME' | translate }}</h2>
                <p class="pricing-card__lede">{{ 'PRICING_PAGE.HOSTED_LEDE' | translate }}</p>

                <div class="pricing-card__price" data-testid="pricing-price">
                  <span class="pricing-card__amount">{{ formatPrice(plan.price_cents, plan.currency) }}</span>
                  <span class="pricing-card__period">{{ 'PRICING_PAGE.PER_MONTH' | translate }}</span>
                </div>

                <p class="pricing-card__trial" data-testid="pricing-trial">
                  {{ 'PRICING_PAGE.TRIAL_LINE' | translate: { days: plan.trial_days } }}
                </p>

                @if (billingActive()) {
                  <p class="pricing-card__billing-note" data-testid="pricing-billing-active">
                    {{ 'PRICING_PAGE.BILLING_ACTIVE_NOTE' | translate }}
                  </p>
                } @else {
                  <p class="pricing-card__billing-note" data-testid="pricing-billing-inactive">
                    {{ 'PRICING_PAGE.BILLING_INACTIVE_NOTE' | translate }}
                  </p>
                }

                <ul class="pricing-card__includes">
                  <li>{{ 'PRICING_PAGE.INCLUDE_QR' | translate }}</li>
                  <li>{{ 'PRICING_PAGE.INCLUDE_KITCHEN' | translate }}</li>
                  <li>{{ 'PRICING_PAGE.INCLUDE_RESERVATIONS' | translate }}</li>
                  <li>{{ 'PRICING_PAGE.INCLUDE_REPORTS' | translate }}</li>
                  <li>{{ 'PRICING_PAGE.INCLUDE_LOYALTY' | translate }}</li>
                </ul>

                <a routerLink="/register" class="pricing-btn pricing-btn--primary" data-testid="pricing-cta-register">
                  {{ 'PRICING_PAGE.CTA_START' | translate }}
                </a>
              </article>
            }

            <article class="pricing-card pricing-card--alt" data-plan-id="self_host" data-testid="pricing-self-host">
              <h2 class="pricing-card__name">{{ 'PRICING_PAGE.SELFHOST_NAME' | translate }}</h2>
              <p class="pricing-card__lede">{{ 'PRICING_PAGE.SELFHOST_LEDE' | translate }}</p>
              <div class="pricing-card__price">
                <span class="pricing-card__amount">{{ 'PRICING_PAGE.SELFHOST_PRICE' | translate }}</span>
              </div>
              <p class="pricing-card__trial">{{ 'PRICING_PAGE.SELFHOST_LICENSE' | translate }}</p>
              <a
                href="https://github.com/satisfecho/pos/"
                target="_blank"
                rel="noopener noreferrer"
                class="pricing-btn pricing-btn--ghost"
                data-testid="pricing-cta-github"
              >
                {{ 'PRICING_PAGE.CTA_GITHUB' | translate }}
              </a>
            </article>
          </div>

          <section class="pricing-support" data-testid="pricing-support">
            <div class="pricing-support__copy">
              <p class="pricing-support__eyebrow">{{ 'PRICING_PAGE.SUPPORT_NAME' | translate }}</p>
              <h2 class="pricing-support__headline">{{ 'PRICING_PAGE.SUPPORT_HEADLINE' | translate }}</h2>
              <p class="pricing-support__lede">{{ 'PRICING_PAGE.SUPPORT_LEDE' | translate }}</p>
              <p class="pricing-support__price" data-testid="pricing-support-price">
                {{ 'PRICING_PAGE.SUPPORT_PRICE' | translate }}
              </p>
              <p class="pricing-support__note">{{ 'PRICING_PAGE.SUPPORT_NOTE' | translate }}</p>
            </div>
            <a
              href="mailto:hello@satisfecho.de"
              class="pricing-btn pricing-btn--ghost pricing-support__cta"
              data-testid="pricing-cta-support"
            >
              {{ 'PRICING_PAGE.CTA_SUPPORT' | translate }}
            </a>
          </section>
        }
      </main>

      <app-landing-site-footer></app-landing-site-footer>
    </div>
  `,
  styles: [
    `
      .pricing-page {
        --pp-bg: #050506;
        --pp-surface: rgba(255, 255, 255, 0.04);
        --pp-border: rgba(255, 255, 255, 0.1);
        --pp-text: #fafafa;
        --pp-muted: rgba(250, 250, 250, 0.62);
        --pp-accent: #ff6b47;

        min-height: 100vh;
        background: var(--pp-bg);
        color: var(--pp-text);
        position: relative;
        overflow-x: clip;
      }

      .pricing-page__bg {
        position: absolute;
        inset: 0 0 auto;
        height: 480px;
        pointer-events: none;
        background: radial-gradient(ellipse 70% 50% at 50% 0%, rgba(255, 107, 71, 0.2) 0%, transparent 70%);
      }

      .pricing-nav {
        position: relative;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4);
        flex-wrap: wrap;
        max-width: 72rem;
        margin: 0 auto;
        padding: var(--space-4) var(--space-5);
      }

      .pricing-nav__brand {
        display: inline-flex;
        align-items: center;
        gap: var(--space-3);
        color: var(--pp-text);
        font-weight: 700;
        font-size: 1.125rem;
        text-decoration: none;
      }

      .pricing-nav__mark {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        background: linear-gradient(135deg, #ff8a65 0%, #d35233 55%, #9333ea 100%);
      }

      .pricing-nav__links {
        display: none;
        align-items: center;
        gap: var(--space-5);
      }

      .pricing-nav__link {
        color: var(--pp-muted);
        font-size: 0.9375rem;
        font-weight: 500;
        text-decoration: none;
      }

      .pricing-nav__link--active,
      .pricing-nav__link:hover {
        color: var(--pp-text);
      }

      .pricing-nav__actions {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        margin-left: auto;
      }

      .pricing-nav__login {
        display: none;
        color: var(--pp-muted);
        font-size: 0.9375rem;
        font-weight: 500;
        text-decoration: none;
      }

      .pricing-nav__cta {
        display: inline-flex;
        padding: 0.625rem 1rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.14);
        color: var(--pp-text);
        font-size: 0.8125rem;
        font-weight: 600;
        text-decoration: none;
        white-space: nowrap;
      }

      @media (min-width: 768px) {
        .pricing-nav__links {
          display: flex;
        }
        .pricing-nav__login {
          display: inline-flex;
        }
      }

      .pricing-hero {
        position: relative;
        z-index: 1;
        max-width: 42rem;
        margin: 0 auto;
        padding: var(--space-6) var(--space-5) var(--space-8);
        text-align: center;
      }

      .pricing-hero__badge {
        display: inline-block;
        margin: 0 0 var(--space-4);
        padding: 0.375rem 0.875rem;
        border-radius: 999px;
        border: 1px solid var(--pp-border);
        font-size: 0.8125rem;
        color: var(--pp-muted);
      }

      .pricing-hero__title {
        margin: 0 0 var(--space-4);
        font-size: clamp(2rem, 5vw, 3rem);
        font-weight: 700;
        letter-spacing: -0.04em;
        line-height: 1.08;
      }

      .pricing-hero__subtitle {
        margin: 0 auto;
        max-width: 36rem;
        font-size: 1.0625rem;
        line-height: 1.6;
        color: var(--pp-muted);
      }

      .pricing-hero__callout {
        margin: var(--space-5) auto 0;
        max-width: 36rem;
        padding: var(--space-3) var(--space-4);
        border-radius: 12px;
        border: 1px solid rgba(255, 107, 71, 0.35);
        background: rgba(255, 107, 71, 0.12);
        color: var(--pp-text);
        font-size: 0.9375rem;
        font-weight: 600;
        line-height: 1.45;
      }

      .pricing-main {
        position: relative;
        z-index: 1;
        max-width: 56rem;
        margin: 0 auto;
        padding: 0 var(--space-5) var(--space-8);
      }

      .pricing-muted,
      .pricing-error {
        text-align: center;
        color: var(--pp-muted);
      }

      .pricing-error {
        color: #ff8a80;
      }

      .pricing-tiers {
        display: grid;
        grid-template-columns: 1fr;
        gap: var(--space-5);
      }

      @media (min-width: 768px) {
        .pricing-tiers {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      .pricing-card {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        padding: var(--space-6);
        border-radius: 16px;
        background: var(--pp-surface);
        border: 1px solid var(--pp-border);
      }

      .pricing-card--alt {
        background: transparent;
      }

      .pricing-card--highlight {
        border-color: rgba(255, 107, 71, 0.45);
        background: rgba(255, 107, 71, 0.08);
      }

      .pricing-support {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        margin-top: var(--space-6);
        padding: var(--space-6);
        border-radius: 16px;
        border: 1px solid var(--pp-border);
        background: var(--pp-surface);
      }

      @media (min-width: 768px) {
        .pricing-support {
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
        }
      }

      .pricing-support__copy {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }

      .pricing-support__eyebrow {
        margin: 0;
        font-size: 0.8125rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--pp-muted);
      }

      .pricing-support__headline {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
        letter-spacing: -0.03em;
      }

      .pricing-support__lede,
      .pricing-support__note {
        margin: 0;
        font-size: 0.9375rem;
        line-height: 1.5;
        color: var(--pp-muted);
      }

      .pricing-support__price {
        margin: var(--space-1) 0 0;
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--pp-text);
      }

      .pricing-support__cta {
        flex-shrink: 0;
      }

      .pricing-card__name {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
      }

      .pricing-card__lede {
        margin: 0;
        font-size: 0.9375rem;
        line-height: 1.5;
        color: var(--pp-muted);
      }

      .pricing-card__price {
        display: flex;
        align-items: baseline;
        gap: var(--space-2);
        margin-top: var(--space-2);
      }

      .pricing-card__amount {
        font-size: 2.25rem;
        font-weight: 700;
        letter-spacing: -0.03em;
      }

      .pricing-card__period {
        color: var(--pp-muted);
        font-size: 0.9375rem;
      }

      .pricing-card__trial,
      .pricing-card__billing-note {
        margin: 0;
        font-size: 0.875rem;
        line-height: 1.45;
        color: var(--pp-muted);
      }

      .pricing-card__billing-note {
        padding: var(--space-3);
        border-radius: 10px;
        border: 1px solid var(--pp-border);
        background: rgba(255, 255, 255, 0.03);
      }

      .pricing-card__includes {
        margin: var(--space-2) 0 var(--space-4);
        padding-left: var(--space-5);
        color: var(--pp-text);
        line-height: 1.65;
        font-size: 0.9375rem;
        flex: 1;
      }

      .pricing-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.875rem 1.375rem;
        border-radius: 999px;
        font-size: 0.9375rem;
        font-weight: 600;
        text-decoration: none;
        text-align: center;
      }

      .pricing-btn--primary {
        background: #fff;
        color: #0a0a0b;
      }

      .pricing-btn--ghost {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid var(--pp-border);
        color: var(--pp-text);
      }
    `,
  ],
})
export class PricingPageComponent implements OnInit {
  private api = inject(ApiService);

  loading = signal(true);
  error = signal('');
  billingActive = signal(false);
  plans = signal<SaasPlanTier[]>([]);

  ngOnInit(): void {
    this.api.getSaasConfig().subscribe({
      next: (cfg: SaasSubscription) => {
        this.billingActive.set(!!cfg.enabled);
        this.plans.set(this.resolvePlans(cfg));
        this.loading.set(false);
      },
      error: (_err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set('PRICING_PAGE.LOAD_ERROR');
      },
    });
  }

  /** Prefer `plans[]` when present; fall back to flat config fields. */
  private resolvePlans(cfg: SaasSubscription): SaasPlanTier[] {
    if (cfg.plans?.length) {
      return cfg.plans.map((p) => ({
        id: p.id || 'hosted_standard',
        trial_days: p.trial_days,
        price_cents: p.price_cents,
        currency: p.currency || 'eur',
        interval: p.interval || 'month',
      }));
    }
    return [
      {
        id: 'hosted_standard',
        trial_days: cfg.trial_days,
        price_cents: cfg.price_cents,
        currency: cfg.currency || 'eur',
        interval: 'month',
      },
    ];
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
}
