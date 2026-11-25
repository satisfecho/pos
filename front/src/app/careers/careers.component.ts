import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService, CareerApplication } from '../services/api.service';
import { SidebarComponent } from '../shared/sidebar.component';
import { PermissionService } from '../services/permission.service';

@Component({
  selector: 'app-careers',
  standalone: true,
  imports: [SidebarComponent, TranslateModule, RouterLink, FormsModule, DatePipe],
  templateUrl: './careers.component.html',
  styleUrl: './careers.component.scss',
})
export class CareersComponent implements OnInit {
  private api = inject(ApiService);
  private permissions = inject(PermissionService);
  private translate = inject(TranslateService);

  loading = signal(true);
  error = signal<string | null>(null);
  items = signal<CareerApplication[]>([]);
  notifyRole = '';
  notifyMessage = '';
  notifying = signal(false);
  notifyResult = signal<string | null>(null);
  urlCopied = signal(false);
  private urlCopiedTimer?: ReturnType<typeof setTimeout>;

  ngOnInit() {
    this.load();
  }

  get tenantId(): number | undefined {
    const id = this.permissions.getCurrentUser()?.tenant_id;
    return id == null ? undefined : id;
  }

  careersPublicUrl(): string {
    const id = this.tenantId;
    if (id == null) return '';
    if (typeof window === 'undefined') return `/careers/${id}`;
    return `${window.location.origin}/careers/${id}`;
  }

  copyPublicUrl() {
    const url = this.careersPublicUrl();
    if (!url || !navigator.clipboard?.writeText) return;
    navigator.clipboard.writeText(url).then(() => {
      if (this.urlCopiedTimer) clearTimeout(this.urlCopiedTimer);
      this.urlCopied.set(true);
      this.urlCopiedTimer = setTimeout(() => this.urlCopied.set(false), 2000);
    });
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.listCareerApplications().subscribe({
      next: (rows) => {
        this.items.set(rows);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          err?.error?.detail || err?.message || this.translate.instant('CAREERS.LOAD_ERROR'),
        );
      },
    });
  }

  setStatus(row: CareerApplication, status: 'new' | 'contacted' | 'closed') {
    this.api.updateCareerApplicationStatus(row.id, status).subscribe({
      next: (updated) => {
        this.items.update((list) => list.map((r) => (r.id === updated.id ? updated : r)));
      },
      error: () => this.load(),
    });
  }

  downloadCv(row: CareerApplication) {
    this.api.downloadCareerCv(row.id).subscribe({
      next: (blob) => {
        const a = document.createElement('a');
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = row.cv_original_name || `cv-${row.id}.bin`;
        a.click();
        URL.revokeObjectURL(url);
      },
    });
  }

  deleteRow(row: CareerApplication) {
    if (!confirm(this.translate.instant('CAREERS.CONFIRM_DELETE'))) return;
    this.api.deleteCareerApplication(row.id).subscribe({
      next: () => this.items.update((list) => list.filter((r) => r.id !== row.id)),
      error: () => this.load(),
    });
  }

  notifyAll() {
    const role = this.notifyRole.trim();
    if (!role || this.notifying()) return;
    this.notifying.set(true);
    this.notifyResult.set(null);
    this.api
      .notifyAllCareerCandidates({
        role_title: role,
        message: this.notifyMessage.trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.notifying.set(false);
          this.notifyResult.set(
            this.translate.instant('CAREERS.NOTIFY_RESULT', {
              sent: res.sent,
              failed: res.failed,
              total: res.total,
            }),
          );
          this.load();
        },
        error: (err) => {
          this.notifying.set(false);
          this.notifyResult.set(
            err?.error?.detail || this.translate.instant('CAREERS.NOTIFY_ERROR'),
          );
        },
      });
  }
}
