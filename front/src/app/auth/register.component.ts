import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { contactEmailValidator } from '../shared/contact-validators';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { QRCodeComponent } from 'angularx-qrcode';
import { ApiService } from '../services/api.service';
import { ApiErrorMessageService } from '../services/api-error-message.service';
import { LanguagePickerComponent } from '../shared/language-picker.component';
import { LegalLinksComponent } from '../shared/legal-links.component';

interface StarterProductState {
  name: string;
  enabled: boolean;
  priceCents: number;
  defaultPriceCents: number;
}

interface OnboardedProduct {
  id: number;
  name: string;
  price_cents: number;
  image_filename: string | null;
}

const STARTER_DEFAULTS: StarterProductState[] = [
  { name: 'Coffee', enabled: true, priceCents: 250, defaultPriceCents: 250 },
  { name: 'Coca Cola', enabled: true, priceCents: 300, defaultPriceCents: 300 },
  { name: 'Water', enabled: true, priceCents: 0, defaultPriceCents: 0 },
];

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    LanguagePickerComponent,
    LegalLinksComponent,
    QRCodeComponent,
  ],
  template: `
    <div class="auth-page">
      <div class="auth-card" [class.auth-card--wide]="step() > 0">
        <div class="auth-header">
          <div class="auth-header-row">
            <div>
              <h1>{{ 'AUTH.SIGNUP_TITLE' | translate }}</h1>
              <p>{{ stepTitle() }}</p>
            </div>
            <app-language-picker></app-language-picker>
          </div>
        </div>

        @if (step() === 0) {
          <div class="signup-intro">
            <p class="signup-intro-lead">{{ 'AUTH.SIGNUP_INTRO_LEAD' | translate }}</p>
            <ol class="signup-steps-list">
              <li>
                <strong>{{ 'AUTH.SIGNUP_STEP1_TITLE' | translate }}</strong>
                <span>{{ 'AUTH.SIGNUP_STEP1_DESC' | translate }}</span>
              </li>
              <li>
                <strong>{{ 'AUTH.SIGNUP_STEP2_TITLE' | translate }}</strong>
                <span>{{ 'AUTH.SIGNUP_STEP2_DESC' | translate }}</span>
              </li>
              <li>
                <strong>{{ 'AUTH.SIGNUP_STEP3_TITLE' | translate }}</strong>
                <span>{{ 'AUTH.SIGNUP_STEP3_DESC' | translate }}</span>
              </li>
            </ol>
            <button type="button" class="btn-submit" (click)="step.set(1)">
              {{ 'AUTH.SIGNUP_GET_STARTED' | translate }}
            </button>
          </div>
        }

        @if (step() === 1) {
          <div class="register-explanation">
            <p class="register-explanation-title">{{ 'AUTH.REGISTER_WHO_IS_THIS_FOR' | translate }}</p>
            <p class="register-explanation-guests">{{ 'AUTH.REGISTER_GUEST_HINT' | translate }}</p>
          </div>

          <form [formGroup]="accountForm" (ngSubmit)="submitAccount()">
            <div class="form-group">
              <label for="tenant">{{ 'AUTH.ORGANIZATION_NAME' | translate }}</label>
              <input
                id="tenant"
                type="text"
                formControlName="tenant_name"
                [placeholder]="translate.instant('AUTH.ORGANIZATION_PLACEHOLDER')"
              >
            </div>

            <div class="form-group">
              <label for="address">{{ 'AUTH.SIGNUP_ADDRESS' | translate }}</label>
              <input
                id="address"
                type="text"
                formControlName="address"
                [placeholder]="translate.instant('AUTH.SIGNUP_ADDRESS_PLACEHOLDER')"
              >
            </div>

            <div class="form-group">
              <label for="phone">{{ 'AUTH.SIGNUP_PHONE' | translate }}</label>
              <input
                id="phone"
                type="tel"
                formControlName="phone"
                [placeholder]="translate.instant('AUTH.SIGNUP_PHONE_PLACEHOLDER')"
              >
            </div>

            <div class="form-group">
              <label for="maps_url">{{ 'AUTH.SIGNUP_MAPS_URL' | translate }}</label>
              <input
                id="maps_url"
                type="url"
                formControlName="maps_url"
                [placeholder]="translate.instant('AUTH.SIGNUP_MAPS_URL_PLACEHOLDER')"
              >
              <small class="field-hint">{{ 'AUTH.SIGNUP_MAPS_URL_HINT' | translate }}</small>
            </div>

            <div class="form-group">
              <label for="name">{{ 'AUTH.FULL_NAME' | translate }}</label>
              <input
                id="name"
                type="text"
                formControlName="full_name"
                [placeholder]="translate.instant('AUTH.NAME_PLACEHOLDER')"
              >
            </div>

            <div class="form-group">
              <label for="email">{{ 'AUTH.EMAIL' | translate }}</label>
              <input
                id="email"
                type="email"
                formControlName="email"
                [placeholder]="translate.instant('AUTH.EMAIL_PLACEHOLDER')"
                autocomplete="email"
              >
            </div>

            <div class="form-group">
              <label for="password">{{ 'AUTH.PASSWORD' | translate }}</label>
              <div class="input-with-toggle">
                <input
                  id="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="password"
                  [placeholder]="translate.instant('AUTH.PASSWORD_PLACEHOLDER')"
                  autocomplete="new-password"
                >
                <button type="button" class="pw-toggle" (click)="showPassword.set(!showPassword())" tabindex="-1">
                  {{ showPassword() ? ('AUTH.HIDE_PASSWORD' | translate) : ('AUTH.SHOW_PASSWORD' | translate) }}
                </button>
              </div>
            </div>

            <div class="form-group">
              <label for="password_confirm">{{ 'AUTH.CONFIRM_PASSWORD' | translate }}</label>
              <div class="input-with-toggle">
                <input
                  id="password_confirm"
                  [type]="showPasswordConfirm() ? 'text' : 'password'"
                  formControlName="password_confirm"
                  [placeholder]="translate.instant('AUTH.CONFIRM_PASSWORD_PLACEHOLDER')"
                  autocomplete="new-password"
                >
                <button type="button" class="pw-toggle" (click)="showPasswordConfirm.set(!showPasswordConfirm())" tabindex="-1">
                  {{ showPasswordConfirm() ? ('AUTH.HIDE_PASSWORD' | translate) : ('AUTH.SHOW_PASSWORD' | translate) }}
                </button>
              </div>
            </div>

            @if (accountForm.get('email')?.touched && accountForm.get('email')?.errors?.['contactEmail']) {
              <div class="error-banner">{{ 'AUTH.INVALID_EMAIL' | translate }}</div>
            }
            @if (accountForm.get('password_confirm')?.touched && accountForm.errors?.['passwordMismatch']) {
              <div class="error-banner">{{ 'AUTH.PASSWORDS_DO_NOT_MATCH' | translate }}</div>
            }
            @if (error()) {
              <div class="error-banner">
                {{ error() }}
                @if (emailAlreadyRegistered()) {
                  <div class="sign-in-hint">
                    <a routerLink="/login">{{ 'AUTH.SIGN_IN_INSTEAD' | translate }}</a>
                  </div>
                }
              </div>
            }

            <div class="wizard-nav">
              <button type="button" class="btn-secondary" (click)="step.set(0)">{{ 'COMMON.BACK' | translate }}</button>
              <button type="submit" class="btn-submit" [disabled]="accountForm.invalid || loading()">
                {{ loading() ? ('AUTH.CREATING_ACCOUNT' | translate) : ('COMMON.NEXT' | translate) }}
              </button>
            </div>
          </form>
        }

        @if (step() === 2) {
          <p class="signup-step-hint">{{ 'AUTH.SIGNUP_PRODUCTS_HINT' | translate }}</p>
          <div class="starter-products">
            @for (item of starterProducts(); track item.name) {
              <label class="starter-product-row">
                <input type="checkbox" [checked]="item.enabled" (change)="toggleStarter(item.name, $event)">
                <span class="starter-product-name">{{ starterLabel(item.name) }}</span>
                <input
                  type="number"
                  class="starter-product-price"
                  min="0"
                  step="0.01"
                  [disabled]="!item.enabled"
                  [value]="item.priceCents / 100"
                  (input)="updateStarterPrice(item.name, $event)"
                >
              </label>
            }
          </div>
          @if (error()) {
            <div class="error-banner">{{ error() }}</div>
          }
          <div class="wizard-nav">
            <button type="button" class="btn-secondary" (click)="step.set(1)">{{ 'COMMON.BACK' | translate }}</button>
            <button type="button" class="btn-submit" [disabled]="loading() || !hasEnabledStarter()" (click)="submitProducts()">
              {{ loading() ? ('COMMON.SAVING' | translate) : ('COMMON.NEXT' | translate) }}
            </button>
          </div>
        }

        @if (step() === 3) {
          <p class="signup-step-hint">{{ 'AUTH.SIGNUP_PHOTOS_HINT' | translate }}</p>
          <div class="photo-uploads">
            @for (product of onboardedProducts(); track product.id) {
              <div class="photo-upload-row">
                <div class="photo-upload-meta">
                  <strong>{{ starterLabel(product.name) }}</strong>
                  <input
                    type="number"
                    class="starter-product-price"
                    min="0"
                    step="0.01"
                    [value]="product.price_cents / 100"
                    (input)="updateOnboardedPrice(product.id, $event)"
                  >
                </div>
                <input type="file" accept="image/*" (change)="onPhotoSelected(product.id, $event)">
              </div>
            }
          </div>
          @if (error()) {
            <div class="error-banner">{{ error() }}</div>
          }
          <div class="wizard-nav">
            <button type="button" class="btn-secondary" (click)="step.set(2)">{{ 'COMMON.BACK' | translate }}</button>
            <button type="button" class="btn-submit" [disabled]="loading()" (click)="submitPhotos()">
              {{ loading() ? ('COMMON.SAVING' | translate) : ('COMMON.NEXT' | translate) }}
            </button>
          </div>
        }

        @if (step() === 4) {
          <div class="signup-complete">
            <p class="signup-complete-lead">{{ 'AUTH.SIGNUP_COMPLETE_LEAD' | translate }}</p>
            @if (tenantId()) {
              <div class="signup-qr-wrap">
                <qrcode
                  [qrdata]="publicMenuUrl()"
                  [width]="200"
                  [errorCorrectionLevel]="'M'"
                ></qrcode>
              </div>
              <p class="signup-menu-link">
                <a [href]="publicMenuUrl()" target="_blank" rel="noopener">{{ publicMenuUrl() }}</a>
              </p>
            }
            <div class="wizard-nav wizard-nav--center">
              <a routerLink="/orders" class="btn-submit btn-submit--link">{{ 'AUTH.SIGNUP_GO_DASHBOARD' | translate }}</a>
            </div>
          </div>
        }

        <div class="auth-actions-foot">
          <span>{{ 'AUTH.ALREADY_HAVE_ACCOUNT' | translate }}</span>
          <a routerLink="/login">{{ 'AUTH.SIGN_IN_LINK' | translate }}</a>
          <span class="auth-foot-sep" aria-hidden="true">·</span>
          <a routerLink="/provider/login" data-testid="register-provider-login">{{ 'LANDING.PROVIDER_LOGIN' | translate }}</a>
          @if (legalTermsUrl() || legalPrivacyUrl()) {
            <span class="auth-foot-sep" aria-hidden="true">·</span>
            <app-legal-links [inline]="true" [termsUrl]="legalTermsUrl()" [privacyUrl]="legalPrivacyUrl()" />
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-5);
      background: var(--color-bg);
    }

    .auth-card {
      width: 100%;
      max-width: 420px;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      padding: var(--space-8);
    }

    .auth-card--wide {
      max-width: 520px;
    }

    .auth-header {
      margin-bottom: var(--space-6);
    }

    .auth-header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--space-4);
    }

    .auth-header h1 {
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: var(--space-2);
    }

    .auth-header p {
      color: var(--color-text-muted);
      font-size: 0.9375rem;
    }

    .signup-intro-lead {
      color: var(--color-text);
      margin-bottom: var(--space-5);
      line-height: 1.5;
    }

    .signup-steps-list {
      margin: 0 0 var(--space-6);
      padding-left: var(--space-5);
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .signup-steps-list li {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      color: var(--color-text-muted);
      font-size: 0.9rem;
      line-height: 1.45;
    }

    .signup-steps-list strong {
      color: var(--color-text);
    }

    .register-explanation {
      background: var(--color-bg);
      border-radius: var(--radius-md);
      padding: var(--space-4);
      margin-bottom: var(--space-5);
      border-left: 4px solid var(--color-primary);
    }

    .register-explanation-title {
      font-weight: 600;
      color: var(--color-text);
      font-size: 0.9375rem;
      margin: 0 0 var(--space-2);
    }

    .register-explanation-guests {
      color: var(--color-text-muted);
      font-size: 0.8125rem;
      margin: 0;
      line-height: 1.45;
    }

    .form-group {
      margin-bottom: var(--space-4);
    }

    .form-group label {
      display: block;
      margin-bottom: var(--space-2);
      font-weight: 500;
      color: var(--color-text);
    }

    .form-group input {
      width: 100%;
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: 1rem;
    }

    .field-hint {
      display: block;
      margin-top: var(--space-1);
      color: var(--color-text-muted);
      font-size: 0.8125rem;
    }

    .input-with-toggle {
      position: relative;
      display: flex;
    }

    .input-with-toggle input {
      flex: 1;
      padding-right: 5rem;
    }

    .input-with-toggle .pw-toggle {
      position: absolute;
      right: var(--space-2);
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      padding: var(--space-1);
      cursor: pointer;
      color: var(--color-text-muted);
      font-size: 0.75rem;
    }

    .error-banner {
      background: rgba(220, 38, 38, 0.1);
      color: var(--color-error);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      margin-bottom: var(--space-4);
    }

    .sign-in-hint {
      margin-top: var(--space-2);
    }

    .sign-in-hint a {
      color: var(--color-primary);
      font-weight: 500;
    }

    .btn-submit {
      padding: var(--space-3) var(--space-5);
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-submit:hover:not(:disabled) {
      background: var(--color-primary-hover);
    }

    .btn-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-submit--link {
      display: inline-block;
      text-decoration: none;
      text-align: center;
    }

    .btn-secondary {
      padding: var(--space-3) var(--space-5);
      background: transparent;
      color: var(--color-text);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: 1rem;
      cursor: pointer;
    }

    .wizard-nav {
      display: flex;
      justify-content: space-between;
      gap: var(--space-3);
      margin-top: var(--space-5);
    }

    .wizard-nav--center {
      justify-content: center;
    }

    .signup-step-hint {
      color: var(--color-text-muted);
      margin-bottom: var(--space-4);
      line-height: 1.45;
    }

    .starter-products {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .starter-product-row {
      display: grid;
      grid-template-columns: auto 1fr 6rem;
      gap: var(--space-3);
      align-items: center;
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
    }

    .starter-product-name {
      font-weight: 500;
    }

    .starter-product-price {
      width: 100%;
      padding: var(--space-2);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
    }

    .photo-uploads {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .photo-upload-row {
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }

    .photo-upload-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-3);
      margin-bottom: var(--space-2);
    }

    .signup-complete {
      text-align: center;
    }

    .signup-complete-lead {
      margin-bottom: var(--space-5);
      color: var(--color-text);
      line-height: 1.5;
    }

    .signup-qr-wrap {
      display: flex;
      justify-content: center;
      margin-bottom: var(--space-4);
    }

    .signup-menu-link {
      word-break: break-all;
      margin-bottom: var(--space-4);
    }

    .signup-menu-link a {
      color: var(--color-primary);
    }

    .auth-actions-foot {
      margin-top: var(--space-5);
      text-align: center;
      font-size: 0.9375rem;
      color: var(--color-text-muted);
      line-height: 1.6;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: baseline;
      row-gap: var(--space-2);
    }

    .auth-actions-foot > a {
      color: var(--color-primary);
      font-weight: 500;
      margin-left: var(--space-2);
      text-decoration: none;
    }

    .auth-foot-sep {
      margin: 0 var(--space-2);
      user-select: none;
    }
  `],
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);
  translate = inject(TranslateService);
  private apiErr = inject(ApiErrorMessageService);

  step = signal(0);
  error = signal('');
  loading = signal(false);
  emailAlreadyRegistered = signal(false);
  showPassword = signal(false);
  showPasswordConfirm = signal(false);
  legalTermsUrl = signal<string | null>(null);
  legalPrivacyUrl = signal<string | null>(null);
  tenantId = signal<number | null>(null);
  starterProducts = signal<StarterProductState[]>(STARTER_DEFAULTS.map((p) => ({ ...p })));
  onboardedProducts = signal<OnboardedProduct[]>([]);
  pendingPhotos = new Map<number, File>();

  accountForm = this.fb.group(
    {
      tenant_name: ['', Validators.required],
      address: ['', Validators.required],
      phone: ['', Validators.required],
      maps_url: [''],
      full_name: ['', Validators.required],
      email: ['', [Validators.required, contactEmailValidator]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      password_confirm: ['', Validators.required],
    },
    {
      validators: (g) =>
        g.get('password')?.value === g.get('password_confirm')?.value ? null : { passwordMismatch: true },
    },
  );

  ngOnInit(): void {
    this.api.getPublicLegalUrls().subscribe({
      next: (u) => {
        this.legalTermsUrl.set(u.terms_of_service_url ?? null);
        this.legalPrivacyUrl.set(u.privacy_policy_url ?? null);
      },
      error: () => {},
    });
  }

  stepTitle(): string {
    const keys = [
      'AUTH.SIGNUP_STEP_TITLE_INTRO',
      'AUTH.SIGNUP_STEP_TITLE_ACCOUNT',
      'AUTH.SIGNUP_STEP_TITLE_PRODUCTS',
      'AUTH.SIGNUP_STEP_TITLE_PHOTOS',
      'AUTH.SIGNUP_STEP_TITLE_DONE',
    ];
    return this.translate.instant(keys[this.step()] ?? keys[0]);
  }

  starterLabel(name: string): string {
    const keyMap: Record<string, string> = {
      Coffee: 'AUTH.SIGNUP_PRODUCT_COFFEE',
      'Coca Cola': 'AUTH.SIGNUP_PRODUCT_COKE',
      Water: 'AUTH.SIGNUP_PRODUCT_WATER',
    };
    return this.translate.instant(keyMap[name] ?? name);
  }

  hasEnabledStarter(): boolean {
    return this.starterProducts().some((p) => p.enabled);
  }

  toggleStarter(name: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.starterProducts.update((items) =>
      items.map((item) => (item.name === name ? { ...item, enabled: checked } : item)),
    );
  }

  updateStarterPrice(name: string, event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const euros = parseFloat(raw);
    const cents = Number.isFinite(euros) ? Math.round(euros * 100) : 0;
    this.starterProducts.update((items) =>
      items.map((item) => (item.name === name ? { ...item, priceCents: cents } : item)),
    );
  }

  updateOnboardedPrice(productId: number, event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const euros = parseFloat(raw);
    const cents = Number.isFinite(euros) ? Math.round(euros * 100) : 0;
    this.onboardedProducts.update((items) =>
      items.map((item) => (item.id === productId ? { ...item, price_cents: cents } : item)),
    );
  }

  onPhotoSelected(productId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.pendingPhotos.set(productId, file);
    } else {
      this.pendingPhotos.delete(productId);
    }
  }

  publicMenuUrl(): string {
    const id = this.tenantId();
    if (!id) return '';
    if (typeof window === 'undefined') return `/public-menu/${id}`;
    return `${window.location.origin}/public-menu/${id}`;
  }

  submitAccount(): void {
    if (!this.accountForm.valid) return;
    this.error.set('');
    this.emailAlreadyRegistered.set(false);
    this.loading.set(true);

    const { password_confirm, ...payload } = this.accountForm.value;
    this.api.register(payload).subscribe({
      next: (res) => {
        const email = payload.email as string;
        const password = payload.password as string;
        this.tenantId.set(res.tenant_id ?? null);
        this.api.login(email, password).subscribe({
          next: () => {
            this.loading.set(false);
            this.step.set(2);
          },
          error: (err) => {
            this.loading.set(false);
            this.error.set(this.apiErr.fromHttpError(err, 'AUTH.LOGIN_FAILED'));
          },
        });
      },
      error: (err) => {
        this.loading.set(false);
        const d = err.error?.detail;
        const code =
          d && typeof d === 'object' && !Array.isArray(d) && 'code' in d
            ? (d as { code?: string }).code
            : undefined;
        this.error.set(this.apiErr.fromHttpError(err, 'COMMON.API_REQUEST_FAILED'));
        this.emailAlreadyRegistered.set(err.status === 400 && code === 'email_already_registered');
      },
    });
  }

  submitProducts(): void {
    if (!this.hasEnabledStarter()) return;
    this.error.set('');
    this.loading.set(true);
    const products = this.starterProducts().map((p) => ({
      name: p.name,
      price_cents: p.priceCents,
      enabled: p.enabled,
    }));
    this.api.seedOnboardingStarterProducts(products).subscribe({
      next: (res) => {
        this.onboardedProducts.set(res.products);
        this.loading.set(false);
        this.step.set(3);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(this.apiErr.fromHttpError(err, 'COMMON.API_REQUEST_FAILED'));
      },
    });
  }

  submitPhotos(): void {
    const products = this.onboardedProducts();
    if (products.length === 0) {
      this.step.set(4);
      return;
    }
    this.error.set('');
    this.loading.set(true);

    let chain = Promise.resolve();
    for (const product of products) {
      chain = chain.then(() =>
        new Promise<void>((resolve, reject) => {
          this.api.updateProduct(product.id, { price_cents: product.price_cents }).subscribe({
            next: () => resolve(),
            error: (err) => reject(err),
          });
        }),
      );
      const file = this.pendingPhotos.get(product.id);
      if (file) {
        chain = chain.then(() =>
          new Promise<void>((resolve, reject) => {
            this.api.uploadProductImage(product.id, file).subscribe({
              next: () => resolve(),
              error: (err) => reject(err),
            });
          }),
        );
      }
    }

    chain
      .then(() => {
        this.loading.set(false);
        this.step.set(4);
      })
      .catch((err) => {
        this.loading.set(false);
        this.error.set(this.apiErr.fromHttpError(err, 'COMMON.API_REQUEST_FAILED'));
      });
  }
}
