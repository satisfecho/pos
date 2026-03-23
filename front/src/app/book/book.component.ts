import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl, SafeStyle } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService, Reservation, ReservationCreate, TenantSummary } from '../services/api.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguagePickerComponent } from '../shared/language-picker.component';
import { contactEmailValid, contactPhoneValid } from '../shared/contact-validators';

@Component({
  selector: 'app-book',
  standalone: true,
  imports: [FormsModule, TranslateModule, LanguagePickerComponent],
  templateUrl: './book.component.html',
  styleUrl: './book.component.scss',
})
export class BookComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  /** Latest bookable date (~12 months ahead, aligned with backend). */
  maxBookDate(): string {
    const d = new Date();
    d.setTime(d.getTime() + 366 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  }

  goManageReservation(): void {
    const token = this.successReservation()?.token;
    if (token) {
      void this.router.navigate(['/reservation'], { queryParams: { token } });
    }
  }
  private api = inject(ApiService);
  private translate = inject(TranslateService);
  private sanitizer = inject(DomSanitizer);

  minDate = () => new Date().toISOString().slice(0, 10);
  tenantId = signal<number>(0);
  tenant = signal<TenantSummary | null>(null);
  logoUrl = signal<string | null>(null);
  loading = signal(true);
  formDate = '';
  formTime = '20:00';
  formPartySize = 2;
  formName = '';
  formPhone = '';
  formEmail = '';
  formClientNotes = '';
  formCustomerNotes = '';
  submitting = signal(false);
  error = signal<string | null>(null);
  successReservation = signal<Reservation | null>(null);
  suggestedTime = signal<string | null>(null);

  /** Time options for reservation: 00:00, 00:15, ... 23:45 (European 24h). */
  timeOptions: string[] = (() => {
    const opts: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (const m of [0, 15, 30, 45]) {
        opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return opts;
  })();

  /**
   * 15-minute slots for the selected date: within opening hours and at least 1h before closing (matches backend).
   * If hours are not configured, all quarter hours are shown.
   */
  bookableTimeOptions(): string[] {
    const json = this.tenant()?.opening_hours;
    const dateStr = this.formDate;
    if (!json?.trim() || !dateStr) {
      return this.timeOptions;
    }
    try {
      const oh = JSON.parse(json) as Record<string, Record<string, unknown>>;
      const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const d = new Date(`${dateStr}T12:00:00`);
      const dayKey = dayKeys[d.getDay()];
      const day = oh[dayKey];
      if (!day || typeof day !== 'object') {
        return [];
      }
      const dh = day as Record<string, unknown>;
      if (dh['closed']) {
        return [];
      }
      const parseMin = (s: unknown): number | null => {
        if (s == null || typeof s !== 'string') return null;
        const p = s.trim().split(':').map((x) => parseInt(x, 10));
        if (p.length < 1 || Number.isNaN(p[0])) return null;
        const h = p[0];
        const m = p[1] ?? 0;
        return h * 60 + m;
      };
      const allowedBeforeClose = (closeMin: number, resMin: number): boolean => {
        const lastMins = (closeMin - 60 + 24 * 60) % (24 * 60);
        return resMin <= lastMins;
      };
      type Win = { open: string; close: string };
      const windows: Win[] = [];
      if (dh['hasBreak'] === true) {
        const mo = (dh['morningOpen'] as string) || (dh['open'] as string);
        const mc = dh['morningClose'] as string;
        const eo = dh['eveningOpen'] as string;
        const ec = (dh['eveningClose'] as string) || (dh['close'] as string);
        if (mo && mc && eo && ec) {
          windows.push({ open: mo, close: mc }, { open: eo, close: ec });
        }
      } else {
        const o = dh['open'] as string;
        const c = (dh['eveningClose'] as string) || (dh['close'] as string);
        if (o && c) {
          windows.push({ open: o, close: c });
        }
      }
      const seen = new Set<string>();
      const out: string[] = [];
      for (const w of windows) {
        const om = parseMin(w.open);
        const cm = parseMin(w.close);
        if (om === null || cm === null) continue;
        let t = Math.floor((om + 14) / 15) * 15;
        while (t < cm) {
          if (allowedBeforeClose(cm, t)) {
            const hh = Math.floor(t / 60) % 24;
            const mm = t % 60;
            const key = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
            if (!seen.has(key)) {
              seen.add(key);
              out.push(key);
            }
          }
          t += 15;
        }
      }
      out.sort();
      return out.length ? out : this.timeOptions;
    } catch {
      return this.timeOptions;
    }
  }

  /** If current formTime is not in allowed slots, pick the first allowed (or keep next-available suggestion). */
  private syncFormTimeToAllowed(): void {
    const opts = this.bookableTimeOptions();
    if (opts.length && !opts.includes(this.formTime)) {
      this.formTime = opts[0];
    }
  }

  today = computed(() => new Date().toISOString().slice(0, 10));

  googleMapsUrl = computed(() => this.tenant()?.public_google_maps_url?.trim() || null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('tenantId');
    const n = id ? parseInt(id, 10) : 0;
    if (n) this.tenantId.set(n);
    const today = new Date().toISOString().slice(0, 10);
    this.formDate = today;
    this.onDateChange(today);
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
        this.syncFormTimeToAllowed();
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

  onDateChange(dateStr: string) {
    const tid = this.tenantId();
    if (!tid || !dateStr) return;
    this.api.getNextAvailableReservation(tid, dateStr).subscribe({
      next: (res) => {
        const time = this.roundTimeToQuarter(res.time);
        this.suggestedTime.set(time);
        this.formTime = time;
        // If the next available slot is on a different date (e.g. tomorrow), show that date so the suggested time is not in the past
        if (res.date) {
          this.formDate = res.date;
        }
        this.syncFormTimeToAllowed();
      },
      error: () => this.suggestedTime.set(null),
    });
  }

  /** Round time to nearest 15 minutes (European 24h). */
  roundTimeToQuarter(t: string): string {
    if (!t) return '20:00';
    const [h, m] = t.split(':').map(Number);
    const quarter = Math.round((h * 60 + (m || 0)) / 15) * 15;
    const nh = Math.floor(quarter / 60) % 24;
    const nm = quarter % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
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
