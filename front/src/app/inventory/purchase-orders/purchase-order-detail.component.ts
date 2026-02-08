/**
 * Purchase Order Detail Component
 *
 * View and receive goods for a purchase order.
 * Follows app design patterns.
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../shared/sidebar.component';
import { InventoryService } from '../inventory.service';
import { PurchaseOrder, ReceiveGoodsInput, ReceivedItemInput } from '../inventory.types';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-purchase-order-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SidebarComponent, TranslateModule],
  template: `
    <app-sidebar>
      @if (loading()) {
        <div class="empty-state"><p>{{ 'INVENTORY.PURCHASE_ORDERS.LOADING_ORDER' | translate }}</p></div>
      } @else if (order()) {
        <div class="page-header">
          <div>
            <a routerLink="/inventory/purchase-orders" class="back-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              {{ 'INVENTORY.PURCHASE_ORDERS.BACK' | translate }}
            </a>
            <h1>{{ order()!.order_number }}</h1>
          </div>
          @if (canReceive()) {
            <button class="btn btn-primary" (click)="showReceiveModal.set(true)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="22 2 13.5 11 9 8"/>
                <path d="M22 2L15 22l-4-9-9-4z"/>
              </svg>
              {{ 'INVENTORY.PURCHASE_ORDERS.RECEIVE_GOODS' | translate }}
            </button>
          }
        </div>

        <div class="content">
          <!-- Order Info Cards -->
          <div class="info-row">
            <div class="info-card">
              <span class="info-label">{{ 'INVENTORY.SUPPLIERS.SUPPLIER' | translate }}</span>
              <span class="info-value">{{ order()!.supplier?.name || order()!.supplier_name || '-' }}</span>
            </div>
            <div class="info-card">
              <span class="info-label">{{ 'INVENTORY.PURCHASE_ORDERS.ORDER_DATE' | translate }}</span>
              <span class="info-value">{{ formatDate(order()!.order_date) }}</span>
            </div>
            <div class="info-card">
              <span class="info-label">{{ 'INVENTORY.PURCHASE_ORDERS.EXPECTED_DATE' | translate }}</span>
              <span class="info-value">{{ order()!.expected_date ? formatDate(order()!.expected_date!) : '-' }}</span>
            </div>
            <div class="info-card">
              <span class="info-label">{{ 'INVENTORY.COMMON.TOTAL' | translate }}</span>
              <span class="info-value price">{{ formatCurrency(order()!.total_cents) }}</span>
            </div>
            <div class="info-card">
              <span class="info-label">{{ 'INVENTORY.ITEMS.STATUS' | translate }}</span>
              <span class="status-badge" [class]="order()!.status">{{ 'INVENTORY.PURCHASE_ORDERS.STATUS_' + order()!.status.toUpperCase() | translate }}</span>
            </div>
          </div>

          <!-- Line Items -->
          <div class="section">
            <h2>{{ 'INVENTORY.PURCHASE_ORDERS.LINE_ITEMS' | translate }}</h2>
            <div class="table-card">
              <table>
                <thead>
                  <tr>
                    <th>{{ 'INVENTORY.ITEMS.NAME' | translate }}</th>
                    <th>{{ 'INVENTORY.PURCHASE_ORDERS.ORDERED' | translate }}</th>
                    <th>{{ 'INVENTORY.PURCHASE_ORDERS.RECEIVED' | translate }}</th>
                    <th>{{ 'INVENTORY.PURCHASE_ORDERS.UNIT_COST' | translate }}</th>
                    <th>{{ 'INVENTORY.COMMON.TOTAL' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of order()!.items; track item.id) {
                    <tr>
                      <td>
                        <strong>{{ item.inventory_item_name }}</strong>
                        <small class="text-muted">{{ item.inventory_item_sku }}</small>
                      </td>
                      <td>{{ item.quantity_ordered }} {{ item.unit }}</td>
                      <td>
                        <span [class.complete]="item.quantity_received >= item.quantity_ordered">
                          {{ item.quantity_received }}
                        </span>
                      </td>
                      <td>{{ formatCurrency(item.unit_cost_cents) }}</td>
                      <td class="price">{{ formatCurrency(item.line_total_cents) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          @if (order()!.notes) {
            <div class="notes-section">
              <h3>{{ 'INVENTORY.ITEMS.NOTES' | translate }}</h3>
              <p>{{ order()!.notes }}</p>
            </div>
          }
        </div>

        <!-- Receive Goods Modal -->
        @if (showReceiveModal()) {
          <div class="modal-overlay" (click)="showReceiveModal.set(false)">
            <div class="modal modal-lg" (click)="$event.stopPropagation()">
              <div class="form-header">
                <h3>{{ 'INVENTORY.PURCHASE_ORDERS.RECEIVE_GOODS' | translate }}</h3>
                <button class="icon-btn" (click)="showReceiveModal.set(false)">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div class="receive-table-wrapper">
                <table class="receive-table">
                  <thead>
                    <tr>
                      <th>{{ 'INVENTORY.ITEMS.NAME' | translate }}</th>
                      <th>{{ 'INVENTORY.PURCHASE_ORDERS.ORDERED' | translate }}</th>
                      <th>{{ 'INVENTORY.PURCHASE_ORDERS.ALREADY_RECEIVED' | translate }}</th>
                      <th>{{ 'INVENTORY.PURCHASE_ORDERS.RECEIVE_NOW' | translate }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of order()!.items; track item.id; let i = $index) {
                      <tr>
                        <td>{{ item.inventory_item_name }}</td>
                        <td>{{ item.quantity_ordered }}</td>
                        <td>{{ item.quantity_received }}</td>
                        <td>
                          <input
                            type="number"
                            [(ngModel)]="receiveQuantities[i]"
                            min="0"
                            [max]="item.quantity_ordered - item.quantity_received"
                            step="0.01"
                          />
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <div class="form-group">
                <label for="receive_notes">{{ 'INVENTORY.ITEMS.NOTES' | translate }}</label>
                <input type="text" id="receive_notes" [(ngModel)]="receiveNotes" [placeholder]="'INVENTORY.ITEMS.NOTES_PLACEHOLDER' | translate" />
              </div>
              <div class="form-actions">
                <button class="btn btn-secondary" (click)="showReceiveModal.set(false)">{{ 'INVENTORY.COMMON.CANCEL' | translate }}</button>
                <button class="btn btn-primary" (click)="submitReceive()" [disabled]="receiving()">
                  {{ receiving() ? ('INVENTORY.COMMON.PROCESSING' | translate) : ('INVENTORY.PURCHASE_ORDERS.CONFIRM_RECEIPT' | translate) }}
                </button>
              </div>
            </div>
          </div>
        }
      }
    </app-sidebar>
  `,
  styleUrl: './purchase-order-detail.component.scss'
})
export class PurchaseOrderDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private inventoryService = inject(InventoryService);
  private translate = inject(TranslateService);

  order = signal<PurchaseOrder | null>(null);
  loading = signal(true);
  showReceiveModal = signal(false);
  receiving = signal(false);

  receiveQuantities: number[] = [];
  receiveNotes = '';

  ngOnInit() {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.loadOrder(id);
  }

  loadOrder(id: number) {
    this.loading.set(true);
    this.inventoryService.getPurchaseOrder(id).subscribe({
      next: order => {
        this.order.set(order);
        this.receiveQuantities = order.items?.map(i => i.quantity_ordered - i.quantity_received) || [];
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  canReceive(): boolean {
    const status = this.order()?.status;
    return status === 'approved' || status === 'partially_received';
  }

  submitReceive() {
    const order = this.order();
    if (!order?.items) return;

    const items: ReceivedItemInput[] = order.items
      .map((item, i) => ({ purchase_order_item_id: item.id, quantity_received: this.receiveQuantities[i] || 0 }))
      .filter(r => r.quantity_received > 0);

    if (items.length === 0) {
      alert(this.translate.instant('INVENTORY.PURCHASE_ORDERS.ENTER_QUANTITY_ERROR'));
      return;
    }

    this.receiving.set(true);
    const input: ReceiveGoodsInput = { items, notes: this.receiveNotes || undefined };

    this.inventoryService.receivePurchaseOrder(order.id, input).subscribe({
      next: () => { this.receiving.set(false); this.showReceiveModal.set(false); this.loadOrder(order.id); },
      error: () => this.receiving.set(false)
    });
  }

  formatDate(dateStr: string): string { return new Date(dateStr).toLocaleDateString(); }
  formatCurrency(cents: number): string { return this.inventoryService.formatCurrency(cents); }
  formatStatus(status: string): string { return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
}