import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { QRCodeComponent } from 'angularx-qrcode';
import { ApiService, Table, TenantSettings, Floor, TableActivateResponse, User } from '../services/api.service';
import { SidebarComponent } from '../shared/sidebar.component';
import { ConfirmationModalComponent } from '../shared/confirmation-modal.component';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tables',
  standalone: true,
  imports: [CommonModule, FormsModule, QRCodeComponent, SidebarComponent, RouterLink, TranslateModule, ConfirmationModalComponent],
  template: `
    <app-sidebar>
        <div class="page-header">
          <div class="header-left">
            <h1>{{ 'TABLES.TITLE' | translate }}</h1>
            <a routerLink="/tables/canvas" class="btn btn-ghost btn-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
                <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
              </svg>
              {{ 'TABLES.FLOOR_PLAN' | translate }}
            </a>
          </div>
          @if (!showForm() && floors().length > 0) {
            <button class="btn btn-primary" (click)="showForm.set(true)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              {{ 'TABLES.ADD_TABLE' | translate }}
            </button>
          }
        </div>

        <div class="content">
          @if (showForm()) {
            <div class="form-card">
              <form (submit)="createTable($event)">
                <div class="form-inline">
                  <div class="form-group-inline">
                    <label>{{ 'TABLES.NAME' | translate }}</label>
                    <input type="text" [(ngModel)]="newTableName" name="name" [placeholder]="'TABLES.TABLE_NAME' | translate" required>
                  </div>
                  <div class="form-group-inline">
                    <label>{{ 'TABLES.FLOOR' | translate }}</label>
                    <select [(ngModel)]="selectedFloorId" name="floor_id" required>
                      @for (floor of floors(); track floor.id) {
                        <option [value]="floor.id">{{ floor.name }}</option>
                      }
                    </select>
                  </div>
                  <div class="form-actions-inline">
                    <button type="submit" class="btn btn-primary">{{ 'COMMON.ADD' | translate }}</button>
                    <button type="button" class="btn btn-secondary" (click)="showForm.set(false)">{{ 'COMMON.CANCEL' | translate }}</button>
                  </div>
                </div>
              </form>
            </div>
          }

          @if (error()) {
            <div class="error-banner">{{ error() }}</div>
          }

          @if (loading()) {
            <div class="empty-state"><p>{{ 'COMMON.LOADING' | translate }}</p></div>
          } @else if (floors().length === 0) {
            <div class="empty-state">
              <div class="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
              </div>
              <h3>{{ 'TABLES.CREATE_FIRST_FLOOR' | translate }}</h3>
              <p>{{ 'TABLES.CREATE_FIRST_FLOOR_DESC' | translate }}</p>
              <a routerLink="/tables/canvas" class="btn btn-primary">
                {{ 'TABLES.ADD_FLOOR' | translate }}
              </a>
            </div>
          } @else if (tables().length === 0) {
            <div class="empty-state">
              <div class="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
              </div>
              <h3>{{ 'TABLES.NO_TABLES' | translate }}</h3>
              <p>{{ 'TABLES.CREATE_FIRST_FLOOR_DESC' | translate }}</p>
              <button class="btn btn-primary" (click)="showForm.set(true)">{{ 'TABLES.ADD_TABLE' | translate }}</button>
            </div>
          } @else {
            <!-- Grouped by Floor -->
            @for (floor of floors(); track floor.id) {
              @if (getTablesByFloor(floor.id!).length > 0) {
                <div class="floor-section">
                  <div class="section-header">
                    <div class="section-header-left">
                      <h2>{{ floor.name }}</h2>
                      <span class="badge">{{ getTablesByFloor(floor.id!).length }}</span>
                    </div>
                    <div class="floor-waiter-assign">
                      <label class="floor-waiter-label">{{ 'TABLES.DEFAULT_WAITER' | translate }}:</label>
                      <select class="waiter-select waiter-select-sm" (change)="onFloorWaiterAssign(floor, $event)">
                        <option value="" [selected]="!floor.default_waiter_id">{{ 'TABLES.UNASSIGNED' | translate }}</option>
                        @for (w of waiters(); track w.id) {
                          <option [value]="w.id" [selected]="floor.default_waiter_id === w.id">{{ w.full_name || w.email }}</option>
                        }
                      </select>
                    </div>
                  </div>
                  
                  <div class="table-grid">
                    @for (table of getTablesByFloor(floor.id!); track table.id) {
                      <div class="table-card">
                        <div class="table-header">
                          @if (editingTableId() === table.id) {
                            <div class="edit-fields">
                              <input 
                                type="text" 
                                [(ngModel)]="editingName" 
                                class="edit-input"
                                (keydown.enter)="saveTable(table)"
                                (keydown.escape)="cancelEdit()"
                                autofocus
                              >
                              <input 
                                type="number" 
                                [(ngModel)]="editingSeatCount" 
                                class="edit-input edit-input-seats"
                                min="1"
                                max="20"
                                placeholder="Seats"
                                (keydown.enter)="saveTable(table)"
                                (keydown.escape)="cancelEdit()"
                              >
                              <div class="edit-actions">
                                <button class="icon-btn icon-btn-success" (click)="saveTable(table)" [title]="'COMMON.SAVE' | translate">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="20,6 9,17 4,12"/>
                                  </svg>
                                </button>
                                <button class="icon-btn" (click)="cancelEdit()" [title]="'COMMON.CANCEL' | translate">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          } @else {
                            <div class="table-info">
                              <h3 (click)="startEdit(table)" class="editable-name">{{ table.name }}</h3>
                              <div class="seat-count" (click)="startEdit(table)">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                                  <circle cx="9" cy="7" r="4"/>
                                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                                </svg>
                                {{ table.seat_count || '0' }} {{ 'TABLES.SEATS' | translate }}
                              </div>
                            </div>
                            <div class="header-actions">
                              <button class="icon-btn icon-btn-edit" (click)="startEdit(table)" [title]="'COMMON.EDIT' | translate">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </button>
                              <button class="icon-btn icon-btn-danger" (click)="deleteTable(table)" [title]="'COMMON.DELETE' | translate">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <polyline points="3,6 5,6 21,6"/>
                                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                                </svg>
                              </button>
                            </div>
                          }
                        </div>

                        <!-- Table Status and PIN Section -->
                        <div class="status-section">
                          @if (table.is_active) {
                            <div class="status-badge status-active">
                              <span class="status-dot"></span>
                              {{ 'TABLES.ACTIVE' | translate }}
                            </div>
                            @if (table.order_pin) {
                              <div class="pin-display">
                                <span class="pin-label">PIN:</span>
                                <span class="pin-value">{{ table.order_pin }}</span>
                              </div>
                            }
                          } @else {
                            <div class="status-badge status-inactive">
                              <span class="status-dot"></span>
                              {{ 'TABLES.INACTIVE' | translate }}
                            </div>
                          }
                        </div>

                        <!-- Waiter Assignment -->
                        <div class="waiter-assign-section">
                          <div class="waiter-assign-row">
                            <svg class="waiter-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                              <circle cx="12" cy="7" r="4"/>
                            </svg>
                            <select class="waiter-select" (change)="onWaiterAssign(table, $event)">
                              <option value="" [selected]="!table.assigned_waiter_id">{{ 'TABLES.UNASSIGNED' | translate }}</option>
                              @for (w of waiters(); track w.id) {
                                <option [value]="w.id" [selected]="table.assigned_waiter_id === w.id">{{ w.full_name || w.email }}</option>
                              }
                            </select>
                          </div>
                          @if (!table.assigned_waiter_id && table.effective_waiter_name) {
                            <div class="waiter-inherited">{{ 'TABLES.SECTION_DEFAULT' | translate }}: {{ table.effective_waiter_name }}</div>
                          }
                        </div>

                        <div class="qr-section">
                          <div class="qr-card">
                            @if (tenantSettings()) {
                              <div class="qr-header">
                                <div class="company-name">{{ tenantSettings()!.name }}</div>
                                @if (tenantSettings()!.phone) {
                                  <div class="company-phone">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                                    </svg>
                                    {{ tenantSettings()!.phone }}
                                  </div>
                                }
                              </div>
                              <div class="qr-code-wrapper">
                                <qrcode [qrdata]="getMenuUrl(table)" [width]="180" [errorCorrectionLevel]="'M'" cssClass="qr-code"></qrcode>
                              </div>
                              <div class="qr-footer">
                                <div class="table-number">{{ table.name }}</div>
                              </div>
                            } @else {
                              <div class="qr-code-wrapper">
                                <qrcode [qrdata]="getMenuUrl(table)" [width]="180" [errorCorrectionLevel]="'M'" cssClass="qr-code"></qrcode>
                              </div>
                              <div class="qr-footer">
                                <div class="table-number">{{ table.name }}</div>
                              </div>
                            }
                          </div>
                        </div>

                        <!-- Session Control Actions -->
                        <div class="session-actions">
                          @if (table.is_active) {
                            <button 
                              class="btn btn-sm btn-ghost" 
                              (click)="regeneratePin(table)"
                              [disabled]="activatingTableId() === table.id"
                              title="Generate new PIN">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M23 4v6h-6M1 20v-6h6"/>
                                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                              </svg>
                              {{ 'TABLES.NEW_PIN' | translate }}
                            </button>
                            <button 
                              class="btn btn-sm btn-warning" 
                              (click)="closeTableSession(table)"
                              [disabled]="activatingTableId() === table.id">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0110 0v4"/>
                              </svg>
                              {{ 'TABLES.CLOSE_TABLE' | translate }}
                            </button>
                          } @else {
                            <button 
                              class="btn btn-sm btn-success" 
                              (click)="activateTableSession(table)"
                              [disabled]="activatingTableId() === table.id">
                              @if (activatingTableId() === table.id) {
                                <span class="spinner"></span>
                              } @else {
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                                </svg>
                              }
                              {{ 'TABLES.ACTIVATE' | translate }}
                            </button>
                          }
                        </div>

                        <div class="table-actions">
                          <a [href]="getMenuUrl(table)" target="_blank" class="btn btn-secondary btn-sm">Open Menu</a>
                          <button 
                            class="btn btn-sm" 
                            [class.btn-ghost]="copiedTableId() !== table.id"
                            [class.btn-copied]="copiedTableId() === table.id"
                            (click)="copyLink(table)">
                            @if (copiedTableId() === table.id) {
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20,6 9,17 4,12"/>
                              </svg>
                              Copied!
                            } @else {
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                              </svg>
                              Copy
                            }
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            }
          }
        </div>

        <!-- Confirmation Modal -->
        @if (confirmationModal().show) {
          <app-confirmation-modal
            [title]="confirmationModal().title"
            [message]="confirmationModal().message"
            [confirmText]="confirmationModal().confirmText"
            [cancelText]="confirmationModal().cancelText"
            [confirmBtnClass]="confirmationModal().confirmBtnClass"
            (confirm)="onConfirmationConfirm()"
            (cancel)="onConfirmationCancel()"
          ></app-confirmation-modal>
        }
    </app-sidebar>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-5); }
    .header-left { display: flex; align-items: center; gap: var(--space-4); }
    .page-header h1 { font-size: 1.5rem; font-weight: 600; color: var(--color-text); margin: 0; }

    .btn { display: inline-flex; align-items: center; gap: var(--space-2); padding: var(--space-3) var(--space-4); border: none; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.15s ease; text-decoration: none; }
    .btn-primary { background: var(--color-primary); color: white; &:hover { background: var(--color-primary-hover); } }
    .btn-secondary { background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); &:hover { background: var(--color-border); } }
    .btn-ghost { background: transparent; color: var(--color-text-muted); &:hover { background: var(--color-bg); color: var(--color-text); } }
    .btn-sm { padding: var(--space-2) var(--space-3); font-size: 0.8125rem; }
    .btn-copied { 
      background: rgba(34, 197, 94, 0.1); 
      color: #22c55e; 
      border: 1px solid rgba(34, 197, 94, 0.2);
      animation: copiedPulse 0.3s ease;
    }
    @keyframes copiedPulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }

    .form-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-4); margin-bottom: var(--space-5); }
    .form-inline { display: flex; gap: var(--space-4); align-items: flex-end; flex-wrap: wrap; }
    .form-group-inline { display: flex; flex-direction: column; gap: var(--space-1); flex: 1; min-width: 200px; }
    .form-group-inline label { font-size: 0.75rem; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; }
    .form-group-inline input, .form-group-inline select { padding: var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 0.9375rem; background: var(--color-surface); color: var(--color-text); }
    .form-actions-inline { display: flex; gap: var(--space-2); }

    .error-banner { background: rgba(220, 38, 38, 0.1); color: var(--color-error); padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); margin-bottom: var(--space-4); }

    .empty-state {
      text-align: center; padding: var(--space-8); background: var(--color-surface);
      border: 1px dashed var(--color-border); border-radius: var(--radius-lg);
      .empty-icon { color: var(--color-text-muted); margin-bottom: var(--space-4); }
      h3 { margin: 0 0 var(--space-2); font-size: 1.125rem; color: var(--color-text); }
      p { margin: 0 0 var(--space-4); color: var(--color-text-muted); }
    }

    .floor-section { margin-bottom: var(--space-8); }
    .floor-section .section-header { 
      display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-4);
      padding-bottom: var(--space-2); border-bottom: 2px solid var(--color-bg); flex-wrap: wrap;
    }
    .section-header-left { display: flex; align-items: center; gap: var(--space-3); }
    .floor-waiter-assign { display: flex; align-items: center; gap: var(--space-2); }
    .floor-waiter-label { font-size: 0.75rem; color: var(--color-text-muted); white-space: nowrap; }
    .floor-section h2 { margin: 0; font-size: 1.25rem; font-weight: 600; }
    .badge { background: var(--color-bg); color: var(--color-text-muted); padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }

    .table-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-4); }

    .table-card {
      background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
      padding: var(--space-4); text-align: center;
    }
    .table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3); gap: var(--space-2); }
    
    .table-info { flex: 1; min-width: 0; text-align: left; }
    .editable-name { cursor: pointer; margin: 0; font-size: 1rem; font-weight: 600; color: var(--color-text); }
    .editable-name:hover { color: var(--color-primary); }
    .seat-count {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      margin-top: var(--space-1);
      cursor: pointer;
    }
    
    .edit-fields { display: flex; gap: var(--space-2); align-items: center; flex: 1; flex-wrap: wrap; }
    .edit-input { padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 0.9375rem; flex: 1; min-width: 120px; }
    .edit-input-seats { width: 80px; flex: 0 0 80px; }
    .edit-actions { display: flex; gap: var(--space-1); }
    
    .header-actions { display: flex; gap: var(--space-1); }
    
    .qr-section { margin-bottom: var(--space-4); }
    .qr-card {
      background: white; border: 2px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-4); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .qr-header { text-align: center; margin-bottom: var(--space-3); padding-bottom: var(--space-3); border-bottom: 1px solid var(--color-border); }
    .company-name { font-size: 1.125rem; font-weight: 700; color: var(--color-text); margin-bottom: var(--space-2); }
    .company-phone { display: flex; align-items: center; justify-content: center; gap: var(--space-1); font-size: 0.875rem; color: var(--color-text-muted); }
    .qr-code-wrapper { display: flex; justify-content: center; margin: var(--space-3) 0; }
    .qr-footer { text-align: center; margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--color-border); }
    .table-number { font-size: 1rem; font-weight: 600; color: var(--color-primary); text-transform: uppercase; }
    .table-actions { display: flex; gap: var(--space-2); justify-content: center; }

    .icon-btn { background: none; border: none; padding: var(--space-2); border-radius: var(--radius-sm); color: var(--color-text-muted); cursor: pointer; transition: all 0.15s ease; }
    .icon-btn:hover { background: var(--color-bg); color: var(--color-text); }
    .icon-btn-danger:hover { background: rgba(220, 38, 38, 0.1); color: var(--color-error); }

    /* Status and PIN Section */
    .pin-display {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-4);
      background: white;
      border: 2px dashed var(--color-primary);
      border-radius: var(--radius-md);
    }
    .pin-label {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }
    .pin-value {
      font-size: 1.5rem;
      font-weight: 700;
      font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
      letter-spacing: 0.2em;
      color: var(--color-primary);
    }
    .status-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      margin-bottom: var(--space-3);
      padding: var(--space-3);
      background: var(--color-bg);
      border-radius: var(--radius-md);
    }
    .status-badge {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      padding: var(--space-1) var(--space-3);
      border-radius: 12px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .status-active {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
    }
    .status-active .status-dot {
      background: #22c55e;
      animation: pulse 2s infinite;
    }
    .status-inactive {
      background: rgba(156, 163, 175, 0.1);
      color: #9ca3af;
    }
    .status-inactive .status-dot {
      background: #9ca3af;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    /* Waiter Assignment */
    .waiter-assign-section {
      padding: var(--space-2) var(--space-3);
      margin-bottom: var(--space-3);
      border-top: 1px solid var(--color-border);
    }
    .waiter-assign-row {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
    .waiter-icon { color: var(--color-text-muted); flex-shrink: 0; }
    .waiter-select {
      flex: 1;
      padding: var(--space-1) var(--space-2);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;
    }
    .waiter-select-sm {
      padding: var(--space-1) var(--space-2);
      font-size: 0.75rem;
      max-width: 180px;
    }
    .waiter-inherited {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
      margin-top: 2px;
      padding-left: 22px;
      font-style: italic;
    }

    /* Session Actions */
    .session-actions {
      display: flex;
      gap: var(--space-2);
      justify-content: center;
      margin-bottom: var(--space-3);
    }
    .btn-success {
      background: #22c55e;
      color: white;
      &:hover { background: #16a34a; }
    }
    .btn-warning {
      background: #f59e0b;
      color: white;
      &:hover { background: #d97706; }
    }
    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .table-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class TablesComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  tables = signal<Table[]>([]);
  floors = signal<Floor[]>([]);
  loading = signal(true);
  error = signal('');
  showForm = signal(false);
  newTableName = '';
  selectedFloorId: number | null = null;
  tenantSettings = signal<TenantSettings | null>(null);

  editingTableId = signal<number | null>(null);
  editingName = '';
  editingSeatCount: number | null = null;
  copiedTableId = signal<number | null>(null);
  activatingTableId = signal<number | null>(null);
  waiters = signal<User[]>([]);

  // Confirmation Modal State
  confirmationModal = signal<{
    show: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    confirmBtnClass: string;
    tableToDelete: Table | null;
  }>({
    show: false,
    title: '',
    message: '',
    confirmText: 'COMMON.YES',
    cancelText: 'COMMON.NO',
    confirmBtnClass: 'btn-primary',
    tableToDelete: null
  });

  ngOnInit() {
    this.loadData();
    this.loadTenantSettings();
    this.api.getWaiters().subscribe({
      next: waiters => this.waiters.set(waiters),
      error: () => {}
    });
  }

  loadData() {
    this.loading.set(true);
    // Use forkJoin if needed, but sequential is fine for now
    this.api.getFloors().subscribe({
      next: floors => {
        this.floors.set(floors);
        if (floors.length > 0) {
          this.selectedFloorId = floors[0].id!;
        }
        this.api.getTables().subscribe({
          next: tables => { this.tables.set(tables); this.loading.set(false); },
          error: err => { this.error.set(err.error?.detail || 'Failed to load tables'); this.loading.set(false); }
        });
      },
      error: err => { this.error.set(err.error?.detail || 'Failed to load floors'); this.loading.set(false); }
    });
  }

  getTablesByFloor(floorId: number): Table[] {
    return this.tables().filter(t => t.floor_id === floorId);
  }

  createTable(e: Event) {
    e.preventDefault();
    if (!this.newTableName || !this.selectedFloorId) return;
    this.api.createTable(this.newTableName, this.selectedFloorId).subscribe({
      next: table => {
        this.tables.update(t => [...t, table]);
        this.newTableName = '';
        this.showForm.set(false);
      },
      error: err => this.error.set(err.error?.detail || 'Failed')
    });
  }

  deleteTable(table: Table) {
    if (!table.id) return;
    this.confirmationModal.set({
      show: true,
      title: 'TABLES.DELETE_TABLE',
      message: 'TABLES.DELETE_TABLE_CONFIRM',
      confirmText: 'COMMON.DELETE',
      cancelText: 'COMMON.CANCEL',
      confirmBtnClass: 'btn-danger',
      tableToDelete: table
    });
  }

  onConfirmationConfirm() {
    const table = this.confirmationModal().tableToDelete;
    if (table?.id) {
      this.api.deleteTable(table.id).subscribe({
        next: () => this.tables.update(t => t.filter(x => x.id !== table.id)),
        error: err => this.error.set(err.error?.detail || 'Failed')
      });
    }
    this.onConfirmationCancel();
  }

  onConfirmationCancel() {
    this.confirmationModal.update(m => ({ ...m, show: false, tableToDelete: null }));
  }

  getMenuUrl(table: Table): string {
    return `${window.location.origin}/menu/${table.token}`;
  }

  copyLink(table: Table) {
    if (!table.id) return;
    const url = this.getMenuUrl(table);
    const tableId = table.id;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        this.showCopiedFeedback(tableId);
      }).catch(err => {
        this.fallbackCopy(url, tableId);
      });
    } else {
      this.fallbackCopy(url, tableId);
    }
  }

  private showCopiedFeedback(tableId: number) {
    this.copiedTableId.set(tableId);
    setTimeout(() => {
      this.copiedTableId.set(null);
    }, 2000);
  }

  private fallbackCopy(text: string, tableId: number) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      if (document.execCommand('copy')) {
        this.showCopiedFeedback(tableId);
      }
    } catch (err) {
      this.error.set('Failed to copy link');
    } finally {
      document.body.removeChild(textarea);
    }
  }

  loadTenantSettings() {
    this.api.getTenantSettings().subscribe({
      next: settings => this.tenantSettings.set(settings),
      error: () => this.tenantSettings.set(null)
    });
  }

  startEdit(table: Table) {
    if (!table.id) return;
    this.editingTableId.set(table.id);
    this.editingName = table.name;
    this.editingSeatCount = table.seat_count || null;
  }

  cancelEdit() {
    this.editingTableId.set(null);
    this.editingName = '';
    this.editingSeatCount = null;
  }

  saveTable(table: Table) {
    if (!table.id || !this.editingName.trim()) return;

    const updates: Partial<Table> = {
      name: this.editingName.trim()
    };

    if (this.editingSeatCount !== null && this.editingSeatCount > 0) {
      updates.seat_count = this.editingSeatCount;
    }

    this.api.updateTable(table.id, updates).subscribe({
      next: updated => {
        this.tables.update(t => t.map(x => x.id === table.id ? updated : x));
        this.cancelEdit();
      },
      error: err => this.error.set(err.error?.detail || 'Failed to update table')
    });
  }

  // Table Session Management
  activateTableSession(table: Table) {
    if (!table.id) return;
    this.activatingTableId.set(table.id);
    this.api.activateTable(table.id).subscribe({
      next: response => {
        this.tables.update(tables => tables.map(t =>
          t.id === table.id
            ? { ...t, is_active: true, order_pin: response.pin, active_order_id: response.active_order_id, activated_at: response.activated_at }
            : t
        ));
        this.activatingTableId.set(null);
      },
      error: err => {
        this.error.set(err.error?.detail || 'Failed to activate table');
        this.activatingTableId.set(null);
      }
    });
  }

  closeTableSession(table: Table) {
    if (!table.id) return;
    this.activatingTableId.set(table.id);
    this.api.closeTable(table.id).subscribe({
      next: () => {
        this.tables.update(tables => tables.map(t =>
          t.id === table.id
            ? { ...t, is_active: false, order_pin: null, active_order_id: null }
            : t
        ));
        this.activatingTableId.set(null);
      },
      error: err => {
        this.error.set(err.error?.detail || 'Failed to close table');
        this.activatingTableId.set(null);
      }
    });
  }

  regeneratePin(table: Table) {
    if (!table.id) return;
    this.activatingTableId.set(table.id);
    this.api.regenerateTablePin(table.id).subscribe({
      next: (response: TableActivateResponse) => {
        this.tables.update(tables => tables.map(t =>
          t.id === table.id
            ? { ...t, order_pin: response.pin }
            : t
        ));
        this.activatingTableId.set(null);
      },
      error: (err: any) => {
        this.error.set(err.error?.detail || 'Failed to regenerate PIN');
        this.activatingTableId.set(null);
      }
    });
  }

  onWaiterAssign(table: Table, event: Event) {
    const select = event.target as HTMLSelectElement;
    const waiterId = select.value ? Number(select.value) : null;
    if (!table.id) return;
    this.api.assignWaiterToTable(table.id, waiterId).subscribe({
      next: (res: any) => {
        this.tables.update(tables => tables.map(t =>
          t.id === table.id
            ? { ...t, assigned_waiter_id: res.assigned_waiter_id, assigned_waiter_name: res.assigned_waiter_name }
            : t
        ));
      },
      error: (err: any) => this.error.set(err.error?.detail || 'Failed to assign waiter')
    });
  }

  onFloorWaiterAssign(floor: Floor, event: Event) {
    const select = event.target as HTMLSelectElement;
    const waiterId = select.value ? Number(select.value) : null;
    if (!floor.id) return;
    this.api.assignWaiterToFloor(floor.id, waiterId).subscribe({
      next: (res: any) => {
        this.floors.update(floors => floors.map(f =>
          f.id === floor.id
            ? { ...f, default_waiter_id: res.default_waiter_id, default_waiter_name: res.default_waiter_name }
            : f
        ));
      },
      error: (err: any) => this.error.set(err.error?.detail || 'Failed to assign waiter to floor')
    });
  }
}
