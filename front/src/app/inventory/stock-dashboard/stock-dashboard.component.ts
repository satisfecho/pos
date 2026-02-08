/**
 * Stock Dashboard Component
 *
 * Overview of inventory with low-stock alerts.
 * Follows app design patterns.
 */

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../shared/sidebar.component';
import { InventoryService } from '../inventory.service';
import { StockLevel, LowStockItem, InventoryCategory } from '../inventory.types';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-stock-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SidebarComponent, TranslateModule],
  template: `
    <app-sidebar>
      <div class="page-header">
        <h1>{{ 'INVENTORY.DASHBOARD.TITLE' | translate }}</h1>
        <button class="btn btn-secondary" (click)="loadData()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
          </svg>
          {{ 'INVENTORY.COMMON.REFRESH' | translate }}
        </button>
      </div>

      <div class="content">
        <!-- Summary Cards -->
        <div class="stats-row">
          <div class="stat-card">
            <span class="stat-value">{{ totalItems() }}</span>
            <span class="stat-label">{{ 'INVENTORY.ITEMS.TOTAL_ITEMS' | translate }}</span>
          </div>
          <div class="stat-card stat-warning">
            <span class="stat-value">{{ lowStockCount() }}</span>
            <span class="stat-label">{{ 'INVENTORY.DASHBOARD.LOW_STOCK_ALERTS' | translate }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ formatCurrency(totalValue()) }}</span>
            <span class="stat-label">{{ 'INVENTORY.ITEMS.TOTAL_VALUE' | translate }}</span>
          </div>
        </div>

        <!-- Low Stock Alerts -->
        @if (lowStockItems().length > 0) {
          <div class="section">
            <div class="section-header">
              <h2>{{ 'INVENTORY.DASHBOARD.LOW_STOCK_ALERTS' | translate }}</h2>
              <span class="badge warning">{{ lowStockItems().length }}</span>
            </div>
            <div class="alert-cards">
              @for (item of lowStockItems(); track item.id) {
                <div class="alert-card">
                  <div class="alert-info">
                    <strong>{{ item.name }}</strong>
                    <span class="sku">{{ item.sku }}</span>
                  </div>
                  <div class="alert-details">
                    <div class="alert-stat">
                      <span class="label">{{ 'INVENTORY.ITEMS.CURRENT' | translate }}</span>
                      <span class="value negative">{{ item.current_quantity.toFixed(2) }}</span>
                    </div>
                    <div class="alert-stat">
                      <span class="label">{{ 'INVENTORY.ITEMS.REORDER' | translate }}</span>
                      <span class="value">{{ item.reorder_level.toFixed(2) }}</span>
                    </div>
                    <div class="alert-stat">
                      <span class="label">{{ 'INVENTORY.DASHBOARD.SUGGEST' | translate }}</span>
                      <span class="value primary">{{ item.suggested_order_quantity.toFixed(2) }}</span>
                    </div>
                  </div>
                  <a routerLink="/inventory/purchase-orders" class="btn btn-primary btn-sm">
                    {{ 'INVENTORY.DASHBOARD.CREATE_PO' | translate }}
                  </a>
                </div>
              }
            </div>
          </div>
        }

        <!-- Stock Levels Table -->
        <div class="section">
          <div class="section-header">
            <h2>{{ 'INVENTORY.DASHBOARD.STOCK_LEVELS' | translate }}</h2>
            <select [(ngModel)]="categoryFilter" (change)="applyFilter()">
              <option value="">{{ 'INVENTORY.ITEMS.ALL_CATEGORIES' | translate }}</option>
              @for (cat of categories; track cat) {
                <option [value]="cat">{{ formatCategory(cat) }}</option>
              }
            </select>
          </div>

          @if (loading()) {
            <div class="empty-state"><p>{{ 'INVENTORY.DASHBOARD.LOADING' | translate }}</p></div>
          } @else if (filteredStockLevels().length === 0) {
            <div class="empty-state">
              <div class="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                </svg>
              </div>
              <h3>{{ 'INVENTORY.ITEMS.NO_ITEMS_YET' | translate }}</h3>
              <p>{{ 'INVENTORY.ITEMS.NO_ITEMS_DESC' | translate }}</p>
              <a routerLink="/inventory/items" class="btn btn-primary">{{ 'INVENTORY.DASHBOARD.GO_TO_ITEMS' | translate }}</a>
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
                    <th>{{ 'INVENTORY.ITEMS.REORDER_LEVEL' | translate }}</th>
                    <th>{{ 'INVENTORY.ITEMS.VALUE' | translate }}</th>
                    <th>{{ 'INVENTORY.ITEMS.STATUS' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of filteredStockLevels(); track item.id) {
                    <tr [class.low-stock-row]="item.is_low_stock">
                      <td class="sku-cell">{{ item.sku }}</td>
                      <td>{{ item.name }}</td>
                      <td>{{ formatCategory(item.category) }}</td>
                      <td [class.negative]="item.current_quantity < 0">
                        {{ item.current_quantity.toFixed(2) }} {{ item.unit }}
                      </td>
                      <td>{{ item.reorder_level.toFixed(2) }}</td>
                      <td>{{ formatCurrency(item.total_value_cents) }}</td>
                      <td>
                        @if (item.is_low_stock) {
                          <span class="status-badge warning">{{ 'INVENTORY.ITEMS.STATUS_LOW_STOCK' | translate }}</span>
                        } @else {
                          <span class="status-badge success">{{ 'INVENTORY.ITEMS.STATUS_OK' | translate }}</span>
                        }
                      </td>
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
  styleUrl: './stock-dashboard.component.scss'
})
export class StockDashboardComponent implements OnInit {
  private inventoryService = inject(InventoryService);

  stockLevels = signal<StockLevel[]>([]);
  lowStockItems = signal<LowStockItem[]>([]);
  loading = signal(true);
  categoryFilter = '';

  categories: InventoryCategory[] = ['ingredients', 'beverages', 'packaging', 'cleaning', 'equipment', 'other'];

  filteredStockLevels = computed(() => {
    let result = this.stockLevels();
    if (this.categoryFilter) {
      result = result.filter(i => i.category === this.categoryFilter);
    }
    return result;
  });

  totalItems = computed(() => this.stockLevels().length);
  lowStockCount = computed(() => this.lowStockItems().length);
  totalValue = computed(() => this.stockLevels().reduce((sum, i) => sum + i.total_value_cents, 0));

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.inventoryService.getStockLevels().subscribe({
      next: levels => { this.stockLevels.set(levels); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
    this.inventoryService.getLowStockItems().subscribe({
      next: items => this.lowStockItems.set(items),
      error: () => { }
    });
  }

  applyFilter() {
    this.stockLevels.update(levels => [...levels]);
  }

  formatCurrency(cents: number): string {
    return this.inventoryService.formatCurrency(cents);
  }

  formatCategory(cat: string): string {
    return cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : '-';
  }
}