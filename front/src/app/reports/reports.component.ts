/**
 * Sales & Revenue Reports
 *
 * Date range, summary, by product/category/table/waiter.
 * Simple catchy CSS charts; export CSV/Excel.
 */
import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  HostListener,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../shared/sidebar.component';
import {
  ApiService,
  SalesReport,
  User,
  WorkSession,
  workSessionNetWorkSeconds,
} from '../services/api.service';
import { ApiErrorMessageService } from '../services/api-error-message.service';
import { PermissionService } from '../services/permission.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../services/language.service';
import { intlLocaleFromTranslate } from '../shared/intl-locale';
import { currencySymbolFromIsoCode } from '../shared/currency-symbol';

export type ReportsDatePreset =
  | 'today'
  | 'last7'
  | 'thisWeek'
  | 'thisMonth'
  | 'previousMonth';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TranslateModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent implements OnInit {
  private api = inject(ApiService);
  private translate = inject(TranslateService);
  private languageService = inject(LanguageService);
  private permissions = inject(PermissionService);
  private apiErr = inject(ApiErrorMessageService);

  report = signal<SalesReport | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  exporting = signal(false);
  workSessions = signal<WorkSession[]>([]);
  workSessionsLoading = signal(false);
  workSessionsError = signal<string | null>(null);
  workSessionsLive = signal<WorkSession[]>([]);
  workSessionsLiveLoading = signal(false);
  workSessionsLiveError = signal<string | null>(null);
  /** Modal: correct clock-in/out (report:read). */
  workSessionAdjustOpen = signal(false);
  workSessionAdjustTarget = signal<WorkSession | null>(null);
  workSessionAdjustStartedLocal = signal('');
  workSessionAdjustEndedLocal = signal('');
  workSessionAdjustNote = signal('');
  workSessionAdjustSaving = signal(false);
  workSessionAdjustError = signal<string | null>(null);
  /** `YYYY-MM` for monthly attendance Excel (calendar month, local). */
  attendanceExcelMonth = signal('');
  attendanceExcelExporting = signal(false);
  attendanceRegistroExporting = signal(false);
  attendanceExcelError = signal<string | null>(null);
  attendanceExcelStaffUsers = signal<User[]>([]);
  /** Empty = all tenant staff with data; non-empty = filter export to these user IDs. */
  attendanceExcelStaffFilterIds: number[] = [];
  /** Collapsible staff filter panel (replaces native multi-select). */
  attendanceExcelStaffPanelOpen = signal(false);
  attendanceExcelStaffSearch = signal('');
  filteredAttendanceExcelStaffUsers = computed(() => {
    const q = this.attendanceExcelStaffSearch().trim().toLowerCase();
    const users = this.attendanceExcelStaffUsers();
    if (!q) return users;
    return users.filter((u) => {
      const n = (u.full_name || '').toLowerCase();
      const e = (u.email || '').toLowerCase();
      return n.includes(q) || e.includes(q);
    });
  });

  @ViewChild('attendanceStaffDropdownRoot') attendanceStaffDropdownRoot?: ElementRef<HTMLElement>;
  fromDate = signal('');
  toDate = signal('');
  currency = signal('€');
  currencyCode = signal<string | null>(null);

  maxBarValue = computed(() => {
    const r = this.report();
    if (!r) return 1;
    const dailyMax = r.summary.daily.length
      ? Math.max(...r.summary.daily.map((d) => d.revenue_cents))
      : 0;
    const productMax = r.by_product.length
      ? Math.max(...r.by_product.map((p) => p.revenue_cents))
      : 0;
    return Math.max(1, dailyMax, productMax);
  });

  totalProductQuantity = computed(() => {
    const r = this.report();
    if (!r?.by_product?.length) return 0;
    return r.by_product.reduce((sum, p) => sum + p.quantity, 0);
  });

  totalCategoryQuantity = computed(() => {
    const r = this.report();
    if (!r?.by_category?.length) return 0;
    return r.by_category.reduce((sum, c) => sum + c.quantity, 0);
  });

  /** Bumps when UI language changes so currency/date formatting refreshes. */
  private reportIntlRevision = signal(0);

  ngOnInit() {
    const today = this.startOfLocalDay(new Date());
    const from = this.addLocalDays(today, -30);
    this.fromDate.set(this.fmtDate(from));
    this.toDate.set(this.fmtDate(today));
    this.loadTenantCurrency();
    this.loadReport();
    const now = new Date();
    this.attendanceExcelMonth.set(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    );
    this.translate.onLangChange.subscribe(() => this.reportIntlRevision.update((n) => n + 1));
    if (this.canViewAttendance()) {
      this.api.getUsers().subscribe({
        next: (users) => {
          const list = users
            .filter((u): u is User & { id: number } => u.id != null && Number.isFinite(u.id))
            .sort((a, b) =>
              (a.full_name || a.email || '').localeCompare(b.full_name || b.email || '', undefined, {
                sensitivity: 'base',
              }),
            );
          this.attendanceExcelStaffUsers.set(list);
        },
        error: () => {},
      });
    }
  }

  /** Local calendar date as `YYYY-MM-DD` (not UTC midnight from `toISOString`). */
  private fmtDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private startOfLocalDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private addLocalDays(d: Date, delta: number): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta);
  }

  /** Monday (local) as first day of the ISO-style week containing `ref`. */
  private mondayOfWeekContaining(ref: Date): Date {
    const s = this.startOfLocalDay(ref);
    const dow = s.getDay();
    const delta = dow === 0 ? -6 : 1 - dow;
    return this.addLocalDays(s, delta);
  }

  applyDatePreset(preset: ReportsDatePreset): void {
    const today = this.startOfLocalDay(new Date());
    let from: Date;
    let to: Date;
    switch (preset) {
      case 'today':
        from = today;
        to = today;
        break;
      case 'last7':
        from = this.addLocalDays(today, -6);
        to = today;
        break;
      case 'thisWeek': {
        const mon = this.mondayOfWeekContaining(today);
        from = mon;
        to = this.addLocalDays(mon, 6);
        break;
      }
      case 'thisMonth':
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'previousMonth': {
        const firstThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastPrev = this.addLocalDays(firstThisMonth, -1);
        from = new Date(lastPrev.getFullYear(), lastPrev.getMonth(), 1);
        to = lastPrev;
        break;
      }
      default:
        return;
    }
    this.fromDate.set(this.fmtDate(from));
    this.toDate.set(this.fmtDate(to));
    this.loadReport();
  }

  private loadTenantCurrency() {
    this.api.getTenantSettings().subscribe({
      next: (s) => {
        const code = s.currency_code || null;
        this.currencyCode.set(code);
        if (code) {
          this.currency.set(currencySymbolFromIsoCode(this.translate, code));
        } else {
          this.currency.set(s.currency || '€');
        }
      },
    });
  }

  loadReport() {
    const from = this.fromDate();
    const to = this.toDate();
    if (!from || !to) return;
    this.loading.set(true);
    this.error.set(null);
    this.api.getSalesReports(from, to).subscribe({
      next: (data) => {
        this.report.set(data);
        this.loading.set(false);
        this.loadWorkSessions();
      },
      error: (err) => {
        this.error.set(err?.message || 'Failed to load report');
        this.loading.set(false);
        this.loadWorkSessions();
      },
    });
  }

  canViewAttendance(): boolean {
    return this.permissions.hasPermission(this.api.getCurrentUser(), 'report:read');
  }

  @HostListener('document:click', ['$event'])
  onAttendanceStaffDocumentClick(ev: MouseEvent): void {
    if (!this.attendanceExcelStaffPanelOpen()) return;
    const root = this.attendanceStaffDropdownRoot?.nativeElement;
    if (root && !root.contains(ev.target as Node)) {
      this.attendanceExcelStaffPanelOpen.set(false);
      this.attendanceExcelStaffSearch.set('');
    }
  }

  @HostListener('document:keydown', ['$event'])
  onAttendanceStaffDocumentKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape' && this.attendanceExcelStaffPanelOpen()) {
      this.attendanceExcelStaffPanelOpen.set(false);
      this.attendanceExcelStaffSearch.set('');
    }
  }

  toggleAttendanceStaffPanel(): void {
    const next = !this.attendanceExcelStaffPanelOpen();
    this.attendanceExcelStaffPanelOpen.set(next);
    if (!next) {
      this.attendanceExcelStaffSearch.set('');
    }
  }

  onAttendanceStaffTriggerKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this.toggleAttendanceStaffPanel();
    }
  }

  toggleAttendanceStaffFilter(id: number | undefined, ev?: Event): void {
    ev?.stopPropagation();
    if (id == null || !Number.isFinite(id)) return;
    const cur = [...this.attendanceExcelStaffFilterIds];
    const i = cur.indexOf(id);
    if (i >= 0) {
      cur.splice(i, 1);
    } else {
      cur.push(id);
    }
    cur.sort((a, b) => a - b);
    this.attendanceExcelStaffFilterIds = cur;
    this.attendanceExcelError.set(null);
  }

  isAttendanceStaffFilterSelected(id: number | undefined): boolean {
    if (id == null || !Number.isFinite(id)) return false;
    return this.attendanceExcelStaffFilterIds.includes(id);
  }

  attendanceExcelSingleStaffLabel(): string {
    const ids = this.attendanceExcelStaffFilterIds;
    if (ids.length !== 1) return '';
    const u = this.attendanceExcelStaffUsers().find((x) => x.id === ids[0]);
    return (u?.full_name || u?.email || String(ids[0])).trim();
  }

  downloadAttendanceExcel(): void {
    if (!this.canViewAttendance()) return;
    const ym = (this.attendanceExcelMonth() || '').trim();
    const m = /^(\d{4})-(\d{2})$/.exec(ym);
    if (!m) {
      this.attendanceExcelError.set(this.translate.instant('REPORTS.ATTENDANCE_EXCEL_INVALID_MONTH'));
      return;
    }
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    this.attendanceExcelExporting.set(true);
    this.attendanceExcelError.set(null);
    const staffIds =
      this.attendanceExcelStaffFilterIds.length > 0 ? this.attendanceExcelStaffFilterIds : undefined;
    this.api.getReportsAttendanceExcel(year, month, staffIds).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_${year}_${String(month).padStart(2, '0')}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        this.attendanceExcelExporting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.attendanceExcelExporting.set(false);
        if (err.status === 404) {
          this.attendanceExcelError.set(this.translate.instant('REPORTS.ATTENDANCE_EXCEL_NO_DATA'));
          return;
        }
        const body = err.error;
        if (body instanceof Blob) {
          body
            .text()
            .then((text) => {
              try {
                const parsed = JSON.parse(text) as { detail?: unknown };
                const d = parsed?.detail;
                this.attendanceExcelError.set(
                  typeof d === 'string' && d.trim()
                    ? d
                    : this.translate.instant('REPORTS.ATTENDANCE_EXCEL_ERROR'),
                );
              } catch {
                this.attendanceExcelError.set(this.translate.instant('REPORTS.ATTENDANCE_EXCEL_ERROR'));
              }
            })
            .catch(() =>
              this.attendanceExcelError.set(this.translate.instant('REPORTS.ATTENDANCE_EXCEL_ERROR')),
            );
          return;
        }
        this.attendanceExcelError.set(
          this.apiErr.fromHttpError(err, 'REPORTS.ATTENDANCE_EXCEL_ERROR'),
        );
      },
    });
  }

  downloadAttendanceRegistroHorarioExcel(): void {
    if (!this.canViewAttendance()) return;
    const ym = (this.attendanceExcelMonth() || '').trim();
    const m = /^(\d{4})-(\d{2})$/.exec(ym);
    if (!m) {
      this.attendanceExcelError.set(this.translate.instant('REPORTS.ATTENDANCE_EXCEL_INVALID_MONTH'));
      return;
    }
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    this.attendanceRegistroExporting.set(true);
    this.attendanceExcelError.set(null);
    const staffIds =
      this.attendanceExcelStaffFilterIds.length > 0 ? this.attendanceExcelStaffFilterIds : undefined;
    this.api.getReportsAttendanceRegistroHorarioExcel(year, month, staffIds).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `registro_horario_${year}_${String(month).padStart(2, '0')}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        this.attendanceRegistroExporting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.attendanceRegistroExporting.set(false);
        if (err.status === 404) {
          this.attendanceExcelError.set(this.translate.instant('REPORTS.ATTENDANCE_REGISTRO_HORARIO_NO_DATA'));
          return;
        }
        const body = err.error;
        if (body instanceof Blob) {
          body
            .text()
            .then((text) => {
              try {
                const parsed = JSON.parse(text) as { detail?: unknown };
                const d = parsed?.detail;
                this.attendanceExcelError.set(
                  typeof d === 'string' && d.trim()
                    ? d
                    : this.translate.instant('REPORTS.ATTENDANCE_REGISTRO_HORARIO_ERROR'),
                );
              } catch {
                this.attendanceExcelError.set(
                  this.translate.instant('REPORTS.ATTENDANCE_REGISTRO_HORARIO_ERROR'),
                );
              }
            })
            .catch(() =>
              this.attendanceExcelError.set(
                this.translate.instant('REPORTS.ATTENDANCE_REGISTRO_HORARIO_ERROR'),
              ),
            );
          return;
        }
        this.attendanceExcelError.set(
          this.apiErr.fromHttpError(err, 'REPORTS.ATTENDANCE_REGISTRO_HORARIO_ERROR'),
        );
      },
    });
  }

  loadWorkSessions(): void {
    if (!this.canViewAttendance()) {
      this.workSessions.set([]);
      this.workSessionsLive.set([]);
      return;
    }
    const from = this.fromDate();
    const to = this.toDate();
    if (!from || !to) return;
    this.workSessionsLoading.set(true);
    this.workSessionsError.set(null);
    this.api.getReportWorkSessions(from, to).subscribe({
      next: (rows) => {
        this.workSessions.set(rows);
        this.workSessionsLoading.set(false);
      },
      error: () => {
        this.workSessions.set([]);
        this.workSessionsLoading.set(false);
        this.workSessionsError.set('Failed to load attendance');
      },
    });
    this.loadWorkSessionsLive();
  }

  loadWorkSessionsLive(): void {
    if (!this.canViewAttendance()) {
      this.workSessionsLive.set([]);
      return;
    }
    this.workSessionsLiveLoading.set(true);
    this.workSessionsLiveError.set(null);
    this.api.getReportWorkSessionsLive().subscribe({
      next: (rows) => {
        this.workSessionsLive.set(rows);
        this.workSessionsLiveLoading.set(false);
      },
      error: () => {
        this.workSessionsLive.set([]);
        this.workSessionsLiveLoading.set(false);
        this.workSessionsLiveError.set('Failed to load live attendance');
      },
    });
  }

  formatWorkSessionDt(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString();
  }

  formatWorkSessionDuration(row: WorkSession): string {
    if (!row.ended_at) {
      const om = row.open_duration_minutes;
      if (om != null && om >= 0) {
        const h = Math.floor(om / 60);
        const m = om % 60;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
      }
      const sec = workSessionNetWorkSeconds(row);
      const mins = Math.max(0, Math.floor(sec / 60));
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      if (h > 0) return `${h}h ${m}m`;
      return `${m}m`;
    }
    if (row.duration_minutes != null && row.duration_minutes >= 0) {
      const h = Math.floor(row.duration_minutes / 60);
      const m = row.duration_minutes % 60;
      if (h > 0) return `${h}h ${m}m`;
      return `${m}m`;
    }
    return '—';
  }

  liveAttendanceStatus(row: WorkSession): string {
    if (row.on_break) {
      return this.translate.instant('REPORTS.WORK_SESSIONS_STATUS_BREAK');
    }
    return this.translate.instant('REPORTS.WORK_SESSIONS_STATUS_WORKING');
  }

  openWorkSessionAdjust(row: WorkSession): void {
    if (!this.canViewAttendance()) return;
    this.workSessionAdjustTarget.set(row);
    this.workSessionAdjustStartedLocal.set(this.isoToDatetimeLocalValue(row.started_at));
    this.workSessionAdjustEndedLocal.set(row.ended_at ? this.isoToDatetimeLocalValue(row.ended_at) : '');
    this.workSessionAdjustNote.set('');
    this.workSessionAdjustError.set(null);
    this.workSessionAdjustOpen.set(true);
  }

  closeWorkSessionAdjust(): void {
    if (this.workSessionAdjustSaving()) return;
    this.workSessionAdjustOpen.set(false);
    this.workSessionAdjustTarget.set(null);
    this.workSessionAdjustError.set(null);
  }

  submitWorkSessionAdjust(): void {
    const row = this.workSessionAdjustTarget();
    if (!row) return;
    const startLocal = (this.workSessionAdjustStartedLocal() || '').trim();
    const endLocal = (this.workSessionAdjustEndedLocal() || '').trim();
    const startIso = this.datetimeLocalToUtcIso(startLocal);
    if (!startIso) {
      this.workSessionAdjustError.set(this.translate.instant('REPORTS.WORK_SESSION_ADJUST_INVALID_START'));
      return;
    }
    let endIso: string | null = null;
    if (endLocal) {
      endIso = this.datetimeLocalToUtcIso(endLocal);
      if (!endIso) {
        this.workSessionAdjustError.set(this.translate.instant('REPORTS.WORK_SESSION_ADJUST_INVALID_END'));
        return;
      }
      if (new Date(endIso).getTime() < new Date(startIso).getTime()) {
        this.workSessionAdjustError.set(this.translate.instant('REPORTS.WORK_SESSION_ADJUST_INVALID_RANGE'));
        return;
      }
    }
    const body: { note: string; started_at: string; ended_at?: string | null } = {
      note: (this.workSessionAdjustNote() || '').trim(),
      started_at: startIso,
    };
    if (endIso) {
      body.ended_at = endIso;
    }
    this.workSessionAdjustSaving.set(true);
    this.workSessionAdjustError.set(null);
    this.api.postReportWorkSessionAdjust(row.id, body).subscribe({
      next: () => {
        this.workSessionAdjustSaving.set(false);
        this.closeWorkSessionAdjust();
        this.loadWorkSessions();
      },
      error: (err: HttpErrorResponse) => {
        this.workSessionAdjustSaving.set(false);
        this.workSessionAdjustError.set(
          this.apiErr.fromHttpError(err, 'REPORTS.WORK_SESSION_ADJUST_ERROR'),
        );
      },
    });
  }

  /** `datetime-local` value in the user’s local timezone from an API ISO timestamp. */
  private isoToDatetimeLocalValue(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /** Parse `datetime-local` as local civil time → UTC ISO for the API. */
  private datetimeLocalToUtcIso(localValue: string): string | null {
    const d = new Date(localValue);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  formatCurrency(cents: number): string {
    void this.reportIntlRevision();
    const code = this.currencyCode();
    const locale = intlLocaleFromTranslate(this.translate);
    if (code) {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        currencyDisplay: 'symbol',
      }).format(cents / 100);
    }
    return `${this.currency()}${(cents / 100).toFixed(2)}`;
  }

  formatShortDate(iso: string): string {
    void this.reportIntlRevision();
    const d = new Date(iso);
    return d.toLocaleDateString(intlLocaleFromTranslate(this.translate), {
      month: 'short',
      day: 'numeric',
    });
  }

  getReservationSourceLabel(source: string): string {
    if (source === 'public') return this.translate.instant('REPORTS.RESERVATIONS_SOURCE_PUBLIC');
    if (source === 'staff') return this.translate.instant('REPORTS.RESERVATIONS_SOURCE_STAFF');
    return source;
  }

  getReservationStatusLabel(status: string): string {
    const key = `RESERVATIONS.STATUS_${status.toUpperCase().replace(/-/g, '_')}`;
    const t = this.translate.instant(key);
    return t !== key ? t : status;
  }

  /** Backend keys rows by (product_id, product_name); tracking by id alone duplicates NG0955. */
  trackByProductRow(p: SalesReport['by_product'][number]): string {
    return `${p.product_id}\u0000${p.product_name}`;
  }

  barWidth(cents: number): string {
    const max = this.maxBarValue();
    if (max <= 0) return '0%';
    return `${Math.min(100, (cents / max) * 100)}%`;
  }

  /** SVG chart dimensions (content area; padding for labels). */
  readonly chartPad = { left: 44, right: 12, top: 12, bottom: 28 };
  readonly chartWidth = 520;
  readonly chartHeight = 200;

  /** Revenue-over-time: polyline points for SVG (x,y from daily data). */
  revenueChartPoints(): string {
    const r = this.report();
    if (!r?.summary.daily?.length) return '';
    const daily = r.summary.daily;
    const maxRev = Math.max(1, ...daily.map((d) => d.revenue_cents));
    const w = this.chartWidth - this.chartPad.left - this.chartPad.right;
    const h = this.chartHeight - this.chartPad.top - this.chartPad.bottom;
    const points = daily.map((d, i) => {
      const x = this.chartPad.left + (i / (daily.length - 1 || 1)) * w;
      const y = this.chartPad.top + h - (d.revenue_cents / maxRev) * h;
      return `${x},${y}`;
    });
    return points.join(' ');
  }

  /** Revenue-over-time: area path (fill under the line). */
  revenueChartAreaPath(): string {
    const r = this.report();
    if (!r?.summary.daily?.length) return '';
    const daily = r.summary.daily;
    const maxRev = Math.max(1, ...daily.map((d) => d.revenue_cents));
    const w = this.chartWidth - this.chartPad.left - this.chartPad.right;
    const h = this.chartHeight - this.chartPad.top - this.chartPad.bottom;
    const baseY = this.chartPad.top + h;
    const firstX = this.chartPad.left;
    const lastX = this.chartPad.left + w;
    const points = daily.map((d, i) => {
      const x = this.chartPad.left + (i / (daily.length - 1 || 1)) * w;
      const y = this.chartPad.top + h - (d.revenue_cents / maxRev) * h;
      return `${x},${y}`;
    });
    return `M ${firstX},${baseY} L ${points.join(' L ')} L ${lastX},${baseY} Z`;
  }

  /** Y-axis ticks for revenue chart (0, ~50%, 100% of max). */
  revenueChartYLabels(): { value: number; y: number }[] {
    const r = this.report();
    if (!r?.summary.daily?.length) return [];
    const maxRev = Math.max(1, ...r.summary.daily.map((d) => d.revenue_cents));
    const h = this.chartHeight - this.chartPad.top - this.chartPad.bottom;
    return [
      { value: maxRev, y: this.chartPad.top },
      { value: Math.round(maxRev / 2), y: this.chartPad.top + h / 2 },
      { value: 0, y: this.chartPad.top + h },
    ];
  }

  /** X-axis date labels (first, middle, last) for revenue chart. */
  revenueChartXLabels(): { date: string; x: number }[] {
    const r = this.report();
    if (!r?.summary.daily?.length) return [];
    const daily = r.summary.daily;
    const w = this.chartWidth - this.chartPad.left - this.chartPad.right;
    const indices = daily.length === 1 ? [0] : [0, Math.floor((daily.length - 1) / 2), daily.length - 1];
    return indices.map((i) => ({
      date: this.formatShortDate(daily[i].date),
      x: this.chartPad.left + (i / (daily.length - 1 || 1)) * w,
    }));
  }

  /** Format value as percentage of total (e.g. "12.3%" or "0%"). */
  formatPct(value: number, total: number): string {
    if (total <= 0) return '0%';
    const pct = (value / total) * 100;
    return pct >= 100 ? '100%' : pct <= 0 ? '0%' : `${pct.toFixed(1)}%`;
  }

  exportCSV() {
    this.export('csv', 'summary');
  }

  exportExcel() {
    this.exporting.set(true);
    const from = this.fromDate();
    const to = this.toDate();
    this.api.getReportsExport(from, to, 'xlsx', 'summary', this.languageService.getLanguage()).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pos2-sales-${from}-${to}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: () => this.exporting.set(false),
    });
  }

  private export(format: 'csv' | 'xlsx', report: string) {
    if (format === 'xlsx') {
      this.exportExcel();
      return;
    }
    this.exporting.set(true);
    const from = this.fromDate();
    const to = this.toDate();
    this.api.getReportsExport(from, to, 'csv', report, this.languageService.getLanguage()).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pos2-sales-${report}-${from}-${to}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: () => this.exporting.set(false),
    });
  }
}
