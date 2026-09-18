import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService, TenantSummary } from '../services/api.service';
import { LanguagePickerComponent } from '../shared/language-picker.component';
import { PublicGuestHeaderComponent } from '../shared/public-guest-header.component';
import { PublicGuestSalesCtasComponent } from '../shared/public-guest-sales-ctas.component';
import { LegalLinksComponent } from '../shared/legal-links.component';
import { resolvePublicPrimaryColor } from '../shared/public-brand-colors';

@Component({
  selector: 'app-loyalty-card-public',
  standalone: true,
  imports: [
    TranslateModule,
    LanguagePickerComponent,
    PublicGuestHeaderComponent,
    PublicGuestSalesCtasComponent,
    LegalLinksComponent,
  ],
  template: `
    <div
      class="book-page loyalty-card"
      data-testid="loyalty-card-page"
      [style.--color-bg]="tenant()?.public_background_color ?? null"
      [style.--hero-header-bg]="tenant()?.public_background_color ?? null"
      [style.--color-primary]="resolvePublicPrimaryColor(tenant()?.public_primary_color)"
    >
      @if (tenantId(); as tid) {
        <app-public-guest-header
          [tenantId]="tid"
          [tenantName]="tenant()?.name ?? null"
          [logoUrl]="logoUrl()"
          [headerBackgroundColor]="tenant()?.public_background_color ?? null"
          activePage="loyalty"
        />
      } @else {
        <header class="book-header loyalty-bare-header">
          <app-language-picker></app-language-picker>
        </header>
      }
      @if (loading()) {
        <main class="book-content">
          <div class="book-card">
            <p class="hint">{{ 'COMMON.LOADING' | translate }}</p>
          </div>
        </main>
      } @else if (error()) {
        <main class="book-content">
          <div class="book-card">
            <p class="form-error">{{ 'LOYALTY_PUBLIC.CARD_NOT_FOUND' | translate }}</p>
          </div>
        </main>
      } @else {
        <main class="book-content">
          <div class="book-card">
            <h1 class="loyalty-title">{{ programName() }}</h1>
            <p class="member-name">{{ displayName() }}</p>
            <p class="balance">
              {{ 'LOYALTY_PUBLIC.BALANCE' | translate }}: <strong>{{ balance() }}</strong>
            </p>
            @if (vipTier()) {
              <p class="tier" data-testid="loyalty-card-vip">
                {{ 'LOYALTY_PUBLIC.VIP_TIER' | translate }}: <strong>{{ vipTier() }}</strong>
              </p>
            }
            @if (referralCode() && tenantId()) {
              <p class="token-hint">{{ 'LOYALTY_PUBLIC.REFERRAL_SHARE' | translate }}</p>
              <p class="token">
                <code>{{ origin }}/loyalty/{{ tenantId() }}?ref={{ referralCode() }}</code>
              </p>
            }
            @if (applePkpassUrl() || googleSaveUrl()) {
              <div class="wallet-actions" data-testid="loyalty-card-wallet-actions">
                @if (applePkpassUrl(); as appleUrl) {
                  <a class="btn btn-primary" [href]="appleUrl" data-testid="loyalty-card-add-apple">
                    {{ 'LOYALTY_PUBLIC.ADD_APPLE_WALLET' | translate }}
                  </a>
                }
                @if (googleSaveUrl(); as gUrl) {
                  <a
                    class="btn btn-primary"
                    [href]="gUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="loyalty-card-add-google"
                  >
                    {{ 'LOYALTY_PUBLIC.ADD_GOOGLE_WALLET' | translate }}
                  </a>
                }
              </div>
            }
            @if (tenantId(); as tid) {
              <app-public-guest-sales-ctas
                [tenantId]="tid"
                [publicMenuRef]="tenant()?.public_slug?.trim() || tid"
                [publicBookSlug]="tenant()?.public_slug?.trim() || null"
              />
            }
          </div>
        </main>
      }
      <div class="book-legal-footer">
        <app-legal-links></app-legal-links>
      </div>
    </div>
  `,
  styleUrls: ['../book/book.component.scss'],
  styles: [
    `
      .loyalty-card .loyalty-bare-header {
        display: flex;
        justify-content: flex-end;
        padding: var(--space-3) var(--space-4);
      }
      .loyalty-card .loyalty-title {
        margin: 0 0 var(--space-2);
        font-size: 1.5rem;
        line-height: 1.3;
      }
      .loyalty-card .member-name {
        margin: 0 0 var(--space-4);
        color: var(--color-text-muted, #4b5563);
      }
      .loyalty-card .balance,
      .loyalty-card .tier {
        font-size: 1.25rem;
        margin: 0 0 var(--space-3);
      }
      .loyalty-card .form-error {
        margin: 0;
      }
      .loyalty-card .hint {
        color: var(--color-text-muted, #666);
        margin: 0;
      }
      .loyalty-card .token-hint {
        margin: var(--space-4) 0 var(--space-1);
        color: var(--color-text-muted, #666);
        font-size: 0.875rem;
      }
      .loyalty-card .token code {
        display: block;
        word-break: break-all;
        padding: var(--space-2) var(--space-3);
        background: var(--color-bg, #f3f4f6);
        border-radius: var(--radius-md, 6px);
        font-size: 0.8125rem;
        border: 1px solid var(--color-border, #e5e7eb);
      }
      .loyalty-card .wallet-actions {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        margin-top: var(--space-4);
      }
      .loyalty-card .wallet-actions .btn {
        width: 100%;
        margin-top: 0;
      }
    `,
  ],
})
export class LoyaltyCardPublicComponent implements OnInit {
  readonly resolvePublicPrimaryColor = resolvePublicPrimaryColor;
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);

  loading = signal(true);
  error = signal(false);
  programName = signal('');
  displayName = signal('');
  balance = signal(0);
  vipTier = signal<string | null>(null);
  referralCode = signal<string | null>(null);
  tenantId = signal<number | null>(null);
  tenant = signal<TenantSummary | null>(null);
  logoUrl = signal<string | null>(null);
  applePkpassUrl = signal<string | null>(null);
  googleSaveUrl = signal<string | null>(null);
  origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : '';

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('memberToken') || '';
    if (!token) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }
    this.api.getPublicLoyaltyBalance(token).subscribe({
      next: (res) => {
        this.programName.set(res.program?.program_name || '');
        this.displayName.set(res.membership.display_name);
        this.balance.set(res.membership.balance);
        this.vipTier.set(res.membership.vip_tier ?? null);
        this.referralCode.set(res.membership.referral_code ?? null);
        const tid = res.membership.tenant_id ?? null;
        this.tenantId.set(tid);
        if (tid) {
          this.api.getPublicTenant(tid).subscribe({
            next: (t) => {
              this.tenant.set(t);
              this.logoUrl.set(this.api.getTenantLogoUrl(t.logo_filename ?? undefined, t.id));
            },
          });
        }
        if (res.wallet?.apple_wallet_available) {
          this.applePkpassUrl.set(this.api.getPublicLoyaltyApplePkpassUrl(token));
        }
        if (res.wallet?.google_wallet_available) {
          this.api.getPublicLoyaltyGoogleSave(token).subscribe({
            next: (g) => this.googleSaveUrl.set(g.google_save_url || null),
            error: () => this.googleSaveUrl.set(null),
          });
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
