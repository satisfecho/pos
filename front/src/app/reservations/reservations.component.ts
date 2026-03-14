import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Reservation, ReservationCreate, ReservationUpdate, ReservationStatus, CanvasTable } from '../services/api.service';
import { PermissionService } from '../services/permission.service';
import { SidebarComponent } from '../shared/sidebar.component';
import { ConfirmationModalComponent } from '../shared/confirmation-modal.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [FormsModule, SidebarComponent, TranslateModule, ConfirmationModalComponent, LowerCasePipe],
  template: `
    <app-sidebar>
      <div class="page-header">
        <h1>{{ 'RESERVATIONS.TITLE' | translate }}</h1>
        @if (canWrite()) {
          <button class="btn btn-primary" (click)="openCreate()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {{ 'RESERVATIONS.NEW' | translate }}
          </button>
        }
      </div>

      <div class="filters">
        <input type="date" [(ngModel)]="filterDate" (ngModelChange)="load()" class="filter-input" />
        <input type="text" [(ngModel)]="filterPhone" (ngModelChange)="load()" placeholder="{{ 'RESERVATIONS.SEARCH_PHONE' | translate }}" class="filter-input" />
        <select [(ngModel)]="filterStatus" (ngModelChange)="load()" class="filter-select">
          <option value="">{{ 'RESERVATIONS.ALL_STATUSES' | translate }}</option>
          <option value="booked">{{ 'RESERVATIONS.STATUS_BOOKED' | translate }}</option>
          <option value="seated">{{ 'RESERVATIONS.STATUS_SEATED' | translate }}</option>
          <option value="finished">{{ 'RESERVATIONS.STATUS_FINISHED' | translate }}</option>
          <option value="cancelled">{{ 'RESERVATIONS.STATUS_CANCELLED' | translate }}</option>
        </select>
        <button class="btn btn-ghost btn-sm" (click)="load()">{{ 'ORDERS.REFRESH' | translate }}</button>
      </div>

      @if (loading()) {
        <div class="empty-state"><p>{{ 'RESERVATIONS.LOADING' | translate }}</p></div>
      } @else if (reservations().length === 0) {
        <div class="empty-state">
          <p>{{ 'RESERVATIONS.NONE' | translate }}</p>
          @if (canWrite()) {
            <button class="btn btn-primary" (click)="openCreate()">{{ 'RESERVATIONS.NEW' | translate }}</button>
          }
        </div>
      } @else {
        <div class="reservation-grid">
          @for (r of reservations(); track r.id) {
            <div class="reservation-card" [class]="'status-' + r.status">
              <div class="card-header">
                <span class="res-id">#{{ r.id }}</span>
                <span class="res-name">{{ r.customer_name }}</span>
                <span class="status-badge" [class]="r.status">{{ getStatusLabel(r.status) | translate }}</span>
              </div>
              <div class="card-body">
                <div>{{ r.reservation_date }} {{ r.reservation_time }}</div>
                <div>{{ 'RESERVATIONS.PARTY_SIZE' | translate }}: {{ r.party_size }}</div>
                <div>{{ r.customer_phone }}</div>
                <div class="table-assigned">{{ 'RESERVATIONS.TABLE' | translate }}: {{ getTableDisplay(r) }}</div>
              </div>
              <div class="card-actions">
                @if (r.status === 'booked' && canWrite()) {
                  <button class="btn btn-ghost btn-sm" (click)="openEdit(r)">{{ 'RESERVATIONS.EDIT' | translate }}</button>
                  <button class="btn btn-ghost btn-sm" (click)="openSeat(r)">{{ 'RESERVATIONS.SEAT' | translate }}</button>
                  <button class="btn btn-ghost btn-sm danger" (click)="confirmCancel(r)">{{ 'RESERVATIONS.CANCEL' | translate }}</button>
                }
                @if (r.status === 'seated' && canWrite()) {
                  <button class="btn btn-ghost btn-sm" (click)="finish(r)">{{ 'RESERVATIONS.FINISH' | translate }}</button>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Create/Edit modal -->
      @if (showForm()) {
        <div class="modal-overlay" (click)="closeForm()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingReservation() ? ('RESERVATIONS.EDIT' | translate) : ('RESERVATIONS.NEW' | translate) }}</h3>
              <button class="close-btn" (click)="closeForm()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>{{ 'RESERVATIONS.CUSTOMER_NAME' | translate }}</label>
                <input type="text" [(ngModel)]="formName" />
              </div>
              <div class="form-group">
                <label>{{ 'RESERVATIONS.CUSTOMER_PHONE' | translate }}</label>
                <input type="text" [(ngModel)]="formPhone" />
              </div>
              <div class="form-group">
                <label>{{ 'RESERVATIONS.DATE' | translate }}</label>
                <input type="date" [(ngModel)]="formDate" (ngModelChange)="onFormDateChange($event)" />
              </div>
              <div class="form-group">
                <label>{{ 'RESERVATIONS.TIME' | translate }}</label>
                <input type="time" [(ngModel)]="formTime" />
                @if (suggestedTime()) {
                  <small class="suggested-time" (click)="formTime = suggestedTime()!">{{ 'RESERVATIONS.SUGGESTED_TIME' | translate }}: {{ suggestedTime() }}</small>
                }
              </div>
              <div class="form-group">
                <label>{{ 'RESERVATIONS.PARTY_SIZE' | translate }}</label>
                <input type="number" min="1" max="20" [(ngModel)]="formPartySize" />
              </div>
              @if (formError()) {
                <div class="form-error">{{ formError() }}</div>
              }
            </div>
            <div class="modal-footer">
              <button class="btn btn-ghost" (click)="closeForm()">{{ 'COMMON.CANCEL' | translate }}</button>
              <button class="btn btn-primary" (click)="saveReservation()">{{ 'COMMON.SAVE' | translate }}</button>
            </div>
          </div>
        </div>
      }

      <!-- Seat modal -->
      @if (reservationToSeat()) {
        <div class="modal-overlay" (click)="closeSeatModal()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ 'RESERVATIONS.SEAT_AT_TABLE' | translate }}</h3>
              <button class="close-btn" (click)="closeSeatModal()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <p>{{ 'RESERVATIONS.PARTY_SIZE' | translate }}: {{ reservationToSeat()?.party_size }}</p>
              <div class="table-list">
                @for (t of availableTablesForSeat(); track t.id) {
                  <button class="table-option" (click)="seatAt(t.id!)">
                    {{ t.name }} ({{ t.seat_count }} {{ 'TABLES.SEATS' | translate | lowercase }})
                  </button>
                }
              </div>
              @if (availableTablesForSeat().length === 0) {
                <p class="no-tables">{{ 'RESERVATIONS.NO_AVAILABLE_TABLES' | translate }}</p>
              }
            </div>
          </div>
        </div>
      }

      <!-- Cancel confirm -->
      @if (reservationToCancel()) {
        <app-confirmation-modal
          title="RESERVATIONS.CANCEL_CONFIRM_TITLE"
          message="RESERVATIONS.CANCEL_CONFIRM_MESSAGE"
          [confirmText]="'RESERVATIONS.CANCEL'"
          cancelText="COMMON.CANCEL"
          confirmBtnClass="btn-danger"
          (confirm)="doCancel()"
          (cancel)="reservationToCancel.set(null)"
        />
      }
    </app-sidebar>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .filters { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; }
    .filter-input, .filter-select { padding: 0.35rem 0.5rem; border: 1px solid #ccc; border-radius: 4px; }
    .reservation-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .reservation-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; background: #fff; }
    .reservation-card.status-booked { border-left: 4px solid #3b82f6; }
    .reservation-card.status-seated { border-left: 4px solid #16a34a; }
    .reservation-card.status-finished { border-left: 4px solid #6b7280; }
    .reservation-card.status-cancelled { border-left: 4px solid #dc2626; opacity: 0.85; }
    .card-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; flex-wrap: wrap; }
    .res-id { font-weight: 600; color: #6b7280; }
    .res-name { font-weight: 600; }
    .status-badge { font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 4px; }
    .status-badge.booked { background: #dbeafe; color: #1d4ed8; }
    .status-badge.seated { background: #dcfce7; color: #15803d; }
    .status-badge.finished { background: #f3f4f6; color: #4b5563; }
    .status-badge.cancelled { background: #fee2e2; color: #b91c1c; }
    .card-body { font-size: 0.9rem; color: #4b5563; margin-bottom: 0.75rem; }
    .table-assigned { font-weight: 500; }
    .card-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: #fff; border-radius: 8px; max-width: 420px; width: 90%; max-height: 90vh; overflow: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid #e5e7eb; }
    .modal-body { padding: 1rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.5rem; padding: 1rem; border-top: 1px solid #e5e7eb; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; margin-bottom: 0.25rem; font-weight: 500; }
    .form-group input { width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; }
    .form-error { color: #dc2626; font-size: 0.875rem; margin-top: 0.5rem; }
    .suggested-time { display: block; margin-top: 4px; font-size: 0.8rem; color: var(--color-primary, #c0785c); cursor: pointer; text-decoration: underline; }
    .table-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .table-option { padding: 0.5rem 1rem; text-align: left; border: 1px solid #e5e7eb; border-radius: 4px; background: #fff; cursor: pointer; }
    .table-option:hover { background: #f3f4f6; }
    .no-tables { color: #6b7280; }
    .empty-state { text-align: center; padding: 2rem; color: #6b7280; }
    .btn.danger { color: #dc2626; }
  `],
})
export class ReservationsComponent implements OnInit {
  private api = inject(ApiService);
  private permissions = inject(PermissionService);
  private translate = inject(TranslateService);

  loading = signal(false);
  reservations = signal<Reservation[]>([]);
  tablesWithStatus = signal<CanvasTable[]>([]);
  filterDate = '';
  filterPhone = '';
  filterStatus = '';
  showForm = signal(false);
  editingReservation = signal<Reservation | null>(null);
  formName = '';
  formPhone = '';
  formDate = '';
  formTime = '';
  formPartySize = 1;
  formError = signal<string | null>(null);
  suggestedTime = signal<string | null>(null);
  reservationToSeat = signal<Reservation | null>(null);
  reservationToCancel = signal<Reservation | null>(null);

  canWrite = () => this.permissions.hasPermission(this.permissions.getCurrentUser(), 'reservation:write');

  ngOnInit() {
    const today = new Date().toISOString().slice(0, 10);
    this.filterDate = today;
    this.load();
    this.loadTables();
  }

  load() {
    this.loading.set(true);
    this.api.getReservations({
      date: this.filterDate || undefined,
      status: this.filterStatus || undefined,
      phone: this.filterPhone || undefined,
    }).subscribe({
      next: (list) => { this.reservations.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  loadTables() {
    this.api.getTablesWithStatus().subscribe((list) => this.tablesWithStatus.set(list));
  }

  getStatusLabel(s: ReservationStatus): string {
    const key = { booked: 'RESERVATIONS.STATUS_BOOKED', seated: 'RESERVATIONS.STATUS_SEATED', finished: 'RESERVATIONS.STATUS_FINISHED', cancelled: 'RESERVATIONS.STATUS_CANCELLED' }[s];
    return key ?? s;
  }

  getTableName(tableId: number): string {
    return this.tablesWithStatus().find(t => t.id === tableId)?.name ?? String(tableId);
  }

  /** Table to show in list: API table_name, or lookup by id, or "not assigned". */
  getTableDisplay(r: Reservation): string {
    if (r.table_name) return r.table_name;
    if (r.table_id != null) return this.getTableName(r.table_id);
    return this.translate.instant('RESERVATIONS.TABLE_NOT_ASSIGNED');
  }

  openCreate() {
    this.editingReservation.set(null);
    const today = new Date().toISOString().slice(0, 10);
    this.formName = '';
    this.formPhone = '';
    this.formDate = today;
    this.formTime = '19:00';
    this.formPartySize = 2;
    this.formError.set(null);
    this.suggestedTime.set(null);
    this.showForm.set(true);
    this.onFormDateChange(today);
  }

  onFormDateChange(dateStr: string) {
    const tenantId = this.permissions.getCurrentUser()?.tenant_id;
    if (!tenantId || !dateStr) return;
    this.api.getNextAvailableReservation(tenantId, dateStr).subscribe({
      next: (res) => {
        this.suggestedTime.set(res.time);
        if (!this.editingReservation()) {
          this.formTime = res.time;
        }
      },
      error: () => this.suggestedTime.set(null),
    });
  }

  openEdit(r: Reservation) {
    this.editingReservation.set(r);
    this.formName = r.customer_name;
    this.formPhone = r.customer_phone;
    this.formDate = r.reservation_date.slice(0, 10);
    this.formTime = r.reservation_time.length >= 5 ? r.reservation_time.slice(0, 5) : r.reservation_time;
    this.formPartySize = r.party_size;
    this.formError.set(null);
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingReservation.set(null);
  }

  saveReservation() {
    this.formError.set(null);
    const user = this.api.getCurrentUser();
    const tenantId = user?.tenant_id;
    if (!tenantId && !this.editingReservation()) {
      this.formError.set(this.translate.instant('RESERVATIONS.ERROR_MISSING_TENANT'));
      return;
    }
    const payload: ReservationCreate = {
      customer_name: this.formName.trim(),
      customer_phone: this.formPhone.trim(),
      reservation_date: this.formDate,
      reservation_time: this.formTime,
      party_size: this.formPartySize,
    };
    if (!this.editingReservation() && tenantId) (payload as ReservationCreate).tenant_id = tenantId;
    if (this.editingReservation()) {
      const update: ReservationUpdate = {
        customer_name: payload.customer_name,
        customer_phone: payload.customer_phone,
        reservation_date: payload.reservation_date,
        reservation_time: payload.reservation_time,
        party_size: payload.party_size,
      };
      this.api.updateReservation(this.editingReservation()!.id, update).subscribe({
        next: () => { this.closeForm(); this.load(); },
        error: (e) => this.formError.set(e.error?.detail || this.translate.instant('RESERVATIONS.ERROR_FAILED_UPDATE')),
      });
    } else {
      this.api.createReservation(payload).subscribe({
        next: () => { this.closeForm(); this.load(); },
        error: (e) => this.formError.set(e.error?.detail || this.translate.instant('RESERVATIONS.ERROR_FAILED_CREATE')),
      });
    }
  }

  openSeat(r: Reservation) {
    this.reservationToSeat.set(r);
    this.loadTables();
  }

  closeSeatModal() {
    this.reservationToSeat.set(null);
  }

  availableTablesForSeat = computed(() => {
    const r = this.reservationToSeat();
    const tables = this.tablesWithStatus();
    if (!r) return [];
    return tables.filter(t => (t.status === 'available' || t.status === 'reserved') && (t.seat_count ?? 0) >= r.party_size);
  });

  seatAt(tableId: number) {
    const r = this.reservationToSeat();
    if (!r) return;
    this.api.seatReservation(r.id, tableId).subscribe({
      next: () => { this.closeSeatModal(); this.load(); this.loadTables(); },
      error: (e) => alert(e.error?.detail || this.translate.instant('RESERVATIONS.ERROR_FAILED_SEAT')),
    });
  }

  confirmCancel(r: Reservation) {
    this.reservationToCancel.set(r);
  }

  doCancel() {
    const r = this.reservationToCancel();
    if (!r) return;
    this.api.updateReservationStatus(r.id, 'cancelled').subscribe({
      next: () => { this.reservationToCancel.set(null); this.load(); this.loadTables(); },
      error: () => this.reservationToCancel.set(null),
    });
  }

  finish(r: Reservation) {
    this.api.finishReservation(r.id).subscribe({
      next: () => { this.load(); this.loadTables(); },
      error: (e) => alert(e.error?.detail || this.translate.instant('RESERVATIONS.ERROR_FAILED')),
    });
  }
}
