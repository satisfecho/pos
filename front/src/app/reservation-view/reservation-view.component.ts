import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService, Reservation } from '../services/api.service';
import { TranslateModule } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';
import { ConfirmationModalComponent } from '../shared/confirmation-modal.component';

@Component({
  selector: 'app-reservation-view',
  standalone: true,
  imports: [TranslateModule, RouterLink, ConfirmationModalComponent],
  template: `
    <div class="view-page">
      <div class="view-card">
        @if (loading()) {
          <p>{{ 'RESERVATIONS.LOADING' | translate }}</p>
        } @else if (error()) {
          <h1>{{ 'BOOK.VIEW_TITLE' | translate }}</h1>
          <p class="error">{{ error() }}</p>
          <a routerLink="/" class="btn btn-ghost">{{ 'COMMON.BACK' | translate }}</a>
        } @else if (reservation()) {
          <h1>{{ 'BOOK.VIEW_TITLE' | translate }}</h1>
          @if (reservation()?.status === 'cancelled') {
            <p class="status-cancelled">{{ 'RESERVATIONS.STATUS_CANCELLED' | translate }}</p>
          } @else {
            <div class="reservation-details">
              <p><strong>{{ 'RESERVATIONS.DATE' | translate }}:</strong> {{ reservation()?.reservation_date }} {{ reservation()?.reservation_time }}</p>
              <p><strong>{{ 'RESERVATIONS.PARTY_SIZE' | translate }}:</strong> {{ reservation()?.party_size }}</p>
              <p><strong>{{ 'RESERVATIONS.CUSTOMER_NAME' | translate }}:</strong> {{ reservation()?.customer_name }}</p>
              <p><strong>{{ 'RESERVATIONS.CUSTOMER_PHONE' | translate }}:</strong> {{ reservation()?.customer_phone }}</p>
              <p><strong>{{ 'RESERVATIONS.STATUS' | translate }}:</strong> {{ getStatusKey() | translate }}</p>
            </div>
            @if (reservation()?.status === 'booked' || reservation()?.status === 'seated') {
              <button class="btn btn-danger" (click)="showCancelConfirm.set(true)">{{ 'RESERVATIONS.CANCEL' | translate }}</button>
            }
          }
        }
      </div>
      @if (showCancelConfirm() && reservation()) {
        <app-confirmation-modal
          title="RESERVATIONS.CANCEL_CONFIRM_TITLE"
          message="RESERVATIONS.CANCEL_CONFIRM_MESSAGE"
          [confirmText]="'RESERVATIONS.CANCEL'"
          cancelText="COMMON.CANCEL"
          confirmBtnClass="btn-danger"
          (confirm)="doCancel()"
          (cancel)="showCancelConfirm.set(false)"
        />
      }
    </div>
  `,
  styles: [`
    .view-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; background: #f9fafb; }
    .view-card { background: #fff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.07); padding: 2rem; max-width: 420px; width: 100%; }
    .view-card h1 { margin: 0 0 1rem; font-size: 1.5rem; }
    .reservation-details { margin: 1rem 0; padding: 1rem; background: #f3f4f6; border-radius: 8px; }
    .error { color: #dc2626; }
    .status-cancelled { color: #b91c1c; font-weight: 500; }
    .btn { display: inline-block; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 500; cursor: pointer; border: none; text-decoration: none; margin-top: 0.5rem; }
    .btn-ghost { background: transparent; color: #4b5563; }
    .btn-danger { background: #dc2626; color: #fff; }
  `],
})
export class ReservationViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);

  loading = signal(true);
  error = signal<string | null>(null);
  reservation = signal<Reservation | null>(null);
  showCancelConfirm = signal(false);

  getStatusKey(): string {
    const s = this.reservation()?.status;
    return s ? 'RESERVATIONS.STATUS_' + s.toUpperCase() : '';
  }

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.error.set('Missing reservation token. Use the link from your confirmation.');
      this.loading.set(false);
      return;
    }
    this.api.getReservationByToken(token).subscribe({
      next: (r) => { this.reservation.set(r); this.loading.set(false); },
      error: () => { this.error.set('Reservation not found or link expired.'); this.loading.set(false); },
    });
  }

  doCancel() {
    const r = this.reservation();
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!r || !token) return;
    this.api.cancelReservationPublic(r.id, token).subscribe({
      next: (updated) => { this.reservation.set(updated); this.showCancelConfirm.set(false); },
      error: () => this.showCancelConfirm.set(false),
    });
  }
}
