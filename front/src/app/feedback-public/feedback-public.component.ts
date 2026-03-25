import { Component, inject, signal, OnInit, OnDestroy, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl, SafeStyle, Title } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService, TenantSummary } from '../services/api.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguagePickerComponent } from '../shared/language-picker.component';
import { contactEmailValid, contactPhoneValid } from '../shared/contact-validators';
import { merge, Subscription } from 'rxjs';

@Component({
  selector: 'app-feedback-public',
  standalone: true,
  imports: [FormsModule, TranslateModule, LanguagePickerComponent],
  templateUrl: './feedback-public.component.html',
  styleUrls: ['../book/book.component.scss', './feedback-public.component.scss'],
})
export class FeedbackPublicComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private translate = inject(TranslateService);
  private sanitizer = inject(DomSanitizer);
  private title = inject(Title);
  private destroyRef = inject(DestroyRef);
  /** Avoids document title showing raw FEEDBACK.* before translations load (issue #67). */
  private titleI18nSub?: Subscription;

  tenantId = signal(0);
  tenant = signal<TenantSummary | null>(null);
  logoUrl = signal<string | null>(null);
  loading = signal(true);
  /** Invalid id or missing tenant; copy uses translate pipe so the picker updates wording. */
  errorKind = signal<'invalid_tenant' | 'tenant_not_found' | null>(null);
  submitting = signal(false);
  submitted = signal(false);
  submitError = signal<string | null>(null);

  reservationToken = signal<string | null>(null);

  rating = signal(0);
  comment = '';
  contactName = '';
  contactEmail = '';
  contactPhone = '';

  stars = [1, 2, 3, 4, 5];

  googleReviewUrl = computed(() => this.tenant()?.public_google_review_url?.trim() || null);
  googleMapsUrl = computed(() => this.tenant()?.public_google_maps_url?.trim() || null);

  ngOnInit() {
    // Lang switch, default-lang init, and late JSON load all affect title (issue #67).
    merge(
      this.translate.onLangChange,
      this.translate.onTranslationChange,
      this.translate.onDefaultLangChange,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateDocumentTitle());

    const idParam = this.route.snapshot.paramMap.get('tenantId');
    const tid = idParam ? parseInt(idParam, 10) : NaN;
    if (!Number.isFinite(tid) || tid < 1) {
      this.errorKind.set('invalid_tenant');
      this.loading.set(false);
      this.updateDocumentTitle();
      return;
    }
    this.tenantId.set(tid);
    const tok = this.route.snapshot.queryParamMap.get('token');
    this.reservationToken.set(tok?.trim() || null);
    this.updateDocumentTitle();

    this.api.getPublicTenant(tid).subscribe({
      next: (t) => {
        this.tenant.set(t);
        this.logoUrl.set(this.api.getTenantLogoUrl(t.logo_filename ?? undefined, t.id));
        this.loading.set(false);
        this.updateDocumentTitle();
      },
      error: () => {
        this.errorKind.set('tenant_not_found');
        this.loading.set(false);
        this.updateDocumentTitle();
      },
    });
  }

  /** Browser tab title follows selected language (issue #67). */
  private updateDocumentTitle(): void {
    const t = this.tenant();
    const name = t?.name?.trim();
    const err = this.errorKind();
    let key: string;
    if (this.loading() && !err) {
      key = 'FEEDBACK.LOADING';
    } else if (this.submitted()) {
      key = 'FEEDBACK.THANK_YOU';
    } else if (err === 'invalid_tenant') {
      key = 'FEEDBACK.INVALID_TENANT';
    } else if (err === 'tenant_not_found') {
      key = 'FEEDBACK.TENANT_NOT_FOUND';
    } else {
      key = 'FEEDBACK.TITLE';
    }
    this.titleI18nSub?.unsubscribe();

    const applyPart = (part: string) => {
      if (name && !err) {
        this.title.setTitle(`${name} – ${part}`);
      } else {
        this.title.setTitle(part);
      }
    };

    // No takeUntilDestroyed on this inner subscription: production-static builds (satisfecho.de)
    // must still update document.title (#67). Sync instant() + get(); merge() refreshes on lang/files.
    const instant = this.translate.instant(key);
    if (
      typeof instant === 'string' &&
      instant.length > 0 &&
      instant !== key &&
      !instant.startsWith('FEEDBACK.')
    ) {
      applyPart(instant);
    }

    this.titleI18nSub = this.translate.get(key).subscribe((part) => {
      if (typeof part === 'string') {
        applyPart(part);
      }
    });
  }

  ngOnDestroy(): void {
    this.titleI18nSub?.unsubscribe();
  }

  getLogoSafeUrl(url: string | null): SafeResourceUrl | null {
    if (!url) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  headerBackgroundStyle(): SafeStyle | null {
    const t = this.tenant();
    const url =
      t?.header_background_filename && t?.id
        ? this.api.getTenantHeaderBackgroundUrl(t.header_background_filename, t.id)
        : null;
    return url ? this.sanitizer.bypassSecurityTrustStyle('url("' + url + '")') : null;
  }

  setRating(n: number) {
    this.rating.set(n);
  }

  canSubmit(): boolean {
    return this.rating() >= 1 && this.rating() <= 5;
  }

  optionalContactOk(): boolean {
    const e = this.contactEmail.trim();
    const p = this.contactPhone.trim();
    if (e && !contactEmailValid(e)) return false;
    if (p && !contactPhoneValid(p)) return false;
    return true;
  }

  submit() {
    if (!this.canSubmit() || !this.optionalContactOk()) return;
    this.submitting.set(true);
    this.submitError.set(null);
    const body: Parameters<ApiService['submitPublicGuestFeedback']>[1] = {
      rating: this.rating(),
      comment: this.comment.trim() || null,
      contact_name: this.contactName.trim() || null,
      contact_email: this.contactEmail.trim() || null,
      contact_phone: this.contactPhone.trim() || null,
      reservation_token: this.reservationToken(),
    };
    this.api.submitPublicGuestFeedback(this.tenantId(), body).subscribe({
      next: () => {
        this.submitted.set(true);
        this.submitting.set(false);
        this.updateDocumentTitle();
      },
      error: (err) => {
        this.submitting.set(false);
        const status = err?.status;
        const d = err?.error?.detail;
        if (status === 429) {
          this.submitError.set(this.translate.instant('FEEDBACK.RATE_LIMIT'));
          return;
        }
        if (status === 422 || Array.isArray(d)) {
          this.submitError.set(this.translate.instant('FEEDBACK.VALIDATION_ERROR'));
          return;
        }
        if (typeof d === 'string' && d.trim()) {
          this.submitError.set(d);
          return;
        }
        this.submitError.set(this.translate.instant('FEEDBACK.SUBMIT_ERROR'));
      },
    });
  }
}
