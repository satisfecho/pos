import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
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
  /** Month grid for book-calendar API (year + 1–12). */
  calendarViewYear = signal(0);
  calendarViewMonth = signal(1);
  bookCalendarDays = signal<Map<string, 'open' | 'closed'>>(new Map());
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
      return this.finalizeBookableSlots([...this.timeOptions]);
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
      const raw = out.length ? out : [...this.timeOptions];
      return this.finalizeBookableSlots(raw);
    } catch {
      return this.finalizeBookableSlots([...this.timeOptions]);
    }
  }

  private hhmmToMinutes(s: string): number {
    const [h, m] = s.split(':').map((x) => parseInt(x, 10));
    return (h || 0) * 60 + (m || 0);
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

  /** Today YYYY-MM-DD in the browser’s local calendar (before tenant TZ is known). */
  private localCalendarTodayYyyyMmDd(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /**
   * Earliest allowed quarter-hour today (now + 10 min, ceiling), in tenant TZ.
   * Matches public API min lead; used to filter the time dropdown for “today”.
   */
  minSlotHHmmForSelectedDate(): string | null {
    if (!this.formDate || this.formDate !== this.tenantTodayDate()) return null;
    const tz =
      this.tenant()?.timezone?.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone;
    return this.earliestQuarterHHmmAfterLeadMinutes(10, tz);
  }

  /**
   * Set initial time from opening-hour slots (first slot ≥ min lead when date is today).
   * Used before next-available returns so the picker does not flash a static default.
   */
  private seedPublicBookInitialTime(): void {
    const opts = this.bookableTimeOptions();
    if (opts.length) {
      this.formTime = opts[0];
      return;
    }
    const tz =
      this.tenant()?.timezone?.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.formTime = this.earliestQuarterHHmmAfterLeadMinutes(10, tz);
  }

  private finalizeBookableSlots(slots: string[]): string[] {
    const minS = this.minSlotHHmmForSelectedDate();
    if (!minS) return slots;
    const minM = this.hhmmToMinutes(minS);
    return slots.filter((x) => this.hhmmToMinutes(x) >= minM);
  }

  /** If current formTime is not in allowed slots, pick the first allowed (or keep next-available suggestion). */
  private syncFormTimeToAllowed(): void {
    const opts = this.bookableTimeOptions();
    if (opts.length && !opts.includes(this.formTime)) {
      this.formTime = opts[0];
    }
  }

  googleMapsUrl = computed(() => this.tenant()?.public_google_maps_url?.trim() || null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('tenantId');
    const n = id ? parseInt(id, 10) : 0;
    if (n) this.tenantId.set(n);
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.formDate = this.localCalendarTodayYyyyMmDd();
    this.formTime = this.earliestQuarterHHmmAfterLeadMinutes(10, browserTz);
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
        const [y, m] = this.formDate.split('-').map(Number);
        this.calendarViewYear.set(y);
        this.calendarViewMonth.set(m);
        this.loadBookCalendarForView();
        this.seedPublicBookInitialTime();
        this.onDateChange(this.formDate);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  loadBookCalendarForView(): void {
    const tid = this.tenantId();
    const y = this.calendarViewYear();
    const mo = this.calendarViewMonth();
    if (!tid || y < 2000) return;
    this.api.getReservationBookCalendar(tid, y, mo).subscribe({
      next: (res) => {
        const map = new Map<string, 'open' | 'closed'>();
        for (const d of res.days) {
          map.set(d.date, d.state);
        }
        this.bookCalendarDays.set(map);
      },
      error: () => this.bookCalendarDays.set(new Map()),
    });
  }

  calendarWeekdayLabels(): string[] {
    const locale = this.translate.currentLang || this.translate.defaultLang || 'en';
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const monday = new Date(2024, 0, 8);
    return Array.from({ length: 7 }, (_, i) =>
      fmt.format(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i))
    );
  }

  calendarTitle(): string {
    const y = this.calendarViewYear();
    const m = this.calendarViewMonth();
    const locale = this.translate.currentLang || this.translate.defaultLang || 'en';
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
      new Date(y, m - 1, 1)
    );
  }

  calendarCells(): ({ date: string; day: number } | null)[] {
    const y = this.calendarViewYear();
    const m = this.calendarViewMonth();
    if (y < 2000) return [];
    const first = new Date(y, m - 1, 1);
    const startDow = first.getDay();
    const mondayIndex = (startDow + 6) % 7;
    const lastDay = new Date(y, m, 0).getDate();
    const cells: ({ date: string; day: number } | null)[] = [];
    for (let i = 0; i < mondayIndex; i++) cells.push(null);
    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ date: dateStr, day: d });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  calendarPrevMonth(): void {
    let y = this.calendarViewYear();
    let mo = this.calendarViewMonth();
    mo -= 1;
    if (mo < 1) {
      mo = 12;
      y -= 1;
    }
    this.calendarViewYear.set(y);
    this.calendarViewMonth.set(mo);
    this.loadBookCalendarForView();
  }

  calendarNextMonth(): void {
    let y = this.calendarViewYear();
    let mo = this.calendarViewMonth();
    mo += 1;
    if (mo > 12) {
      mo = 1;
      y += 1;
    }
    this.calendarViewYear.set(y);
    this.calendarViewMonth.set(mo);
    this.loadBookCalendarForView();
  }

  /** True if the month after the current view still has at least one bookable day. */
  canGoCalendarNext(): boolean {
    let y = this.calendarViewYear();
    let mo = this.calendarViewMonth();
    mo += 1;
    if (mo > 12) {
      mo = 1;
      y += 1;
    }
    const firstNext = `${y}-${String(mo).padStart(2, '0')}-01`;
    return firstNext <= this.maxBookDateStr();
  }

  isCalendarDaySelectable(dateStr: string): boolean {
    if (!dateStr) return false;
    if (dateStr < this.tenantTodayDate()) return false;
    if (dateStr > this.maxBookDateStr()) return false;
    const st = this.bookCalendarDays().get(dateStr);
    if (st === 'closed') return false;
    return true;
  }

  selectCalendarDay(dateStr: string): void {
    if (!this.isCalendarDaySelectable(dateStr)) return;
    this.formDate = dateStr;
    this.onDateChange(dateStr);
  }

  dayCellClasses(dateStr: string): Record<string, boolean> {
    const closed = this.bookCalendarDays().get(dateStr) === 'closed';
    const past = dateStr < this.tenantTodayDate();
    const selected = dateStr === this.formDate;
    const selectable = this.isCalendarDaySelectable(dateStr);
    return {
      'cal-past': past,
      'cal-closed': closed && !past,
      'cal-selected': selected,
      'cal-selectable': selectable && !selected,
    };
  }

  onPartySizeChange(): void {
    const tid = this.tenantId();
    if (tid && this.formDate) {
      this.onDateChange(this.formDate);
    }
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
    if (dateStr?.length >= 10) {
      const y = parseInt(dateStr.slice(0, 4), 10);
      const m = parseInt(dateStr.slice(5, 7), 10);
      if (y >= 2000 && m >= 1 && m <= 12) {
        if (this.calendarViewYear() !== y || this.calendarViewMonth() !== m) {
          this.calendarViewYear.set(y);
          this.calendarViewMonth.set(m);
          this.loadBookCalendarForView();
        }
      }
    }
    const tid = this.tenantId();
    if (!tid || !dateStr) return;
    this.api.getNextAvailableReservation(tid, dateStr, this.formPartySize).subscribe({
      next: (res) => {
        const time = this.roundTimeToQuarter(res.time);
        this.suggestedTime.set(time);
        this.formTime = time;
        // If the next available slot is on a different date (e.g. tomorrow), show that date so the suggested time is not in the past
        if (res.date) {
          this.formDate = res.date;
          const ry = parseInt(res.date.slice(0, 4), 10);
          const rm = parseInt(res.date.slice(5, 7), 10);
          if (ry >= 2000 && rm >= 1 && rm <= 12) {
            this.calendarViewYear.set(ry);
            this.calendarViewMonth.set(rm);
            this.loadBookCalendarForView();
          }
        }
        this.syncFormTimeToAllowed();
      },
      error: () => this.suggestedTime.set(null),
    });
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
