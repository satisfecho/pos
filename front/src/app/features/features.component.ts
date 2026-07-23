import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LanguagePickerComponent } from '../shared/language-picker.component';
import { LandingSiteFooterComponent } from '../shared/landing-site-footer.component';

interface FeatureItem {
  titleKey: string;
  descKey: string;
}

interface FeatureCategory {
  id: string;
  titleKey: string;
  items: FeatureItem[];
}

@Component({
  selector: 'app-features',
  standalone: true,
  imports: [RouterLink, TranslateModule, LanguagePickerComponent, LandingSiteFooterComponent],
  template: `
    <div class="features-page">
      <div class="features-page__bg" aria-hidden="true"></div>

      <nav class="features-nav" aria-label="Main">
        <a routerLink="/" class="features-nav__brand">
          <span class="features-nav__mark" aria-hidden="true"></span>
          <span>{{ 'LANDING.BRAND_NAME' | translate }}</span>
        </a>
        <div class="features-nav__links">
          <a routerLink="/features" class="features-nav__link features-nav__link--active">{{ 'LANDING.NAV_FEATURES' | translate }}</a>
          <a routerLink="/" fragment="guests" class="features-nav__link">{{ 'LANDING.NAV_GUESTS' | translate }}</a>
          <a routerLink="/" fragment="demo" class="features-nav__link">{{ 'LANDING.NAV_DEMO' | translate }}</a>
        </div>
        <div class="features-nav__actions">
          <app-language-picker></app-language-picker>
          <a routerLink="/login" class="features-nav__login">{{ 'LANDING.LOGIN' | translate }}</a>
          <a routerLink="/register" class="features-nav__cta">{{ 'LANDING.CTA_CREATE_QR_MENU' | translate }}</a>
        </div>
      </nav>

      <header class="features-hero">
        <p class="features-hero__badge">{{ 'FEATURES_PAGE.BADGE' | translate }}</p>
        <h1 class="features-hero__title">{{ 'FEATURES_PAGE.TITLE' | translate }}</h1>
        <p class="features-hero__subtitle">{{ 'FEATURES_PAGE.SUBTITLE' | translate }}</p>
        <a routerLink="/register" class="features-btn features-btn--primary">{{ 'LANDING.CTA_CREATE_QR_MENU' | translate }}</a>
      </header>

      <main class="features-main">
        @for (category of categories; track category.id) {
          <section class="features-category" [attr.aria-labelledby]="'features-cat-' + category.id">
            <h2 [id]="'features-cat-' + category.id" class="features-category__title">{{ category.titleKey | translate }}</h2>
            <ul class="features-grid">
              @for (item of category.items; track item.titleKey) {
                <li class="features-card">
                  <h3 class="features-card__title">{{ item.titleKey | translate }}</h3>
                  <p class="features-card__text">{{ item.descKey | translate }}</p>
                </li>
              }
            </ul>
          </section>
        }
      </main>

      <app-landing-site-footer></app-landing-site-footer>
    </div>
  `,
  styles: [`
    .features-page {
      --fp-bg: #050506;
      --fp-surface: rgba(255, 255, 255, 0.04);
      --fp-border: rgba(255, 255, 255, 0.1);
      --fp-text: #fafafa;
      --fp-muted: rgba(250, 250, 250, 0.62);
      --fp-accent: #ff6b47;

      min-height: 100vh;
      background: var(--fp-bg);
      color: var(--fp-text);
      position: relative;
      overflow-x: clip;
    }

    .features-page__bg {
      position: absolute;
      inset: 0 0 auto;
      height: 480px;
      pointer-events: none;
      background: radial-gradient(ellipse 70% 50% at 50% 0%, rgba(255, 107, 71, 0.2) 0%, transparent 70%);
    }

    .features-nav {
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

    .features-nav__brand {
      display: inline-flex;
      align-items: center;
      gap: var(--space-3);
      color: var(--fp-text);
      font-weight: 700;
      font-size: 1.125rem;
      text-decoration: none;
    }

    .features-nav__mark {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: linear-gradient(135deg, #ff8a65 0%, #d35233 55%, #9333ea 100%);
    }

    .features-nav__links {
      display: none;
      align-items: center;
      gap: var(--space-5);
    }

    .features-nav__link {
      color: var(--fp-muted);
      font-size: 0.9375rem;
      font-weight: 500;
      text-decoration: none;
    }

    .features-nav__link--active,
    .features-nav__link:hover {
      color: var(--fp-text);
    }

    .features-nav__actions {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      margin-left: auto;
    }

    .features-nav__login {
      display: none;
      color: var(--fp-muted);
      font-size: 0.9375rem;
      font-weight: 500;
      text-decoration: none;
    }

    .features-nav__cta {
      display: inline-flex;
      padding: 0.625rem 1rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.14);
      color: var(--fp-text);
      font-size: 0.8125rem;
      font-weight: 600;
      text-decoration: none;
      white-space: nowrap;
    }

    @media (min-width: 768px) {
      .features-nav__links { display: flex; }
      .features-nav__login { display: inline-flex; }
    }

    .features-hero {
      position: relative;
      z-index: 1;
      max-width: 42rem;
      margin: 0 auto;
      padding: var(--space-6) var(--space-5) var(--space-8);
      text-align: center;
    }

    .features-hero__badge {
      display: inline-block;
      margin: 0 0 var(--space-4);
      padding: 0.375rem 0.875rem;
      border-radius: 999px;
      border: 1px solid var(--fp-border);
      font-size: 0.8125rem;
      color: var(--fp-muted);
    }

    .features-hero__title {
      margin: 0 0 var(--space-4);
      font-size: clamp(2rem, 5vw, 3rem);
      font-weight: 700;
      letter-spacing: -0.04em;
      line-height: 1.08;
    }

    .features-hero__subtitle {
      margin: 0 auto var(--space-6);
      max-width: 36rem;
      font-size: 1.0625rem;
      line-height: 1.6;
      color: var(--fp-muted);
    }

    .features-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.875rem 1.375rem;
      border-radius: 999px;
      font-size: 0.9375rem;
      font-weight: 600;
      text-decoration: none;
    }

    .features-btn--primary {
      background: #fff;
      color: #0a0a0b;
    }

    .features-main {
      position: relative;
      z-index: 1;
      max-width: 72rem;
      margin: 0 auto;
      padding: 0 var(--space-5) var(--space-8);
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
    }

    .features-category__title {
      margin: 0 0 var(--space-5);
      font-size: 1.25rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: var(--fp-accent);
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.08em;
    }

    .features-grid {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-4);
    }

    @media (min-width: 640px) {
      .features-grid { grid-template-columns: repeat(2, 1fr); }
    }

    @media (min-width: 1024px) {
      .features-grid { grid-template-columns: repeat(3, 1fr); }
    }

    .features-card {
      padding: var(--space-5);
      border-radius: 16px;
      background: var(--fp-surface);
      border: 1px solid var(--fp-border);
    }

    .features-card__title {
      margin: 0 0 var(--space-2);
      font-size: 1rem;
      font-weight: 600;
      color: var(--fp-text);
    }

    .features-card__text {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.55;
      color: var(--fp-muted);
    }
  `],
})
export class FeaturesComponent {
  readonly categories: FeatureCategory[] = [
    {
      id: 'guest',
      titleKey: 'FEATURES_PAGE.CAT_GUEST',
      items: [
        { titleKey: 'FEATURES_PAGE.FEAT_QR_MENU_TITLE', descKey: 'FEATURES_PAGE.FEAT_QR_MENU_DESC' },
        { titleKey: 'FEATURES_PAGE.FEAT_TABLE_ORDER_TITLE', descKey: 'FEATURES_PAGE.FEAT_TABLE_ORDER_DESC' },
        { titleKey: 'FEATURES_PAGE.FEAT_TAKEAWAY_TITLE', descKey: 'FEATURES_PAGE.FEAT_TAKEAWAY_DESC' },
        { titleKey: 'FEATURES_PAGE.FEAT_RESERVATIONS_TITLE', descKey: 'FEATURES_PAGE.FEAT_RESERVATIONS_DESC' },
        { titleKey: 'FEATURES_PAGE.FEAT_WAITLIST_TITLE', descKey: 'FEATURES_PAGE.FEAT_WAITLIST_DESC' },
        { titleKey: 'FEATURES_PAGE.FEAT_SATISFECHO_DELIVERY_TITLE', descKey: 'FEATURES_PAGE.FEAT_SATISFECHO_DELIVERY_DESC' },
        { titleKey: 'FEATURES_PAGE.FEAT_PAYMENTS_TITLE', descKey: 'FEATURES_PAGE.FEAT_PAYMENTS_DESC' },
        { titleKey: 'FEATURES_PAGE.FEAT_ORDER_COMMENTS_TITLE', descKey: 'FEATURES_PAGE.FEAT_ORDER_COMMENTS_DESC' },
        { titleKey: 'FEATURES_PAGE.FEAT_GUEST_FEEDBACK_TITLE', descKey: 'FEATURES_PAGE.FEAT_GUEST_FEEDBACK_DESC' },
      ],
    },
    {
      id: 'operations',
      titleKey: 'FEATURES_PAGE.CAT_OPERATIONS',
      items: [
        { titleKey: 'FEATURES_PAGE.FEAT_KITCHEN_TITLE', descKey: 'FEATURES_PAGE.FEAT_KITCHEN_DESC' },
        { titleKey: 'FEATURES_PAGE.FEAT_BAR_TITLE', descKey: 'FEATURES_PAGE.FEAT_BAR_DESC' },
        { titleKey: 'FEATURES_PAGE.FEAT_ORDERS_TITLE', descKey: 'FEATURES_PAGE.FEAT_ORDERS_DESC' },
        { titleKey: 'FEATURES_PAGE.FEAT_TABLES_TITLE', descKey: 'FEATURES_PAGE.FEAT_TABLES_DESC' },
        { titleKey: 'FEATURES_PAGE.FEAT_MY_SHIFT_TITLE', descKey: 'FEATURES_PAGE.FEAT_MY_SHIFT_DESC' },
      ],
    },
    {
      id: 'business',
      titleKey: 'FEATURES_PAGE.CAT_BUSINESS',
      items: [
        { titleKey: 'FEATURES_PAGE.FEAT_PRODUCTS_TITLE', descKey: 'FEATURES_PAGE.FEAT_PRODUCTS_DESC' },
        { titleKey: 'FEATURES_PAGE.FEAT_REPORTS_TITLE', descKey: 'FEATURES_PAGE.FEAT_REPORTS_DESC' },
        { titleKey: 'FEATURES_PAGE.FEAT_WORKING_PLAN_TITLE', descKey: 'FEATURES_PAGE.FEAT_WORKING_PLAN_DESC' },
        { titleKey: 'FEATURES_PAGE.FEAT_INVENTORY_TITLE', descKey: 'FEATURES_PAGE.FEAT_INVENTORY_DESC' },
        { titleKey: 'FEATURES_PAGE.FEAT_INVOICING_TITLE', descKey: 'FEATURES_PAGE.FEAT_INVOICING_DESC' },
        { titleKey: 'FEATURES_PAGE.FEAT_CONTRACTS_TITLE', descKey: 'FEATURES_PAGE.FEAT_CONTRACTS_DESC' },
        { titleKey: 'FEATURES_PAGE.FEAT_RESTAURANT_GROUPS_TITLE', descKey: 'FEATURES_PAGE.FEAT_RESTAURANT_GROUPS_DESC' },
      ],
    },
    {
      id: 'platform',
      titleKey: 'FEATURES_PAGE.CAT_PLATFORM',
      items: [
        { titleKey: 'FEATURES_PAGE.FEAT_PROVIDER_TITLE', descKey: 'FEATURES_PAGE.FEAT_PROVIDER_DESC' },
        { titleKey: 'FEATURES_PAGE.FEAT_COURIER_TITLE', descKey: 'FEATURES_PAGE.FEAT_COURIER_DESC' },
        { titleKey: 'FEATURES_PAGE.FEAT_USERS_TITLE', descKey: 'FEATURES_PAGE.FEAT_USERS_DESC' },
        { titleKey: 'FEATURES_PAGE.FEAT_SETTINGS_TITLE', descKey: 'FEATURES_PAGE.FEAT_SETTINGS_DESC' },
        { titleKey: 'FEATURES_PAGE.FEAT_GUIDED_SIGNUP_TITLE', descKey: 'FEATURES_PAGE.FEAT_GUIDED_SIGNUP_DESC' },
        { titleKey: 'FEATURES_PAGE.FEAT_SAAS_PAYWALL_TITLE', descKey: 'FEATURES_PAGE.FEAT_SAAS_PAYWALL_DESC' },
        { titleKey: 'FEATURES_PAGE.FEAT_PLATFORM_OPERATOR_TITLE', descKey: 'FEATURES_PAGE.FEAT_PLATFORM_OPERATOR_DESC' },
        { titleKey: 'FEATURES_PAGE.FEAT_I18N_TITLE', descKey: 'FEATURES_PAGE.FEAT_I18N_DESC' },
        { titleKey: 'FEATURES_PAGE.FEAT_OPEN_SOURCE_TITLE', descKey: 'FEATURES_PAGE.FEAT_OPEN_SOURCE_DESC' },
      ],
    },
  ];
}
