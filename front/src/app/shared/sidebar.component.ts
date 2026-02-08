import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ApiService, User } from '../services/api.service';
import { PermissionService, Permission } from '../services/permission.service';
import { environment } from '../../environments/environment';
import { LanguagePickerComponent } from './language-picker.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LanguagePickerComponent, TranslateModule],
  template: `
    <div class="layout" [class.sidebar-open]="sidebarOpen()">
      <header class="mobile-header">
        <button class="menu-toggle" (click)="toggleSidebar()">
          <span></span>
          <span></span>
          <span></span>
        </button>
        <span class="header-title">POS</span>
      </header>

      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="logo-container">
            <span class="logo">POS</span>
            <span class="version">v{{ version }}<span class="commit-hash">{{ commitHash }}</span></span>
          </div>
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
               <polyline points="9,22 9,12 15,12 15,22"/>
             </svg>
             <span>{{ 'NAV.HOME' | translate }}</span>
           </a>
           <a routerLink="/products" routerLinkActive="active" class="nav-link" (click)="closeSidebar()">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
             </svg>
             <span>{{ 'NAV.PRODUCTS' | translate }}</span>
           </a>
           <a routerLink="/catalog" routerLinkActive="active" class="nav-link" (click)="closeSidebar()">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
               <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
             </svg>
             <span>{{ 'NAV.CATALOG' | translate }}</span>
           </a>
           @if (canViewTables()) {
             <a routerLink="/tables" routerLinkActive="active" class="nav-link" (click)="closeSidebar()">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <rect x="3" y="3" width="7" height="7"/>
                 <rect x="14" y="3" width="7" height="7"/>
                 <rect x="14" y="14" width="7" height="7"/>
                 <rect x="3" y="14" width="7" height="7"/>
               </svg>
               <span>{{ 'NAV.TABLES' | translate }}</span>
             </a>
           }
           <a routerLink="/orders" routerLinkActive="active" class="nav-link" (click)="closeSidebar()">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
               <polyline points="14,2 14,8 20,8"/>
               <line x1="16" y1="13" x2="8" y2="13"/>
               <line x1="16" y1="17" x2="8" y2="17"/>
               <polyline points="10,9 9,9 8,9"/>
             </svg>
             <span>{{ 'NAV.ORDERS' | translate }}</span>
           </a>
           <!-- Inventory Module (Admin only) -->
           @if (canViewInventory()) {
             <div class="nav-section">
               <button class="nav-section-header" (click)="toggleInventory()">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                   <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                 </svg>
                 <span>{{ 'NAV.INVENTORY' | translate }}</span>
                 <svg class="chevron" [class.open]="inventoryOpen()" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                   <polyline points="6 9 12 15 18 9"/>
                 </svg>
               </button>
               @if (inventoryOpen()) {
                 <div class="nav-submenu">
                   <a routerLink="/inventory/items" routerLinkActive="active" class="nav-sublink" (click)="closeSidebar()">
                     <span>{{ 'NAV.ITEMS' | translate }}</span>
                   </a>
                   <a routerLink="/inventory/suppliers" routerLinkActive="active" class="nav-sublink" (click)="closeSidebar()">
                     <span>{{ 'NAV.SUPPLIERS' | translate }}</span>
                   </a>
                   <a routerLink="/inventory/purchase-orders" routerLinkActive="active" class="nav-sublink" (click)="closeSidebar()">
                     <span>{{ 'NAV.PURCHASE_ORDERS' | translate }}</span>
                   </a>
                   <a routerLink="/inventory/stock" routerLinkActive="active" class="nav-sublink" (click)="closeSidebar()">
                     <span>{{ 'NAV.STOCK_DASHBOARD' | translate }}</span>
                   </a>
                   <a routerLink="/inventory/reports" routerLinkActive="active" class="nav-sublink" (click)="closeSidebar()">
                     <span>{{ 'NAV.REPORTS' | translate }}</span>
                   </a>
                 </div>
               }
             </div>
           }

           <!-- Users Management (Admin only) -->
           @if (canViewUsers()) {
             <a routerLink="/users" routerLinkActive="active" class="nav-link" (click)="closeSidebar()">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                 <circle cx="9" cy="7" r="4"/>
                 <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                 <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
               </svg>
               <span>{{ 'NAV.USERS' | translate }}</span>
             </a>
           }

           <!-- Settings (Admin only) -->
           @if (canViewSettings()) {
             <a routerLink="/settings" routerLinkActive="active" class="nav-link" (click)="closeSidebar()">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <circle cx="12" cy="12" r="3"/>
                 <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
               </svg>
               <span>{{ 'NAV.SETTINGS' | translate }}</span>
             </a>
           }
        </nav>

        <div class="sidebar-footer">
          <app-language-picker></app-language-picker>
          @if (user()) {
            <div class="user-info">
              <span class="user-email">{{ user()?.email }}</span>
              <span class="user-role">{{ getRoleDisplayName() }}</span>
            </div>
          }
           <button class="logout-btn" (click)="logout()">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
               <polyline points="16,17 21,12 16,7"/>
               <line x1="21" y1="12" x2="9" y2="12"/>
             </svg>
             <span>{{ 'NAV.LOGOUT' | translate }}</span>
           </button>
        </div>
      </aside>

      <div class="overlay" (click)="closeSidebar()"></div>

      <main class="main">
        <ng-content></ng-content>
      </main>
    </div>
  `,
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private permissions = inject(PermissionService);
  private translate = inject(TranslateService);

  user = signal<User | null>(null);
  sidebarOpen = signal(false);
  inventoryOpen = signal(false);
  usersOpen = signal(false);
  version = environment.version;
  commitHash = environment.commitHash;

  // Computed permission checks
  canViewTables = computed(() => this.permissions.canAccessRoute(this.user(), '/tables'));
  canViewSettings = computed(() => this.permissions.isAdmin(this.user()));
  canViewInventory = computed(() => this.permissions.isAdmin(this.user()));
  canViewUsers = computed(() => this.permissions.isAdmin(this.user()));

  ngOnInit() {
    this.api.user$.subscribe(user => this.user.set(user));
    // Auto-open inventory submenu if on an inventory route
    if (this.router.url.startsWith('/inventory')) {
      this.inventoryOpen.set(true);
    }
  }

  /**
   * Check if user has permission for a specific action
   */
  hasPermission(permission: Permission): boolean {
    return this.permissions.hasPermission(this.user(), permission);
  }

  /**
   * Check if user can access a specific route
   */
  canAccess(route: string): boolean {
    return this.permissions.canAccessRoute(this.user(), route);
  }

  /**
   * Get role display name for UI
   */
  getRoleDisplayName(): string {
    const user = this.user();
    if (!user) return '';
    const roleKey = `USERS.ROLES.${user.role.toUpperCase()}`;
    return this.translate.instant(roleKey);
  }

  toggleSidebar() {
    this.sidebarOpen.update(v => !v);
  }

  closeSidebar() {
    this.sidebarOpen.set(false);
  }

  toggleInventory() {
    this.inventoryOpen.update(v => !v);
  }

  logout() {
    this.api.logout();
    this.router.navigate(['/login']);
  }
}
