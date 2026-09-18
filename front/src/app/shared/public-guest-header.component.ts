import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../services/api.service';
import { LanguagePickerComponent } from './language-picker.component';
import {
  normalizeHex6,
  pickContrastingForeground,
} from './public-brand-colors';

export type PublicGuestNavKey = 'menu' | 'book' | 'waitlist' | 'delivery' | 'loyalty' | 'feedback';

/**
 * Sticky tenant chrome for public guest pages (#376 / #364).
 * Compact branding plus links; language picker stays visible while the guest scrolls.
 * Ink colour follows wash luminance so light tenant backgrounds stay readable (#411).
 */
@Component({
  selector: 'app-public-guest-header',
  standalone: true,
  imports: [RouterLink, TranslateModule, LanguagePickerComponent],
  template: `
    @if (tenantId() > 0) {
      <header
        class="public-guest-header"
        data-testid="public-guest-header"
        [style.--hero-header-fg]="headerFg()"
        [attr.data-header-ink]="headerInkMode()"
      >
        <a
          class="public-guest-header__brand"
          [routerLink]="['/public-menu', menuLinkRef()]"
          [attr.title]="name()"
        >
          @if (logoSafe()) {
            <img class="public-guest-header__logo" [src]="logoSafe()" [alt]="name()" />
          }
          @if (name()) {
            <span class="public-guest-header__name">{{ name() }}</span>
          }
        </a>
        <nav class="public-guest-header__nav" [attr.aria-label]="'PUBLIC_GUEST_NAV.ARIA' | translate">
          <a
            [routerLink]="['/public-menu', menuLinkRef()]"
            class="public-guest-header__link"
            [class.is-active]="activePage() === 'menu'"
            data-testid="public-guest-nav-menu"
          >
            {{ 'PUBLIC_GUEST_NAV.MENU' | translate }}
          </a>
          <a
            [routerLink]="bookRouterLink()"
            class="public-guest-header__link"
            [class.is-active]="activePage() === 'book'"
            data-testid="public-guest-nav-book"
          >
            {{ 'PUBLIC_GUEST_NAV.BOOK' | translate }}
          </a>
          <a
            [routerLink]="['/waitlist', tenantId()]"
            class="public-guest-header__link"
            [class.is-active]="activePage() === 'waitlist'"
            data-testid="public-guest-nav-waitlist"
          >
            {{ 'PUBLIC_GUEST_NAV.WAITLIST' | translate }}
          </a>
          <a
            [routerLink]="['/delivery', tenantId()]"
            class="public-guest-header__link"
            [class.is-active]="activePage() === 'delivery'"
            data-testid="public-guest-nav-delivery"
          >
            {{ 'PUBLIC_GUEST_NAV.DELIVERY' | translate }}
          </a>
          <a
            [routerLink]="['/loyalty', tenantId()]"
            class="public-guest-header__link"
            [class.is-active]="activePage() === 'loyalty'"
            data-testid="public-guest-nav-loyalty"
          >
            {{ 'PUBLIC_GUEST_NAV.LOYALTY' | translate }}
          </a>
          <a
            [routerLink]="['/feedback', tenantId()]"
            class="public-guest-header__link"
            [class.is-active]="activePage() === 'feedback'"
            data-testid="public-guest-nav-feedback"
          >
            {{ 'PUBLIC_GUEST_NAV.FEEDBACK' | translate }}
          </a>
        </nav>
        <app-language-picker class="public-guest-header__lang"></app-language-picker>
      </header>
    }
  `,
  styles: `
    :host {
      display: block;
      position: sticky;
      top: 0;
      z-index: 40;
    }

    .public-guest-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-height: 3.25rem;
      padding: calc(0.35rem + env(safe-area-inset-top, 0px)) 0.75rem 0.35rem;
      background: var(--hero-header-bg, var(--color-primary, #d35233));
      color: var(--hero-header-fg, #ffffff);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
    }

    .public-guest-header__brand {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      min-width: 0;
      flex: 0 1 auto;
      color: inherit;
      text-decoration: none;
    }

    .public-guest-header__logo {
      width: 2rem;
      height: 2rem;
      object-fit: contain;
      border-radius: 0.4rem;
      background: #fff;
      flex-shrink: 0;
    }

    .public-guest-header__name {
      font-weight: 600;
      font-size: 0.875rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 9rem;
    }

    .public-guest-header__nav {
      display: flex;
      align-items: center;
      gap: 0.15rem;
      flex: 1 1 auto;
      min-width: 0;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }

    .public-guest-header__nav::-webkit-scrollbar {
      display: none;
    }

    .public-guest-header__link {
      flex-shrink: 0;
      padding: 0.3rem 0.55rem;
      border-radius: 999px;
      color: color-mix(in srgb, var(--hero-header-fg, #ffffff) 92%, transparent);
      text-decoration: none;
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
    }

    .public-guest-header__link.is-active {
      background: color-mix(in srgb, var(--hero-header-fg, #ffffff) 22%, transparent);
      color: var(--hero-header-fg, #ffffff);
      font-weight: 650;
    }

    .public-guest-header__lang {
      flex-shrink: 0;
      margin-left: auto;
    }

    :host ::ng-deep .public-guest-header__lang .language-select {
      background: rgba(255, 255, 255, 0.95);
      border-color: transparent;
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      min-width: 4.5rem;
      border-radius: 999px;
    }

    .public-guest-header[data-header-ink='dark'] ::ng-deep .public-guest-header__lang .language-select {
      background: rgba(255, 255, 255, 0.88);
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12);
    }

    @media (max-width: 480px) {
      .public-guest-header__name {
        max-width: 5.5rem;
      }
    }
  `,
})
export class PublicGuestHeaderComponent implements OnInit {
  private api = inject(ApiService);
  private sanitizer = inject(DomSanitizer);

  tenantId = input(0);
  /** Optional /public-menu path segment (slug preferred). Defaults to tenantId. */
  publicMenuRef = input<string | number | null>(null);
  /** Optional public_slug for /{slug}/book (#415). */
  publicBookSlug = input<string | null>(null);
  tenantName = input<string | null>(null);
  logoUrl = input<string | null>(null);
  /** Tenant public wash hex; when set, drives nav ink contrast (#411). */
  headerBackgroundColor = input<string | null>(null);
  activePage = input<PublicGuestNavKey>('book');

  private fetchedName = signal<string | null>(null);
  private fetchedLogo = signal<string | null>(null);
  private fetchedBg = signal<string | null>(null);
  private fetchedMenuRef = signal<string | number | null>(null);
  private fetchedBookSlug = signal<string | null>(null);

  name = computed(() => this.tenantName()?.trim() || this.fetchedName() || '');
  menuLinkRef = computed(
    () => this.publicMenuRef() ?? this.fetchedMenuRef() ?? this.tenantId(),
  );
  bookRouterLink = computed((): (string | number)[] => {
    const slug =
      this.publicBookSlug()?.trim() || this.fetchedBookSlug()?.trim() || '';
    if (slug) return ['/', slug, 'book'];
    return ['/book', this.tenantId()];
  });
  logoSafe = computed((): SafeResourceUrl | null => {
    const url = this.logoUrl() || this.fetchedLogo();
    if (!url) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  private resolvedBg = computed(
    () =>
      normalizeHex6(this.headerBackgroundColor()) ||
      normalizeHex6(this.fetchedBg()),
  );

  headerFg = computed(() => pickContrastingForeground(this.resolvedBg()));

  headerInkMode = computed(() =>
    this.headerFg() === '#ffffff' ? 'light' : 'dark',
  );

  ngOnInit(): void {
    const id = this.tenantId();
    if (!id) return;
    const haveName = !!this.tenantName()?.trim();
    const haveLogo = !!this.logoUrl();
    const haveBg = !!normalizeHex6(this.headerBackgroundColor());
    const haveMenuRef =
      this.publicMenuRef() != null && String(this.publicMenuRef()).trim() !== '';
    const haveBookSlug = !!this.publicBookSlug()?.trim();
    if (haveName && haveLogo && haveBg && haveMenuRef && haveBookSlug) return;
    this.api.getPublicTenant(id).subscribe({
      next: (t) => {
        if (!haveName) this.fetchedName.set(t.name);
        if (!haveLogo) {
          this.fetchedLogo.set(this.api.getTenantLogoUrl(t.logo_filename ?? undefined, t.id));
        }
        if (!haveBg) {
          this.fetchedBg.set(t.public_background_color ?? null);
        }
        const slug = t.public_slug?.trim();
        this.fetchedMenuRef.set(slug || t.id);
        if (!haveBookSlug) this.fetchedBookSlug.set(slug || null);
      },
      error: () => {
        /* Parent pages already show load errors. */
      },
    });
  }
}
