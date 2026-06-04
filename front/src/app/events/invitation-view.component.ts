import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { QRCodeComponent } from 'angularx-qrcode';
import { ApiService, InvitationStatus } from '../services/api.service';
import { LanguagePickerComponent } from '../shared/language-picker.component';

@Component({
  selector: 'app-invitation-view',
  standalone: true,
  imports: [TranslateModule, QRCodeComponent, LanguagePickerComponent],
  template: `
    <div class="inv-page">
      <div class="inv-card">
        <div class="inv-lang"><app-language-picker /></div>

        @if (loading()) {
          <p class="muted">{{ 'COMMON.LOADING' | translate }}</p>
        } @else if (error()) {
          <div class="inv-error">
            <div class="big">🙁</div>
            <p>{{ error()! | translate }}</p>
          </div>
        } @else if (data(); as d) {
          <p class="inv-host">{{ d.tenant?.name }}</p>
          <h1 class="inv-title">{{ d.event?.title }}</h1>
          <p class="inv-meta">
            @if (d.event?.event_date) { <span>📅 {{ d.event.event_date }}{{ d.event.event_time ? ' · ' + d.event.event_time : '' }}</span> }
            @if (d.event?.location) { <br/><span>📍 {{ d.event.location }}</span> }
          </p>

          <p class="inv-greeting">{{ 'EVENTS.INVITE_GREETING' | translate:{ name: d.guest_name } }}</p>

          @if (saved()) {
            <div class="inv-saved" [class]="status()">
              <div class="big">{{ status() === 'confirmed' ? '🎉' : (status() === 'declined' ? '👍' : '🤔') }}</div>
              <p>{{ savedMessage() | translate }}</p>
            </div>
          }

          <p class="inv-q">{{ 'EVENTS.INVITE_QUESTION' | translate }}</p>
          <div class="inv-actions">
            <button type="button" class="big-btn confirm" [class.on]="status()==='confirmed'" [disabled]="saving()" (click)="respond('confirmed')">
              ✓ {{ 'EVENTS.RSVP_YES' | translate }}
            </button>
            <button type="button" class="big-btn decline" [class.on]="status()==='declined'" [disabled]="saving()" (click)="respond('declined')">
              ✕ {{ 'EVENTS.RSVP_NO' | translate }}
            </button>
            <button type="button" class="big-btn maybe" [class.on]="status()==='maybe'" [disabled]="saving()" (click)="respond('maybe')">
              ? {{ 'EVENTS.RSVP_MAYBE' | translate }}
            </button>
          </div>

          @if (status() === 'confirmed') {
            <div class="inv-pass">
              <p class="pass-label">{{ 'EVENTS.INVITE_PASS' | translate }}</p>
              <qrcode [qrdata]="passUrl()" [width]="200" errorCorrectionLevel="M"></qrcode>
              @if (data()?.checked_in) { <p class="arrived">✓ {{ 'EVENTS.ARRIVED' | translate }}</p> }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .inv-page { min-height: 100vh; background: var(--color-bg); display: flex; align-items: flex-start; justify-content: center; padding: 1rem; }
    .inv-card { background: var(--color-surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); padding: 1.5rem 1.25rem; width: 100%; max-width: 440px; text-align: center; position: relative; }
    .inv-lang { position: absolute; top: 0.75rem; right: 0.75rem; }
    .muted { color: var(--color-text-muted); }
    .inv-host { color: var(--color-text-muted); margin: 0.5rem 0 0; font-size: 0.9rem; }
    .inv-title { margin: 0.25rem 0 0.5rem; font-size: 1.6rem; }
    .inv-meta { color: var(--color-text-muted); margin: 0 0 1rem; }
    .inv-greeting { font-size: 1.1rem; margin: 1rem 0; }
    .inv-q { font-weight: 700; margin: 1.25rem 0 0.75rem; }
    .inv-actions { display: flex; flex-direction: column; gap: 0.6rem; }
    .big-btn { min-height: 60px; font-size: 1.2rem; font-weight: 700; border-radius: var(--radius-md); border: 2px solid var(--color-border); background: var(--color-bg); color: var(--color-text); cursor: pointer; }
    .big-btn:disabled { opacity: 0.6; }
    .big-btn.confirm.on { background: var(--color-success); color: #fff; border-color: var(--color-success); }
    .big-btn.decline.on { background: var(--color-error); color: #fff; border-color: var(--color-error); }
    .big-btn.maybe.on { background: var(--color-warning); color: #fff; border-color: var(--color-warning); }
    .inv-saved { margin: 1rem 0; padding: 1rem; border-radius: var(--radius-md); background: var(--color-success-light); }
    .inv-saved .big, .inv-error .big { font-size: 2.5rem; }
    .inv-pass { margin-top: 1.5rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
    .pass-label { font-weight: 600; margin: 0; }
    .arrived { color: var(--color-success); font-weight: 700; }
    .inv-error { padding: 2rem 0; color: var(--color-text-muted); }
  `],
})
export class InvitationViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);

  loading = signal(true);
  error = signal<string | null>(null);
  data = signal<any | null>(null);
  saving = signal(false);
  saved = signal(false);
  status = signal<InvitationStatus | null>(null);

  passUrl = computed(() => (typeof window !== 'undefined' ? window.location.href : ''));

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.error.set('EVENTS.INVITE_MISSING_TOKEN');
      this.loading.set(false);
      return;
    }
    this.api.getInvitationByToken(token).subscribe({
      next: (d) => {
        this.data.set(d);
        this.status.set(d.status);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('EVENTS.INVITE_NOT_FOUND');
        this.loading.set(false);
      },
    });
  }

  savedMessage(): string {
    const s = this.status();
    if (s === 'confirmed') return 'EVENTS.RSVP_SAVED_YES';
    if (s === 'declined') return 'EVENTS.RSVP_SAVED_NO';
    return 'EVENTS.RSVP_SAVED_MAYBE';
  }

  respond(status: InvitationStatus) {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) return;
    this.saving.set(true);
    this.api.respondInvitation(token, status).subscribe({
      next: () => { this.status.set(status); this.saved.set(true); this.saving.set(false); },
      error: () => { this.saving.set(false); this.error.set('EVENTS.INVITE_SAVE_ERROR'); },
    });
  }
}
