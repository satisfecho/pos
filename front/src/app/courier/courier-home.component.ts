import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService, CourierInfo } from '../services/api.service';

@Component({
  selector: 'app-courier-home',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <div class="courier-page">
      <header class="courier-header">
        <h1>{{ 'COURIER_HOME.TITLE' | translate }}</h1>
        <button type="button" class="btn-logout" (click)="logout()">
          {{ 'COURIER_HOME.LOGOUT' | translate }}
        </button>
      </header>

      @if (loading()) {
        <p class="courier-muted">{{ 'COMMON.LOADING' | translate }}</p>
      } @else if (error()) {
        <p class="courier-error">{{ error() | translate }}</p>
      } @else if (profile()) {
        <section class="courier-card">
          <p class="courier-welcome">{{ 'COURIER_HOME.WELCOME' | translate }}</p>
          <p class="courier-name">{{ profile()!.full_name || profile()!.email }}</p>
          @if (profile()!.tenant_name) {
            <p class="courier-tenant">{{ profile()!.tenant_name }}</p>
          }
          <p class="courier-placeholder">{{ 'COURIER_HOME.PLACEHOLDER' | translate }}</p>
        </section>
      }
    </div>
  `,
  styles: [`
    .courier-page {
      min-height: 100vh;
      padding: var(--space-6);
      background: var(--color-bg);
      color: var(--color-text);
    }
    .courier-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      margin-bottom: var(--space-6);
    }
    .courier-header h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
    }
    .btn-logout {
      padding: var(--space-2) var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;
    }
    .btn-logout:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .courier-card {
      max-width: 480px;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
      padding: var(--space-6);
    }
    .courier-welcome { color: var(--color-text-muted); margin: 0 0 var(--space-2); }
    .courier-name { font-size: 1.25rem; font-weight: 600; margin: 0 0 var(--space-1); }
    .courier-tenant { color: var(--color-text-muted); margin: 0 0 var(--space-4); }
    .courier-placeholder { margin: 0; line-height: 1.5; }
    .courier-muted, .courier-error { color: var(--color-text-muted); }
    .courier-error { color: var(--color-error); }
  `]
})
export class CourierHomeComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  loading = signal(true);
  error = signal('');
  profile = signal<CourierInfo | null>(null);

  ngOnInit(): void {
    this.api.getCourierMe().subscribe({
      next: (info) => {
        this.profile.set(info);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('COURIER_HOME.LOAD_FAILED');
      }
    });
  }

  logout(): void {
    this.api.logout().subscribe(() => {
      void this.router.navigate(['/courier/login']);
    });
  }
}
