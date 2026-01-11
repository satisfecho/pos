import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { QRCodeComponent } from 'angularx-qrcode';
import { ApiService, Table, User } from '../services/api.service';

@Component({
  selector: 'app-tables',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive, QRCodeComponent],
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
          <h1>Tables</h1>
          @if (!showForm()) {
            <button class="btn btn-primary" (click)="showForm.set(true)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Table
            </button>
          }
        </div>

        <div class="content">
          @if (showForm()) {
            <div class="form-card">
              <form (submit)="createTable($event)">
                <div class="form-inline">
                  <input type="text" [(ngModel)]="newTableName" name="name" placeholder="Table name (e.g., Table 5)" required>
                  <button type="submit" class="btn btn-primary">Add</button>
                  <button type="button" class="btn btn-secondary" (click)="showForm.set(false)">Cancel</button>
                </div>
              </form>
            </div>
          }

          @if (error()) {
            <div class="error-banner">{{ error() }}</div>
          }

          @if (loading()) {
            <div class="empty-state"><p>Loading tables...</p></div>
          } @else if (tables().length === 0) {
            <div class="empty-state">
              <div class="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
              </div>
              <h3>No tables yet</h3>
              <p>Add tables to generate QR codes for customers</p>
              <button class="btn btn-primary" (click)="showForm.set(true)">Add Table</button>
            </div>
          } @else {
            <div class="table-grid">
              @for (table of tables(); track table.id) {
                <div class="table-card">
                  <div class="table-header">
                    <h3>{{ table.name }}</h3>
                    <button class="icon-btn icon-btn-danger" (click)="deleteTable(table)" title="Delete">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3,6 5,6 21,6"/>
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                    </button>
                  </div>
                  <div class="qr-section">
                    <qrcode [qrdata]="getMenuUrl(table)" [width]="140" [errorCorrectionLevel]="'M'" cssClass="qr-code"></qrcode>
                  </div>
                  <div class="table-actions">
                    <a [href]="getMenuUrl(table)" target="_blank" class="btn btn-secondary btn-sm">Open Menu</a>
                    <button class="btn btn-ghost btn-sm" (click)="copyLink(table)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                      </svg>
                      Copy
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </main>
    </div>
  `,
  styles: [`
    .layout { display: flex; min-height: 100vh; background: var(--color-bg); }

    .sidebar {
      width: 240px;
      background: var(--color-surface);
      border-right: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      position: fixed;
      height: 100vh;
      left: 0;
      top: 0;
      z-index: 100;
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

    .btn { display: inline-flex; align-items: center; gap: var(--space-2); padding: var(--space-3) var(--space-4); border: none; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.15s ease; text-decoration: none; }
    .btn-primary { background: var(--color-primary); color: white; &:hover { background: var(--color-primary-hover); } }
    .btn-secondary { background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); &:hover { background: var(--color-border); } }
    .btn-ghost { background: transparent; color: var(--color-text-muted); &:hover { background: var(--color-bg); color: var(--color-text); } }
    .btn-sm { padding: var(--space-2) var(--space-3); font-size: 0.8125rem; }

    .form-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-4); margin-bottom: var(--space-5); }
    .form-inline { display: flex; gap: var(--space-3); align-items: center; flex-wrap: wrap; }
    .form-inline input { flex: 1; min-width: 200px; padding: var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 0.9375rem; }
    .form-inline input:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }

    .error-banner { background: rgba(220, 38, 38, 0.1); color: var(--color-error); padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); margin-bottom: var(--space-4); }

    .empty-state {
      text-align: center; padding: var(--space-8); background: var(--color-surface);
      border: 1px dashed var(--color-border); border-radius: var(--radius-lg);
      .empty-icon { color: var(--color-text-muted); margin-bottom: var(--space-4); }
      h3 { margin: 0 0 var(--space-2); font-size: 1.125rem; color: var(--color-text); }
      p { margin: 0 0 var(--space-4); color: var(--color-text-muted); }
    }

    .table-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-4); }

    .table-card {
      background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
      padding: var(--space-4); text-align: center;
    }
    .table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3); }
    .table-header h3 { margin: 0; font-size: 1rem; font-weight: 600; color: var(--color-text); }
    .qr-section { margin-bottom: var(--space-4); }
    .qr-section :global(qrcode canvas) { border-radius: var(--radius-md); }
    .table-actions { display: flex; gap: var(--space-2); justify-content: center; }

    .icon-btn { background: none; border: none; padding: var(--space-2); border-radius: var(--radius-sm); color: var(--color-text-muted); cursor: pointer; transition: all 0.15s ease; }
    .icon-btn:hover { background: var(--color-bg); color: var(--color-text); }
    .icon-btn-danger:hover { background: rgba(220, 38, 38, 0.1); color: var(--color-error); }

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
      .table-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class TablesComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  tables = signal<Table[]>([]);
  loading = signal(true);
  error = signal('');
  showForm = signal(false);
  user = signal<User | null>(null);
  sidebarOpen = signal(false);
  newTableName = '';

  ngOnInit() {
    this.api.user$.subscribe(u => this.user.set(u));
    this.loadTables();
  }

  toggleSidebar() { this.sidebarOpen.update(v => !v); }
  closeSidebar() { this.sidebarOpen.set(false); }
  logout() { this.api.logout(); this.router.navigate(['/login']); }

  loadTables() {
    this.loading.set(true);
    this.api.getTables().subscribe({
      next: tables => { this.tables.set(tables); this.loading.set(false); },
      error: err => { this.error.set(err.error?.detail || 'Failed to load'); this.loading.set(false); }
    });
  }

  createTable(e: Event) {
    e.preventDefault();
    if (!this.newTableName) return;
    this.api.createTable(this.newTableName).subscribe({
      next: table => { this.tables.update(t => [...t, table]); this.newTableName = ''; this.showForm.set(false); },
      error: err => this.error.set(err.error?.detail || 'Failed')
    });
  }

  deleteTable(table: Table) {
    if (!table.id) return;
    this.api.deleteTable(table.id).subscribe({
      next: () => this.tables.update(t => t.filter(x => x.id !== table.id)),
      error: err => this.error.set(err.error?.detail || 'Failed')
    });
  }

  getMenuUrl(table: Table): string {
    return `${window.location.origin}/menu/${table.token}`;
  }

  copyLink(table: Table) {
    navigator.clipboard.writeText(this.getMenuUrl(table));
  }
}
