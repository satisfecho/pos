import {
  Component,
  OnDestroy,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl, SafeStyle, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { merge } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ApiService,
  PublicSatisfechoDeliveryConfig,
  PublicTenantMenuCategory,
  PublicTenantMenuProduct,
  PublicTenantMenuResponse,
  TenantSummary,
} from '../services/api.service';
import { LanguagePickerComponent } from '../shared/language-picker.component';
import { LanguageService } from '../services/language.service';
import { LegalLinksComponent } from '../shared/legal-links.component';
import { contactPhoneValid } from '../shared/contact-validators';

interface CartLine {
  product: PublicTenantMenuProduct;
  quantity: number;
}

type CheckoutStep = 'menu' | 'cart' | 'address' | 'pay' | 'success';

@Component({
  selector: 'app-delivery-checkout',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslateModule, LanguagePickerComponent, LegalLinksComponent],
  templateUrl: './delivery-checkout.component.html',
  styleUrls: ['../book/book.component.scss', './delivery-checkout.component.scss'],
})
export class DeliveryCheckoutComponent implements OnInit, OnDestroy {
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

  step = signal<CheckoutStep>('menu');
  cart = signal<CartLine[]>([]);

  customerName = '';
  customerPhone = '';
  deliveryAddress = '';
  deliveryNotes = '';
  postalCode = '';
  formError = signal<string | null>(null);
  submitting = signal(false);

  deliveryConfig = signal<PublicSatisfechoDeliveryConfig | null>(null);
  deliveryLat = signal<number | null>(null);
  deliveryLng = signal<number | null>(null);

  orderId = signal<number | null>(null);
  publicOrderToken = signal<string | null>(null);
  totalCents = signal(0);
  subtotalCents = signal(0);
  deliveryFeeCents = signal(0);
  revolutConfigured = signal(false);
  stripeReady = signal(false);

  showStripeForm = signal(false);
  processingPayment = signal(false);
  cardError = signal('');
  paymentSuccess = signal(false);

  private stripe: any = null;
  private cardElement: any = null;
  private clientSecret = '';
  private paymentIntentId = '';
  private collapsedCategoryIds = signal<Set<string>>(new Set());

  cartCount = computed(() => this.cart().reduce((n, l) => n + l.quantity, 0));
  cartTotalCents = computed(() => {
    const items = this.cart().reduce((sum, l) => sum + l.product.price_cents * l.quantity, 0);
    const fee = this.deliveryConfig()?.delivery_fee_cents ?? 0;
    return items + (fee > 0 ? fee : 0);
  });
  cartSubtotalCents = computed(() =>
    this.cart().reduce((sum, l) => sum + l.product.price_cents * l.quantity, 0),
  );

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

    const idParam = this.route.snapshot.paramMap.get('tenantId');
    const tid = idParam ? parseInt(idParam, 10) : NaN;
    if (!Number.isFinite(tid) || tid < 1) {
      this.errorKind.set('invalid_tenant');
      this.loading.set(false);
      this.updateDocumentTitle();
      return;
    }
    this.tenantId.set(tid);
    this.updateDocumentTitle();

    this.api.getPublicTenant(tid).subscribe({
      next: (t) => {
        this.tenant.set(t);
        this.logoUrl.set(this.api.getTenantLogoUrl(t.logo_filename ?? undefined, t.id));
        this.loadMenu(tid);
        this.loadDeliveryConfig(tid);
      },
      error: () => {
        this.errorKind.set('tenant_not_found');
        this.loading.set(false);
        this.updateDocumentTitle();
      },
    });
  }

  private loadDeliveryConfig(tid: number): void {
    this.api.getPublicSatisfechoDeliveryConfig(tid).subscribe({
      next: (cfg) => {
        this.deliveryConfig.set(cfg);
        if (cfg.delivery_radius_meters) {
          this.requestDeliveryLocation();
        }
      },
      error: () => {
        this.deliveryConfig.set(null);
      },
    });
  }

  requestDeliveryLocation(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.deliveryLat.set(pos.coords.latitude);
        this.deliveryLng.set(pos.coords.longitude);
      },
      () => {
        /* optional; server rejects if radius configured and coords missing */
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 },
    );
  }

  ngOnDestroy(): void {
    if (this.cardElement) {
      try {
        this.cardElement.destroy();
      } catch {
        /* ignore */
      }
    }
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
      error: () => this.menuLoading.set(false),
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
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }

  categoryPanelId(categoryId: string): string {
    return `delivery-cat-panel-${categoryId}`;
  }

  getCategoryLabel(name: string): string {
    if (!name || name === 'other') {
      return this.translate.instant('PUBLIC_MENU.CATEGORY_OTHER');
    }
    return name;
  }

  categoryToggleAriaLabel(cat: PublicTenantMenuCategory): string {
    const label = this.getCategoryLabel(cat.name);
    const key = this.isCategoryExpanded(cat.id)
      ? 'PUBLIC_MENU.COLLAPSE_CATEGORY'
      : 'PUBLIC_MENU.EXPAND_CATEGORY';
    return this.translate.instant(key, { category: label });
  }

  formatPrice(product: PublicTenantMenuProduct): string {
    return product.price_formatted || `${(product.price_cents / 100).toFixed(2)}`;
  }

  formatCents(cents: number): string {
    const currency = this.menu()?.currency || 'EUR';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);
    } catch {
      return `${(cents / 100).toFixed(2)} ${currency}`;
    }
  }

  productImageUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) return url;
    return `${environment.apiUrl || ''}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  addToCart(product: PublicTenantMenuProduct): void {
    if (!product.available) return;
    this.cart.update((lines) => {
      const idx = lines.findIndex((l) => l.product.id === product.id);
      if (idx >= 0) {
        const next = [...lines];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...lines, { product, quantity: 1 }];
    });
  }

  setQty(productId: number, quantity: number): void {
    this.cart.update((lines) => {
      if (quantity <= 0) return lines.filter((l) => l.product.id !== productId);
      return lines.map((l) => (l.product.id === productId ? { ...l, quantity } : l));
    });
  }

  goToCart(): void {
    if (this.cartCount() < 1) return;
    this.step.set('cart');
  }

  goToAddress(): void {
    if (this.cartCount() < 1) return;
    this.formError.set(null);
    this.step.set('address');
  }

  goToMenu(): void {
    this.step.set('menu');
  }

  orderAgain(): void {
    this.orderId.set(null);
    this.publicOrderToken.set(null);
    this.totalCents.set(0);
    this.showStripeForm.set(false);
    this.paymentSuccess.set(false);
    this.cardError.set('');
    this.formError.set(null);
    this.customerName = '';
    this.customerPhone = '';
    this.deliveryAddress = '';
    this.deliveryNotes = '';
    this.cart.set([]);
    this.step.set('menu');
  }

  submitAddress(): void {
    this.formError.set(null);
    const address = this.deliveryAddress.trim();
    const phone = this.customerPhone.trim();
    const cfg = this.deliveryConfig();
    if (!address) {
      this.formError.set(this.translate.instant('DELIVERY_CHECKOUT.ADDRESS_REQUIRED'));
      return;
    }
    if (!phone || !contactPhoneValid(phone)) {
      this.formError.set(this.translate.instant('DELIVERY_CHECKOUT.PHONE_INVALID'));
      return;
    }
    if (cfg?.postal_codes_required && !this.postalCode.trim()) {
      this.formError.set(this.translate.instant('DELIVERY_CHECKOUT.POSTAL_REQUIRED'));
      return;
    }
    if (cfg?.delivery_radius_meters && (this.deliveryLat() == null || this.deliveryLng() == null)) {
      this.formError.set(this.translate.instant('DELIVERY_CHECKOUT.LOCATION_REQUIRED'));
      this.requestDeliveryLocation();
      return;
    }
    if (this.cartCount() < 1) {
      this.formError.set(this.translate.instant('DELIVERY_CHECKOUT.CART_EMPTY'));
      return;
    }

    this.submitting.set(true);
    this.api
      .createPublicSatisfechoDeliveryOrder(this.tenantId(), {
        items: this.cart().map((l) => ({
          product_id: l.product.id,
          quantity: l.quantity,
        })),
        delivery_address: address,
        customer_phone: phone,
        customer_name: this.customerName.trim() || null,
        notes: this.deliveryNotes.trim() || null,
        postal_code: this.postalCode.trim() || null,
        delivery_latitude: this.deliveryLat(),
        delivery_longitude: this.deliveryLng(),
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.orderId.set(res.id);
          this.publicOrderToken.set(res.public_order_token);
          this.totalCents.set(res.total_cents);
          this.subtotalCents.set(res.subtotal_cents ?? res.total_cents);
          this.deliveryFeeCents.set(res.delivery_fee_cents ?? 0);
          this.revolutConfigured.set(!!res.revolut_configured);
          const key = res.stripe_publishable_key || environment.stripePublishableKey || '';
          this.api.setTenantStripeKey(res.stripe_publishable_key || null);
          this.stripeReady.set(!!key);
          this.step.set('pay');
        },
        error: (err) => {
          this.submitting.set(false);
          const detail = err.error?.detail;
          let msg = this.translate.instant('DELIVERY_CHECKOUT.CREATE_FAILED');
          if (typeof detail === 'string') {
            if (detail.includes('outside the delivery zone')) {
              msg = this.translate.instant('DELIVERY_CHECKOUT.OUTSIDE_ZONE');
            } else if (detail.includes('outside the delivery radius')) {
              msg = this.translate.instant('DELIVERY_CHECKOUT.OUTSIDE_RADIUS');
            } else if (detail.includes('postal_code')) {
              msg = this.translate.instant('DELIVERY_CHECKOUT.POSTAL_REQUIRED');
            } else if (detail.includes('location')) {
              msg = this.translate.instant('DELIVERY_CHECKOUT.LOCATION_REQUIRED');
            } else {
              msg = detail;
            }
          }
          this.formError.set(msg);
        },
      });
  }

  payWithRevolut(): void {
    const oid = this.orderId();
    const token = this.publicOrderToken();
    if (!oid || !token) return;
    this.processingPayment.set(true);
    this.api.createRevolutOrder(oid, null, token).subscribe({
      next: (res) => {
        if (res.checkout_url) {
          window.location.href = res.checkout_url;
        } else {
          this.processingPayment.set(false);
          this.cardError.set(this.translate.instant('DELIVERY_CHECKOUT.PAY_FAILED'));
        }
      },
      error: (err) => {
        this.processingPayment.set(false);
        this.cardError.set(
          err.error?.detail || this.translate.instant('DELIVERY_CHECKOUT.PAY_FAILED'),
        );
      },
    });
  }

  payWithStripe(): void {
    const oid = this.orderId();
    const token = this.publicOrderToken();
    if (!oid || !token) return;
    if (!this.api.getStripePublishableKey()) {
      this.cardError.set(this.translate.instant('DELIVERY_CHECKOUT.PAY_NOT_CONFIGURED'));
      return;
    }
    this.processingPayment.set(true);
    this.cardError.set('');
    this.api.createPaymentIntent(oid, null, token).subscribe({
      next: async (response: any) => {
        this.clientSecret = response.client_secret;
        this.paymentIntentId = response.payment_intent_id;
        this.totalCents.set(response.amount);
        this.processingPayment.set(false);
        this.showStripeForm.set(true);
        await this.loadStripe();
      },
      error: (err) => {
        this.processingPayment.set(false);
        this.cardError.set(
          err.error?.detail || this.translate.instant('DELIVERY_CHECKOUT.PAY_FAILED'),
        );
      },
    });
  }

  private async loadStripe(): Promise<void> {
    if (this.stripe) {
      this.mountCard();
      return;
    }
    if ((window as any).Stripe) {
      this.stripe = (window as any).Stripe(this.api.getStripePublishableKey());
      this.mountCard();
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('stripe_load_failed'));
      document.head.appendChild(script);
    })
      .then(() => {
        this.stripe = (window as any).Stripe(this.api.getStripePublishableKey());
        this.mountCard();
      })
      .catch(() => {
        this.cardError.set(this.translate.instant('DELIVERY_CHECKOUT.PAY_FAILED'));
      });
  }

  private mountCard(): void {
    if (!this.stripe) return;
    const elements = this.stripe.elements();
    this.cardElement = elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#1C1917',
          '::placeholder': { color: '#78716C' },
        },
      },
    });
    const tryMount = (attempts: number) => {
      const container = document.getElementById('delivery-card-element');
      if (container) {
        container.innerHTML = '';
        this.cardElement.mount('#delivery-card-element');
        this.cardElement.on('change', (e: any) =>
          this.cardError.set(e.error ? e.error.message : ''),
        );
      } else if (attempts > 0) {
        setTimeout(() => tryMount(attempts - 1), 150);
      }
    };
    setTimeout(() => tryMount(5), 100);
  }

  async confirmStripe(): Promise<void> {
    if (!this.stripe || !this.cardElement) return;
    const oid = this.orderId();
    const token = this.publicOrderToken();
    if (!oid || !token) return;
    this.processingPayment.set(true);
    this.cardError.set('');
    const { error, paymentIntent } = await this.stripe.confirmCardPayment(this.clientSecret, {
      payment_method: { card: this.cardElement },
    });
    if (error) {
      this.cardError.set(error.message || this.translate.instant('DELIVERY_CHECKOUT.PAY_FAILED'));
      this.processingPayment.set(false);
      return;
    }
    if (paymentIntent?.status === 'succeeded') {
      this.api.confirmPayment(oid, null, this.paymentIntentId, token).subscribe({
        next: () => {
          this.processingPayment.set(false);
          this.paymentSuccess.set(true);
          this.cart.set([]);
          this.step.set('success');
        },
        error: () => {
          this.processingPayment.set(false);
          this.cardError.set(this.translate.instant('DELIVERY_CHECKOUT.CONFIRM_FAILED'));
        },
      });
    } else {
      this.processingPayment.set(false);
    }
  }

  goToTrack(): void {
    const oid = this.orderId();
    const token = this.publicOrderToken();
    if (!oid || !token) return;
    void this.router.navigate(['/delivery', this.tenantId(), 'track'], {
      queryParams: { order_id: oid, public_order_token: token },
    });
  }

  displayName(): string {
    return this.tenant()?.name || this.menu()?.tenant_name || '';
  }

  headerBackgroundStyle(): SafeStyle | null {
    const fn = this.tenant()?.header_background_filename;
    if (!fn) return null;
    const url = this.api.getTenantHeaderBackgroundUrl(fn, this.tenantId());
    if (!url) return null;
    return this.sanitizer.bypassSecurityTrustStyle(`url("${url}")`);
  }

  getLogoSafeUrl(url: string | null): SafeResourceUrl | null {
    if (!url) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private updateDocumentTitle(): void {
    const name = this.displayName();
    const page = this.translate.instant('DELIVERY_CHECKOUT.PAGE_TITLE');
    this.title.setTitle(name ? `${page} — ${name}` : page);
  }
}
