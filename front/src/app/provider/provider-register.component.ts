import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
              <input
                id="password"
                type="password"
                formControlName="password"
                placeholder="At least 6 characters"
                autocomplete="new-password"
              >
            </div>
          </section>
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
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
    bank_account_holder: [''],
    bank_iban: [''],
    bank_bic: [''],
    bank_name: ['']
  });

  onSubmit() {
    if (!this.form.valid) return;
    this.error.set('');
    this.success.set('');
    this.loading.set(true);
    const v = this.form.value;
    this.api.registerProvider({
      provider_name: v.provider_name ?? '',
      email: v.email ?? '',
      password: v.password ?? '',
      full_name: v.full_name || undefined,
      full_company_name: v.full_company_name || undefined,
      address: v.address || undefined,
      tax_number: v.tax_number || undefined,
      phone: v.phone || undefined,
      bank_iban: v.bank_iban || undefined,
      bank_bic: v.bank_bic || undefined,
      bank_name: v.bank_name || undefined,
      bank_account_holder: v.bank_account_holder || undefined
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
