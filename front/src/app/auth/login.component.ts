import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { LanguagePickerComponent } from '../shared/language-picker.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, RouterLink, TranslateModule, LanguagePickerComponent],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-header-row">
            <div>
              <h1>{{ 'AUTH.WELCOME_BACK' | translate }}</h1>
              <p>{{ 'AUTH.SIGN_IN_ACCOUNT' | translate }}</p>
            </div>
            <app-language-picker></app-language-picker>
          </div>
        </div>

        @if (showOtpStep()) {
          <p class="otp-prompt">{{ 'AUTH.OTP_ENTER_CODE' | translate }}</p>
          <form (ngSubmit)="onSubmitOtp()">
            <div class="form-group">
              <label for="otp-code">{{ 'AUTH.OTP_CODE' | translate }}</label>
              <input 
                id="otp-code" 
                type="text" 
                inputmode="numeric" 
                pattern="[0-9]*" 
                maxlength="6"
                [(ngModel)]="otpCode" 
                name="otpCode"
                [placeholder]="'AUTH.OTP_CODE_PLACEHOLDER' | translate"
                autocomplete="one-time-code"
              >
            </div>
            @if (error()) {
              <div class="error-banner">{{ error() }}</div>
            }
            <button type="submit" class="btn-submit" [disabled]="!otpCode || otpCode.length !== 6 || loading()">
              {{ loading() ? ('AUTH.VERIFYING' | translate) : ('AUTH.VERIFY_OTP' | translate) }}
            </button>
            <button type="button" class="btn-back" (click)="backToPassword()">{{ 'AUTH.BACK' | translate }}</button>
          </form>
        } @else {
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">{{ 'AUTH.EMAIL' | translate }}</label>
            <input 
              id="email" 
              type="email" 
              name="username"
              formControlName="username" 
              [placeholder]="translate.instant('AUTH.EMAIL_PLACEHOLDER')"
              autocomplete="email"
            >
          </div>

          <div class="form-group">
            <label for="password">{{ 'AUTH.PASSWORD' | translate }}</label>
            <div class="input-with-toggle">
              <input 
                id="password" 
                [type]="showPassword() ? 'text' : 'password'" 
                name="password"
                formControlName="password"
                [placeholder]="translate.instant('AUTH.PASSWORD_PLACEHOLDER')"
                autocomplete="current-password"
              >
              <button type="button" class="pw-toggle" (click)="showPassword.set(!showPassword())" [attr.aria-label]="showPassword() ? ('AUTH.HIDE_PASSWORD' | translate) : ('AUTH.SHOW_PASSWORD' | translate)" tabindex="-1">
                @if (showPassword()) {
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                } @else {
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>

          @if (error()) {
            <div class="error-banner">{{ error() }}</div>
          }

          <button type="submit" class="btn-submit" [disabled]="form.invalid || loading()">
            {{ loading() ? ('AUTH.SIGNING_IN' | translate) : ('AUTH.SIGN_IN' | translate) }}
          </button>
        </form>
        }

        <div class="auth-footer">
          <span>{{ 'AUTH.DONT_HAVE_ACCOUNT' | translate }}</span>
          <a routerLink="/register">{{ 'AUTH.CREATE_ACCOUNT' | translate }}</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-5);
      background: var(--color-bg);
    }

    .auth-card {
      width: 100%;
      max-width: 400px;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      padding: var(--space-8);
    }

    .input-with-toggle {
      position: relative;
      display: flex;
    }
    .input-with-toggle input {
      flex: 1;
      padding-right: 2.75rem;
    }
    .input-with-toggle .pw-toggle {
      position: absolute;
      right: var(--space-2);
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      padding: var(--space-1);
      cursor: pointer;
      color: var(--color-text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .input-with-toggle .pw-toggle:hover {
      color: var(--color-text);
    }

    .auth-header {
      margin-bottom: var(--space-6);

      .auth-header-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--space-4);
      }

      h1 {
        font-size: 1.75rem;
        font-weight: 600;
        color: var(--color-text);
        margin-bottom: var(--space-2);
      }

      p {
        color: var(--color-text-muted);
        font-size: 0.9375rem;
      }
    }

    .error-banner {
      background: rgba(220, 38, 38, 0.1);
      color: var(--color-error);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      margin-bottom: var(--space-4);
    }

    .btn-submit {
      width: 100%;
      padding: var(--space-4);
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s ease;

      &:hover:not(:disabled) {
        background: var(--color-primary-hover);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .auth-footer {
      margin-top: var(--space-5);
      text-align: center;
      font-size: 0.9375rem;
      color: var(--color-text-muted);

      a {
        color: var(--color-primary);
        font-weight: 500;
        margin-left: var(--space-2);
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }
    }

    .otp-prompt {
      color: var(--color-text-muted);
      font-size: 0.9375rem;
      margin-bottom: var(--space-4);
    }
    .btn-back {
      width: 100%;
      margin-top: var(--space-3);
      padding: var(--space-3);
      background: transparent;
      color: var(--color-text-muted);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: 0.9375rem;
      cursor: pointer;
    }
    .btn-back:hover {
      background: var(--color-bg);
    }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  translate = inject(TranslateService);

  error = signal<string>('');
  loading = signal(false);
  showOtpStep = signal(false);
  otpTempToken = signal<string | null>(null);
  otpCode = '';

  form = this.fb.group({
    username: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });
  showPassword = signal(false);

  onSubmit() {
    if (this.form.valid) {
      this.error.set('');
      this.loading.set(true);

      const username = this.form.get('username')?.value ?? '';
      const password = this.form.get('password')?.value ?? '';
      const tenantId = this.route.snapshot.queryParams['tenant'];
      const id = tenantId != null ? parseInt(tenantId, 10) : undefined;
      this.api.login(username, password, isNaN(id as number) ? undefined : id).subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.loading.set(false);
          if (err.status === 403 && err.error?.require_otp && err.error?.temp_token) {
            this.otpTempToken.set(err.error.temp_token);
            this.showOtpStep.set(true);
            this.error.set('');
          } else if (err.status === 429) {
            this.error.set(err.error?.detail || 'Too many login attempts. Please try again later.');
          } else {
            this.error.set(err.error?.detail || 'Login failed');
          }
        }
      });
    }
  }

  onSubmitOtp() {
    const token = this.otpTempToken();
    if (!token || !this.otpCode || this.otpCode.length !== 6) return;
    this.error.set('');
    this.loading.set(true);
    this.api.loginWithOtp(token, this.otpCode).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.detail || 'Invalid or expired code');
      }
    });
  }

  backToPassword() {
    this.showOtpStep.set(false);
    this.otpTempToken.set(null);
    this.otpCode = '';
    this.error.set('');
  }
}
