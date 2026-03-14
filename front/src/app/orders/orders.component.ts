import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, Order, OrderItem } from '../services/api.service';
import { AudioService } from '../services/audio.service';
import { PermissionService, Permission } from '../services/permission.service';
import { Subscription } from 'rxjs';
import { AgGridAngular } from 'ag-grid-angular';
import { SidebarComponent } from '../shared/sidebar.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  ColDef,
  ModuleRegistry,
  ClientSideRowModelModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  themeQuartz,
  ICellRendererParams,
} from 'ag-grid-community';

ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
]);

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [AgGridAngular, SidebarComponent, FormsModule, TranslateModule],
  template: `
    <app-sidebar>
        <div class="page-header">
          <h1>{{ 'ORDERS.TITLE' | translate }}</h1>
          <button class="btn btn-secondary" (click)="loadOrders()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
            {{ 'ORDERS.REFRESH' | translate }}
          </button>
        </div>

        <div class="content">
          @if (loading()) {
            <div class="empty-state"><p>{{ 'ORDERS.LOADING' | translate }}</p></div>
          } @else {
            <!-- Filter Toggle -->
            <div class="filter-tabs">
              <button 
                class="filter-tab" 
                [class.active]="viewMode() === 'active'"
                (click)="viewMode.set('active')">
                {{ 'ORDERS.ACTIVE_ORDERS' | translate }}
                @if (activeOrders().length > 0) {
                  <span class="tab-badge">{{ activeOrders().length }}</span>
                }
              </button>
              <button 
                class="filter-tab" 
                [class.active]="viewMode() === 'not_paid'"
                (click)="viewMode.set('not_paid')">
                {{ 'ORDERS.NOT_PAID_YET' | translate }}
                @if (notPaidOrders().length > 0) {
                  <span class="tab-badge">{{ notPaidOrders().length }}</span>
                }
              </button>
              @if (viewMode() === 'active') {
                <label class="toggle-removed">
                  <input type="checkbox" [(ngModel)]="showRemovedItems" (change)="loadOrders()">
                  <span>{{ 'ORDERS.SHOW_REMOVED_ITEMS' | translate }}</span>
                </label>
              }
            </div>

            <!-- Active Orders Section -->
            @if (viewMode() === 'active' && activeOrders().length > 0) {
              <div class="order-grid">
                @for (order of activeOrders(); track order.id) {
                  <div class="order-card" [class]="'status-' + order.status">
                    <div class="order-header">
                      <div>
                        <span class="order-id">#{{ order.id }}</span>
                        <span class="order-table">{{ order.table_name }}</span>
                        @if (order.customer_name) {
                          <span class="order-customer">{{ 'ORDERS.CUSTOMER' | translate }}: {{ order.customer_name }}</span>
                        }
                        <span class="order-time" [title]="formatExactTime(order.created_at)">{{ 'ORDERS.ORDER_TIME' | translate }}: {{ formatOrderTime(order.created_at) }}</span>
                      </div>
                      <span class="status-badge" [class]="order.status">{{ getStatusLabel(order.status) }}</span>
                    </div>

                    <div class="order-items">
                      @for (item of getSortedItems(order.items); track item.id) {
                        <div class="order-item" [class.removed]="item.removed_by_customer">
                          <div class="item-name-row">
                            <span class="item-qty">
                              @if (!item.removed_by_customer && item.status !== 'delivered') {
                                <input type="number" 
                                  [value]="item.quantity" 
                                  (change)="updateItemQuantity(order.id, item.id!, +$any($event.target).value)"
                                  min="1" 
                                  class="quantity-input"
                                />
                              } @else {
                                {{ item.quantity }}x
                              }
                            </span>
                            <span class="item-name">{{ item.product_name }}</span>
                          </div>
                          <div class="item-details-row">
                            <span class="item-price">
                              {{ formatPrice(item.price_cents) }}
                              @if (item.quantity > 1) {
                                <span class="price-total">({{ formatPrice(item.price_cents * item.quantity) }} total)</span>
                              }
                            </span>
                            <div class="item-actions">
                              @if (!item.removed_by_customer && item.status !== 'delivered') {
                                <button class="btn-remove-item" (click)="removeItemStaff(order.id, item.id!, item.status ?? 'pending')" [title]="'ORDERS.REMOVE_ITEM' | translate">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                  </svg>
                                </button>
                              }
                              @if (item.status && !item.removed_by_customer) {
                                <div class="item-status-control">
                                  <button 
                                    class="item-status-badge clickable" 
                                    [class]="'status-' + item.status"
                                    (click)="toggleItemStatusDropdown(order.id, item.id!)"
                                    [title]="'ORDERS.CLICK_TO_CHANGE_STATUS' | translate">
                                    {{ getItemStatusLabel(item.status) }}
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                      <polyline points="6,9 12,15 18,9"/>
                                    </svg>
                                  </button>
                                  @if (itemStatusDropdownOpen() === order.id + '-' + item.id) {
                                    <div class="status-dropdown item-status-dropdown" (click)="$event.stopPropagation()">
                                      @if (getItemStatusTransitions(item.status).backward.length > 0) {
                                        <div class="dropdown-section">
                                          <div class="dropdown-label">{{ 'ORDERS.GO_BACK' | translate }}</div>
                                          @for (status of getItemStatusTransitions(item.status).backward; track status) {
                                            <button 
                                              class="dropdown-item backward"
                                              (click)="updateItemStatus(order.id, item.id!, status); itemStatusDropdownOpen.set(null)">
                                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <polyline points="15,18 9,12 15,6"/>
                                              </svg>
                                              {{ getItemStatusLabel(status) }}
                                            </button>
                                          }
                                        </div>
                                      }
                                      @if (getItemStatusTransitions(item.status).forward.length > 0) {
                                        <div class="dropdown-section">
                                          <div class="dropdown-label">{{ 'ORDERS.MOVE_FORWARD' | translate }}</div>
                                          @for (status of getItemStatusTransitions(item.status).forward; track status) {
                                            <button 
                                              class="dropdown-item forward"
                                              (click)="updateItemStatus(order.id, item.id!, status); itemStatusDropdownOpen.set(null)">
                                              {{ getItemStatusLabel(status) }}
                                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <polyline points="9,18 15,12 9,6"/>
                                              </svg>
                                            </button>
                                          }
                                        </div>
                                      }
                                    </div>
                                  }
                                </div>
                              }
                            </div>
                          </div>
                          @if (item.removed_by_customer) {
                            <div class="removed-indicator">
                              <span class="removed-label">{{ 'ORDERS.REMOVED_BY_CUSTOMER' | translate }}</span>
                              @if (item.removed_at) {
                                <span class="removed-time">{{ formatTime(item.removed_at) }}</span>
                              }
                            </div>
                          }
                        </div>
                      }
                    </div>

                    <div class="order-footer">
                      <div class="order-footer-left">
                        <span class="order-total">{{ 'ORDERS.TOTAL' | translate }}: {{ formatPrice(order.total_cents) }}</span>
                        @if (order.removed_items_count && order.removed_items_count > 0) {
                          <span class="removed-count">{{ 'ORDERS.ITEMS_REMOVED' | translate:{ count: order.removed_items_count } }}</span>
                        }
                      </div>
                      <div class="order-actions">
                        <div class="status-control">
                          <button 
                            class="status-badge-btn" 
                            [class]="order.status"
                            (click)="toggleStatusDropdown(order.id)"
                            [title]="'ORDERS.CLICK_TO_CHANGE_STATUS' | translate">
                            {{ getStatusLabel(order.status) }}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <polyline points="6,9 12,15 18,9"/>
                            </svg>
                          </button>
                          @if (statusDropdownOpen() === order.id) {
                            <div class="status-dropdown" (click)="$event.stopPropagation()">
                              @if (getOrderStatusTransitions(order.status).backward.length > 0) {
                                <div class="dropdown-section">
                                  <div class="dropdown-label">{{ 'ORDERS.GO_BACK' | translate }}</div>
                                  @for (status of getOrderStatusTransitions(order.status).backward; track status) {
                                    <button 
                                      class="dropdown-item backward"
                                      (click)="updateStatus(order, status)">
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="15,18 9,12 15,6"/>
                                      </svg>
                                      {{ getStatusLabel(status) }}
                                    </button>
                                  }
                                </div>
                              }
                              @if (getOrderStatusTransitions(order.status).forward.length > 0) {
                                <div class="dropdown-section">
                                  <div class="dropdown-label">{{ 'ORDERS.MOVE_FORWARD' | translate }}</div>
                                  @for (status of getOrderStatusTransitions(order.status).forward; track status) {
                                    <button 
                                      class="dropdown-item forward"
                                      (click)="updateStatus(order, status)">
                                      {{ getStatusLabel(status) }}
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="9,18 15,12 9,6"/>
                                      </svg>
                                    </button>
                                  }
                                </div>
                              }
                              @if (order.status === 'completed' && canMarkPaid()) {
                                <div class="dropdown-section">
                                  <button 
                                    class="dropdown-item forward"
                                    (click)="markAsPaid(order); statusDropdownOpen.set(null)">
                                    {{ 'ORDERS.MARK_AS_PAID' | translate }}
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                      <polyline points="9,18 15,12 9,6"/>
                                    </svg>
                                  </button>
                                </div>
                              }
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            } @else if (viewMode() === 'active' && activeOrders().length === 0 && notPaidOrders().length === 0) {
              <div class="empty-state">
                <div class="empty-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                  </svg>
                </div>
                <h3>{{ 'ORDERS.NO_ORDERS' | translate }}</h3>
                <p>{{ 'ORDERS.NO_ORDERS_DESC' | translate }}</p>
              </div>
            }

            <!-- Not Paid Yet Section -->
            @if (viewMode() === 'not_paid') {
              @if (notPaidOrders().length > 0) {
                <div class="order-grid">
                  @for (order of notPaidOrders(); track order.id) {
                    <div class="order-card" [class]="'status-' + order.status">
                      <div class="order-header">
                        <div>
                          <span class="order-id">#{{ order.id }}</span>
                          <span class="order-table">{{ order.table_name }}</span>
                          @if (order.customer_name) {
                            <span class="order-customer">{{ 'ORDERS.CUSTOMER' | translate }}: {{ order.customer_name }}</span>
                          }
                          <span class="order-time" [title]="formatExactTime(order.created_at)">{{ 'ORDERS.ORDER_TIME' | translate }}: {{ formatOrderTime(order.created_at) }}</span>
                        </div>
                        <span class="status-badge" [class]="order.status">{{ getStatusLabel(order.status) }}</span>
                      </div>

                      <div class="order-items">
                        @for (item of order.items; track item.id) {
                          <div class="order-item" [class.removed]="item.removed_by_customer">
                            <div class="item-name-row">
                              <span class="item-qty">{{ item.quantity }}x</span>
                              <span class="item-name">{{ item.product_name }}</span>
                            </div>
                            <div class="item-details-row">
                              <span class="item-price">
                                {{ formatPrice(item.price_cents) }}
                                @if (item.quantity > 1) {
                                  <span class="price-total">({{ formatPrice(item.price_cents * item.quantity) }} total)</span>
                                }
                              </span>
                              @if (item.status && !item.removed_by_customer) {
                                <span class="item-status-badge" [class]="'status-' + item.status">
                                  {{ getItemStatusLabel(item.status) }}
                                </span>
                              }
                            </div>
                          </div>
                        }
                      </div>

                      <div class="order-footer">
                        <div class="order-footer-left">
                          <span class="order-total">{{ 'ORDERS.TOTAL' | translate }}: {{ formatPrice(order.total_cents) }}</span>
                          @if (order.removed_items_count && order.removed_items_count > 0) {
                            <span class="removed-count">{{ 'ORDERS.ITEMS_REMOVED' | translate:{ count: order.removed_items_count } }}</span>
                          }
                        </div>
                        <div class="order-actions">
                          <div class="status-control">
                            <button 
                              class="status-badge-btn" 
                              [class]="order.status"
                              (click)="toggleStatusDropdown(order.id)"
                              [title]="'Click to change status'">
                              {{ getStatusLabel(order.status) }}
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6,9 12,15 18,9"/>
                              </svg>
                            </button>
                            @if (statusDropdownOpen() === order.id) {
                              <div class="status-dropdown" (click)="$event.stopPropagation()">
                                @if (getOrderStatusTransitions(order.status).backward.length > 0) {
                                  <div class="dropdown-section">
                                    <div class="dropdown-label">{{ 'ORDERS.GO_BACK' | translate }}</div>
                                    @for (status of getOrderStatusTransitions(order.status).backward; track status) {
                                      <button 
                                        class="dropdown-item backward"
                                        (click)="updateStatus(order, status)">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                          <polyline points="15,18 9,12 15,6"/>
                                        </svg>
                                        {{ getStatusLabel(status) }}
                                      </button>
                                    }
                                  </div>
                                }
                                @if (getOrderStatusTransitions(order.status).forward.length > 0) {
                                  <div class="dropdown-section">
                                    <div class="dropdown-label">{{ 'ORDERS.MOVE_FORWARD' | translate }}</div>
                                    @for (status of getOrderStatusTransitions(order.status).forward; track status) {
                                      <button 
                                        class="dropdown-item forward"
                                        (click)="updateStatus(order, status)">
                                        {{ getStatusLabel(status) }}
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                          <polyline points="9,18 15,12 9,6"/>
                                        </svg>
                                      </button>
                                    }
                                  </div>
                                }
                                @if (canMarkPaid()) {
                                  <div class="dropdown-section">
                                    <button 
                                      class="dropdown-item forward"
                                      (click)="markAsPaid(order); statusDropdownOpen.set(null)">
                                      {{ 'ORDERS.MARK_AS_PAID' | translate }}
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="9,18 15,12 9,6"/>
                                      </svg>
                                    </button>
                                  </div>
                                }
                              </div>
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-state">
                  <div class="empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M9 12l2 2 4-4M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
                    </svg>
                  </div>
                  <h3>{{ 'ORDERS.ALL_ORDERS_PAID' | translate }}</h3>
                  <p>{{ 'ORDERS.NO_UNPAID_ORDERS' | translate }}</p>
                </div>
              }
            }

            <!-- Order History Section (AG Grid) -->
            @if (completedOrders().length > 0) {
              <div class="section-header history-header">
                <h2>{{ 'ORDERS.ORDER_HISTORY' | translate }}</h2>
                <span class="badge secondary">{{ completedOrders().length }}</span>
              </div>
              <div class="grid-container">
                <ag-grid-angular
                  style="width: 100%; height: 400px;"
                  [theme]="gridTheme"
                  [rowData]="completedOrders()"
                  [columnDefs]="columnDefs"
                  [defaultColDef]="defaultColDef"
                />
              </div>
            }
          }
        </div>

        <!-- Mark as Paid Modal -->
        @if (orderToMarkPaid()) {
          <div class="modal-overlay" (click)="closePaymentModal()">
            <div class="modal" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3>{{ 'ORDERS.MARK_ORDER_AS_PAID' | translate }}</h3>
                <button class="icon-btn" (click)="closePaymentModal()">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div class="modal-body">
                <p>{{ 'ORDERS.ORDER_ID' | translate }}{{ orderToMarkPaid()!.id }} - {{ 'ORDERS.TOTAL' | translate }}: {{ formatPrice(orderToMarkPaid()!.total_cents) }}</p>
                <div class="form-group">
                  <label for="payment-method">{{ 'ORDERS.PAYMENT_METHOD' | translate }}</label>
                  <select id="payment-method" [(ngModel)]="paymentMethod" class="form-select">
                    <option value="cash">{{ 'ORDERS.CASH' | translate }}</option>
                    <option value="terminal">{{ 'ORDERS.CARD_TERMINAL' | translate }}</option>
                    <option value="stripe">{{ 'ORDERS.STRIPE_ONLINE' | translate }}</option>
                    <option value="other">{{ 'ORDERS.OTHER' | translate }}</option>
                  </select>
                </div>
              </div>
              <div class="modal-actions">
                <button class="btn btn-secondary" (click)="closePaymentModal()">{{ 'ORDERS.CANCEL' | translate }}</button>
                <button class="btn btn-primary" (click)="confirmMarkAsPaid()" [disabled]="processingPayment()">
                  {{ processingPayment() ? ('ORDERS.PROCESSING' | translate) : ('ORDERS.MARK_AS_PAID' | translate) }}
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Confirmation Modal (replaces native confirm/prompt) -->
        @if (confirmAction()) {
          <div class="modal-overlay" (click)="closeConfirmModal()">
            <div class="modal" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3>{{ 'COMMON.CONFIRM' | translate }}</h3>
                <button class="icon-btn" (click)="closeConfirmModal()">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div class="modal-body">
                <p>{{ confirmAction()!.message }}</p>
                @if (confirmAction()!.requireReason) {
                  <div class="form-group">
                    <textarea 
                      class="form-textarea"
                      [(ngModel)]="confirmReason"
                      rows="3"
                      [placeholder]="'COMMON.DESCRIPTION' | translate"
                    ></textarea>
                  </div>
                }
              </div>
              <div class="modal-actions">
                <button class="btn btn-secondary" (click)="closeConfirmModal()">{{ 'COMMON.CANCEL' | translate }}</button>
                <button class="btn btn-primary" (click)="handleConfirm()">
                  {{ confirmAction()!.confirmText || ('COMMON.CONFIRM' | translate) }}
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Toast Notification -->
        @if (toast()) {
          <div class="toast" [class]="toast()!.type">
            <span>{{ toast()!.message }}</span>
            <button class="toast-close" (click)="toast.set(null)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        }

        <!-- Waiter Alert Banner -->
        @if (waiterAlert()) {
          <div class="waiter-alert-banner" [class.payment]="waiterAlert()!.type === 'payment_requested'">
            <div class="waiter-alert-icon">
              @if (waiterAlert()!.type === 'call_waiter') {
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94"/>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3 5.18 2 2 0 0 1 5 3h3a2 2 0 0 1 2 1.72c.13.81.36 1.61.68 2.36a2 2 0 0 1-.45 2.11L8.91 10.5a16 16 0 0 0 6.59 6.59l1.31-1.32a2 2 0 0 1 2.11-.45c.75.32 1.55.55 2.36.68A2 2 0 0 1 22 16.92z"/>
                </svg>
              } @else {
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              }
            </div>
            <div class="waiter-alert-text">
              <strong>{{ waiterAlert()!.tableName }}</strong>
              <span>{{ waiterAlert()!.type === 'call_waiter' ? ('NOTIFICATIONS.CALL_WAITER_YOURS' | translate) : ('NOTIFICATIONS.PAYMENT_REQUEST_YOURS' | translate) }}</span>
            </div>
            <button class="waiter-alert-dismiss" (click)="waiterAlert.set(null)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        }
    </app-sidebar>
  `,
  styleUrl: './orders.component.scss'
})
export class OrdersComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private router = inject(Router);
  private audio = inject(AudioService);
  private translate = inject(TranslateService);
  private permissions = inject(PermissionService);

  // Permission checks for UI
  canUpdateStatus = computed(() => this.permissions.hasPermission(this.api.getCurrentUser(), 'order:update_status'));
  canUpdateItemStatus = computed(() => this.permissions.hasPermission(this.api.getCurrentUser(), 'order:item_status'));
  canMarkPaid = computed(() => this.permissions.hasPermission(this.api.getCurrentUser(), 'order:mark_paid'));
  canCancelOrder = computed(() => this.permissions.hasPermission(this.api.getCurrentUser(), 'order:cancel'));
  canRemoveItem = computed(() => this.permissions.hasPermission(this.api.getCurrentUser(), 'order:remove_item'));

  // Get browser's timezone automatically
  private getBrowserTimezone(): string {
    try {
      // Use Intl API to get the timezone
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      // Fallback: try to detect from date offset
      const offset = -new Date().getTimezoneOffset();
      const hours = Math.floor(Math.abs(offset) / 60);
      const minutes = Math.abs(offset) % 60;
      const sign = offset >= 0 ? '+' : '-';
      return `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }
  private wsSub?: Subscription;
  private toastTimeout?: ReturnType<typeof setTimeout>;
  private quantityDebounceTimeout?: ReturnType<typeof setTimeout>;

  orders = signal<Order[]>([]);
  loading = signal(true);
  currency = signal<string>('$');
  currencyCode = signal<string | null>(null);
  showRemovedItems = false;
  viewMode = signal<'active' | 'not_paid'>('active');
  orderToMarkPaid = signal<Order | null>(null);
  paymentMethod = 'cash';
  processingPayment = signal(false);
  statusDropdownOpen = signal<number | null>(null); // Order ID for which dropdown is open
  itemStatusDropdownOpen = signal<string | null>(null); // "orderId-itemId" for which dropdown is open

  // Toast notification system (replaces native alerts)
  toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);
  waiterAlert = signal<{ message: string; tableName: string; type: 'call_waiter' | 'payment_requested' } | null>(null);

  // Confirmation modal (replaces native confirm)
  confirmAction = signal<{
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    requireReason?: boolean;
  } | null>(null);
  confirmReason = '';

  // Loading state for async actions
  loadingAction = signal<string | null>(null);

  // Computed signals for separating active and completed orders
  activeOrders = computed(() =>
    this.orders().filter(o => ['pending', 'preparing', 'ready', 'partially_delivered'].includes(o.status))
  );
  completedOrders = computed(() =>
    this.orders().filter(o => ['completed', 'paid', 'cancelled'].includes(o.status))
  );
  notPaidOrders = computed(() =>
    this.orders().filter(o => o.status === 'completed' && !o.paid_at)
  );

  // AG Grid configuration - custom light theme matching app colors
  gridTheme = themeQuartz.withParams({
    backgroundColor: '#FFFFFF',
    foregroundColor: '#1C1917',
    accentColor: '#D35233',
    borderColor: '#E7E5E4',
    chromeBackgroundColor: '#FAF9F7',
    headerTextColor: '#1C1917',
    oddRowBackgroundColor: 'rgba(0, 0, 0, 0.02)',
    rowHoverColor: 'rgba(211, 82, 51, 0.05)',
    selectedRowBackgroundColor: 'rgba(211, 82, 51, 0.1)',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    borderRadius: 10,
    wrapperBorderRadius: 10,
  });

  get columnDefs(): ColDef[] {
    const currencySymbol = this.currency();
    const currencyCode = this.currencyCode();
    const locale = navigator.language || 'en-US';
    const formatCurrency = (value: number) => {
      if (currencyCode) {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: currencyCode,
          currencyDisplay: 'symbol'
        }).format(value / 100);
      }
      return `${currencySymbol}${(value / 100).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };
    return [
      {
        field: 'id',
        headerName: this.translate.instant('ORDERS.GRID.ORDER_NUMBER'),
        width: 100,
        valueFormatter: (params) => `#${params.value}`,
      },
      {
        field: 'table_name',
        headerName: this.translate.instant('ORDERS.GRID.TABLE'),
        width: 120,
      },
      {
        field: 'customer_name',
        headerName: this.translate.instant('ORDERS.GRID.CUSTOMER'),
        width: 150,
        valueFormatter: (params) => params.value || '-',
      },
      {
        field: 'items',
        headerName: this.translate.instant('ORDERS.GRID.ITEMS'),
        flex: 1,
        valueFormatter: (params) => {
          if (!params.value) return '';
          return params.value.map((item: any) => `${item.quantity}x ${item.product_name}`).join(', ');
        },
      },
      {
        field: 'total_cents',
        headerName: this.translate.instant('ORDERS.GRID.TOTAL'),
        width: 110,
        valueFormatter: (params) => {
          if (params.value == null) return '';
          return formatCurrency(params.value);
        },
      },
      {
        field: 'status',
        headerName: this.translate.instant('ORDERS.GRID.STATUS'),
        width: 120,
        cellRenderer: (params: ICellRendererParams) => {
          const status = params.value;
          const statusLabel = this.translate.instant(`ORDER_STATUS.${status}`) || status;
          const colorMap: Record<string, string> = {
            completed: '#78716C',  // matches --color-text-muted
            paid: '#16A34A',       // matches --color-success
          };
          const color = colorMap[status] || '#78716C';
          return `<span style="
            display: inline-block;
            padding: 2px 10px;
            border-radius: 12px;
            font-size: 0.7rem;
            font-weight: 600;
            background: ${color}20;
            color: ${color};
            line-height: 1.4;
          ">${statusLabel}</span>`;
        },
      },
      {
        field: 'created_at',
        headerName: this.translate.instant('ORDERS.GRID.DATE'),
        width: 220,
        valueFormatter: (params) => {
          if (!params.value) return '';
          // Parse date - backend sends ISO without timezone, treat as UTC
          const dateStr = params.value.endsWith('Z') || params.value.includes('+') || params.value.includes('-', 10)
            ? params.value
            : params.value + 'Z';
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return '';
          // Use browser's local timezone for display
          const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          return date.toLocaleString(undefined, {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: timeZone,
            hour12: false
          });
        },
      },
    ];
  }

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
  };

  ngOnInit() {
    this.loadTenantSettings();
    this.loadOrders();
    // Connect WebSocket for real-time updates (non-blocking - HTTP requests work without it)
    try {
      this.api.connectWebSocket();
      this.wsSub = this.api.orderUpdates$.subscribe((update: any) => {
        if (update && update.type) {
          // Check for waiter-specific notifications
          if (update.type === 'call_waiter' || update.type === 'payment_requested') {
            const currentUser = this.api.getCurrentUser();
            const isMyTable = currentUser?.id && update.assigned_waiter_id === currentUser.id;
            const isManager = currentUser?.role === 'admin' || currentUser?.role === 'owner';

            if (isMyTable || isManager) {
              // Prominent alert for assigned waiter or manager/admin
              this.audio.playUrgentWaiterAlert();
              this.waiterAlert.set({
                message: update.message || '',
                tableName: update.table_name || 'Table',
                type: update.type,
              });
              // Auto-dismiss after 15 seconds
              setTimeout(() => this.waiterAlert.set(null), 15000);
            } else {
              // Regular notification for other staff
              this.audio.playRestaurantOrderChange();
            }
          } else {
            // Play sound notification for order changes
            const changeTypes = ['item_removed', 'item_updated', 'order_cancelled', 'new_order', 'items_added'];
            if (changeTypes.includes(update.type)) {
              this.audio.playRestaurantOrderChange();
            }
          }
        }
        this.loadOrders();
      });
    } catch (error) {
      console.warn('WebSocket connection failed, continuing without real-time updates:', error);
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.status-control') && !target.closest('.item-status-control')) {
        this.statusDropdownOpen.set(null);
        this.itemStatusDropdownOpen.set(null);
      }
    });
  }

  ngOnDestroy() {
    this.wsSub?.unsubscribe();
  }


  loadOrders() {
    this.loading.set(true);
    this.api.getOrders(this.showRemovedItems).subscribe({
      next: orders => { this.orders.set(orders); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  getStatusLabel(status: string): string {
    return this.translate.instant(`ORDER_STATUS.${status}`) || status;
  }

  getItemStatusLabel(status: string): string {
    return this.translate.instant(`ITEM_STATUS.${status}`) || status;
  }

  showToast(message: string, type: 'success' | 'error') {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toast.set({ message, type });
    this.toastTimeout = setTimeout(() => {
      this.toast.set(null);
    }, 4000);
  }

  openConfirmModal(message: string, onConfirm: () => void, options?: { confirmText?: string; requireReason?: boolean }) {
    this.confirmReason = '';
    this.confirmAction.set({
      message,
      onConfirm,
      confirmText: options?.confirmText,
      requireReason: options?.requireReason
    });
  }

  closeConfirmModal() {
    this.confirmAction.set(null);
    this.confirmReason = '';
  }

  handleConfirm() {
    const action = this.confirmAction();
    if (action) {
      action.onConfirm();
      this.closeConfirmModal();
    }
  }

  formatTime(isoString: string): string {
    // Parse date - backend sends ISO without timezone, treat as UTC
    const dateStr = isoString.endsWith('Z') || isoString.includes('+') || isoString.includes('-', 10)
      ? isoString
      : isoString + 'Z';
    const date = new Date(dateStr);
    // Use browser's local timezone for display
    const timeZone = this.getBrowserTimezone();
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timeZone
    });
  }

  loadTenantSettings() {
    this.api.getTenantSettings().subscribe({
      next: (settings) => {
        this.currency.set(settings.currency || '$');
        this.currencyCode.set(settings.currency_code || null);
      },
      error: (err) => {
        console.error('Failed to load tenant settings:', err);
        // Default to $ if settings can't be loaded
      }
    });
  }

  formatPrice(priceCents: number): string {
    const currencySymbol = this.currency();
    const currencyCode = this.currencyCode();
    const locale = navigator.language || 'en-US';
    if (currencyCode) {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        currencyDisplay: 'symbol'
      }).format(priceCents / 100);
    }
    return `${currencySymbol}${(priceCents / 100).toFixed(2)}`;
  }

  formatExactTime(dateString: string): string {
    if (!dateString) return 'Unknown';

    try {
      // Parse as UTC if it has timezone indicator, otherwise assume UTC
      // Backend sends ISO format without timezone, so we treat it as UTC
      const dateStr = dateString.endsWith('Z') || dateString.includes('+') || dateString.includes('-', 10)
        ? dateString
        : dateString + 'Z';
      const date = new Date(dateStr);

      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }

      // Explicitly use browser's timezone for display
      const timeZone = this.getBrowserTimezone();
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: timeZone
      });
    } catch {
      return dateString;
    }
  }

  formatOrderTime(dateString: string): string {
    if (!dateString) return 'Unknown';

    // Parse the date string - ensure it's treated as UTC if no timezone is specified
    let date: Date;
    try {
      // If the string doesn't end with Z or timezone, assume it's UTC
      const dateStr = dateString.endsWith('Z') || dateString.includes('+') || dateString.includes('-', 10)
        ? dateString
        : dateString + 'Z';
      date = new Date(dateStr);
    } catch {
      date = new Date(dateString);
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return 'Invalid date';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    // Handle negative differences (future dates) - shouldn't happen but just in case
    if (diffMs < 0) {
      return 'Just now';
    }

    // Calculate time differences
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // If less than 1 minute ago
    if (diffSeconds < 60) {
      return diffSeconds < 10 ? 'Just now' : `${diffSeconds}s ago`;
    }
    // If less than 1 hour ago
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }
    // If less than 24 hours ago
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    // If less than 7 days ago
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }
    // Otherwise show formatted date and time in local timezone
    const timeZone = this.getBrowserTimezone();
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timeZone
    });
  }

  // Sort items: active (pending, preparing) on top, ready in middle, delivered at bottom
  getSortedItems(items: OrderItem[]): OrderItem[] {
    const statusOrder: Record<string, number> = {
      pending: 0,
      preparing: 1,
      ready: 2,
      delivered: 3,
      cancelled: 4
    };
    return [...items].sort((a, b) => {
      const aOrder = statusOrder[a.status || 'pending'] ?? 5;
      const bOrder = statusOrder[b.status || 'pending'] ?? 5;
      return aOrder - bOrder;
    });
  }

  // Get available status transitions for an order
  getOrderStatusTransitions(currentStatus: string): { forward: string[]; backward: string[] } {
    const transitions: Record<string, { forward: string[]; backward: string[] }> = {
      pending: { forward: ['preparing'], backward: [] },
      preparing: { forward: ['ready'], backward: ['pending'] },
      ready: { forward: ['completed'], backward: ['preparing'] },
      completed: { forward: [], backward: ['ready'] }, // Paid is handled via modal
      partially_delivered: { forward: ['completed'], backward: [] },
      paid: { forward: [], backward: ['completed'] },
      cancelled: { forward: [], backward: [] }
    };
    return transitions[currentStatus] || { forward: [], backward: [] };
  }

  // Get available status transitions for an item
  getItemStatusTransitions(currentStatus: string): { forward: string[]; backward: string[] } {
    const transitions: Record<string, { forward: string[]; backward: string[] }> = {
      pending: { forward: ['preparing'], backward: [] },
      preparing: { forward: ['ready'], backward: ['pending'] },
      ready: { forward: ['delivered'], backward: ['preparing'] },
      delivered: { forward: [], backward: ['ready'] },
      cancelled: { forward: [], backward: [] }
    };
    return transitions[currentStatus] || { forward: [], backward: [] };
  }

  toggleStatusDropdown(orderId: number) {
    this.statusDropdownOpen.update(current => current === orderId ? null : orderId);
  }

  toggleItemStatusDropdown(orderId: number, itemId: number) {
    const key = `${orderId}-${itemId}`;
    this.itemStatusDropdownOpen.update(current => current === key ? null : key);
  }

  updateStatus(order: Order, status: string) {
    this.statusDropdownOpen.set(null); // Close dropdown
    this.api.updateOrderStatus(order.id, status).subscribe({
      next: () => {
        this.orders.update(list =>
          list.map(o => o.id === order.id ? { ...o, status } : o)
        );
      }
    });
  }

  updateItemStatus(orderId: number, itemId: number, status: string) {
    this.api.updateOrderItemStatus(orderId, itemId, status).subscribe({
      next: () => {
        this.loadOrders();
      },
      error: (err) => {
        console.error('Failed to update item status:', err);
        this.showToast(this.translate.instant('ORDERS.FAILED_TO_UPDATE_STATUS'), 'error');
      }
    });
  }

  resetItemStatus(orderId: number, itemId: number) {
    this.api.resetItemStatus(orderId, itemId).subscribe({
      next: () => {
        this.loadOrders();
      },
      error: () => {
        this.showToast(this.translate.instant('ORDERS.FAILED_TO_RESET_STATUS'), 'error');
      }
    });
  }

  cancelItemWithReason(orderId: number, itemId: number) {
    this.openConfirmModal(
      this.translate.instant('ORDERS.CANCELLATION_REASON'),
      () => {
        if (!this.confirmReason.trim()) {
          this.showToast(this.translate.instant('ORDERS.REASON_REQUIRED'), 'error');
          return;
        }
        this.api.cancelOrderItemStaff(orderId, itemId, this.confirmReason).subscribe({
          next: () => {
            this.loadOrders();
          },
          error: () => {
            this.showToast(this.translate.instant('ORDERS.FAILED_TO_CANCEL_ITEM'), 'error');
          }
        });
      },
      { requireReason: true, confirmText: this.translate.instant('COMMON.CONFIRM') }
    );
  }

  updateItemQuantity(orderId: number, itemId: number, quantity: number) {
    if (quantity <= 0) {
      this.showToast(this.translate.instant('ORDERS.QUANTITY_MIN_ERROR'), 'error');
      return;
    }
    // Debounce quantity updates to avoid too many API calls
    if (this.quantityDebounceTimeout) {
      clearTimeout(this.quantityDebounceTimeout);
    }
    this.quantityDebounceTimeout = setTimeout(() => {
      this.api.updateOrderItemQuantityStaff(orderId, itemId, quantity).subscribe({
        next: () => {
          this.loadOrders();
        },
        error: () => {
          this.showToast(this.translate.instant('ORDERS.FAILED_TO_UPDATE_ITEM'), 'error');
        }
      });
    }, 400);
  }

  removeItemStaff(orderId: number, itemId: number, itemStatus: string) {
    // If item is ready, require reason via confirmation modal
    if (itemStatus === 'ready') {
      this.openConfirmModal(
        this.translate.instant('ORDERS.REMOVAL_REASON'),
        () => {
          if (!this.confirmReason.trim()) {
            this.showToast(this.translate.instant('ORDERS.REMOVAL_REASON_REQUIRED'), 'error');
            return;
          }
          this.doRemoveItem(orderId, itemId, this.confirmReason);
        },
        { requireReason: true, confirmText: this.translate.instant('COMMON.CONFIRM') }
      );
    } else {
      // For non-ready items, simple confirmation
      this.openConfirmModal(
        this.translate.instant('ORDERS.REMOVE_ITEM_CONFIRM'),
        () => this.doRemoveItem(orderId, itemId),
        { confirmText: this.translate.instant('COMMON.CONFIRM') }
      );
    }
  }

  private doRemoveItem(orderId: number, itemId: number, reason?: string) {
    this.api.removeOrderItemStaff(orderId, itemId, reason).subscribe({
      next: () => {
        this.showToast(this.translate.instant('ORDERS.ITEM_REMOVED'), 'success');
        this.loadOrders();
      },
      error: () => {
        this.showToast(this.translate.instant('ORDERS.FAILED_TO_REMOVE_ITEM'), 'error');
      }
    });
  }

  markAsPaid(order: Order) {
    this.statusDropdownOpen.set(null); // Close dropdown
    this.orderToMarkPaid.set(order);
    this.paymentMethod = 'cash'; // Reset to default
  }

  closePaymentModal() {
    this.orderToMarkPaid.set(null);
    this.processingPayment.set(false);
  }

  confirmMarkAsPaid() {
    const order = this.orderToMarkPaid();
    if (!order || !this.paymentMethod) return;

    this.processingPayment.set(true);
    this.api.markOrderPaid(order.id, this.paymentMethod).subscribe({
      next: () => {
        this.processingPayment.set(false);
        this.closePaymentModal();
        this.loadOrders();
      },
      error: () => {
        this.processingPayment.set(false);
        this.showToast(this.translate.instant('ORDERS.FAILED_TO_MARK_PAID'), 'error');
      }
    });
  }
}
