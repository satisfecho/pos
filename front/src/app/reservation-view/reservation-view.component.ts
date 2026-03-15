import { Component, inject, signal, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { ApiService, Reservation, TenantSummary } from '../services/api.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';
import { ConfirmationModalComponent } from '../shared/confirmation-modal.component';
import { LanguagePickerComponent } from '../shared/language-picker.component';

@Component({
  selector: 'app-reservation-view',
  standalone: true,
  imports: [TranslateModule, RouterLink, ConfirmationModalComponent, LanguagePickerComponent],
  templateUrl: './reservation-view.component.html',
  styleUrl: './reservation-view.component.scss',
})
export class ReservationViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private translate = inject(TranslateService);
  private sanitizer = inject(DomSanitizer);

  loading = signal(true);
  error = signal<string | null>(null);
  reservation = signal<Reservation | null>(null);
  tenant = signal<TenantSummary | null>(null);
  logoUrl = signal<string | null>(null);
  showCancelConfirm = signal(false);

  getStatusKey(): string {
    const s = this.reservation()?.status;
    return s ? 'RESERVATIONS.STATUS_' + s.toUpperCase() : '';
  }

  getLogoSafeUrl(url: string | null): SafeResourceUrl | null {
    if (!url) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.error.set(this.translate.instant('RESERVATIONS.ERROR_MISSING_TOKEN'));
      this.loading.set(false);
      return;
    }
    this.api.getReservationByToken(token).subscribe({
      next: (r) => {
        this.reservation.set(r);
        this.loadTenant(r.tenant_id);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(this.translate.instant('RESERVATIONS.ERROR_NOT_FOUND'));
        this.loading.set(false);
      },
    });
  }

  private loadTenant(tenantId: number) {
    this.api.getPublicTenant(tenantId).subscribe({
      next: (t) => {
        this.tenant.set(t);
        const url = this.api.getTenantLogoUrl(t.logo_filename ?? undefined, t.id);
        this.logoUrl.set(url);
      },
      error: () => {},
    });
  }

  doCancel() {
    const r = this.reservation();
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!r || !token) return;
    this.api.cancelReservationPublic(r.id, token).subscribe({
      next: (updated) => {
        this.reservation.set(updated);
        this.showCancelConfirm.set(false);
      },
      error: () => this.showCancelConfirm.set(false),
    });
  }
}
