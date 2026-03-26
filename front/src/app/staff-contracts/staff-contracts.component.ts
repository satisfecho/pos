import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../shared/sidebar.component';
import {
  ApiService,
  StaffContract,
  StaffContractCreate,
  StaffContractKind,
  StaffContractPaymentStructure,
  StaffContractStatus,
  StaffContractTemplate,
  StaffContractUpdate,
  User,
} from '../services/api.service';
import { PermissionService } from '../services/permission.service';
import { TranslateModule } from '@ngx-translate/core';
import { FocusFirstInputDirective } from '../shared/focus-first-input.directive';

@Component({
  selector: 'app-staff-contracts',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TranslateModule, FocusFirstInputDirective],
  template: `
    <app-sidebar>
      <div class="contracts-page">
        <div class="page-header">
          <div>
            <h1>{{ 'CONTRACTS.TITLE' | translate }}</h1>
            <p class="intro">{{ 'CONTRACTS.INTRO' | translate }}</p>
          </div>
          @if (canManage()) {
            <button type="button" class="btn-primary" (click)="openCreate()">
              {{ 'CONTRACTS.ADD' | translate }}
            </button>
          }
        </div>

        @if (loading()) {
          <div class="loading">{{ 'COMMON.LOADING' | translate }}</div>
        } @else if (error()) {
          <div class="error">{{ error() }}</div>
        } @else if (contracts().length === 0) {
          <div class="empty">{{ 'CONTRACTS.NO_CONTRACTS' | translate }}</div>
        } @else {
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>{{ 'CONTRACTS.TABLE_SUBJECT' | translate }}</th>
                  <th>{{ 'CONTRACTS.VERSION' | translate }}</th>
                  <th>{{ 'CONTRACTS.TABLE_TYPE' | translate }}</th>
                  <th>{{ 'CONTRACTS.TABLE_STATUS' | translate }}</th>
                  <th>{{ 'CONTRACTS.ROLE_TITLE' | translate }}</th>
                  <th>{{ 'CONTRACTS.TABLE_UPDATED' | translate }}</th>
                  <th>{{ 'COMMON.ACTIONS' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (c of contracts(); track c.id) {
                  <tr>
                    <td>
                      <div class="cell-name">{{ c.subject_full_name || c.subject_email || ('#' + c.subject_user_id) }}</div>
                      <div class="cell-muted">{{ c.subject_email }}</div>
                    </td>
                    <td>v{{ c.version }}</td>
                    <td>{{ kindLabel(c.kind) | translate }}</td>
                    <td>{{ statusLabel(c.status) | translate }}</td>
                    <td>{{ c.role_title || '—' }}</td>
                    <td>{{ c.updated_at | date: 'short' }}</td>
                    <td class="actions">
                      <button type="button" class="btn-link" (click)="openPrint(c)">{{ 'CONTRACTS.PRINT_VIEW' | translate }}</button>
                      @if (c.has_document) {
                        <button type="button" class="btn-link" (click)="download(c)">{{ 'CONTRACTS.DOWNLOAD' | translate }}</button>
                      }
                      @if (canManage()) {
                        <button type="button" class="btn-link" (click)="openEdit(c)">{{ 'CONTRACTS.EDIT' | translate }}</button>
                        <button type="button" class="btn-link" (click)="newVersion(c)">{{ 'CONTRACTS.NEW_VERSION' | translate }}</button>
                        <label class="btn-link file-pick">
                          {{ 'CONTRACTS.UPLOAD_PDF' | translate }}
                          <input
                            type="file"
                            accept="application/pdf,.pdf"
                            (change)="onPdf($event, c)"
                          />
                        </label>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        @if (showModal()) {
          <div class="modal-overlay" (click)="closeModal()">
            <div class="modal" (click)="$event.stopPropagation()" appFocusFirstInput>
              <div class="modal-header">
                <h2>{{ editing() ? ('CONTRACTS.EDIT' | translate) : ('CONTRACTS.ADD' | translate) }}</h2>
                <button type="button" class="btn-close" (click)="closeModal()">×</button>
              </div>
              <form class="modal-body" (ngSubmit)="save()">
                @if (!editing()) {
                  <div class="form-group">
                    <label for="subj">{{ 'CONTRACTS.SUBJECT' | translate }}</label>
                    <select id="subj" name="subj" [(ngModel)]="formSubjectUserId" required>
                      @for (u of tenantUsers(); track u.id) {
                        <option [ngValue]="u.id">{{ u.full_name || u.email }} ({{ u.email }})</option>
                      }
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="tpl">{{ 'CONTRACTS.TEMPLATE_KEY' | translate }}</label>
                    <select id="tpl" name="tpl" [(ngModel)]="formTemplateChoice" (ngModelChange)="applyTemplateChoice($event)">
                      <option value="">{{ 'COMMON.NONE' | translate }}</option>
                      @for (t of contractTemplates(); track t.id) {
                        <option [ngValue]="t.template_key">{{ t.name }} ({{ t.template_key }})</option>
                      }
                      <option ngValue="__builtin_employee">{{ 'CONTRACTS.TEMPLATE_EMPLOYEE' | translate }}</option>
                      <option ngValue="__builtin_freelancer">{{ 'CONTRACTS.TEMPLATE_FREELANCER' | translate }}</option>
                    </select>
                  </div>
                }
                <div class="form-group">
                  <label for="kind">{{ 'CONTRACTS.KIND' | translate }}</label>
                  <select id="kind" name="kind" [(ngModel)]="formKind" required (ngModelChange)="onKindChange()">
                    <option value="employee">{{ 'CONTRACTS.KIND_EMPLOYEE' | translate }}</option>
                    <option value="freelancer">{{ 'CONTRACTS.KIND_FREELANCER' | translate }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="status">{{ 'CONTRACTS.STATUS' | translate }}</label>
                  <select id="status" name="status" [(ngModel)]="formStatus" required>
                    <option value="draft">{{ 'CONTRACTS.STATUS_DRAFT' | translate }}</option>
                    <option value="pending_signature">{{ 'CONTRACTS.STATUS_PENDING_SIGNATURE' | translate }}</option>
                    <option value="active">{{ 'CONTRACTS.STATUS_ACTIVE' | translate }}</option>
                    <option value="expired">{{ 'CONTRACTS.STATUS_EXPIRED' | translate }}</option>
                    <option value="superseded">{{ 'CONTRACTS.STATUS_SUPERSEDED' | translate }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="role">{{ 'CONTRACTS.ROLE_TITLE' | translate }}</label>
                  <input id="role" name="role" [(ngModel)]="formRoleTitle" />
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label for="sd">{{ 'CONTRACTS.START_DATE' | translate }}</label>
                    <input id="sd" type="date" name="sd" [(ngModel)]="formStartDate" />
                  </div>
                  <div class="form-group">
                    <label for="ed">{{ 'CONTRACTS.END_DATE' | translate }}</label>
                    <input id="ed" type="date" name="ed" [(ngModel)]="formEndDate" />
                  </div>
                </div>
                <div class="form-group">
                  <label for="comp">{{ 'CONTRACTS.COMPENSATION' | translate }}</label>
                  <textarea id="comp" name="comp" rows="2" [(ngModel)]="formCompensation"></textarea>
                </div>
                @if (canManage()) {
                  <div class="form-group">
                    <label for="tax">{{ 'CONTRACTS.TAX_ID' | translate }}</label>
                    <input id="tax" name="tax" [(ngModel)]="formTaxId" autocomplete="off" />
                  </div>
                }
                <div class="form-group">
                  <label for="paystr">{{ 'CONTRACTS.PAYMENT_STRUCTURE' | translate }}</label>
                  <select id="paystr" name="paystr" [(ngModel)]="formPaymentStructure">
                    <option value="payroll">{{ 'CONTRACTS.PAYROLL' | translate }}</option>
                    <option value="invoice">{{ 'CONTRACTS.INVOICE' | translate }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="terms">{{ 'CONTRACTS.PAYMENT_TERMS' | translate }}</label>
                  <textarea id="terms" name="terms" rows="2" [(ngModel)]="formPaymentTerms"></textarea>
                </div>
                <div class="form-group">
                  <label for="jur">{{ 'CONTRACTS.JURISDICTION_NOTE' | translate }}</label>
                  <textarea id="jur" name="jur" rows="2" [(ngModel)]="formJurisdiction"></textarea>
                </div>
                @if (canManage()) {
                  <div class="form-group">
                    <label for="notes">{{ 'CONTRACTS.NOTES_INTERNAL' | translate }}</label>
                    <textarea id="notes" name="notes" rows="2" [(ngModel)]="formNotesInternal"></textarea>
                  </div>
                }
                @if (formError()) {
                  <div class="form-error">{{ formError() }}</div>
                }
                <div class="modal-actions">
                  <button type="button" class="btn-secondary" (click)="closeModal()">{{ 'COMMON.CANCEL' | translate }}</button>
                  <button type="submit" class="btn-primary" [disabled]="saving()">
                    {{ saving() ? ('COMMON.SAVING' | translate) : ('COMMON.SAVE' | translate) }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        }
      </div>
    </app-sidebar>
  `,
  styles: [
    `
      .contracts-page {
        max-width: 1200px;
      }
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--space-4);
        margin-bottom: var(--space-6);
      }
      .page-header h1 {
        font-size: 1.5rem;
        font-weight: 600;
        margin: 0 0 var(--space-2);
      }
      .intro {
        margin: 0;
        font-size: 0.875rem;
        color: var(--color-text-muted);
        max-width: 42rem;
      }
      .btn-primary {
        padding: var(--space-3) var(--space-4);
        background: var(--color-primary);
        color: #fff;
        border: none;
        border-radius: var(--radius-md);
        font-weight: 500;
        cursor: pointer;
      }
      .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .btn-secondary {
        padding: var(--space-3) var(--space-4);
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        cursor: pointer;
      }
      .loading,
      .empty,
      .error {
        padding: var(--space-6);
        text-align: center;
        color: var(--color-text-muted);
      }
      .error {
        color: var(--color-danger, #c62828);
      }
      .table-wrap {
        overflow-x: auto;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
      }
      .data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
      }
      .data-table th,
      .data-table td {
        padding: var(--space-3) var(--space-4);
        text-align: left;
        border-bottom: 1px solid var(--color-border);
      }
      .data-table th {
        background: var(--color-bg);
        font-weight: 600;
      }
      .cell-name {
        font-weight: 500;
      }
      .cell-muted {
        font-size: 0.75rem;
        color: var(--color-text-muted);
      }
      .actions {
        white-space: nowrap;
      }
      .btn-link {
        background: none;
        border: none;
        color: var(--color-primary);
        cursor: pointer;
        font-size: 0.8125rem;
        margin-right: var(--space-3);
        padding: 0;
      }
      .file-pick {
        display: inline-block;
        cursor: pointer;
        margin: 0;
      }
      .file-pick input {
        display: none;
      }
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: var(--space-4);
      }
      .modal {
        background: var(--color-surface);
        border-radius: var(--radius-lg);
        max-width: 520px;
        width: 100%;
        max-height: 90vh;
        overflow: auto;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      }
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--space-4);
        border-bottom: 1px solid var(--color-border);
      }
      .modal-header h2 {
        margin: 0;
        font-size: 1.125rem;
      }
      .btn-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        line-height: 1;
        color: var(--color-text-muted);
      }
      .modal-body {
        padding: var(--space-4);
      }
      .form-group {
        margin-bottom: var(--space-4);
      }
      .form-group label {
        display: block;
        font-size: 0.8125rem;
        font-weight: 500;
        margin-bottom: var(--space-1);
      }
      .form-group input,
      .form-group select,
      .form-group textarea {
        width: 100%;
        padding: var(--space-2) var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        font: inherit;
      }
      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-3);
      }
      .form-error {
        color: var(--color-danger, #c62828);
        font-size: 0.875rem;
        margin-bottom: var(--space-3);
      }
      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-3);
        margin-top: var(--space-4);
      }
    `,
  ],
})
export class StaffContractsComponent implements OnInit {
  private api = inject(ApiService);
  private permissions = inject(PermissionService);

  loading = signal(false);
  error = signal<string | null>(null);
  contracts = signal<StaffContract[]>([]);
  tenantUsers = signal<User[]>([]);
  contractTemplates = signal<StaffContractTemplate[]>([]);

  showModal = signal(false);
  editing = signal(false);
  editingId = signal<number | null>(null);
  saving = signal(false);
  formError = signal<string | null>(null);

  formSubjectUserId: number | null = null;
  formTemplateChoice = '';
  formKind: StaffContractKind = 'employee';
  formStatus: StaffContractStatus = 'draft';
  formRoleTitle = '';
  formStartDate = '';
  formEndDate = '';
  formCompensation = '';
  formTaxId = '';
  formPaymentStructure: StaffContractPaymentStructure = 'payroll';
  formPaymentTerms = '';
  formJurisdiction = '';
  formNotesInternal = '';

  canManage(): boolean {
    const u = this.api.getCurrentUser();
    return this.permissions.hasPermission(u, 'staff_contract:manage');
  }

  ngOnInit(): void {
    this.load();
    if (this.canManage()) {
      this.api.getUsers().subscribe({
        next: (users) => this.tenantUsers.set(users.filter((x) => String(x.role).toLowerCase() !== 'provider')),
        error: () => this.tenantUsers.set([]),
      });
      this.api.listStaffContractTemplates().subscribe({
        next: (rows) => this.contractTemplates.set(rows),
        error: () => this.contractTemplates.set([]),
      });
    }
  }

  kindLabel(k: StaffContractKind): string {
    return k === 'freelancer' ? 'CONTRACTS.KIND_FREELANCER' : 'CONTRACTS.KIND_EMPLOYEE';
  }

  statusLabel(s: StaffContractStatus): string {
    const m: Record<StaffContractStatus, string> = {
      draft: 'CONTRACTS.STATUS_DRAFT',
      pending_signature: 'CONTRACTS.STATUS_PENDING_SIGNATURE',
      active: 'CONTRACTS.STATUS_ACTIVE',
      expired: 'CONTRACTS.STATUS_EXPIRED',
      superseded: 'CONTRACTS.STATUS_SUPERSEDED',
    };
    return m[s] || 'CONTRACTS.STATUS_DRAFT';
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listStaffContracts().subscribe({
      next: (rows) => {
        this.contracts.set(rows);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e?.error?.detail || 'Error');
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editing.set(false);
    this.editingId.set(null);
    this.formTemplateChoice = '';
    this.formKind = 'employee';
    this.formStatus = 'draft';
    this.formRoleTitle = '';
    this.formStartDate = '';
    this.formEndDate = '';
    this.formCompensation = '';
    this.formTaxId = '';
    this.formPaymentStructure = 'payroll';
    this.formPaymentTerms = '';
    this.formJurisdiction = '';
    this.formNotesInternal = '';
    const users = this.tenantUsers();
    this.formSubjectUserId = users.length ? users[0].id! : null;
    this.formError.set(null);
    this.showModal.set(true);
  }

  applyTemplateChoice(choice: string): void {
    if (!choice) return;
    if (choice === '__builtin_employee') {
      this.formKind = 'employee';
      this.formPaymentStructure = 'payroll';
      return;
    }
    if (choice === '__builtin_freelancer') {
      this.formKind = 'freelancer';
      this.formPaymentStructure = 'invoice';
      return;
    }
    const tpl = this.contractTemplates().find((x) => x.template_key === choice);
    if (tpl?.kind) {
      this.formKind = tpl.kind;
      this.onKindChange();
    }
  }

  templateKeyForCreate(): string | null {
    const c = this.formTemplateChoice;
    if (!c) return null;
    if (c === '__builtin_employee') return 'employee_default';
    if (c === '__builtin_freelancer') return 'freelancer_default';
    return c;
  }

  onKindChange(): void {
    if (this.formKind === 'freelancer') {
      this.formPaymentStructure = 'invoice';
    } else {
      this.formPaymentStructure = 'payroll';
    }
  }

  openEdit(c: StaffContract): void {
    this.editing.set(true);
    this.editingId.set(c.id);
    this.formKind = c.kind;
    this.formStatus = c.status;
    this.formRoleTitle = c.role_title || '';
    this.formStartDate = c.start_date || '';
    this.formEndDate = c.end_date || '';
    this.formCompensation = c.compensation_summary || '';
    this.formTaxId = c.tax_identifier_subject || '';
    this.formPaymentStructure = c.payment_structure;
    this.formPaymentTerms = c.payment_terms || '';
    this.formJurisdiction = c.jurisdiction_note || '';
    this.formNotesInternal = c.notes_internal || '';
    this.formError.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  emptyToNull(s: string): string | null {
    const t = s?.trim();
    return t ? t : null;
  }

  save(): void {
    if (!this.editing() && (this.formSubjectUserId == null || this.formSubjectUserId === undefined)) {
      this.formError.set('Subject required');
      return;
    }
    this.saving.set(true);
    this.formError.set(null);

    if (this.editing()) {
      const id = this.editingId();
      if (id == null) {
        this.saving.set(false);
        return;
      }
      const body: StaffContractUpdate = {
        kind: this.formKind,
        status: this.formStatus,
        role_title: this.formRoleTitle.trim(),
        start_date: this.emptyToNull(this.formStartDate),
        end_date: this.emptyToNull(this.formEndDate),
        compensation_summary: this.emptyToNull(this.formCompensation),
        tax_identifier_subject: this.emptyToNull(this.formTaxId),
        payment_structure: this.formPaymentStructure,
        payment_terms: this.emptyToNull(this.formPaymentTerms),
        jurisdiction_note: this.emptyToNull(this.formJurisdiction),
        notes_internal: this.emptyToNull(this.formNotesInternal),
      };
      this.api.updateStaffContract(id, body).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.load();
        },
        error: (e) => {
          this.formError.set(e?.error?.detail || 'Error');
          this.saving.set(false);
        },
      });
      return;
    }

    const body: StaffContractCreate = {
      subject_user_id: this.formSubjectUserId!,
      kind: this.formKind,
      status: this.formStatus,
      role_title: this.formRoleTitle.trim(),
      start_date: this.emptyToNull(this.formStartDate),
      end_date: this.emptyToNull(this.formEndDate),
      compensation_summary: this.emptyToNull(this.formCompensation),
      tax_identifier_subject: this.emptyToNull(this.formTaxId),
      payment_structure: this.formPaymentStructure,
      payment_terms: this.emptyToNull(this.formPaymentTerms),
      jurisdiction_note: this.emptyToNull(this.formJurisdiction),
      template_key: this.templateKeyForCreate(),
      notes_internal: this.emptyToNull(this.formNotesInternal),
    };

    this.api.createStaffContract(body).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.load();
      },
      error: (e) => {
        this.formError.set(e?.error?.detail || 'Error');
        this.saving.set(false);
      },
    });
  }

  newVersion(c: StaffContract): void {
    this.api.newStaffContractVersion(c.id).subscribe({
      next: () => this.load(),
      error: () => {},
    });
  }

  onPdf(ev: Event, c: StaffContract): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.api.uploadStaffContractDocument(c.id, file).subscribe({
      next: () => {
        input.value = '';
        this.load();
      },
      error: () => {
        input.value = '';
      },
    });
  }

  openPrint(c: StaffContract): void {
    this.api.getStaffContractPrintHtml(c.id).subscribe({
      next: (html) => {
        const w = window.open('', '_blank');
        if (w) {
          w.document.open();
          w.document.write(html);
          w.document.close();
        }
      },
      error: () => {},
    });
  }

  download(c: StaffContract): void {
    this.api.downloadStaffContractDocument(c.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contract-${c.id}-v${c.version}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {},
    });
  }
}
