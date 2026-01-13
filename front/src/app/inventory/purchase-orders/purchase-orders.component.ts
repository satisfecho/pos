/**
 * Purchase Orders Component
 *
 * List and manage purchase orders.
 * Follows app design patterns.
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../shared/sidebar.component';
import { InventoryService } from '../inventory.service';
import { PurchaseOrder, PurchaseOrderStatus, Supplier } from '../inventory.types';

@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SidebarComponent],
  template: `
    <app-sidebar>
      <div class="page-header">
        <h1>Purchase Orders</h1>
        <a routerLink="/inventory/items" class="btn btn-secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
          View Items
        </a>
      </div>

      <div class="content">
        <!-- Filters -->
        <div class="filters-bar">
          <select [(ngModel)]="statusFilter" (change)="loadOrders()">
            <option value="">All Statuses</option>
            @for (status of statuses; track status) {
              <option [value]="status">{{ formatStatus(status) }}</option>
            }
          </select>
          <select [(ngModel)]="supplierFilter" (change)="loadOrders()">
            <option value="">All Suppliers</option>
            @for (supplier of suppliers(); track supplier.id) {
              <option [value]="supplier.id">{{ supplier.name }}</option>
            }
          </select>
        </div>

        @if (loading()) {
          <div class="empty-state"><p>Loading orders...</p></div>
        } @else if (orders().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
            </div>
            <h3>No purchase orders found</h3>
            <p>Create orders from low-stock items</p>
            <a routerLink="/inventory/stock" class="btn btn-primary">View Stock Dashboard</a>
          </div>
        } @else {
          <div class="table-card">
            <table>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Supplier</th>
                  <th>Date</th>
                  <th>Expected</th>
                  <th>Total</th>
                  <th>Status</th>
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
                        {{ formatStatus(po.status) }}
                      </span>
                    </td>
                    <td class="actions">
                      <a [routerLink]="['/inventory/purchase-orders', po.id]" class="icon-btn" title="View">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </a>
                      @if (po.status === 'approved' || po.status === 'partially_received') {
                        <a [routerLink]="['/inventory/purchase-orders', po.id]" class="icon-btn icon-btn-success" title="Receive">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="22 2 13.5 11 9 8"/>
                            <path d="M22 2L15 22l-4-9-9-4z"/>
                          </svg>
                        </a>
                      }
                      @if (po.status === 'draft') {
                        <button class="icon-btn icon-btn-danger" title="Cancel" (click)="cancelOrder(po)">
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
    </app-sidebar>
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-5);
      h1 { font-size: 1.5rem; font-weight: 600; color: var(--color-text); margin: 0; }
    }

    .filters-bar {
      display: flex;
      gap: var(--space-3);
      margin-bottom: var(--space-4);
      flex-wrap: wrap;
    }

    .filters-bar select {
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      background: var(--color-surface);
      min-width: 150px;
    }

    .empty-state {
      text-align: center;
      padding: var(--space-8);
      background: var(--color-surface);
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-lg);
      .empty-icon { color: var(--color-text-muted); margin-bottom: var(--space-4); }
      h3 { margin: 0 0 var(--space-2); font-size: 1.125rem; color: var(--color-text); }
      p { margin: 0 0 var(--space-4); color: var(--color-text-muted); }
    }

    .table-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    table { width: 100%; border-collapse: collapse; }
    th, td { padding: var(--space-4); text-align: left; }
    th { background: var(--color-bg); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); }
    td { border-top: 1px solid var(--color-border); font-size: 0.9375rem; }
    tr:hover td { background: var(--color-bg); }

    .price { font-weight: 600; color: var(--color-success); }
    .actions { display: flex; gap: var(--space-2); justify-content: flex-end; }

    .status-badge {
      display: inline-block;
      padding: var(--space-1) var(--space-3);
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      &.draft { background: var(--color-bg); color: var(--color-text-muted); }
      &.submitted { background: rgba(59, 130, 246, 0.15); color: #3B82F6; }
      &.approved { background: var(--color-success-light); color: var(--color-success); }
      &.partially_received { background: rgba(245, 158, 11, 0.15); color: var(--color-warning); }
      &.received { background: var(--color-success-light); color: var(--color-success); }
      &.cancelled { background: rgba(220, 38, 38, 0.1); color: var(--color-error); }
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      border: none;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
    }

    .btn-primary { background: var(--color-primary); color: white; &:hover { background: var(--color-primary-hover); } }
    .btn-secondary { background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); &:hover { background: var(--color-border); } }

    .icon-btn {
      background: none;
      border: none;
      padding: var(--space-2);
      border-radius: var(--radius-sm);
      color: var(--color-text-muted);
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      transition: all 0.15s ease;
      &:hover { background: var(--color-bg); color: var(--color-text); }
    }

    .icon-btn-success:hover { background: var(--color-success-light); color: var(--color-success); }
    .icon-btn-danger:hover { background: rgba(220, 38, 38, 0.1); color: var(--color-error); }

    @media (max-width: 768px) {
      .filters-bar { flex-direction: column; }
      .filters-bar select { width: 100%; }
    }
  `]
})
export class PurchaseOrdersComponent implements OnInit {
  private inventoryService = inject(InventoryService);

  orders = signal<PurchaseOrder[]>([]);
  suppliers = signal<Supplier[]>([]);
  loading = signal(true);

  statusFilter = '';
  supplierFilter = '';

  statuses: PurchaseOrderStatus[] = ['draft', 'submitted', 'approved', 'partially_received', 'received', 'cancelled'];

  ngOnInit() {
    this.loadOrders();
    this.loadSuppliers();
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

  cancelOrder(po: PurchaseOrder) {
    if (!confirm(`Cancel order ${po.order_number}?`)) return;
    this.inventoryService.cancelPurchaseOrder(po.id).subscribe({
      next: () => this.loadOrders(),
      error: () => { }
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString();
  }

  formatCurrency(cents: number): string {
    return this.inventoryService.formatCurrency(cents);
  }

  formatStatus(status: PurchaseOrderStatus): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
