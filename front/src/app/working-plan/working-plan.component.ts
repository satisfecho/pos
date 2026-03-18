import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  ApiService,
  Shift,
  ShiftCreate,
  ShiftUpdate,
  User,
} from '../services/api.service';
import { SidebarComponent } from '../shared/sidebar.component';
import { ConfirmationModalComponent } from '../shared/confirmation-modal.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

function getWeekRange(weekStart: Date): { from: string; to: string } {
  const d = new Date(weekStart);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    from: `${mon.getFullYear()}-${pad(mon.getMonth() + 1)}-${pad(mon.getDate())}`,
    to: `${sun.getFullYear()}-${pad(sun.getMonth() + 1)}-${pad(sun.getDate())}`,
  };
}

/** First and last date of the month (YYYY-MM-DD). */
function getMonthRange(month: Date): { from: string; to: string } {
  const d = new Date(month.getFullYear(), month.getMonth(), 1);
  const first = new Date(d);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    from: `${first.getFullYear()}-${pad(first.getMonth() + 1)}-${pad(first.getDate())}`,
    to: `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`,
  };
}

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

/** Staff role keys used in opening hours (personnel required per day). */
const STAFF_KEYS = ['bar', 'waiter', 'kitchen', 'receptionist'] as const;
type StaffKey = (typeof STAFF_KEYS)[number];

interface DayHours {
  open: string;
  close: string;
  closed?: boolean;
  hasBreak?: boolean;
  morningOpen?: string;
  morningClose?: string;
  eveningOpen?: string;
  eveningClose?: string;
  bar?: number;
  waiter?: number;
  kitchen?: number;
  receptionist?: number;
}

/** Map API user role to opening-hours staff key; null for owner/admin (no single role). */
function roleToStaffKey(role: string | undefined): StaffKey | null {
  if (!role) return null;
  const r = role.toLowerCase();
  if (r === 'bartender') return 'bar';
  if (r === 'waiter' || r === 'kitchen' || r === 'receptionist') return r;
  if (r === 'owner' || r === 'admin') return null;
  return null;
}

/** True if the API user_role (e.g. bartender, waiter) matches the given staff key. */
function shiftRoleMatchesStaffKey(userRole: string | undefined, staffKey: StaffKey): boolean {
  const key = roleToStaffKey(userRole ?? '');
  return key === staffKey;
}

/** Step in minutes for time options (30 or 60). */
const STEP_30 = 30;
const STEP_60 = 60;

/** Default time options when no opening hours (09:00–22:00). Step 30 or 60 min. */
function defaultTimeOptions(stepMin: number = STEP_30): string[] {
  const opts: string[] = [];
  for (let h = 9; h <= 22; h++) {
    for (let m = 0; m < 60; m += stepMin) {
      if (h === 22 && m > 0) break;
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return opts;
}

/** Build time options from open to close (inclusive). Step 30 or 60 min. */
function timeOptionsBetween(open: string, close: string, stepMin: number = STEP_30): string[] {
  const [openH, openM] = open.split(':').map(Number);
  const [closeH, closeM] = close.split(':').map(Number);
  const openMins = openH * 60 + openM;
  const closeMins = closeH * 60 + closeM;
  const opts: string[] = [];
  for (let m = openMins; m <= closeMins; m += stepMin) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    opts.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return opts;
}

/** Full-day time options (00:00–23:00 or 23:30) for "any hour" e.g. cleaning. Step 30 or 60 min. */
function fullDayTimeOptions(stepMin: number = STEP_30): string[] {
  const opts: string[] = [];
  const maxMins = stepMin === STEP_60 ? 23 * 60 : 23 * 60 + 30;
  for (let m = 0; m <= maxMins; m += stepMin) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    opts.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return opts;
}

const WORKING_PLAN_VIEW_KEY = 'workingPlanView';
const VALID_VIEWS = ['week', 'calendar'] as const;
type ViewMode = (typeof VALID_VIEWS)[number];

function isValidView(v: string | null): v is ViewMode {
  return v === 'week' || v === 'calendar';
}

@Component({
  selector: 'app-working-plan',
  standalone: true,
  imports: [FormsModule, SidebarComponent, TranslateModule, ConfirmationModalComponent],
  template: `
    <app-sidebar>
      <div class="working-plan-page" data-testid="working-plan-page">
      <div class="page-header">
        <h1>{{ 'WORKING_PLAN.TITLE' | translate }}</h1>
        <button type="button" class="btn btn-primary" (click)="openCreate()" data-testid="working-plan-add-shift">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {{ 'WORKING_PLAN.ADD_SHIFT' | translate }}
        </button>
      </div>

      <div class="filters">
        <div class="view-toggle" data-testid="working-plan-view-toggle">
          <button type="button" class="btn btn-ghost btn-sm" [class.active]="viewMode() === 'week'" (click)="setViewMode('week')" data-testid="working-plan-view-week">{{ 'WORKING_PLAN.VIEW_WEEK' | translate }}</button>
          <button type="button" class="btn btn-ghost btn-sm" [class.active]="viewMode() === 'calendar'" (click)="setViewMode('calendar')" data-testid="working-plan-view-calendar">{{ 'WORKING_PLAN.VIEW_CALENDAR' | translate }}</button>
        </div>
        @if (viewMode() === 'week') {
          <button type="button" class="btn btn-ghost btn-sm" (click)="prevWeek()">‹</button>
          <span class="week-label">{{ weekLabel() }}</span>
          <button type="button" class="btn btn-ghost btn-sm" (click)="nextWeek()">›</button>
        } @else {
          <button type="button" class="btn btn-ghost btn-sm" (click)="prevMonth()">‹</button>
          <span class="week-label">{{ calendarMonthLabel() }}</span>
          <button type="button" class="btn btn-ghost btn-sm" (click)="nextMonth()">›</button>
        }
        <button type="button" class="btn btn-ghost btn-sm" (click)="goToToday()">{{ 'WORKING_PLAN.TODAY' | translate }}</button>
        <button type="button" class="btn btn-ghost btn-sm" (click)="load()">{{ 'ORDERS.REFRESH' | translate }}</button>
      </div>

      @if (viewMode() === 'calendar') {
        <div class="calendar-section" data-testid="working-plan-calendar-section">
          @if (loading()) {
            <div class="empty-state"><p>{{ 'COMMON.LOADING' | translate }}</p></div>
          } @else {
          <p class="calendar-legend">{{ 'WORKING_PLAN.CALENDAR_LEGEND' | translate }}</p>
          <div class="calendar-grid" data-testid="working-plan-calendar-grid">
            <div class="calendar-row calendar-header">
              @for (wd of weekdayLabels(); track wd) {
                <div class="calendar-cell calendar-cell-header">{{ wd }}</div>
              }
            </div>
            @for (row of calendarGrid(); track row.weekIndex) {
              <div class="calendar-row">
                @for (cell of row.days; track cell.trackId) {
                  <div class="calendar-cell" [class.calendar-cell-empty]="!cell.day" [class.calendar-day-matches]="cell.hasIssue">
                    @if (cell.day) {
                      <span class="calendar-day-num">{{ cell.day }}</span>
                    }
                  </div>
                }
              </div>
            }
          </div>
          }
        </div>
      }

      @if (viewMode() === 'week') {
        @if (loading()) {
          <div class="empty-state"><p>{{ 'COMMON.LOADING' | translate }}</p></div>
        } @else if (shifts().length === 0) {
          <div class="empty-state">
            <p>{{ 'WORKING_PLAN.NO_SHIFTS' | translate }}</p>
            <button class="btn btn-primary" (click)="openCreate()">{{ 'WORKING_PLAN.ADD_SHIFT' | translate }}</button>
          </div>
        } @else {
          <div class="shift-list">
            @for (s of shiftsByDate(); track s.id) {
              <div class="shift-card">
                <div class="shift-date">{{ s.date }}</div>
                <div class="shift-details">
                  <span class="shift-time">{{ s.start_time }} – {{ s.end_time }}</span>
                  @if (s.label) {
                    <span class="shift-label">{{ s.label }}</span>
                  }
                  <span class="shift-user">{{ s.user_name }} ({{ getRoleLabel(s.user_role) }})</span>
                </div>
                <div class="shift-actions">
                  <button class="btn btn-ghost btn-sm" (click)="openEdit(s)">{{ 'COMMON.EDIT' | translate }}</button>
                  <button class="btn btn-ghost btn-sm danger" (click)="confirmDelete(s)">{{ 'COMMON.DELETE' | translate }}</button>
                </div>
              </div>
            }
          </div>
        }
      }

      @if (showModal()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingShift() ? ('WORKING_PLAN.EDIT_SHIFT' | translate) : ('WORKING_PLAN.ADD_SHIFT' | translate) }}</h3>
              <button type="button" class="close-btn" (click)="closeModal()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>{{ 'WORKING_PLAN.USER' | translate }}</label>
                <select [(ngModel)]="formUserId" [disabled]="!scheduleUsers().length">
                  <option [ngValue]="null">{{ 'WORKING_PLAN.SELECT_USER' | translate }}</option>
                  @for (u of scheduleUsers(); track u.id) {
                    <option [ngValue]="u.id">{{ u.full_name || u.email }} ({{ getRoleLabel(u.role) }})</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>{{ 'WORKING_PLAN.DATE' | translate }}</label>
                <input type="date" [(ngModel)]="formDate" (ngModelChange)="onFormDateChange($event)" />
              </div>
              <div class="form-group">
                <label>{{ 'WORKING_PLAN.TIME_STEP' | translate }}</label>
                <select [(ngModel)]="formTimeStep" (ngModelChange)="onTimeOptionsChange()">
                  <option [ngValue]="30">{{ 'WORKING_PLAN.TIME_STEP_30' | translate }}</option>
                  <option [ngValue]="60">{{ 'WORKING_PLAN.TIME_STEP_1H' | translate }}</option>
                </select>
              </div>
              <div class="form-group form-group-checkbox">
                <label>
                  <input type="checkbox" [(ngModel)]="formUseAnyHour" (ngModelChange)="onTimeOptionsChange()" />
                  {{ 'WORKING_PLAN.USE_ANY_HOUR' | translate }}
                </label>
                <span class="form-hint">{{ 'WORKING_PLAN.USE_ANY_HOUR_HINT' | translate }}</span>
              </div>
              <div class="form-group">
                <label>{{ 'WORKING_PLAN.START_TIME' | translate }}</label>
                <select [(ngModel)]="formStartTime">
                  @for (t of timeOptsForSelectedDay(); track t) {
                    <option [value]="t">{{ t }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>{{ 'WORKING_PLAN.END_TIME' | translate }}</label>
                <select [(ngModel)]="formEndTime">
                  @for (t of timeOptsForSelectedDay(); track t) {
                    <option [value]="t">{{ t }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>{{ 'WORKING_PLAN.LABEL' | translate }}</label>
                <input type="text" [(ngModel)]="formLabel" placeholder="{{ 'WORKING_PLAN.LABEL_PLACEHOLDER' | translate }}" />
              </div>
              @if (formError()) {
                <div class="form-error">{{ formError() }}</div>
              }
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-ghost" (click)="closeModal()">{{ 'COMMON.CANCEL' | translate }}</button>
              <button type="button" class="btn btn-primary" (click)="saveShift()">{{ 'COMMON.SAVE' | translate }}</button>
            </div>
          </div>
        </div>
      }

      @if (deleteTarget() !== null) {
        <app-confirmation-modal
          [title]="'WORKING_PLAN.DELETE_SHIFT' | translate"
          [message]="'WORKING_PLAN.DELETE_CONFIRM' | translate"
          [confirmText]="'COMMON.DELETE' | translate"
          [cancelText]="'COMMON.CANCEL' | translate"
          confirmBtnClass="btn-danger"
          (confirm)="doDelete()"
          (cancel)="deleteTarget.set(null)"
        />
      }

      @if (toast()) {
        <div class="toast" [class]="toast()!.type">
          <span>{{ toast()!.message }}</span>
          <button type="button" class="toast-close" (click)="dismissToast()" aria-label="Dismiss">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      }
      </div>
    </app-sidebar>
  `,
  styles: [`
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .filters { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
    .week-label { min-width: 12rem; font-weight: 500; }
    .empty-state { text-align: center; padding: 2rem; color: var(--text-muted, #666); }
    .empty-state .btn { margin-top: 0.5rem; }
    .shift-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .shift-card {
      display: flex; align-items: center; flex-wrap: wrap; gap: 0.75rem;
      padding: 0.75rem 1rem; background: var(--card-bg, #fff); border-radius: 8px;
      border: 1px solid var(--border-color, #eee);
    }
    .shift-date { font-weight: 600; min-width: 7rem; }
    .shift-details { display: flex; align-items: center; gap: 0.75rem; flex: 1; }
    .shift-time { color: var(--text-muted, #666); }
    .shift-label { font-size: 0.875rem; color: var(--text-muted, #666); }
    .shift-user { font-weight: 500; }
    .shift-actions { display: flex; gap: 0.25rem; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: var(--card-bg, #fff); border-radius: 12px; max-width: 420px; width: 90%; max-height: 90vh; overflow: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color, #eee); }
    .modal-header h3 { margin: 0; font-size: 1.125rem; }
    .close-btn { background: none; border: none; cursor: pointer; padding: 0.25rem; }
    .modal-body { padding: 1.25rem; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; margin-bottom: 0.25rem; font-weight: 500; font-size: 0.875rem; }
    .form-group input, .form-group select { width: 100%; padding: 0.5rem; border: 1px solid var(--border-color, #ccc); border-radius: 6px; }
    .form-group-checkbox label { display: flex; align-items: center; gap: 0.5rem; font-weight: normal; }
    .form-group-checkbox input[type="checkbox"] { width: auto; }
    .form-hint { display: block; font-size: 0.75rem; color: var(--text-muted, #666); margin-top: 0.25rem; }
    .form-error { color: var(--danger, #c00); font-size: 0.875rem; margin-top: 0.5rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.5rem; padding: 1rem 1.25rem; border-top: 1px solid var(--border-color, #eee); }
    .toast {
      position: fixed; bottom: 1rem; right: 1rem;
      background: var(--card-bg, #fff); border-radius: 8px; padding: 0.75rem 1rem;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 0.75rem; z-index: 3000; max-width: calc(100vw - 2rem);
    }
    .toast.success { border-left: 4px solid var(--color-success, #16a34a); }
    .toast.error { border-left: 4px solid var(--danger, #dc2626); }
    .toast-close { background: none; border: none; color: var(--text-muted, #666); cursor: pointer; padding: 0.25rem; }
    .toast-close:hover { color: var(--text, #111); }
    .view-toggle { display: flex; gap: 0.25rem; }
    .view-toggle .btn.active { background: var(--border-color, #eee); font-weight: 500; }
    .calendar-section { margin-bottom: 1.5rem; }
    .calendar-legend { font-size: 0.875rem; color: var(--text-muted, #666); margin: 0 0 0.5rem 0; }
    .calendar-grid { display: flex; flex-direction: column; gap: 2px; max-width: 42rem; }
    .calendar-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
    .calendar-cell {
      aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--border-color, #eee); border-radius: 6px;
      font-size: 0.875rem; min-width: 0;
    }
    .calendar-cell-header { font-weight: 600; background: var(--card-bg, #f8f8f8); aspect-ratio: auto; padding: 0.25rem 0; }
    .calendar-cell-empty { background: var(--bg-muted, #f5f5f5); border-color: transparent; }
    .calendar-day-matches { background: rgba(220, 38, 38, 0.25); border-color: var(--danger, #dc2626); }
    .calendar-day-num { font-weight: 500; }
  `],
})
export class WorkingPlanComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private translate = inject(TranslateService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private routeParamSub?: { unsubscribe: () => void };

  /** Opening hours per day (monday..sunday), from tenant settings. Signal so calendar grid recomputes when loaded. */
  openingHours = signal<Record<string, DayHours>>({});

  viewMode = signal<ViewMode>('week');
  weekStart = signal<Date>(new Date());
  /** First day of the month for calendar view. */
  calendarMonth = signal<Date>(new Date());
  shifts = signal<Shift[]>([]);
  scheduleUsers = signal<User[]>([]);
  loading = signal(true);
  showModal = signal(false);
  editingShift = signal<Shift | null>(null);
  deleteTarget = signal<Shift | null>(null);
  formError = signal<string | null>(null);
  toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);
  private toastTimeout?: ReturnType<typeof setTimeout>;

  formUserId: number | null = null;
  formDate = '';
  formStartTime = '09:00';
  formEndTime = '14:00';
  formLabel = '';
  /** Time step for dropdown: 30 min (default) or 60 min (1h). */
  formTimeStep: 30 | 60 = 30;
  /** When true, time options are full-day (e.g. for cleaning), not limited to opening hours. */
  formUseAnyHour = false;

  weekRange = computed(() => getWeekRange(this.weekStart()));

  /** Time options for start/end. If formUseAnyHour, full-day; else aligned to opening hours. Step from formTimeStep. */
  timeOptsForSelectedDay(): string[] {
    const step = this.formTimeStep;
    if (this.formUseAnyHour) return fullDayTimeOptions(step);
    if (!this.formDate) return defaultTimeOptions(step);
    const dayKey = DAY_KEYS[new Date(this.formDate + 'T12:00:00').getDay()];
    const day = this.openingHours()[dayKey];
    if (!day || day.closed || !day.open || !day.close) return defaultTimeOptions(step);
    const open = day.hasBreak && day.morningOpen ? day.morningOpen : day.open;
    const close = day.hasBreak && day.eveningClose ? day.eveningClose : day.close;
    const opts = timeOptionsBetween(open, close, step);
    return opts.length > 0 ? opts : defaultTimeOptions(step);
  }

  weekLabel = computed(() => {
    const { from, to } = this.weekRange();
    const f = new Date(from);
    const t = new Date(to);
    return `${f.getDate()} ${this.monthShort(f.getMonth())} – ${t.getDate()} ${this.monthShort(t.getMonth())} ${t.getFullYear()}`;
  });

  shiftsByDate = computed(() => {
    const list = [...this.shifts()];
    list.sort((a, b) => {
      const d = (a.date || '').localeCompare(b.date || '');
      if (d !== 0) return d;
      return (a.start_time || '').localeCompare(b.start_time || '');
    });
    return list;
  });

  calendarMonthLabel = computed(() => {
    const d = this.calendarMonth();
    return `${this.monthShort(d.getMonth())} ${d.getFullYear()}`;
  });

  /** Short weekday names for calendar header (Mon–Sun). */
  weekdayLabels = computed(() => {
    const t = this.translate;
    return ['WORKING_PLAN.MON', 'WORKING_PLAN.TUE', 'WORKING_PLAN.WED', 'WORKING_PLAN.THU', 'WORKING_PLAN.FRI', 'WORKING_PLAN.SAT', 'WORKING_PLAN.SUN'].map((k) => t.instant(k) !== k ? t.instant(k) : k.replace('WORKING_PLAN.', ''));
  });

  /** Calendar grid: 6 rows of 7 cells. Cell has trackId; day/dateStr/hasIssue only for real days. */
  calendarGrid = computed(() => {
    const month = this.calendarMonth();
    void this.openingHours(); // ensure grid recomputes when opening hours load (async from getTenantSettings)
    void this.shifts(); // ensure grid recomputes when schedule loads
    const year = month.getFullYear();
    const monthIdx = month.getMonth();
    const first = new Date(year, monthIdx, 1);
    const last = new Date(year, monthIdx + 1, 0);
    const daysInMonth = last.getDate();
    const startOffset = (first.getDay() + 6) % 7;
    const pad = (n: number) => String(n).padStart(2, '0');
    type Cell = { trackId: string; day?: number; dateStr?: string; hasIssue?: boolean };
    const cells: Cell[] = [];
    let idx = 0;
    for (let i = 0; i < startOffset; i++) cells.push({ trackId: `empty-${idx++}` });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${pad(monthIdx + 1)}-${pad(d)}`;
      cells.push({ trackId: dateStr, day: d, dateStr, hasIssue: this.dayHasRequirementIssue(dateStr) });
    }
    const total = cells.length;
    const remainder = total % 7;
    if (remainder !== 0) for (let i = 0; i < 7 - remainder; i++) cells.push({ trackId: `empty-${idx++}` });
    const rows: { weekIndex: number; days: Cell[] }[] = [];
    for (let r = 0; r < cells.length; r += 7) rows.push({ weekIndex: r / 7, days: cells.slice(r, r + 7) });
    return rows;
  });

  ngOnInit(): void {
    const applyView = (view: string | null): boolean => {
      if (isValidView(view)) {
        this.viewMode.set(view);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(WORKING_PLAN_VIEW_KEY, view);
        }
        return true;
      }
      if (view != null) {
        this.router.navigate(['/working-plan', 'week'], { replaceUrl: true });
      }
      return false;
    };
    const initialView = this.route.snapshot.paramMap.get('view');
    applyView(initialView);
    this.routeParamSub = this.route.paramMap.subscribe((params) => {
      if (applyView(params.get('view'))) {
        this.load();
      }
    });
    this.api.getUsersForSchedule().subscribe({
      next: (users) => this.scheduleUsers.set(users),
      error: () => this.scheduleUsers.set([]),
    });
    this.api.getTenantSettings().subscribe({
      next: (settings) => this.parseOpeningHours(settings.opening_hours),
      error: () => {},
    });
  }

  ngOnDestroy(): void {
    this.routeParamSub?.unsubscribe();
  }

  private parseOpeningHours(json: string | null | undefined): void {
    const hours: Record<string, DayHours> = {};
    DAY_KEYS.forEach((key) => {
      hours[key] = { open: '09:00', close: '22:00', closed: false };
    });
    if (!json?.trim()) {
      this.openingHours.set(hours);
      return;
    }
    try {
      const parsed = JSON.parse(json) as Record<string, Partial<DayHours>>;
      DAY_KEYS.forEach((key) => {
        if (parsed[key]) {
          const d = parsed[key];
          hours[key] = {
            open: d.open ?? '09:00',
            close: d.close ?? '22:00',
            closed: d.closed ?? false,
            hasBreak: d.hasBreak,
            morningOpen: d.morningOpen,
            morningClose: d.morningClose,
            eveningOpen: d.eveningOpen,
            eveningClose: d.eveningClose,
            bar: d.bar ?? 0,
            waiter: d.waiter ?? 0,
            kitchen: d.kitchen ?? 0,
            receptionist: d.receptionist ?? 0,
          };
        }
      });
      this.openingHours.set(hours);
    } catch {
      this.openingHours.set(hours);
    }
  }

  /** When the user changes the shift date, clamp start/end to the new day's time options. */
  onFormDateChange(_newDate: string): void {
    this.clampFormTimes();
  }

  /** Clamp start/end to current time options (e.g. after toggling "use any hour" or changing time step). */
  onTimeOptionsChange(): void {
    this.clampFormTimes();
  }

  private clampFormTimes(): void {
    const opts = this.timeOptsForSelectedDay();
    if (opts.length === 0) return;
    if (!opts.includes(this.formStartTime)) this.formStartTime = opts[0];
    if (!opts.includes(this.formEndTime)) this.formEndTime = opts[opts.length - 1];
    if (this.formStartTime >= this.formEndTime) {
      this.formEndTime = opts[opts.indexOf(this.formStartTime) + 1] ?? opts[opts.length - 1];
    }
  }

  /** Required headcount for a role on a day (from opening hours personnel settings). */
  private getRequiredForRole(dayKey: string, staffKey: StaffKey): number {
    const day = this.openingHours()[dayKey];
    if (!day) return 0;
    const n = (day as unknown as Record<string, number | undefined>)[staffKey];
    return typeof n === 'number' ? Math.max(0, n) : 0;
  }

  /** Number of shifts on the given date for the given role (user_role mapped to staff key). */
  private getScheduledCountForRole(date: string, staffKey: StaffKey): number {
    return this.shifts().filter((s) => s.date === date && shiftRoleMatchesStaffKey(s.user_role, staffKey)).length;
  }

  /** True if the given week-day key is marked closed in opening hours. */
  private isDayClosed(dayKey: string): boolean {
    const day = this.openingHours()[dayKey];
    return day?.closed === true;
  }

  /** True if the shift plan for this date meets personnel requirements (scheduled >= required for each role). */
  dayMatchesRequirements(dateStr: string): boolean {
    const dayKey = DAY_KEYS[new Date(dateStr + 'T12:00:00').getDay()];
    if (this.isDayClosed(dayKey)) return false;
    for (const sk of STAFF_KEYS) {
      const required = this.getRequiredForRole(dayKey, sk);
      if (required > 0) {
        const scheduled = this.getScheduledCountForRole(dateStr, sk);
        if (scheduled < required) return false;
      }
    }
    const hasAnyRequirement = STAFF_KEYS.some((sk) => this.getRequiredForRole(dayKey, sk) > 0);
    return hasAnyRequirement;
  }

  /** True if this date has a staffing issue: any role has too many or not enough people vs requirements. */
  dayHasRequirementIssue(dateStr: string): boolean {
    const dayKey = DAY_KEYS[new Date(dateStr + 'T12:00:00').getDay()];
    if (this.isDayClosed(dayKey)) return false;
    for (const sk of STAFF_KEYS) {
      const required = this.getRequiredForRole(dayKey, sk);
      if (required > 0) {
        const scheduled = this.getScheduledCountForRole(dateStr, sk);
        if (scheduled < required || scheduled > required) return true;
      }
    }
    return false;
  }

  /** Next date in the current week range that is open and has a free slot for the current user's role; else first open day of week. */
  getSuggestedDateForNewShift(): string {
    const { from, to } = this.weekRange();
    const user = this.api.getCurrentUser();
    const staffKey = user ? roleToStaffKey(user.role ?? '') : null;

    const datesInWeek: string[] = [];
    const fromDate = new Date(from + 'T12:00:00');
    const toDate = new Date(to + 'T12:00:00');
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      datesInWeek.push(`${y}-${m}-${day}`);
    }

    if (staffKey) {
      for (const date of datesInWeek) {
        const dayKey = DAY_KEYS[new Date(date + 'T12:00:00').getDay()];
        if (this.isDayClosed(dayKey)) continue;
        const required = this.getRequiredForRole(dayKey, staffKey);
        const scheduled = this.getScheduledCountForRole(date, staffKey);
        if (required > 0 && scheduled < required) return date;
      }
    } else {
      for (const date of datesInWeek) {
        const dayKey = DAY_KEYS[new Date(date + 'T12:00:00').getDay()];
        if (this.isDayClosed(dayKey)) continue;
        for (const sk of STAFF_KEYS) {
          const required = this.getRequiredForRole(dayKey, sk);
          const scheduled = this.getScheduledCountForRole(date, sk);
          if (required > 0 && scheduled < required) return date;
        }
      }
    }

    const firstOpenDate = datesInWeek.find((date) => !this.isDayClosed(DAY_KEYS[new Date(date + 'T12:00:00').getDay()]));
    return firstOpenDate ?? from;
  }

  private monthShort(m: number): string {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[m] ?? '';
  }

  load(): void {
    this.loading.set(true);
    const range = this.viewMode() === 'calendar' ? getMonthRange(this.calendarMonth()) : this.weekRange();
    this.api.getSchedule(range.from, range.to).subscribe({
      next: (data) => {
        this.shifts.set(data);
        this.loading.set(false);
        const user = this.api.getCurrentUser();
        if (user && String(user.role).toLowerCase() === 'owner') {
          this.api.getScheduleNotification().subscribe({
            next: (n) => this.api.workingPlanHasUpdates.set(n.has_updates),
          });
        }
      },
      error: () => { this.shifts.set([]); this.loading.set(false); },
    });
  }

  setViewMode(mode: ViewMode): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(WORKING_PLAN_VIEW_KEY, mode);
    }
    this.viewMode.set(mode);
    if (mode === 'calendar') {
      this.calendarMonth.set(new Date(this.weekStart().getFullYear(), this.weekStart().getMonth(), 1));
    }
    this.router.navigate(['/working-plan', mode]);
    this.load();
  }

  prevMonth(): void {
    const d = new Date(this.calendarMonth());
    d.setMonth(d.getMonth() - 1);
    this.calendarMonth.set(d);
    this.load();
  }

  nextMonth(): void {
    const d = new Date(this.calendarMonth());
    d.setMonth(d.getMonth() + 1);
    this.calendarMonth.set(d);
    this.load();
  }

  prevWeek(): void {
    const d = new Date(this.weekStart());
    d.setDate(d.getDate() - 7);
    this.weekStart.set(d);
    this.load();
  }

  nextWeek(): void {
    const d = new Date(this.weekStart());
    d.setDate(d.getDate() + 7);
    this.weekStart.set(d);
    this.load();
  }

  goToToday(): void {
    const now = new Date();
    this.weekStart.set(now);
    this.calendarMonth.set(new Date(now.getFullYear(), now.getMonth(), 1));
    this.load();
  }

  getRoleLabel(role: string): string {
    if (!role) return '';
    const key = `USERS.ROLES.${role.toUpperCase()}`;
    const t = this.translate.instant(key);
    return t !== key ? t : role;
  }

  openCreate(): void {
    const { from } = this.weekRange();
    this.editingShift.set(null);
    const currentUser = this.api.getCurrentUser();
    const users = this.scheduleUsers();
    const currentId = currentUser?.id;
    this.formUserId = currentId != null && users.some((u) => u.id === currentId) ? currentId : (users[0]?.id ?? null);
    this.formDate = this.getSuggestedDateForNewShift();
    this.formTimeStep = 30;
    this.formUseAnyHour = false;
    this.formStartTime = '09:00';
    this.formEndTime = '14:00';
    this.formLabel = '';
    this.formError.set(null);
    this.showModal.set(true);
    this.onFormDateChange(this.formDate);
  }

  openEdit(s: Shift): void {
    this.editingShift.set(s);
    this.formUserId = s.user_id;
    this.formDate = s.date || '';
    this.formStartTime = s.start_time || '09:00';
    this.formEndTime = s.end_time || '14:00';
    this.formLabel = s.label || '';
    this.formError.set(null);
    this.showModal.set(true);
    // If shift times are outside opening-hours range, enable "any hour" so they remain selectable
    this.formUseAnyHour = false;
    const optsRestricted = this.timeOptsForSelectedDay();
    if (!optsRestricted.includes(this.formStartTime) || !optsRestricted.includes(this.formEndTime)) {
      this.formUseAnyHour = true;
    }
    this.clampFormTimes();
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingShift.set(null);
    this.formError.set(null);
  }

  showToast(message: string, type: 'success' | 'error'): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toast.set({ message, type });
    this.toastTimeout = setTimeout(() => this.dismissToast(), 4000);
  }

  dismissToast(): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = undefined;
    this.toast.set(null);
  }

  saveShift(): void {
    this.formError.set(null);
    if (this.formUserId == null) {
      this.formError.set('Please select a user');
      return;
    }
    if (!this.formDate) {
      this.formError.set('Please select a date');
      return;
    }
    const start = this.formStartTime;
    const end = this.formEndTime;
    if (start >= end) {
      this.formError.set('Start time must be before end time');
      return;
    }
    const edit = this.editingShift();
    if (edit) {
      const payload: ShiftUpdate = {
        user_id: this.formUserId,
        date: this.formDate,
        start_time: start,
        end_time: end,
        label: this.formLabel || null,
      };
      this.api.updateShift(edit.id, payload).subscribe({
        next: () => {
          this.closeModal();
          this.load();
          this.showToast(this.translate.instant('WORKING_PLAN.UPDATED'), 'success');
        },
        error: (err) => {
          const msg = this.getApiErrorMessage(err);
          this.formError.set(msg);
          this.showToast(msg, 'error');
        },
      });
    } else {
      const payload: ShiftCreate = {
        user_id: this.formUserId,
        date: this.formDate,
        start_time: start,
        end_time: end,
        label: this.formLabel || null,
      };
      this.api.createShift(payload).subscribe({
        next: () => {
          this.closeModal();
          this.load();
          this.showToast(this.translate.instant('WORKING_PLAN.SAVED'), 'success');
        },
        error: (err) => {
          const msg = this.getApiErrorMessage(err);
          this.formError.set(msg);
          this.showToast(msg, 'error');
        },
      });
    }
  }

  private getApiErrorMessage(err: { error?: { detail?: string | unknown } }): string {
    const d = err.error?.detail;
    if (typeof d === 'string') return d;
    if (Array.isArray(d) && d.length > 0 && d[0]?.msg) return String(d[0].msg);
    return this.translate.instant('WORKING_PLAN.SAVE_FAILED');
  }

  confirmDelete(s: Shift): void {
    this.deleteTarget.set(s);
  }

  doDelete(): void {
    const s = this.deleteTarget();
    if (!s) return;
    this.api.deleteShift(s.id).subscribe({
      next: () => {
        this.deleteTarget.set(null);
        this.load();
        this.showToast(this.translate.instant('WORKING_PLAN.DELETED'), 'success');
      },
      error: (_err) => {
        this.deleteTarget.set(null);
        this.showToast(this.translate.instant('WORKING_PLAN.DELETE_FAILED'), 'error');
      },
    });
  }
}
