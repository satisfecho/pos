import { Component, inject, input, model, signal, effect, untracked } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService, ReservationBookWeekSlotsResponse } from '../services/api.service';

/** Mon–Sun availability grid (same API as public /book). */
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
  /** When this changes (e.g. modal opens with a date), reload the right week. */
  weekAnchorSeed = input<string | null>(null);

  selectedDate = model<string>('');
  selectedTime = model<string>('');

  bookWeekSlots = signal<ReservationBookWeekSlotsResponse | null>(null);
  weekSlotsLoading = signal(false);

  constructor() {
    effect(() => {
      const tid = this.tenantId();
      this.partySize();
      this.excludeReservationId();
      this.weekAnchorSeed()?.trim();
      this.timezone();
      if (!tid) return;
      untracked(() => {
        const w = this.bookWeekSlots();
        const seed = this.weekAnchorSeed()?.trim() ?? '';
        const anchor =
          w?.week_start ||
          seed ||
          this.selectedDate().trim() ||
          this.tenantTodayDateStr();
        this.loadBookWeekSlots(anchor);
      });
    });
  }

  /** For parent save validation */
  slotState(dateStr: string, timeStr: string): string {
    const w = this.bookWeekSlots();
    if (!w || !timeStr) return 'out_of_hours';
    const day = w.days.find((d) => d.date === dateStr);
    if (!day) return 'out_of_hours';
    return day.cells[timeStr] ?? 'out_of_hours';
  }

  private addIsoDays(iso: string, delta: number): string {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d + delta);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }

  private loadBookWeekSlots(weekAnchor?: string | null): void {
    const tid = this.tenantId();
    if (!tid) return;
    this.weekSlotsLoading.set(true);
    const excl = this.excludeReservationId();
    this.api.getReservationBookWeekSlots(tid, this.partySize(), weekAnchor ?? undefined, excl).subscribe({
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

  weekSlotButtonClass(dateStr: string, timeStr: string): Record<string, boolean> {
    const st = this.slotState(dateStr, timeStr);
    const selected = dateStr === this.selectedDate() && timeStr === this.selectedTime();
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
    this.selectedDate.set(dateStr);
    this.selectedTime.set(timeStr);
  }

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

  maxBookDateStr(): string {
    const base = this.tenantTodayDateStr();
    const [y, m, d] = base.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + 366);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
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
    if (this.slotState(this.selectedDate(), this.selectedTime()) === 'available') return;
    for (const day of w.days) {
      for (const t of w.times) {
        if (day.cells[t] === 'available') {
          this.selectedDate.set(day.date);
          this.selectedTime.set(t);
          return;
        }
      }
    }
    const tid = this.tenantId();
    if (!tid) return;
    this.api.getNextAvailableReservation(tid, this.tenantTodayDateStr(), this.partySize()).subscribe({
      next: (res) => {
        this.selectedDate.set(res.date);
        this.selectedTime.set(this.roundTimeToQuarter(res.time));
        this.loadBookWeekSlots(res.date);
      },
      error: () => {},
    });
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
