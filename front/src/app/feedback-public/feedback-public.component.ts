import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { DomSanitizer, SafeResourceUrl, SafeStyle } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService, TenantSummary } from '../services/api.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguagePickerComponent } from '../shared/language-picker.component';
import { contactEmailValid, contactPhoneValid } from '../shared/contact-validators';

@Component({
  selector: 'app-feedback-public',
  standalone: true,
  imports: [FormsModule, TranslateModule, LanguagePickerComponent],
  templateUrl: './feedback-public.component.html',
  styleUrls: ['../book/book.component.scss', './feedback-public.component.scss'],
})
export class FeedbackPublicComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private translate = inject(TranslateService);
  private sanitizer = inject(DomSanitizer);

  tenantId = signal(0);
  tenant = signal<TenantSummary | null>(null);
  logoUrl = signal<string | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
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

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('tenantId');
    const tid = idParam ? parseInt(idParam, 10) : NaN;
    if (!Number.isFinite(tid) || tid < 1) {
      this.error.set(this.translate.instant('FEEDBACK.INVALID_TENANT'));
      this.loading.set(false);
      return;
    }
    this.tenantId.set(tid);
    const tok = this.route.snapshot.queryParamMap.get('token');
    this.reservationToken.set(tok?.trim() || null);

    this.api.getPublicTenant(tid).subscribe({
      next: (t) => {
        this.tenant.set(t);
        this.logoUrl.set(this.api.getTenantLogoUrl(t.logo_filename ?? undefined, t.id));
        this.loading.set(false);
      },
      error: () => {
        this.error.set(this.translate.instant('FEEDBACK.TENANT_NOT_FOUND'));
        this.loading.set(false);
      },
    });
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
      },
      error: (err) => {
        this.submitting.set(false);
        const d = err?.error?.detail;
        this.submitError.set(
          typeof d === 'string' ? d : this.translate.instant('FEEDBACK.SUBMIT_ERROR'),
        );
      },
    });
  }
}
