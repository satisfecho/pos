import { Component, inject, signal, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl, SafeStyle } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService, TenantSummary } from '../services/api.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguagePickerComponent } from '../shared/language-picker.component';
import { LegalLinksComponent } from '../shared/legal-links.component';
import { contactPhoneValid } from '../shared/contact-validators';
import { ApiErrorMessageService } from '../services/api-error-message.service';

@Component({
  selector: 'app-waitlist-public',
  standalone: true,
  imports: [FormsModule, TranslateModule, LanguagePickerComponent, LegalLinksComponent, RouterLink],
  templateUrl: './waitlist-public.component.html',
  styleUrls: ['../book/book.component.scss', './waitlist-public.component.scss'],
})
export class WaitlistPublicComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private translate = inject(TranslateService);
  private sanitizer = inject(DomSanitizer);
  private apiErr = inject(ApiErrorMessageService);

  tenantId = signal(0);
  tenant = signal<TenantSummary | null>(null);
  logoUrl = signal<string | null>(null);
  loading = signal(true);
  submitting = signal(false);
  success = signal(false);
  error = signal<string | null>(null);

  formName = '';
  formPartySize = 2;
  formPhone = '';

  termsOfServiceUrl = signal<string | null>(null);
  privacyPolicyUrl = signal<string | null>(null);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('tenantId');
    const n = idParam ? parseInt(idParam, 10) : 0;
    if (!n || Number.isNaN(n)) {
      this.loading.set(false);
      this.error.set(this.translate.instant('WAITLIST.ERROR_INVALID_LINK'));
      return;
    }
    this.tenantId.set(n);
    this.api.getPublicTenant(n).subscribe({
      next: (t) => {
        this.tenant.set(t);
        this.logoUrl.set(this.api.getTenantLogoUrl(t.logo_filename ?? undefined, t.id));
        this.termsOfServiceUrl.set(t.terms_of_service_url?.trim() || null);
        this.privacyPolicyUrl.set(t.privacy_policy_url?.trim() || null);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(this.translate.instant('WAITLIST.ERROR_INVALID_LINK'));
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

  submit(): void {
    this.error.set(null);
    const tid = this.tenantId();
    if (!tid) {
      this.error.set(this.translate.instant('WAITLIST.ERROR_INVALID_LINK'));
      return;
    }
    const name = this.formName.trim();
    if (!name) {
      this.error.set(this.translate.instant('RESERVATIONS.CUSTOMER_NAME'));
      return;
    }
    if (!contactPhoneValid(this.formPhone)) {
      this.error.set(this.translate.instant('WAITLIST.INVALID_PHONE'));
      return;
    }
    if (this.formPartySize < 1 || this.formPartySize > 99) {
      this.error.set(this.translate.instant('RESERVATIONS.ERROR_PARTY_SIZE_RANGE'));
      return;
    }
    this.submitting.set(true);
    this.api.submitPublicWaitingList(tid, {
      customer_name: name,
      customer_phone: this.formPhone.trim(),
      party_size: this.formPartySize,
    }).subscribe({
      next: () => {
        this.success.set(true);
        this.submitting.set(false);
      },
      error: (e) => {
        this.error.set(this.apiErr.fromHttpError(e, 'WAITLIST.ERROR_FAILED'));
        this.submitting.set(false);
      },
    });
  }
}
