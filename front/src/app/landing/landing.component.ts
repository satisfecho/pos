import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { QRCodeComponent } from 'angularx-qrcode';
import { ApiService, PublicTableLookupChoice, TenantSummary } from '../services/api.service';
import { FormsModule } from '@angular/forms';
import { LanguagePickerComponent } from '../shared/language-picker.component';
import { environment } from '../../environments/environment';
import { ApiErrorMessageService } from '../services/api-error-message.service';

/** Only tenant 1 is shown on the public landing page (displayed as Restaurant Demo). */
const LANDING_DEMO_TENANT_ID = 1;

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, TranslateModule, FormsModule, LanguagePickerComponent, QRCodeComponent],
  template: `
    <div class="landing-page">
      <div class="landing-hero__bg" aria-hidden="true">
        <div class="landing-hero__orb landing-hero__orb--1"></div>
        <div class="landing-hero__orb landing-hero__orb--2"></div>
        <div class="landing-hero__orb landing-hero__orb--3"></div>
      </div>

      <nav class="landing-nav" aria-label="Main">
        <a routerLink="/" class="landing-nav__brand">
          <span class="landing-nav__mark" aria-hidden="true"></span>
          <span>{{ 'LANDING.BRAND_NAME' | translate }}</span>
        </a>
        <div class="landing-nav__links">
          <a href="#features" class="landing-nav__link">{{ 'LANDING.NAV_FEATURES' | translate }}</a>
          <a href="#guests" class="landing-nav__link">{{ 'LANDING.NAV_GUESTS' | translate }}</a>
          <a href="#demo" class="landing-nav__link">{{ 'LANDING.NAV_DEMO' | translate }}</a>
        </div>
        <div class="landing-nav__actions">
          <app-language-picker class="landing-language-picker"></app-language-picker>
          <a routerLink="/login" class="landing-nav__login">{{ 'LANDING.LOGIN' | translate }}</a>
          <a routerLink="/register" class="landing-nav__cta" data-testid="landing-hero-cta">
            {{ 'LANDING.CTA_CREATE_QR_MENU' | translate }}
          </a>
        </div>
      </nav>

      <header class="landing-hero">
        <div class="landing-hero__content">
          <div class="landing-hero__copy">
            <p class="landing-badge">
              <span class="landing-badge__dot" aria-hidden="true"></span>
              {{ 'LANDING.BADGE' | translate }}
            </p>
            <h1 class="landing-hero__title">
              {{ 'LANDING.TITLE' | translate }}
              <span class="landing-hero__title-accent">{{ 'LANDING.TITLE_ACCENT' | translate }}</span>
            </h1>
            <p class="landing-hero__subtitle">{{ 'LANDING.SUBTITLE' | translate }}</p>
            <div class="landing-hero__actions">
              <a routerLink="/register" class="landing-btn landing-btn--primary" data-testid="landing-primary-cta">
                {{ 'LANDING.CTA_CREATE_QR_MENU' | translate }}
              </a>
              <a href="#demo" class="landing-btn landing-btn--ghost">
                {{ 'LANDING.CTA_VIEW_DEMO' | translate }}
              </a>
            </div>
          </div>

          <div class="landing-hero__visual" aria-hidden="true">
            <div class="landing-phone">
              <div class="landing-phone__screen">
                <div class="landing-phone__header">
                  <span class="landing-phone__dot"></span>
                  <span class="landing-phone__dot"></span>
                  <span class="landing-phone__dot"></span>
                </div>
                <div class="landing-phone__menu">
                  <div class="landing-phone__line landing-phone__line--wide"></div>
                  <div class="landing-phone__line"></div>
                  <div class="landing-phone__line"></div>
                  <div class="landing-phone__line landing-phone__line--short"></div>
                </div>
                <div class="landing-phone__qr">
                  <svg viewBox="0 0 64 64" width="72" height="72" aria-hidden="true">
                    <rect width="64" height="64" fill="#fff" rx="4" />
                    <rect x="8" y="8" width="18" height="18" fill="#0a0a0b" />
                    <rect x="38" y="8" width="18" height="18" fill="#0a0a0b" />
                    <rect x="8" y="38" width="18" height="18" fill="#0a0a0b" />
                    <rect x="12" y="12" width="10" height="10" fill="#fff" />
                    <rect x="42" y="12" width="10" height="10" fill="#fff" />
                    <rect x="12" y="42" width="10" height="10" fill="#fff" />
                    <rect x="32" y="32" width="6" height="6" fill="#0a0a0b" />
                    <rect x="42" y="42" width="8" height="8" fill="#0a0a0b" />
                    <rect x="52" y="32" width="4" height="4" fill="#0a0a0b" />
                    <rect x="32" y="48" width="4" height="4" fill="#0a0a0b" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section id="features" class="landing-features" aria-labelledby="landing-features-heading">
        <h2 id="landing-features-heading" class="landing-section-title">
          {{ 'LANDING.FEATURES_HEADING' | translate }}
        </h2>
        <ul class="landing-feature-grid" aria-label="{{ 'LANDING.VALUES_LABEL' | translate }}">
          <li class="landing-feature-card">
            <span class="landing-feature-card__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <h3 class="landing-feature-card__title">{{ 'LANDING.VALUE_BOOKING' | translate }}</h3>
            <p class="landing-feature-card__text">{{ 'LANDING.VALUE_BOOKING_DESC' | translate }}</p>
          </li>
          <li class="landing-feature-card">
            <span class="landing-feature-card__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <path d="M14 14h7v7h-7z" />
              </svg>
            </span>
            <h3 class="landing-feature-card__title">{{ 'LANDING.VALUE_DINE_IN' | translate }}</h3>
            <p class="landing-feature-card__text">{{ 'LANDING.VALUE_DINE_IN_DESC' | translate }}</p>
          </li>
          <li class="landing-feature-card">
            <span class="landing-feature-card__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <h3 class="landing-feature-card__title">{{ 'LANDING.VALUE_STAFF' | translate }}</h3>
            <p class="landing-feature-card__text">{{ 'LANDING.VALUE_STAFF_DESC' | translate }}</p>
          </li>
        </ul>
      </section>

      <main class="landing-main">
        <div id="guests" class="landing-guest">
          <section class="landing-panel landing-panel--guests" aria-labelledby="landing-guests-heading">
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
        </div>

        <section id="demo" class="landing-restaurants" aria-labelledby="landing-restaurants-heading">
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
                <article class="tenant-card" data-testid="landing-tenant-card">
                  @if (getLogoUrl(tenant)) {
                    <img [src]="getLogoUrl(tenant)!" [alt]="getTenantDisplayName(tenant)" class="tenant-logo" />
                  }
                  <h3 class="tenant-name" data-testid="landing-tenant-name">{{ getTenantDisplayName(tenant) }}</h3>
                  <div class="tenant-qr-section">
                    <p class="tenant-qr-hint">{{ 'LANDING.PUBLIC_MENU_QR_HINT' | translate }}</p>
                    <a
                      class="tenant-qr-link"
                      [routerLink]="['/public-menu', tenant.id]"
                      [attr.aria-label]="'LANDING.PUBLIC_MENU_QR_LINK_ARIA' | translate: { name: getTenantDisplayName(tenant) }"
                    >
                      <div class="tenant-qr-wrapper">
                        <qrcode
                          [qrdata]="getPublicMenuUrl(tenant.id)"
                          [width]="140"
                          [errorCorrectionLevel]="'M'"
                          cssClass="tenant-qr-code"
                        ></qrcode>
                      </div>
                    </a>
                  </div>
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

      <section class="landing-bottom-cta" aria-labelledby="landing-bottom-cta-heading">
        <h2 id="landing-bottom-cta-heading" class="landing-bottom-cta__title">
          {{ 'LANDING.BOTTOM_CTA_TITLE' | translate }}
        </h2>
        <p class="landing-bottom-cta__text">{{ 'LANDING.BOTTOM_CTA_TEXT' | translate }}</p>
        <a routerLink="/register" class="landing-btn landing-btn--primary landing-btn--large">
          {{ 'LANDING.CTA_CREATE_QR_MENU' | translate }}
        </a>
      </section>

      <div class="landing-footer">
        <span>{{ 'AUTH.DONT_HAVE_ACCOUNT' | translate }}</span>
        <a routerLink="/register">{{ 'AUTH.CREATE_ACCOUNT' | translate }}</a>
        <span class="footer-sep">·</span>
        <a routerLink="/provider/login" data-testid="landing-provider-login">{{ 'LANDING.PROVIDER_LOGIN' | translate }}</a>
        <span class="footer-sep">·</span>
        <a routerLink="/courier/login" data-testid="landing-courier-login">{{ 'LANDING.COURIER_LOGIN' | translate }}</a>
        <span class="footer-sep">·</span>
        <a routerLink="/provider/register" data-testid="landing-provider-register">{{ 'LANDING.REGISTER_AS_PROVIDER' | translate }}</a>
        <span class="footer-sep">·</span>
        <a href="mailto:sales@satisfecho.de" data-testid="landing-contact-us">{{ 'LANDING.CONTACT_US' | translate }}</a>
        <span class="footer-sep">·</span>
        <a routerLink="/terms" data-testid="landing-terms">{{ 'LEGAL.TERMS_OF_SERVICE' | translate }}</a>
        <span class="footer-sep">·</span>
        <a routerLink="/privacy" data-testid="landing-privacy">{{ 'LEGAL.PRIVACY_POLICY' | translate }}</a>
      </div>

      <div class="landing-version-bar" data-testid="landing-version">
        <div class="landing-version-bar__row">
          <span class="landing-version-meta"
            >{{ version || '0.0.0' }} <span class="landing-commit">{{ commitHash || '' }}</span></span
          >
          <a
            href="https://github.com/satisfecho/pos/"
            target="_blank"
            rel="noopener noreferrer"
            class="landing-version-github"
            data-testid="landing-github"
            [attr.aria-label]="'LANDING.GITHUB_REPO' | translate"
          >
            <svg
              class="landing-github-icon"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              aria-hidden="true"
              focusable="false"
            >
              <path
                fill="currentColor"
                d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.694.825.576C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"
              />
            </svg>
          </a>
        </div>
        <p class="landing-version-tagline">{{ 'LANDING.OPEN_SOURCE_TAGLINE' | translate }}</p>
      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');

    .landing-page {
      --landing-bg: #050506;
      --landing-surface: rgba(255, 255, 255, 0.04);
      --landing-border: rgba(255, 255, 255, 0.1);
      --landing-text: #fafafa;
      --landing-muted: rgba(250, 250, 250, 0.62);
      --landing-accent: #ff6b47;
      --landing-accent-soft: rgba(255, 107, 71, 0.18);
      --landing-light-bg: #faf9f7;
      --landing-light-text: #1c1917;
      --landing-light-muted: #78716c;

      min-height: 100vh;
      padding-bottom: calc(var(--space-8) + 72px);
      background: var(--landing-bg);
      color: var(--landing-text);
      position: relative;
      overflow-x: clip;
    }

    .landing-hero__bg {
      position: absolute;
      inset: 0 0 auto;
      height: min(920px, 120vh);
      pointer-events: none;
      overflow: hidden;
      z-index: 0;
    }

    .landing-hero__orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.55;
      animation: landing-float 18s ease-in-out infinite;
    }

    .landing-hero__orb--1 {
      width: min(680px, 90vw);
      height: min(680px, 90vw);
      top: -18%;
      left: 50%;
      transform: translateX(-50%);
      background: radial-gradient(circle, rgba(255, 107, 71, 0.75) 0%, rgba(211, 82, 51, 0.2) 45%, transparent 70%);
    }

    .landing-hero__orb--2 {
      width: 420px;
      height: 420px;
      top: 18%;
      right: -8%;
      background: radial-gradient(circle, rgba(139, 92, 246, 0.45) 0%, transparent 70%);
      animation-delay: -6s;
    }

    .landing-hero__orb--3 {
      width: 360px;
      height: 360px;
      bottom: 8%;
      left: -6%;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.35) 0%, transparent 70%);
      animation-delay: -12s;
    }

    @keyframes landing-float {
      0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
      50% { transform: translate3d(0, -24px, 0) scale(1.04); }
    }

    .landing-nav {
      position: relative;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      flex-wrap: wrap;
      max-width: 72rem;
      margin: 0 auto;
      padding: var(--space-4) var(--space-5);
    }

    .landing-nav__brand {
      display: inline-flex;
      align-items: center;
      gap: var(--space-3);
      color: var(--landing-text);
      font-weight: 700;
      font-size: 1.125rem;
      letter-spacing: -0.02em;
      text-decoration: none;
    }

    .landing-nav__mark {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: linear-gradient(135deg, #ff8a65 0%, #d35233 55%, #9333ea 100%);
      box-shadow: 0 8px 24px rgba(211, 82, 51, 0.35);
    }

    .landing-nav__links {
      display: none;
      align-items: center;
      gap: var(--space-5);
    }

    .landing-nav__link {
      color: var(--landing-muted);
      font-size: 0.9375rem;
      font-weight: 500;
      text-decoration: none;
      transition: color 0.15s ease;
    }

    .landing-nav__link:hover {
      color: var(--landing-text);
      text-decoration: none;
    }

    .landing-nav__actions {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      margin-left: auto;
    }

    .landing-language-picker {
      z-index: 10;
    }

    .landing-nav__login {
      display: none;
      color: var(--landing-muted);
      font-size: 0.9375rem;
      font-weight: 500;
      text-decoration: none;
      padding: var(--space-2) var(--space-3);
    }

    .landing-nav__login:hover {
      color: var(--landing-text);
      text-decoration: none;
    }

    .landing-nav__cta {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.625rem 1rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.14);
      color: var(--landing-text);
      font-size: 0.8125rem;
      font-weight: 600;
      text-decoration: none;
      white-space: nowrap;
      transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
    }

    .landing-nav__cta:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.22);
      text-decoration: none;
      transform: translateY(-1px);
    }

    @media (min-width: 768px) {
      .landing-nav__links {
        display: flex;
      }

      .landing-nav__login {
        display: inline-flex;
      }

      .landing-nav__cta {
        font-size: 0.875rem;
        padding: 0.6875rem 1.125rem;
      }
    }

    .landing-hero {
      position: relative;
      z-index: 1;
      max-width: 72rem;
      margin: 0 auto;
      padding: var(--space-6) var(--space-5) var(--space-8);
    }

    .landing-hero__content {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-8);
      align-items: center;
    }

    @media (min-width: 960px) {
      .landing-hero__content {
        grid-template-columns: 1.05fr 0.95fr;
        gap: var(--space-6);
      }
    }

    .landing-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      margin: 0 0 var(--space-5);
      padding: 0.375rem 0.875rem 0.375rem 0.625rem;
      border-radius: 999px;
      border: 1px solid var(--landing-border);
      background: rgba(255, 255, 255, 0.04);
      font-size: 0.8125rem;
      color: var(--landing-muted);
    }

    .landing-badge__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ff8a65, #d35233);
      box-shadow: 0 0 12px rgba(255, 107, 71, 0.8);
    }

    .landing-hero__title {
      margin: 0 0 var(--space-4);
      font-size: clamp(2.5rem, 6vw, 4.25rem);
      font-weight: 700;
      line-height: 1.02;
      letter-spacing: -0.04em;
      color: var(--landing-text);
    }

    .landing-hero__title-accent {
      display: block;
      font-family: 'Instrument Serif', Georgia, 'Times New Roman', serif;
      font-style: italic;
      font-weight: 400;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.72) 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    .landing-hero__subtitle {
      margin: 0 0 var(--space-6);
      max-width: 34rem;
      font-size: clamp(1rem, 2.2vw, 1.1875rem);
      line-height: 1.6;
      color: var(--landing-muted);
    }

    .landing-hero__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .landing-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.875rem 1.375rem;
      border-radius: 999px;
      font-size: 0.9375rem;
      font-weight: 600;
      text-decoration: none;
      transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
    }

    .landing-btn:hover {
      text-decoration: none;
      transform: translateY(-1px);
    }

    .landing-btn--primary {
      background: #fff;
      color: #0a0a0b;
      box-shadow: 0 12px 40px rgba(255, 255, 255, 0.12);
    }

    .landing-btn--primary:hover {
      box-shadow: 0 16px 48px rgba(255, 255, 255, 0.18);
    }

    .landing-btn--ghost {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.14);
      color: var(--landing-text);
    }

    .landing-btn--ghost:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .landing-btn--large {
      padding: 1rem 1.75rem;
      font-size: 1rem;
    }

    .landing-hero__visual {
      display: flex;
      justify-content: center;
      perspective: 1200px;
    }

    .landing-phone {
      width: min(100%, 280px);
      padding: 12px;
      border-radius: 36px;
      background: linear-gradient(160deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.04));
      border: 1px solid rgba(255, 255, 255, 0.14);
      box-shadow:
        0 30px 80px rgba(0, 0, 0, 0.45),
        inset 0 1px 0 rgba(255, 255, 255, 0.18);
      transform: rotateY(-12deg) rotateX(8deg);
      animation: landing-phone-tilt 8s ease-in-out infinite;
    }

    @keyframes landing-phone-tilt {
      0%, 100% { transform: rotateY(-12deg) rotateX(8deg) translateY(0); }
      50% { transform: rotateY(-8deg) rotateX(4deg) translateY(-8px); }
    }

    .landing-phone__screen {
      border-radius: 28px;
      overflow: hidden;
      background: linear-gradient(180deg, #141416 0%, #0a0a0b 100%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      min-height: 360px;
      display: flex;
      flex-direction: column;
    }

    .landing-phone__header {
      display: flex;
      gap: 6px;
      padding: 14px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .landing-phone__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.18);
    }

    .landing-phone__menu {
      padding: 20px 18px 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .landing-phone__line {
      height: 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      width: 88%;
    }

    .landing-phone__line--wide {
      width: 56%;
      height: 14px;
      background: rgba(255, 107, 71, 0.35);
    }

    .landing-phone__line--short {
      width: 42%;
    }

    .landing-phone__qr {
      margin: auto;
      padding: 18px;
      display: flex;
      justify-content: center;
    }

    .landing-features {
      position: relative;
      z-index: 2;
      max-width: 72rem;
      margin: 0 auto;
      padding: var(--space-2) var(--space-5) var(--space-8);
      scroll-margin-top: 5rem;
    }

    .landing-section-title {
      margin: 0 0 var(--space-6);
      text-align: center;
      font-size: clamp(1.25rem, 3vw, 1.75rem);
      font-weight: 600;
      letter-spacing: -0.02em;
      color: var(--landing-text);
    }

    .landing-feature-grid {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-4);
    }

    @media (min-width: 768px) {
      .landing-feature-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    .landing-feature-card {
      padding: var(--space-5);
      border-radius: 20px;
      background: var(--landing-surface);
      border: 1px solid var(--landing-border);
      backdrop-filter: blur(12px);
    }

    .landing-feature-card__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      margin-bottom: var(--space-4);
      border-radius: 12px;
      background: var(--landing-accent-soft);
      color: var(--landing-accent);
    }

    .landing-feature-card__title {
      margin: 0 0 var(--space-2);
      font-size: 1rem;
      font-weight: 600;
      color: var(--landing-text);
    }

    .landing-feature-card__text {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.55;
      color: var(--landing-muted);
    }

    .landing-main {
      position: relative;
      z-index: 2;
      width: 100%;
      max-width: 960px;
      margin: 0 auto;
      padding: var(--space-8) var(--space-5);
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
      background: var(--landing-light-bg);
      border-radius: 32px 32px 0 0;
      color: var(--landing-light-text);
    }

    .landing-guest {
      width: 100%;
      display: flex;
      justify-content: center;
      scroll-margin-top: 5rem;
    }

    .landing-panel--guests {
      width: 100%;
      max-width: 36rem;
    }

    .landing-panel {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-md);
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

    .landing-section-heading {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0 0 var(--space-4);
      text-align: center;
    }

    .landing-restaurants {
      width: 100%;
      scroll-margin-top: 5rem;
    }

    .loading, .error, .empty {
      color: var(--color-text-muted);
      margin: var(--space-4) 0;
      text-align: center;
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
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .tenant-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
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
      flex-wrap: nowrap;
      gap: var(--space-2);
      min-width: 0;
      width: 100%;
      box-sizing: border-box;
    }

    .table-code-input {
      flex: 1 1 0;
      min-width: 0;
      padding: var(--space-3) var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: 1rem;
    }

    .btn-go {
      flex-shrink: 0;
      padding: var(--space-3) var(--space-5);
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-weight: 500;
      cursor: pointer;
    }

    @media (max-width: 480px) {
      .btn-go {
        padding-inline: var(--space-3);
      }
    }

    @media (max-width: 360px) {
      .table-code-row {
        flex-wrap: wrap;
      }

      .btn-go {
        flex: 1 1 auto;
        min-width: min(100%, 7rem);
      }
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

    .tenant-qr-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      width: 100%;
    }

    .tenant-qr-hint {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      text-align: center;
      line-height: 1.35;
    }

    .tenant-qr-link {
      display: inline-block;
      text-decoration: none;
      color: inherit;
      border-radius: var(--radius-md);
      cursor: pointer;
    }

    .tenant-qr-link:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    .tenant-qr-link:hover .tenant-qr-wrapper,
    .tenant-qr-link:focus-visible .tenant-qr-wrapper {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-primary) 35%, transparent);
    }

    .tenant-qr-wrapper {
      padding: var(--space-2);
      background: white;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    :host ::ng-deep .tenant-qr-code img {
      display: block;
      pointer-events: none;
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
      text-decoration: none;
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
      text-decoration: none;
    }

    .landing-bottom-cta {
      position: relative;
      z-index: 2;
      text-align: center;
      padding: var(--space-8) var(--space-5);
      background: var(--landing-light-bg);
      color: var(--landing-light-text);
    }

    .landing-bottom-cta__title {
      margin: 0 0 var(--space-3);
      font-size: clamp(1.5rem, 4vw, 2rem);
      font-weight: 700;
      letter-spacing: -0.03em;
    }

    .landing-bottom-cta__text {
      margin: 0 auto var(--space-6);
      max-width: 32rem;
      color: var(--landing-light-muted);
      line-height: 1.55;
    }

    .landing-bottom-cta .landing-btn--primary {
      background: var(--color-primary);
      color: #fff;
      box-shadow: 0 12px 32px rgba(211, 82, 51, 0.28);
    }

    .landing-bottom-cta .landing-btn--primary:hover {
      background: var(--color-primary-hover);
    }

    .landing-footer {
      position: relative;
      z-index: 2;
      padding: var(--space-6) var(--space-5);
      align-self: center;
      max-width: 960px;
      width: 100%;
      margin: 0 auto;
      text-align: center;
      font-size: 0.9375rem;
      color: var(--landing-light-muted);
      background: var(--landing-light-bg);
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      column-gap: var(--space-2);
      row-gap: var(--space-2);
    }

    .landing-footer a {
      color: var(--color-primary);
      font-weight: 500;
      margin-left: 0;
      text-decoration: none;
    }

    .landing-footer a:hover {
      text-decoration: underline;
    }

    .landing-footer .footer-sep {
      margin: 0;
      color: var(--landing-light-muted);
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
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-1);
    }

    .landing-version-bar__row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      row-gap: var(--space-1);
    }

    .landing-version-meta .landing-commit {
      margin-left: 4px;
      font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
      font-size: 0.625rem;
    }

    .landing-version-github {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-muted);
      line-height: 1;
      flex-shrink: 0;
      border-radius: var(--radius-sm);
      transition: color 0.15s ease, background 0.15s ease;
    }

    .landing-version-github:hover {
      color: var(--color-primary);
      background: color-mix(in srgb, var(--color-primary) 12%, transparent);
    }

    .landing-github-icon {
      display: block;
    }

    .landing-version-tagline {
      margin: 0;
      max-width: 36rem;
      font-size: 0.625rem;
      line-height: 1.35;
      color: var(--color-text-muted);
    }
  `],
})
export class LandingComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private apiErr = inject(ApiErrorMessageService);

  version = environment.version;
  commitHash = environment.commitHash;

  tenants = signal<TenantSummary[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  tableCode = '';
  tableLookupLoading = signal(false);
  tableLookupError = signal<string | null>(null);
  tableLookupChoices = signal<PublicTableLookupChoice[]>([]);

  ngOnInit(): void {
    // `ApiService` constructor already calls `checkAuth()` once; avoid a second `/users/me` (extra 401 noise).
    this.api.waitForInitialAuthCheck().subscribe(() => {
      const user = this.api.getCurrentUser();
      if (user) {
        if (user.role === 'courier') {
          void this.router.navigate(['/courier']);
        } else if (user.provider_id != null) {
          void this.router.navigate(['/provider']);
        } else {
          void this.router.navigate(['/dashboard']);
        }
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
        const demo = list.filter((t) => t.id === LANDING_DEMO_TENANT_ID);
        this.tenants.set(demo);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(this.apiErr.fromHttpError(err, 'COMMON.API_REQUEST_FAILED'));
        this.loading.set(false);
      },
    });
  }

  getLogoUrl(tenant: TenantSummary): string | null {
    return this.api.getTenantLogoUrl(tenant.logo_filename ?? undefined, tenant.id);
  }

  getTenantDisplayName(_tenant: TenantSummary): string {
    return this.translate.instant('LANDING.RESTAURANT_DEMO_NAME');
  }

  /** Absolute URL to the read-only public menu page (for landing QR codes). */
  getPublicMenuUrl(tenantId: number): string {
    if (typeof window === 'undefined') return `/public-menu/${tenantId}`;
    return `${window.location.origin}/public-menu/${tenantId}`;
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
