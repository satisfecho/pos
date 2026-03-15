import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, Reservation, ReservationCreate, TenantSummary } from '../services/api.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguagePickerComponent } from '../shared/language-picker.component';

@Component({
  selector: 'app-book',
  standalone: true,
  imports: [FormsModule, TranslateModule, RouterLink, LanguagePickerComponent],
  templateUrl: './book.component.html',
  styleUrl: './book.component.scss',
})
export class BookComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private translate = inject(TranslateService);
  private sanitizer = inject(DomSanitizer);

  minDate = () => new Date().toISOString().slice(0, 10);
  tenantId = signal<number>(0);
  tenant = signal<TenantSummary | null>(null);
  logoUrl = signal<string | null>(null);
  loading = signal(true);
  formDate = '';
  formTime = '19:00';
  formPartySize = 2;
  formName = '';
  formPhone = '';
  submitting = signal(false);
  error = signal<string | null>(null);
  successReservation = signal<Reservation | null>(null);
  suggestedTime = signal<string | null>(null);

  today = computed(() => new Date().toISOString().slice(0, 10));

  constructor() {
    const id = this.route.snapshot.paramMap.get('tenantId');
    const n = id ? parseInt(id, 10) : 0;
    if (n) this.tenantId.set(n);
    const today = new Date().toISOString().slice(0, 10);
    this.formDate = today;
    this.onDateChange(today);
  }

  ngOnInit(): void {
    const tid = this.tenantId();
    if (!tid) {
      this.loading.set(false);
      return;
    }
    this.api.getPublicTenant(tid).subscribe({
      next: (t) => {
        this.tenant.set(t);
        const url = this.api.getTenantLogoUrl(t.logo_filename ?? undefined, t.id);
        this.logoUrl.set(url);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  getLogoSafeUrl(url: string | null): SafeResourceUrl | null {
    if (!url) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  onDateChange(dateStr: string) {
    const tid = this.tenantId();
    if (!tid || !dateStr) return;
    this.api.getNextAvailableReservation(tid, dateStr).subscribe({
      next: (res) => {
        this.suggestedTime.set(res.time);
        this.formTime = res.time;
      },
      error: () => this.suggestedTime.set(null),
    });
  }

  submit() {
    this.error.set(null);
    const tid = this.tenantId();
    if (!tid) {
      this.error.set(this.translate.instant('BOOK.ERROR_INVALID_LINK'));
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
        this.error.set(e.error?.detail || this.translate.instant('BOOK.ERROR_FAILED'));
        this.submitting.set(false);
      },
    });
  }
}
