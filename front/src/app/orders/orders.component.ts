import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ApiService, Order, User } from '../services/api.service';
import { Subscription } from 'rxjs';
import { AgGridAngular } from 'ag-grid-angular';
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
  imports: [DecimalPipe, RouterLink, RouterLinkActive, AgGridAngular],
  template: `
    <div class="layout" [class.sidebar-open]="sidebarOpen()">
      <header class="mobile-header">
        <button class="menu-toggle" (click)="toggleSidebar()">
          <span></span><span></span><span></span>
        </button>
        <span class="header-title">POS</span>
      </header>

      <aside class="sidebar">
        <div class="sidebar-header">
          <span class="logo">POS</span>
          <button class="close-btn" (click)="closeSidebar()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <nav class="nav">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link" (click)="closeSidebar()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            </svg>
            <span>Home</span>
          </a>
          <a routerLink="/products" routerLinkActive="active" class="nav-link" (click)="closeSidebar()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
            </svg>
            <span>Products</span>
          </a>
          <a routerLink="/tables" routerLinkActive="active" class="nav-link" (click)="closeSidebar()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            <span>Tables</span>
          </a>
          <a routerLink="/orders" routerLinkActive="active" class="nav-link" (click)="closeSidebar()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
            </svg>
            <span>Orders</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          @if (user()) {
            <div class="user-info">
              <span class="user-email">{{ user()?.email }}</span>
            </div>
          }
          <button class="logout-btn" (click)="logout()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div class="overlay" (click)="closeSidebar()"></div>

      <main class="main">
        <div class="page-header">
          <h1>Orders</h1>
          <button class="btn btn-secondary" (click)="loadOrders()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
        </div>

        <div class="content">
          @if (loading()) {
            <div class="empty-state"><p>Loading orders...</p></div>
          } @else {
            <!-- Active Orders Section -->
            @if (activeOrders().length > 0) {
              <div class="section-header">
                <h2>Active Orders</h2>
                <span class="badge">{{ activeOrders().length }}</span>
              </div>
              <div class="order-grid">
                @for (order of activeOrders(); track order.id) {
                  <div class="order-card" [class]="'status-' + order.status">
                    <div class="order-header">
                      <div>
                        <span class="order-id">#{{ order.id }}</span>
                        <span class="order-table">{{ order.table_name }}</span>
                      </div>
                      <span class="status-badge" [class]="order.status">{{ getStatusLabel(order.status) }}</span>
                    </div>

                    <div class="order-items">
                      @for (item of order.items; track item.id) {
                        <div class="order-item">
                          <span class="item-qty">{{ item.quantity }}x</span>
                          <span class="item-name">{{ item.product_name }}</span>
                          <span class="item-price">\${{ (item.price_cents * item.quantity / 100) | number:'1.2-2' }}</span>
                        </div>
                      }
                    </div>

                    <div class="order-footer">
                      <span class="order-total">Total: \${{ (order.total_cents / 100) | number:'1.2-2' }}</span>
                      <div class="order-actions">
                        @if (order.status === 'pending') {
                          <button class="btn btn-sm btn-primary" (click)="updateStatus(order, 'preparing')">Start</button>
                        } @else if (order.status === 'preparing') {
                          <button class="btn btn-sm btn-success" (click)="updateStatus(order, 'ready')">Ready</button>
                        } @else if (order.status === 'ready') {
                          <button class="btn btn-sm btn-secondary" (click)="updateStatus(order, 'completed')">Complete</button>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            } @else if (completedOrders().length === 0) {
              <div class="empty-state">
                <div class="empty-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                  </svg>
                </div>
                <h3>No orders yet</h3>
                <p>Orders will appear here when customers place them</p>
              </div>
            }

            <!-- Order History Section (AG Grid) -->
            @if (completedOrders().length > 0) {
              <div class="section-header history-header">
                <h2>Order History</h2>
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
      </main>
    </div>
  `,
  styles: [`
    .layout { display: flex; min-height: 100vh; background: var(--color-bg); }

    .sidebar {
      width: 240px; background: var(--color-surface); border-right: 1px solid var(--color-border);
      display: flex; flex-direction: column; position: fixed; height: 100vh; left: 0; top: 0; z-index: 100;
    }
    .sidebar-header { padding: var(--space-5); display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--color-border); }
    .logo { font-size: 1.25rem; font-weight: 700; color: var(--color-primary); }
    .close-btn { display: none; background: none; border: none; color: var(--color-text-muted); cursor: pointer; padding: var(--space-2); }
    .nav { flex: 1; padding: var(--space-4) 0; }
    .nav-link {
      display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-5);
      color: var(--color-text-muted); text-decoration: none; font-size: 0.9375rem; font-weight: 500;
      transition: all 0.15s ease; border-left: 3px solid transparent;
      &:hover { color: var(--color-text); background: var(--color-bg); }
      &.active { color: var(--color-primary); background: var(--color-primary-light); border-left-color: var(--color-primary); }
    }
    .sidebar-footer { padding: var(--space-4) var(--space-5); border-top: 1px solid var(--color-border); }
    .user-info { margin-bottom: var(--space-3); }
    .user-email { font-size: 0.875rem; color: var(--color-text); display: block; overflow: hidden; text-overflow: ellipsis; }
    .logout-btn {
      display: flex; align-items: center; gap: var(--space-2); width: 100%; padding: var(--space-3);
      background: none; border: 1px solid var(--color-border); border-radius: var(--radius-md);
      color: var(--color-text-muted); font-size: 0.875rem; cursor: pointer; transition: all 0.15s ease;
      &:hover { background: var(--color-bg); color: var(--color-text); }
    }

    .main { flex: 1; margin-left: 240px; padding: var(--space-6); }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-5); }
    .page-header h1 { font-size: 1.5rem; font-weight: 600; color: var(--color-text); margin: 0; }

    .section-header { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4); }
    .section-header h2 { font-size: 1.125rem; font-weight: 600; color: var(--color-text); margin: 0; }
    .history-header { margin-top: var(--space-6); }
    .badge {
      padding: var(--space-1) var(--space-3); border-radius: 20px; font-size: 0.75rem; font-weight: 600;
      background: var(--color-primary); color: white;
      &.secondary { background: var(--color-text-muted); }
    }

    .btn { display: inline-flex; align-items: center; gap: var(--space-2); padding: var(--space-3) var(--space-4); border: none; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.15s ease; }
    .btn-primary { background: var(--color-primary); color: white; &:hover { background: var(--color-primary-hover); } }
    .btn-secondary { background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); &:hover { background: var(--color-border); } }
    .btn-success { background: var(--color-success); color: white; &:hover { background: #15803d; } }
    .btn-sm { padding: var(--space-2) var(--space-3); font-size: 0.8125rem; }

    .empty-state {
      text-align: center; padding: var(--space-8); background: var(--color-surface);
      border: 1px dashed var(--color-border); border-radius: var(--radius-lg);
      .empty-icon { color: var(--color-text-muted); margin-bottom: var(--space-4); }
      h3 { margin: 0 0 var(--space-2); font-size: 1.125rem; color: var(--color-text); }
      p { margin: 0; color: var(--color-text-muted); }
    }

    .order-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--space-4); }

    .order-card {
      background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
      overflow: hidden;
      &.status-pending { border-left: 3px solid var(--color-warning); }
      &.status-preparing { border-left: 3px solid #3B82F6; }
      &.status-ready { border-left: 3px solid var(--color-success); }
      &.status-paid { border-left: 3px solid var(--color-success); }
      &.status-completed { border-left: 3px solid var(--color-text-muted); }
    }

    .order-header { display: flex; justify-content: space-between; align-items: center; padding: var(--space-4); border-bottom: 1px solid var(--color-border); }
    .order-id { font-weight: 600; color: var(--color-text); }
    .order-table { color: var(--color-text-muted); margin-left: var(--space-2); font-size: 0.875rem; }

    .status-badge {
      padding: var(--space-1) var(--space-3); border-radius: 20px; font-size: 0.75rem; font-weight: 600;
      &.pending { background: rgba(245, 158, 11, 0.15); color: var(--color-warning); }
      &.preparing { background: rgba(59, 130, 246, 0.15); color: #3B82F6; }
      &.ready { background: var(--color-success-light); color: var(--color-success); }
      &.paid { background: var(--color-success-light); color: var(--color-success); }
      &.completed { background: var(--color-bg); color: var(--color-text-muted); }
    }

    .order-items { padding: var(--space-4); }
    .order-item { display: flex; gap: var(--space-2); padding: var(--space-2) 0; font-size: 0.9375rem; }
    .order-item:not(:last-child) { border-bottom: 1px solid var(--color-border); }
    .item-qty { font-weight: 600; color: var(--color-primary); width: 32px; }
    .item-name { flex: 1; color: var(--color-text); }
    .item-price { color: var(--color-text-muted); }

    .order-footer { display: flex; justify-content: space-between; align-items: center; padding: var(--space-4); background: var(--color-bg); }
    .order-total { font-weight: 600; color: var(--color-text); }
    .order-actions { display: flex; gap: var(--space-2); }

    .grid-container {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .mobile-header { display: none; position: fixed; top: 0; left: 0; right: 0; height: 56px; background: var(--color-surface); border-bottom: 1px solid var(--color-border); padding: 0 var(--space-4); align-items: center; gap: var(--space-3); z-index: 99; }
    .menu-toggle { display: flex; flex-direction: column; gap: 4px; background: none; border: none; padding: var(--space-2); cursor: pointer; }
    .menu-toggle span { display: block; width: 20px; height: 2px; background: var(--color-text); border-radius: 1px; }
    .header-title { font-weight: 700; color: var(--color-primary); }
    .overlay { display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4); z-index: 99; }

    @media (max-width: 768px) {
      .mobile-header { display: flex; }
      .sidebar { transform: translateX(-100%); transition: transform 0.25s ease; }
      .sidebar-open .sidebar { transform: translateX(0); }
      .sidebar-open .overlay { display: block; }
      .close-btn { display: block; }
      .main { margin-left: 0; padding: calc(56px + var(--space-4)) var(--space-4) var(--space-4); }
      .order-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class OrdersComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private router = inject(Router);
  private wsSub?: Subscription;

  orders = signal<Order[]>([]);
  loading = signal(true);
  user = signal<User | null>(null);
  sidebarOpen = signal(false);

  // Computed signals for separating active and completed orders
  activeOrders = computed(() =>
    this.orders().filter(o => ['pending', 'preparing', 'ready'].includes(o.status))
  );
  completedOrders = computed(() =>
    this.orders().filter(o => ['completed', 'paid'].includes(o.status))
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

  columnDefs: ColDef[] = [
    {
      field: 'id',
      headerName: 'Order #',
      width: 100,
      valueFormatter: (params) => `#${params.value}`,
    },
    {
      field: 'table_name',
      headerName: 'Table',
      width: 120,
    },
    {
      field: 'items',
      headerName: 'Items',
      flex: 1,
      valueFormatter: (params) => {
        if (!params.value) return '';
        return params.value.map((item: any) => `${item.quantity}x ${item.product_name}`).join(', ');
      },
    },
    {
      field: 'total_cents',
      headerName: 'Total',
      width: 110,
      valueFormatter: (params) => {
        if (params.value == null) return '';
        return `$${(params.value / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      cellRenderer: (params: ICellRendererParams) => {
        const status = params.value;
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
          text-transform: capitalize;
          line-height: 1.4;
        ">${status}</span>`;
      },
    },
    {
      field: 'created_at',
      headerName: 'Date',
      width: 160,
      valueFormatter: (params) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleString();
      },
    },
  ];

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
  };

  ngOnInit() {
    this.api.user$.subscribe(user => this.user.set(user));
    this.loadOrders();
    this.api.connectWebSocket();
    this.wsSub = this.api.orderUpdates$.subscribe(() => this.loadOrders());
  }

  ngOnDestroy() {
    this.wsSub?.unsubscribe();
  }

  toggleSidebar() { this.sidebarOpen.update(v => !v); }
  closeSidebar() { this.sidebarOpen.set(false); }
  logout() { this.api.logout(); this.router.navigate(['/login']); }

  loadOrders() {
    this.loading.set(true);
    this.api.getOrders().subscribe({
      next: orders => { this.orders.set(orders); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pending',
      preparing: 'Preparing',
      ready: 'Ready',
      paid: 'Paid',
      completed: 'Completed'
    };
    return labels[status] || status;
  }

  updateStatus(order: Order, status: string) {
    this.api.updateOrderStatus(order.id, status).subscribe({
      next: () => {
        this.orders.update(list =>
          list.map(o => o.id === order.id ? { ...o, status } : o)
        );
      }
    });
  }
}
