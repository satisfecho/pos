import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  ApiService,
  PlatformFeatureDigestAudience,
  PlatformFeatureDigestCampaign,
  PlatformMailSettings,
} from '../services/api.service';

@Component({
  selector: 'app-platform-feature-digest',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslateModule],
  template: `
    <div class="platform-page">
      <header class="platform-header">
        <div>
          <p class="platform-back">
            <a routerLink="/platform">{{ 'PLATFORM_DIGEST.BACK' | translate }}</a>
          </p>
          <h1>{{ 'PLATFORM_DIGEST.TITLE' | translate }}</h1>
          <p class="platform-subtitle">{{ 'PLATFORM_DIGEST.SUBTITLE' | translate }}</p>
        </div>
      </header>

      @if (loadError(); as errKey) {
        <p class="platform-error">{{ errKey | translate }}</p>
      }

      <section class="digest-section">
        <h2>{{ 'PLATFORM_DIGEST.SETTINGS_TITLE' | translate }}</h2>
        <p class="hint">{{ 'PLATFORM_DIGEST.SETTINGS_HINT' | translate }}</p>
        <div class="form-grid">
          <label>
            <span>{{ 'PLATFORM_DIGEST.LOCALE' | translate }}</span>
            <select [(ngModel)]="locale" name="locale">
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
              <option value="fr">Français</option>
              <option value="ca">Català</option>
            </select>
          </label>
          <label>
            <span>{{ 'PLATFORM_DIGEST.SMTP_HOST' | translate }}</span>
            <input type="text" [(ngModel)]="smtpHost" name="smtp_host" />
          </label>
          <label>
            <span>{{ 'PLATFORM_DIGEST.SMTP_PORT' | translate }}</span>
            <input type="number" [(ngModel)]="smtpPort" name="smtp_port" min="1" max="65535" />
          </label>
          <label class="check">
            <input type="checkbox" [(ngModel)]="smtpUseTls" name="smtp_use_tls" />
            <span>{{ 'PLATFORM_DIGEST.SMTP_TLS' | translate }}</span>
          </label>
          <label>
            <span>{{ 'PLATFORM_DIGEST.SMTP_USER' | translate }}</span>
            <input type="text" [(ngModel)]="smtpUser" name="smtp_user" autocomplete="off" />
          </label>
          <label>
            <span>{{ 'PLATFORM_DIGEST.SMTP_PASSWORD' | translate }}</span>
            <input
              type="password"
              [(ngModel)]="smtpPassword"
              name="smtp_password"
              autocomplete="new-password"
              [placeholder]="
                (smtpPasswordSet()
                  ? 'PLATFORM_DIGEST.SMTP_PASSWORD_SET'
                  : 'PLATFORM_DIGEST.SMTP_PASSWORD_PLACEHOLDER'
                ) | translate
              "
            />
          </label>
          <label>
            <span>{{ 'PLATFORM_DIGEST.EMAIL_FROM' | translate }}</span>
            <input type="email" [(ngModel)]="emailFrom" name="email_from" />
          </label>
          <label>
            <span>{{ 'PLATFORM_DIGEST.EMAIL_FROM_NAME' | translate }}</span>
            <input type="text" [(ngModel)]="emailFromName" name="email_from_name" />
          </label>
        </div>
        <p class="smtp-status">
          {{
            (smtpConfigured()
              ? 'PLATFORM_DIGEST.SMTP_OK'
              : 'PLATFORM_DIGEST.SMTP_MISSING'
            ) | translate
          }}
        </p>
        <button type="button" class="btn-primary" [disabled]="savingSettings()" (click)="saveSettings()">
          {{ 'COMMON.SAVE' | translate }}
        </button>
        @if (settingsMsg(); as sMsg) {
          <p class="flash">{{ sMsg | translate }}</p>
        }
      </section>

      <section class="digest-section">
        <h2>{{ 'PLATFORM_DIGEST.AUDIENCE_TITLE' | translate }}</h2>
        <p>
          {{ 'PLATFORM_DIGEST.AUDIENCE_COUNT' | translate: { count: audience()?.subscribed_owners ?? 0 } }}
        </p>
        @if (audience()?.sample_emails?.length) {
          <p class="hint">{{ 'PLATFORM_DIGEST.AUDIENCE_SAMPLE' | translate }}: {{ audience()!.sample_emails.join(', ') }}</p>
        }
      </section>

      <section class="digest-section">
        <h2>{{ 'PLATFORM_DIGEST.COMPOSE_TITLE' | translate }}</h2>
        <p class="hint">{{ 'PLATFORM_DIGEST.COMPOSE_HINT' | translate }}</p>
        <label class="full">
          <span>{{ 'PLATFORM_DIGEST.SUBJECT' | translate }}</span>
          <input type="text" [(ngModel)]="subject" name="subject" maxlength="200" />
        </label>
        <label class="full">
          <span>{{ 'PLATFORM_DIGEST.BODY_HTML' | translate }}</span>
          <textarea [(ngModel)]="bodyHtml" name="body_html" rows="10"></textarea>
        </label>
        <button type="button" class="btn-primary" [disabled]="sending()" (click)="sendCampaign()">
          {{ 'PLATFORM_DIGEST.SEND_NOW' | translate }}
        </button>
        @if (sendMsg(); as qMsg) {
          <p class="flash">{{ qMsg | translate }}</p>
        }
      </section>

      <section class="digest-section">
        <h2>{{ 'PLATFORM_DIGEST.CAMPAIGNS_TITLE' | translate }}</h2>
        @if (!campaigns().length) {
          <p class="hint">{{ 'PLATFORM_DIGEST.CAMPAIGNS_EMPTY' | translate }}</p>
        } @else {
          <table class="campaigns">
            <thead>
              <tr>
                <th>{{ 'PLATFORM_DIGEST.COL_ID' | translate }}</th>
                <th>{{ 'PLATFORM_DIGEST.COL_SUBJECT' | translate }}</th>
                <th>{{ 'PLATFORM_DIGEST.COL_STATUS' | translate }}</th>
                <th>{{ 'PLATFORM_DIGEST.COL_SENT' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (c of campaigns(); track c.id) {
                <tr>
                  <td>{{ c.id }}</td>
                  <td>{{ c.subject }}</td>
                  <td>{{ c.status }}</td>
                  <td>{{ c.sent_count }}/{{ c.recipient_count }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    </div>
  `,
  styles: [
    `
      .platform-page {
        max-width: 960px;
        margin: 0 auto;
        padding: 1.5rem 1.25rem 3rem;
        color: #1a1a1a;
      }
      .platform-header h1 {
        font-size: 1.5rem;
        font-weight: 600;
        margin: 0.25rem 0;
      }
      .platform-subtitle,
      .hint {
        color: #555;
        margin: 0.35rem 0 0;
        font-size: 0.95rem;
      }
      .platform-back a {
        color: #0b5fff;
        text-decoration: none;
        font-size: 0.9rem;
      }
      .platform-error {
        color: #b00020;
      }
      .digest-section {
        margin-top: 1.75rem;
        padding-top: 1rem;
        border-top: 1px solid #e5e5e5;
      }
      .digest-section h2 {
        font-size: 1.1rem;
        margin: 0 0 0.5rem;
      }
      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 0.75rem 1rem;
        margin: 0.75rem 0 1rem;
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.85rem;
      }
      label.full {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        margin: 0.5rem 0;
      }
      label.check {
        flex-direction: row;
        align-items: center;
        gap: 0.5rem;
        margin-top: 1.4rem;
      }
      input,
      select,
      textarea {
        padding: 0.45rem 0.55rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        font: inherit;
      }
      .btn-primary {
        margin-top: 0.5rem;
        background: #0b5fff;
        color: #fff;
        border: none;
        border-radius: 4px;
        padding: 0.5rem 1rem;
        cursor: pointer;
      }
      .btn-primary:disabled {
        opacity: 0.6;
        cursor: default;
      }
      .flash {
        margin-top: 0.5rem;
        color: #0a7a32;
      }
      .smtp-status {
        font-size: 0.9rem;
        color: #444;
      }
      .campaigns {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.9rem;
      }
      .campaigns th,
      .campaigns td {
        text-align: left;
        padding: 0.4rem 0.5rem;
        border-bottom: 1px solid #eee;
      }
    `,
  ],
})
export class PlatformFeatureDigestComponent implements OnInit {
  private readonly api = inject(ApiService);

  audience = signal<PlatformFeatureDigestAudience | null>(null);
  campaigns = signal<PlatformFeatureDigestCampaign[]>([]);
  loadError = signal<string | null>(null);
  savingSettings = signal(false);
  sending = signal(false);
  settingsMsg = signal<string | null>(null);
  sendMsg = signal<string | null>(null);
  smtpConfigured = signal(false);
  smtpPasswordSet = signal(false);

  locale = 'en';
  smtpHost = '';
  smtpPort: number | null = 587;
  smtpUseTls = true;
  smtpUser = '';
  smtpPassword = '';
  emailFrom = '';
  emailFromName = '';
  subject = '';
  bodyHtml = '';

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loadError.set(null);
    this.api.getPlatformFeatureDigestSettings().subscribe({
      next: (s) => this.applySettings(s),
      error: () => this.loadError.set('PLATFORM_DIGEST.LOAD_FAILED'),
    });
    this.api.getPlatformFeatureDigestAudience().subscribe({
      next: (a) => this.audience.set(a),
      error: () => this.loadError.set('PLATFORM_DIGEST.LOAD_FAILED'),
    });
    this.api.getPlatformFeatureDigestCampaigns().subscribe({
      next: (c) => this.campaigns.set(c),
      error: () => undefined,
    });
  }

  private applySettings(s: PlatformMailSettings): void {
    this.locale = s.locale || 'en';
    this.smtpHost = s.smtp_host || '';
    this.smtpPort = s.smtp_port ?? 587;
    this.smtpUseTls = s.smtp_use_tls ?? true;
    this.smtpUser = s.smtp_user || '';
    this.smtpPassword = '';
    this.emailFrom = s.email_from || '';
    this.emailFromName = s.email_from_name || '';
    this.smtpConfigured.set(!!s.smtp_configured);
    this.smtpPasswordSet.set(!!s.smtp_password_set);
  }

  saveSettings(): void {
    this.savingSettings.set(true);
    this.settingsMsg.set(null);
    const body: Partial<PlatformMailSettings> & { smtp_password?: string; clear_smtp_password?: boolean } = {
      locale: this.locale,
      smtp_host: this.smtpHost || null,
      smtp_port: this.smtpPort,
      smtp_use_tls: this.smtpUseTls,
      smtp_user: this.smtpUser || null,
      email_from: this.emailFrom || null,
      email_from_name: this.emailFromName || null,
    };
    if (this.smtpPassword.trim()) {
      body.smtp_password = this.smtpPassword;
    }
    this.api.updatePlatformFeatureDigestSettings(body).subscribe({
      next: (s) => {
        this.applySettings(s);
        this.savingSettings.set(false);
        this.settingsMsg.set('PLATFORM_DIGEST.SAVED');
      },
      error: () => {
        this.savingSettings.set(false);
        this.settingsMsg.set('PLATFORM_DIGEST.SAVE_FAILED');
      },
    });
  }

  sendCampaign(): void {
    this.sendMsg.set(null);
    if (!this.subject.trim() || !this.bodyHtml.trim()) {
      this.sendMsg.set('PLATFORM_DIGEST.SUBJECT_BODY_REQUIRED');
      return;
    }
    this.sending.set(true);
    this.api
      .createPlatformFeatureDigestCampaign({
        subject: this.subject.trim(),
        body_html: this.bodyHtml.trim(),
        send_now: true,
      })
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.sendMsg.set('PLATFORM_DIGEST.QUEUED');
          this.subject = '';
          this.bodyHtml = '';
          this.reload();
        },
        error: () => {
          this.sending.set(false);
          this.sendMsg.set('PLATFORM_DIGEST.SEND_FAILED');
        },
      });
  }
}
