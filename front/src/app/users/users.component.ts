import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../shared/sidebar.component';
import { ApiService, User, UserRole, UserCreate, UserUpdate } from '../services/api.service';
import { PermissionService } from '../services/permission.service';
import { ConfirmationModalComponent } from '../shared/confirmation-modal.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, ConfirmationModalComponent, TranslateModule],
  template: `
    <app-sidebar>
      <div class="users-page">
        <div class="page-header">
          <h1>{{ 'USERS.TITLE' | translate }}</h1>
          <button class="btn-primary" (click)="openCreateModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {{ 'USERS.ADD_USER' | translate }}
          </button>
        </div>

        @if (loading()) {
          <div class="loading">{{ 'COMMON.LOADING' | translate }}...</div>
        } @else if (error()) {
          <div class="error">{{ error() }}</div>
        } @else {
          <div class="users-grid">
            @for (user of users(); track user.id) {
              <div class="user-card" [class.current-user]="user.id === currentUser()?.id">
                <div class="user-avatar">
                  {{ getInitials(user) }}
                </div>
                <div class="user-details">
                  <h3 class="user-name">{{ user.full_name || user.email }}</h3>
                  <p class="user-email">{{ user.email }}</p>
                  <span class="user-role-badge" [class]="'role-' + user.role">
                    {{ getRoleDisplayName(user.role) }}
                  </span>
                </div>
                <div class="user-actions">
                  @if (canEditUser(user)) {
                    <button class="btn-icon" (click)="openEditModal(user)" title="Edit user">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  }
                  @if (canDeleteUser(user)) {
                    <button class="btn-icon btn-danger" (click)="confirmDelete(user)" title="Delete user">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  }
                </div>
              </div>
            } @empty {
              <div class="empty-state">
                <p>{{ 'USERS.NO_USERS' | translate }}</p>
              </div>
            }
          </div>
        }

        <!-- Create/Edit Modal -->
        @if (showModal()) {
          <div class="modal-overlay" (click)="closeModal()">
            <div class="modal" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h2>{{ editingUser() ? ('USERS.EDIT_USER' | translate) : ('USERS.ADD_USER' | translate) }}</h2>
                <button class="btn-close" (click)="closeModal()">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <form class="modal-body" (ngSubmit)="saveUser()">
                <div class="form-group">
                  <label for="email">{{ 'USERS.EMAIL' | translate }}</label>
                  <input
                    type="email"
                    id="email"
                    [(ngModel)]="formEmail"
                    name="email"
                    required
                    [disabled]="editingUser()?.id === currentUser()?.id"
                  />
                </div>
                <div class="form-group">
                  <label for="fullName">{{ 'USERS.FULL_NAME' | translate }}</label>
                  <input
                    type="text"
                    id="fullName"
                    [(ngModel)]="formFullName"
                    name="fullName"
                  />
                </div>
                <div class="form-group">
                  <label for="role">{{ 'USERS.ROLE' | translate }}</label>
                  <select
                    id="role"
                    [(ngModel)]="formRole"
                    name="role"
                    required
                    [disabled]="editingUser()?.id === currentUser()?.id"
                  >
                    @for (role of availableRoles(); track role) {
                      <option [value]="role">{{ getRoleDisplayName(role) }}</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label for="password">
                    {{ editingUser() ? ('USERS.NEW_PASSWORD' | translate) : ('USERS.PASSWORD' | translate) }}
                    @if (editingUser()) {
                      <span class="optional">({{ 'USERS.LEAVE_BLANK' | translate }})</span>
                    }
                  </label>
                  <input
                    type="password"
                    id="password"
                    [(ngModel)]="formPassword"
                    name="password"
                    [required]="!editingUser()"
                    minlength="6"
                  />
                </div>
                @if (formError()) {
                  <div class="form-error">{{ formError() }}</div>
                }
                <div class="modal-actions">
                  <button type="button" class="btn-secondary" (click)="closeModal()">
                    {{ 'COMMON.CANCEL' | translate }}
                  </button>
                  <button type="submit" class="btn-primary" [disabled]="saving()">
                    {{ saving() ? ('COMMON.SAVING' | translate) : ('COMMON.SAVE' | translate) }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        }

        <!-- Delete Confirmation -->
        @if (showDeleteConfirm()) {
          <app-confirmation-modal
            [title]="'USERS.DELETE_CONFIRM_TITLE' | translate"
            [message]="'USERS.DELETE_CONFIRM_MESSAGE' | translate: { name: userToDelete()?.email }"
            [confirmText]="'COMMON.DELETE' | translate"
            [cancelText]="'COMMON.CANCEL' | translate"
            [confirmBtnClass]="'btn-danger'"
            (confirm)="deleteUser()"
            (cancel)="cancelDelete()"
          ></app-confirmation-modal>
        }
      </div>
    </app-sidebar>
  `,
  styles: [`
    .users-page {
      max-width: 1200px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-6);
    }

    .page-header h1 {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-text);
    }

    .btn-primary {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--color-primary-hover);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      padding: var(--space-3) var(--space-4);
      background: var(--color-surface);
      color: var(--color-text);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-secondary:hover {
      background: var(--color-bg);
    }

    .users-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--space-4);
    }

    .user-card {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-4);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      transition: box-shadow 0.15s ease;
    }

    .user-card:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .user-card.current-user {
      border-color: var(--color-primary);
      background: var(--color-primary-light);
    }

    .user-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--color-primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 1rem;
      flex-shrink: 0;
    }

    .user-details {
      flex: 1;
      min-width: 0;
    }

    .user-name {
      font-size: 1rem;
      font-weight: 500;
      color: var(--color-text);
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .user-email {
      font-size: 0.875rem;
      color: var(--color-text-muted);
      margin: 2px 0 var(--space-2);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .user-role-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: capitalize;
    }

    .role-owner {
      background: #fef3c7;
      color: #92400e;
    }

    .role-admin {
      background: #dbeafe;
      color: #1e40af;
    }

    .role-kitchen {
      background: #fce7f3;
      color: #9d174d;
    }

    .role-bartender {
      background: #fef3c7;
      color: #b45309;
    }

    .role-waiter {
      background: #d1fae5;
      color: #065f46;
    }

    .role-receptionist {
      background: #e0e7ff;
      color: #3730a3;
    }

    .user-actions {
      display: flex;
      gap: var(--space-2);
    }

    .btn-icon {
      padding: var(--space-2);
      background: none;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      color: var(--color-text-muted);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-icon:hover {
      background: var(--color-bg);
      color: var(--color-text);
    }

    .btn-icon.btn-danger:hover {
      background: #fee2e2;
      border-color: #fca5a5;
      color: #dc2626;
    }

    .loading, .error, .empty-state {
      text-align: center;
      padding: var(--space-8);
      color: var(--color-text-muted);
    }

    .error {
      color: #dc2626;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: var(--space-4);
    }

    .modal {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      width: 100%;
      max-width: 480px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-4) var(--space-5);
      border-bottom: 1px solid var(--color-border);
    }

    .modal-header h2 {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0;
    }

    .btn-close {
      padding: var(--space-1);
      background: none;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
    }

    .modal-body {
      padding: var(--space-5);
    }

    .form-group {
      margin-bottom: var(--space-4);
    }

    .form-group label {
      display: block;
      margin-bottom: var(--space-2);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text);
    }

    .form-group .optional {
      font-weight: 400;
      color: var(--color-text-muted);
    }

    .form-group input,
    .form-group select {
      width: 100%;
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      background: var(--color-bg);
      color: var(--color-text);
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    .form-group input:disabled,
    .form-group select:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .form-error {
      margin-bottom: var(--space-4);
      padding: var(--space-3);
      background: #fee2e2;
      border-radius: var(--radius-md);
      color: #dc2626;
      font-size: 0.875rem;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
      margin-top: var(--space-5);
    }
  `]
})
export class UsersComponent implements OnInit {
  private api = inject(ApiService);
  private permissions = inject(PermissionService);
  private translate = inject(TranslateService);

  users = signal<User[]>([]);
  currentUser = signal<User | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // Modal state
  showModal = signal(false);
  editingUser = signal<User | null>(null);
  saving = signal(false);
  formError = signal<string | null>(null);

  // Form fields
  formEmail = '';
  formFullName = '';
  formRole: UserRole = 'waiter';
  formPassword = '';

  // Delete confirmation
  showDeleteConfirm = signal(false);
  userToDelete = signal<User | null>(null);

  // Available roles based on current user's permissions
  availableRoles = signal<UserRole[]>([]);

  ngOnInit() {
    this.currentUser.set(this.api.getCurrentUser());
    this.loadUsers();
    this.updateAvailableRoles();
  }

  loadUsers() {
    this.loading.set(true);
    this.error.set(null);

    this.api.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.detail || 'Failed to load users');
        this.loading.set(false);
      }
    });
  }

  updateAvailableRoles() {
    const user = this.currentUser();
    if (!user) return;

    if (user.role === 'owner') {
      // Owner can create all roles except owner (there's only one owner)
      this.availableRoles.set(['admin', 'kitchen', 'bartender', 'waiter', 'receptionist']);
    } else if (user.role === 'admin') {
      // Admin can create all roles except owner
      this.availableRoles.set(['admin', 'kitchen', 'bartender', 'waiter', 'receptionist']);
    }
  }

  getInitials(user: User): string {
    if (user.full_name) {
      const parts = user.full_name.split(' ');
      return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2);
    }
    return user.email.slice(0, 2).toUpperCase();
  }

  getRoleDisplayName(role: UserRole): string {
    const roleKey = `USERS.ROLES.${role.toUpperCase()}`;
    return this.translate.instant(roleKey);
  }

  canEditUser(user: User): boolean {
    const current = this.currentUser();
    if (!current) return false;

    // Owner can edit anyone
    if (current.role === 'owner') return true;

    // Admin can edit anyone except owner
    if (current.role === 'admin' && user.role !== 'owner') return true;

    return false;
  }

  canDeleteUser(user: User): boolean {
    const current = this.currentUser();
    if (!current) return false;

    // Can't delete yourself
    if (user.id === current.id) return false;

    // Can't delete owner
    if (user.role === 'owner') return false;

    // Only owner can delete
    return current.role === 'owner';
  }

  openCreateModal() {
    this.editingUser.set(null);
    this.formEmail = '';
    this.formFullName = '';
    this.formRole = 'waiter';
    this.formPassword = '';
    this.formError.set(null);
    this.showModal.set(true);
  }

  openEditModal(user: User) {
    this.editingUser.set(user);
    this.formEmail = user.email;
    this.formFullName = user.full_name || '';
    this.formRole = user.role;
    this.formPassword = '';
    this.formError.set(null);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingUser.set(null);
  }

  saveUser() {
    this.formError.set(null);
    this.saving.set(true);

    const editing = this.editingUser();

    if (editing) {
      // Update existing user
      const updateData: UserUpdate = {};

      if (this.formEmail !== editing.email) {
        updateData.email = this.formEmail;
      }
      if (this.formFullName !== (editing.full_name || '')) {
        updateData.full_name = this.formFullName || undefined;
      }
      if (this.formRole !== editing.role) {
        updateData.role = this.formRole;
      }
      if (this.formPassword) {
        updateData.password = this.formPassword;
      }

      this.api.updateUser(editing.id!, updateData).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.loadUsers();
        },
        error: (err) => {
          this.formError.set(err.error?.detail || 'Failed to update user');
          this.saving.set(false);
        }
      });
    } else {
      // Create new user
      const createData: UserCreate = {
        email: this.formEmail,
        password: this.formPassword,
        full_name: this.formFullName || undefined,
        role: this.formRole,
      };

      this.api.createUser(createData).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.loadUsers();
        },
        error: (err) => {
          this.formError.set(err.error?.detail || 'Failed to create user');
          this.saving.set(false);
        }
      });
    }
  }

  confirmDelete(user: User) {
    this.userToDelete.set(user);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete() {
    this.showDeleteConfirm.set(false);
    this.userToDelete.set(null);
  }

  deleteUser() {
    const user = this.userToDelete();
    if (!user) return;

    this.api.deleteUser(user.id!).subscribe({
      next: () => {
        this.showDeleteConfirm.set(false);
        this.userToDelete.set(null);
        this.loadUsers();
      },
      error: (err) => {
        console.error('Delete failed:', err);
        this.showDeleteConfirm.set(false);
      }
    });
  }
}
