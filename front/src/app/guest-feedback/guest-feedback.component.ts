import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QRCodeComponent } from 'angularx-qrcode';
import { ApiService, GuestFeedback } from '../services/api.service';
import { SidebarComponent } from '../shared/sidebar.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PermissionService } from '../services/permission.service';

@Component({
  selector: 'app-guest-feedback',
  standalone: true,
  imports: [SidebarComponent, TranslateModule, RouterLink, QRCodeComponent],
  templateUrl: './guest-feedback.component.html',
  styleUrl: './guest-feedback.component.scss',
})
export class GuestFeedbackComponent implements OnInit {
  private api = inject(ApiService);
  private permissions = inject(PermissionService);
  private translate = inject(TranslateService);

  loading = signal(true);
  error = signal<string | null>(null);
  items = signal<GuestFeedback[]>([]);
  /** Brief “copied” hint after copy URL */
  urlCopied = signal(false);
  private urlCopiedTimer?: ReturnType<typeof setTimeout>;

  ngOnInit() {
    this.load();
  }

  get tenantId(): number | undefined {
    const id = this.permissions.getCurrentUser()?.tenant_id;
    return id == null ? undefined : id;
  }

  /** Absolute URL to the public feedback form (same origin as the staff app). */
  feedbackPublicUrl(): string {
    const id = this.tenantId;
    if (id == null) return '';
    if (typeof window === 'undefined') return `/feedback/${id}`;
    return `${window.location.origin}/feedback/${id}`;
  }

  copyFeedbackUrl() {
    const url = this.feedbackPublicUrl();
    if (!url) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => this.flashUrlCopied()).catch(() => {});
    }
  }

  private flashUrlCopied() {
    if (this.urlCopiedTimer) clearTimeout(this.urlCopiedTimer);
    this.urlCopied.set(true);
    this.urlCopiedTimer = setTimeout(() => this.urlCopied.set(false), 2500);
  }

  printFeedbackQr() {
    document.body.classList.add('print-feedback-qr-only');
    const remove = () => document.body.classList.remove('print-feedback-qr-only');
    window.addEventListener('afterprint', remove, { once: true });
    setTimeout(remove, 120_000);
    window.print();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.listGuestFeedback(200).subscribe({
      next: (rows) => {
        this.items.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(this.translate.instant('FEEDBACK.LOAD_FAILED'));
        this.loading.set(false);
      },
    });
  }
}
