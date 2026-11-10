import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import {
  ApiService,
  NewsletterAudienceResponse,
  NewsletterAudienceSource,
  NewsletterCampaignPublic,
} from '../services/api.service';

@Component({
  selector: 'app-newsletter-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="section" data-testid="settings-newsletter-section">
      <div class="section-header">
        <h2>{{ 'SETTINGS.NEWSLETTER_TITLE' | translate }}</h2>
        <p>{{ 'SETTINGS.NEWSLETTER_SUBTITLE' | translate }}</p>
      </div>

      @if (feedbackKey(); as fk) {
        <div
          class="feedback-banner"
          [class.feedback-banner--error]="feedbackError()"
          role="status"
        >
          {{ fk | translate: feedbackParams() }}
        </div>
      }

      @if (loading()) {
        <p class="hint">{{ 'COMMON.LOADING' | translate }}</p>
      } @else {
        <section class="nl-card" aria-labelledby="newsletter-audience-heading">
          <header class="nl-card-header">
            <h3 id="newsletter-audience-heading">{{ 'SETTINGS.NEWSLETTER_AUDIENCE' | translate }}</h3>
            <p class="nl-card-desc">{{ 'SETTINGS.NEWSLETTER_AUDIENCE_DESC' | translate }}</p>
          </header>
          <div class="audience-row">
            <label class="radio">
              <input type="radio" name="audience" value="billing_customers" [(ngModel)]="audienceSource" />
              {{ 'SETTINGS.NEWSLETTER_AUD_BILLING' | translate }} ({{ audience()?.billing_customers ?? 0 }})
            </label>
            <label class="radio">
              <input type="radio" name="audience" value="reservations" [(ngModel)]="audienceSource" />
              {{ 'SETTINGS.NEWSLETTER_AUD_RESERVATIONS' | translate }} ({{ audience()?.reservations ?? 0 }})
            </label>
            <label class="radio">
              <input type="radio" name="audience" value="both" [(ngModel)]="audienceSource" />
              {{ 'SETTINGS.NEWSLETTER_AUD_BOTH' | translate }} ({{ audience()?.both ?? 0 }})
            </label>
          </div>
          <p class="hint">{{ 'SETTINGS.NEWSLETTER_RATE_HINT' | translate }}</p>
        </section>

        <section class="nl-card" aria-labelledby="newsletter-compose-heading">
          <header class="nl-card-header">
            <h3 id="newsletter-compose-heading">{{ 'SETTINGS.NEWSLETTER_COMPOSE' | translate }}</h3>
            <p class="nl-card-desc">{{ 'SETTINGS.NEWSLETTER_COMPOSE_DESC' | translate }}</p>
          </header>

          <div class="form-group">
            <label for="nl-subject">{{ 'SETTINGS.NEWSLETTER_SUBJECT' | translate }}</label>
            <input id="nl-subject" type="text" [(ngModel)]="subject" maxlength="200" data-testid="newsletter-subject" />
          </div>
          <div class="form-group">
            <label for="nl-body">{{ 'SETTINGS.NEWSLETTER_BODY_HTML' | translate }}</label>
            <textarea
              id="nl-body"
              rows="10"
              [(ngModel)]="bodyHtml"
              data-testid="newsletter-body"
              [attr.placeholder]="'SETTINGS.NEWSLETTER_BODY_PLACEHOLDER' | translate"
            ></textarea>
            <p class="hint">{{ 'SETTINGS.NEWSLETTER_BODY_HINT' | translate }}</p>
          </div>
          <div class="form-group">
            <label for="nl-text">{{ 'SETTINGS.NEWSLETTER_BODY_TEXT' | translate }}</label>
            <textarea id="nl-text" rows="4" [(ngModel)]="bodyText"></textarea>
          </div>

          <label class="chk">
            <input type="checkbox" [(ngModel)]="consentConfirmed" data-testid="newsletter-consent" />
            {{ 'SETTINGS.NEWSLETTER_CONSENT' | translate }}
          </label>

          <div class="btn-row">
            <button
              type="button"
              class="btn btn-secondary"
              [disabled]="saving() || !canCompose()"
              (click)="sendTest()"
              data-testid="newsletter-test-send"
            >
              {{ 'SETTINGS.NEWSLETTER_TEST_SEND' | translate }}
            </button>
            <button
              type="button"
              class="btn btn-primary"
              [disabled]="saving() || !canSend()"
              (click)="sendCampaign()"
              data-testid="newsletter-send"
            >
              {{ 'SETTINGS.NEWSLETTER_SEND' | translate }}
            </button>
          </div>
        </section>

        <section class="nl-card" aria-labelledby="newsletter-history-heading">
          <header class="nl-card-header">
            <h3 id="newsletter-history-heading">{{ 'SETTINGS.NEWSLETTER_HISTORY' | translate }}</h3>
            <p class="nl-card-desc">{{ 'SETTINGS.NEWSLETTER_HISTORY_DESC' | translate }}</p>
          </header>
          @if (!campaigns().length) {
            <p class="hint">{{ 'SETTINGS.NEWSLETTER_NO_CAMPAIGNS' | translate }}</p>
          } @else {
            <div class="table-responsive">
              <table class="nl-table">
                <thead>
                  <tr>
                    <th>{{ 'SETTINGS.NEWSLETTER_COL_SUBJECT' | translate }}</th>
                    <th>{{ 'SETTINGS.NEWSLETTER_COL_STATUS' | translate }}</th>
                    <th>{{ 'SETTINGS.NEWSLETTER_COL_SENT' | translate }}</th>
                    <th>{{ 'SETTINGS.NEWSLETTER_COL_OPENS' | translate }}</th>
                    <th>{{ 'SETTINGS.NEWSLETTER_COL_CLICKS' | translate }}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of campaigns(); track c.id) {
                    <tr>
                      <td>{{ c.subject }}</td>
                      <td>{{ c.status }}</td>
                      <td>{{ c.sent_count }}/{{ c.recipient_count }}</td>
                      <td>{{ c.open_count }}</td>
                      <td>{{ c.click_count }}</td>
                      <td>
                        @if (c.status === 'queued' || c.status === 'sending') {
                          <button type="button" class="btn btn-secondary btn-sm" (click)="cancel(c)">
                            {{ 'COMMON.CANCEL' | translate }}
                          </button>
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
      .nl-card {
        margin-bottom: var(--space-5, 1.5rem);
        padding: var(--space-4, 1rem);
        border: 1px solid var(--color-border, #ddd);
        border-radius: var(--radius-md, 8px);
        background: var(--color-surface, #fff);
      }
      .nl-card-header h3 {
        margin: 0 0 0.25rem;
        font-size: 1.05rem;
      }
      .nl-card-desc,
      .hint {
        margin: 0 0 0.75rem;
        color: var(--color-text-muted, #666);
        font-size: 0.875rem;
      }
      .audience-row {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin-bottom: 0.75rem;
      }
      .radio,
      .chk {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        font-size: 0.9rem;
        cursor: pointer;
      }
      .chk {
        margin: 0.75rem 0 1rem;
      }
      .form-group {
        margin-bottom: 0.85rem;
      }
      .form-group label {
        display: block;
        margin-bottom: 0.35rem;
        font-size: 0.875rem;
        font-weight: 600;
      }
      .form-group input,
      .form-group textarea {
        width: 100%;
        max-width: 40rem;
        box-sizing: border-box;
      }
      .btn-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }
      .feedback-banner {
        padding: 0.75rem 1rem;
        margin-bottom: 1rem;
        border-radius: 6px;
        background: #e8f5e9;
        color: #1b5e20;
      }
      .feedback-banner--error {
        background: #ffebee;
        color: #b71c1c;
      }
      .table-responsive {
        overflow-x: auto;
      }
      .nl-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
      }
      .nl-table th,
      .nl-table td {
        text-align: left;
        padding: 0.5rem 0.65rem;
        border-bottom: 1px solid var(--color-border, #eee);
      }
      .btn-sm {
        padding: 0.25rem 0.6rem;
        font-size: 0.8rem;
      }
    `,
  ],
})
export class NewsletterSettingsComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly audience = signal<NewsletterAudienceResponse | null>(null);
  readonly campaigns = signal<NewsletterCampaignPublic[]>([]);
  readonly feedbackKey = signal<string | null>(null);
  readonly feedbackParams = signal<Record<string, string>>({});
  readonly feedbackError = signal(false);

  audienceSource: NewsletterAudienceSource = 'billing_customers';
  subject = '';
  bodyHtml = '';
  bodyText = '';
  consentConfirmed = false;

  ngOnInit(): void {
    this.reload();
    this.pollTimer = setInterval(() => this.refreshCampaigns(), 8000);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  canCompose(): boolean {
    return !!this.subject.trim() && !!this.bodyHtml.trim();
  }

  canSend(): boolean {
    return this.canCompose() && this.consentConfirmed;
  }

  private reload(): void {
    this.loading.set(true);
    forkJoin({
      audience: this.api.getNewsletterAudience(),
      campaigns: this.api.getNewsletterCampaigns(),
    }).subscribe({
      next: ({ audience, campaigns }) => {
        this.audience.set(audience);
        this.campaigns.set(campaigns);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.setFeedback('SETTINGS.NEWSLETTER_LOAD_ERROR', true);
      },
    });
  }

  private refreshCampaigns(): void {
    this.api.getNewsletterCampaigns().subscribe({
      next: (rows) => this.campaigns.set(rows),
      error: () => undefined,
    });
  }

  private setFeedback(
    key: string,
    isError: boolean,
    params: Record<string, string> = {}
  ): void {
    this.feedbackKey.set(key);
    this.feedbackParams.set(params);
    this.feedbackError.set(isError);
  }

  sendTest(): void {
    if (!this.canCompose()) return;
    this.saving.set(true);
    this.api
      .sendNewsletterTest({
        subject: this.subject.trim(),
        body_html: this.bodyHtml.trim(),
        body_text: this.bodyText.trim() || null,
      })
      .subscribe({
        next: (r) => {
          this.saving.set(false);
          this.setFeedback('SETTINGS.NEWSLETTER_TEST_OK', false, { email: r.to_email });
        },
        error: () => {
          this.saving.set(false);
          this.setFeedback('SETTINGS.NEWSLETTER_TEST_FAIL', true);
        },
      });
  }

  sendCampaign(): void {
    if (!this.canSend()) return;
    this.saving.set(true);
    this.api
      .createNewsletterCampaign({
        subject: this.subject.trim(),
        body_html: this.bodyHtml.trim(),
        body_text: this.bodyText.trim() || null,
        audience_source: this.audienceSource,
        consent_confirmed: true,
        send_now: true,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.setFeedback('SETTINGS.NEWSLETTER_QUEUED_OK', false);
          this.consentConfirmed = false;
          this.refreshCampaigns();
          this.api.getNewsletterAudience().subscribe({
            next: (a) => this.audience.set(a),
          });
        },
        error: () => {
          this.saving.set(false);
          this.setFeedback('SETTINGS.NEWSLETTER_SEND_FAIL', true);
        },
      });
  }

  cancel(c: NewsletterCampaignPublic): void {
    this.api.cancelNewsletterCampaign(c.id).subscribe({
      next: () => this.refreshCampaigns(),
      error: () => this.setFeedback('SETTINGS.NEWSLETTER_CANCEL_FAIL', true),
    });
  }
}
