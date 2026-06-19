import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../services/api.service';
import { ApiErrorMessageService } from '../services/api-error-message.service';
import { LegalLinksComponent } from '../shared/legal-links.component';

@Component({
  selector: 'app-courier-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslateModule, LegalLinksComponent],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <h1>{{ 'COURIER_AUTH.TITLE' | translate }}</h1>
          <p>{{ 'COURIER_AUTH.SUBTITLE' | translate }}</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">{{ 'AUTH.EMAIL' | translate }}</label>
            <input
              id="email"
              type="email"
              name="username"
              formControlName="username"
              [placeholder]="'AUTH.EMAIL_PLACEHOLDER' | translate"
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
                [placeholder]="'AUTH.PASSWORD_PLACEHOLDER' | translate"
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

        <div class="auth-actions-foot">
          <a routerLink="/login">{{ 'COURIER_AUTH.BACK_STAFF_LOGIN' | translate }}</a>
          @if (legalTermsUrl() || legalPrivacyUrl()) {
            <span class="auth-foot-sep" aria-hidden="true">·</span>
            <app-legal-links [inline]="true" [termsUrl]="legalTermsUrl()" [privacyUrl]="legalPrivacyUrl()" />
          }
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
    .auth-header {
      text-align: center;
      margin-bottom: var(--space-6);
    }
    .auth-header h1 { font-size: 1.75rem; font-weight: 600; color: var(--color-text); margin-bottom: var(--space-2); }
    .auth-header p { color: var(--color-text-muted); font-size: 0.9375rem; }
    .form-group { margin-bottom: var(--space-4); }
    .form-group label { display: block; margin-bottom: var(--space-2); font-weight: 500; color: var(--color-text); }
    .form-group input {
      width: 100%;
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: 1rem;
    }
    .input-with-toggle { position: relative; display: flex; }
    .input-with-toggle input { flex: 1; padding-right: 2.75rem; }
    .input-with-toggle .pw-toggle {
      position: absolute; right: var(--space-2); top: 50%; transform: translateY(-50%);
      background: none; border: none; padding: var(--space-1); cursor: pointer;
      color: var(--color-text-muted); display: flex; align-items: center; justify-content: center;
    }
    .input-with-toggle .pw-toggle:hover { color: var(--color-text); }
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
    }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
    .auth-actions-foot {
      margin-top: var(--space-5);
      text-align: center;
      font-size: 0.9375rem;
      color: var(--color-text-muted);
      line-height: 1.6;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: baseline;
      row-gap: var(--space-2);
    }
    .auth-actions-foot > a {
      color: var(--color-primary);
      font-weight: 500;
      text-decoration: none;
    }
    .auth-actions-foot > a:hover { text-decoration: underline; }
    .auth-foot-sep { margin: 0 var(--space-2); user-select: none; }
  `]
})
export class CourierLoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);
  private apiErr = inject(ApiErrorMessageService);

  legalTermsUrl = signal<string | null>(null);
  legalPrivacyUrl = signal<string | null>(null);

  ngOnInit(): void {
    this.api.getPublicLegalUrls().subscribe({
      next: (u) => {
        this.legalTermsUrl.set(u.terms_of_service_url ?? null);
        this.legalPrivacyUrl.set(u.privacy_policy_url ?? null);
      },
      error: () => {},
    });
  }

  error = signal<string>('');
  loading = signal(false);

  form = this.fb.group({
    username: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });
  showPassword = signal(false);

  onSubmit() {
    if (!this.form.valid) return;
    this.error.set('');
    this.loading.set(true);
    const username = this.form.get('username')?.value ?? '';
    const password = this.form.get('password')?.value ?? '';
    this.api.login(username, password, undefined, 'courier').subscribe({
      next: () => this.router.navigate(['/courier']),
      error: (err) => {
        this.loading.set(false);
        this.error.set(this.apiErr.fromHttpError(err, 'AUTH.LOGIN_FAILED'));
      }
    });
  }
}
