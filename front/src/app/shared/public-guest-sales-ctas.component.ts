import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Concise next-step links into the guest sales flow (menu / book / delivery).
 * Used on loyalty surfaces (#374). Hide a channel with the matching show* input.
 */
@Component({
  selector: 'app-public-guest-sales-ctas',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  template: `
    @if (tenantId() > 0 && (showMenu() || showBook() || showDelivery())) {
      <nav
        class="public-guest-sales-ctas"
        data-testid="public-guest-sales-ctas"
        [attr.aria-label]="'LOYALTY_PUBLIC.CTA_NAV_ARIA' | translate"
      >
        <p class="public-guest-sales-ctas__heading">
          {{ 'LOYALTY_PUBLIC.CTA_HEADING' | translate }}
        </p>
        <div class="public-guest-sales-ctas__actions">
          @if (showMenu()) {
            <a
              class="btn primary"
              [routerLink]="['/public-menu', menuLinkRef()]"
              data-testid="loyalty-cta-menu"
            >
              {{ 'LOYALTY_PUBLIC.CTA_MENU' | translate }}
            </a>
          }
          @if (showBook()) {
            <a
              class="btn"
              [routerLink]="bookRouterLink()"
              data-testid="loyalty-cta-book"
            >
              {{ 'LOYALTY_PUBLIC.CTA_BOOK' | translate }}
            </a>
          }
          @if (showDelivery()) {
            <a
              class="btn"
              [routerLink]="['/delivery', tenantId()]"
              data-testid="loyalty-cta-delivery"
            >
              {{ 'LOYALTY_PUBLIC.CTA_DELIVERY' | translate }}
            </a>
          }
        </div>
      </nav>
    }
  `,
  styles: `
    .public-guest-sales-ctas {
      margin-top: 1.25rem;
      max-width: 36rem;
    }

    .public-guest-sales-ctas__heading {
      margin: 0 0 0.65rem;
      font-weight: 600;
      font-size: 0.95rem;
    }

    .public-guest-sales-ctas__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
    }

    .public-guest-sales-ctas__actions .btn {
      display: inline-block;
      padding: 0.5rem 0.9rem;
      border-radius: 4px;
      border: 1px solid rgba(0, 0, 0, 0.18);
      background: #fff;
      color: #1a1a1a;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .public-guest-sales-ctas__actions .btn.primary {
      background: var(--color-primary, #1e5a3c);
      border-color: transparent;
      color: #fff;
    }
  `,
})
export class PublicGuestSalesCtasComponent {
  tenantId = input(0);
  /** Prefer public_slug for menu CTA (#413). */
  publicMenuRef = input<string | number | null>(null);
  /** Prefer public_slug for /{slug}/book (#415). */
  publicBookSlug = input<string | null>(null);
  /** When false, hide the menu CTA (channel unavailable for tenant). */
  showMenu = input(true);
  showBook = input(true);
  showDelivery = input(true);

  menuLinkRef(): string | number {
    const ref = this.publicMenuRef();
    if (ref != null && String(ref).trim() !== '') return ref;
    return this.tenantId();
  }

  bookRouterLink(): (string | number)[] {
    const slug = this.publicBookSlug()?.trim();
    if (slug) return ['/', slug, 'book'];
    return ['/book', this.tenantId()];
  }
}
