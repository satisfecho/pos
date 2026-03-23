import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { DomSanitizer, SafeResourceUrl, SafeStyle } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ApiService,
  Reservation,
  ReservationCreate,
  ReservationBookWeekSlotsResponse,
  TenantSummary,
} from '../services/api.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguagePickerComponent } from '../shared/language-picker.component';
import { contactEmailValid, contactPhoneValid } from '../shared/contact-validators';

@Component({
  selector: 'app-book',
  standalone: true,
  imports: [FormsModule, NgClass, TranslateModule, LanguagePickerComponent],
  templateUrl: './book.component.html',
  styleUrl: './book.component.scss',
})
export class BookComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  /** Latest bookable date (~12 months ahead from “today” in tenant timezone). */
  maxBookDateStr(): string {
    const base = this.tenantTodayDate();
    const [y, m, d] = base.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + 366);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }

  /** Minimum date for the date input (today in tenant TZ when loaded). */
  minBookableDateInput(): string {
    if (this.tenant()) return this.tenantTodayDate();
    return new Date().toISOString().slice(0, 10);
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

  tenantId = signal<number>(0);
  tenant = signal<TenantSummary | null>(null);
  logoUrl = signal<string | null>(null);
  loading = signal(true);
  /** Mon–Sun slot grid (public book-week-slots API). */
  bookWeekSlots = signal<ReservationBookWeekSlotsResponse | null>(null);
  weekSlotsLoading = signal(false);
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

  private addIsoDays(iso: string, delta: number): string {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d + delta);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }

  loadBookWeekSlots(weekAnchor?: string | null): void {
    const tid = this.tenantId();
    if (!tid) return;
    this.weekSlotsLoading.set(true);
    this.api.getReservationBookWeekSlots(tid, this.formPartySize, weekAnchor ?? undefined).subscribe({
      next: (res) => {
        this.bookWeekSlots.set(res);
        this.weekSlotsLoading.set(false);
        this.ensureSelectionFitsGrid();
      },
      error: () => {
        this.bookWeekSlots.set(null);
        this.weekSlotsLoading.set(false);
      },
    });
  }

  slotState(dateStr: string, timeStr: string): string {
    const w = this.bookWeekSlots();
    if (!w || !timeStr) return 'out_of_hours';
    const day = w.days.find((d) => d.date === dateStr);
    if (!day) return 'out_of_hours';
    return day.cells[timeStr] ?? 'out_of_hours';
  }

  weekSlotButtonClass(dateStr: string, timeStr: string): Record<string, boolean> {
    const st = this.slotState(dateStr, timeStr);
    const selected = dateStr === this.formDate && timeStr === this.formTime;
    return {
      'ws-available': st === 'available',
      'ws-full': st === 'full',
      'ws-muted':
        st === 'past' ||
        st === 'closed_day' ||
        st === 'out_of_hours' ||
        st === 'out_of_range',
      'ws-selected': selected && st === 'available',
    };
  }

  weekSlotSelectable(dateStr: string, timeStr: string): boolean {
    return this.slotState(dateStr, timeStr) === 'available';
  }

  selectWeekSlot(dateStr: string, timeStr: string): void {
    if (!this.weekSlotSelectable(dateStr, timeStr)) return;
    this.formDate = dateStr;
    this.formTime = timeStr;
  }

  /** Accessible name for a week grid cell (day, time, availability). */
  slotAriaLabel(dateStr: string, timeStr: string): string {
    const st = this.slotState(dateStr, timeStr);
    const keyMap: Record<string, string> = {
      available: 'BOOK.SLOT_STATE_AVAILABLE',
      full: 'BOOK.SLOT_STATE_FULL',
      past: 'BOOK.SLOT_STATE_PAST',
      closed_day: 'BOOK.SLOT_STATE_CLOSED_DAY',
      out_of_hours: 'BOOK.SLOT_STATE_OUT_OF_HOURS',
      out_of_range: 'BOOK.SLOT_STATE_OUT_OF_RANGE',
    };
    const msg = this.translate.instant(keyMap[st] || 'BOOK.SLOT_STATE_OUT_OF_HOURS');
    return `${this.weekDayColumnHeader(dateStr)} ${timeStr}. ${msg}`;
  }

  weekRangeTitle(): string {
    const w = this.bookWeekSlots();
    if (!w?.days.length) return '';
    const first = w.days[0].date;
    const last = w.days[w.days.length - 1].date;
    const locale = this.translate.currentLang || this.translate.defaultLang || 'en';
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const a = new Date(first + 'T12:00:00');
    const b = new Date(last + 'T12:00:00');
    return `${a.toLocaleDateString(locale, opts)} – ${b.toLocaleDateString(locale, { ...opts, year: 'numeric' })}`;
  }

  weekDayColumnHeader(dateStr: string): string {
    const locale = this.translate.currentLang || this.translate.defaultLang || 'en';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const wd = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(dt);
    return `${wd} ${d}`;
  }

  weekTimes(): string[] {
    return this.bookWeekSlots()?.times ?? [];
  }

  weekDays(): { date: string }[] {
    return this.bookWeekSlots()?.days ?? [];
  }

  canWeekPrev(): boolean {
    const w = this.bookWeekSlots();
    if (!w) return false;
    return w.week_start > w.earliest_week_monday;
  }

  canWeekNext(): boolean {
    const w = this.bookWeekSlots();
    if (!w) return false;
    const next = this.addIsoDays(w.week_start, 7);
    return next <= this.maxBookDateStr();
  }

  weekPrev(): void {
    const w = this.bookWeekSlots();
    if (!w || !this.canWeekPrev()) return;
    this.loadBookWeekSlots(this.addIsoDays(w.week_start, -7));
  }

  weekNext(): void {
    const w = this.bookWeekSlots();
    if (!w || !this.canWeekNext()) return;
    this.loadBookWeekSlots(this.addIsoDays(w.week_start, 7));
  }

  private ensureSelectionFitsGrid(): void {
    const w = this.bookWeekSlots();
    if (!w) return;
    if (this.slotState(this.formDate, this.formTime) === 'available') return;
    for (const day of w.days) {
      for (const t of w.times) {
        if (day.cells[t] === 'available') {
          this.formDate = day.date;
          this.formTime = t;
          return;
        }
      }
    }
    const tid = this.tenantId();
    if (!tid) return;
    this.api.getNextAvailableReservation(tid, this.tenantTodayDate(), this.formPartySize).subscribe({
      next: (res) => {
        this.formDate = res.date;
        this.formTime = this.roundTimeToQuarter(res.time);
        this.loadBookWeekSlots(res.date);
      },
      error: () => {},
    });
  }

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

  /**
   * Earliest quarter-hour at or after (now + leadMinutes) in the given IANA timezone.
   * Matches public API default min lead (10 min).
   */
  private earliestQuarterHHmmAfterLeadMinutes(leadMinutes: number, tz: string): string {
    const lead = new Date(Date.now() + leadMinutes * 60 * 1000);
    const f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    const parts = f.formatToParts(lead);
    const hp = parts.find((p) => p.type === 'hour');
    const mp = parts.find((p) => p.type === 'minute');
    if (!hp || !mp) {
      const d = new Date(lead);
      const total = d.getHours() * 60 + d.getMinutes();
      const rounded = Math.ceil(total / 15) * 15;
      const nh = Math.floor(rounded / 60) % 24;
      const nm = rounded % 60;
      return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
    }
    const h = parseInt(hp.value, 10);
    const m = parseInt(mp.value, 10);
    const total = h * 60 + m;
    const rounded = Math.ceil(total / 15) * 15;
    const nh = Math.floor(rounded / 60) % 24;
    const nm = rounded % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
  }

  googleMapsUrl = computed(() => this.tenant()?.public_google_maps_url?.trim() || null);

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
        this.loadBookWeekSlots();
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onPartySizeChange(): void {
    const tid = this.tenantId();
    if (!tid) return;
    const anchor =
      this.formDate ||
      this.bookWeekSlots()?.week_start ||
      this.tenantTodayDate();
    this.loadBookWeekSlots(anchor);
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

  /** Round time to nearest 15 minutes (European 24h). */
  roundTimeToQuarter(t: string): string {
    if (!t) {
      const tz =
        this.tenant()?.timezone?.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone;
      return this.earliestQuarterHHmmAfterLeadMinutes(10, tz);
    }
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
    if (!this.formDate?.trim() || !this.formTime?.trim()) {
      this.error.set(this.translate.instant('BOOK.PICK_SLOT'));
      return;
    }
    if (this.slotState(this.formDate, this.formTime) !== 'available') {
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
