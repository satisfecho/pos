import {
  Component,
  Injector,
  OnDestroy,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, forkJoin, from, Observable, of } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';
import { Html5Qrcode } from 'html5-qrcode';
import { SidebarComponent } from '../shared/sidebar.component';
import { TranslateModule } from '@ngx-translate/core';
import {
  ApiService,
  ClockQrStatus,
  WorkSession,
  WorkSessionClockPayload,
  workSessionNetWorkSeconds,
  workSessionOpenExceedsContract,
} from '../services/api.service';

const MY_SHIFT_QR_READER_ID = 'my-shift-qr-reader';

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

        @if (clockStatus()?.clock_qr_required) {
          <p class="hint qr-hint">{{ 'MY_SHIFT.QR_HINT' | translate }}</p>
        }
        @if (clockStatus()?.clock_qr_required && qrBlocked()) {
          <div class="scan-prompt">
            <button type="button" class="btn btn-primary scan-cta" (click)="openVenueScan()" [disabled]="scanStarting()">
              {{ scanStarting() ? ('MY_SHIFT.SCANNER_STARTING' | translate) : ('MY_SHIFT.SCAN_VENUE_QR' | translate) }}
            </button>
          </div>
        }
        @if (clockStatus()?.clock_qr_required && !qrBlocked()) {
          <p class="hint venue-ok">{{ 'MY_SHIFT.VENUE_VERIFIED' | translate }}</p>
        }
        @if (clockStatus()?.clock_qr_location_verify) {
          <p class="hint">{{ 'MY_SHIFT.LOCATION_HINT' | translate }}</p>
        }

        @if (exceedsContract()) {
          <div class="overtime-banner" role="status" data-testid="my-shift-overtime-banner">
            <strong>{{ 'MY_SHIFT.OVERTIME_TITLE' | translate }}</strong>
            <p>{{ 'MY_SHIFT.OVERTIME_BODY' | translate: { hours: contractHours() } }}</p>
          </div>
        }

        @if (error()) {
          <div class="error-banner">{{ error() }}</div>
        }

        @if (qrBlocked()) {
          <div class="error-banner" role="alert">{{ 'MY_SHIFT.ERR_QR' | translate }}</div>
        }

        @if (scanOpen()) {
          <div
            class="scan-backdrop"
            role="dialog"
            aria-modal="true"
            [attr.aria-label]="'MY_SHIFT.SCANNER_TITLE' | translate"
            (click)="closeVenueScan()"
          >
            <div class="scan-modal" (click)="$event.stopPropagation()">
              <h2 class="scan-title">{{ 'MY_SHIFT.SCANNER_TITLE' | translate }}</h2>
              <p class="hint scan-help">{{ 'MY_SHIFT.SCANNER_HELP' | translate }}</p>
              @if (scanError()) {
                <div class="error-banner scan-inline-err" role="alert">{{ scanError()! | translate }}</div>
                <button type="button" class="btn btn-primary scan-retry" (click)="retryVenueScan()">
                  {{ 'MY_SHIFT.SCAN_RETRY' | translate }}
                </button>
              }
              <div [id]="qrReaderId" class="qr-reader-host"></div>
              <button type="button" class="btn btn-secondary scan-cancel" (click)="closeVenueScan()">
                {{ 'COMMON.CANCEL' | translate }}
              </button>
            </div>
          </div>
        }

        <section class="card clock-card">
          @if (loading()) {
            <p class="muted">{{ 'MY_SHIFT.LOADING' | translate }}</p>
          } @else if (open(); as s) {
            @if (s.on_break) {
              <p class="status break">{{ 'MY_SHIFT.STATUS_BREAK' | translate }}</p>
            } @else {
              <p class="status on">{{ 'MY_SHIFT.STATUS_ON' | translate }}</p>
            }
            <p class="time-row">
              <span class="label">{{ 'MY_SHIFT.STARTED' | translate }}</span>
              <span>{{ formatDt(s.started_at) }}</span>
            </p>
            @if (openElapsedLabel()) {
              <p class="time-row elapsed-row">
                <span class="label">{{ 'MY_SHIFT.NET_ELAPSED' | translate }}</span>
                <span>{{ openElapsedLabel() }}</span>
              </p>
            }
            <div class="btn-stack">
              @if (s.on_break) {
                <button
                  type="button"
                  class="btn btn-primary"
                  (click)="endBreak()"
                  [disabled]="actionLoading() || qrBlocked()"
                >
                  {{ actionLoading() ? ('MY_SHIFT.WORKING' | translate) : ('MY_SHIFT.END_BREAK' | translate) }}
                </button>
              } @else {
                <button
                  type="button"
                  class="btn btn-secondary"
                  (click)="startBreak()"
                  [disabled]="actionLoading() || qrBlocked()"
                >
                  {{ actionLoading() ? ('MY_SHIFT.WORKING' | translate) : ('MY_SHIFT.START_BREAK' | translate) }}
                </button>
                <button
                  type="button"
                  class="btn btn-primary btn-end"
                  (click)="endShift()"
                  [disabled]="actionLoading() || qrBlocked()"
                >
                  {{ actionLoading() ? ('MY_SHIFT.WORKING' | translate) : ('MY_SHIFT.END_SHIFT' | translate) }}
                </button>
              }
            </div>
          } @else {
            <p class="status off">{{ 'MY_SHIFT.STATUS_OFF' | translate }}</p>
            <button
              type="button"
              class="btn btn-primary"
              (click)="startShift()"
              [disabled]="actionLoading() || qrBlocked()"
            >
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
    .qr-hint {
      margin-bottom: 0.5rem;
    }
    .scan-prompt {
      margin-bottom: 1rem;
    }
    .scan-cta {
      min-height: 48px;
      font-size: 1rem;
      width: 100%;
      max-width: 360px;
    }
    .venue-ok {
      color: var(--color-success, #15803d);
      margin-bottom: 1rem;
    }
    .scan-backdrop {
      position: fixed;
      inset: 0;
      z-index: 10000;
      background: rgba(0, 0, 0, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      box-sizing: border-box;
    }
    .scan-modal {
      background: var(--color-surface, #fff);
      border-radius: 12px;
      padding: 1.25rem;
      max-width: 420px;
      width: 100%;
      max-height: min(90vh, 640px);
      overflow: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }
    .scan-title {
      margin: 0 0 0.5rem;
      font-size: 1.125rem;
    }
    .scan-help {
      margin-bottom: 0.75rem;
    }
    .qr-reader-host {
      min-height: 220px;
      margin-bottom: 1rem;
    }
    .scan-inline-err {
      margin-bottom: 0.75rem;
    }
    .scan-retry {
      width: 100%;
      min-height: 44px;
      margin-bottom: 0.75rem;
    }
    .scan-cancel {
      width: 100%;
      min-height: 44px;
    }
    .error-banner {
      background: var(--color-danger-bg, #fde8e8);
      color: var(--color-danger, #b91c1c);
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
    }
    .overtime-banner {
      background: var(--color-warning-bg, #fff8e6);
      border: 1px solid var(--color-warning-border, #f5d78e);
      color: var(--color-text, #1a1a1a);
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
    }
    .overtime-banner strong {
      display: block;
      margin-bottom: 0.35rem;
    }
    .overtime-banner p {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.45;
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
    .clock-card .status.break {
      color: var(--color-warning-text, #b45309);
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
    .btn-stack {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: stretch;
    }
    .btn-stack .btn {
      min-height: 48px;
      font-size: 1rem;
    }
    .btn-end {
      margin-top: 0;
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
export class MyShiftComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private injector = inject(Injector);

  /** Host element id for html5-qrcode (template binding). */
  readonly qrReaderId = MY_SHIFT_QR_READER_ID;

  loading = signal(true);
  actionLoading = signal(false);
  error = signal<string | null>(null);
  open = signal<WorkSession | null>(null);
  history = signal<WorkSession[]>([]);
  clockStatus = signal<ClockQrStatus | null>(null);
  /** From ?clock_qr=, scan, or sessionStorage */
  clockQrToken = signal<string | null>(null);

  scanOpen = signal(false);
  scanError = signal<string | null>(null);
  scanStarting = signal(false);

  private overtimeTick = signal(0);
  private overtimeTimer: ReturnType<typeof setInterval> | null = null;
  private querySub: { unsubscribe: () => void } | null = null;
  private html5Qr: Html5Qrcode | null = null;
  private scanDecodeHandled = false;

  exceedsContract = computed(() => {
    this.overtimeTick();
    return workSessionOpenExceedsContract(this.open());
  });

  contractHours = computed(() => {
    const m = this.open()?.contract_threshold_minutes ?? 480;
    return Math.round(m / 60);
  });

  qrBlocked = computed(() => {
    const st = this.clockStatus();
    if (!st?.clock_qr_required) return false;
    const u = this.api.getCurrentUser();
    const tid = u?.tenant_id;
    const fromUrl = this.clockQrToken();
    const stored = tid != null ? sessionStorage.getItem(`clock_qr_${tid}`) : null;
    const token = (fromUrl || stored || '').trim();
    return !token;
  });

  openElapsedLabel = computed(() => {
    this.overtimeTick();
    const s = this.open();
    if (!s || s.ended_at) return '';
    const sec = workSessionNetWorkSeconds(s);
    const mins = Math.max(0, Math.floor(sec / 60));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  });

  ngOnInit(): void {
    this.querySub = this.route.queryParamMap.subscribe((q) => {
      const t = q.get('clock_qr');
      if (t?.trim()) {
        this.persistClockQrToken(t.trim());
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { clock_qr: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    });
    this.refreshAll();
    this.overtimeTimer = setInterval(() => this.overtimeTick.update((n) => n + 1), 1000);
  }

  ngOnDestroy(): void {
    this.querySub?.unsubscribe();
    if (this.overtimeTimer != null) {
      clearInterval(this.overtimeTimer);
      this.overtimeTimer = null;
    }
    void this.stopVenueScanner();
  }

  openVenueScan(): void {
    this.scanError.set(null);
    this.scanStarting.set(true);
    this.scanOpen.set(true);
    afterNextRender(
      () => {
        void this.startVenueScanner();
      },
      { injector: this.injector }
    );
  }

  closeVenueScan(): void {
    void this.stopVenueScanner();
    this.scanOpen.set(false);
    this.scanStarting.set(false);
    this.scanError.set(null);
    this.scanDecodeHandled = false;
  }

  retryVenueScan(): void {
    this.scanError.set(null);
    this.scanDecodeHandled = false;
    this.scanStarting.set(true);
    void this.startVenueScanner();
  }

  private async startVenueScanner(): Promise<void> {
    this.scanDecodeHandled = false;
    try {
      await this.stopVenueScanner();
      const inst = new Html5Qrcode(MY_SHIFT_QR_READER_ID);
      this.html5Qr = inst;
      await inst.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => this.onVenueQrDecoded(text),
        () => {}
      );
    } catch {
      this.scanError.set('MY_SHIFT.SCANNER_CAMERA_ERROR');
      this.html5Qr = null;
    } finally {
      this.scanStarting.set(false);
    }
  }

  private async stopVenueScanner(): Promise<void> {
    const inst = this.html5Qr;
    this.html5Qr = null;
    if (!inst) return;
    try {
      await inst.stop();
    } catch {
      /* not running */
    }
    try {
      await inst.clear();
    } catch {
      /* ignore */
    }
  }

  private onVenueQrDecoded(text: string): void {
    if (this.scanDecodeHandled) return;
    const token = this.extractClockQrFromScan(text);
    if (!token) {
      this.scanDecodeHandled = true;
      void this.stopVenueScanner();
      this.scanError.set('MY_SHIFT.SCAN_INVALID');
      return;
    }
    this.scanDecodeHandled = true;
    this.persistClockQrToken(token);
    void this.stopVenueScanner();
    this.scanOpen.set(false);
    this.scanError.set(null);
  }

  /**
   * Accepts full URLs with ?clock_qr=, relative paths, or the raw 64-char hex token.
   */
  private extractClockQrFromScan(raw: string): string | null {
    const s = raw.trim();
    if (!s) return null;
    if (/^[a-fA-F0-9]{64}$/.test(s)) return s.toLowerCase();
    let u: URL | null = null;
    try {
      u = new URL(s);
    } catch {
      try {
        u = new URL(s, window.location.origin);
      } catch {
        u = null;
      }
    }
    if (u) {
      const q = u.searchParams.get('clock_qr');
      if (q?.trim()) return this.normalizeClockQrToken(q.trim());
    }
    const m = s.match(/[?&]clock_qr=([^&\s#]+)/i);
    if (m?.[1]) {
      try {
        const decoded = decodeURIComponent(m[1]).trim();
        return decoded ? this.normalizeClockQrToken(decoded) : null;
      } catch {
        return m[1].trim() ? this.normalizeClockQrToken(m[1].trim()) : null;
      }
    }
    return null;
  }

  private normalizeClockQrToken(t: string): string {
    if (/^[a-fA-F0-9]{64}$/.test(t)) return t.toLowerCase();
    return t;
  }

  private persistClockQrToken(token: string): void {
    const trimmed = token.trim();
    if (!trimmed) return;
    const normalized = this.normalizeClockQrToken(trimmed);
    this.clockQrToken.set(normalized);
    const u = this.api.getCurrentUser();
    const tid = u?.tenant_id;
    if (tid != null) {
      sessionStorage.setItem(`clock_qr_${tid}`, normalized);
    }
  }

  private rangeLastDays(n: number): { from: string; to: string } {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - n);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }

  private effectiveClockQr(): string | undefined {
    const u = this.api.getCurrentUser();
    const tid = u?.tenant_id;
    const t =
      (this.clockQrToken() || (tid != null ? sessionStorage.getItem(`clock_qr_${tid}`) : null) || '').trim();
    return t || undefined;
  }

  private buildClockPayload(): Observable<WorkSessionClockPayload> {
    const st = this.clockStatus();
    const payload: WorkSessionClockPayload = {};
    const q = this.effectiveClockQr();
    if (q) payload.clock_qr = q;
    if (st?.clock_qr_location_verify) {
      return from(
        new Promise<WorkSessionClockPayload>((resolve, reject) => {
          if (!('geolocation' in navigator)) {
            reject(new Error('no geolocation'));
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              resolve({
                ...payload,
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              });
            },
            () => reject(new Error('geo denied')),
            { timeout: 15000, maximumAge: 120000 }
          );
        })
      ).pipe(
        catchError(() => {
          this.error.set(
            'Location is required for clock actions at this venue. Allow access in your browser and try again.'
          );
          return EMPTY;
        })
      );
    }
    return of(payload);
  }

  refreshAll(): void {
    this.loading.set(true);
    this.error.set(null);
    const { from, to } = this.rangeLastDays(30);
    forkJoin({
      open: this.api.getMyOpenWorkSession(),
      history: this.api.getMyWorkSessions(from, to),
      qr: this.api.getMyClockQrStatus(),
    }).subscribe({
      next: ({ open, history, qr }) => {
        this.open.set(open);
        this.history.set(history);
        this.clockStatus.set(qr);
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
    this.buildClockPayload()
      .pipe(
        switchMap((payload) => this.api.startMyWorkSession(payload)),
        finalize(() => this.actionLoading.set(false))
      )
      .subscribe({
        next: (s) => {
          this.open.set(s);
          this.refreshHistoryOnly();
        },
        error: (err) => {
          this.error.set(err?.error?.detail || 'Could not start shift');
        },
      });
  }

  endShift(): void {
    this.actionLoading.set(true);
    this.error.set(null);
    this.buildClockPayload()
      .pipe(
        switchMap((payload) => this.api.endMyWorkSession(payload)),
        finalize(() => this.actionLoading.set(false))
      )
      .subscribe({
        next: () => {
          this.open.set(null);
          this.refreshHistoryOnly();
        },
        error: (err) => {
          this.error.set(err?.error?.detail || 'Could not end shift');
        },
      });
  }

  startBreak(): void {
    this.actionLoading.set(true);
    this.error.set(null);
    this.api.startMyWorkSessionBreak().subscribe({
      next: (s) => {
        this.open.set(s);
        this.actionLoading.set(false);
        this.refreshHistoryOnly();
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.error.set(err?.error?.detail || 'Could not start break');
      },
    });
  }

  endBreak(): void {
    this.actionLoading.set(true);
    this.error.set(null);
    this.buildClockPayload()
      .pipe(
        switchMap((payload) => this.api.endMyWorkSessionBreak(payload)),
        finalize(() => this.actionLoading.set(false))
      )
      .subscribe({
        next: (s) => {
          this.open.set(s);
          this.refreshHistoryOnly();
        },
        error: (err) => {
          const d = err?.error?.detail;
          this.error.set(
            typeof d === 'string' && d.toLowerCase().includes('qr')
              ? 'Scan the venue QR code (or use the staff link with the token) to end your break.'
              : d || 'Could not end break'
          );
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
