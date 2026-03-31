import { Component, inject, input, model, signal, effect, untracked } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  ApiService,
  ReservationBookDaySlotsResponse,
  ReservationBookWeekSlotState,
} from '../services/api.service';

/** Month calendar + time dropdown (public /book and staff /reservations). */
@Component({
  selector: 'app-reservation-week-slot-grid',
  standalone: true,
  imports: [FormsModule, NgClass, TranslateModule],
  templateUrl: './reservation-week-slot-grid.component.html',
  styleUrl: './reservation-week-slot-grid.component.scss',
})
export class ReservationWeekSlotGridComponent {
  private api = inject(ApiService);
  private translate = inject(TranslateService);

  tenantId = input.required<number>();
  partySize = input(2);
  /** IANA TZ for “today” / max book range (falls back to browser TZ). */
  timezone = input<string | null>(null);
  excludeReservationId = input<number | null>(null);
  /** When this changes (e.g. modal opens with a date), jump the calendar to that month. */
  weekAnchorSeed = input<string | null>(null);
  /** When opening hours have lunch+dinner, filter to one service (same backend as /book). */
  serviceType = input<'all' | 'lunch' | 'dinner'>('all');

  selectedDate = model<string>('');
  selectedTime = model<string>('');

  calendarYear = signal(0);
  calendarMonth = signal(1);
  monthStates = signal<Record<string, ReservationBookWeekSlotState>>({});
  monthLoading = signal(false);
  bookDaySlots = signal<ReservationBookDaySlotsResponse | null>(null);
  daySlotsLoading = signal(false);

  constructor() {
    effect(() => {
      const seed = this.weekAnchorSeed()?.trim() ?? '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(seed)) return;
      const [y, m] = seed.split('-').map(Number);
      untracked(() => {
        if (this.calendarYear() !== y) this.calendarYear.set(y);
        if (this.calendarMonth() !== m) this.calendarMonth.set(m);
      });
    });

    effect(() => {
      const tid = this.tenantId();
      this.partySize();
      this.excludeReservationId();
      this.serviceType();
      this.calendarYear();
      this.calendarMonth();
      if (!tid) return;
      untracked(() => this.loadMonthDayStates());
    });

    effect(() => {
      const tid = this.tenantId();
      this.partySize();
      this.excludeReservationId();
      this.serviceType();
      this.monthLoading();
      const dateStr = this.selectedDate()?.trim() ?? '';
      if (!tid || !dateStr) {
        untracked(() => {
          this.bookDaySlots.set(null);
          this.daySlotsLoading.set(false);
        });
        return;
      }
      if (this.monthLoading()) return;
      untracked(() => this.loadDaySlots(dateStr));
    });
  }

  /** For parent save validation */
  slotState(dateStr: string, timeStr: string): string {
    const ds = this.bookDaySlots();
    if (!ds || ds.date !== dateStr || !timeStr) return 'out_of_hours';
    return ds.cells[timeStr] ?? 'out_of_hours';
  }

  private addCalendarMonth(year: number, month: number, delta: number): { y: number; m: number } {
    const d = new Date(year, month - 1 + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() + 1 };
  }

  private loadMonthDayStates(): void {
    const tid = this.tenantId();
    if (!tid) return;
    let y = this.calendarYear();
    let m = this.calendarMonth();
    if (y < 2000) {
      const t = this.tenantTodayDateStr();
      const [ty, tm] = t.split('-').map(Number);
      y = ty;
      m = tm;
      this.calendarYear.set(y);
      this.calendarMonth.set(m);
    }
    this.monthLoading.set(true);
    const svc = this.serviceType();
    const apiSvc = svc === 'all' ? null : svc;
    this.api
      .getReservationBookMonthDayStates(tid, y, m, this.partySize(), this.excludeReservationId(), apiSvc)
      .subscribe({
        next: (res) => {
          const map: Record<string, ReservationBookWeekSlotState> = {};
          for (const row of res.days) map[row.date] = row.state;
          this.monthStates.set(map);
          this.monthLoading.set(false);
          untracked(() => this.afterMonthLoaded());
        },
        error: () => {
          this.monthStates.set({});
          this.monthLoading.set(false);
        },
      });
  }

  private afterMonthLoaded(): void {
    const states = this.monthStates();
    const sel = this.selectedDate().trim();
    if (sel && states[sel] === 'available') {
      return;
    }
    const first = this.firstAvailableDateInMonth(states);
    if (first) {
      this.selectedDate.set(first);
      this.selectedTime.set('');
      return;
    }
    this.selectedDate.set('');
    this.selectedTime.set('');
    const tid = this.tenantId();
    if (!tid) return;
    const svc = this.serviceType();
    const apiSvc = svc === 'all' ? null : svc;
    this.api
      .getNextAvailableReservation(tid, this.tenantTodayDateStr(), this.partySize(), undefined, apiSvc)
      .subscribe({
        next: (res: { date: string; time: string }) => {
          const [y, mo] = res.date.split('-').map(Number);
          this.calendarYear.set(y);
          this.calendarMonth.set(mo);
          this.selectedDate.set(res.date);
          this.selectedTime.set(this.roundTimeToQuarter(res.time));
        },
        error: () => {},
      });
  }

  private firstAvailableDateInMonth(states: Record<string, ReservationBookWeekSlotState>): string | null {
    const y = this.calendarYear();
    const m = this.calendarMonth();
    const lastDom = new Date(y, m, 0).getDate();
    for (let d = 1; d <= lastDom; d++) {
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (states[dateStr] === 'available') return dateStr;
    }
    return null;
  }

  private loadDaySlots(dateStr: string): void {
    const states = this.monthStates();
    if (states[dateStr] !== 'available') {
      this.bookDaySlots.set(null);
      this.daySlotsLoading.set(false);
      return;
    }
    this.daySlotsLoading.set(true);
    const tid = this.tenantId();
    const svc = this.serviceType();
    const apiSvc = svc === 'all' ? null : svc;
    this.api
      .getReservationBookDaySlots(tid, dateStr, this.partySize(), this.excludeReservationId(), apiSvc)
      .subscribe({
        next: (res) => {
          this.bookDaySlots.set(res);
          this.daySlotsLoading.set(false);
          untracked(() => this.ensureTimeFitsDay());
        },
        error: () => {
          this.bookDaySlots.set(null);
          this.daySlotsLoading.set(false);
        },
      });
  }

  private ensureTimeFitsDay(): void {
    const res = this.bookDaySlots();
    if (!res) return;
    const t = this.selectedTime().trim();
    if (t && res.cells[t] === 'available') return;
    for (const slot of res.times) {
      if (res.cells[slot] === 'available') {
        this.selectedTime.set(slot);
        return;
      }
    }
    this.selectedTime.set('');
  }

  monthDayState(dateStr: string): ReservationBookWeekSlotState | undefined {
    return this.monthStates()[dateStr];
  }

  monthDayButtonClass(dateStr: string): Record<string, boolean> {
    const st = this.monthDayState(dateStr);
    const selected = dateStr === this.selectedDate().trim();
    return {
      'dm-available': st === 'available',
      'dm-full': st === 'full',
      'dm-muted':
        st === 'past' ||
        st === 'closed_day' ||
        st === 'out_of_hours' ||
        st === 'out_of_range' ||
        st === undefined,
      'dm-closed-day': st === 'closed_day',
      'dm-selected': selected && st === 'available',
    };
  }

  monthDaySelectable(dateStr: string): boolean {
    return this.monthDayState(dateStr) === 'available';
  }

  selectMonthDay(dateStr: string): void {
    if (!this.monthDaySelectable(dateStr)) return;
    if (this.selectedDate().trim() === dateStr) return;
    this.selectedDate.set(dateStr);
    this.selectedTime.set('');
  }

  private weekDayAriaDate(dateStr: string): string {
    const locale = this.translate.currentLang || this.translate.defaultLang || 'en';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(dt);
  }

  monthDayAriaLabel(dateStr: string): string {
    const st = this.monthDayState(dateStr);
    const keyMap: Record<string, string> = {
      available: 'BOOK.SLOT_STATE_AVAILABLE',
      full: 'BOOK.SLOT_STATE_FULL',
      past: 'BOOK.SLOT_STATE_PAST',
      closed_day: 'BOOK.SLOT_STATE_CLOSED_DAY',
      out_of_hours: 'BOOK.SLOT_STATE_OUT_OF_HOURS',
      out_of_range: 'BOOK.SLOT_STATE_OUT_OF_RANGE',
    };
    const msg = this.translate.instant(keyMap[st || ''] || 'BOOK.SLOT_STATE_OUT_OF_HOURS');
    return `${this.weekDayAriaDate(dateStr)}. ${msg}`;
  }

  monthTitle(): string {
    const y = this.calendarYear();
    const m = this.calendarMonth();
    if (y < 2000) return '';
    const locale = this.translate.currentLang || this.translate.defaultLang || 'en';
    const dt = new Date(y, m - 1, 15);
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(dt);
  }

  /** Weekday column headers Mon–Sun (locale short names). */
  weekdayHeaders(): string[] {
    const locale = this.translate.currentLang || this.translate.defaultLang || 'en';
    const out: string[] = [];
    for (let i = 0; i < 7; i++) {
      const dt = new Date(2024, 0, 1 + i);
      out.push(new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(dt));
    }
    return out;
  }

  calendarCells(): Array<{ kind: 'blank' } | { kind: 'day'; date: string; day: number }> {
    const y = this.calendarYear();
    const m = this.calendarMonth();
    if (y < 2000) return [];
    const first = new Date(y, m - 1, 1);
    const mondayOffset = (first.getDay() + 6) % 7;
    const lastDom = new Date(y, m, 0).getDate();
    const cells: Array<{ kind: 'blank' } | { kind: 'day'; date: string; day: number }> = [];
    for (let i = 0; i < mondayOffset; i++) cells.push({ kind: 'blank' });
    for (let d = 1; d <= lastDom; d++) {
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ kind: 'day', date: dateStr, day: d });
    }
    return cells;
  }

  serviceLabel(): string {
    const s = this.serviceType();
    if (s === 'lunch') return this.translate.instant('BOOK.SERVICE_LUNCH');
    if (s === 'dinner') return this.translate.instant('BOOK.SERVICE_DINNER');
    return this.translate.instant('BOOK.SERVICE_ALL');
  }

  formattedSelectedDate(): string {
    const raw = this.selectedDate()?.trim();
    if (!raw) return '';
    const [y, m, d] = raw.split('-').map(Number);
    const locale = this.translate.currentLang || this.translate.defaultLang || 'en';
    const dt = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(dt);
  }

  onTimeModelChange(value: string): void {
    const dateStr = this.selectedDate().trim();
    if (!dateStr) return;
    if (!value) {
      this.selectedTime.set('');
      return;
    }
    if (this.slotState(dateStr, value) !== 'available') return;
    this.selectedTime.set(value);
  }

  dayTimes(): string[] {
    return this.bookDaySlots()?.times ?? [];
  }

  daySlotSelectable(timeStr: string): boolean {
    const dateStr = this.selectedDate().trim();
    return this.slotState(dateStr, timeStr) === 'available';
  }

  tenantTodayDateStr(): string {
    const tz = this.timezone()?.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone;
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  canMonthPrev(): boolean {
    const t = this.tenantTodayDateStr();
    const [ty, tm] = t.split('-').map(Number);
    const cy = this.calendarYear();
    const cm = this.calendarMonth();
    if (cy < ty) return false;
    if (cy === ty && cm <= tm) return false;
    return true;
  }

  maxBookDateStr(): string {
    const base = this.tenantTodayDateStr();
    const [y, m, d] = base.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + 366);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }

  canMonthNext(): boolean {
    const cy = this.calendarYear();
    const cm = this.calendarMonth();
    const n = this.addCalendarMonth(cy, cm, 1);
    const firstOfNext = `${n.y}-${String(n.m).padStart(2, '0')}-01`;
    return firstOfNext <= this.maxBookDateStr();
  }

  monthPrev(): void {
    if (!this.canMonthPrev() || this.monthLoading()) return;
    const n = this.addCalendarMonth(this.calendarYear(), this.calendarMonth(), -1);
    this.calendarYear.set(n.y);
    this.calendarMonth.set(n.m);
  }

  monthNext(): void {
    if (!this.canMonthNext() || this.monthLoading()) return;
    const n = this.addCalendarMonth(this.calendarYear(), this.calendarMonth(), 1);
    this.calendarYear.set(n.y);
    this.calendarMonth.set(n.m);
  }

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

  roundTimeToQuarter(t: string): string {
    if (!t) {
      const tz = this.timezone()?.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone;
      return this.earliestQuarterHHmmAfterLeadMinutes(10, tz);
    }
    const [h, m] = t.split(':').map(Number);
    const quarter = Math.round((h * 60 + (m || 0)) / 15) * 15;
    const nh = Math.floor(quarter / 60) % 24;
    const nm = quarter % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
  }
}
