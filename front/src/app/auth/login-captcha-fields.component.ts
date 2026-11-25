import { Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

/** Self-hosted login CAPTCHA fields (#452). Parent owns challenge state. */
@Component({
  selector: 'app-login-captcha-fields',
  standalone: true,
  imports: [FormsModule, TranslateModule],
  template: `
    <div class="form-group captcha-group" data-testid="login-captcha">
      <label for="captcha-answer">{{ 'AUTH.CAPTCHA_LABEL' | translate }}</label>
      <div class="captcha-row">
        @if (svgUrl()) {
          <img [src]="svgUrl()!" alt="CAPTCHA" class="captcha-img" width="160" height="48" />
        }
        <button
          type="button"
          class="captcha-refresh"
          (click)="refresh.emit()"
          [attr.aria-label]="'AUTH.CAPTCHA_REFRESH' | translate"
          [disabled]="disabled()"
        >
          {{ 'AUTH.CAPTCHA_REFRESH' | translate }}
        </button>
      </div>
      <input
        id="captcha-answer"
        type="text"
        name="captcha"
        autocomplete="off"
        autocapitalize="characters"
        spellcheck="false"
        maxlength="8"
        [ngModel]="answer()"
        (ngModelChange)="answer.set($event)"
        data-testid="login-captcha-answer"
        [placeholder]="'AUTH.CAPTCHA_PLACEHOLDER' | translate"
      />
    </div>
  `,
  styles: [
    `
      .form-group {
        margin-bottom: var(--space-4);
      }
      .form-group label {
        display: block;
        margin-bottom: var(--space-2);
        font-weight: 500;
        color: var(--color-text);
      }
      .form-group input {
        width: 100%;
        padding: var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        font-size: 1rem;
      }
      .captcha-row {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        margin-bottom: var(--space-2);
      }
      .captcha-img {
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-bg);
      }
      .captcha-refresh {
        background: transparent;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        color: var(--color-text-muted);
        font-size: 0.8125rem;
        padding: var(--space-2) var(--space-3);
        cursor: pointer;
      }
      .captcha-refresh:hover:not(:disabled) {
        background: var(--color-bg);
        color: var(--color-text);
      }
    `,
  ],
})
export class LoginCaptchaFieldsComponent {
  svgUrl = input<string | null>(null);
  disabled = input(false);
  answer = model('');
  refresh = output<void>();
}
