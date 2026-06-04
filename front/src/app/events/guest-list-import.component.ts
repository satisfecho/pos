import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService, GuestImportPreview } from '../services/api.service';

@Component({
  selector: 'app-guest-list-import',
  standalone: true,
  imports: [FormsModule, TranslateModule],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <h2>{{ 'EVENTS.IMPORT_TITLE' | translate }}</h2>

        @if (step() === 'source') {
          <p class="hint">{{ 'EVENTS.IMPORT_HINT' | translate }}</p>
          <button type="button" class="btn btn-secondary" (click)="downloadTemplate()">
            ⬇ {{ 'EVENTS.DOWNLOAD_TEMPLATE' | translate }}
          </button>
          <label class="drop" [class.dragover]="dragOver()"
                 (dragover)="$event.preventDefault(); dragOver.set(true)"
                 (dragleave)="dragOver.set(false)"
                 (drop)="onDrop($event)">
            <input type="file" accept=".xlsx,.xls,.csv" (change)="onFile($event)" hidden #fileInput />
            <span>📄 {{ 'EVENTS.IMPORT_DROP' | translate }}</span>
            <button type="button" class="btn btn-primary" (click)="fileInput.click()">
              {{ 'EVENTS.CHOOSE_FILE' | translate }}
            </button>
          </label>
          @if (error()) { <p class="error">{{ error()! | translate }}</p> }
        }

        @if (step() === 'preview' && preview(); as p) {
          <p class="summary">{{ 'EVENTS.IMPORT_SUMMARY' | translate:{ valid: p.summary.valid, total: p.summary.total } }}</p>
          @if (p.summary.skipped > 0) { <p class="warn">{{ 'EVENTS.IMPORT_SKIPPED' | translate:{ n: p.summary.skipped } }}</p> }
          @if (p.summary.duplicates > 0) {
            <label class="dup-toggle">
              <input type="checkbox" [(ngModel)]="skipDuplicates" name="skipDup" />
              {{ 'EVENTS.IMPORT_SKIP_DUPLICATES' | translate:{ n: p.summary.duplicates } }}
            </label>
          }
          <div class="preview-list">
            @for (row of p.items.slice(0, 60); track row.row_index) {
              <div class="prow" [class.invalid]="!row.valid" [class.dup]="row.duplicate_existing || row.duplicate_of_row !== null">
                <span class="prow-name">{{ row.name || ('EVENTS.IMPORT_NO_NAME' | translate) }}</span>
                @if (!row.valid) { <span class="tag tag-err">{{ 'EVENTS.IMPORT_NO_NAME' | translate }}</span> }
                @else if (row.duplicate_existing) { <span class="tag tag-dup">{{ 'EVENTS.IMPORT_DUP' | translate }}</span> }
                @else if (row.duplicate_of_row !== null) { <span class="tag tag-dup">{{ 'EVENTS.IMPORT_DUP' | translate }}</span> }
                @if (row.party_size > 1) { <span class="tag">+{{ row.party_size - 1 }}</span> }
              </div>
            }
            @if (p.items.length > 60) { <p class="muted">… {{ p.items.length - 60 }} {{ 'EVENTS.MORE' | translate }}</p> }
          </div>
          @if (error()) { <p class="error">{{ error()! | translate }}</p> }
        }

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" (click)="close.emit()">{{ 'COMMON.CANCEL' | translate }}</button>
          @if (step() === 'preview') {
            <button type="button" class="btn btn-primary" [disabled]="confirming() || !hasValid()" (click)="confirm()">
              {{ 'EVENTS.IMPORT_CONFIRM' | translate }}
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; justify-content: center; z-index: 1000; }
    @media (min-width: 640px) { .modal-overlay { align-items: center; } }
    .modal { background: var(--color-surface); border-radius: var(--radius-lg) var(--radius-lg) 0 0; padding: 1.25rem; width: 100%; max-width: 520px; max-height: 88vh; overflow-y: auto; display: flex; flex-direction: column; gap: 0.6rem; }
    @media (min-width: 640px) { .modal { border-radius: var(--radius-lg); } }
    .modal h2 { margin: 0; }
    .hint { color: var(--color-text-muted); font-size: 0.9rem; margin: 0; }
    .drop { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 1.5rem; border: 2px dashed var(--color-border); border-radius: var(--radius-md); color: var(--color-text-muted); }
    .drop.dragover { border-color: var(--color-primary); background: var(--color-primary-light); }
    .summary { font-weight: 700; margin: 0; }
    .warn { color: var(--color-warning); margin: 0; font-size: 0.9rem; }
    .dup-toggle { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; min-height: 44px; }
    .preview-list { display: flex; flex-direction: column; gap: 0.25rem; max-height: 40vh; overflow-y: auto; border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 0.5rem; }
    .prow { display: flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0.25rem; border-bottom: 1px solid var(--color-bg); }
    .prow-name { flex: 1; }
    .prow.invalid .prow-name { color: var(--color-text-muted); text-decoration: line-through; }
    .tag { font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: var(--radius-sm); background: var(--color-bg); color: var(--color-text-muted); }
    .tag-err { background: var(--color-error); color: #fff; }
    .tag-dup { background: var(--color-warning); color: #fff; }
    .muted { color: var(--color-text-muted); font-size: 0.85rem; }
    .error { color: var(--color-error); font-size: 0.85rem; }
    .modal-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; position: sticky; bottom: 0; background: var(--color-surface); padding-top: 0.5rem; }
    .modal-actions .btn { flex: 1; }
    .btn { min-height: 48px; padding: 0.6rem 1rem; border-radius: var(--radius-md); font-size: 1rem; font-weight: 600; cursor: pointer; border: 1px solid transparent; }
    .btn-primary { background: var(--color-primary); color: #fff; }
    .btn-primary:disabled { opacity: 0.5; }
    .btn-secondary { background: var(--color-bg); color: var(--color-text); border-color: var(--color-border); }
  `],
})
export class GuestListImportComponent {
  private api = inject(ApiService);

  eventId = input.required<number>();
  close = output<void>();
  imported = output<number>();

  step = signal<'source' | 'preview'>('source');
  preview = signal<GuestImportPreview | null>(null);
  error = signal<string | null>(null);
  confirming = signal(false);
  dragOver = signal(false);
  skipDuplicates = true;

  downloadTemplate() {
    this.api.getEventGuestTemplate().subscribe({
      next: (blob) => this.saveBlob(blob, 'plantilla-invitados.xlsx'),
      error: () => this.error.set('EVENTS.TEMPLATE_ERROR'),
    });
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragOver.set(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) this.upload(file);
  }

  onFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.upload(file);
  }

  private upload(file: File) {
    this.error.set(null);
    this.api.previewEventGuestImport(this.eventId(), file).subscribe({
      next: (p) => { this.preview.set(p); this.step.set('preview'); },
      error: (err) => this.error.set('EVENTS.IMPORT_ERROR_' + (err?.error?.detail || 'generic').toUpperCase()),
    });
  }

  hasValid(): boolean {
    return (this.preview()?.items || []).some((r) => r.valid);
  }

  confirm() {
    const p = this.preview();
    if (!p) return;
    const validRows = p.items.filter((r) => r.valid);
    this.confirming.set(true);
    this.error.set(null);
    this.api.confirmEventGuestImport(this.eventId(), validRows, this.skipDuplicates).subscribe({
      next: (res) => { this.confirming.set(false); this.imported.emit(res.created); },
      error: () => { this.confirming.set(false); this.error.set('EVENTS.IMPORT_CONFIRM_ERROR'); },
    });
  }

  private saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
