import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, GuestFeedback } from '../services/api.service';
import { SidebarComponent } from '../shared/sidebar.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PermissionService } from '../services/permission.service';

@Component({
  selector: 'app-guest-feedback',
  standalone: true,
  imports: [SidebarComponent, TranslateModule, RouterLink],
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

  ngOnInit() {
    this.load();
  }

  get tenantId(): number | undefined {
    const id = this.permissions.getCurrentUser()?.tenant_id;
    return id == null ? undefined : id;
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
