import { Component, inject, OnInit, computed, signal, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SidebarComponent } from '../shared/sidebar.component';
import { TranslateModule } from '@ngx-translate/core';
import { PermissionService } from '../services/permission.service';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SidebarComponent, RouterLink, TranslateModule],
  template: `
    <app-sidebar>
        <div class="page-header">
          <h1>{{ 'DASHBOARD.TITLE' | translate }}</h1>
        </div>

        <div class="welcome-section">
          <h2>{{ 'DASHBOARD.WELCOME_BACK' | translate }}</h2>
          <p class="welcome-text">{{ 'DASHBOARD.WELCOME_TEXT' | translate }}</p>
        </div>

        <div class="quick-actions">
          <button type="button" class="action-card action-card-whats-new" (click)="openChangelog()" data-testid="dashboard-whats-new">
            <div class="action-icon action-icon-whats-new">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/>
              </svg>
            </div>
            <span class="action-label">{{ 'DASHBOARD.WHATS_NEW_TITLE' | translate }}</span>
            <span class="action-desc">{{ 'DASHBOARD.WHATS_NEW_DESC' | translate }}</span>
          </button>
          <a routerLink="/staff/orders" class="action-card">
            <div class="action-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
            </div>
            <span class="action-label">{{ 'DASHBOARD.ORDERS_TITLE' | translate }}</span>
            <span class="action-desc">{{ 'DASHBOARD.ORDERS_DESC' | translate }}</span>
          </a>
          <a routerLink="/reservations" class="action-card">
            <div class="action-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <span class="action-label">{{ 'DASHBOARD.RESERVATIONS_TITLE' | translate }}</span>
            <span class="action-desc">{{ 'DASHBOARD.RESERVATIONS_DESC' | translate }}</span>
          </a>
          <a routerLink="/tables" class="action-card">
            <div class="action-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
            </div>
            <span class="action-label">{{ 'DASHBOARD.TABLES_TITLE' | translate }}</span>
            <span class="action-desc">{{ 'DASHBOARD.TABLES_DESC' | translate }}</span>
          </a>
          <a routerLink="/kitchen" class="action-card">
            <div class="action-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M6 8h.01M10 8h.01M14 8h.01M6 12h12M6 16h8"/>
              </svg>
            </div>
            <span class="action-label">{{ 'DASHBOARD.KITCHEN_TITLE' | translate }}</span>
            <span class="action-desc">{{ 'DASHBOARD.KITCHEN_DESC' | translate }}</span>
          </a>
          <a routerLink="/bar" class="action-card">
            <div class="action-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"/>
                <path d="M9 14h6M9 18h6"/>
              </svg>
            </div>
            <span class="action-label">{{ 'DASHBOARD.BEVERAGES_TITLE' | translate }}</span>
            <span class="action-desc">{{ 'DASHBOARD.BEVERAGES_DESC' | translate }}</span>
          </a>
          <a routerLink="/products" class="action-card">
            <div class="action-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
              </svg>
            </div>
            <span class="action-label">{{ 'DASHBOARD.PRODUCTS_TITLE' | translate }}</span>
            <span class="action-desc">{{ 'DASHBOARD.PRODUCTS_DESC' | translate }}</span>
          </a>
          <a routerLink="/catalog" class="action-card">
            <div class="action-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
              </svg>
            </div>
            <span class="action-label">{{ 'DASHBOARD.CATALOG_TITLE' | translate }}</span>
            <span class="action-desc">{{ 'DASHBOARD.CATALOG_DESC' | translate }}</span>
          </a>
          @if (canViewCustomers()) {
          <a routerLink="/customers" class="action-card">
            <div class="action-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <span class="action-label">{{ 'DASHBOARD.CUSTOMERS_TITLE' | translate }}</span>
            <span class="action-desc">{{ 'DASHBOARD.CUSTOMERS_DESC' | translate }}</span>
          </a>
          }
          @if (canShowAdminSections()) {
            <a routerLink="/reports" class="action-card">
              <div class="action-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </div>
              <span class="action-label">{{ 'DASHBOARD.REPORTS_TITLE' | translate }}</span>
              <span class="action-desc">{{ 'DASHBOARD.REPORTS_DESC' | translate }}</span>
            </a>
            <a routerLink="/working-plan" class="action-card">
              <div class="action-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <span class="action-label">{{ 'DASHBOARD.WORKING_PLAN_TITLE' | translate }}</span>
              <span class="action-desc">{{ 'DASHBOARD.WORKING_PLAN_DESC' | translate }}</span>
            </a>
            <a routerLink="/inventory" class="action-card">
              <div class="action-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                  <polyline points="7.5 4.21 12 6.81 16.5 4.21"/>
                </svg>
              </div>
              <span class="action-label">{{ 'DASHBOARD.INVENTORY_TITLE' | translate }}</span>
              <span class="action-desc">{{ 'DASHBOARD.INVENTORY_DESC' | translate }}</span>
            </a>
            <a routerLink="/users" class="action-card">
              <div class="action-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              <span class="action-label">{{ 'DASHBOARD.USERS_TITLE' | translate }}</span>
              <span class="action-desc">{{ 'DASHBOARD.USERS_DESC' | translate }}</span>
            </a>
            <a routerLink="/settings" class="action-card">
              <div class="action-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
                </svg>
              </div>
              <span class="action-label">{{ 'DASHBOARD.SETTINGS_TITLE' | translate }}</span>
              <span class="action-desc">{{ 'DASHBOARD.SETTINGS_DESC' | translate }}</span>
            </a>
          }
        </div>

        <div class="help-section">
          <h2 class="help-title">{{ 'DASHBOARD.HELP_TITLE' | translate }}</h2>
          <p class="help-desc">{{ 'DASHBOARD.HELP_DESC' | translate }}</p>
          <p class="help-invite">{{ 'DASHBOARD.HELP_INVITE' | translate }}</p>
          <div class="help-links">
            <a href="https://github.com/satisfecho/pos/issues" target="_blank" rel="noopener noreferrer" class="help-link">
              {{ 'DASHBOARD.HELP_ISSUES' | translate }}
            </a>
            <a href="https://github.com/satisfecho/pos/discussions" target="_blank" rel="noopener noreferrer" class="help-link">
              {{ 'DASHBOARD.HELP_DISCUSSIONS' | translate }}
            </a>
          </div>
        </div>

        @if (showChangelogModal()) {
          <div class="changelog-overlay" (click)="closeChangelog()" role="button" tabindex="0" data-testid="changelog-overlay">
            <div class="changelog-modal" (click)="$event.stopPropagation()" role="dialog" aria-labelledby="changelog-title">
              <div class="changelog-header">
                <h2 id="changelog-title" class="changelog-title">{{ 'DASHBOARD.CHANGELOG_TITLE' | translate }}</h2>
                <button type="button" class="changelog-close" (click)="closeChangelog()" [attr.aria-label]="'COMMON.CLOSE' | translate">{{ 'COMMON.CLOSE' | translate }}</button>
              </div>
              <div class="changelog-body">
                @if (changelogLoading()) {
                  <p class="changelog-loading">{{ 'DASHBOARD.CHANGELOG_LOADING' | translate }}</p>
                } @else if (changelogError()) {
                  <p class="changelog-error">{{ changelogError() }}</p>
                } @else if (changelogHtml()) {
                  <div class="changelog-content" [innerHTML]="changelogHtml()"></div>
                }
              </div>
            </div>
          </div>
        }
    </app-sidebar>
  `,
  styles: [`
    .page-header {
      margin-bottom: var(--space-6);

      h1 {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--color-text);
      }
    }

    .welcome-section {
      margin-bottom: var(--space-6);

      h2 {
        font-size: 1.75rem;
        font-weight: 600;
        color: var(--color-text);
        margin-bottom: var(--space-2);
      }

      .welcome-user {
        color: var(--color-text-muted);
        margin-bottom: var(--space-1);

        strong {
          color: var(--color-text);
        }
      }

      .welcome-text {
        color: var(--color-text-muted);
      }
    }

    .quick-actions {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); /* Increased from 200px */
      gap: var(--space-4);
    }

    .action-card {
      display: flex;
      flex-direction: column;
      padding: var(--space-5);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      text-decoration: none;
      transition: all 0.15s ease;

      &:hover {
        border-color: var(--color-primary);
        box-shadow: var(--shadow-md);
        transform: translateY(-2px);
      }
    }

    .action-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-primary-light);
      border-radius: var(--radius-md);
      color: var(--color-primary);
      margin-bottom: var(--space-4);
    }

    .action-label {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: var(--space-1);
    }

    .action-desc {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }

    @media (max-width: 768px) {
      .quick-actions {
        grid-template-columns: 1fr;
      }
    }
    .help-section {
      margin-top: var(--space-8);
      padding: var(--space-6);
      border-radius: var(--radius-lg);
      background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-surface) 100%);
      border: 1px solid var(--color-border);
    }

    .help-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0 0 var(--space-2);
    }

    .help-desc {
      font-size: 0.9375rem;
      color: var(--color-text-muted);
      margin: 0 0 var(--space-2);
    }

    .help-invite {
      font-size: 0.9375rem;
      color: var(--color-text);
      margin: 0 0 var(--space-4);
      font-weight: 500;
    }

    .help-links {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .help-link {
      display: inline-flex;
      align-items: center;
      padding: var(--space-2) var(--space-4);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      color: var(--color-primary);
      text-decoration: none;
      font-size: 0.9375rem;
      font-weight: 500;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .help-link:hover {
      border-color: var(--color-primary);
      box-shadow: var(--shadow-sm);
    }

    .action-card-whats-new {
      cursor: pointer;
      border: 1px dashed var(--color-primary);
      background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-primary-light) 100%);
    }

    .action-icon-whats-new {
      background: var(--color-primary);
      color: var(--color-surface);
    }

    .changelog-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: var(--space-4);
    }

    .changelog-modal {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-lg);
      max-width: 42rem;
      width: 100%;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
    }

    .changelog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-4) var(--space-5);
      border-bottom: 1px solid var(--color-border);
      flex-shrink: 0;
    }

    .changelog-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0;
      color: var(--color-text);
    }

    .changelog-close {
      padding: var(--space-2) var(--space-3);
      background: transparent;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      color: var(--color-text);
      font-size: 0.875rem;
      cursor: pointer;
    }

    .changelog-close:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .changelog-body {
      padding: var(--space-5);
      overflow-y: auto;
      flex: 1;
      min-height: 0;
    }

    .changelog-loading,
    .changelog-error {
      color: var(--color-text-muted);
      margin: 0;
    }

    .changelog-error {
      color: var(--color-error, #b91c1c);
    }

    .changelog-content {
      font-size: 0.9375rem;
      line-height: 1.6;
      color: var(--color-text);
    }

    .changelog-content ::ng-deep h2 {
      font-size: 1.125rem;
      font-weight: 600;
      margin: var(--space-6) 0 var(--space-2);
      color: var(--color-primary);
    }

    .changelog-content ::ng-deep h2:first-child {
      margin-top: 0;
    }

    .changelog-content ::ng-deep h3 {
      font-size: 1rem;
      font-weight: 600;
      margin: var(--space-4) 0 var(--space-2);
      color: var(--color-text);
    }

    .changelog-content ::ng-deep ul {
      margin: 0 0 var(--space-3);
      padding-left: 1.5rem;
    }

    .changelog-content ::ng-deep li {
      margin-bottom: var(--space-1);
    }

    .changelog-content ::ng-deep strong {
      font-weight: 600;
    }

    .changelog-content ::ng-deep a {
      color: var(--color-primary);
      text-decoration: none;
    }

    .changelog-content ::ng-deep a:hover {
      text-decoration: underline;
    }

    .changelog-content ::ng-deep p {
      margin: 0 0 var(--space-2);
    }
  `]
})
export class DashboardComponent implements OnInit {
  private permissions = inject(PermissionService);
  private api = inject(ApiService);
  private sanitizer = inject(DomSanitizer);

  user = signal(this.api.getCurrentUser());
  canShowAdminSections = computed(() => this.permissions.isAdmin(this.user()));
  canViewCustomers = computed(() => this.permissions.canAccessRoute(this.user(), '/customers'));

  showChangelogModal = signal(false);
  changelogHtml = signal<SafeHtml | null>(null);
  changelogLoading = signal(false);
  changelogError = signal<string | null>(null);

  ngOnInit() {
    this.user.set(this.api.getCurrentUser());
  }

  openChangelog() {
    this.showChangelogModal.set(true);
    this.changelogError.set(null);
    if (this.changelogHtml()) {
      return;
    }
    this.changelogLoading.set(true);
    this.api.getChangelog().subscribe({
      next: (text) => {
        this.changelogLoading.set(false);
        this.changelogHtml.set(this.sanitizer.bypassSecurityTrustHtml(this.markdownToHtml(text)));
      },
      error: (err) => {
        this.changelogLoading.set(false);
        this.changelogError.set(err?.message || 'Failed to load changelog.');
      },
    });
  }

  closeChangelog() {
    this.showChangelogModal.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.showChangelogModal()) this.closeChangelog();
  }

  /** Convert changelog markdown to safe HTML (h2, h3, ul, li, strong, a). */
  private markdownToHtml(md: string): string {
    const escape = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const lines = md.split(/\r?\n/);
    let out = '';
    let inList = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trimEnd();
      if (/^##\s/.test(trimmed)) {
        if (inList) {
          out += '</ul>';
          inList = false;
        }
        const title = trimmed.replace(/^##\s+/, '').replace(/\*\*/g, '');
        out += '<h2>' + escape(title) + '</h2>';
      } else if (/^###\s/.test(trimmed)) {
        if (inList) {
          out += '</ul>';
          inList = false;
        }
        const title = trimmed.replace(/^###\s+/, '').replace(/\*\*/g, '');
        out += '<h3>' + escape(title) + '</h3>';
      } else if (/^-\s+/.test(trimmed)) {
        if (!inList) {
          out += '<ul>';
          inList = true;
        }
        let content = trimmed.replace(/^-\s+/, '');
        const bold: string[] = [];
        content = content.replace(/\*\*([^*]+)\*\*/g, (_, t) => {
          bold.push(t);
          return '\x01B' + (bold.length - 1) + '\x02';
        });
        const links: { t: string; u: string }[] = [];
        content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => {
          links.push({ t, u });
          return '\x01L' + (links.length - 1) + '\x02';
        });
        content = escape(content);
        content = content.replace(/\x01B(\d+)\x02/g, (_, i) => '<strong>' + escape(bold[Number(i)]) + '</strong>');
        content = content.replace(/\x01L(\d+)\x02/g, (_, i) => {
          const { t, u } = links[Number(i)];
          return '<a href="' + escape(u) + '" target="_blank" rel="noopener noreferrer">' + escape(t) + '</a>';
        });
        out += '<li>' + content + '</li>';
      } else if (trimmed === '') {
        if (inList) {
          out += '</ul>';
          inList = false;
        }
      }
    }
    if (inList) out += '</ul>';
    return out || '<p>No content.</p>';
  }
}
