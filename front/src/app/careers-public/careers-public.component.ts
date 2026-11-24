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
  submitting = signal(false);
  submitted = signal(false);
  submitError = signal<string | null>(null);

  name = '';
  email = '';
  phone = '';
  message = '';
  cvFile: File | null = null;

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

  canSubmit(): boolean {
    return (
      this.name.trim().length >= 2 &&
      contactEmailValid(this.email) &&
      contactPhoneValid(this.phone) &&
      !this.submitting()
    );
  }

  submit() {
    if (!this.canSubmit()) return;
    this.submitting.set(true);
    this.submitError.set(null);
    this.api
      .submitPublicCareerApplication(this.tenantRef(), {
        name: this.name.trim(),
        email: this.email.trim(),
        phone: this.phone.trim(),
        message: this.message.trim() || undefined,
        cv: this.cvFile,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.submitted.set(true);
          this.updateDocumentTitle();
        },
        error: (err) => {
          this.submitting.set(false);
          const msg =
            err?.error?.detail?.message ||
            err?.error?.message ||
            this.translate.instant('CAREERS.SUBMIT_ERROR');
          this.submitError.set(msg);
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
    else if (this.submitted()) key = 'CAREERS.THANK_YOU';
    else if (err === 'disabled') key = 'CAREERS.DISABLED';
    else if (err) key = 'CAREERS.TITLE';
    const page = this.translate.instant(key);
    this.title.setTitle(name ? `${page} - ${name}` : page);
  }
}
