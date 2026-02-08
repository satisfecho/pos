/**
 * Purchase Orders Component
 *
 * List and manage purchase orders with create modal and PDF export.
 * Follows app design patterns.
 */

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { SidebarComponent } from '../../shared/sidebar.component';
import { InventoryService } from '../inventory.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
  PurchaseOrderCreate,
  Supplier,
  InventoryItem,
  UnitOfMeasure,
} from '../inventory.types';

@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, SidebarComponent, TranslateModule],
  template: `
    <app-sidebar>
      <div class="page-header">
        <h1>{{ 'INVENTORY.PURCHASE_ORDERS.TITLE' | translate }}</h1>
        <div class="header-actions">
          <button class="btn btn-primary" (click)="openCreateModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {{ 'INVENTORY.PURCHASE_ORDERS.CREATE_PO' | translate }}
          </button>
        </div>
      </div>

      <div class="content">
        <!-- Filters -->
        <div class="filters-bar">
          <select [(ngModel)]="statusFilter" (change)="loadOrders()">
            <option value="">{{ 'INVENTORY.PURCHASE_ORDERS.ALL_STATUSES' | translate }}</option>
            @for (status of statuses; track status) {
              <option [value]="status">{{ 'INVENTORY.PURCHASE_ORDERS.STATUS_' + status.toUpperCase() | translate }}</option>
            }
          </select>
          <select [(ngModel)]="supplierFilter" (change)="loadOrders()">
            <option value="">{{ 'INVENTORY.PURCHASE_ORDERS.ALL_SUPPLIERS' | translate }}</option>
            @for (supplier of suppliers(); track supplier.id) {
              <option [value]="supplier.id">{{ supplier.name }}</option>
            }
          </select>
        </div>

        @if (loading()) {
          <div class="empty-state"><p>{{ 'INVENTORY.PURCHASE_ORDERS.LOADING' | translate }}</p></div>
        } @else if (orders().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
            </div>
            <h3>{{ 'INVENTORY.PURCHASE_ORDERS.NO_ORDERS' | translate }}</h3>
            <p>{{ 'INVENTORY.PURCHASE_ORDERS.NO_ORDERS_DESC' | translate }}</p>
            <button class="btn btn-primary" (click)="openCreateModal()">{{ 'INVENTORY.PURCHASE_ORDERS.CREATE_PO' | translate }}</button>
          </div>
        } @else {
          <div class="table-card">
            <table>
              <thead>
                <tr>
                  <th>{{ 'INVENTORY.PURCHASE_ORDERS.ORDER_NUMBER' | translate }}</th>
                  <th>{{ 'INVENTORY.SUPPLIERS.SUPPLIER' | translate }}</th>
                  <th>{{ 'INVENTORY.REPORTS.DATE' | translate }}</th>
                  <th>{{ 'INVENTORY.PURCHASE_ORDERS.EXPECTED_DATE' | translate }}</th>
                  <th>{{ 'INVENTORY.COMMON.TOTAL' | translate }}</th>
                  <th>{{ 'INVENTORY.ITEMS.STATUS' | translate }}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (po of orders(); track po.id) {
                  <tr>
                    <td><strong>{{ po.order_number }}</strong></td>
                    <td>{{ po.supplier_name || '-' }}</td>
                    <td>{{ formatDate(po.order_date) }}</td>
                    <td>{{ po.expected_date ? formatDate(po.expected_date) : '-' }}</td>
                    <td class="price">{{ formatCurrency(po.total_cents) }}</td>
                    <td>
                      <span class="status-badge" [class]="po.status">
                        {{ 'INVENTORY.PURCHASE_ORDERS.STATUS_' + po.status.toUpperCase() | translate }}
                      </span>
                    </td>
                    <td class="actions">
                      <button class="icon-btn" [title]="'INVENTORY.PURCHASE_ORDERS.PRINT_PDF' | translate" (click)="downloadPdf(po)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="6 9 6 2 18 2 18 9"/>
                          <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                          <rect x="6" y="14" width="12" height="8"/>
                        </svg>
                      </button>
                      <a [routerLink]="['/inventory/purchase-orders', po.id]" class="icon-btn" [title]="'INVENTORY.COMMON.VIEW' | translate">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </a>
                      @if (po.status === 'draft') {
                        <button class="icon-btn icon-btn-danger" [title]="'INVENTORY.COMMON.CANCEL' | translate" (click)="cancelOrder(po)">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                          </svg>
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- Create PO Modal -->
      @if (showCreateModal()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal modal-lg" (click)="$event.stopPropagation()">
            <div class="form-header">
              <h3>{{ 'INVENTORY.PURCHASE_ORDERS.CREATE_TITLE' | translate }}</h3>
              <button class="icon-btn" (click)="closeModal()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form [formGroup]="createForm" (ngSubmit)="submitCreateForm()">
              <div class="form-row">
                <div class="form-group">
                  <label for="supplier_id">{{ 'INVENTORY.SUPPLIERS.SUPPLIER' | translate }} *</label>
                  <select id="supplier_id" formControlName="supplier_id" (change)="onSupplierChange()">
                    <option value="">-- {{ 'INVENTORY.COMMON.SELECT' | translate }} --</option>
                    @for (supplier of suppliers(); track supplier.id) {
                      <option [value]="supplier.id">{{ supplier.name }}</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label for="expected_date">{{ 'INVENTORY.PURCHASE_ORDERS.EXPECTED_DELIVERY' | translate }}</label>
                  <input type="date" id="expected_date" formControlName="expected_date" />
                </div>
              </div>
              <div class="form-group">
                <label for="notes">{{ 'INVENTORY.ITEMS.NOTES' | translate }}</label>
                <textarea id="notes" formControlName="notes" rows="2" [placeholder]="'INVENTORY.PURCHASE_ORDERS.NOTES_PLACEHOLDER' | translate"></textarea>
              </div>

              <!-- Items Section -->
              <div class="items-section">
                <div class="section-header">
                  <h4>{{ 'INVENTORY.PURCHASE_ORDERS.ORDER_ITEMS' | translate }}</h4>
                  <button type="button" class="btn btn-secondary btn-sm" (click)="addItem()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    {{ 'INVENTORY.ITEMS.ADD_ITEM' | translate }}
                  </button>
                </div>

                @if (itemsArray.length === 0) {
                  <div class="empty-items">
                    <p>{{ 'INVENTORY.PURCHASE_ORDERS.NO_ITEMS' | translate }}</p>
                  </div>
                } @else {
                  <div class="items-list" formArrayName="items">
                    @for (item of itemsArray.controls; track $index; let i = $index) {
                      <div class="item-row" [formGroupName]="i">
                        <div class="item-select">
                          <label>{{ 'INVENTORY.ITEMS.NAME' | translate }}</label>
                          <select formControlName="inventory_item_id" (change)="onItemSelected(i)">
                            <option value="">-- {{ 'INVENTORY.COMMON.SELECT' | translate }} --</option>
                            @for (invItem of filteredInventoryItems(); track invItem.id) {
                              <option [value]="invItem.id">{{ invItem.name }} ({{ invItem.sku }})</option>
                            }
                          </select>
                        </div>
                        <div class="item-qty">
                          <label>{{ 'INVENTORY.ITEMS.QUANTITY' | translate }}</label>
                          <input type="number" formControlName="quantity_ordered" min="0.01" step="0.01" />
                        </div>
                        <div class="item-unit">
                          <label>{{ 'INVENTORY.ITEMS.UNIT' | translate }}</label>
                          <select formControlName="unit">
                            @for (unit of units; track unit) {
                              <option [value]="unit">{{ formatUnit(unit) }}</option>
                            }
                          </select>
                        </div>
                        <div class="item-cost">
                          <label>{{ 'INVENTORY.PURCHASE_ORDERS.UNIT_COST' | translate }}</label>
                          <input type="number" formControlName="unit_cost_dollars" min="0" step="0.01" placeholder="0.00" />
                        </div>
                        <div class="item-total">
                          <label>{{ 'INVENTORY.COMMON.TOTAL' | translate }}</label>
                          <span>{{ formatCurrency(getItemTotal(i)) }}</span>
                        </div>
                        <button type="button" class="icon-btn icon-btn-danger" (click)="removeItem(i)">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                    }
                  </div>
                }

                <div class="order-total">
                  <span>{{ 'INVENTORY.PURCHASE_ORDERS.ORDER_TOTAL' | translate }}</span>
                  <strong>{{ formatCurrency(orderTotal()) }}</strong>
                </div>
              </div>

              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="closeModal()">{{ 'INVENTORY.COMMON.CANCEL' | translate }}</button>
                <button type="submit" class="btn btn-primary" [disabled]="!createForm.valid || itemsArray.length === 0 || saving()">
                  {{ saving() ? ('INVENTORY.COMMON.SAVING' | translate) : ('INVENTORY.PURCHASE_ORDERS.CREATE_TITLE' | translate) }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </app-sidebar>
  `,
  styleUrl: './purchase-orders.component.scss'
})
export class PurchaseOrdersComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private fb = inject(FormBuilder);
  private translate = inject(TranslateService);

  orders = signal<PurchaseOrder[]>([]);
  suppliers = signal<Supplier[]>([]);
  inventoryItems = signal<InventoryItem[]>([]);
  loading = signal(true);
  saving = signal(false);
  showCreateModal = signal(false);

  statusFilter = '';
  supplierFilter = '';

  statuses: PurchaseOrderStatus[] = ['draft', 'submitted', 'approved', 'partially_received', 'received', 'cancelled'];
  units: UnitOfMeasure[] = ['piece', 'gram', 'kilogram', 'ounce', 'pound', 'milliliter', 'liter', 'fluid_ounce', 'cup', 'gallon'];

  createForm: FormGroup = this.fb.group({
    supplier_id: ['', Validators.required],
    expected_date: [''],
    notes: [''],
    items: this.fb.array([]),
  });

  get itemsArray(): FormArray {
    return this.createForm.get('items') as FormArray;
  }

  orderTotal = computed(() => {
    let total = 0;
    for (let i = 0; i < this.itemsArray.length; i++) {
      total += this.getItemTotal(i);
    }
    return total;
  });

  selectedSupplierId = signal<number | null>(null);

  filteredInventoryItems = computed(() => {
    const supplierId = this.selectedSupplierId();
    if (!supplierId) {
      // No supplier selected - show only items with a supplier assigned
      return this.inventoryItems().filter(item => item.default_supplier_id != null);
    }
    // Filter by selected supplier
    return this.inventoryItems().filter(item => item.default_supplier_id === supplierId);
  });

  ngOnInit() {
    this.loadOrders();
    this.loadSuppliers();
    this.loadInventoryItems();
  }

  loadOrders() {
    this.loading.set(true);
    const options: { status?: PurchaseOrderStatus; supplierId?: number } = {};
    if (this.statusFilter) options.status = this.statusFilter as PurchaseOrderStatus;
    if (this.supplierFilter) options.supplierId = +this.supplierFilter;

    this.inventoryService.getPurchaseOrders(options).subscribe({
      next: orders => { this.orders.set(orders); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  loadSuppliers() {
    this.inventoryService.getSuppliers().subscribe({
      next: suppliers => this.suppliers.set(suppliers),
      error: () => { }
    });
  }

  loadInventoryItems() {
    this.inventoryService.getItems({ activeOnly: false }).subscribe({
      next: items => {
        console.log('Loaded inventory items:', items);
        this.inventoryItems.set(items);
      },
      error: (err) => console.error('Failed to load inventory items:', err)
    });
  }

  openCreateModal() {
    this.createForm.reset();
    this.itemsArray.clear();
    this.selectedSupplierId.set(null);
    this.showCreateModal.set(true);
  }

  closeModal() {
    this.showCreateModal.set(false);
    this.selectedSupplierId.set(null);
  }

  onSupplierChange() {
    const supplierId = this.createForm.get('supplier_id')?.value;
    this.selectedSupplierId.set(supplierId ? +supplierId : null);
    // Clear items when supplier changes since they may not be valid for new supplier
    this.itemsArray.clear();
  }

  addItem() {
    const itemGroup = this.fb.group({
      inventory_item_id: ['', Validators.required],
      quantity_ordered: [1, [Validators.required, Validators.min(0.01)]],
      unit: ['piece', Validators.required],
      unit_cost_dollars: [0, [Validators.required, Validators.min(0)]],
    });
    this.itemsArray.push(itemGroup);
  }

  removeItem(index: number) {
    this.itemsArray.removeAt(index);
  }

  onItemSelected(index: number) {
    const itemId = this.itemsArray.at(index).get('inventory_item_id')?.value;
    if (itemId) {
      const invItem = this.inventoryItems().find(i => i.id === +itemId);
      if (invItem) {
        this.itemsArray.at(index).patchValue({
          unit: invItem.unit || 'piece',
          unit_cost_dollars: (invItem.average_cost_cents || 0) / 100,
        });
      }
    }
  }

  getItemTotal(index: number): number {
    const itemCtrl = this.itemsArray.at(index);
    const qty = itemCtrl.get('quantity_ordered')?.value || 0;
    const costDollars = itemCtrl.get('unit_cost_dollars')?.value || 0;
    return Math.round(qty * costDollars * 100); // Return in cents
  }

  submitCreateForm() {
    if (!this.createForm.valid || this.itemsArray.length === 0) return;
    this.saving.set(true);

    const formValue = this.createForm.value;
    const poCreate: PurchaseOrderCreate = {
      supplier_id: +formValue.supplier_id,
      expected_date: formValue.expected_date || null,
      notes: formValue.notes || null,
      items: formValue.items.map((item: any) => ({
        inventory_item_id: +item.inventory_item_id,
        quantity_ordered: +item.quantity_ordered,
        unit: item.unit as UnitOfMeasure,
        unit_cost_cents: Math.round(+item.unit_cost_dollars * 100), // Convert dollars to cents
      })),
    };

    this.inventoryService.createPurchaseOrder(poCreate).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.loadOrders();
      },
      error: () => this.saving.set(false)
    });
  }

  cancelOrder(po: PurchaseOrder) {
    if (!confirm(this.translate.instant('INVENTORY.PURCHASE_ORDERS.CANCEL_CONFIRM', { number: po.order_number }))) return;
    this.inventoryService.cancelPurchaseOrder(po.id).subscribe({
      next: () => this.loadOrders(),
      error: () => { }
    });
  }

  downloadPdf(po: PurchaseOrder) {
    this.inventoryService.getPurchaseOrderPdf(po.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PO-${po.order_number}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => alert(this.translate.instant('INVENTORY.PURCHASE_ORDERS.PDF_ERROR'))
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString();
  }

  formatCurrency(cents: number): string {
    return this.inventoryService.formatCurrency(cents);
  }

  formatUnit(unit: string): string {
    return unit.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}