import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';

export interface SeoPageConfig {
  title: string;
  description: string;
  /** Path without origin, e.g. `/features`. Empty string = home. */
  path: string;
  /** When true, set robots noindex,nofollow. */
  noindex?: boolean;
}

const BRAND = 'Satisfecho';
const DEFAULT_DESCRIPTION =
  'Open-source restaurant platform — QR menus, ordering, reservations, payments, kitchen & bar displays, shifts, inventory, and reports.';
const OG_IMAGE_PATH = '/og-image.png';

/** Exact marketing / public shell pages with fixed English meta (crawler-friendly). */
const MARKETING_PAGES: Record<string, Omit<SeoPageConfig, 'path'>> = {
  '/': {
    title: `${BRAND} — Open-source restaurant platform`,
    description: DEFAULT_DESCRIPTION,
  },
  '/features': {
    title: `Features — ${BRAND}`,
    description:
      'Everything Satisfecho offers: QR menus, online payments, kitchen displays, shift planning, inventory, and more — one platform for guests, staff, and owners.',
  },
  '/about': {
    title: `About us — ${BRAND}`,
    description:
      'Satisfecho is an open-source restaurant platform operated by Amvara Consulting S.L. Learn who we are and how the product helps restaurants.',
  },
  '/register': {
    title: `Create your restaurant — ${BRAND}`,
    description: `Sign up for ${BRAND} and launch QR menus, ordering, and reservations for your restaurant.`,
  },
  '/signup': {
    title: `Create your restaurant — ${BRAND}`,
    description: `Sign up for ${BRAND} and launch QR menus, ordering, and reservations for your restaurant.`,
  },
  '/orders': {
    title: `Order online — ${BRAND}`,
    description: `Find restaurants on ${BRAND} and place take-away or home orders online.`,
  },
  '/terms': {
    title: `Terms of service — ${BRAND}`,
    description: `Terms of service for the ${BRAND} restaurant platform.`,
  },
  '/privacy': {
    title: `Privacy policy — ${BRAND}`,
    description: `Privacy policy for the ${BRAND} restaurant platform.`,
  },
};

/** Path prefixes that should not be indexed (staff / auth shells). */
const NOINDEX_PREFIXES = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/paywall',
  '/dashboard',
  '/my-shift',
  '/talk',
  '/products',
  '/catalog',
  '/tables',
  '/staff/',
  '/customers',
  '/kitchen',
  '/bar',
  '/settings',
  '/users',
  '/contracts',
  '/inventory',
  '/reports',
  '/working-plan',
  '/reservations',
  '/guest-feedback',
  '/provider',
  '/courier',
  '/platform',
];

/** Guest flows that set their own document title; only robots + light defaults here. */
const DYNAMIC_PUBLIC_PREFIXES = [
  '/book/',
  '/public-menu/',
  '/delivery/',
  '/waitlist/',
  '/feedback/',
  '/menu/',
  '/reservation',
];

/** /{public_slug}/book (#415) — not a fixed prefix. */
const SLUG_BOOK_PATH = /^\/[^/]+\/book$/;

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly router = inject(Router);
  private sub?: Subscription;

  /** Call once from App bootstrap. */
  start(): void {
    this.applyForUrl(this.router.url);
    this.sub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.applyForUrl(e.urlAfterRedirects));
  }

  stop(): void {
    this.sub?.unsubscribe();
    this.sub = undefined;
  }

  /** Public /features/:slug detail pages (fixed English meta for crawlers). */
  applyFeatureDetail(path: string, title: string, description: string): void {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://satisfecho.de';
    this.applyTags({ title, description, path }, origin);
  }

  applyForUrl(rawUrl: string): void {
    const path = this.normalizePath(rawUrl);
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://satisfecho.de';

    if (this.isNoindexPath(path)) {
      this.applyTags({
        title: BRAND,
        description: DEFAULT_DESCRIPTION,
        path,
        noindex: true,
      }, origin);
      return;
    }

    const marketing = MARKETING_PAGES[path];
    if (marketing) {
      this.applyTags({ ...marketing, path }, origin);
      return;
    }

    if (path.startsWith('/features/') && path.length > '/features/'.length) {
      // Title/description set by FeatureDetailComponent via applyFeatureDetail.
      this.meta.updateTag({ name: 'robots', content: 'index,follow' });
      this.setCanonical(origin, path);
      this.meta.updateTag({ property: 'og:url', content: this.absoluteUrl(origin, path) });
      return;
    }

    if (this.isDynamicPublicPath(path)) {
      // Title/description owned by the page component; keep crawl signals current.
      this.meta.updateTag({ name: 'robots', content: 'index,follow' });
      this.setCanonical(origin, path);
      this.meta.updateTag({ property: 'og:url', content: this.absoluteUrl(origin, path) });
      return;
    }

    this.applyTags({
      title: BRAND,
      description: DEFAULT_DESCRIPTION,
      path,
    }, origin);
  }

  private applyTags(cfg: SeoPageConfig, origin: string): void {
    const url = this.absoluteUrl(origin, cfg.path);
    this.title.setTitle(cfg.title);
    this.meta.updateTag({ name: 'description', content: cfg.description });
    this.meta.updateTag({
      name: 'robots',
      content: cfg.noindex ? 'noindex,nofollow' : 'index,follow',
    });
    this.setCanonical(origin, cfg.path);
    this.setOgBasics({ title: cfg.title, description: cfg.description, url });
  }

  private setOgBasics(opts: { title: string; description: string; url: string }): void {
    const image = this.absoluteUrl(
      typeof window !== 'undefined' ? window.location.origin : 'https://satisfecho.de',
      OG_IMAGE_PATH,
    );
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: BRAND });
    this.meta.updateTag({ property: 'og:title', content: opts.title });
    this.meta.updateTag({ property: 'og:description', content: opts.description });
    this.meta.updateTag({ property: 'og:url', content: opts.url });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: opts.title });
    this.meta.updateTag({ name: 'twitter:description', content: opts.description });
    this.meta.updateTag({ name: 'twitter:image', content: image });
  }

  private setCanonical(origin: string, path: string): void {
    const href = this.absoluteUrl(origin, path === '/' ? '/' : path);
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  private absoluteUrl(origin: string, path: string): string {
    if (!path || path === '/') {
      return `${origin}/`;
    }
    return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private normalizePath(rawUrl: string): string {
    const withoutQuery = rawUrl.split('?')[0].split('#')[0];
    if (!withoutQuery || withoutQuery === '/') {
      return '/';
    }
    return withoutQuery.endsWith('/') && withoutQuery.length > 1
      ? withoutQuery.slice(0, -1)
      : withoutQuery;
  }

  private isNoindexPath(path: string): boolean {
    return NOINDEX_PREFIXES.some((prefix) => {
      if (prefix.endsWith('/')) {
        const base = prefix.slice(0, -1);
        return path === base || path.startsWith(prefix);
      }
      return path === prefix || path.startsWith(`${prefix}/`);
    });
  }

  private isDynamicPublicPath(path: string): boolean {
    if (SLUG_BOOK_PATH.test(path)) return true;
    return DYNAMIC_PUBLIC_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(prefix),
    );
  }
}
