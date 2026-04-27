import { Component, computed, inject, OnInit, signal } from '@angular/core';
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
        <p class="hint" [class.bad]="feedback() === 'oauth_error'">
          {{ feedbackKey() | translate }}
        </p>
      }

      @if (loading()) {
        <p class="hint">{{ 'COMMON.LOADING' | translate }}</p>
      } @else {
        <div class="subsection">
          <h3>{{ 'SETTINGS.SOCIAL_POSTS_CONNECTIONS' | translate }}</h3>
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
                  <div class="btn-row">
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
        </div>

        <div class="subsection">
          <h3>{{ 'SETTINGS.SOCIAL_POSTS_COMPOSE' | translate }}</h3>
          <label>
            <span>{{ 'SETTINGS.SOCIAL_POSTS_IMAGE' | translate }}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" (change)="onFile($event)" />
          </label>
          <label>
            <span>{{ 'SETTINGS.SOCIAL_POSTS_CAPTION' | translate }}</span>
            <textarea rows="4" [(ngModel)]="caption" name="socCap"></textarea>
          </label>
          <div class="chk-row">
            <label class="chk">
              <input type="checkbox" [(ngModel)]="channelsPage" name="chPage" />
              <span>{{ 'SETTINGS.SOCIAL_POSTS_CH_PAGE' | translate }}</span>
            </label>
            <label class="chk">
              <input
                type="checkbox"
                [(ngModel)]="channelsIg"
                name="chIg"
                [disabled]="!igAvailable()"
              />
              <span>{{ 'SETTINGS.SOCIAL_POSTS_CH_IG' | translate }}</span>
            </label>
          </div>
          <label class="chk">
            <input type="checkbox" [(ngModel)]="publishNow" name="pubNow" />
            <span>{{ 'SETTINGS.SOCIAL_POSTS_PUBLISH_NOW' | translate }}</span>
          </label>
          @if (!publishNow) {
            <label>
              <span>{{ 'SETTINGS.SOCIAL_POSTS_SCHEDULE_AT' | translate }}</span>
              <input type="datetime-local" [(ngModel)]="scheduleLocal" name="schedLoc" />
            </label>
          }
          <div class="btn-row">
            <button type="button" class="btn btn-primary" [disabled]="saving() || !canSubmit()" (click)="submit()">
              {{ saving() ? ('COMMON.SAVING' | translate) : ('SETTINGS.SOCIAL_POSTS_SUBMIT' | translate) }}
            </button>
          </div>
        </div>

        <div class="subsection">
          <h3>{{ 'SETTINGS.SOCIAL_POSTS_HISTORY' | translate }}</h3>
          @if (!posts().length) {
            <p class="hint">{{ 'SETTINGS.SOCIAL_POSTS_NO_POSTS' | translate }}</p>
          } @else {
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
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .subsection {
        margin-bottom: 2rem;
      }
      .chk-row {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin: 0.75rem 0;
      }
      .thumb {
        max-width: 72px;
        max-height: 72px;
        object-fit: cover;
        border-radius: 6px;
      }
      .small {
        font-size: 0.85rem;
      }
      .bad {
        color: var(--danger, #c62828);
      }
    `,
  ],
})
export class SocialPostsSettingsComponent implements OnInit {
  shortIso(s: string): string {
    return (s || '').slice(0, 16).replace('T', ' ');
  }

  shortText(s: string | null, n: number): string {
    if (!s) return '';
    return s.length <= n ? s : s.slice(0, n) + '…';
  }

  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly catalog = signal<SocialCatalogRow[]>([]);
  readonly connections = signal<SocialConnectionPublic[]>([]);
  readonly posts = signal<SocialPostPublic[]>([]);
  readonly feedback = signal<string | null>(null);

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

  onFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    this.selectedFile = f ?? null;
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
    const ch: string[] = [];
    if (this.channelsPage) ch.push('meta_page');
    if (this.channelsIg) ch.push('meta_instagram');
    return !!(this.selectedFile && ch.length && this.metaConnection()?.connection_status === 'connected');
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
          this.selectedFile = null;
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
