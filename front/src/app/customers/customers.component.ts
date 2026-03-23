/**
 * Billing customers (Factura) – register company details for tax invoicing.
 * Staff can add/search customers and use them when printing invoices from orders.
 */
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, BillingCustomer } from '../services/api.service';
import { PermissionService } from '../services/permission.service';
import { SidebarComponent } from '../shared/sidebar.component';
import { FocusFirstInputDirective } from '../shared/focus-first-input.directive';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [FormsModule, SidebarComponent, FocusFirstInputDirective, TranslateModule],
  template: `
    <app-sidebar>
      <div class="page-header">
        <h1>{{ 'CUSTOMERS.TITLE' | translate }}</h1>
        @if (canWrite()) {
          <button class="btn btn-primary" (click)="openModal(null)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {{ 'CUSTOMERS.ADD' | translate }}
          </button>
        }
      </div>

      <div class="content">
        <div class="filters">
          <input
            type="text"
            class="filter-input"
            [placeholder]="'CUSTOMERS.SEARCH_PLACEHOLDER' | translate"
            [(ngModel)]="searchTerm"
            (ngModelChange)="load()"
          />
          <button class="btn btn-ghost btn-sm" (click)="load()">{{ 'ORDERS.REFRESH' | translate }}</button>
        </div>

        @if (error()) {
          <div class="error-banner">
            <span>{{ error() }}</span>
            <button class="icon-btn" (click)="error.set('')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        }

        @if (loading()) {
          <div class="empty-state"><p>{{ 'CUSTOMERS.LOADING' | translate }}</p></div>
        } @else if (customers().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                <path d="M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <h3>{{ 'CUSTOMERS.NONE' | translate }}</h3>
            <p>{{ 'CUSTOMERS.NONE_DESC' | translate }}</p>
            @if (canWrite()) {
              <button class="btn btn-primary" (click)="openModal(null)">{{ 'CUSTOMERS.ADD' | translate }}</button>
            }
          </div>
        } @else {
          <div class="table-card">
            <table>
              <thead>
                <tr>
                  <th>{{ 'CUSTOMERS.NAME' | translate }}</th>
                  <th>{{ 'CUSTOMERS.COMPANY' | translate }}</th>
                  <th>{{ 'CUSTOMERS.TAX_ID' | translate }}</th>
                  <th>{{ 'CUSTOMERS.EMAIL' | translate }}</th>
                  <th>{{ 'CUSTOMERS.PHONE' | translate }}</th>
                  <th>{{ 'CUSTOMERS.BIRTH_DATE' | translate }}</th>
                  @if (canWrite()) {
                    <th></th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (c of customers(); track c.id) {
                  <tr>
                    <td>{{ c.name }}</td>
                    <td>{{ c.company_name || '—' }}</td>
                    <td>{{ c.tax_id || '—' }}</td>
                    <td>{{ c.email || '—' }}</td>
                    <td>{{ c.phone || '—' }}</td>
                    <td>{{ c.birth_date || '—' }}</td>
                    @if (canWrite()) {
                      <td class="actions">
                        <button class="icon-btn" [title]="'COMMON.EDIT' | translate" (click)="openModal(c)">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button class="icon-btn icon-btn-danger" [title]="'COMMON.DELETE' | translate" (click)="confirmDelete(c)">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                          </svg>
                        </button>
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- Add/Edit Modal -->
      @if (showModal()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()" appFocusFirstInput>
            <div class="modal-header">
              <h3>{{ editing() ? ('CUSTOMERS.EDIT' | translate) : ('CUSTOMERS.ADD' | translate) }}</h3>
              <button class="icon-btn" (click)="closeModal()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form (ngSubmit)="save()">
              <div class="form-group">
                <label for="cust-name">{{ 'CUSTOMERS.NAME' | translate }} *</label>
                <input id="cust-name" type="text" [(ngModel)]="form.name" name="name" required />
              </div>
              <div class="form-group">
                <label for="cust-company">{{ 'CUSTOMERS.COMPANY' | translate }}</label>
                <input id="cust-company" type="text" [(ngModel)]="form.company_name" name="company_name" />
              </div>
              <div class="form-group">
                <label for="cust-tax">{{ 'CUSTOMERS.TAX_ID' | translate }}</label>
                <input id="cust-tax" type="text" [(ngModel)]="form.tax_id" name="tax_id" [placeholder]="'CUSTOMERS.TAX_ID_PLACEHOLDER' | translate" />
              </div>
              <div class="form-group">
                <label for="cust-address">{{ 'CUSTOMERS.ADDRESS' | translate }}</label>
                <input id="cust-address" type="text" [(ngModel)]="form.address" name="address" />
              </div>
              <div class="form-group">
                <label for="cust-email">{{ 'CUSTOMERS.EMAIL' | translate }}</label>
                <input id="cust-email" type="email" [(ngModel)]="form.email" name="email" />
              </div>
              <div class="form-group">
                <label for="cust-phone">{{ 'CUSTOMERS.PHONE' | translate }}</label>
                <input id="cust-phone" type="text" [(ngModel)]="form.phone" name="phone" />
              </div>
              <div class="form-group">
                <label for="cust-birth">{{ 'CUSTOMERS.BIRTH_DATE' | translate }}</label>
                <input id="cust-birth" type="date" [(ngModel)]="form.birth_date" name="birth_date" />
                <p class="field-hint">{{ 'CUSTOMERS.BIRTH_DATE_HINT' | translate }}</p>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" (click)="closeModal()">{{ 'COMMON.CANCEL' | translate }}</button>
                <button type="submit" class="btn btn-primary" [disabled]="!form.name.trim() || saving()">
                  {{ saving() ? ('COMMON.SAVING' | translate) : (editing() ? ('COMMON.SAVE' | translate) : ('CUSTOMERS.CREATE' | translate)) }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Delete confirmation -->
      @if (deleting()) {
        <div class="modal-overlay" (click)="deleting.set(null)">
          <div class="modal modal-sm" (click)="$event.stopPropagation()">
            <h3>{{ 'CUSTOMERS.DELETE_TITLE' | translate }}</h3>
            <p>{{ 'CUSTOMERS.DELETE_CONFIRM' | translate:{ name: deleting()?.name } }}</p>
            <div class="modal-actions">
              <button class="btn btn-secondary" (click)="deleting.set(null)">{{ 'COMMON.CANCEL' | translate }}</button>
              <button class="btn btn-danger" (click)="deleteCustomer()" [disabled]="saving()">
                {{ saving() ? ('COMMON.SAVING' | translate) : ('COMMON.DELETE' | translate) }}
              </button>
            </div>
          </div>
        </div>
      }
    </app-sidebar>
  `,
  styles: [`
    .filters { display: flex; gap: 0.75rem; margin-bottom: 1rem; align-items: center; }
    .filter-input { flex: 1; max-width: 320px; padding: 0.5rem 0.75rem; border: 1px solid var(--color-border); border-radius: 6px; }
    .table-card { background: var(--color-surface); border-radius: 8px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--color-border); }
    th { font-size: 0.75rem; text-transform: uppercase; color: var(--color-text-muted); font-weight: 600; }
    .actions { white-space: nowrap; }
    .icon-btn { background: none; border: none; cursor: pointer; padding: 4px; color: var(--color-text-muted); }
    .icon-btn:hover { color: var(--color-primary); }
    .icon-btn-danger:hover { color: var(--color-danger, #dc2626); }
    .error-banner { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: #fef2f2; color: #b91c1c; border-radius: 6px; margin-bottom: 1rem; }
    .empty-icon { margin-bottom: 0.5rem; color: var(--color-text-muted); }
    .field-hint { margin: 0.35rem 0 0; font-size: 0.8rem; color: var(--color-text-muted); }
  `]
})
export class CustomersComponent implements OnInit {
  private api = inject(ApiService);
  private permissions = inject(PermissionService);

  customers = signal<BillingCustomer[]>([]);
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  showModal = signal(false);
  editing = signal<BillingCustomer | null>(null);
  deleting = signal<BillingCustomer | null>(null);
  searchTerm = '';

  form: {
    name: string;
    company_name: string;
    tax_id: string;
    address: string;
    email: string;
    phone: string;
    birth_date: string;
  } = {
    name: '',
    company_name: '',
    tax_id: '',
    address: '',
    email: '',
    phone: '',
    birth_date: ''
  };

  canWrite(): boolean {
    return this.permissions.hasPermission(this.api.getCurrentUser(), 'billing_customer:write');
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.getBillingCustomers(this.searchTerm.trim() || undefined).subscribe({
      next: list => { this.customers.set(list); this.loading.set(false); },
      error: err => { this.error.set(err.error?.detail || 'Failed to load customers'); this.loading.set(false); }
    });
  }

  openModal(c: BillingCustomer | null) {
    this.editing.set(c);
    if (c) {
      this.form = {
        name: c.name,
        company_name: c.company_name ?? '',
        tax_id: c.tax_id ?? '',
        address: c.address ?? '',
        email: c.email ?? '',
        phone: c.phone ?? '',
        birth_date: c.birth_date ?? ''
      };
    } else {
      this.form = {
        name: '',
        company_name: '',
        tax_id: '',
        address: '',
        email: '',
        phone: '',
        birth_date: ''
      };
    }
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editing.set(null);
  }

  save() {
    if (!this.form.name.trim()) return;
    this.saving.set(true);
    const payload: {
      name: string;
      company_name?: string;
      tax_id?: string;
      address?: string;
      email?: string;
      phone?: string;
      birth_date?: string | null;
    } = {
      name: this.form.name.trim(),
      company_name: this.form.company_name?.trim() || undefined,
      tax_id: this.form.tax_id?.trim() || undefined,
      address: this.form.address?.trim() || undefined,
      email: this.form.email?.trim() || undefined,
      phone: this.form.phone?.trim() || undefined
    };
    const editing = this.editing();
    if (editing) {
      payload.birth_date = this.form.birth_date.trim() || null;
      this.api.updateBillingCustomer(editing.id, payload).subscribe({
        next: () => { this.saving.set(false); this.closeModal(); this.load(); },
        error: err => { this.error.set(err.error?.detail || 'Update failed'); this.saving.set(false); }
      });
    } else {
      if (this.form.birth_date.trim()) {
        payload.birth_date = this.form.birth_date.trim();
      }
      this.api.createBillingCustomer(payload).subscribe({
        next: () => { this.saving.set(false); this.closeModal(); this.load(); },
        error: err => { this.error.set(err.error?.detail || 'Create failed'); this.saving.set(false); }
      });
    }
  }

  confirmDelete(c: BillingCustomer) {
    this.deleting.set(c);
  }

  deleteCustomer() {
    const c = this.deleting();
    if (!c) return;
    this.saving.set(true);
    this.api.deleteBillingCustomer(c.id).subscribe({
      next: () => { this.saving.set(false); this.deleting.set(null); this.load(); },
      error: err => { this.error.set(err.error?.detail || 'Delete failed'); this.saving.set(false); }
    });
  }
}
