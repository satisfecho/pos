import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  ApiService,
  Shift,
  ShiftCreate,
  ShiftUpdate,
  ShiftBulkCreate,
  PlannedVsActualRow,
  ScheduleComplianceWarning,
  User,
} from '../services/api.service';
import { SidebarComponent } from '../shared/sidebar.component';
import { ConfirmationModalComponent } from '../shared/confirmation-modal.component';
import { FocusFirstInputDirective } from '../shared/focus-first-input.directive';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../services/language.service';
import { PermissionService } from '../services/permission.service';
import { hueFromUserId, weekShiftCardBorderLeft } from './working-plan-shift-colors';

/** One row in a calendar day cell: a real shift or the “+N more” overflow line. */
type CalendarShiftLineRow =
  | { text: string; userId: number; shift: Shift }
  | { text: string; userId: null; shift: null };

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
/** Persist open state of the planned-vs-clocked disclosure (default collapsed). */
const WORKING_PLAN_PVA_OPEN_KEY = 'workingPlanPvaOpen';
const VALID_VIEWS = ['week', 'calendar'] as const;
type ViewMode = (typeof VALID_VIEWS)[number];

/** Weekday checkboxes for bulk month (Mon–Sun); values match Date.getDay() (Sun=0). */
const BULK_WEEKDAY_OPTS: { js: number; labelKey: string }[] = [
  { js: 1, labelKey: 'WORKING_PLAN.MON' },
  { js: 2, labelKey: 'WORKING_PLAN.TUE' },
  { js: 3, labelKey: 'WORKING_PLAN.WED' },
  { js: 4, labelKey: 'WORKING_PLAN.THU' },
  { js: 5, labelKey: 'WORKING_PLAN.FRI' },
  { js: 6, labelKey: 'WORKING_PLAN.SAT' },
  { js: 0, labelKey: 'WORKING_PLAN.SUN' },
];

function isValidView(v: string | null): v is ViewMode {
  return v === 'week' || v === 'calendar';
}

@Component({
  selector: 'app-working-plan',
  standalone: true,
  imports: [FormsModule, SidebarComponent, TranslateModule, ConfirmationModalComponent, FocusFirstInputDirective],
  template: `
    <app-sidebar>
      <div class="working-plan-page" data-testid="working-plan-page">
      <div class="page-header">
        <h1>{{ 'WORKING_PLAN.TITLE' | translate }}</h1>
        <div class="page-header-actions">
        <button type="button" class="btn btn-secondary" (click)="openBulkMonth()" data-testid="working-plan-bulk-month">
          {{ 'WORKING_PLAN.BULK_MONTH' | translate }}
        </button>
        @if (viewMode() === 'week') {
          <button
            type="button"
            class="btn btn-secondary"
            (click)="copyWeekToNextWeek()"
            [disabled]="copyWeekSaving()"
            data-testid="working-plan-copy-week"
          >
            {{ copyWeekSaving() ? ('COMMON.LOADING' | translate) : ('WORKING_PLAN.COPY_WEEK' | translate) }}
          </button>
        }
        <button type="button" class="btn btn-primary" (click)="openCreate()" data-testid="working-plan-add-shift">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {{ 'WORKING_PLAN.ADD_SHIFT' | translate }}
        </button>
        </div>
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
        <span class="export-sep" aria-hidden="true"></span>
        <label class="export-label" for="working-plan-staff-scope">{{ 'WORKING_PLAN.STAFF_FILTER_LABEL' | translate }}</label>
        <select
          id="working-plan-staff-scope"
          class="export-worker-select"
          [ngModel]="exportUserId()"
          (ngModelChange)="onExportUserIdSelected($event)"
          [disabled]="!scheduleUsers().length"
          data-testid="working-plan-export-worker"
        >
          @if (!scheduleUsers().length) {
            <option [ngValue]="null">{{ 'WORKING_PLAN.EXPORT_NO_STAFF_OPTION' | translate }}</option>
          } @else {
            <option [ngValue]="null">{{ 'WORKING_PLAN.ALL_STAFF_OPTION' | translate }}</option>
            @for (u of scheduleUsers(); track u.id) {
              <option [ngValue]="u.id">{{ u.full_name || u.email }} ({{ getRoleLabel(u.role) }})</option>
            }
          }
        </select>
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          (click)="exportExcel()"
          [disabled]="exportUserId() == null || exportLoading() || !scheduleUsers().length"
          data-testid="working-plan-export-excel"
        >
          {{ exportLoading() ? ('COMMON.LOADING' | translate) : ('WORKING_PLAN.EXPORT_EXCEL' | translate) }}
        </button>
      </div>
      @if (scheduleUsers().length) {
        <p class="export-hint">{{ 'WORKING_PLAN.STAFF_FILTER_HINT' | translate: { month: exportMonthLabel() } }}</p>
      } @else {
        <p class="export-hint export-hint-muted">{{ 'WORKING_PLAN.EXPORT_NO_STAFF_HINT' | translate }}</p>
      }

      @if (complianceWarnings().length) {
        <div class="compliance-banner" role="alert" data-testid="working-plan-compliance">
          <strong>{{ 'WORKING_PLAN.COMPLIANCE_TITLE' | translate }}</strong>
          <ul class="compliance-list">
            @for (w of complianceWarnings(); track $index) {
              <li>{{ complianceWarningText(w) }}</li>
            }
          </ul>
        </div>
      }

      @if (showPvaSection()) {
        <section class="pva-section" data-testid="working-plan-pva">
          <button
            type="button"
            class="pva-disclosure-trigger"
            (click)="togglePvaSection()"
            [attr.aria-expanded]="pvaSectionOpen()"
            data-testid="working-plan-pva-toggle"
          >
            {{ pvaSectionOpen() ? ('WORKING_PLAN.PVA_HIDE' | translate) : ('WORKING_PLAN.PVA_SHOW' | translate) }}
          </button>
          @if (pvaSectionOpen()) {
            <div class="pva-disclosure-body">
              <p class="pva-hint">{{ 'WORKING_PLAN.PLANNED_VS_ACTUAL_HINT' | translate }}</p>
              <div class="pva-toolbar">
                <button
                  type="button"
                  class="btn btn-ghost btn-sm"
                  (click)="exportPvaExcel()"
                  [disabled]="exportPvaLoading() || !plannedVsActualDisplayed().length"
                  data-testid="working-plan-pva-export-excel"
                >
                  {{ exportPvaLoading() ? ('COMMON.LOADING' | translate) : ('WORKING_PLAN.EXPORT_PVA_EXCEL' | translate) }}
                </button>
              </div>
              @if (plannedVsActualDisplayed().length) {
                <div class="pva-table-wrap">
                  <table class="pva-table">
                    <thead>
                      <tr>
                        <th>{{ 'WORKING_PLAN.PVA_COL_DATE' | translate }}</th>
                        <th>{{ 'WORKING_PLAN.PVA_COL_STAFF' | translate }}</th>
                        <th>{{ 'WORKING_PLAN.PVA_COL_PLANNED' | translate }}</th>
                        <th>{{ 'WORKING_PLAN.PVA_COL_CLOCKED' | translate }}</th>
                        <th>{{ 'WORKING_PLAN.PVA_COL_VARIANCE' | translate }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (r of plannedVsActualDisplayed(); track r.date + '-' + r.user_id) {
                        <tr>
                          <td>{{ r.date }}</td>
                          <td>{{ r.user_name }}</td>
                          <td>{{ formatMinutes(r.planned_minutes) }}</td>
                          <td>{{ formatMinutes(r.actual_minutes) }}</td>
                          <td [class.pva-var-pos]="r.variance_minutes > 0" [class.pva-var-neg]="r.variance_minutes < 0">
                            {{ formatSignedMinutes(r.variance_minutes) }}
                          </td>
                        </tr>
                      }
                    </tbody>
                    <tfoot>
                      <tr class="pva-totals-row">
                        <td>{{ 'WORKING_PLAN.PVA_TOTALS' | translate }}</td>
                        <td></td>
                        <td>{{ formatMinutes(pvaTotals().planned_minutes) }}</td>
                        <td>{{ formatMinutes(pvaTotals().actual_minutes) }}</td>
                        <td
                          [class.pva-var-pos]="pvaTotals().variance_minutes > 0"
                          [class.pva-var-neg]="pvaTotals().variance_minutes < 0"
                        >
                          {{ formatSignedMinutes(pvaTotals().variance_minutes) }}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              } @else {
                <p class="pva-empty-filtered">{{ 'WORKING_PLAN.PVA_EMPTY_FILTERED' | translate }}</p>
              }
            </div>
          }
        </section>
      }

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
                  <div
                    class="calendar-cell"
                    [class.calendar-cell-empty]="!cell.day"
                    [class.calendar-cell-closed]="cell.isClosed"
                    [class.calendar-day-matches]="cell.hasIssue"
                    [class.calendar-day-ok]="cell.showOk"
                  >
                    @if (cell.day) {
                      <span class="calendar-day-num">{{ cell.day }}</span>
                      @if (cell.isClosed) {
                        <span class="calendar-closed-label">{{ 'WORKING_PLAN.CLOSED_DAY' | translate }}</span>
                      }
                      @if (cell.shiftLines?.length) {
                        <ul class="calendar-shift-lines">
                          @for (line of cell.shiftLines; track calendarShiftLineTrack(line, $index)) {
                            @if (line.shift) {
                              @if (canWriteSchedule()) {
                                <li
                                  class="calendar-shift-line-row"
                                  [style.--wp-shift-h]="shiftHue(line.userId)"
                                  data-testid="working-plan-calendar-shift-line"
                                >
                                  <button
                                    type="button"
                                    class="calendar-shift-line calendar-shift-line--btn"
                                    (click)="openEdit(line.shift)"
                                    [attr.aria-label]="calendarShiftEditAria(line.shift)"
                                  >
                                    {{ line.text }}
                                  </button>
                                  <button
                                    type="button"
                                    class="calendar-shift-line-delete"
                                    (click)="onCalendarShiftDeleteClick($event, line.shift)"
                                    [attr.aria-label]="calendarShiftDeleteAria(line.shift)"
                                    data-testid="working-plan-calendar-shift-delete"
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                                      <path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                    </svg>
                                  </button>
                                </li>
                              } @else {
                                <li
                                  class="calendar-shift-line"
                                  [style.--wp-shift-h]="shiftHue(line.userId)"
                                  data-testid="working-plan-calendar-shift-line"
                                >
                                  {{ line.text }}
                                </li>
                              }
                            } @else {
                              <li class="calendar-shift-line-overflow" data-testid="working-plan-calendar-shift-overflow">
                                {{ line.text }}
                              </li>
                            }
                          }
                        </ul>
                      }
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
              <div class="shift-card" [style.border-left]="weekShiftBorder(s.user_id)">
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

      @if (showBulkModal()) {
        <div class="modal-overlay" (click)="closeBulkModal()">
          <div class="modal-content modal-content-wide" (click)="$event.stopPropagation()" appFocusFirstInput>
            <div class="modal-header">
              <h3>{{ 'WORKING_PLAN.BULK_MONTH_TITLE' | translate }}</h3>
              <button type="button" class="close-btn" (click)="closeBulkModal()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <p class="bulk-month-scope">{{ 'WORKING_PLAN.BULK_MONTH_SCOPE' | translate: { month: bulkMonthLabel() } }}</p>
              <div class="form-group">
                <label for="bulk-user">{{ 'WORKING_PLAN.USER' | translate }}</label>
                <select id="bulk-user" [(ngModel)]="bulkUserId" [disabled]="!scheduleUsers().length">
                  <option [ngValue]="null">{{ 'WORKING_PLAN.SELECT_USER' | translate }}</option>
                  @for (u of scheduleUsers(); track u.id) {
                    <option [ngValue]="u.id">{{ u.full_name || u.email }} ({{ getRoleLabel(u.role) }})</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <span class="bulk-section-label">{{ 'WORKING_PLAN.BULK_WEEKDAYS' | translate }}</span>
                <div class="bulk-weekdays">
                  @for (w of bulkWeekdayOpts; track w.js) {
                    <label class="bulk-wd">
                      <input type="checkbox" [checked]="bulkWeekdays().has(w.js)" (change)="toggleBulkWeekday(w.js)" />
                      {{ w.labelKey | translate }}
                    </label>
                  }
                </div>
              </div>
              <div class="form-group">
                <label>{{ 'WORKING_PLAN.TIME_STEP' | translate }}</label>
                <select [(ngModel)]="bulkTimeStep" (ngModelChange)="onBulkTimeOptionsChange()">
                  <option [ngValue]="30">{{ 'WORKING_PLAN.TIME_STEP_30' | translate }}</option>
                  <option [ngValue]="60">{{ 'WORKING_PLAN.TIME_STEP_1H' | translate }}</option>
                </select>
              </div>
              <div class="form-group form-group-checkbox">
                <label>
                  <input type="checkbox" [(ngModel)]="bulkUseAnyHour" (ngModelChange)="onBulkTimeOptionsChange()" />
                  {{ 'WORKING_PLAN.USE_ANY_HOUR' | translate }}
                </label>
              </div>
              <div class="form-group">
                <label>{{ 'WORKING_PLAN.START_TIME' | translate }}</label>
                <select [(ngModel)]="bulkStartTime">
                  @for (t of timeOptsForBulk(); track t) {
                    <option [value]="t">{{ t }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>{{ 'WORKING_PLAN.END_TIME' | translate }}</label>
                <select [(ngModel)]="bulkEndTime">
                  @for (t of timeOptsForBulk(); track t) {
                    <option [value]="t">{{ t }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>{{ 'WORKING_PLAN.LABEL' | translate }}</label>
                <input type="text" [(ngModel)]="bulkLabel" placeholder="{{ 'WORKING_PLAN.LABEL_PLACEHOLDER' | translate }}" />
              </div>
              <div class="form-group form-group-checkbox">
                <label>
                  <input type="checkbox" [(ngModel)]="bulkSkipExisting" />
                  {{ 'WORKING_PLAN.BULK_SKIP_EXISTING' | translate }}
                </label>
                <span class="form-hint">{{ 'WORKING_PLAN.BULK_SKIP_EXISTING_HINT' | translate }}</span>
              </div>
              @if (bulkFormError()) {
                <div class="form-error">{{ bulkFormError() }}</div>
              }
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-ghost" (click)="closeBulkModal()">{{ 'COMMON.CANCEL' | translate }}</button>
              <button type="button" class="btn btn-primary" (click)="saveBulkMonth()" [disabled]="bulkSaving()">{{ bulkSaving() ? ('COMMON.LOADING' | translate) : ('WORKING_PLAN.BULK_APPLY' | translate) }}</button>
            </div>
          </div>
        </div>
      }

      @if (showModal()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div
            class="modal-content"
            [class.modal-content-wide]="formSplitShift && !editingShift()"
            (click)="$event.stopPropagation()"
            appFocusFirstInput
          >
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
              @if (!editingShift()) {
                <div class="form-group form-group-checkbox">
                  <label>
                    <input type="checkbox" [(ngModel)]="formSplitShift" (ngModelChange)="onSplitShiftChange($event)" />
                    {{ 'WORKING_PLAN.SPLIT_SHIFT' | translate }}
                  </label>
                </div>
              }
              @if (formSplitShift && !editingShift()) {
                <span class="bulk-section-label">{{ 'WORKING_PLAN.SHIFT_BLOCK_A' | translate }}</span>
              }
              <div class="form-group">
                <label>{{ 'WORKING_PLAN.START_TIME' | translate }}</label>
                <select [(ngModel)]="formStartTime" (ngModelChange)="onFormBlock1TimesChange()">
                  @for (t of timeOptsForSelectedDay(); track t) {
                    <option [value]="t">{{ t }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>{{ 'WORKING_PLAN.END_TIME' | translate }}</label>
                <select [(ngModel)]="formEndTime" (ngModelChange)="onFormBlock1TimesChange()">
                  @for (t of timeOptsForSelectedDay(); track t) {
                    <option [value]="t">{{ t }}</option>
                  }
                </select>
              </div>
              @if (formSplitShift && !editingShift()) {
                <span class="bulk-section-label">{{ 'WORKING_PLAN.SHIFT_BLOCK_B' | translate }}</span>
                @if (!timeOptsForBlock2Start().length) {
                  <p class="form-error">{{ 'WORKING_PLAN.SPLIT_ERR_NO_ROOM' | translate }}</p>
                }
                <div class="form-group">
                  <label>{{ 'WORKING_PLAN.START_TIME' | translate }}</label>
                  <select [(ngModel)]="formStartTime2" (ngModelChange)="onFormBlock2TimesChange()">
                    @for (t of timeOptsForBlock2Start(); track t) {
                      <option [value]="t">{{ t }}</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label>{{ 'WORKING_PLAN.END_TIME' | translate }}</label>
                  <select [(ngModel)]="formEndTime2" (ngModelChange)="onFormBlock2TimesChange()">
                    @for (t of timeOptsForBlock2End(); track t) {
                      <option [value]="t">{{ t }}</option>
                    }
                  </select>
                </div>
              }
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
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem; }
    .page-header-actions { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .filters { display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.35rem; }
    .export-sep { width: 1px; height: 1.25rem; background: var(--border-color, #ddd); margin: 0 0.25rem; }
    .export-label { font-size: 0.875rem; color: var(--text-muted, #666); margin: 0; }
    .export-worker-select { min-width: 10rem; max-width: 14rem; padding: 0.35rem 0.5rem; border: 1px solid var(--border-color, #ccc); border-radius: 6px; font-size: 0.875rem; }
    .export-hint { font-size: 0.75rem; color: var(--text-muted, #666); margin: 0 0 1rem 0; }
    .export-hint-muted { font-style: italic; }
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
    .modal-content-wide { max-width: 28rem; }
    .bulk-month-scope { font-size: 0.875rem; color: var(--text-muted, #666); margin: 0 0 1rem 0; }
    .bulk-section-label { display: block; margin-bottom: 0.35rem; font-weight: 500; font-size: 0.875rem; }
    .bulk-weekdays { display: flex; flex-wrap: wrap; gap: 0.35rem 0.75rem; }
    .bulk-wd { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.875rem; font-weight: normal; cursor: pointer; }
    .bulk-wd input { width: auto; margin: 0; }
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
      min-height: 4.75rem; display: flex; flex-direction: column; align-items: stretch; justify-content: flex-start;
      border: 1px solid var(--border-color, #eee); border-radius: 6px;
      font-size: 0.875rem; min-width: 0; padding: 0.3rem 0.35rem; gap: 0.15rem;
    }
    .calendar-cell-header { font-weight: 600; background: var(--card-bg, #f8f8f8); aspect-ratio: auto; padding: 0.25rem 0; }
    .calendar-cell-empty { background: var(--bg-muted, #f5f5f5); border-color: transparent; }
    .calendar-cell-closed:not(.calendar-day-matches) { background: var(--bg-muted, #ececec); color: var(--text-muted, #666); }
    .calendar-day-matches { background: rgba(220, 38, 38, 0.25); border-color: var(--danger, #dc2626); }
    .calendar-day-ok { background: rgba(22, 163, 74, 0.2); border-color: var(--color-success, #16a34a); }
    .calendar-day-num { font-weight: 600; flex-shrink: 0; }
    .calendar-closed-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.02em; opacity: 0.85; }
    .calendar-shift-lines { list-style: none; margin: 0; padding: 0; font-size: 0.65rem; line-height: 1.3; overflow: hidden; display: flex; flex-direction: column; gap: 0.12rem; }
    .calendar-shift-line {
      --shift-sat: 50%;
      --shift-soft: 40%;
      --shift-soft-a: 0.14;
      --shift-border-sat: 48%;
      --shift-border-light: 36%;
      --shift-text-sat: 34%;
      --shift-text-light: 17%;
      border-radius: 4px;
      padding: 0.1em 0.28em 0.1em 0.32em;
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      background: hsla(var(--wp-shift-h), var(--shift-sat), var(--shift-soft), var(--shift-soft-a));
      color: hsl(var(--wp-shift-h), var(--shift-text-sat), var(--shift-text-light));
      border-left: 3px solid hsl(var(--wp-shift-h), var(--shift-border-sat), var(--shift-border-light));
    }
    @media (prefers-color-scheme: dark) {
      .calendar-shift-line {
        --shift-soft: 52%;
        --shift-soft-a: 0.3;
        --shift-border-light: 64%;
        --shift-text-sat: 26%;
        --shift-text-light: 93%;
      }
    }
    .calendar-shift-line-row {
      display: flex;
      align-items: stretch;
      gap: 0.12rem;
      min-width: 0;
      margin: 0;
      list-style: none;
    }
    .calendar-shift-line--btn {
      border: none;
      font: inherit;
      cursor: pointer;
      text-align: left;
      flex: 1;
      min-width: 0;
    }
    .calendar-shift-line--btn:hover {
      filter: brightness(0.96);
    }
    .calendar-shift-line--btn:focus-visible {
      outline: 2px solid var(--focus-ring, #2563eb);
      outline-offset: 1px;
    }
    .calendar-shift-line-delete {
      flex-shrink: 0;
      align-self: center;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.1rem;
      border: none;
      border-radius: 3px;
      background: transparent;
      color: var(--danger, #dc2626);
      cursor: pointer;
      line-height: 0;
      opacity: 0.9;
    }
    .calendar-shift-line-delete:hover {
      opacity: 1;
      background: rgba(220, 38, 38, 0.12);
    }
    .calendar-shift-line-delete:focus-visible {
      outline: 2px solid var(--focus-ring, #2563eb);
      outline-offset: 1px;
    }
    .calendar-shift-line-overflow {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin: 0;
      padding: 0;
      color: var(--text-muted, #666);
      font-style: italic;
    }
    .compliance-banner {
      margin-bottom: 1rem;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      border: 1px solid var(--warning-border, #f59e0b);
      background: rgba(245, 158, 11, 0.1);
      font-size: 0.875rem;
    }
    .compliance-list { margin: 0.35rem 0 0 1rem; padding: 0; }
    .pva-section { margin-bottom: 1.5rem; }
    .pva-disclosure-trigger {
      display: flex; align-items: center; width: 100%; text-align: left;
      padding: 0.5rem 0.65rem; margin-bottom: 0.35rem;
      background: var(--card-bg, #f8f8f8); border: 1px solid var(--border-color, #eee); border-radius: 8px;
      font-weight: 600; font-size: 0.95rem; cursor: pointer; color: inherit;
    }
    .pva-disclosure-trigger:hover { filter: brightness(0.97); }
    .pva-disclosure-body { padding-top: 0.15rem; }
    .pva-toolbar { margin-bottom: 0.5rem; }
    .pva-hint { font-size: 0.75rem; color: var(--text-muted, #666); margin: 0 0 0.5rem 0; }
    .pva-table-wrap { overflow-x: auto; }
    .pva-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .pva-table th, .pva-table td { text-align: left; padding: 0.35rem 0.5rem; border-bottom: 1px solid var(--border-color, #eee); }
    .pva-table th { font-weight: 600; color: var(--text-muted, #666); }
    .pva-totals-row td { font-weight: 600; border-top: 2px solid var(--border-color, #ddd); border-bottom: none; }
    .pva-empty-filtered { font-size: 0.875rem; color: var(--text-muted, #666); margin: 0 0 0.5rem 0; }
    .pva-var-pos { color: var(--color-success, #16a34a); }
    .pva-var-neg { color: var(--danger, #dc2626); }
  `],
})
export class WorkingPlanComponent implements OnInit, OnDestroy {
  /** Bound for template: stable left accent on week list cards. */
  readonly weekShiftBorder = weekShiftCardBorderLeft;

  private api = inject(ApiService);
  private translate = inject(TranslateService);
  private languageService = inject(LanguageService);
  private permissions = inject(PermissionService);
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
  /** Planned vs clocked rows for current date range (subset with activity). */
  plannedVsActualRows = signal<PlannedVsActualRow[]>([]);
  complianceWarnings = signal<ScheduleComplianceWarning[]>([]);
  copyWeekSaving = signal(false);
  scheduleUsers = signal<User[]>([]);
  /** Staff scope: null = all staff (planned vs clocked + optional PVA export); set = that worker for shift Excel + filtered PVA. Signal so computeds react to dropdown changes. */
  exportUserId = signal<number | null>(null);
  exportLoading = signal(false);
  exportPvaLoading = signal(false);
  /** Planned vs clocked block expanded (default collapsed; optional persistence). */
  pvaSectionOpen = signal(false);
  /** Bulk “apply to month” modal. */
  showBulkModal = signal(false);
  bulkTargetYear = signal(0);
  bulkTargetMonth = signal(1);
  bulkWeekdays = signal<Set<number>>(new Set([1, 2, 3, 4, 5]));
  bulkFormError = signal<string | null>(null);
  bulkSaving = signal(false);
  readonly bulkWeekdayOpts = BULK_WEEKDAY_OPTS;
  bulkUserId: number | null = null;
  bulkTimeStep: 30 | 60 = 30;
  bulkUseAnyHour = false;
  bulkStartTime = '09:00';
  bulkEndTime = '17:00';
  bulkLabel = '';
  bulkSkipExisting = true;
  loading = signal(true);
  showModal = signal(false);
  editingShift = signal<Shift | null>(null);
  deleteTarget = signal<Shift | null>(null);
  formError = signal<string | null>(null);
  toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);
  private toastTimeout?: ReturnType<typeof setTimeout>;
  /** Bumps when a new planned-vs-actual HTTP request starts; stale responses are ignored. */
  private plannedVsActualFetchGen = 0;

  formUserId: number | null = null;
  formDate = '';
  formStartTime = '09:00';
  formEndTime = '14:00';
  formLabel = '';
  /** Time step for dropdown: 30 min (default) or 60 min (1h). */
  formTimeStep: 30 | 60 = 30;
  /** When true, time options are full-day (e.g. for cleaning), not limited to opening hours. */
  formUseAnyHour = false;
  /** Create flow only: add two time blocks the same day as two schedule rows (split shift). */
  formSplitShift = false;
  formStartTime2 = '16:00';
  formEndTime2 = '20:00';

  weekRange = computed(() => getWeekRange(this.weekStart()));

  /** Time options for bulk apply (Monday opening hours as template, or full day). */
  timeOptsForBulk(): string[] {
    void this.openingHours();
    const step = this.bulkTimeStep;
    if (this.bulkUseAnyHour) return fullDayTimeOptions(step);
    const day = this.openingHours()['monday'];
    if (!day || day.closed || !day.open || !day.close) return defaultTimeOptions(step);
    const open = day.hasBreak && day.morningOpen ? day.morningOpen : day.open;
    const close = day.hasBreak && day.eveningClose ? day.eveningClose : day.close;
    const opts = timeOptionsBetween(open, close, step);
    return opts.length > 0 ? opts : defaultTimeOptions(step);
  }

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

  /** Second block start options: strictly after first block end (split shift). */
  timeOptsForBlock2Start(): string[] {
    return this.timeOptsForSelectedDay().filter((t) => t > this.formEndTime);
  }

  /** Second block end options: strictly after second block start. */
  timeOptsForBlock2End(): string[] {
    return this.timeOptsForSelectedDay().filter((t) => t > this.formStartTime2);
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

  plannedVsActualDisplayed = computed(() => {
    const base = this.plannedVsActualRows().filter((r) => r.planned_minutes > 0 || r.actual_minutes > 0);
    const uid = this.exportUserId();
    if (uid == null) return base;
    return base.filter((r) => r.user_id === uid);
  });

  pvaTotals = computed(() => {
    const rows = this.plannedVsActualDisplayed();
    let planned = 0;
    let actual = 0;
    for (const r of rows) {
      planned += r.planned_minutes;
      actual += r.actual_minutes;
    }
    return { planned_minutes: planned, actual_minutes: actual, variance_minutes: actual - planned };
  });

  showPvaSection = computed(() => {
    const anyActivity = this.plannedVsActualRows().some((r) => r.planned_minutes > 0 || r.actual_minutes > 0);
    return anyActivity || this.exportUserId() != null;
  });

  calendarMonthLabel = computed(() => {
    const d = this.calendarMonth();
    return `${this.monthShort(d.getMonth())} ${d.getFullYear()}`;
  });

  /** Month label for export hint (calendar month or month of week range start). */
  exportMonthLabel = computed(() => {
    const { year, month } = this.exportYearMonth();
    return `${this.monthShort(month - 1)} ${year}`;
  });

  /** Label for bulk modal (target month). */
  bulkMonthLabel = computed(() => {
    const y = this.bulkTargetYear();
    const m = this.bulkTargetMonth();
    if (!y || m < 1 || m > 12) return '';
    return `${this.monthShort(m - 1)} ${y}`;
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
    type Cell = {
      trackId: string;
      day?: number;
      dateStr?: string;
      hasIssue?: boolean;
      isClosed?: boolean;
      showOk?: boolean;
      shiftLines?: CalendarShiftLineRow[];
    };
    const cells: Cell[] = [];
    let idx = 0;
    for (let i = 0; i < startOffset; i++) cells.push({ trackId: `empty-${idx++}` });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${pad(monthIdx + 1)}-${pad(d)}`;
      const dayKey = DAY_KEYS[new Date(dateStr + 'T12:00:00').getDay()];
      const closed = this.isDayClosed(dayKey);
      const hasIssue = this.dayHasRequirementIssue(dateStr);
      const hasReq = this.dayHasPersonnelRequirements(dayKey);
      const showOk = !closed && hasReq && !hasIssue && this.dayMatchesRequirements(dateStr);
      const dayShifts = this.shifts()
        .filter((s) => s.date === dateStr)
        .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
      const lines: CalendarShiftLineRow[] = dayShifts.map((s) => ({
        text: this.formatShiftLine(s),
        userId: s.user_id,
        shift: s,
      }));
      const maxLines = 5;
      const shiftLines =
        lines.length > maxLines
          ? [
              ...lines.slice(0, maxLines),
              {
                text: this.translate.instant('WORKING_PLAN.CALENDAR_MORE_SHIFTS', {
                  count: lines.length - maxLines,
                }),
                userId: null,
                shift: null,
              },
            ]
          : lines;
      cells.push({
        trackId: dateStr,
        day: d,
        dateStr,
        hasIssue,
        isClosed: closed,
        showOk,
        shiftLines,
      });
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
    if (typeof localStorage !== 'undefined' && localStorage.getItem(WORKING_PLAN_PVA_OPEN_KEY) === '1') {
      this.pvaSectionOpen.set(true);
    }
    this.api.getUsersForSchedule().subscribe({
      next: (users) => {
        this.scheduleUsers.set(users);
        if (!users.length) {
          this.exportUserId.set(null);
          return;
        }
        const cur = this.exportUserId();
        if (cur != null && !users.some((u) => u.id === cur)) {
          this.exportUserId.set(null);
        }
      },
      error: () => {
        this.scheduleUsers.set([]);
        this.exportUserId.set(null);
      },
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
    if (this.formSplitShift && !this.editingShift()) {
      this.clampSplitBlockTimes();
    }
  }

  /** Keep block 2 times inside available options and after block 1. */
  private clampSplitBlockTimes(): void {
    const startOpts = this.timeOptsForBlock2Start();
    if (startOpts.length === 0) return;
    if (!startOpts.includes(this.formStartTime2)) this.formStartTime2 = startOpts[0];
    const endOpts = this.timeOptsForBlock2End();
    if (endOpts.length === 0) return;
    if (!endOpts.includes(this.formEndTime2)) this.formEndTime2 = endOpts[0];
    if (this.formStartTime2 >= this.formEndTime2) {
      const i = endOpts.indexOf(this.formStartTime2);
      this.formEndTime2 = endOpts[i + 1] ?? endOpts[endOpts.length - 1];
    }
  }

  onFormBlock1TimesChange(): void {
    this.clampFormTimes();
  }

  onFormBlock2TimesChange(): void {
    if (!this.formSplitShift) return;
    const endOpts = this.timeOptsForBlock2End();
    if (endOpts.length === 0) return;
    if (!endOpts.includes(this.formEndTime2)) this.formEndTime2 = endOpts[0];
    if (this.formStartTime2 >= this.formEndTime2) {
      const i = endOpts.indexOf(this.formStartTime2);
      this.formEndTime2 = endOpts[i + 1] ?? endOpts[endOpts.length - 1];
    }
  }

  onSplitShiftChange(enabled: boolean): void {
    if (enabled) {
      this.clampFormTimes();
      const startOpts = this.timeOptsForBlock2Start();
      if (startOpts.length) {
        this.formStartTime2 = startOpts[0];
        const endOpts = this.timeOptsForBlock2End();
        if (endOpts.length > 1) this.formEndTime2 = endOpts[1];
        else this.formEndTime2 = endOpts[0];
      }
    }
    this.clampFormTimes();
  }

  onBulkTimeOptionsChange(): void {
    const opts = this.timeOptsForBulk();
    if (opts.length === 0) return;
    if (!opts.includes(this.bulkStartTime)) this.bulkStartTime = opts[0];
    if (!opts.includes(this.bulkEndTime)) this.bulkEndTime = opts[opts.length - 1];
    if (this.bulkStartTime >= this.bulkEndTime) {
      this.bulkEndTime = opts[opts.indexOf(this.bulkStartTime) + 1] ?? opts[opts.length - 1];
    }
  }

  openBulkMonth(): void {
    const { year, month } = this.exportYearMonth();
    this.bulkTargetYear.set(year);
    this.bulkTargetMonth.set(month);
    this.bulkWeekdays.set(new Set([1, 2, 3, 4, 5]));
    const users = this.scheduleUsers();
    const exp = this.exportUserId();
    this.bulkUserId =
      exp != null && users.some((u) => u.id === exp) ? exp : (users[0]?.id ?? null);
    this.bulkTimeStep = 30;
    this.bulkUseAnyHour = false;
    this.bulkStartTime = '09:00';
    this.bulkEndTime = '17:00';
    this.bulkLabel = '';
    this.bulkSkipExisting = true;
    this.bulkFormError.set(null);
    this.showBulkModal.set(true);
    this.onBulkTimeOptionsChange();
  }

  closeBulkModal(): void {
    this.showBulkModal.set(false);
    this.bulkFormError.set(null);
  }

  toggleBulkWeekday(js: number): void {
    const s = new Set(this.bulkWeekdays());
    if (s.has(js)) s.delete(js);
    else s.add(js);
    this.bulkWeekdays.set(s);
  }

  saveBulkMonth(): void {
    this.bulkFormError.set(null);
    if (this.bulkUserId == null) {
      this.bulkFormError.set(this.translate.instant('WORKING_PLAN.BULK_ERR_USER'));
      return;
    }
    const wds = Array.from(this.bulkWeekdays()).sort((a, b) => a - b);
    if (wds.length === 0) {
      this.bulkFormError.set(this.translate.instant('WORKING_PLAN.BULK_ERR_WEEKDAYS'));
      return;
    }
    if (this.bulkStartTime >= this.bulkEndTime) {
      this.bulkFormError.set(this.translate.instant('WORKING_PLAN.BULK_ERR_TIMES'));
      return;
    }
    const y = this.bulkTargetYear();
    const m = this.bulkTargetMonth();
    if (!y || m < 1 || m > 12) {
      this.bulkFormError.set(this.translate.instant('WORKING_PLAN.BULK_ERR_MONTH'));
      return;
    }
    const payload: ShiftBulkCreate = {
      user_id: this.bulkUserId,
      year: y,
      month: m,
      weekdays: wds,
      start_time: this.bulkStartTime,
      end_time: this.bulkEndTime,
      label: this.bulkLabel?.trim() ? this.bulkLabel.trim() : null,
      skip_days_with_existing_shift: this.bulkSkipExisting,
    };
    this.bulkSaving.set(true);
    this.api.bulkCreateShifts(payload).subscribe({
      next: (res) => {
        this.bulkSaving.set(false);
        this.closeBulkModal();
        this.focusScheduleOnDate(`${y}-${String(m).padStart(2, '0')}-01`);
        this.load();
        const msg = this.translate.instant('WORKING_PLAN.BULK_DONE', {
          created: res.created_count,
          skipped: res.skipped_existing_count,
        });
        this.showToast(msg, 'success');
      },
      error: (err) => {
        this.bulkSaving.set(false);
        const msg = this.getApiErrorMessage(err);
        this.bulkFormError.set(msg);
        this.showToast(msg, 'error');
      },
    });
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

  /** At least one role has required headcount > 0 for this weekday (opening hours). */
  private dayHasPersonnelRequirements(dayKey: string): boolean {
    return STAFF_KEYS.some((sk) => this.getRequiredForRole(dayKey, sk) > 0);
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

  /** Date range used for “Add shift” suggestions: visible month in calendar view, else current week. */
  private getScheduleContextRange(): { from: string; to: string } {
    return this.viewMode() === 'calendar' ? getMonthRange(this.calendarMonth()) : this.weekRange();
  }

  /** Next date in the context range that is open and has a free slot for the current user's role; else first open day. */
  getSuggestedDateForNewShift(): string {
    const { from, to } = this.getScheduleContextRange();
    const user = this.api.getCurrentUser();
    const staffKey = user ? roleToStaffKey(user.role ?? '') : null;

    const datesInRange: string[] = [];
    const fromDate = new Date(from + 'T12:00:00');
    const toDate = new Date(to + 'T12:00:00');
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      datesInRange.push(`${y}-${m}-${day}`);
    }

    if (staffKey) {
      for (const date of datesInRange) {
        const dayKey = DAY_KEYS[new Date(date + 'T12:00:00').getDay()];
        if (this.isDayClosed(dayKey)) continue;
        const required = this.getRequiredForRole(dayKey, staffKey);
        const scheduled = this.getScheduledCountForRole(date, staffKey);
        if (required > 0 && scheduled < required) return date;
      }
    } else {
      for (const date of datesInRange) {
        const dayKey = DAY_KEYS[new Date(date + 'T12:00:00').getDay()];
        if (this.isDayClosed(dayKey)) continue;
        for (const sk of STAFF_KEYS) {
          const required = this.getRequiredForRole(dayKey, sk);
          const scheduled = this.getScheduledCountForRole(date, sk);
          if (required > 0 && scheduled < required) return date;
        }
      }
    }

    const firstOpenDate = datesInRange.find(
      (date) => !this.isDayClosed(DAY_KEYS[new Date(date + 'T12:00:00').getDay()]),
    );
    return firstOpenDate ?? from;
  }

  private monthShort(m: number): string {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[m] ?? '';
  }

  /** Calendar year/month (1–12) used for Excel export. */
  private exportYearMonth(): { year: number; month: number } {
    if (this.viewMode() === 'calendar') {
      const d = this.calendarMonth();
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    }
    const from = this.weekRange().from;
    const parts = from.split('-').map((x) => parseInt(x, 10));
    return { year: parts[0], month: parts[1] };
  }

  copyWeekToNextWeek(): void {
    const src = this.weekRange().from;
    const d = new Date(src + 'T12:00:00');
    d.setDate(d.getDate() + 7);
    const pad = (n: number) => String(n).padStart(2, '0');
    const tgt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    this.copyWeekSaving.set(true);
    this.api
      .copyScheduleWeek({
        source_week_start: src,
        target_week_start: tgt,
        skip_days_with_existing_shift: true,
      })
      .subscribe({
        next: (res) => {
          this.copyWeekSaving.set(false);
          this.nextWeek();
          this.showToast(
            this.translate.instant('WORKING_PLAN.COPY_WEEK_DONE', {
              created: res.created_count,
              skipped: res.skipped_existing_count,
            }),
            'success',
          );
        },
        error: (err) => {
          this.copyWeekSaving.set(false);
          this.showToast(this.getApiErrorMessage(err), 'error');
        },
      });
  }

  formatMinutes(m: number): string {
    if (m === 0) return '0';
    const h = Math.floor(m / 60);
    const min = m % 60;
    return min > 0 ? `${h}h ${min}m` : `${h}h`;
  }

  formatSignedMinutes(m: number): string {
    if (m === 0) return '0';
    const sign = m > 0 ? '+' : '−';
    return `${sign}${this.formatMinutes(Math.abs(m))}`;
  }

  complianceWarningText(w: ScheduleComplianceWarning): string {
    if (w.code === 'weekly_planned_over_limit') {
      return this.translate.instant('WORKING_PLAN.COMPLIANCE_WEEKLY', {
        name: w.user_name || '',
        week: w.week_start || '',
        minutes: w.planned_minutes ?? 0,
        limit: w.limit_minutes ?? 0,
      });
    }
    if (w.code === 'rest_between_shifts') {
      return this.translate.instant('WORKING_PLAN.COMPLIANCE_REST', {
        name: w.user_name || '',
        gap: w.gap_minutes ?? 0,
        required: w.required_min_rest_minutes ?? 0,
      });
    }
    if (w.code === 'yearly_planned_hours_threshold') {
      return this.translate.instant('WORKING_PLAN.COMPLIANCE_YEARLY', {
        name: w.user_name || '',
        year: String(w.year ?? ''),
        minutes: w.planned_minutes ?? 0,
        warn: w.warn_at_minutes ?? 0,
      });
    }
    return JSON.stringify(w);
  }

  togglePvaSection(): void {
    this.pvaSectionOpen.update((v) => !v);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(WORKING_PLAN_PVA_OPEN_KEY, this.pvaSectionOpen() ? '1' : '0');
    }
  }

  exportPvaExcel(): void {
    const range = this.viewMode() === 'calendar' ? getMonthRange(this.calendarMonth()) : this.weekRange();
    this.exportPvaLoading.set(true);
    this.api
      .getSchedulePlannedVsActualExport(range.from, range.to, this.languageService.getLanguage(), this.exportUserId())
      .subscribe({
        next: (blob) => {
          this.exportPvaLoading.set(false);
          if (!blob || blob.size === 0) {
            this.showToast(this.translate.instant('WORKING_PLAN.EXPORT_PVA_FAILED'), 'error');
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `planned-vs-clocked-${range.from}-to-${range.to}.xlsx`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => {
          this.exportPvaLoading.set(false);
          this.showToast(this.translate.instant('WORKING_PLAN.EXPORT_PVA_FAILED'), 'error');
        },
      });
  }

  exportExcel(): void {
    const uid = this.exportUserId();
    if (uid == null) return;
    const { year, month } = this.exportYearMonth();
    this.exportLoading.set(true);
    this.api.getScheduleExport(uid, year, month, this.languageService.getLanguage()).subscribe({
      next: (blob) => {
        this.exportLoading.set(false);
        if (!blob || blob.size === 0) {
          this.showToast(this.translate.instant('WORKING_PLAN.EXPORT_FAILED'), 'error');
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `working-plan-${uid}-${year}-${String(month).padStart(2, '0')}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.exportLoading.set(false);
        this.showToast(this.translate.instant('WORKING_PLAN.EXPORT_FAILED'), 'error');
      },
    });
  }

  private planDateRange(): { from: string; to: string } {
    return this.viewMode() === 'calendar' ? getMonthRange(this.calendarMonth()) : this.weekRange();
  }

  /** Loads planned-vs-clocked via HTTP for the current view range and staff dropdown (no polling). */
  private fetchPlannedVsActual(): void {
    const range = this.planDateRange();
    const gen = ++this.plannedVsActualFetchGen;
    const uid = this.exportUserId();
    this.api.getSchedulePlannedVsActual(range.from, range.to, uid).subscribe({
      next: (res) => {
        if (gen !== this.plannedVsActualFetchGen) return;
        this.plannedVsActualRows.set(res.rows);
      },
      error: () => {
        if (gen !== this.plannedVsActualFetchGen) return;
        this.plannedVsActualRows.set([]);
      },
    });
  }

  onExportUserIdSelected(value: number | null): void {
    this.exportUserId.set(value);
    this.fetchPlannedVsActual();
  }

  load(): void {
    this.loading.set(true);
    const range = this.planDateRange();
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
        this.fetchPlannedVsActual();
        this.api.getScheduleComplianceSummary(range.from, range.to).subscribe({
          next: (res) => this.complianceWarnings.set(res.warnings),
          error: () => this.complianceWarnings.set([]),
        });
      },
      error: () => {
        this.plannedVsActualFetchGen++;
        this.shifts.set([]);
        this.plannedVsActualRows.set([]);
        this.complianceWarnings.set([]);
        this.loading.set(false);
      },
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

  /** Hue 0–360 for calendar chip CSS variable --wp-shift-h. */
  shiftHue(userId: number): number {
    return hueFromUserId(userId);
  }

  /** Same permission gate as week view actions (schedule write). */
  canWriteSchedule(): boolean {
    return this.permissions.hasPermission(this.api.getCurrentUser(), 'schedule:write');
  }

  calendarShiftLineTrack(line: CalendarShiftLineRow, idx: number): string {
    if (line.shift) return `s-${line.shift.id}`;
    return `o-${idx}`;
  }

  calendarShiftEditAria(s: Shift): string {
    return this.translate.instant('WORKING_PLAN.CALENDAR_SHIFT_EDIT_ARIA', {
      detail: this.formatShiftLine(s),
    });
  }

  calendarShiftDeleteAria(s: Shift): string {
    return this.translate.instant('WORKING_PLAN.CALENDAR_SHIFT_DELETE_ARIA', {
      detail: this.formatShiftLine(s),
    });
  }

  onCalendarShiftDeleteClick(ev: Event, s: Shift): void {
    ev.stopPropagation();
    this.confirmDelete(s);
  }

  /** One line per shift for the calendar cell (name, role, time). */
  private formatShiftLine(s: Shift): string {
    const name = (s.user_name || '').trim();
    const role = this.getRoleLabel(s.user_role || '');
    const time = `${s.start_time}–${s.end_time}`;
    if (name && role) return `${name} (${role}) ${time}`;
    if (name) return `${name} ${time}`;
    return time;
  }

  /** After save, show the shift in calendar/week: jump to the saved date’s month and week. */
  private focusScheduleOnDate(isoDate: string): void {
    const d = new Date(isoDate + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return;
    this.weekStart.set(new Date(d));
    if (this.viewMode() === 'calendar') {
      const cm = this.calendarMonth();
      if (d.getFullYear() !== cm.getFullYear() || d.getMonth() !== cm.getMonth()) {
        this.calendarMonth.set(new Date(d.getFullYear(), d.getMonth(), 1));
      }
    }
  }

  openCreate(): void {
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
    this.formSplitShift = false;
    this.formStartTime2 = '16:00';
    this.formEndTime2 = '20:00';
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
    this.formSplitShift = false;
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
    this.toastTimeout = undefined;
    this.toast.set({ message, type });
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
      this.formError.set(this.translate.instant('WORKING_PLAN.BULK_ERR_TIMES'));
      return;
    }
    const split = this.formSplitShift && !this.editingShift();
    if (split) {
      if (this.timeOptsForBlock2Start().length === 0) {
        this.formError.set(this.translate.instant('WORKING_PLAN.SPLIT_ERR_NO_ROOM'));
        return;
      }
      const s2 = this.formStartTime2;
      const e2 = this.formEndTime2;
      if (s2 <= end) {
        this.formError.set(this.translate.instant('WORKING_PLAN.SPLIT_ERR_ORDER'));
        return;
      }
      if (s2 >= e2) {
        this.formError.set(this.translate.instant('WORKING_PLAN.SPLIT_ERR_BLOCK2_TIMES'));
        return;
      }
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
          this.focusScheduleOnDate(this.formDate);
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
    } else if (split) {
      const label = this.formLabel || null;
      const payload1: ShiftCreate = {
        user_id: this.formUserId,
        date: this.formDate,
        start_time: start,
        end_time: end,
        label,
      };
      const payload2: ShiftCreate = {
        user_id: this.formUserId,
        date: this.formDate,
        start_time: this.formStartTime2,
        end_time: this.formEndTime2,
        label,
      };
      this.api.createShift(payload1).subscribe({
        next: (createdFirst) => {
          this.api.createShift(payload2).subscribe({
            next: () => {
              this.focusScheduleOnDate(this.formDate);
              this.closeModal();
              this.load();
              this.showToast(this.translate.instant('WORKING_PLAN.SAVED'), 'success');
            },
            error: (err) => {
              const msg = this.getApiErrorMessage(err);
              this.api.deleteShift(createdFirst.id).subscribe({
                next: () => {
                  this.formError.set(msg);
                  this.showToast(msg, 'error');
                },
                error: () => {
                  const rb = this.translate.instant('WORKING_PLAN.SPLIT_ROLLBACK_FAILED');
                  this.formError.set(rb);
                  this.showToast(rb, 'error');
                },
              });
            },
          });
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
          this.focusScheduleOnDate(this.formDate);
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
