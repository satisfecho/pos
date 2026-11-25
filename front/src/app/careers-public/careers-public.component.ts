import {
  Component,
  DestroyRef,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl, SafeStyle, Title } from '@angular/platform-browser';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { merge } from 'rxjs';
import { ApiService, PublicCareersInfo, TenantSummary } from '../services/api.service';
import { PublicGuestHeaderComponent } from '../shared/public-guest-header.component';
import { LegalLinksComponent } from '../shared/legal-links.component';
import { resolvePublicPrimaryColor } from '../shared/public-brand-colors';
import { contactEmailValid, contactPhoneValid } from '../shared/contact-validators';

type ApplyStep = 'form' | 'code' | 'done';

@Component({
  selector: 'app-careers-public',
  standalone: true,
  imports: [FormsModule, TranslateModule, PublicGuestHeaderComponent, LegalLinksComponent],
  templateUrl: './careers-public.component.html',
  styleUrls: ['../book/book.component.scss', './careers-public.component.scss'],
})
export class CareersPublicComponent implements OnInit {
  readonly resolvePublicPrimaryColor = resolvePublicPrimaryColor;
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private translate = inject(TranslateService);
  private sanitizer = inject(DomSanitizer);
  private title = inject(Title);
  private destroyRef = inject(DestroyRef);

  tenantRef = signal<string>('');
  tenantId = signal(0);
  tenant = signal<TenantSummary | null>(null);
  careers = signal<PublicCareersInfo | null>(null);
  logoUrl = signal<string | null>(null);
  loading = signal(true);
  errorKind = signal<'invalid_tenant' | 'tenant_not_found' | 'disabled' | null>(null);
  applyStep = signal<ApplyStep>('form');
  submitting = signal(false);
  submitError = signal<string | null>(null);
  resendCooldown = signal(false);
  /** Dev-only code when SMTP is missing (never shown in production API). */
  devCodeHint = signal<string | null>(null);

  name = '';
  email = '';
  phone = '';
  message = '';
  cvFile: File | null = null;
  verificationCode = '';
  private submitToken: string | null = null;

  retentionDays = computed(() => this.careers()?.retention_days ?? 180);
  whyText = computed(() => this.careers()?.why_text?.trim() || null);
  googleMapsUrl = computed(() => this.tenant()?.public_google_maps_url?.trim() || null);
  openstreetmapUrl = computed(() => this.tenant()?.public_openstreetmap_url?.trim() || null);
  termsOfServiceUrl = computed(() => this.tenant()?.terms_of_service_url?.trim() || null);
  privacyPolicyUrl = computed(() => this.tenant()?.privacy_policy_url?.trim() || null);

  constructor() {
    afterNextRender(() => this.updateDocumentTitle());
  }

  ngOnInit() {
    merge(
      this.translate.onLangChange,
      this.translate.onTranslationChange,
      this.translate.onDefaultLangChange,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateDocumentTitle());

    const ref =
      this.route.snapshot.paramMap.get('tenantId') ||
      this.route.snapshot.paramMap.get('publicSlug') ||
      '';
    if (!ref.trim()) {
      this.errorKind.set('invalid_tenant');
      this.loading.set(false);
      this.updateDocumentTitle();
      return;
    }
    this.tenantRef.set(ref.trim());
    const asNum = parseInt(ref, 10);
    if (Number.isFinite(asNum) && String(asNum) === ref.trim()) {
      this.tenantId.set(asNum);
    }

    this.api.getPublicCareers(ref.trim()).subscribe({
      next: (info) => {
        this.careers.set(info);
        this.tenantId.set(info.tenant_id);
        this.api.getPublicTenant(info.tenant_id).subscribe({
          next: (t) => {
            this.tenant.set(t);
            this.logoUrl.set(this.api.getTenantLogoUrl(t.logo_filename ?? undefined, t.id));
            this.loading.set(false);
            this.updateDocumentTitle();
          },
          error: () => {
            this.tenant.set({
              id: info.tenant_id,
              name: info.tenant_name,
              logo_filename: info.logo_filename ?? null,
              header_background_filename: info.header_background_filename ?? null,
              address: info.address ?? null,
              public_background_color: info.public_background_color ?? null,
              public_primary_color: info.public_primary_color ?? null,
              public_google_maps_url: info.public_google_maps_url ?? null,
              public_openstreetmap_url: info.public_openstreetmap_url ?? null,
              public_slug: info.public_slug ?? null,
            });
            this.logoUrl.set(
              this.api.getTenantLogoUrl(info.logo_filename ?? undefined, info.tenant_id),
            );
            this.loading.set(false);
            this.updateDocumentTitle();
          },
        });
      },
      error: (err) => {
        const code = err?.error?.detail?.code || err?.error?.code;
        if (code === 'careers_disabled' || err?.status === 404) {
          this.errorKind.set(code === 'careers_disabled' ? 'disabled' : 'tenant_not_found');
        } else {
          this.errorKind.set('tenant_not_found');
        }
        this.loading.set(false);
        this.updateDocumentTitle();
      },
    });
  }

  onCvSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.cvFile = file;
  }

  canRequestCode(): boolean {
    return (
      this.name.trim().length >= 2 &&
      contactEmailValid(this.email) &&
      contactPhoneValid(this.phone) &&
      !this.submitting()
    );
  }

  canConfirmCode(): boolean {
    return /^\d{6}$/.test(this.verificationCode.trim()) && !this.submitting();
  }

  requestCode() {
    if (!this.canRequestCode()) return;
    this.submitting.set(true);
    this.submitError.set(null);
    this.devCodeHint.set(null);
    this.submitToken = null;
    this.api.requestCareersVerificationCode(this.tenantRef(), this.email.trim()).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.applyStep.set('code');
        if (res.dev_code) {
          this.devCodeHint.set(res.dev_code);
        }
        this.updateDocumentTitle();
      },
      error: (err) => {
        this.submitting.set(false);
        this.submitError.set(
          err?.error?.detail?.message ||
            err?.error?.message ||
            this.translate.instant('CAREERS.CODE_SEND_ERROR'),
        );
      },
    });
  }

  resendCode() {
    if (this.submitting() || this.resendCooldown()) return;
    this.submitting.set(true);
    this.submitError.set(null);
    this.devCodeHint.set(null);
    this.api.requestCareersVerificationCode(this.tenantRef(), this.email.trim()).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.resendCooldown.set(true);
        if (res.dev_code) {
          this.devCodeHint.set(res.dev_code);
        }
        setTimeout(() => this.resendCooldown.set(false), 8000);
      },
      error: (err) => {
        this.submitting.set(false);
        this.submitError.set(
          err?.error?.detail?.message ||
            err?.error?.message ||
            this.translate.instant('CAREERS.CODE_SEND_ERROR'),
        );
      },
    });
  }

  confirmAndSubmit() {
    if (!this.canConfirmCode()) return;
    this.submitting.set(true);
    this.submitError.set(null);
    const code = this.verificationCode.trim();
    this.api.confirmCareersVerificationCode(this.tenantRef(), this.email.trim(), code).subscribe({
      next: (res) => {
        this.submitToken = res.submit_token;
        this.finishSubmit();
      },
      error: (err) => {
        this.submitting.set(false);
        this.submitError.set(
          err?.error?.detail?.message ||
            err?.error?.message ||
            this.translate.instant('CAREERS.CODE_INVALID'),
        );
      },
    });
  }

  backToForm() {
    this.applyStep.set('form');
    this.verificationCode = '';
    this.submitToken = null;
    this.submitError.set(null);
    this.devCodeHint.set(null);
    this.updateDocumentTitle();
  }

  private finishSubmit() {
    const token = this.submitToken;
    if (!token) {
      this.submitting.set(false);
      this.submitError.set(this.translate.instant('CAREERS.CODE_INVALID'));
      return;
    }
    this.api
      .submitPublicCareerApplication(this.tenantRef(), {
        name: this.name.trim(),
        email: this.email.trim(),
        phone: this.phone.trim(),
        message: this.message.trim() || undefined,
        cv: this.cvFile,
        submit_token: token,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.applyStep.set('done');
          this.submitToken = null;
          this.updateDocumentTitle();
        },
        error: (err) => {
          this.submitting.set(false);
          this.submitToken = null;
          this.submitError.set(
            err?.error?.detail?.message ||
              err?.error?.message ||
              this.translate.instant('CAREERS.SUBMIT_ERROR'),
          );
        },
      });
  }

  getLogoSafeUrl(url: string | null): SafeResourceUrl | null {
    if (!url) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  headerBackgroundStyle(): SafeStyle | null {
    const fn = this.tenant()?.header_background_filename;
    if (!fn || !this.tenantId()) return null;
    const url = this.api.getTenantHeaderBackgroundUrl(fn, this.tenantId());
    if (!url) return null;
    return this.sanitizer.bypassSecurityTrustStyle(`url("${url}")`);
  }

  private updateDocumentTitle(): void {
    const name = this.tenant()?.name?.trim() || this.careers()?.tenant_name?.trim();
    const err = this.errorKind();
    let key = 'CAREERS.TITLE';
    if (this.loading() && !err) key = 'CAREERS.LOADING';
    else if (this.applyStep() === 'done') key = 'CAREERS.THANK_YOU';
    else if (this.applyStep() === 'code') key = 'CAREERS.VERIFY_TITLE';
    else if (err === 'disabled') key = 'CAREERS.DISABLED';
    else if (err) key = 'CAREERS.TITLE';
    const page = this.translate.instant(key);
    this.title.setTitle(name ? `${page} - ${name}` : page);
  }
}
