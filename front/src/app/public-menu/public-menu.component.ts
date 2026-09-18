import {
  Component,
  computed,
  inject,
  signal,
  OnInit,
  OnDestroy,
  DestroyRef,
  afterNextRender,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl, SafeStyle, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { merge } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ApiService,
  PublicTenantMenuCategory,
  PublicTenantMenuResponse,
  TenantSummary,
} from '../services/api.service';
import { PublicGuestHeaderComponent } from '../shared/public-guest-header.component';
import { resolvePublicPrimaryColor } from '../shared/public-brand-colors';
import { publicMenuTenantRef } from '../shared/public-menu-path';
import { publicBookRouterLink } from '../shared/public-book-path';
import { LanguageService } from '../services/language.service';
import { LegalLinksComponent } from '../shared/legal-links.component';
import { formatMoneyCents } from '../shared/currency-symbol';

@Component({
  selector: 'app-public-menu',
  standalone: true,
  imports: [RouterLink, TranslateModule, PublicGuestHeaderComponent, LegalLinksComponent],
  templateUrl: './public-menu.component.html',
  styleUrls: ['../book/book.component.scss', './public-menu.component.scss'],
})
export class PublicMenuComponent implements OnInit, OnDestroy {
  readonly resolvePublicPrimaryColor = resolvePublicPrimaryColor;
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private translate = inject(TranslateService);
  private language = inject(LanguageService);
  private sanitizer = inject(DomSanitizer);
  private title = inject(Title);
  private destroyRef = inject(DestroyRef);

  tenantId = signal(0);
  tenant = signal<TenantSummary | null>(null);
  menu = signal<PublicTenantMenuResponse | null>(null);
  logoUrl = signal<string | null>(null);
  loading = signal(true);
  menuLoading = signal(false);
  errorKind = signal<'invalid_tenant' | 'tenant_not_found' | 'menu_load_failed' | null>(null);
  /** Category ids collapsed by user toggle (default: all expanded). */
  private collapsedCategoryIds = signal<Set<string>>(new Set());

  googleMapsUrl = computed(() => this.tenant()?.public_google_maps_url?.trim() || null);
  openstreetmapUrl = computed(() => this.tenant()?.public_openstreetmap_url?.trim() || null);

  constructor() {
    afterNextRender(() => this.updateDocumentTitle());
  }

  ngOnInit(): void {
    const langParam = this.route.snapshot.queryParamMap.get('lang');
    if (langParam?.trim()) {
      this.language.setLanguage(langParam.trim());
    }

    merge(
      this.translate.onLangChange,
      this.translate.onTranslationChange,
      this.translate.onDefaultLangChange,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateDocumentTitle();
        if (this.tenant() && !this.errorKind()) {
          this.reloadMenu();
        }
      });

    const refParam = (this.route.snapshot.paramMap.get('tenantId') || '').trim();
    if (!refParam) {
      this.errorKind.set('invalid_tenant');
      this.loading.set(false);
      this.updateDocumentTitle();
      return;
    }
    const numericId = /^\d+$/.test(refParam) ? parseInt(refParam, 10) : NaN;
    if (Number.isFinite(numericId) && numericId >= 1) {
      this.tenantId.set(numericId);
    }
    this.updateDocumentTitle();

    this.api.getPublicTenant(refParam).subscribe({
      next: (t) => {
        this.tenant.set(t);
        this.tenantId.set(t.id);
        this.logoUrl.set(this.api.getTenantLogoUrl(t.logo_filename ?? undefined, t.id));
        const canonical = String(publicMenuTenantRef(t));
        if (canonical && canonical !== refParam) {
          void this.router.navigate(['/public-menu', canonical], {
            replaceUrl: true,
            queryParamsHandling: 'preserve',
          });
        }
        this.loadMenu(t.id);
      },
      error: () => {
        this.errorKind.set('tenant_not_found');
        this.loading.set(false);
        this.updateDocumentTitle();
      },
    });
  }

  ngOnDestroy(): void {
    // Title reset handled by next navigation.
  }

  private loadMenu(tenantId: number): void {
    this.menuLoading.set(true);
    this.api.getPublicTenantMenu(tenantId).subscribe({
      next: (data) => {
        this.menu.set(data);
        this.menuLoading.set(false);
        this.loading.set(false);
        this.updateDocumentTitle();
      },
      error: () => {
        this.errorKind.set('menu_load_failed');
        this.menuLoading.set(false);
        this.loading.set(false);
        this.updateDocumentTitle();
      },
    });
  }

  private reloadMenu(): void {
    const tid = this.tenantId();
    if (!tid) return;
    this.menuLoading.set(true);
    this.api.getPublicTenantMenu(tid).subscribe({
      next: (data) => {
        this.menu.set(data);
        this.menuLoading.set(false);
      },
      error: () => {
        this.menuLoading.set(false);
      },
    });
  }

  categories(): PublicTenantMenuCategory[] {
    return this.menu()?.categories ?? [];
  }

  isCategoryExpanded(categoryId: string): boolean {
    return !this.collapsedCategoryIds().has(categoryId);
  }

  toggleCategory(categoryId: string): void {
    this.collapsedCategoryIds.update((ids) => {
      const next = new Set(ids);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }

  /** Translation key for known API category names; falls back to raw value. */
  getCategoryLabel(category: string): string {
    const keyMap: Record<string, string> = {
      Starters: 'PRODUCTS.CATEGORY_STARTERS',
      'Main Course': 'PRODUCTS.CATEGORY_MAIN_COURSE',
      Desserts: 'PRODUCTS.CATEGORY_DESSERTS',
      Beverages: 'PRODUCTS.CATEGORY_BEVERAGES',
      Sides: 'PRODUCTS.CATEGORY_SIDES',
      Other: 'PUBLIC_MENU.CATEGORY_OTHER',
    };
    const key = keyMap[category];
    if (key) return this.translate.instant(key);
    return category;
  }

  categoryPanelId(categoryId: string): string {
    return `public-menu-cat-panel-${categoryId}`;
  }

  categoryToggleAriaLabel(category: PublicTenantMenuCategory): string {
    const name = this.getCategoryLabel(category.name);
    const key = this.isCategoryExpanded(category.id)
      ? 'PUBLIC_MENU.COLLAPSE_CATEGORY'
      : 'PUBLIC_MENU.EXPAND_CATEGORY';
    return this.translate.instant(key, { category: name });
  }

  displayName(): string {
    return this.menu()?.tenant_name?.trim() || this.tenant()?.name?.trim() || '';
  }

  getLogoSafeUrl(url: string | null): SafeResourceUrl | string {
    if (!url) return '';
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  headerBackgroundStyle(): SafeStyle | null {
    const filename = this.tenant()?.header_background_filename;
    const tid = this.tenant()?.id;
    if (!filename || tid == null) return null;
    const url = this.api.getTenantHeaderBackgroundUrl(filename, tid);
    return this.sanitizer.bypassSecurityTrustStyle(`url('${url}')`);
  }

  productImageUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const base = environment.apiUrl.replace(/\/$/, '');
    return url.startsWith('/') ? base + url : `${base}/${url}`;
  }

  formatPrice(product: { price_cents: number }): string {
    return formatMoneyCents(this.translate, product.price_cents, this.menu()?.currency);
  }

  /** Build WhatsApp wa.me link from phone string (e.g. +34 612 345 678 -> https://wa.me/34612345678). */
  getWhatsAppUrl(phone: string): string {
    const digits = (phone || '').replace(/\D/g, '');
    return `https://wa.me/${digits}`;
  }

  /** Canonical guest booking link (#415). */
  bookRouterLink(): (string | number)[] {
    const t = this.tenant();
    if (t) return publicBookRouterLink(t);
    return ['/book', this.tenantId()];
  }

  private updateDocumentTitle(): void {
    const name = this.displayName();
    const err = this.errorKind();
    let key: string;
    if (this.loading() && !err) {
      key = 'PUBLIC_MENU.LOADING';
    } else if (err === 'invalid_tenant') {
      key = 'PUBLIC_MENU.INVALID_TENANT';
    } else if (err === 'tenant_not_found') {
      key = 'PUBLIC_MENU.TENANT_NOT_FOUND';
    } else if (err === 'menu_load_failed') {
      key = 'PUBLIC_MENU.LOAD_FAILED';
    } else if (name) {
      this.title.setTitle(`${name} — ${this.translate.instant('PUBLIC_MENU.PAGE_TITLE')}`);
      return;
    } else {
      key = 'PUBLIC_MENU.PAGE_TITLE';
    }
    this.title.setTitle(this.translate.instant(key));
  }
}
