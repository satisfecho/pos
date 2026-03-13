import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, Reservation, ReservationCreate } from '../services/api.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-book',
  standalone: true,
  imports: [FormsModule, TranslateModule, RouterLink],
  template: `
    <div class="book-page">
      <div class="book-card">
        @if (!successReservation()) {
          <h1>{{ 'BOOK.TITLE' | translate }}</h1>
          <form (ngSubmit)="submit()" class="book-form">
            <div class="form-group">
              <label>{{ 'RESERVATIONS.DATE' | translate }}</label>
              <input type="date" [(ngModel)]="formDate" name="date" required [min]="minDate()" />
            </div>
            <div class="form-group">
              <label>{{ 'RESERVATIONS.TIME' | translate }}</label>
              <input type="time" [(ngModel)]="formTime" name="time" required />
            </div>
            <div class="form-group">
              <label>{{ 'RESERVATIONS.PARTY_SIZE' | translate }}</label>
              <input type="number" min="1" max="20" [(ngModel)]="formPartySize" name="partySize" required />
            </div>
            <div class="form-group">
              <label>{{ 'RESERVATIONS.CUSTOMER_NAME' | translate }}</label>
              <input type="text" [(ngModel)]="formName" name="name" required />
            </div>
            <div class="form-group">
              <label>{{ 'RESERVATIONS.CUSTOMER_PHONE' | translate }}</label>
              <input type="tel" [(ngModel)]="formPhone" name="phone" required />
            </div>
            @if (error()) {
              <div class="form-error">{{ error() }}</div>
            }
            <button type="submit" class="btn btn-primary" [disabled]="submitting()">
              {{ submitting() ? ('BOOK.SUBMITTING' | translate) : ('BOOK.SUBMIT' | translate) }}
            </button>
          </form>
        } @else {
          <h1>{{ 'BOOK.SUCCESS_TITLE' | translate }}</h1>
          <p class="success-message">{{ 'BOOK.SUCCESS_MESSAGE' | translate }}</p>
          <div class="reservation-details">
            <p><strong>{{ 'RESERVATIONS.DATE' | translate }}:</strong> {{ successReservation()?.reservation_date }} {{ successReservation()?.reservation_time }}</p>
            <p><strong>{{ 'RESERVATIONS.PARTY_SIZE' | translate }}:</strong> {{ successReservation()?.party_size }}</p>
            <p><strong>{{ 'RESERVATIONS.CUSTOMER_NAME' | translate }}:</strong> {{ successReservation()?.customer_name }}</p>
          </div>
          <p class="view-cancel-hint">{{ 'BOOK.VIEW_CANCEL_HINT' | translate }}</p>
          <a [routerLink]="['/reservation']" [queryParams]="{ token: successReservation()?.token }" class="btn btn-secondary">
            {{ 'BOOK.VIEW_OR_CANCEL' | translate }}
          </a>
        }
      </div>
    </div>
  `,
  styles: [`
    .book-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; background: #f9fafb; }
    .book-card { background: #fff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.07); padding: 2rem; max-width: 420px; width: 100%; }
    .book-card h1 { margin: 0 0 1.5rem; font-size: 1.5rem; }
    .book-form .form-group { margin-bottom: 1rem; }
    .book-form label { display: block; margin-bottom: 0.25rem; font-weight: 500; }
    .book-form input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; }
    .form-error { color: #dc2626; font-size: 0.875rem; margin-bottom: 1rem; }
    .btn { display: inline-block; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 500; cursor: pointer; border: none; text-decoration: none; text-align: center; }
    .btn-primary { background: #2563eb; color: #fff; width: 100%; margin-top: 0.5rem; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-secondary { background: #e5e7eb; color: #111; margin-top: 1rem; }
    .success-message { color: #15803d; margin-bottom: 1rem; }
    .reservation-details { margin: 1rem 0; padding: 1rem; background: #f3f4f6; border-radius: 8px; }
    .view-cancel-hint { font-size: 0.875rem; color: #6b7280; margin-top: 1rem; }
  `],
})
export class BookComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);

  minDate = () => new Date().toISOString().slice(0, 10);
  tenantId = signal<number>(0);
  formDate = '';
  formTime = '19:00';
  formPartySize = 2;
  formName = '';
  formPhone = '';
  submitting = signal(false);
  error = signal<string | null>(null);
  successReservation = signal<Reservation | null>(null);

  today = computed(() => new Date().toISOString().slice(0, 10));

  constructor() {
    const id = this.route.snapshot.paramMap.get('tenantId');
    const n = id ? parseInt(id, 10) : 0;
    if (n) this.tenantId.set(n);
    const today = new Date().toISOString().slice(0, 10);
    this.formDate = today;
  }

  submit() {
    this.error.set(null);
    const tid = this.tenantId();
    if (!tid) {
      this.error.set('Invalid booking link. Please use the link provided by the restaurant.');
      return;
    }
    this.submitting.set(true);
    const body: ReservationCreate = {
      tenant_id: tid,
      customer_name: this.formName.trim(),
      customer_phone: this.formPhone.trim(),
      reservation_date: this.formDate,
      reservation_time: this.formTime,
      party_size: this.formPartySize,
    };
    this.api.createReservationPublic(body).subscribe({
      next: (res) => {
        this.successReservation.set(res);
        this.submitting.set(false);
      },
      error: (e) => {
        this.error.set(e.error?.detail || 'Booking failed. Please try again.');
        this.submitting.set(false);
      },
    });
  }
}
