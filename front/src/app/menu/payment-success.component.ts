import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../services/api.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  template: `
    <div class="payment-success-page">
      @if (loading()) {
        <p>{{ 'PAYMENTS.PROCESSING' | translate }}</p>
      } @else if (error()) {
        <p class="error">{{ errorMessage() }}</p>
        <a [routerLink]="['/menu', tableToken()]">{{ 'COMMON.BACK' | translate }}</a>
      } @else {
        <h1>{{ 'PAYMENTS.SUCCESS_TITLE' | translate }}</h1>
        <p>{{ 'PAYMENTS.SUCCESS_MESSAGE' | translate }}</p>
        <a [routerLink]="['/menu', tableToken()]" class="btn btn-primary">{{ 'MENU.BACK_TO_MENU' | translate }}</a>
      }
    </div>
  `,
  styles: [
    `
      .payment-success-page {
        min-height: 60vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        text-align: center;
      }
      .payment-success-page h1 { margin-bottom: 0.5rem; }
      .payment-success-page p { margin-bottom: 1rem; }
      .payment-success-page .error { color: var(--color-error, #c00); }
      .payment-success-page a { margin-top: 0.5rem; }
    `,
  ],
})
export class PaymentSuccessComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);

  loading = signal(true);
  error = signal(false);
  errorMessage = signal('');
  tableToken = signal('');

  ngOnInit() {
    const token = this.route.snapshot.paramMap.get('token');
    const orderId = this.route.snapshot.queryParamMap.get('order_id');
    if (!token || !orderId) {
      this.error.set(true);
      this.errorMessage.set('Missing table or order.');
      this.loading.set(false);
      return;
    }
    this.tableToken.set(token);
    const orderIdNum = parseInt(orderId!, 10);
    if (Number.isNaN(orderIdNum)) {
      this.error.set(true);
      this.errorMessage.set('Invalid order.');
      this.loading.set(false);
      return;
    }
    this.api.confirmRevolutPayment(orderIdNum, token).subscribe({
      next: () => {
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(true);
        this.errorMessage.set(err.error?.detail || 'Payment confirmation failed.');
        this.loading.set(false);
      },
    });
  }
}
