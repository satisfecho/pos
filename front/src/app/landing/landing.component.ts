import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { QRCodeComponent } from 'angularx-qrcode';
import { ApiService, PublicTableLookupChoice, TenantSummary } from '../services/api.service';
import { FormsModule } from '@angular/forms';
import { LanguagePickerComponent } from '../shared/language-picker.component';
import { LandingSiteFooterComponent } from '../shared/landing-site-footer.component';
import { ApiErrorMessageService } from '../services/api-error-message.service';

/** Only tenant 1 is shown on the public landing page (displayed as Restaurant Demo). */
const LANDING_DEMO_TENANT_ID = 1;
/** Demo table name for the landing guest ordering flow (must exist on demo tenant). */
const LANDING_DEMO_TABLE_NAME = 'Take Away';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, TranslateModule, FormsModule, LanguagePickerComponent, QRCodeComponent, LandingSiteFooterComponent],
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
          <a routerLink="/features" class="landing-nav__link">{{ 'LANDING.NAV_FEATURES' | translate }}</a>
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
        <div class="landing-features__header">
          <h2 id="landing-features-heading" class="landing-section-title">
            {{ 'LANDING.FEATURES_HEADING' | translate }}
          </h2>
          <a routerLink="/features" class="landing-features__all-link">{{ 'LANDING.FEATURES_VIEW_ALL' | translate }}</a>
        </div>
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

      <section id="demo" class="landing-qr-demo landing-restaurants" aria-labelledby="landing-qr-demo-heading">
        @if (loading()) {
          <p class="loading">{{ 'COMMON.LOADING' | translate }}</p>
        } @else if (error()) {
          <p class="error">{{ error() }}</p>
        } @else if (tenants().length === 0) {
          <p class="empty">{{ 'LANDING.NO_TENANTS' | translate }}</p>
        } @else {
          @for (tenant of tenants(); track tenant.id) {
            <article class="landing-qr-demo__layout" data-testid="landing-tenant-card">
              <figure class="landing-qr-demo__figure" aria-label="{{ 'LANDING.PUBLIC_MENU_QR_LABEL' | translate }}">
                <a
                  class="landing-qr-demo__qr-link"
                  [routerLink]="['/public-menu', tenant.id]"
                  [attr.aria-label]="'LANDING.PUBLIC_MENU_QR_LINK_ARIA' | translate: { name: getTenantDisplayName(tenant) }"
                >
                  <qrcode
                    [qrdata]="getPublicMenuUrl(tenant.id)"
                    [width]="196"
                    [errorCorrectionLevel]="'M'"
                    cssClass="landing-qr-demo__code"
                  ></qrcode>
                </a>
                <figcaption class="landing-qr-demo__scan-hint">{{ 'LANDING.QR_DEMO_SCAN_HINT' | translate }}</figcaption>
              </figure>

              <div class="landing-qr-demo__content">
                <p class="landing-qr-demo__label" data-testid="landing-tenant-name">{{ getTenantDisplayName(tenant) }}</p>
                <h2 id="landing-qr-demo-heading" class="landing-qr-demo__title">{{ 'LANDING.QR_DEMO_TITLE' | translate }}</h2>
                <p class="landing-qr-demo__lede">{{ 'LANDING.QR_DEMO_LEDE' | translate }}</p>
                <ol class="landing-qr-demo__steps">
                  <li>{{ 'LANDING.QR_DEMO_STEP_1' | translate }}</li>
                  <li>{{ 'LANDING.QR_DEMO_STEP_2' | translate }}</li>
                  <li>{{ 'LANDING.QR_DEMO_STEP_3' | translate }}</li>
                </ol>
                <div class="landing-qr-demo__actions">
                  <a [routerLink]="['/public-menu', tenant.id]" class="landing-qr-demo__action landing-qr-demo__action--primary">
                    {{ 'LANDING.QR_DEMO_OPEN_MENU' | translate }}
                  </a>
                </div>
              </div>
            </article>
          }
        }
      </section>

      <section id="guests" class="landing-guests" aria-labelledby="landing-guests-heading">
        <div class="landing-guests__layout">
          <div class="landing-guests__copy">
            <h2 id="landing-guests-heading" class="landing-guests__title">{{ 'LANDING.SECTION_GUESTS' | translate }}</h2>
            <p class="landing-guests__lede">{{ 'LANDING.GUEST_LEDE' | translate }}</p>
            <p class="landing-guests__demo-note">{{ 'LANDING.GUEST_DEMO_NOTE' | translate }}</p>
          </div>

          <div class="landing-guests__form" aria-label="{{ 'LANDING.AT_TABLE_LABEL' | translate }}">
            <label class="landing-guests__label" for="landing-table-code">{{ 'LANDING.GUEST_TABLE_LABEL' | translate }}</label>
            <div class="landing-guests__row">
              <input
                id="landing-table-code"
                type="text"
                [(ngModel)]="tableCode"
                [placeholder]="'LANDING.TABLE_CODE_PLACEHOLDER' | translate"
                class="landing-guests__input"
                (ngModelChange)="onTableCodeInput()"
                (keyup.enter)="goToTableMenu()"
              />
              <button
                type="button"
                class="landing-guests__submit"
                [disabled]="tableLookupLoading()"
                (click)="goToTableMenu()"
              >
                {{ 'LANDING.GO' | translate }}
              </button>
            </div>
            <button
              type="button"
              class="landing-guests__demo-btn"
              [disabled]="tableLookupLoading()"
              (click)="tryDemoTable()"
            >
              {{ 'LANDING.GUEST_TRY_DEMO' | translate }}
            </button>
            @if (tableLookupError()) {
              <p class="landing-guests__error" role="alert">{{ tableLookupError() }}</p>
            }
            @if (tableLookupChoices().length > 0) {
              <p class="landing-guests__pick-title">{{ 'LANDING.TABLE_MULTIPLE_TITLE' | translate }}</p>
              <p class="landing-guests__pick-hint">{{ 'LANDING.TABLE_MULTIPLE_HINT' | translate }}</p>
              <ul class="landing-guests__choices">
                @for (c of tableLookupChoices(); track c.tenant_id + '-' + c.table_token) {
                  <li>
                    <button type="button" class="landing-guests__choice-btn" (click)="selectRestaurantForTable(c)">
                      {{ c.tenant_name }}
                    </button>
                  </li>
                }
              </ul>
            }
          </div>
        </div>
      </section>

      <app-landing-site-footer></app-landing-site-footer>
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

      min-height: 100vh;
      padding-bottom: var(--space-8);
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

    .landing-features__header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      margin-bottom: var(--space-6);
    }

    .landing-features__header .landing-section-title {
      margin: 0;
      text-align: left;
    }

    .landing-features__all-link {
      color: var(--landing-muted);
      font-size: 0.9375rem;
      font-weight: 600;
      text-decoration: none;
      white-space: nowrap;
    }

    .landing-features__all-link:hover {
      color: var(--landing-text);
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

    .landing-guests {
      position: relative;
      z-index: 2;
      max-width: 72rem;
      margin: 0 auto;
      padding: var(--space-2) var(--space-5) var(--space-8);
      scroll-margin-top: 5rem;
    }

    .landing-guests__layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-6);
      align-items: start;
      padding: var(--space-6);
      border-radius: 24px;
      background: var(--landing-surface);
      border: 1px solid var(--landing-border);
      backdrop-filter: blur(12px);
    }

    @media (min-width: 860px) {
      .landing-guests__layout {
        grid-template-columns: 1fr 1fr;
        gap: var(--space-8);
        padding: var(--space-8);
      }
    }

    .landing-guests__title {
      margin: 0 0 var(--space-3);
      font-size: clamp(1.375rem, 3vw, 1.75rem);
      font-weight: 700;
      letter-spacing: -0.03em;
      color: var(--landing-text);
    }

    .landing-guests__lede {
      margin: 0 0 var(--space-3);
      font-size: 1rem;
      line-height: 1.6;
      color: var(--landing-muted);
      max-width: 34rem;
    }

    .landing-guests__demo-note {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.5;
      color: rgba(250, 250, 250, 0.78);
      max-width: 34rem;
    }

    .landing-guests__label {
      display: block;
      margin: 0 0 var(--space-2);
      font-size: 0.8125rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--landing-muted);
    }

    .landing-guests__row {
      display: flex;
      gap: var(--space-2);
      min-width: 0;
    }

    .landing-guests__input {
      flex: 1 1 0;
      min-width: 0;
      padding: 0.875rem 1rem;
      border-radius: 12px;
      border: 1px solid var(--landing-border);
      background: rgba(255, 255, 255, 0.06);
      color: var(--landing-text);
      font-size: 1rem;
    }

    .landing-guests__input::placeholder {
      color: rgba(250, 250, 250, 0.38);
    }

    .landing-guests__input:focus {
      outline: none;
      border-color: rgba(255, 255, 255, 0.24);
      box-shadow: 0 0 0 3px rgba(255, 107, 71, 0.18);
    }

    .landing-guests__submit {
      flex-shrink: 0;
      padding: 0.875rem 1.25rem;
      border: none;
      border-radius: 12px;
      background: #fff;
      color: #0a0a0b;
      font-size: 0.9375rem;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s ease;
    }

    .landing-guests__submit:hover:not(:disabled) {
      opacity: 0.92;
    }

    .landing-guests__submit:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .landing-guests__demo-btn {
      margin-top: var(--space-3);
      width: 100%;
      padding: 0.75rem 1rem;
      border-radius: 12px;
      border: 1px solid var(--landing-border);
      background: rgba(255, 255, 255, 0.04);
      color: var(--landing-text);
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
    }

    .landing-guests__demo-btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.18);
    }

    .landing-guests__demo-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    @media (max-width: 480px) {
      .landing-guests__row {
        flex-wrap: wrap;
      }

      .landing-guests__submit {
        flex: 1 1 auto;
      }
    }

    .landing-guests__error {
      margin: var(--space-3) 0 0;
      font-size: 0.875rem;
      color: #fca5a5;
    }

    .landing-guests__pick-title {
      margin: var(--space-4) 0 var(--space-2);
      font-weight: 600;
      font-size: 0.9375rem;
      color: var(--landing-text);
    }

    .landing-guests__pick-hint {
      margin: 0 0 var(--space-3);
      font-size: 0.875rem;
      color: var(--landing-muted);
    }

    .landing-guests__choices {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .landing-guests__choice-btn {
      width: 100%;
      padding: var(--space-3) var(--space-4);
      text-align: center;
      background: rgba(255, 255, 255, 0.04);
      color: var(--landing-text);
      border: 1px solid var(--landing-border);
      border-radius: 12px;
      font-weight: 500;
      font-size: 0.9375rem;
      cursor: pointer;
    }

    .landing-guests__choice-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .landing-qr-demo {
      position: relative;
      z-index: 2;
      max-width: 72rem;
      margin: 0 auto;
      padding: var(--space-2) var(--space-5) var(--space-8);
      scroll-margin-top: 5rem;
    }

    .landing-qr-demo .loading,
    .landing-qr-demo .error,
    .landing-qr-demo .empty {
      color: var(--landing-muted);
      margin: var(--space-4) 0;
      text-align: center;
    }

    .landing-qr-demo .error {
      color: #fca5a5;
    }

    .landing-qr-demo__layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-6);
      align-items: center;
    }

    @media (min-width: 860px) {
      .landing-qr-demo__layout {
        grid-template-columns: minmax(220px, 280px) 1fr;
        gap: var(--space-8);
      }
    }

    .landing-qr-demo__figure {
      margin: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
    }

    .landing-qr-demo__qr-link {
      display: inline-flex;
      padding: var(--space-4);
      background: #fff;
      border-radius: 20px;
      box-shadow:
        0 24px 60px rgba(0, 0, 0, 0.35),
        0 0 0 1px rgba(255, 255, 255, 0.08);
      text-decoration: none;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .landing-qr-demo__qr-link:hover {
      transform: translateY(-2px);
      box-shadow:
        0 28px 70px rgba(0, 0, 0, 0.4),
        0 0 0 1px rgba(255, 255, 255, 0.12);
    }

    .landing-qr-demo__qr-link:focus-visible {
      outline: 2px solid var(--landing-accent);
      outline-offset: 4px;
    }

    :host ::ng-deep .landing-qr-demo__code img {
      display: block;
      pointer-events: none;
    }

    .landing-qr-demo__scan-hint {
      font-size: 0.8125rem;
      color: var(--landing-muted);
      text-align: center;
    }

    .landing-qr-demo__content {
      min-width: 0;
    }

    .landing-qr-demo__label {
      margin: 0 0 var(--space-2);
      font-size: 0.8125rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--landing-accent);
    }

    .landing-qr-demo__title {
      margin: 0 0 var(--space-3);
      font-size: clamp(1.5rem, 3.5vw, 2rem);
      font-weight: 700;
      letter-spacing: -0.03em;
      line-height: 1.15;
      color: var(--landing-text);
    }

    .landing-qr-demo__lede {
      margin: 0 0 var(--space-5);
      font-size: 1rem;
      line-height: 1.6;
      color: var(--landing-muted);
      max-width: 38rem;
    }

    .landing-qr-demo__steps {
      margin: 0 0 var(--space-5);
      padding-left: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      max-width: 38rem;
    }

    .landing-qr-demo__steps li {
      font-size: 0.9375rem;
      line-height: 1.55;
      color: rgba(250, 250, 250, 0.82);
    }

    .landing-qr-demo__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .landing-qr-demo__action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.625rem 1rem;
      border-radius: 999px;
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      border: 1px solid var(--landing-border);
      color: var(--landing-text);
      background: rgba(255, 255, 255, 0.04);
      transition: background 0.15s ease, border-color 0.15s ease;
    }

    .landing-qr-demo__action:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.18);
      text-decoration: none;
    }

    .landing-qr-demo__action--primary {
      background: #fff;
      color: #0a0a0b;
      border-color: transparent;
    }

    .landing-qr-demo__action--primary:hover {
      background: rgba(255, 255, 255, 0.92);
    }
  `],
})
export class LandingComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private apiErr = inject(ApiErrorMessageService);

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

  getTenantDisplayName(_tenant: TenantSummary): string {
    return this.translate.instant('LANDING.RESTAURANT_DEMO_NAME');
  }

  /** Absolute URL to the read-only public menu page (for landing QR codes). */
  getPublicMenuUrl(tenantId: number): string {
    if (typeof window === 'undefined') return `/public-menu/${tenantId}`;
    return `${window.location.origin}/public-menu/${tenantId}`;
  }

  tryDemoTable(): void {
    this.tableCode = LANDING_DEMO_TABLE_NAME;
    this.goToTableMenu();
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
