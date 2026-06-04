import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Html5Qrcode } from 'html5-qrcode';
import { ApiService, EventGuestItem } from '../services/api.service';
import { SidebarComponent } from '../shared/sidebar.component';

const READER_ID = 'event-checkin-reader';

@Component({
  selector: 'app-event-checkin',
  standalone: true,
  imports: [TranslateModule, RouterLink, SidebarComponent],
  template: `
    <app-sidebar>
      <div class="page-header">
        <h1>{{ 'EVENTS.CHECKIN' | translate }}</h1>
        <div class="page-header-actions">
          <a class="btn btn-secondary" [routerLink]="['/events', eventId()]">‹ {{ 'COMMON.BACK' | translate }}</a>
        </div>
      </div>

      <div class="checkin-wrap">
        <p class="hint">{{ 'EVENTS.CHECKIN_HINT' | translate }}</p>
        <div id="{{ readerId }}" class="reader"></div>

        @if (starting()) { <p class="muted">{{ 'EVENTS.CHECKIN_STARTING' | translate }}</p> }
        @if (cameraError()) {
          <p class="error">{{ 'EVENTS.CHECKIN_CAMERA_ERROR' | translate }}</p>
          <button type="button" class="btn btn-primary" (click)="start()">{{ 'COMMON.RETRY' | translate }}</button>
        }

        @if (result(); as r) {
          <div class="result" [class]="r.kind">
            <div class="result-icon">{{ r.kind === 'ok' ? '✓' : (r.kind === 'already' ? 'ℹ' : '✕') }}</div>
            <div class="result-name">{{ r.name }}</div>
            <div class="result-msg">{{ r.msg | translate }}</div>
          </div>
        }
      </div>
    </app-sidebar>
  `,
  styles: [`
    .checkin-wrap { padding: 1rem; max-width: 520px; margin: 0 auto; text-align: center; }
    .hint { color: var(--color-text-muted); }
    .reader { width: 100%; max-width: 360px; margin: 0 auto; border-radius: var(--radius-md); overflow: hidden; }
    .muted { color: var(--color-text-muted); }
    .error { color: var(--color-error); }
    .result { margin-top: 1.25rem; padding: 1.5rem; border-radius: var(--radius-lg); color: #fff; }
    .result.ok { background: var(--color-success); }
    .result.already { background: var(--color-warning); }
    .result.bad { background: var(--color-error); }
    .result-icon { font-size: 3rem; line-height: 1; }
    .result-name { font-size: 1.5rem; font-weight: 700; margin-top: 0.5rem; }
    .result-msg { margin-top: 0.25rem; }
    .btn { min-height: 48px; padding: 0.6rem 1rem; border-radius: var(--radius-md); font-weight: 600; cursor: pointer; border: 1px solid transparent; text-decoration: none; display: inline-flex; align-items: center; }
    .btn-primary { background: var(--color-primary); color: #fff; }
    .btn-secondary { background: var(--color-bg); color: var(--color-text); border-color: var(--color-border); }
  `],
})
export class EventCheckinComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  readerId = READER_ID;
  eventId = signal<number>(0);
  starting = signal(false);
  cameraError = signal(false);
  result = signal<{ kind: 'ok' | 'already' | 'bad'; name: string; msg: string } | null>(null);

  private scanner: Html5Qrcode | null = null;
  private busy = false;
  private lastToken = '';

  ngOnInit() {
    this.eventId.set(Number(this.route.snapshot.paramMap.get('id')));
    void this.start();
  }

  ngOnDestroy() {
    void this.stop();
  }

  async start() {
    this.cameraError.set(false);
    this.starting.set(true);
    try {
      await this.stop();
      const inst = new Html5Qrcode(READER_ID);
      this.scanner = inst;
      await inst.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (text) => this.onDecoded(text),
        () => {},
      );
    } catch {
      this.cameraError.set(true);
      this.scanner = null;
    } finally {
      this.starting.set(false);
    }
  }

  private async stop() {
    const inst = this.scanner;
    this.scanner = null;
    if (!inst) return;
    try { await inst.stop(); } catch { /* not running */ }
    try { await inst.clear(); } catch { /* ignore */ }
  }

  private extractToken(text: string): string | null {
    const raw = (text || '').trim();
    if (!raw) return null;
    // Scanned value may be the full invite URL (…/invitacion?token=XXX) or the raw token.
    const match = raw.match(/[?&]token=([^&\s]+)/i);
    if (match) return decodeURIComponent(match[1]);
    if (/^[A-Za-z0-9]{8,}$/.test(raw)) return raw;
    return null;
  }

  private onDecoded(text: string) {
    const token = this.extractToken(text);
    if (!token || this.busy || token === this.lastToken) return;
    this.busy = true;
    this.lastToken = token;
    this.api.checkinEventByToken(this.eventId(), token).subscribe({
      next: (res) => {
        const g: EventGuestItem = res.guest;
        this.result.set({
          kind: res.already_checked_in ? 'already' : 'ok',
          name: g.name,
          msg: res.already_checked_in ? 'EVENTS.CHECKIN_ALREADY' : 'EVENTS.CHECKIN_WELCOME',
        });
        this.releaseSoon();
      },
      error: () => {
        this.result.set({ kind: 'bad', name: '—', msg: 'EVENTS.CHECKIN_NOT_FOUND' });
        this.releaseSoon();
      },
    });
  }

  private releaseSoon() {
    setTimeout(() => { this.busy = false; this.lastToken = ''; }, 2500);
  }
}
