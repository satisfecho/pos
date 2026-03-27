import { Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

/** External links to terms of service and privacy policy (optional; hidden if both unset). */
@Component({
  selector: 'app-legal-links',
  standalone: true,
  imports: [TranslateModule],
  template: `
    @if (termsUrl() || privacyUrl()) {
      <nav class="legal-links" [attr.aria-label]="'LEGAL.LINKS_NAV' | translate">
        @if (termsUrl()) {
          <a [href]="termsUrl()!" target="_blank" rel="noopener noreferrer">{{ 'LEGAL.TERMS_OF_SERVICE' | translate }}</a>
        }
        @if (termsUrl() && privacyUrl()) {
          <span class="legal-sep" aria-hidden="true">·</span>
        }
        @if (privacyUrl()) {
          <a [href]="privacyUrl()!" target="_blank" rel="noopener noreferrer">{{ 'LEGAL.PRIVACY_POLICY' | translate }}</a>
        }
      </nav>
    }
  `,
  styles: `
    .legal-links {
      margin-top: var(--space-3);
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      text-align: center;
      line-height: 1.5;
    }
    .legal-links a {
      color: var(--color-primary);
      text-decoration: none;
      font-weight: 500;
    }
    .legal-links a:hover {
      text-decoration: underline;
    }
    .legal-sep {
      margin: 0 0.35rem;
      opacity: 0.7;
    }
  `,
})
export class LegalLinksComponent {
  termsUrl = input<string | null | undefined>(null);
  privacyUrl = input<string | null | undefined>(null);
}
