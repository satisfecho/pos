import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-provider-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <h1>Provider portal</h1>
          <p>Sign in to manage your catalog</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              type="email"
              name="username"
              formControlName="username"
              placeholder="you@company.com"
              autocomplete="email"
            >
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              formControlName="password"
              placeholder="••••••••"
              autocomplete="current-password"
            >
          </div>
          @if (error()) {
            <div class="error-banner">{{ error() }}</div>
          }
          <button type="submit" class="btn-submit" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <div class="auth-footer">
          <span>Don't have a provider account?</span>
          <a routerLink="/provider/register">Register as provider</a>
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
export class ProviderLoginComponent {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);

  error = signal<string>('');
  loading = signal(false);

  form = this.fb.group({
    username: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  onSubmit() {
    if (!this.form.valid) return;
    this.error.set('');
    this.loading.set(true);
    const formData = new FormData();
    formData.append('username', this.form.get('username')?.value ?? '');
    formData.append('password', this.form.get('password')?.value ?? '');
    this.api.login(formData, undefined, 'provider').subscribe({
      next: () => this.router.navigate(['/provider']),
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.detail || 'Login failed');
      }
    });
  }
}
