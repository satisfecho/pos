/**
 * Inventory Reports Component
 *
 * FIFO valuation and transaction history.
 * Follows app design patterns.
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../shared/sidebar.component';
import { InventoryService } from '../inventory.service';
import { InventoryValuation, InventoryTransaction } from '../inventory.types';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-inventory-reports',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TranslateModule],
  template: `
    <app-sidebar>
      <div class="page-header">
        <h1>{{ 'INVENTORY.REPORTS.TITLE' | translate }}</h1>
        <button class="btn btn-secondary" (click)="loadData()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
          </svg>
          {{ 'INVENTORY.COMMON.REFRESH' | translate }}
        </button>
      </div>

      <div class="content">
        <!-- Valuation Report -->
        <div class="section">
          <div class="section-header">
            <h2>{{ 'INVENTORY.REPORTS.FIFO_VALUATION' | translate }}</h2>
            @if (valuation()) {
              <span class="date-tag">{{ 'INVENTORY.REPORTS.AS_OF' | translate:{ date: formatDateTime(valuation()!.as_of_date) } }}</span>
            }
          </div>

          @if (loadingValuation()) {
            <div class="loading-state">{{ 'INVENTORY.REPORTS.LOADING_VALUATION' | translate }}</div>
          } @else if (valuation()) {
            <div class="total-card">
              <span class="total-label">{{ 'INVENTORY.ITEMS.TOTAL_VALUE' | translate }}</span>
              <span class="total-value">{{ formatCurrency(valuation()!.total_value_cents) }}</span>
            </div>

            <div class="table-card">
              <table>
                <thead>
                  <tr>
                    <th>{{ 'INVENTORY.ITEMS.SKU' | translate }}</th>
                    <th>{{ 'INVENTORY.ITEMS.NAME' | translate }}</th>
                    <th>{{ 'INVENTORY.ITEMS.QUANTITY' | translate }}</th>
                    <th>{{ 'INVENTORY.REPORTS.FIFO_VALUE' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of valuation()!.items; track item.inventory_item_id) {
                    <tr>
                      <td class="sku-cell">{{ item.sku }}</td>
                      <td>{{ item.name }}</td>
                      <td>{{ item.quantity.toFixed(2) }} {{ item.unit }}</td>
                      <td class="price">{{ formatCurrency(item.fifo_value_cents) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <!-- Transaction History -->
        <div class="section">
          <div class="section-header">
            <h2>{{ 'INVENTORY.REPORTS.RECENT_TRANSACTIONS' | translate }}</h2>
          </div>

          @if (loadingTransactions()) {
            <div class="loading-state">{{ 'INVENTORY.REPORTS.LOADING_TRANSACTIONS' | translate }}</div>
          } @else if (transactions().length === 0) {
            <div class="empty-state">
              <p>{{ 'INVENTORY.REPORTS.NO_TRANSACTIONS' | translate }}</p>
            </div>
          } @else {
            <div class="table-card">
              <table>
                <thead>
                  <tr>
                    <th>{{ 'INVENTORY.REPORTS.DATE' | translate }}</th>
                    <th>{{ 'INVENTORY.ITEMS.NAME' | translate }}</th>
                    <th>{{ 'INVENTORY.REPORTS.TYPE' | translate }}</th>
                    <th>{{ 'INVENTORY.ITEMS.QUANTITY' | translate }}</th>
                    <th>{{ 'INVENTORY.REPORTS.COST' | translate }}</th>
                    <th>{{ 'INVENTORY.REPORTS.BALANCE' | translate }}</th>
                    <th>{{ 'INVENTORY.ITEMS.NOTES' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (txn of transactions(); track txn.id) {
                    <tr>
                      <td class="date-cell">{{ formatDateTime(txn.created_at) }}</td>
                      <td>{{ txn.inventory_item_name }}</td>
                      <td>
                        <span class="type-badge" [class]="txn.transaction_type">
                          {{ 'INVENTORY.TRANSACTION_TYPES.' + txn.transaction_type | translate }}
                        </span>
                      </td>
                      <td [class.positive]="txn.quantity > 0" [class.negative]="txn.quantity < 0">
                        {{ txn.quantity > 0 ? '+' : '' }}{{ txn.quantity.toFixed(2) }}
                      </td>
                      <td>{{ txn.total_cost_cents ? formatCurrency(txn.total_cost_cents) : '-' }}</td>
                      <td>{{ txn.balance_after.toFixed(2) }}</td>
                      <td class="notes-cell">{{ txn.notes || '-' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>
    </app-sidebar>
  `,
  styleUrl: './inventory-reports.component.scss'
})
export class InventoryReportsComponent implements OnInit {
  private inventoryService = inject(InventoryService);

  valuation = signal<InventoryValuation | null>(null);
  transactions = signal<InventoryTransaction[]>([]);
  loadingValuation = signal(true);
  loadingTransactions = signal(true);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loadingValuation.set(true);
    this.loadingTransactions.set(true);

    this.inventoryService.getInventoryValuation().subscribe({
      next: val => { this.valuation.set(val); this.loadingValuation.set(false); },
      error: () => this.loadingValuation.set(false)
    });

    this.inventoryService.getTransactions({ limit: 50 }).subscribe({
      next: txns => { this.transactions.set(txns); this.loadingTransactions.set(false); },
      error: () => this.loadingTransactions.set(false)
    });
  }

  formatCurrency(cents: number): string {
    return this.inventoryService.formatCurrency(cents);
  }

  formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString();
  }
}