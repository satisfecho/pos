import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { SidebarComponent } from '../shared/sidebar.component';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService, WorkSession } from '../services/api.service';

@Component({
  selector: 'app-my-shift',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TranslateModule],
  template: `
    <app-sidebar>
      <div class="my-shift-page" data-testid="my-shift-page">
        <div class="page-header">
          <h1>{{ 'MY_SHIFT.TITLE' | translate }}</h1>
          <p class="subtitle">{{ 'MY_SHIFT.SUBTITLE' | translate }}</p>
        </div>

        <p class="hint">{{ 'MY_SHIFT.AUDIT_HINT' | translate }}</p>

        @if (error()) {
          <div class="error-banner">{{ error() }}</div>
        }

        <section class="card clock-card">
          @if (loading()) {
            <p class="muted">{{ 'MY_SHIFT.LOADING' | translate }}</p>
          } @else if (open(); as s) {
            <p class="status on">{{ 'MY_SHIFT.STATUS_ON' | translate }}</p>
            <p class="time-row">
              <span class="label">{{ 'MY_SHIFT.STARTED' | translate }}</span>
              <span>{{ formatDt(s.started_at) }}</span>
            </p>
            <button type="button" class="btn btn-primary btn-end" (click)="endShift()" [disabled]="actionLoading()">
              {{ actionLoading() ? ('MY_SHIFT.WORKING' | translate) : ('MY_SHIFT.END_SHIFT' | translate) }}
            </button>
          } @else {
            <p class="status off">{{ 'MY_SHIFT.STATUS_OFF' | translate }}</p>
            <button type="button" class="btn btn-primary" (click)="startShift()" [disabled]="actionLoading()">
              {{ actionLoading() ? ('MY_SHIFT.WORKING' | translate) : ('MY_SHIFT.START_SHIFT' | translate) }}
            </button>
          }
        </section>

        <section class="card history-card">
          <h2>{{ 'MY_SHIFT.HISTORY_TITLE' | translate }}</h2>
          @if (history().length === 0) {
            <p class="muted">{{ 'MY_SHIFT.NO_HISTORY' | translate }}</p>
          } @else {
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{{ 'MY_SHIFT.COL_START' | translate }}</th>
                    <th>{{ 'MY_SHIFT.COL_END' | translate }}</th>
                    <th>{{ 'MY_SHIFT.COL_DURATION' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of history(); track row.id) {
                    <tr [class.open-row]="!row.ended_at">
                      <td>{{ formatDt(row.started_at) }}</td>
                      <td>{{ row.ended_at ? formatDt(row.ended_at) : '—' }}</td>
                      <td>{{ formatDuration(row) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      </div>
    </app-sidebar>
  `,
  styles: `
    .my-shift-page {
      max-width: 720px;
    }
    .page-header h1 {
      margin: 0 0 0.25rem;
      font-size: 1.5rem;
    }
    .subtitle {
      margin: 0 0 1rem;
      color: var(--color-text-muted, #666);
      font-size: 0.9375rem;
    }
    .hint {
      font-size: 0.8125rem;
      color: var(--color-text-muted, #666);
      margin: 0 0 1.25rem;
      line-height: 1.4;
    }
    .error-banner {
      background: var(--color-danger-bg, #fde8e8);
      color: var(--color-danger, #b91c1c);
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
    }
    .card {
      background: var(--color-surface, #fff);
      border: 1px solid var(--color-border, #e5e5e5);
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 1.5rem;
    }
    .clock-card .status {
      font-weight: 600;
      margin: 0 0 0.75rem;
    }
    .clock-card .status.on {
      color: var(--color-success, #15803d);
    }
    .clock-card .status.off {
      color: var(--color-text-muted, #666);
    }
    .time-row {
      margin: 0 0 1rem;
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .time-row .label {
      color: var(--color-text-muted, #666);
    }
    .btn-end {
      margin-top: 0.25rem;
    }
    .history-card h2 {
      margin: 0 0 1rem;
      font-size: 1.125rem;
    }
    .muted {
      color: var(--color-text-muted, #666);
      margin: 0;
    }
    .table-wrap {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    th,
    td {
      text-align: left;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--color-border, #eee);
    }
    th {
      font-weight: 600;
      color: var(--color-text-muted, #666);
    }
    .open-row {
      background: var(--color-highlight-bg, #f0f9ff);
    }
  `,
})
export class MyShiftComponent implements OnInit {
  private api = inject(ApiService);

  loading = signal(true);
  actionLoading = signal(false);
  error = signal<string | null>(null);
  open = signal<WorkSession | null>(null);
  history = signal<WorkSession[]>([]);

  ngOnInit(): void {
    this.refreshAll();
  }

  private rangeLastDays(n: number): { from: string; to: string } {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - n);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }

  refreshAll(): void {
    this.loading.set(true);
    this.error.set(null);
    const { from, to } = this.rangeLastDays(30);
    forkJoin({
      open: this.api.getMyOpenWorkSession(),
      history: this.api.getMyWorkSessions(from, to),
    }).subscribe({
      next: ({ open, history }) => {
        this.open.set(open);
        this.history.set(history);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load shift data');
      },
    });
  }

  startShift(): void {
    this.actionLoading.set(true);
    this.error.set(null);
    this.api.startMyWorkSession().subscribe({
      next: (s) => {
        this.open.set(s);
        this.actionLoading.set(false);
        this.refreshHistoryOnly();
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.error.set(err?.error?.detail || 'Could not start shift');
      },
    });
  }

  endShift(): void {
    this.actionLoading.set(true);
    this.error.set(null);
    this.api.endMyWorkSession().subscribe({
      next: () => {
        this.open.set(null);
        this.actionLoading.set(false);
        this.refreshHistoryOnly();
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.error.set(err?.error?.detail || 'Could not end shift');
      },
    });
  }

  private refreshHistoryOnly(): void {
    const { from, to } = this.rangeLastDays(30);
    this.api.getMyWorkSessions(from, to).subscribe({
      next: (rows) => this.history.set(rows),
      error: () => {},
    });
  }

  formatDt(iso: string): string {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString();
  }

  formatDuration(row: WorkSession): string {
    if (row.duration_minutes != null && row.duration_minutes >= 0) {
      const h = Math.floor(row.duration_minutes / 60);
      const m = row.duration_minutes % 60;
      if (h > 0) return `${h}h ${m}m`;
      return `${m}m`;
    }
    if (!row.ended_at) return '…';
    return '—';
  }
}
