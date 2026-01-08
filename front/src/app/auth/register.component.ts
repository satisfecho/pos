import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="container">
      <div class="card" style="max-width: 500px; margin: 2rem auto;">
        <h2>Register Organization</h2>
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="tenant">Organization Name</label>
            <input id="tenant" type="text" formControlName="tenant_name" placeholder="e.g. Acme Corp">
          </div>
          
          <div class="form-group">
            <label for="name">Full Name</label>
            <input id="name" type="text" formControlName="full_name" placeholder="John Doe">
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input id="email" type="email" formControlName="email" placeholder="admin@acme.com">
          </div>

          <div class="form-group">
            <label for="password">Password (min 6 characters)</label>
            <input id="password" type="password" formControlName="password" autocomplete="new-password">
          </div>

          @if (error()) {
            <p class="error-msg">{{ error() }}</p>
          }

          @if (success()) {
            <p style="color: var(--success-color)">{{ success() }}</p>
          }

          <button type="submit" class="btn btn-primary" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Registering...' : 'Register' }}
          </button>
          <p style="margin-top: 1rem">
            Already have an account? <a routerLink="/login">Login</a>
          </p>
        </form>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);

  error = signal<string>('');
  success = signal<string>('');
  loading = signal(false);

  form = this.fb.group({
    tenant_name: ['', Validators.required],
    full_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit() {
    if (this.form.valid) {
      this.error.set('');
      this.success.set('');
      this.loading.set(true);

      this.api.register(this.form.value).subscribe({
        next: () => {
          this.success.set('Registration successful! Redirecting to login...');
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 1500);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.error?.detail || 'Registration failed');
        }
      });
    }
  }
}
