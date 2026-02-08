/**
 * Inventory Items Component
 *
 * Main view for managing inventory items (raw materials, supplies).
 * Follows app design patterns from products.component.ts
 */

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../shared/sidebar.component';
import { InventoryService } from '../inventory.service';
import { TranslateModule } from '@ngx-translate/core';
import {
  InventoryItem,
  InventoryItemCreate,
  InventoryItemUpdate,
  StockAdjustment,
  Supplier,
  UnitOfMeasure,
  InventoryCategory,
} from '../inventory.types';

@Component({
  selector: 'app-inventory-items',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, SidebarComponent, TranslateModule],
  template: `
    <app-sidebar>
      <div class="page-header">
        <h1>{{ 'INVENTORY.ITEMS.TITLE' | translate }}</h1>
        @if (!showItemModal() && !showAdjustModal()) {
          <button class="btn btn-primary" (click)="openCreateModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {{ 'INVENTORY.ITEMS.ADD_ITEM' | translate }}
          </button>
        }
      </div>

      <div class="content">
        <!-- Filters -->
        <div class="filters-bar">
          <div class="search-group">
            <input
              type="text"
              [placeholder]="'INVENTORY.ITEMS.SEARCH_PLACEHOLDER' | translate"
              [(ngModel)]="searchQuery"
              (input)="filterItems()"
            />
          </div>
          <select [(ngModel)]="categoryFilter" (change)="filterItems()">
            <option value="">{{ 'INVENTORY.ITEMS.ALL_CATEGORIES' | translate }}</option>
            @for (cat of categories; track cat) {
              <option [value]="cat">{{ formatCategory(cat) }}</option>
            }
          </select>
          <label class="checkbox-filter">
            <input type="checkbox" [(ngModel)]="showLowStock" (change)="filterItems()" />
            <span>{{ 'INVENTORY.ITEMS.LOW_STOCK_ONLY' | translate }}</span>
          </label>
        </div>

        <!-- Stats Cards -->
        <div class="stats-row">
          <div class="stat-card">
            <span class="stat-value">{{ totalItems() }}</span>
            <span class="stat-label">{{ 'INVENTORY.ITEMS.TOTAL_ITEMS' | translate }}</span>
          </div>
          <div class="stat-card stat-warning">
            <span class="stat-value">{{ lowStockCount() }}</span>
            <span class="stat-label">{{ 'INVENTORY.ITEMS.LOW_STOCK' | translate }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ formatCurrency(totalValue()) }}</span>
            <span class="stat-label">{{ 'INVENTORY.ITEMS.TOTAL_VALUE' | translate }}</span>
          </div>
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
          <div class="empty-state">
            <p>{{ 'INVENTORY.ITEMS.LOADING_ITEMS' | translate }}</p>
          </div>
        } @else if (filteredItems().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
            </div>
            <h3>{{ 'INVENTORY.ITEMS.NO_ITEMS_YET' | translate }}</h3>
            <p>{{ 'INVENTORY.ITEMS.NO_ITEMS_DESC' | translate }}</p>
            <button class="btn btn-primary" (click)="openCreateModal()">{{ 'INVENTORY.ITEMS.ADD_ITEM' | translate }}</button>
          </div>
        } @else {
          <div class="table-card">
            <table>
              <thead>
                <tr>
                  <th>{{ 'INVENTORY.ITEMS.SKU' | translate }}</th>
                  <th>{{ 'INVENTORY.ITEMS.NAME' | translate }}</th>
                  <th>{{ 'INVENTORY.ITEMS.CATEGORY' | translate }}</th>
                  <th>{{ 'INVENTORY.ITEMS.STOCK' | translate }}</th>
                  <th>{{ 'INVENTORY.ITEMS.REORDER' | translate }}</th>
                  <th>{{ 'INVENTORY.ITEMS.AVG_COST' | translate }}</th>
                  <th>{{ 'INVENTORY.ITEMS.VALUE' | translate }}</th>
                  <th>{{ 'INVENTORY.ITEMS.STATUS' | translate }}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (item of filteredItems(); track item.id) {
                  <tr [class.low-stock-row]="item.is_low_stock">
                    <td class="sku-cell">{{ item.sku || '-' }}</td>
                    <td>
                      <div>{{ item.name || '-' }}</div>
                      @if (item.description) {
                        <small class="text-muted">{{ item.description }}</small>
                      }
                    </td>
                    <td>{{ item.category ? formatCategory(item.category) : '-' }}</td>
                    <td [class.negative]="(item.current_quantity || 0) < 0">
                      {{ (item.current_quantity || 0).toFixed(2) }} {{ item.unit || '' }}
                    </td>
                    <td>{{ (item.reorder_level || 0).toFixed(2) }}</td>
                    <td>{{ formatCurrency(item.average_cost_cents || 0) }}</td>
                    <td>{{ formatCurrency((item.current_quantity || 0) * (item.average_cost_cents || 0)) }}</td>
                    <td>
                      @if (item.is_low_stock) {
                        <span class="status-badge warning">{{ 'INVENTORY.ITEMS.STATUS_LOW_STOCK' | translate }}</span>
                      } @else if (!item.is_active) {
                        <span class="status-badge">{{ 'INVENTORY.ITEMS.STATUS_INACTIVE' | translate }}</span>
                      } @else {
                        <span class="status-badge success">{{ 'INVENTORY.ITEMS.STATUS_OK' | translate }}</span>
                      }
                    </td>
                    <td class="actions">
                      <button class="icon-btn" [title]="'INVENTORY.ITEMS.ADJUST_STOCK' | translate" (click)="openAdjustModal(item)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 20V10M18 20V4M6 20v-4"/>
                        </svg>
                      </button>
                      <button class="icon-btn" [title]="'INVENTORY.COMMON.EDIT' | translate" (click)="openEditModal(item)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button class="icon-btn icon-btn-danger" [title]="'INVENTORY.COMMON.DELETE' | translate" (click)="confirmDelete(item)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- Create/Edit Modal -->
      @if (showItemModal()) {
        <div class="modal-overlay" (click)="closeModals()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="form-header">
              <h3>{{ editingItem() ? ('INVENTORY.ITEMS.EDIT_ITEM' | translate) : ('INVENTORY.ITEMS.NEW_ITEM' | translate) }}</h3>
              <button class="icon-btn" (click)="closeModals()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form [formGroup]="itemForm" (ngSubmit)="saveItem()">
              <div class="form-row">
                <div class="form-group">
                  <label for="sku">{{ 'INVENTORY.ITEMS.SKU' | translate }}</label>
                  <input type="text" id="sku" formControlName="sku" placeholder="e.g., FLOUR-001" />
                </div>
                <div class="form-group">
                  <label for="name">{{ 'INVENTORY.ITEMS.NAME' | translate }}</label>
                  <input type="text" id="name" formControlName="name" placeholder="e.g., All-Purpose Flour" />
                </div>
              </div>
              <div class="form-group">
                <label for="description">{{ 'INVENTORY.ITEMS.DESCRIPTION' | translate }}</label>
                <input type="text" id="description" formControlName="description" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="unit">{{ 'INVENTORY.ITEMS.UNIT' | translate }}</label>
                  <select id="unit" formControlName="unit">
                    @for (unit of units; track unit) {
                      <option [value]="unit">{{ formatUnit(unit) }}</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label for="category">{{ 'INVENTORY.ITEMS.CATEGORY' | translate }}</label>
                  <select id="category" formControlName="category">
                    @for (cat of categories; track cat) {
                      <option [value]="cat">{{ formatCategory(cat) }}</option>
                    }
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="reorder_level">{{ 'INVENTORY.ITEMS.REORDER_LEVEL' | translate }}</label>
                  <input type="number" id="reorder_level" formControlName="reorder_level" step="0.01" min="0" />
                </div>
                <div class="form-group">
                  <label for="reorder_quantity">{{ 'INVENTORY.ITEMS.REORDER_QTY' | translate }}</label>
                  <input type="number" id="reorder_quantity" formControlName="reorder_quantity" step="0.01" min="0" />
                </div>
              </div>
              <div class="form-group">
                <label for="default_supplier_id">{{ 'INVENTORY.ITEMS.DEFAULT_SUPPLIER' | translate }}</label>
                <select id="default_supplier_id" formControlName="default_supplier_id">
                  <option [value]="null">{{ 'INVENTORY.ITEMS.NONE_SELECTED' | translate }}</option>
                  @for (supplier of suppliers(); track supplier.id) {
                    <option [value]="supplier.id">{{ supplier.name }}</option>
                  }
                </select>
              </div>
              @if (editingItem()) {
                <div class="form-group">
                  <label class="checkbox-label">
                    <input type="checkbox" formControlName="is_active" />
                    <span>{{ 'INVENTORY.ITEMS.ITEM_IS_ACTIVE' | translate }}</span>
                  </label>
                </div>
              }
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="closeModals()">{{ 'INVENTORY.COMMON.CANCEL' | translate }}</button>
                <button type="submit" class="btn btn-primary" [disabled]="!itemForm.valid || saving()">
                  {{ saving() ? ('INVENTORY.COMMON.SAVING' | translate) : (editingItem() ? ('INVENTORY.COMMON.UPDATE' | translate) : ('INVENTORY.COMMON.CREATE' | translate)) }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Stock Adjustment Modal -->
      @if (showAdjustModal()) {
        <div class="modal-overlay" (click)="closeModals()">
          <div class="modal modal-sm" (click)="$event.stopPropagation()">
            <div class="form-header">
              <h3>{{ 'INVENTORY.ITEMS.ADJUST_STOCK' | translate }}</h3>
              <button class="icon-btn" (click)="closeModals()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form [formGroup]="adjustForm" (ngSubmit)="submitAdjustment()">
              <div class="adjust-item-info">
                <strong>{{ adjustingItem()?.name }}</strong>
                <span>{{ 'INVENTORY.ITEMS.CURRENT' | translate }}: {{ adjustingItem()?.current_quantity?.toFixed(2) }} {{ adjustingItem()?.unit }}</span>
              </div>
              <div class="form-group">
                <label>{{ 'INVENTORY.ITEMS.ADJUSTMENT_TYPE' | translate }}</label>
                <div class="radio-group">
                  <label class="radio-label">
                    <input type="radio" formControlName="adjustment_type" value="adjustment_add" />
                    <span>{{ 'INVENTORY.ITEMS.ADD_STOCK' | translate }}</span>
                  </label>
                  <label class="radio-label">
                    <input type="radio" formControlName="adjustment_type" value="adjustment_subtract" />
                    <span>{{ 'INVENTORY.ITEMS.REMOVE_STOCK' | translate }}</span>
                  </label>
                  <label class="radio-label">
                    <input type="radio" formControlName="adjustment_type" value="waste" />
                    <span>{{ 'INVENTORY.ITEMS.RECORD_WASTE' | translate }}</span>
                  </label>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="adjust_quantity">{{ 'INVENTORY.ITEMS.QUANTITY' | translate }}</label>
                  <input type="number" id="adjust_quantity" formControlName="quantity" step="0.01" min="0.01" />
                </div>
                <div class="form-group">
                  <label for="adjust_unit">{{ 'INVENTORY.ITEMS.UNIT' | translate }}</label>
                  <select id="adjust_unit" formControlName="unit">
                    @for (unit of units; track unit) {
                      <option [value]="unit">{{ formatUnit(unit) }}</option>
                    }
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label for="adjust_notes">{{ 'INVENTORY.ITEMS.NOTES' | translate }}</label>
                <input type="text" id="adjust_notes" formControlName="notes" [placeholder]="'INVENTORY.ITEMS.NOTES_PLACEHOLDER' | translate" />
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="closeModals()">{{ 'INVENTORY.COMMON.CANCEL' | translate }}</button>
                <button type="submit" class="btn btn-primary" [disabled]="!adjustForm.valid || saving()">
                  {{ saving() ? ('INVENTORY.ITEMS.PROCESSING' | translate) : ('INVENTORY.ITEMS.APPLY' | translate) }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (showDeleteModal()) {
        <div class="modal-overlay" (click)="closeModals()">
          <div class="modal modal-sm" (click)="$event.stopPropagation()">
            <h3>{{ 'INVENTORY.ITEMS.DELETE_ITEM' | translate }}</h3>
            <p>{{ 'INVENTORY.ITEMS.DELETE_CONFIRM' | translate:{ name: deletingItem()?.name } }}</p>
            <div class="modal-actions">
              <button class="btn btn-secondary" (click)="closeModals()">{{ 'INVENTORY.COMMON.CANCEL' | translate }}</button>
              <button class="btn btn-danger" (click)="deleteItem()" [disabled]="saving()">
                {{ saving() ? ('INVENTORY.ITEMS.DELETING' | translate) : ('INVENTORY.COMMON.DELETE' | translate) }}
              </button>
            </div>
          </div>
        </div>
      }
    </app-sidebar>
  `,
  styleUrl: './inventory-items.component.scss'
})
export class InventoryItemsComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private fb = inject(FormBuilder);

  // State signals
  items = signal<InventoryItem[]>([]);
  suppliers = signal<Supplier[]>([]);
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  showItemModal = signal(false);
  showAdjustModal = signal(false);
  showDeleteModal = signal(false);
  editingItem = signal<InventoryItem | null>(null);
  adjustingItem = signal<InventoryItem | null>(null);
  deletingItem = signal<InventoryItem | null>(null);

  // Filter state
  searchQuery = '';
  categoryFilter = '';
  showLowStock = false;

  // Static data
  units: UnitOfMeasure[] = ['piece', 'gram', 'kilogram', 'ounce', 'pound', 'milliliter', 'liter', 'fluid_ounce', 'cup', 'gallon'];
  categories: InventoryCategory[] = ['ingredients', 'beverages', 'packaging', 'cleaning', 'equipment', 'other'];

  itemForm: FormGroup = this.fb.group({
    sku: ['', Validators.required],
    name: ['', Validators.required],
    description: [''],
    unit: ['piece', Validators.required],
    category: ['ingredients', Validators.required],
    reorder_level: [0],
    reorder_quantity: [0],
    default_supplier_id: [null],
    is_active: [true],
  });

  adjustForm: FormGroup = this.fb.group({
    quantity: [1, [Validators.required, Validators.min(0.01)]],
    unit: ['piece', Validators.required],
    adjustment_type: ['adjustment_add', Validators.required],
    notes: [''],
  });

  filteredItems = computed(() => {
    let result = this.items();
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
    }
    if (this.categoryFilter) {
      result = result.filter(i => i.category === this.categoryFilter);
    }
    if (this.showLowStock) {
      result = result.filter(i => i.is_low_stock);
    }
    return result;
  });

  totalItems = computed(() => this.filteredItems().length);
  lowStockCount = computed(() => this.items().filter(i => i.is_low_stock).length);
  totalValue = computed(() => this.filteredItems().reduce((sum, i) => sum + i.current_quantity * i.average_cost_cents, 0));

  ngOnInit() {
    this.loadItems();
    this.loadSuppliers();
  }

  loadItems() {
    this.loading.set(true);
    this.inventoryService.getItems({ activeOnly: false }).subscribe({
      next: items => { this.items.set(items); this.loading.set(false); },
      error: err => { this.error.set(err.error?.detail || 'Failed to load items'); this.loading.set(false); }
    });
  }

  loadSuppliers() {
    this.inventoryService.getSuppliers().subscribe({
      next: suppliers => this.suppliers.set(suppliers),
      error: err => console.error('Failed to load suppliers:', err)
    });
  }

  filterItems() { this.items.update(items => [...items]); }

  openCreateModal() {
    this.editingItem.set(null);
    this.itemForm.reset({ sku: '', name: '', description: '', unit: 'piece', category: 'ingredients', reorder_level: 0, reorder_quantity: 0, default_supplier_id: null, is_active: true });
    this.showItemModal.set(true);
  }

  openEditModal(item: InventoryItem) {
    this.editingItem.set(item);
    this.itemForm.patchValue({ sku: item.sku, name: item.name, description: item.description || '', unit: item.unit, category: item.category, reorder_level: item.reorder_level, reorder_quantity: item.reorder_quantity, default_supplier_id: item.default_supplier_id, is_active: item.is_active });
    this.showItemModal.set(true);
  }

  openAdjustModal(item: InventoryItem) {
    this.adjustingItem.set(item);
    this.adjustForm.reset({ quantity: 1, unit: item.unit, adjustment_type: 'adjustment_add', notes: '' });
    this.showAdjustModal.set(true);
  }

  confirmDelete(item: InventoryItem) {
    this.deletingItem.set(item);
    this.showDeleteModal.set(true);
  }

  closeModals() {
    this.showItemModal.set(false);
    this.showAdjustModal.set(false);
    this.showDeleteModal.set(false);
    this.editingItem.set(null);
    this.adjustingItem.set(null);
    this.deletingItem.set(null);
  }

  saveItem() {
    if (!this.itemForm.valid) return;
    this.saving.set(true);
    const data = this.itemForm.value;

    if (this.editingItem()) {
      this.inventoryService.updateItem(this.editingItem()!.id, data).subscribe({
        next: () => { this.saving.set(false); this.closeModals(); this.loadItems(); },
        error: err => { this.error.set(err.error?.detail || 'Failed to update'); this.saving.set(false); }
      });
    } else {
      this.inventoryService.createItem(data).subscribe({
        next: () => { this.saving.set(false); this.closeModals(); this.loadItems(); },
        error: err => { this.error.set(err.error?.detail || 'Failed to create'); this.saving.set(false); }
      });
    }
  }

  submitAdjustment() {
    if (!this.adjustForm.valid || !this.adjustingItem()) return;
    this.saving.set(true);
    const data = this.adjustForm.value;
    const adjustment: StockAdjustment = { quantity: data.quantity, unit: data.unit, adjustment_type: data.adjustment_type, notes: data.notes || undefined };

    this.inventoryService.adjustStock(this.adjustingItem()!.id, adjustment).subscribe({
      next: () => { this.saving.set(false); this.closeModals(); this.loadItems(); },
      error: err => { this.error.set(err.error?.detail || 'Adjustment failed'); this.saving.set(false); }
    });
  }

  deleteItem() {
    if (!this.deletingItem()) return;
    this.saving.set(true);
    this.inventoryService.deleteItem(this.deletingItem()!.id).subscribe({
      next: () => { this.saving.set(false); this.closeModals(); this.loadItems(); },
      error: err => { this.error.set(err.error?.detail || 'Delete failed'); this.saving.set(false); }
    });
  }

  formatCurrency(cents: number): string { return this.inventoryService.formatCurrency(cents); }
  formatCategory(cat: string): string { return cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : '-'; }
  formatUnit(unit: string): string { return unit ? unit.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : ''; }
}
