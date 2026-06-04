import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService, EventItem } from '../services/api.service';
import { SidebarComponent } from '../shared/sidebar.component';

@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [FormsModule, TranslateModule, RouterLink, SidebarComponent],
  template: `
    <app-sidebar>
      <div class="page-header">
        <h1>{{ 'EVENTS.TITLE' | translate }}</h1>
        <div class="page-header-actions">
          <button type="button" class="btn btn-primary" (click)="openCreate()">
            + {{ 'EVENTS.NEW_EVENT' | translate }}
          </button>
        </div>
      </div>

      <div class="events-wrap">
        @if (loading()) {
          <p class="muted">{{ 'COMMON.LOADING' | translate }}</p>
        } @else if (events().length === 0) {
          <div class="empty">
            <p>{{ 'EVENTS.EMPTY' | translate }}</p>
            <button type="button" class="btn btn-primary" (click)="openCreate()">
              + {{ 'EVENTS.NEW_EVENT' | translate }}
            </button>
          </div>
        } @else {
          <div class="event-grid">
            @for (e of events(); track e.id) {
              <a class="event-card" [routerLink]="['/events', e.id]">
                <div class="event-card-head">
                  <span class="event-title">{{ e.title }}</span>
                  @if (e.status === 'cancelled') {
                    <span class="badge badge-cancelled">{{ 'EVENTS.STATUS_CANCELLED' | translate }}</span>
                  }
                </div>
                <div class="event-meta">
                  @if (e.event_date) { <span>📅 {{ e.event_date }}{{ e.event_time ? ' · ' + e.event_time : '' }}</span> }
                  @if (e.location) { <span>📍 {{ e.location }}</span> }
                </div>
                <div class="event-counts">
                  <span class="count count-total">{{ e.counts?.total || 0 }} {{ 'EVENTS.GUESTS' | translate }}</span>
                  <span class="count count-confirmed">{{ e.counts?.confirmed || 0 }} ✓</span>
                  <span class="count count-pending">{{ e.counts?.pending || 0 }} ⏳</span>
                </div>
              </a>
            }
          </div>
        }
      </div>

      @if (showCreate()) {
        <div class="modal-overlay" (click)="closeCreate()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h2>{{ 'EVENTS.NEW_EVENT' | translate }}</h2>
            <label>{{ 'EVENTS.FIELD_TITLE' | translate }} *</label>
            <input type="text" [(ngModel)]="form.title" name="title" autofocus />
            <label>{{ 'EVENTS.FIELD_DATE' | translate }}</label>
            <input type="date" [(ngModel)]="form.event_date" name="event_date" />
            <label>{{ 'EVENTS.FIELD_TIME' | translate }}</label>
            <input type="time" [(ngModel)]="form.event_time" name="event_time" />
            <label>{{ 'EVENTS.FIELD_LOCATION' | translate }}</label>
            <input type="text" [(ngModel)]="form.location" name="location" />
            @if (createError()) { <p class="error">{{ createError()! | translate }}</p> }
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" (click)="closeCreate()">{{ 'COMMON.CANCEL' | translate }}</button>
              <button type="button" class="btn btn-primary" [disabled]="saving() || !form.title.trim()" (click)="save()">
                {{ 'COMMON.SAVE' | translate }}
              </button>
            </div>
          </div>
        </div>
      }
    </app-sidebar>
  `,
  styles: [`
    .events-wrap { padding: 1rem; max-width: 900px; margin: 0 auto; }
    .muted { color: var(--color-text-muted); }
    .empty { text-align: center; padding: 3rem 1rem; color: var(--color-text-muted); display: flex; flex-direction: column; gap: 1rem; align-items: center; }
    .event-grid { display: grid; grid-template-columns: 1fr; gap: 0.75rem; }
    @media (min-width: 640px) { .event-grid { grid-template-columns: repeat(2, 1fr); } }
    .event-card { display: flex; flex-direction: column; gap: 0.5rem; padding: 1rem; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); text-decoration: none; color: var(--color-text); box-shadow: var(--shadow-sm); min-height: 96px; }
    .event-card:active { transform: scale(0.99); }
    .event-card-head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
    .event-title { font-weight: 700; font-size: 1.1rem; }
    .event-meta { display: flex; flex-wrap: wrap; gap: 0.75rem; color: var(--color-text-muted); font-size: 0.9rem; }
    .event-counts { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.25rem; }
    .count { font-size: 0.85rem; padding: 0.2rem 0.55rem; border-radius: var(--radius-sm); background: var(--color-bg); }
    .count-confirmed { background: var(--color-success-light); color: var(--color-success); }
    .count-pending { background: var(--color-warning); color: #fff; }
    .badge-cancelled { background: var(--color-error); color: #fff; padding: 0.15rem 0.5rem; border-radius: var(--radius-sm); font-size: 0.75rem; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; justify-content: center; z-index: 1000; }
    @media (min-width: 640px) { .modal-overlay { align-items: center; } }
    .modal { background: var(--color-surface); border-radius: var(--radius-lg) var(--radius-lg) 0 0; padding: 1.25rem; width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: 0.4rem; }
    @media (min-width: 640px) { .modal { border-radius: var(--radius-lg); } }
    .modal h2 { margin: 0 0 0.5rem; }
    .modal label { font-size: 0.85rem; color: var(--color-text-muted); margin-top: 0.5rem; }
    .modal input { padding: 0.7rem; font-size: 1rem; border: 1px solid var(--color-border); border-radius: var(--radius-sm); min-height: 48px; }
    .modal-actions { display: flex; gap: 0.5rem; margin-top: 1rem; }
    .modal-actions .btn { flex: 1; }
    .error { color: var(--color-error); font-size: 0.85rem; }
    .btn { min-height: 48px; padding: 0.6rem 1rem; border-radius: var(--radius-md); font-size: 1rem; font-weight: 600; cursor: pointer; border: 1px solid transparent; }
    .btn-primary { background: var(--color-primary); color: #fff; }
    .btn-primary:disabled { opacity: 0.5; }
    .btn-secondary { background: var(--color-bg); color: var(--color-text); border-color: var(--color-border); }
  `],
})
export class EventsListComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  loading = signal(true);
  events = signal<EventItem[]>([]);
  showCreate = signal(false);
  saving = signal(false);
  createError = signal<string | null>(null);
  form = { title: '', event_date: '', event_time: '', location: '' };

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.getEvents().subscribe({
      next: (rows) => { this.events.set(rows); this.loading.set(false); },
      error: () => { this.events.set([]); this.loading.set(false); },
    });
  }

  openCreate() {
    this.form = { title: '', event_date: '', event_time: '', location: '' };
    this.createError.set(null);
    this.showCreate.set(true);
  }

  closeCreate() { this.showCreate.set(false); }

  save() {
    const title = this.form.title.trim();
    if (!title) return;
    this.saving.set(true);
    this.createError.set(null);
    this.api.createEvent({
      title,
      event_date: this.form.event_date || null,
      event_time: this.form.event_time || null,
      location: this.form.location.trim() || null,
    }).subscribe({
      next: (e) => { this.saving.set(false); this.showCreate.set(false); this.router.navigate(['/events', e.id]); },
      error: () => { this.saving.set(false); this.createError.set('EVENTS.SAVE_ERROR'); },
    });
  }
}
