import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  ApiService,
  StaffContractKind,
  StaffContractTemplate,
  StaffContractTemplateCreate,
} from '../services/api.service';
import { FocusFirstInputDirective } from '../shared/focus-first-input.directive';

@Component({
  selector: 'app-contract-templates-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, FocusFirstInputDirective],
  template: `
    <div class="section" data-testid="settings-contract-templates-section">
      <div class="section-header">
        <h2>{{ 'SETTINGS.CONTRACT_TEMPLATES_TITLE' | translate }}</h2>
        <p>{{ 'SETTINGS.CONTRACT_TEMPLATES_SUBTITLE' | translate }}</p>
        <p class="hint">{{ 'SETTINGS.CONTRACT_TEMPLATES_PLACEHOLDERS' | translate }}</p>
      </div>
      @if (loading()) {
        <p class="hint">{{ 'COMMON.LOADING' | translate }}</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else {
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ 'SETTINGS.CONTRACT_TEMPLATES_COL_NAME' | translate }}</th>
              <th>{{ 'SETTINGS.CONTRACT_TEMPLATES_COL_KEY' | translate }}</th>
              <th>{{ 'CONTRACTS.KIND' | translate }}</th>
              <th>{{ 'COMMON.ACTIONS' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            @for (t of templates(); track t.id) {
              <tr>
                <td>{{ t.name }}</td>
                <td><code>{{ t.template_key }}</code></td>
                <td>{{ kindLabel(t.kind) | translate }}</td>
                <td class="actions">
                  <button type="button" class="btn-link" (click)="startEdit(t)">{{ 'COMMON.EDIT' | translate }}</button>
                  <button type="button" class="btn-link" (click)="preview(t)">{{ 'SETTINGS.CONTRACT_TEMPLATES_PREVIEW' | translate }}</button>
                  <button type="button" class="btn-link danger" (click)="remove(t)">{{ 'COMMON.DELETE' | translate }}</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
        <div class="add-block">
          <h3>{{ 'SETTINGS.CONTRACT_TEMPLATES_ADD' | translate }}</h3>
          <button type="button" class="btn-primary" (click)="openCreate()">{{ 'SETTINGS.CONTRACT_TEMPLATES_NEW' | translate }}</button>
        </div>
      }

      @if (showModal()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal wide" (click)="$event.stopPropagation()" appFocusFirstInput>
            <div class="modal-header">
              <h2>{{ editingId() ? ('COMMON.EDIT' | translate) : ('SETTINGS.CONTRACT_TEMPLATES_NEW' | translate) }}</h2>
              <button type="button" class="btn-close" (click)="closeModal()">×</button>
            </div>
            <form class="modal-body" (ngSubmit)="save()">
              @if (!editingId()) {
                <div class="form-group">
                  <label for="ct-key">{{ 'SETTINGS.CONTRACT_TEMPLATES_COL_KEY' | translate }}</label>
                  <input id="ct-key" name="ct-key" [(ngModel)]="formKey" required autocomplete="off" />
                  <span class="field-hint">{{ 'SETTINGS.CONTRACT_TEMPLATES_KEY_HINT' | translate }}</span>
                </div>
              }
              <div class="form-group">
                <label for="ct-name">{{ 'SETTINGS.CONTRACT_TEMPLATES_COL_NAME' | translate }}</label>
                <input id="ct-name" name="ct-name" [(ngModel)]="formName" required />
              </div>
              <div class="form-group">
                <label for="ct-kind">{{ 'CONTRACTS.KIND' | translate }}</label>
                <select id="ct-kind" name="ct-kind" [(ngModel)]="formKind">
                  <option [ngValue]="null">{{ 'SETTINGS.CONTRACT_TEMPLATES_KIND_ANY' | translate }}</option>
                  <option value="employee">{{ 'CONTRACTS.KIND_EMPLOYEE' | translate }}</option>
                  <option value="freelancer">{{ 'CONTRACTS.KIND_FREELANCER' | translate }}</option>
                </select>
              </div>
              <div class="form-group">
                <label for="ct-body">{{ 'SETTINGS.CONTRACT_TEMPLATES_BODY' | translate }}</label>
                <textarea id="ct-body" name="ct-body" rows="14" [(ngModel)]="formBody"></textarea>
              </div>
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
  `,
  styles: [
    `
      .hint {
        font-size: 0.875rem;
        color: var(--color-text-muted);
        margin-top: var(--space-2);
      }
      .error {
        color: var(--color-danger, #c62828);
      }
      .data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
        margin-bottom: var(--space-6);
      }
      .data-table th,
      .data-table td {
        padding: var(--space-3);
        text-align: left;
        border-bottom: 1px solid var(--color-border);
      }
      .data-table th {
        font-weight: 600;
        background: var(--color-bg);
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
      .btn-link.danger {
        color: var(--color-danger, #c62828);
      }
      .btn-primary {
        padding: var(--space-2) var(--space-4);
        background: var(--color-primary);
        color: #fff;
        border: none;
        border-radius: var(--radius-md);
        cursor: pointer;
      }
      .btn-secondary {
        padding: var(--space-2) var(--space-4);
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        cursor: pointer;
      }
      .add-block {
        margin-top: var(--space-4);
      }
      code {
        font-size: 0.8rem;
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
      .modal.wide {
        max-width: 720px;
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
      .field-hint {
        display: block;
        font-size: 0.75rem;
        color: var(--color-text-muted);
        margin-top: var(--space-1);
      }
      .form-error {
        color: var(--color-danger, #c62828);
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
export class ContractTemplatesSettingsComponent implements OnInit {
  private api = inject(ApiService);
  private translate = inject(TranslateService);

  loading = signal(false);
  error = signal<string | null>(null);
  templates = signal<StaffContractTemplate[]>([]);

  showModal = signal(false);
  editingId = signal<number | null>(null);
  saving = signal(false);
  formError = signal<string | null>(null);
  formKey = '';
  formName = '';
  formBody = '';
  formKind: StaffContractKind | null = null;

  ngOnInit(): void {
    this.load();
  }

  kindLabel(k: StaffContractKind | null | undefined): string {
    if (k === 'freelancer') return 'CONTRACTS.KIND_FREELANCER';
    if (k === 'employee') return 'CONTRACTS.KIND_EMPLOYEE';
    return 'SETTINGS.CONTRACT_TEMPLATES_KIND_ANY';
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listStaffContractTemplates().subscribe({
      next: (rows) => {
        this.templates.set(rows);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e?.error?.detail || 'Error');
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.formKey = '';
    this.formName = '';
    this.formBody = '<p>{{employer_name}} — {{worker_name}}</p>\n<p>{{role_title}} · {{start_date}} — {{end_date}}</p>';
    this.formKind = null;
    this.formError.set(null);
    this.showModal.set(true);
  }

  startEdit(t: StaffContractTemplate): void {
    this.editingId.set(t.id);
    this.formKey = t.template_key;
    this.formName = t.name;
    this.formBody = t.body;
    this.formKind = t.kind ?? null;
    this.formError.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  preview(t: StaffContractTemplate): void {
    const sample: Record<string, string> = {
      employer_name: 'Demo Restaurant S.L.',
      employer_address: 'Calle Demo 1',
      employer_email: 'info@demo.local',
      employer_tax_id: 'B00000000',
      worker_name: 'María Demo',
      worker_email: 'maria@demo.local',
      role_title: 'Waiter',
      start_date: '2026-01-01',
      end_date: '',
      compensation_summary: 'Per agreement',
      payment_terms: 'Monthly',
      jurisdiction_note: '',
      kind: 'employee',
      payment_structure: 'payroll',
      contract_version: '1',
      contract_status: 'draft',
    };
    let html = t.body;
    for (const [k, v] of Object.entries(sample)) {
      html = html.split('{{' + k + '}}').join(this.escapeHtml(v));
    }
    const doc =
      '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Preview</title></head><body>' +
      html +
      '</body></html>';
    const w = window.open('', '_blank');
    if (w) {
      w.document.open();
      w.document.write(doc);
      w.document.close();
    }
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  save(): void {
    const id = this.editingId();
    this.saving.set(true);
    this.formError.set(null);
    if (id != null) {
      this.api
        .updateStaffContractTemplate(id, {
          name: this.formName.trim(),
          body: this.formBody,
          kind: this.formKind,
        })
        .subscribe({
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
    const body: StaffContractTemplateCreate = {
      template_key: this.formKey.trim(),
      name: this.formName.trim(),
      body: this.formBody,
      kind: this.formKind,
    };
    this.api.createStaffContractTemplate(body).subscribe({
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

  remove(t: StaffContractTemplate): void {
    const msg = this.translate.instant('SETTINGS.CONTRACT_TEMPLATES_DELETE_CONFIRM', { name: t.name });
    if (!confirm(msg)) return;
    this.api.deleteStaffContractTemplate(t.id).subscribe({
      next: () => this.load(),
      error: (e) => {
        const detail = e?.error?.detail;
        alert(
          detail
            ? this.translate.instant('SETTINGS.CONTRACT_TEMPLATES_DELETE_FAILED_DETAIL', { detail })
            : this.translate.instant('SETTINGS.CONTRACT_TEMPLATES_DELETE_FAILED'),
        );
      },
    });
  }
}
