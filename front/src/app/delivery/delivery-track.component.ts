import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService, PublicDeliveryTrackStatus } from '../services/api.service';

const TRACK_POLL_MS = 5000;

const STATUS_STEPS = [
  'received',
  'preparing',
  'out_for_delivery',
  'delivered',
] as const;

@Component({
  selector: 'app-delivery-track',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  templateUrl: './delivery-track.component.html',
  styleUrls: ['./delivery-track.component.scss'],
})
export class DeliveryTrackComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private translate = inject(TranslateService);

  tenantId = signal(0);
  orderId = signal(0);
  loading = signal(true);
  error = signal<string | null>(null);
  status = signal<PublicDeliveryTrackStatus | null>(null);

  private token = '';
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    const tidParam = this.route.snapshot.paramMap.get('tenantId');
    const orderParam =
      this.route.snapshot.queryParamMap.get('order_id') ||
      this.route.snapshot.paramMap.get('orderId');
    const token = this.route.snapshot.queryParamMap.get('public_order_token') || '';
    const tid = tidParam ? parseInt(tidParam, 10) : NaN;
    const oid = orderParam ? parseInt(orderParam, 10) : NaN;
    if (!Number.isFinite(tid) || tid < 1 || !Number.isFinite(oid) || oid < 1 || !token.trim()) {
      this.error.set(this.translate.instant('DELIVERY_TRACK.MISSING_PARAMS'));
      this.loading.set(false);
      return;
    }
    this.tenantId.set(tid);
    this.orderId.set(oid);
    this.token = token.trim();
    this.refresh();
    this.pollTimer = setInterval(() => this.refresh(true), TRACK_POLL_MS);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  refresh(quiet = false): void {
    if (!quiet) this.loading.set(true);
    this.api.getPublicDeliveryOrderStatus(this.orderId(), this.token).subscribe({
      next: (body) => {
        if (body.tenant_id && body.tenant_id !== this.tenantId()) {
          this.error.set(this.translate.instant('DELIVERY_TRACK.NOT_FOUND'));
          this.loading.set(false);
          return;
        }
        this.status.set(body);
        this.error.set(null);
        this.loading.set(false);
        if (body.status === 'delivered' || body.status === 'cancelled') {
          if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
          }
        }
      },
      error: () => {
        this.error.set(this.translate.instant('DELIVERY_TRACK.NOT_FOUND'));
        this.loading.set(false);
      },
    });
  }

  statusLabelKey(status: string): string {
    const key = `DELIVERY_TRACK.STATUS_${status.toUpperCase()}`;
    const translated = this.translate.instant(key);
    return translated === key ? status : key;
  }

  stepIndex(status: string): number {
    if (status === 'awaiting_payment') return -1;
    if (status === 'cancelled') return -2;
    const idx = STATUS_STEPS.indexOf(status as (typeof STATUS_STEPS)[number]);
    return idx;
  }

  isStepDone(step: string, current: string): boolean {
    const cur = this.stepIndex(current);
    const s = STATUS_STEPS.indexOf(step as (typeof STATUS_STEPS)[number]);
    return cur >= 0 && s >= 0 && s <= cur;
  }

  formatCents(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  readonly steps = STATUS_STEPS;
}
