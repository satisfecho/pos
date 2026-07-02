import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '../../environments/environment';

/** Dark marketing footer shared by landing and features pages. */
@Component({
  selector: 'app-landing-site-footer',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  template: `
    <footer class="landing-site-footer">
      <section class="landing-site-footer__cta" aria-labelledby="landing-bottom-cta-heading">
        <h2 id="landing-bottom-cta-heading" class="landing-site-footer__cta-title">
          {{ 'LANDING.BOTTOM_CTA_TITLE' | translate }}
        </h2>
        <p class="landing-site-footer__cta-text">{{ 'LANDING.BOTTOM_CTA_TEXT' | translate }}</p>
        <a routerLink="/register" class="landing-btn landing-btn--primary landing-btn--large">
          {{ 'LANDING.CTA_CREATE_QR_MENU' | translate }}
        </a>
      </section>

      <div class="landing-footer">
        <nav class="landing-footer__nav" aria-label="Footer">
          <div class="landing-footer__group">
            <span class="landing-footer__group-label">{{ 'LANDING.FOOTER_ACCOUNT' | translate }}</span>
            <a routerLink="/register">{{ 'AUTH.CREATE_ACCOUNT' | translate }}</a>
            <a routerLink="/login">{{ 'LANDING.LOGIN' | translate }}</a>
          </div>
          <div class="landing-footer__group">
            <span class="landing-footer__group-label">{{ 'LANDING.FOOTER_PARTNERS' | translate }}</span>
            <a routerLink="/provider/login" data-testid="landing-provider-login">{{ 'LANDING.PROVIDER_LOGIN' | translate }}</a>
            <a routerLink="/provider/register" data-testid="landing-provider-register">{{ 'LANDING.REGISTER_AS_PROVIDER' | translate }}</a>
            <a routerLink="/courier/login" data-testid="landing-courier-login">{{ 'LANDING.COURIER_LOGIN' | translate }}</a>
          </div>
          <div class="landing-footer__group">
            <span class="landing-footer__group-label">{{ 'LANDING.FOOTER_SUPPORT' | translate }}</span>
            <a href="mailto:hello@satisfecho.de" data-testid="landing-contact-us">{{ 'LANDING.CONTACT_US' | translate }}</a>
            <a routerLink="/terms" data-testid="landing-terms">{{ 'LEGAL.TERMS_OF_SERVICE' | translate }}</a>
            <a routerLink="/privacy" data-testid="landing-privacy">{{ 'LEGAL.PRIVACY_POLICY' | translate }}</a>
          </div>
        </nav>
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
    </footer>
  `,
  styles: [`
    :host {
      --landing-border: rgba(255, 255, 255, 0.1);
      --landing-text: #fafafa;
      --landing-muted: rgba(250, 250, 250, 0.62);
      display: block;
    }

    .landing-site-footer {
      position: relative;
      z-index: 2;
      margin-top: var(--space-4);
      border-top: 1px solid var(--landing-border);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(0, 0, 0, 0.35) 100%);
    }

    .landing-site-footer__cta {
      max-width: 72rem;
      margin: 0 auto;
      padding: var(--space-8) var(--space-5) var(--space-6);
      text-align: center;
    }

    .landing-site-footer__cta-title {
      margin: 0 0 var(--space-3);
      font-size: clamp(1.5rem, 4vw, 2rem);
      font-weight: 700;
      letter-spacing: -0.03em;
      color: var(--landing-text);
    }

    .landing-site-footer__cta-text {
      margin: 0 auto var(--space-6);
      max-width: 32rem;
      color: var(--landing-muted);
      line-height: 1.55;
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

    .landing-btn--large {
      padding: 1rem 1.75rem;
      font-size: 1rem;
    }

    .landing-footer {
      max-width: 72rem;
      margin: 0 auto;
      padding: var(--space-6) var(--space-5);
      border-top: 1px solid var(--landing-border);
    }

    .landing-footer__nav {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-6);
    }

    @media (min-width: 720px) {
      .landing-footer__nav {
        grid-template-columns: repeat(3, 1fr);
        gap: var(--space-5);
      }
    }

    .landing-footer__group {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-2);
    }

    .landing-footer__group-label {
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--landing-muted);
    }

    .landing-footer a {
      color: rgba(250, 250, 250, 0.88);
      font-size: 0.875rem;
      font-weight: 500;
      text-decoration: none;
      transition: color 0.15s ease;
    }

    .landing-footer a:hover {
      color: var(--landing-text);
      text-decoration: none;
    }

    .landing-version-bar {
      max-width: 72rem;
      margin: 0 auto;
      padding: var(--space-4) var(--space-5) var(--space-6);
      border-top: 1px solid var(--landing-border);
      font-size: 0.6875rem;
      color: var(--landing-muted);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
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
      color: var(--landing-muted);
      line-height: 1;
      flex-shrink: 0;
      border-radius: var(--radius-sm);
      transition: color 0.15s ease, background 0.15s ease;
    }

    .landing-version-github:hover {
      color: var(--landing-text);
      background: rgba(255, 255, 255, 0.08);
    }

    .landing-github-icon {
      display: block;
    }

    .landing-version-tagline {
      margin: 0;
      max-width: 36rem;
      font-size: 0.625rem;
      line-height: 1.35;
      color: var(--landing-muted);
    }
  `],
})
export class LandingSiteFooterComponent {
  readonly version = environment.version;
  readonly commitHash = environment.commitHash;
}
