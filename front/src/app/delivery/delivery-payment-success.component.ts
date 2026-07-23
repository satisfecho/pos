import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-delivery-payment-success',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  template: `
    <div class="delivery-payment-success-page">
      @if (loading()) {
        <p>{{ 'PAYMENTS.PROCESSING' | translate }}</p>
      } @else if (error()) {
        <p class="error">{{ errorMessage() }}</p>
        <a [routerLink]="['/delivery', tenantId()]">{{ 'COMMON.BACK' | translate }}</a>
      } @else {
        <h1>{{ 'PAYMENTS.SUCCESS_TITLE' | translate }}</h1>
        <p>{{ 'DELIVERY_CHECKOUT.SUCCESS_MESSAGE' | translate }}</p>
        <a [routerLink]="['/delivery', tenantId()]" class="btn btn-primary">
          {{ 'DELIVERY_CHECKOUT.ORDER_AGAIN' | translate }}
        </a>
      }
    </div>
  `,
  styles: [
    `
      .delivery-payment-success-page {
        min-height: 60vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        text-align: center;
      }
      .delivery-payment-success-page h1 {
        margin-bottom: 0.5rem;
      }
      .delivery-payment-success-page p {
        margin-bottom: 1rem;
      }
      .delivery-payment-success-page .error {
        color: var(--color-error, #c00);
      }
      .delivery-payment-success-page a {
        margin-top: 0.5rem;
      }
    `,
  ],
})
export class DeliveryPaymentSuccessComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);

  loading = signal(true);
  error = signal(false);
  errorMessage = signal('');
  tenantId = signal(0);

  ngOnInit(): void {
    const tidParam = this.route.snapshot.paramMap.get('tenantId');
    const orderId = this.route.snapshot.queryParamMap.get('order_id');
    const publicToken = this.route.snapshot.queryParamMap.get('public_order_token');
    const tid = tidParam ? parseInt(tidParam, 10) : NaN;
    if (!Number.isFinite(tid) || tid < 1 || !orderId || !publicToken) {
      this.error.set(true);
      this.errorMessage.set('Missing delivery payment details.');
      this.loading.set(false);
      return;
    }
    this.tenantId.set(tid);
    const orderIdNum = parseInt(orderId, 10);
    if (Number.isNaN(orderIdNum)) {
      this.error.set(true);
      this.errorMessage.set('Invalid order.');
      this.loading.set(false);
      return;
    }
    this.api.confirmRevolutPayment(orderIdNum, null, publicToken).subscribe({
      next: () => this.loading.set(false),
      error: (err) => {
        this.error.set(true);
        this.errorMessage.set(err.error?.detail || 'Payment confirmation failed.');
        this.loading.set(false);
      },
    });
  }
}
