import { Component, inject, signal, computed, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl, SafeStyle } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService, Reservation, ReservationCreate, TenantSummary } from '../services/api.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguagePickerComponent } from '../shared/language-picker.component';
import { LegalLinksComponent } from '../shared/legal-links.component';
import { ReservationWeekSlotGridComponent } from '../shared/reservation-week-slot-grid.component';
import { contactEmailValid, contactPhoneValid } from '../shared/contact-validators';

@Component({
  selector: 'app-book',
  standalone: true,
  imports: [FormsModule, TranslateModule, LanguagePickerComponent, ReservationWeekSlotGridComponent, LegalLinksComponent],
  templateUrl: './book.component.html',
  styleUrl: './book.component.scss',
})
export class BookComponent implements OnInit {
  @ViewChild(ReservationWeekSlotGridComponent) private weekSlotGrid?: ReservationWeekSlotGridComponent;

  private route = inject(ActivatedRoute);
  private router = inject(Router);

  goManageReservation(): void {
    const token = this.successReservation()?.token;
    if (token) {
      void this.router.navigate(['/reservation'], { queryParams: { token } });
    }
  }
  private api = inject(ApiService);
  private translate = inject(TranslateService);
  private sanitizer = inject(DomSanitizer);

  tenantId = signal<number>(0);
  tenant = signal<TenantSummary | null>(null);
  logoUrl = signal<string | null>(null);
  loading = signal(true);
  formDate = '';
  formTime = '';
  formPartySize = 2;
  formName = '';
  formPhone = '';
  formEmail = '';
  formClientNotes = '';
  formCustomerNotes = '';
  submitting = signal(false);
  error = signal<string | null>(null);
  successReservation = signal<Reservation | null>(null);

  /** Today YYYY-MM-DD in tenant IANA timezone (or browser TZ as fallback). */
  tenantTodayDate(): string {
    const tz =
      this.tenant()?.timezone?.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone;
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  googleMapsUrl = computed(() => this.tenant()?.public_google_maps_url?.trim() || null);
  openstreetmapUrl = computed(() => this.tenant()?.public_openstreetmap_url?.trim() || null);
  termsOfServiceUrl = computed(() => this.tenant()?.terms_of_service_url?.trim() || null);
  privacyPolicyUrl = computed(() => this.tenant()?.privacy_policy_url?.trim() || null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('tenantId');
    const n = id ? parseInt(id, 10) : 0;
    if (n) this.tenantId.set(n);
  }

  ngOnInit(): void {
    const tid = this.tenantId();
    if (!tid) {
      this.loading.set(false);
      return;
    }
    this.api.getPublicTenant(tid).subscribe({
      next: (t) => {
        this.tenant.set(t);
        const url = this.api.getTenantLogoUrl(t.logo_filename ?? undefined, t.id);
        this.logoUrl.set(url);
        this.loading.set(false);
        this.formDate = this.tenantTodayDate();
        this.formTime = '';
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  getLogoSafeUrl(url: string | null): SafeResourceUrl | null {
    if (!url) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  /** Safe style for hero header background image (for use with [style.background-image]). */
  headerBackgroundStyle(): SafeStyle | null {
    const t = this.tenant();
    const url = t?.header_background_filename && t?.id
      ? this.api.getTenantHeaderBackgroundUrl(t.header_background_filename, t.id) : null;
    return url ? this.sanitizer.bypassSecurityTrustStyle('url("' + url + '")') : null;
  }

  /** Build WhatsApp wa.me link from phone string (e.g. +34 612 345 678 -> https://wa.me/34612345678). */
  getWhatsAppUrl(phone: string): string {
    const digits = (phone || '').replace(/\D/g, '');
    return `https://wa.me/${digits}`;
  }

  /** Format opening_hours JSON for display in current locale (e.g. "Mon–Fri 09:00–22:00, Sat 10:00–20:00, Sun closed"). */
  formatOpeningHours(json: string | null | undefined): string {
    if (!json) return '';
    try {
      const oh = JSON.parse(json);
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const locale = this.translate.currentLang || this.translate.defaultLang || 'en';
      const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
      const short = days.map((_, i) => formatter.format(new Date(2024, 0, 1 + i)));
      const closedLabel = this.translate.instant('SETTINGS.CLOSED');
      const parts: string[] = [];
      let i = 0;
      while (i < days.length) {
        const d = oh[days[i]];
        if (!d) {
          i++;
          continue;
        }
        if (d.closed) {
          parts.push(`${short[i]} ${closedLabel}`);
          i++;
          continue;
        }
        const range = d.hasBreak
          ? `${d.morningOpen}–${d.morningClose}, ${d.eveningOpen}–${d.eveningClose}`
          : `${d.open}–${d.close}`;
        let j = i + 1;
        while (j < days.length) {
          const n = oh[days[j]];
          if (!n || n.closed !== d.closed || n.hasBreak !== d.hasBreak) break;
          if (d.hasBreak) {
            if (n.morningOpen !== d.morningOpen || n.morningClose !== d.morningClose ||
                n.eveningOpen !== d.eveningOpen || n.eveningClose !== d.eveningClose) break;
          } else if (n.open !== d.open || n.close !== d.close) break;
          j++;
        }
        parts.push(j > i + 1 ? `${short[i]}–${short[j - 1]} ${range}` : `${short[i]} ${range}`);
        i = j;
      }
      return parts.join(', ');
    } catch {
      return '';
    }
  }

  /** Build a simple browser fingerprint string (hash of userAgent, screen, timezone). */
  private getClientFingerprint(): string {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const w = typeof screen !== 'undefined' ? screen.width : 0;
    const h = typeof screen !== 'undefined' ? screen.height : 0;
    const tz = typeof Intl !== 'undefined' && Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
    const lang = typeof navigator !== 'undefined' ? navigator.language : '';
    const s = `${ua}|${w}x${h}|${tz}|${lang}`;
    let hc = 0;
    for (let i = 0; i < s.length; i++) {
      hc = ((hc << 5) - hc + s.charCodeAt(i)) | 0;
    }
    return String(hc >>> 0);
  }

  submit() {
    this.error.set(null);
    const tid = this.tenantId();
    if (!tid) {
      this.error.set(this.translate.instant('BOOK.ERROR_INVALID_LINK'));
      return;
    }
    if (!contactPhoneValid(this.formPhone)) {
      this.error.set(this.translate.instant('BOOK.INVALID_PHONE'));
      return;
    }
    const em = this.formEmail.trim();
    if (em && !contactEmailValid(em)) {
      this.error.set(this.translate.instant('BOOK.INVALID_EMAIL'));
      return;
    }
    if (!this.formDate?.trim() || !this.formTime?.trim()) {
      this.error.set(this.translate.instant('BOOK.PICK_SLOT'));
      return;
    }
    const st = this.weekSlotGrid?.slotState(this.formDate, this.formTime) ?? 'out_of_hours';
    if (st !== 'available') {
      this.error.set(this.translate.instant('BOOK.SLOT_UNAVAILABLE'));
      return;
    }
    this.submitting.set(true);
    const body: ReservationCreate = {
      tenant_id: tid,
      customer_name: this.formName.trim(),
      customer_phone: this.formPhone.trim(),
      customer_email: this.formEmail.trim() || undefined,
      reservation_date: this.formDate,
      reservation_time: this.formTime,
      party_size: this.formPartySize,
      client_notes: this.formClientNotes.trim() || undefined,
      customer_notes: this.formCustomerNotes.trim() || undefined,
      client_fingerprint: this.getClientFingerprint(),
      client_screen_width: typeof screen !== 'undefined' ? screen.width : undefined,
      client_screen_height: typeof screen !== 'undefined' ? screen.height : undefined,
    };
    this.api.createReservationPublic(body).subscribe({
      next: (res) => {
        this.successReservation.set(res);
        this.submitting.set(false);
      },
      error: (e) => {
        this.error.set(e.error?.detail || this.translate.instant('BOOK.ERROR_FAILED'));
        this.submitting.set(false);
      },
    });
  }
}
