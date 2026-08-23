import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LanguagePickerComponent } from '../shared/language-picker.component';
import { LandingSiteFooterComponent } from '../shared/landing-site-footer.component';

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [RouterLink, TranslateModule, LanguagePickerComponent, LandingSiteFooterComponent],
  template: `
    <div class="about-page" data-testid="about-page">
      <div class="about-page__bg" aria-hidden="true"></div>

      <nav class="about-nav" aria-label="Main">
        <a routerLink="/" class="about-nav__brand">
          <span class="about-nav__mark" aria-hidden="true"></span>
          <span>{{ 'LANDING.BRAND_NAME' | translate }}</span>
        </a>
        <div class="about-nav__links">
          <a routerLink="/features" class="about-nav__link">{{ 'LANDING.NAV_FEATURES' | translate }}</a>
          <a routerLink="/pricing" class="about-nav__link">{{ 'LANDING.NAV_PRICING' | translate }}</a>
          <a routerLink="/about" class="about-nav__link about-nav__link--active" data-testid="about-nav-about">{{
            'LANDING.NAV_ABOUT' | translate
          }}</a>
          <a routerLink="/" fragment="guests" class="about-nav__link">{{ 'LANDING.NAV_GUESTS' | translate }}</a>
          <a routerLink="/" fragment="demo" class="about-nav__link">{{ 'LANDING.NAV_DEMO' | translate }}</a>
        </div>
        <div class="about-nav__actions">
          <app-language-picker></app-language-picker>
          <a routerLink="/login" class="about-nav__login">{{ 'LANDING.LOGIN' | translate }}</a>
          <a routerLink="/register" class="about-nav__cta">{{ 'LANDING.CTA_CREATE_QR_MENU' | translate }}</a>
        </div>
      </nav>

      <header class="about-hero">
        <p class="about-hero__badge">{{ 'ABOUT_PAGE.BADGE' | translate }}</p>
        <h1 class="about-hero__title" data-testid="about-title">{{ 'ABOUT_PAGE.TITLE' | translate }}</h1>
        <p class="about-hero__subtitle">{{ 'ABOUT_PAGE.SUBTITLE' | translate }}</p>
      </header>

      <main class="about-main">
        <section class="about-section" aria-labelledby="about-product-heading">
          <h2 id="about-product-heading" class="about-section__title">{{ 'ABOUT_PAGE.PRODUCT_TITLE' | translate }}</h2>
          <p class="about-section__body">{{ 'ABOUT_PAGE.PRODUCT_BODY' | translate }}</p>
        </section>

        <section class="about-section" aria-labelledby="about-company-heading" data-testid="about-company">
          <h2 id="about-company-heading" class="about-section__title">{{ 'ABOUT_PAGE.COMPANY_TITLE' | translate }}</h2>
          <p class="about-section__body">{{ 'ABOUT_PAGE.COMPANY_BODY' | translate }}</p>
        </section>

        <section class="about-section" aria-labelledby="about-open-source-heading">
          <h2 id="about-open-source-heading" class="about-section__title">{{ 'ABOUT_PAGE.OPEN_SOURCE_TITLE' | translate }}</h2>
          <p class="about-section__body">{{ 'ABOUT_PAGE.OPEN_SOURCE_BODY' | translate }}</p>
        </section>

        <section class="about-section" aria-labelledby="about-manual-heading" data-testid="about-user-manual">
          <h2 id="about-manual-heading" class="about-section__title">{{ 'ABOUT_PAGE.MANUAL_TITLE' | translate }}</h2>
          <p class="about-section__body">
            {{ 'ABOUT_PAGE.MANUAL_BODY' | translate }}
            <a href="/manual-usuario/" class="about-section__link" data-testid="about-manual-link">{{
              'LANDING.USER_MANUAL' | translate
            }}</a>
          </p>
        </section>

        <section class="about-section" aria-labelledby="about-contact-heading">
          <h2 id="about-contact-heading" class="about-section__title">{{ 'ABOUT_PAGE.CONTACT_TITLE' | translate }}</h2>
          <p class="about-section__body">
            {{ 'ABOUT_PAGE.CONTACT_BODY' | translate }}
            <a href="mailto:hello@satisfecho.de" class="about-section__link">hello@satisfecho.de</a>
          </p>
        </section>
      </main>

      <app-landing-site-footer></app-landing-site-footer>
    </div>
  `,
  styles: [
    `
      .about-page {
        --ap-bg: #050506;
        --ap-surface: rgba(255, 255, 255, 0.04);
        --ap-border: rgba(255, 255, 255, 0.1);
        --ap-text: #fafafa;
        --ap-muted: rgba(250, 250, 250, 0.62);
        --ap-accent: #ff6b47;

        min-height: 100vh;
        background: var(--ap-bg);
        color: var(--ap-text);
        position: relative;
        overflow-x: clip;
      }

      .about-page__bg {
        position: absolute;
        inset: 0 0 auto;
        height: 480px;
        pointer-events: none;
        background: radial-gradient(ellipse 70% 50% at 50% 0%, rgba(255, 107, 71, 0.2) 0%, transparent 70%);
      }

      .about-nav {
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

      .about-nav__brand {
        display: inline-flex;
        align-items: center;
        gap: var(--space-3);
        color: var(--ap-text);
        font-weight: 700;
        font-size: 1.125rem;
        text-decoration: none;
      }

      .about-nav__mark {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        background: linear-gradient(135deg, #ff8a65 0%, #d35233 55%, #9333ea 100%);
      }

      .about-nav__links {
        display: none;
        align-items: center;
        gap: var(--space-5);
      }

      .about-nav__link {
        color: var(--ap-muted);
        font-size: 0.9375rem;
        font-weight: 500;
        text-decoration: none;
      }

      .about-nav__link--active,
      .about-nav__link:hover {
        color: var(--ap-text);
      }

      .about-nav__actions {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        margin-left: auto;
      }

      .about-nav__login {
        display: none;
        color: var(--ap-muted);
        font-size: 0.9375rem;
        font-weight: 500;
        text-decoration: none;
      }

      .about-nav__cta {
        display: inline-flex;
        padding: 0.625rem 1rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.14);
        color: var(--ap-text);
        font-size: 0.8125rem;
        font-weight: 600;
        text-decoration: none;
        white-space: nowrap;
      }

      @media (min-width: 768px) {
        .about-nav__links {
          display: flex;
        }
        .about-nav__login {
          display: inline-flex;
        }
      }

      .about-hero {
        position: relative;
        z-index: 1;
        max-width: 42rem;
        margin: 0 auto;
        padding: var(--space-6) var(--space-5) var(--space-8);
        text-align: center;
      }

      .about-hero__badge {
        display: inline-block;
        margin: 0 0 var(--space-4);
        padding: 0.375rem 0.875rem;
        border-radius: 999px;
        border: 1px solid var(--ap-border);
        font-size: 0.8125rem;
        color: var(--ap-muted);
      }

      .about-hero__title {
        margin: 0 0 var(--space-4);
        font-size: clamp(2rem, 5vw, 3rem);
        font-weight: 700;
        letter-spacing: -0.04em;
        line-height: 1.08;
      }

      .about-hero__subtitle {
        margin: 0 auto;
        max-width: 36rem;
        font-size: 1.0625rem;
        line-height: 1.6;
        color: var(--ap-muted);
      }

      .about-main {
        position: relative;
        z-index: 1;
        max-width: 40rem;
        margin: 0 auto;
        padding: 0 var(--space-5) var(--space-8);
        display: flex;
        flex-direction: column;
        gap: var(--space-7);
      }

      .about-section {
        padding: var(--space-5);
        border-radius: 16px;
        background: var(--ap-surface);
        border: 1px solid var(--ap-border);
      }

      .about-section__title {
        margin: 0 0 var(--space-3);
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--ap-accent);
      }

      .about-section__body {
        margin: 0;
        font-size: 1rem;
        line-height: 1.65;
        color: rgba(250, 250, 250, 0.88);
      }

      .about-section__link {
        color: var(--ap-text);
        font-weight: 600;
        text-decoration: underline;
        text-underline-offset: 2px;
      }

      .about-section__link:hover {
        color: #fff;
      }
    `,
  ],
})
export class AboutPageComponent {}
