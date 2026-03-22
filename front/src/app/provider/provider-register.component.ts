import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { contactEmailValidator, optionalContactPhoneValidator } from '../shared/contact-validators';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-provider-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <h1>Register as provider</h1>
          <p>Create your provider account to manage your product catalog</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <section class="form-section">
            <h2 class="form-section-title">Company</h2>
            <div class="form-group">
              <label for="provider_name">Provider / company name</label>
              <input
                id="provider_name"
                type="text"
                formControlName="provider_name"
                placeholder="Your Company Ltd"
              >
            </div>
            <div class="form-group">
              <label for="full_company_name">Full legal company name</label>
              <input
                id="full_company_name"
                type="text"
                formControlName="full_company_name"
                placeholder="Your Company Limited"
              >
            </div>
            <div class="form-group">
              <label for="address">Address</label>
              <textarea
                id="address"
                formControlName="address"
                rows="2"
                placeholder="Street, postal code, city, country"
              ></textarea>
            </div>
            <div class="form-group">
              <label for="tax_number">Tax number / VAT ID</label>
              <input
                id="tax_number"
                type="text"
                formControlName="tax_number"
                placeholder="e.g. ES12345678A"
              >
            </div>
          </section>
          <section class="form-section">
            <h2 class="form-section-title">Contact</h2>
            <div class="form-group">
              <label for="full_name">Your name</label>
              <input
                id="full_name"
                type="text"
                formControlName="full_name"
                placeholder="Jane Doe"
              >
            </div>
            <div class="form-group">
              <label for="email">Email</label>
              <input
                id="email"
                type="email"
                formControlName="email"
                placeholder="you@company.com"
                autocomplete="email"
              >
            </div>
            <div class="form-group">
              <label for="phone">Phone</label>
              <input
                id="phone"
                type="tel"
                formControlName="phone"
                placeholder="+34 600 000 000"
              >
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <div class="input-with-toggle">
                <input
                  id="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="password"
                  placeholder="At least 6 characters"
                  autocomplete="new-password"
                >
                <button type="button" class="pw-toggle" (click)="showPassword.set(!showPassword())" [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'" tabindex="-1">
                  @if (showPassword()) {
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  } @else {
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>
            <div class="form-group">
              <label for="password_confirm">Confirm password</label>
              <div class="input-with-toggle">
                <input
                  id="password_confirm"
                  [type]="showPasswordConfirm() ? 'text' : 'password'"
                  formControlName="password_confirm"
                  placeholder="Repeat password"
                  autocomplete="new-password"
                >
                <button type="button" class="pw-toggle" (click)="showPasswordConfirm.set(!showPasswordConfirm())" [attr.aria-label]="showPasswordConfirm() ? 'Hide password' : 'Show password'" tabindex="-1">
                  @if (showPasswordConfirm()) {
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  } @else {
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>
          </section>
          @if (form.get('email')?.touched && form.get('email')?.errors?.['contactEmail']) {
            <div class="error-banner">Enter a valid email address.</div>
          }
          @if (form.get('phone')?.touched && form.get('phone')?.errors?.['contactPhone']) {
            <div class="error-banner">Enter a valid phone number (include country code if needed).</div>
          }
          @if (form.get('password_confirm')?.touched && form.errors?.['passwordMismatch']) {
            <div class="error-banner">Passwords do not match</div>
          }
          <section class="form-section">
            <h2 class="form-section-title">Bank details</h2>
            <div class="form-group">
              <label for="bank_account_holder">Account holder</label>
              <input
                id="bank_account_holder"
                type="text"
                formControlName="bank_account_holder"
                placeholder="Company or person name"
              >
            </div>
            <div class="form-group">
              <label for="bank_iban">IBAN</label>
              <input
                id="bank_iban"
                type="text"
                formControlName="bank_iban"
                placeholder="e.g. ES12 3456 7890 1234 5678 9012"
              >
            </div>
            <div class="form-group">
              <label for="bank_bic">BIC / SWIFT</label>
              <input
                id="bank_bic"
                type="text"
                formControlName="bank_bic"
                placeholder="e.g. BBVAESMM"
              >
            </div>
            <div class="form-group">
              <label for="bank_name">Bank name</label>
              <input
                id="bank_name"
                type="text"
                formControlName="bank_name"
                placeholder="Bank name"
              >
            </div>
          </section>
          @if (error()) {
            <div class="error-banner">{{ error() }}</div>
          }
          @if (success()) {
            <div class="success-banner">{{ success() }}</div>
          }
          <button type="submit" class="btn-submit" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Creating…' : 'Create account' }}
          </button>
        </form>

        <div class="auth-footer">
          <span>Already have an account?</span>
          <a routerLink="/provider/login">Sign in</a>
        </div>
        <div class="auth-footer">
          <a routerLink="/login">Back to staff login</a>
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
      max-width: 420px;
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
    .form-section { margin-bottom: var(--space-6); }
    .form-section-title { font-size: 1rem; font-weight: 600; color: var(--color-text); margin: 0 0 var(--space-3); }
    .form-group input,
    .form-group textarea {
      width: 100%;
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: 1rem;
      font-family: inherit;
    }
    .form-group textarea { resize: vertical; min-height: 2.5em; }
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
    .success-banner {
      background: rgba(34, 197, 94, 0.1);
      color: var(--color-success, #16a34a);
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
    .auth-footer {
      margin-top: var(--space-5);
      text-align: center;
      font-size: 0.9375rem;
      color: var(--color-text-muted);
    }
    .auth-footer a { color: var(--color-primary); font-weight: 500; margin-left: var(--space-2); text-decoration: none; }
    .auth-footer a:hover { text-decoration: underline; }
  `]
})
export class ProviderRegisterComponent {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);

  error = signal<string>('');
  success = signal<string>('');
  loading = signal(false);

  form = this.fb.group({
    provider_name: ['', Validators.required],
    full_company_name: [''],
    address: [''],
    tax_number: [''],
    full_name: [''],
    email: ['', [Validators.required, contactEmailValidator]],
    phone: ['', optionalContactPhoneValidator],
    password: ['', [Validators.required, Validators.minLength(6)]],
    password_confirm: ['', Validators.required],
    bank_account_holder: [''],
    bank_iban: [''],
    bank_bic: [''],
    bank_name: ['']
  }, { validators: (g) => g.get('password')?.value === g.get('password_confirm')?.value ? null : { passwordMismatch: true } });

  showPassword = signal(false);
  showPasswordConfirm = signal(false);

  onSubmit() {
    if (!this.form.valid) return;
    this.error.set('');
    this.success.set('');
    this.loading.set(true);
    const v = this.form.value;
    const { password_confirm, ...rest } = v;
    this.api.registerProvider({
      provider_name: rest.provider_name ?? '',
      email: rest.email ?? '',
      password: rest.password ?? '',
      full_name: rest.full_name || undefined,
      full_company_name: rest.full_company_name || undefined,
      address: rest.address || undefined,
      tax_number: rest.tax_number || undefined,
      phone: rest.phone || undefined,
      bank_iban: rest.bank_iban || undefined,
      bank_bic: rest.bank_bic || undefined,
      bank_name: rest.bank_name || undefined,
      bank_account_holder: rest.bank_account_holder || undefined
    }).subscribe({
      next: () => {
        this.success.set('Account created. You can now sign in.');
        this.loading.set(false);
        setTimeout(() => this.router.navigate(['/provider/login']), 1500);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.detail || 'Registration failed');
      }
    });
  }
}
