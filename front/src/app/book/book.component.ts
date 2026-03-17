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
  formTime = '20:00';
  formPartySize = 2;
  formName = '';
  formPhone = '';
  formEmail = '';
  submitting = signal(false);
  error = signal<string | null>(null);
  successReservation = signal<Reservation | null>(null);
  suggestedTime = signal<string | null>(null);

  /** Time options for reservation: 00:00, 00:15, ... 23:45 (European 24h). */
  timeOptions: string[] = (() => {
    const opts: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (const m of [0, 15, 30, 45]) {
        opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return opts;
  })();

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

  /** Build WhatsApp wa.me link from phone string (e.g. +34 612 345 678 -> https://wa.me/34612345678). */
  getWhatsAppUrl(phone: string): string {
    const digits = (phone || '').replace(/\D/g, '');
    return `https://wa.me/${digits}`;
  }

  onDateChange(dateStr: string) {
    const tid = this.tenantId();
    if (!tid || !dateStr) return;
    this.api.getNextAvailableReservation(tid, dateStr).subscribe({
      next: (res) => {
        const time = this.roundTimeToQuarter(res.time);
        this.suggestedTime.set(time);
        this.formTime = time;
      },
      error: () => this.suggestedTime.set(null),
    });
  }

  /** Round time to nearest 15 minutes (European 24h). */
  roundTimeToQuarter(t: string): string {
    if (!t) return '20:00';
    const [h, m] = t.split(':').map(Number);
    const quarter = Math.round((h * 60 + (m || 0)) / 15) * 15;
    const nh = Math.floor(quarter / 60) % 24;
    const nm = quarter % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
  }

  /** Format opening_hours JSON for display in current locale (e.g. "Mon–Fri 09:00–22:00, Sat 10:00–20:00, Sun closed"). */
  formatOpeningHours(json: string | null | undefined): string {
    if (!json) return '';
    try {
      const oh = JSON.parse(json);
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const locale = this.translate.currentLang || this.translate.defaultLang || 'en';
      const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
      const short = days.map((_, i) => formatter.format(new Date(2024, 0, 1 + i)));
      const closedLabel = this.translate.instant('SETTINGS.CLOSED');
      const parts: string[] = [];
      let i = 0;
      while (i < days.length) {
        const d = oh[days[i]];
        if (!d) {
          i++;
          continue;
        }
        if (d.closed) {
          parts.push(`${short[i]} ${closedLabel}`);
          i++;
          continue;
        }
        const range = d.hasBreak
          ? `${d.morningOpen}–${d.morningClose}, ${d.eveningOpen}–${d.eveningClose}`
          : `${d.open}–${d.close}`;
        let j = i + 1;
        while (j < days.length) {
          const n = oh[days[j]];
          if (!n || n.closed !== d.closed || n.hasBreak !== d.hasBreak) break;
          if (d.hasBreak) {
            if (n.morningOpen !== d.morningOpen || n.morningClose !== d.morningClose ||
                n.eveningOpen !== d.eveningOpen || n.eveningClose !== d.eveningClose) break;
          } else if (n.open !== d.open || n.close !== d.close) break;
          j++;
        }
        parts.push(j > i + 1 ? `${short[i]}–${short[j - 1]} ${range}` : `${short[i]} ${range}`);
        i = j;
      }
      return parts.join(', ');
    } catch {
      return '';
    }
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
      customer_email: this.formEmail.trim() || undefined,
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
