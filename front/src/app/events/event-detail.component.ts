import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService, EventGuestItem, EventItem, InvitationStatus } from '../services/api.service';
import { SidebarComponent } from '../shared/sidebar.component';
import { GuestListImportComponent } from './guest-list-import.component';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [FormsModule, TranslateModule, RouterLink, SidebarComponent, GuestListImportComponent],
  template: `
    <app-sidebar>
      <div class="page-header">
        <h1>{{ event()?.title || ('EVENTS.TITLE' | translate) }}</h1>
        <div class="page-header-actions">
          <a class="btn btn-secondary" routerLink="/events">‹ {{ 'COMMON.BACK' | translate }}</a>
        </div>
      </div>

      <div class="detail-wrap">
        @if (event()?.event_date || event()?.location) {
          <p class="ev-meta">
            @if (event()?.event_date) { <span>📅 {{ event()!.event_date }}{{ event()!.event_time ? ' · ' + event()!.event_time : '' }}</span> }
            @if (event()?.location) { <span>📍 {{ event()!.location }}</span> }
          </p>
        }

        <!-- Big counters -->
        <div class="counters">
          <div class="counter"><b>{{ counts().total }}</b><span>{{ 'EVENTS.GUESTS' | translate }}</span></div>
          <div class="counter c-confirmed"><b>{{ counts().confirmed }}</b><span>{{ 'EVENTS.STATUS_CONFIRMED' | translate }}</span></div>
          <div class="counter c-pending"><b>{{ counts().pending }}</b><span>{{ 'EVENTS.STATUS_PENDING' | translate }}</span></div>
          <div class="counter c-declined"><b>{{ counts().declined }}</b><span>{{ 'EVENTS.STATUS_DECLINED' | translate }}</span></div>
          <div class="counter c-arrived"><b>{{ counts().checked_in }}</b><span>{{ 'EVENTS.ARRIVED' | translate }}</span></div>
        </div>

        <!-- Actions -->
        <div class="actions">
          <button type="button" class="btn btn-primary" (click)="showImport.set(true)">📥 {{ 'EVENTS.IMPORT_TITLE' | translate }}</button>
          <button type="button" class="btn btn-secondary" (click)="openAdd()">＋ {{ 'EVENTS.ADD_GUEST' | translate }}</button>
          <a class="btn btn-secondary" [routerLink]="['/events', eventId(), 'checkin']">📷 {{ 'EVENTS.CHECKIN' | translate }}</a>
          <button type="button" class="btn btn-secondary" (click)="exportList()">⬇ {{ 'EVENTS.EXPORT' | translate }}</button>
        </div>

        <!-- Filter -->
        <div class="filter">
          <input type="search" [(ngModel)]="search" (ngModelChange)="reloadGuests()" [placeholder]="'EVENTS.SEARCH' | translate" />
          <select [(ngModel)]="statusFilter" (ngModelChange)="reloadGuests()">
            <option value="">{{ 'EVENTS.ALL' | translate }}</option>
            <option value="pending">{{ 'EVENTS.STATUS_PENDING' | translate }}</option>
            <option value="confirmed">{{ 'EVENTS.STATUS_CONFIRMED' | translate }}</option>
            <option value="declined">{{ 'EVENTS.STATUS_DECLINED' | translate }}</option>
            <option value="maybe">{{ 'EVENTS.STATUS_MAYBE' | translate }}</option>
          </select>
        </div>

        <!-- Guest list -->
        @if (loadingGuests()) {
          <p class="muted">{{ 'COMMON.LOADING' | translate }}</p>
        } @else if (guests().length === 0) {
          <p class="muted empty">{{ 'EVENTS.NO_GUESTS' | translate }}</p>
        } @else {
          <ul class="guest-list">
            @for (g of guests(); track g.id) {
              <li class="guest-row" (click)="openGuest(g)">
                <span class="dot" [class]="'st-' + g.status"></span>
                <span class="g-name">
                  {{ g.name }}
                  @if (g.party_size > 1) { <span class="g-extra">+{{ g.party_size - 1 }}</span> }
                  @if (g.checked_in_at) { <span class="g-arrived">✓ {{ 'EVENTS.ARRIVED' | translate }}</span> }
                </span>
                <span class="g-status" [class]="'st-' + g.status">{{ statusLabel(g.status) | translate }}</span>
              </li>
            }
          </ul>
        }
      </div>

      <!-- Import modal -->
      @if (showImport()) {
        <app-guest-list-import [eventId]="eventId()" (close)="showImport.set(false)" (imported)="onImported($event)" />
      }

      <!-- Add guest modal -->
      @if (showAdd()) {
        <div class="modal-overlay" (click)="showAdd.set(false)">
          <div class="modal" (click)="$event.stopPropagation()">
            <h2>{{ 'EVENTS.ADD_GUEST' | translate }}</h2>
            <label>{{ 'EVENTS.FIELD_NAME' | translate }} *</label>
            <input type="text" [(ngModel)]="addForm.name" name="name" autofocus />
            <label>{{ 'EVENTS.FIELD_PHONE' | translate }}</label>
            <input type="tel" [(ngModel)]="addForm.phone" name="phone" />
            <label>{{ 'EVENTS.FIELD_COMPANIONS' | translate }}</label>
            <input type="number" min="0" [(ngModel)]="addForm.companions" name="companions" />
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" (click)="showAdd.set(false)">{{ 'COMMON.CANCEL' | translate }}</button>
              <button type="button" class="btn btn-primary" [disabled]="!addForm.name.trim()" (click)="saveGuest()">{{ 'COMMON.SAVE' | translate }}</button>
            </div>
          </div>
        </div>
      }

      <!-- Guest action sheet -->
      @if (selectedGuest(); as g) {
        <div class="modal-overlay" (click)="selectedGuest.set(null)">
          <div class="sheet" (click)="$event.stopPropagation()">
            <h3>{{ g.name }}</h3>
            <div class="status-grid">
              <button type="button" class="st-btn st-confirmed" [class.on]="g.status==='confirmed'" (click)="setStatus(g,'confirmed')">{{ 'EVENTS.STATUS_CONFIRMED' | translate }}</button>
              <button type="button" class="st-btn st-declined" [class.on]="g.status==='declined'" (click)="setStatus(g,'declined')">{{ 'EVENTS.STATUS_DECLINED' | translate }}</button>
              <button type="button" class="st-btn st-maybe" [class.on]="g.status==='maybe'" (click)="setStatus(g,'maybe')">{{ 'EVENTS.STATUS_MAYBE' | translate }}</button>
              <button type="button" class="st-btn st-pending" [class.on]="g.status==='pending'" (click)="setStatus(g,'pending')">{{ 'EVENTS.STATUS_PENDING' | translate }}</button>
            </div>
            <button type="button" class="btn btn-whatsapp" (click)="sendWhatsapp(g)">🟢 {{ 'EVENTS.SEND_WHATSAPP' | translate }}</button>
            <button type="button" class="btn btn-secondary" (click)="checkin(g)" [disabled]="!!g.checked_in_at">
              {{ (g.checked_in_at ? 'EVENTS.ALREADY_ARRIVED' : 'EVENTS.MARK_ARRIVED') | translate }}
            </button>
            <button type="button" class="btn btn-danger" (click)="removeGuest(g)">🗑 {{ 'COMMON.DELETE' | translate }}</button>
            <button type="button" class="btn btn-secondary" (click)="selectedGuest.set(null)">{{ 'COMMON.CLOSE' | translate }}</button>
          </div>
        </div>
      }

      @if (toast(); as t) { <div class="toast" [class]="t.type">{{ t.msg | translate:t.params }}</div> }
    </app-sidebar>
  `,
  styles: [`
    .detail-wrap { padding: 1rem; max-width: 760px; margin: 0 auto; }
    .ev-meta { display: flex; flex-wrap: wrap; gap: 0.75rem; color: var(--color-text-muted); margin: 0 0 1rem; }
    .counters { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; margin-bottom: 1rem; }
    @media (min-width: 560px) { .counters { grid-template-columns: repeat(5, 1fr); } }
    .counter { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 0.6rem; text-align: center; display: flex; flex-direction: column; }
    .counter b { font-size: 1.5rem; }
    .counter span { font-size: 0.75rem; color: var(--color-text-muted); }
    .c-confirmed b { color: var(--color-success); }
    .c-pending b { color: var(--color-warning); }
    .c-declined b { color: var(--color-error); }
    .actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
    .actions .btn { flex: 1 1 45%; }
    @media (min-width: 560px) { .actions .btn { flex: 0 1 auto; } }
    .filter { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
    .filter input { flex: 1; padding: 0.6rem; min-height: 48px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: 1rem; }
    .filter select { min-height: 48px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 0 0.5rem; font-size: 1rem; }
    .muted { color: var(--color-text-muted); }
    .empty { text-align: center; padding: 2rem; }
    .guest-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
    .guest-row { display: flex; align-items: center; gap: 0.6rem; padding: 0.85rem 0.5rem; border-bottom: 1px solid var(--color-border); min-height: 56px; cursor: pointer; }
    .guest-row:active { background: var(--color-bg); }
    .dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; background: var(--color-text-muted); }
    .dot.st-confirmed { background: var(--color-success); }
    .dot.st-pending { background: var(--color-warning); }
    .dot.st-declined { background: var(--color-error); }
    .dot.st-maybe { background: var(--color-warning); }
    .g-name { flex: 1; font-size: 1rem; }
    .g-extra { color: var(--color-text-muted); font-size: 0.85rem; }
    .g-arrived { color: var(--color-success); font-size: 0.8rem; margin-left: 0.4rem; }
    .g-status { font-size: 0.8rem; padding: 0.2rem 0.5rem; border-radius: var(--radius-sm); background: var(--color-bg); color: var(--color-text-muted); }
    .g-status.st-confirmed { background: var(--color-success-light); color: var(--color-success); }
    .g-status.st-declined { background: var(--color-error); color: #fff; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; justify-content: center; z-index: 1000; }
    @media (min-width: 640px) { .modal-overlay { align-items: center; } }
    .modal, .sheet { background: var(--color-surface); border-radius: var(--radius-lg) var(--radius-lg) 0 0; padding: 1.25rem; width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: 0.5rem; }
    @media (min-width: 640px) { .modal, .sheet { border-radius: var(--radius-lg); } }
    .modal label { font-size: 0.85rem; color: var(--color-text-muted); margin-top: 0.4rem; }
    .modal input { padding: 0.7rem; font-size: 1rem; border: 1px solid var(--color-border); border-radius: var(--radius-sm); min-height: 48px; }
    .modal-actions { display: flex; gap: 0.5rem; margin-top: 1rem; }
    .modal-actions .btn { flex: 1; }
    .sheet h3 { margin: 0 0 0.5rem; }
    .status-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
    .st-btn { min-height: 52px; border-radius: var(--radius-md); border: 2px solid var(--color-border); background: var(--color-bg); font-size: 1rem; font-weight: 600; cursor: pointer; }
    .st-btn.st-confirmed.on { background: var(--color-success); color: #fff; border-color: var(--color-success); }
    .st-btn.st-declined.on { background: var(--color-error); color: #fff; border-color: var(--color-error); }
    .st-btn.st-maybe.on, .st-btn.st-pending.on { background: var(--color-warning); color: #fff; border-color: var(--color-warning); }
    .btn { min-height: 48px; padding: 0.6rem 1rem; border-radius: var(--radius-md); font-size: 1rem; font-weight: 600; cursor: pointer; border: 1px solid transparent; text-align: center; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; }
    .btn-primary { background: var(--color-primary); color: #fff; }
    .btn-primary:disabled { opacity: 0.5; }
    .btn-secondary { background: var(--color-bg); color: var(--color-text); border-color: var(--color-border); }
    .btn-whatsapp { background: #25D366; color: #fff; }
    .btn-danger { background: var(--color-error); color: #fff; }
    .toast { position: fixed; left: 50%; bottom: 1.5rem; transform: translateX(-50%); background: var(--color-text); color: #fff; padding: 0.7rem 1.2rem; border-radius: var(--radius-md); z-index: 1100; box-shadow: var(--shadow-lg); }
    .toast.error { background: var(--color-error); }
    .toast.success { background: var(--color-success); }
  `],
})
export class EventDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private translate = inject(TranslateService);

  eventId = signal<number>(0);
  event = signal<EventItem | null>(null);
  guests = signal<EventGuestItem[]>([]);
  loadingGuests = signal(true);
  showImport = signal(false);
  showAdd = signal(false);
  selectedGuest = signal<EventGuestItem | null>(null);
  toast = signal<{ msg: string; type: string; params?: any } | null>(null);

  search = '';
  statusFilter = '';
  addForm = { name: '', phone: '', companions: 0 };

  counts = computed(() => this.event()?.counts || { total: 0, pending: 0, confirmed: 0, declined: 0, maybe: 0, confirmed_heads: 0, checked_in: 0 });

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.eventId.set(id);
    this.refresh();
  }

  refresh() {
    this.api.getEvent(this.eventId()).subscribe({
      next: (e) => this.event.set(e),
      error: () => this.router.navigate(['/events']),
    });
    this.reloadGuests();
  }

  reloadGuests() {
    this.loadingGuests.set(true);
    this.api.getEventGuests(this.eventId(), { status: this.statusFilter || undefined, search: this.search.trim() || undefined }).subscribe({
      next: (rows) => { this.guests.set(rows); this.loadingGuests.set(false); },
      error: () => { this.guests.set([]); this.loadingGuests.set(false); },
    });
  }

  private refreshCounts() {
    this.api.getEvent(this.eventId()).subscribe({ next: (e) => this.event.set(e) });
  }

  statusLabel(s: InvitationStatus): string {
    return 'EVENTS.STATUS_' + s.toUpperCase();
  }

  openAdd() {
    this.addForm = { name: '', phone: '', companions: 0 };
    this.showAdd.set(true);
  }

  saveGuest() {
    const name = this.addForm.name.trim();
    if (!name) return;
    this.api.addEventGuest(this.eventId(), {
      name,
      phone: this.addForm.phone.trim() || null,
      party_size: (Number(this.addForm.companions) || 0) + 1,
    }).subscribe({
      next: () => { this.showAdd.set(false); this.refresh(); this.showToast('EVENTS.GUEST_ADDED', 'success'); },
      error: () => this.showToast('EVENTS.SAVE_ERROR', 'error'),
    });
  }

  openGuest(g: EventGuestItem) { this.selectedGuest.set(g); }

  setStatus(g: EventGuestItem, status: InvitationStatus) {
    this.api.setEventGuestStatus(this.eventId(), g.id, status).subscribe({
      next: (updated) => { this.selectedGuest.set(null); this.applyGuest(updated); this.refreshCounts(); },
      error: () => this.showToast('EVENTS.SAVE_ERROR', 'error'),
    });
  }

  checkin(g: EventGuestItem) {
    this.api.checkinEventGuest(this.eventId(), g.id).subscribe({
      next: (res) => { this.selectedGuest.set(null); this.applyGuest(res.guest); this.refreshCounts(); this.showToast('EVENTS.CHECKED_IN', 'success'); },
      error: () => this.showToast('EVENTS.SAVE_ERROR', 'error'),
    });
  }

  removeGuest(g: EventGuestItem) {
    this.api.deleteEventGuest(this.eventId(), g.id).subscribe({
      next: () => { this.selectedGuest.set(null); this.refresh(); },
      error: () => this.showToast('EVENTS.SAVE_ERROR', 'error'),
    });
  }

  sendWhatsapp(g: EventGuestItem) {
    const eventTitle = this.event()?.title || '';
    // Build an absolute invite URL from the current origin (works without public_app_base_url config).
    const url = g.token ? `${window.location.origin}/invitacion?token=${g.token}` : (g.invite_url || '');
    const msg = this.translate.instant('EVENTS.WHATSAPP_MESSAGE', { name: g.name, event: eventTitle, url });
    const phone = (g.phone || '').replace(/[^0-9]/g, '');
    const wa = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(wa, '_blank');
    // Mark as invited (best-effort)
    this.api.markEventGuestInvited(this.eventId(), g.id).subscribe({ next: (u) => this.applyGuest(u), error: () => {} });
    this.selectedGuest.set(null);
  }

  exportList() {
    this.api.getEventGuestsExport(this.eventId()).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invitados-evento-${this.eventId()}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.showToast('EVENTS.EXPORT_ERROR', 'error'),
    });
  }

  onImported(created: number) {
    this.showImport.set(false);
    this.refresh();
    this.showToast('EVENTS.IMPORTED_OK', 'success', { n: created });
  }

  private applyGuest(updated: EventGuestItem) {
    this.guests.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
  }

  private showToast(msg: string, type: string, params?: any) {
    this.toast.set({ msg, type, params });
    setTimeout(() => this.toast.set(null), 2600);
  }
}
