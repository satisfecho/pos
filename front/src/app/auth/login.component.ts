import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="container">
      <div class="card" style="max-width: 400px; margin: 2rem auto;">
        <h2>Login</h2>
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">Email</label>
            <input id="email" type="email" formControlName="username" placeholder="admin@acme.com">
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input id="password" type="password" formControlName="password">
          </div>

          @if (error()) {
            <p class="error-msg">{{ error() }}</p>
          }

          <button type="submit" class="btn btn-primary" [disabled]="form.invalid">Login</button>
          <p style="margin-top: 1rem">
            Need an account? <a routerLink="/register">Register</a>
          </p>
        </form>
      </div>
    </div>
  `
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);
  
  error = signal<string>('');

  form = this.fb.group({
    username: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  onSubmit() {
    if (this.form.valid) {
      this.error.set('');
      // Convert to FormData as expected by OAuth2PasswordRequestForm
      const formData = new FormData();
      formData.append('username', this.form.get('username')?.value || '');
      formData.append('password', this.form.get('password')?.value || '');

      this.api.login(formData).subscribe({
        next: () => {
          this.router.navigate(['/']);
        },
        error: (err) => {
          this.error.set(err.error.detail || 'Login failed');
        }
      });
    }
  }
}
