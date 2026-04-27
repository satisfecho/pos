import {
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import {
  ApiService,
  SocialCatalogRow,
  SocialConnectionPublic,
  SocialPostPublic,
} from '../services/api.service';

@Component({
  selector: 'app-social-posts-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="section" data-testid="settings-social-posts-section">
      <div class="section-header">
        <h2>{{ 'SETTINGS.SOCIAL_POSTS_TITLE' | translate }}</h2>
        <p>{{ 'SETTINGS.SOCIAL_POSTS_SUBTITLE' | translate }}</p>
      </div>

      @if (feedback()) {
        <div class="feedback-banner" [class.feedback-banner--error]="feedback() === 'oauth_error'" role="status">
          {{ feedbackKey() | translate }}
        </div>
      }

      @if (loading()) {
        <p class="hint">{{ 'COMMON.LOADING' | translate }}</p>
      } @else {
        <!-- Connected networks -->
        <section class="social-card" aria-labelledby="social-posts-networks-heading">
          <header class="social-card-header">
            <h3 id="social-posts-networks-heading">{{ 'SETTINGS.SOCIAL_POSTS_CONNECTIONS' | translate }}</h3>
            <p class="social-card-desc">{{ 'SETTINGS.SOCIAL_POSTS_SECTION_CONNECTIONS_DESC' | translate }}</p>
          </header>
          @if (catalog().length) {
            @for (row of catalog(); track row.provider_key) {
              <div class="provider-card">
                <div class="provider-head">
                  <div>
                    <h4>{{ row.display_name }}</h4>
                    @if (row.provider_key === 'meta') {
                      @if (metaConnection(); as mc) {
                        <p class="hint">
                          {{ 'SETTINGS.SOCIAL_POSTS_STATUS' | translate }}:
                          <strong>{{ mc.connection_status }}</strong>
                          @if (mc.meta_page_name) {
                            — {{ mc.meta_page_name }}
                          }
                        </p>
                        @if (mc.instagram_configured) {
                          <p class="hint">{{ 'SETTINGS.SOCIAL_POSTS_IG_LINKED' | translate }}</p>
                        } @else {
                          <p class="hint">{{ 'SETTINGS.SOCIAL_POSTS_IG_NOT_LINKED' | translate }}</p>
                        }
                      } @else {
                        <p class="hint">{{ 'SETTINGS.SOCIAL_POSTS_NOT_CONNECTED' | translate }}</p>
                      }
                    }
                  </div>
                  <div class="btn-row btn-row--wrap">
                    @if (row.provider_key === 'meta') {
                      <button type="button" class="btn btn-primary" (click)="connectMeta()">
                        {{ 'SETTINGS.SOCIAL_POSTS_CONNECT_META' | translate }}
                      </button>
                      @if (metaConnection()?.connection_status === 'connected') {
                        <button type="button" class="btn btn-secondary" (click)="disconnectMeta()">
                          {{ 'SETTINGS.SOCIAL_POSTS_DISCONNECT' | translate }}
                        </button>
                      }
                    }
                  </div>
                </div>
              </div>
            }
          }
        </section>

        <!-- Compose -->
        <section class="social-card" aria-labelledby="social-posts-compose-heading">
          <header class="social-card-header">
            <h3 id="social-posts-compose-heading">{{ 'SETTINGS.SOCIAL_POSTS_COMPOSE' | translate }}</h3>
            <p class="social-card-desc">{{ 'SETTINGS.SOCIAL_POSTS_SECTION_COMPOSE_DESC' | translate }}</p>
          </header>

          <div class="form-group">
            <span class="social-image-field-label">{{ 'SETTINGS.SOCIAL_POSTS_IMAGE' | translate }}</span>
            <input
              #composeFileInput
              id="social-posts-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              (change)="onFile($event)"
              style="display: none"
            />
            <div class="image-upload-row social-compose-upload-row">
              <button
                type="button"
                class="btn btn-secondary"
                (click)="composeFileInput.click()"
                [attr.aria-describedby]="'social-posts-image-hint'"
              >
                {{
                  selectedFile
                    ? ('SETTINGS.SOCIAL_POSTS_CHANGE_IMAGE' | translate)
                    : ('SETTINGS.SOCIAL_POSTS_SELECT_IMAGE' | translate)
                }}
              </button>
              @if (selectedFile) {
                <span class="pending-file-name">{{ selectedFile.name }}</span>
              }
            </div>
            @if (previewUrl()) {
              <div class="image-preview" data-testid="social-posts-image-preview">
                <img
                  [src]="previewUrl()!"
                  [attr.alt]="'SETTINGS.SOCIAL_POSTS_IMAGE_PREVIEW_ALT' | translate"
                />
                <button
                  type="button"
                  class="btn btn-sm btn-secondary image-preview__clear"
                  (click)="clearSelectedFile()"
                >
                  {{ 'SETTINGS.SOCIAL_POSTS_REMOVE_IMAGE' | translate }}
                </button>
              </div>
            }
            <p class="hint" id="social-posts-image-hint">{{ 'SETTINGS.SOCIAL_POSTS_IMAGE_HINT' | translate }}</p>
          </div>

          <div class="form-group">
            <label for="social-posts-caption">{{ 'SETTINGS.SOCIAL_POSTS_CAPTION' | translate }}</label>
            <textarea
              id="social-posts-caption"
              class="caption-area"
              rows="6"
              [(ngModel)]="caption"
              name="socCap"
              aria-describedby="social-posts-caption-hint"
            ></textarea>
            <p class="hint" id="social-posts-caption-hint">{{ 'SETTINGS.SOCIAL_POSTS_CAPTION_HINT' | translate }}</p>
          </div>

          <fieldset class="channel-fieldset">
            <legend class="channel-legend">{{ 'SETTINGS.SOCIAL_POSTS_CHANNELS_LABEL' | translate }}</legend>
            <p class="hint channel-fieldset__hint">{{ 'SETTINGS.SOCIAL_POSTS_CHANNELS_HINT' | translate }}</p>
            <div class="chk-row">
              <label class="chk">
                <input type="checkbox" [(ngModel)]="channelsPage" name="chPage" />
                <span>{{ 'SETTINGS.SOCIAL_POSTS_CH_PAGE' | translate }}</span>
              </label>
              <label class="chk" [class.chk--disabled]="!igAvailable()">
                <input
                  type="checkbox"
                  [(ngModel)]="channelsIg"
                  name="chIg"
                  [disabled]="!igAvailable()"
                  [attr.aria-disabled]="!igAvailable() ? 'true' : null"
                />
                <span>{{ 'SETTINGS.SOCIAL_POSTS_CH_IG' | translate }}</span>
              </label>
            </div>
          </fieldset>

          <div class="schedule-block">
            <div class="publish-now-inline">
              <input
                type="checkbox"
                id="social-posts-publish-now"
                [(ngModel)]="publishNow"
                name="pubNow"
              />
              <label for="social-posts-publish-now">{{ 'SETTINGS.SOCIAL_POSTS_PUBLISH_NOW' | translate }}</label>
            </div>
            @if (!publishNow) {
              <div class="form-group schedule-datetime-field">
                <label for="social-posts-schedule">{{ 'SETTINGS.SOCIAL_POSTS_SCHEDULE_AT' | translate }}</label>
                <input
                  id="social-posts-schedule"
                  type="datetime-local"
                  [(ngModel)]="scheduleLocal"
                  name="schedLoc"
                />
                <p class="hint" id="social-posts-schedule-hint">{{ 'SETTINGS.SOCIAL_POSTS_SCHEDULE_HINT' | translate }}</p>
              </div>
            }
          </div>

          <div class="form-actions">
            <button
              type="button"
              class="btn btn-primary"
              [disabled]="saving() || !canSubmit()"
              (click)="submit()"
            >
              {{ saving() ? ('COMMON.SAVING' | translate) : ('SETTINGS.SOCIAL_POSTS_SUBMIT' | translate) }}
            </button>
            @if (!saving() && !canSubmit()) {
              <p class="hint submit-hint" role="note">{{ 'SETTINGS.SOCIAL_POSTS_SUBMIT_DISABLED_HINT' | translate }}</p>
            }
          </div>
        </section>

        <!-- History -->
        <section class="social-card social-card--history" aria-labelledby="social-posts-history-heading">
          <header class="social-card-header">
            <h3 id="social-posts-history-heading">{{ 'SETTINGS.SOCIAL_POSTS_HISTORY' | translate }}</h3>
            <p class="social-card-desc">{{ 'SETTINGS.SOCIAL_POSTS_SECTION_HISTORY_DESC' | translate }}</p>
          </header>
          @if (!posts().length) {
            <p class="hint">{{ 'SETTINGS.SOCIAL_POSTS_NO_POSTS' | translate }}</p>
          } @else {
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>{{ 'SETTINGS.SOCIAL_POSTS_COL_TIME' | translate }}</th>
                    <th>{{ 'SETTINGS.SOCIAL_POSTS_COL_STATUS' | translate }}</th>
                    <th>{{ 'SETTINGS.SOCIAL_POSTS_COL_CHANNELS' | translate }}</th>
                    <th>{{ 'SETTINGS.SOCIAL_POSTS_COL_PREVIEW' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of posts(); track p.id) {
                    <tr>
                      <td>{{ shortIso(p.schedule_at) }}</td>
                      <td>
                        <span class="mono">{{ p.status }}</span>
                        @if (p.error_message) {
                          <span class="bad">{{ shortText(p.error_message, 80) }}</span>
                        }
                      </td>
                      <td>
                        @for (t of p.targets; track t.channel_key) {
                          <div class="mono small">{{ t.channel_key }}: {{ t.status }}</div>
                        }
                      </td>
                      <td>
                        @if (p.image_url) {
                          <img [src]="p.image_url" alt="" class="thumb" />
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      }
    </div>
  `,
  styles: [
    `
      .feedback-banner {
        padding: var(--space-3) var(--space-4);
        margin-bottom: var(--space-4);
        border-radius: var(--radius-md);
        border: 1px solid var(--color-border);
        background: var(--color-success-light);
        color: var(--color-text);
        font-size: 0.875rem;
      }
      .feedback-banner--error {
        background: rgba(220, 38, 38, 0.08);
        border-color: rgba(220, 38, 38, 0.35);
        color: var(--color-text);
      }

      .social-card {
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-surface);
        box-shadow: var(--shadow-sm);
        padding: var(--space-4);
        margin-bottom: var(--space-5);
      }
      .social-card--history {
        margin-bottom: 0;
      }

      .social-card-header h3 {
        margin: 0 0 var(--space-2) 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--color-text);
      }
      .social-card-desc {
        color: var(--color-text-muted);
        font-size: 0.8125rem;
        margin: 0 0 var(--space-4) 0;
        line-height: 1.45;
      }

      .provider-card {
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: var(--space-4);
        margin-bottom: var(--space-3);
        background: var(--color-bg);
      }
      .provider-card:last-child {
        margin-bottom: 0;
      }
      .provider-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--space-4);
        flex-wrap: wrap;
      }
      .provider-head h4 {
        margin: 0 0 var(--space-2) 0;
        font-size: 0.9375rem;
        font-weight: 600;
      }

      .btn-row {
        display: flex;
        gap: var(--space-3);
        align-items: center;
      }
      .btn-row--wrap {
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .social-image-field-label {
        display: block;
        margin-bottom: var(--space-2);
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--color-text);
      }

      .social-compose-upload-row {
        margin-bottom: var(--space-2);
      }

      .caption-area {
        min-height: 140px;
        line-height: 1.5;
      }

      .image-preview {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-2);
        padding: var(--space-3);
        border: 1px dashed var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-bg);
        max-width: 280px;
      }
      .image-preview img {
        max-width: 100%;
        max-height: 200px;
        object-fit: contain;
        border-radius: var(--radius-sm);
      }
      .image-preview__clear {
        align-self: stretch;
      }

      .channel-fieldset {
        border: none;
        padding: 0;
        margin: 0 0 var(--space-4) 0;
      }
      .channel-legend {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--color-text);
        padding: 0;
        margin-bottom: var(--space-1);
      }
      .channel-fieldset__hint {
        margin-bottom: var(--space-3);
      }
      .chk-row {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-4);
      }
      .chk {
        display: flex;
        align-items: flex-start;
        gap: var(--space-2);
        cursor: pointer;
        font-size: 0.875rem;
      }
      .chk input {
        margin-top: 0.2rem;
      }
      .chk--disabled {
        opacity: 0.65;
      }

      .schedule-block {
        margin-bottom: var(--space-4);
      }

      .publish-now-inline {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        margin-bottom: var(--space-3);
      }

      .publish-now-inline input[type='checkbox'] {
        width: auto;
        min-height: unset;
        margin: 0;
        padding: 0;
        flex-shrink: 0;
        cursor: pointer;
      }

      .publish-now-inline label {
        margin: 0;
        font-size: 0.875rem;
        font-weight: 400;
        color: var(--color-text);
        cursor: pointer;
      }

      .schedule-datetime-field {
        margin-bottom: 0;
      }

      .form-actions {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-2);
      }

      .submit-hint {
        max-width: 36rem;
      }

      .table-responsive {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      .thumb {
        max-width: 72px;
        max-height: 72px;
        object-fit: cover;
        border-radius: var(--radius-sm);
      }
      .small {
        font-size: 0.85rem;
      }
      .bad {
        color: var(--danger, #c62828);
      }
      .mono {
        font-family: ui-monospace, monospace;
      }
    `,
  ],
})
export class SocialPostsSettingsComponent implements OnInit, OnDestroy {
  shortIso(s: string): string {
    return (s || '').slice(0, 16).replace('T', ' ');
  }

  shortText(s: string | null, n: number): string {
    if (!s) return '';
    return s.length <= n ? s : s.slice(0, n) + '…';
  }

  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  @ViewChild('composeFileInput') composeFileInput?: ElementRef<HTMLInputElement>;

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly catalog = signal<SocialCatalogRow[]>([]);
  readonly connections = signal<SocialConnectionPublic[]>([]);
  readonly posts = signal<SocialPostPublic[]>([]);
  readonly feedback = signal<string | null>(null);
  readonly previewUrl = signal<string | null>(null);

  private previewObjectUrl: string | null = null;

  caption = '';
  channelsPage = true;
  channelsIg = false;
  publishNow = true;
  scheduleLocal = '';
  selectedFile: File | null = null;

  readonly metaConnection = computed(() =>
    this.connections().find((c) => c.provider_key === 'meta')
  );

  readonly igAvailable = computed(() => this.metaConnection()?.instagram_configured === true);

  readonly feedbackKey = computed(() => {
    const f = this.feedback();
    if (f === 'connected') return 'SETTINGS.SOCIAL_POSTS_FEEDBACK_CONNECTED';
    if (f === 'oauth_error') return 'SETTINGS.SOCIAL_POSTS_FEEDBACK_OAUTH_ERROR';
    if (f === 'configure_meta') return 'SETTINGS.SOCIAL_POSTS_FEEDBACK_CONFIGURE';
    return 'COMMON.ERROR';
  });

  ngOnInit(): void {
    this.reloadAll();
    const p = this.router.parseUrl(this.router.url).queryParams;
    const o = p['socialOAuth'];
    if (o === 'success') {
      this.feedback.set('connected');
    } else if (o === 'error') {
      this.feedback.set('oauth_error');
    }
    if (o) {
      const q = { ...p };
      delete q['socialOAuth'];
      delete q['reason'];
      void this.router.navigate(['/settings'], { queryParams: q, replaceUrl: true });
    }
  }

  ngOnDestroy(): void {
    this.revokePreviewUrl();
  }

  private revokePreviewUrl(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
    this.previewUrl.set(null);
  }

  onFile(ev: Event): void {
    this.revokePreviewUrl();
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    this.selectedFile = f ?? null;
    if (f) {
      this.previewObjectUrl = URL.createObjectURL(f);
      this.previewUrl.set(this.previewObjectUrl);
    }
  }

  clearSelectedFile(): void {
    this.revokePreviewUrl();
    this.selectedFile = null;
    const el = this.composeFileInput?.nativeElement;
    if (el) el.value = '';
  }

  connectMeta(): void {
    this.api.postSocialMetaAuthorizeUrl().subscribe({
      next: (r) => {
        window.location.href = r.authorize_url;
      },
      error: () => this.feedback.set('configure_meta'),
    });
  }

  disconnectMeta(): void {
    this.api.disconnectSocialProvider('meta').subscribe({
      next: () => this.reloadAll(),
    });
  }

  canSubmit(): boolean {
    if (this.metaConnection()?.connection_status !== 'connected') return false;
    if (!this.selectedFile) return false;
    const ch: string[] = [];
    if (this.channelsPage) ch.push('meta_page');
    if (this.channelsIg) ch.push('meta_instagram');
    if (!ch.length) return false;
    if (!this.publishNow) {
      if (!this.scheduleLocal?.trim()) return false;
      const d = new Date(this.scheduleLocal);
      if (Number.isNaN(d.getTime())) return false;
    }
    return true;
  }

  submit(): void {
    const ch: string[] = [];
    if (this.channelsPage) ch.push('meta_page');
    if (this.channelsIg) ch.push('meta_instagram');
    if (!this.selectedFile || !ch.length) return;

    let scheduleIso: string | undefined;
    if (!this.publishNow && this.scheduleLocal) {
      const d = new Date(this.scheduleLocal);
      if (!Number.isNaN(d.getTime())) {
        scheduleIso = d.toISOString();
      }
    }

    this.saving.set(true);
    this.api
      .createSocialPost({
        caption: this.caption,
        channels: ch,
        publishNow: this.publishNow,
        scheduleAtIso: scheduleIso,
        image: this.selectedFile,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.caption = '';
          this.clearSelectedFile();
          this.reloadPosts();
        },
        error: () => this.saving.set(false),
      });
  }

  reloadAll(): void {
    this.loading.set(true);
    forkJoin({
      catalog: this.api.getSocialCatalog(),
      connections: this.api.getSocialConnections(),
    }).subscribe({
      next: ({ catalog: c, connections: x }) => {
        this.catalog.set(c);
        this.connections.set(x);
        this.loading.set(false);
      },
      error: () => {
        this.catalog.set([]);
        this.connections.set([]);
        this.loading.set(false);
      },
    });
    this.reloadPosts();
  }

  reloadPosts(): void {
    this.api.getSocialPosts(80).subscribe({
      next: (p) => this.posts.set(p),
      error: () => this.posts.set([]),
    });
  }
}
