import { Component, inject, signal, computed, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LowerCasePipe } from '@angular/common';
import { ApiService, Floor, CanvasTable, TableOperationalStatus, User } from '../services/api.service';
import { PermissionService } from '../services/permission.service';
import { SidebarComponent } from '../shared/sidebar.component';
import { ConfirmationModalComponent } from '../shared/confirmation-modal.component';
import { FocusFirstInputDirective } from '../shared/focus-first-input.directive';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { StaffPosToolbarComponent } from '../shared/staff-pos-toolbar.component';
import { TablesAreaPreferenceService } from '../services/tables-area-preference.service';

interface TableShape {
  id: string;
  name: string;
  shape: 'rectangle' | 'circle' | 'oval' | 'booth' | 'bar';
  width: number;
  height: number;
  seats: number;
}

/** Same roles as `orderAccessGuard` — staff who may use /staff/orders */
const STAFF_ORDERS_ROLES = new Set([
  'owner',
  'admin',
  'kitchen',
  'bartender',
  'waiter',
  'receptionist',
]);

@Component({
  selector: 'app-tables-canvas',
  standalone: true,
  imports: [FormsModule, SidebarComponent, StaffPosToolbarComponent, RouterLink, TranslateModule, LowerCasePipe, ConfirmationModalComponent, FocusFirstInputDirective],
  template: `
    <app-sidebar>
      <div class="canvas-container tables-canvas--tablet" data-testid="tables-canvas-root">
        <!-- Header: same options as /tables -->
        <div class="page-header page-header--staff-flow" data-testid="tables-canvas-header">
          <app-staff-pos-toolbar />
          <div class="page-header-row">
          <div class="header-left">
            <h1>{{ 'TABLES.TITLE' | translate }}</h1>
            <span class="btn btn-ghost btn-sm active" aria-current="page" data-testid="view-option-floor-plan">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
                <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
              </svg>
              {{ 'TABLES.FLOOR_PLAN' | translate }}
            </span>
            @if (floors().length > 0) {
              <div class="view-toggle" data-testid="view-toggle">
                <a routerLink="/tables" [queryParams]="{ view: 'tiles' }" class="btn btn-ghost btn-sm" [title]="'TABLES.VIEW_TILES' | translate" data-testid="view-option-tiles">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
                  </svg>
                  {{ 'TABLES.VIEW_TILES' | translate }}
                </a>
                <a routerLink="/tables" [queryParams]="{ view: 'table' }" class="btn btn-ghost btn-sm" [title]="'TABLES.VIEW_TABLE' | translate" data-testid="view-option-table">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="1"/>
                    <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
                    <line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
                  </svg>
                  {{ 'TABLES.VIEW_TABLE' | translate }}
                </a>
              </div>
            }
          </div>
          <div class="header-actions">
            @if (hasUnsavedChanges()) {
              <span class="unsaved-indicator">{{ 'TABLES.UNSAVED_CHANGES' | translate }}</span>
            }
            @if (floors().length > 0) {
              <button type="button" class="btn btn-primary" (click)="focusAddTablePalette()" [title]="'TABLES.ADD_TABLE' | translate" data-testid="tables-canvas-add-table-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                {{ 'TABLES.ADD_TABLE' | translate }}
              </button>
            }
            <button class="btn btn-primary" (click)="saveAllPositions()" [disabled]="!hasUnsavedChanges()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/>
              </svg>
              {{ 'TABLES.SAVE_LAYOUT' | translate }}
            </button>
            @if (canJoinSelection()) {
              <button type="button" class="btn btn-secondary" (click)="joinSelectedTables()" data-testid="tables-join-btn">
                {{ 'TABLES.JOIN_TABLES' | translate }}
              </button>
            }
            @if (canUnjoinFromSelection()) {
              <button type="button" class="btn btn-secondary" (click)="unjoinSelectedGroup()" data-testid="tables-unjoin-btn">
                {{ 'TABLES.UNJOIN_TABLES' | translate }}
              </button>
            }
          </div>
          </div>
        </div>
        @if (floors().length > 0) {
          <p class="join-hint muted">{{ 'TABLES.JOIN_HINT' | translate }}</p>
        }

        @if (error()) {
          <div class="error-banner">{{ error() }}</div>
        }

        <!-- Floor Tabs -->
        <div class="floor-tabs">
          @for (floor of floors(); track floor.id) {
            <button
              class="floor-tab"
              [class.active]="selectedFloorId() === floor.id"
              [class.editing]="editingFloorId() === floor.id"
              (click)="selectFloor(floor.id!)"
              (dblclick)="editFloor()"
            >
              @if (editingFloorId() === floor.id) {
                <input
                  type="text"
                  [(ngModel)]="editingFloorName"
                  (blur)="saveFloorName(floor)"
                  (keydown.enter)="saveFloorName(floor)"
                  (keydown.escape)="cancelFloorEdit()"
                  class="floor-name-input"
                  autofocus
                >
              } @else {
                {{ floor.name }}
              }
            </button>
          }
          <button class="floor-tab add-floor" (click)="addFloor()" [title]="'TABLES.ADD_FLOOR' | translate">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          @if (floors().length > 0 && selectedFloorId()) {
            <button class="floor-tab floor-action edit-action" (click)="editFloor()" [title]="'TABLES.RENAME_FLOOR' | translate">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="floor-tab floor-action danger" (click)="deleteCurrentFloor()" [title]="'TABLES.DELETE_FLOOR' | translate">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,6 5,6 21,6"/>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          }
          @if (pendingPlacementShape) {
            <button
              class="floor-tab add-table-btn active-placement"
              (click)="pendingPlacementShape = null"
              [title]="'TABLES.CANCEL' | translate">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
              {{ 'TABLES.CANCEL' | translate }}
            </button>
          }
        </div>

        <!-- Main Canvas -->
        <div class="canvas-wrapper">
          <!-- Zoom Controls -->
          <div class="floor-legend" data-testid="floor-plan-legend" [attr.aria-label]="'TABLES.LEGEND_TITLE' | translate">
            <div class="floor-legend-title">{{ 'TABLES.LEGEND_TITLE' | translate }}</div>
            @for (leg of floorLegendItems; track leg.key) {
              <div class="floor-legend-row">
                <span class="floor-legend-swatch" [style.background]="leg.swatch"></span>
                <span class="floor-legend-label">{{ leg.labelKey | translate }}</span>
              </div>
            }
          </div>
          <div class="zoom-controls">
            <button class="zoom-btn" (click)="zoomIn()" [title]="'TABLES.ZOOM_IN' | translate">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </button>
            <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
            <button class="zoom-btn" (click)="zoomOut()" [title]="'TABLES.ZOOM_OUT' | translate">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </button>
            <button class="zoom-btn" (click)="resetZoom()" [title]="'TABLES.RESET_ZOOM' | translate">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
            </button>
          </div>
          <div
            class="canvas-area"
            #canvasArea
            (mousedown)="onCanvasMouseDown($event)"
            (dragover)="onCanvasDragOver($event)"
            (drop)="onCanvasDrop($event)"
            (click)="onCanvasClick($event)"
            (wheel)="onCanvasWheel($event)"
          >
            @if (floors().length === 0) {
              <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="1">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
                  <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
                </svg>
                <h3>{{ 'TABLES.CREATE_FIRST_FLOOR' | translate }}</h3>
                <p>{{ 'TABLES.CREATE_FIRST_FLOOR_DESC' | translate }}</p>
                <button class="btn btn-primary" (click)="addFloor()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  {{ 'TABLES.ADD_FLOOR' | translate }}
                </button>
              </div>
            } @else {
              <svg
                class="canvas-svg"
                #canvasSvg
                [attr.viewBox]="getViewBox()"
                preserveAspectRatio="xMidYMid meet"
                (touchstart)="onCanvasTouchStart($event)"
              >
                <!-- Professional SVG Definitions -->
                <defs>
                  <!-- Wood grain pattern for tables -->
                  <pattern id="woodGrain" patternUnits="userSpaceOnUse" width="60" height="60">
                    <rect width="60" height="60" fill="#d4c4a8"/>
                    <path d="M0 30 Q15 28 30 30 T60 30" stroke="#c9b896" stroke-width="1" fill="none" opacity="0.5"/>
                    <path d="M0 15 Q15 13 30 15 T60 15" stroke="#c9b896" stroke-width="1" fill="none" opacity="0.3"/>
                    <path d="M0 45 Q15 47 30 45 T60 45" stroke="#c9b896" stroke-width="1" fill="none" opacity="0.4"/>
                  </pattern>
                  
                  <!-- Occupied table pattern (green) -->
                  <pattern id="occupiedPattern" patternUnits="userSpaceOnUse" width="60" height="60">
                    <rect width="60" height="60" fill="#22c55e"/>
                    <path d="M0 30 Q15 28 30 30 T60 30" stroke="#16a34a" stroke-width="1" fill="none" opacity="0.3"/>
                  </pattern>
                  
                  <!-- Chair gradient (neutral gray, professional look) -->
                  <linearGradient id="chairGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#e8e8e8"/>
                    <stop offset="100%" style="stop-color:#c0c0c0"/>
                  </linearGradient>
                  
                  <!-- Chair shadow -->
                  <filter id="chairShadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="1" dy="1" stdDeviation="1" flood-opacity="0.2"/>
                  </filter>
                  
                  <!-- Table shadow - softer and more professional -->
                  <filter id="tableShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="2" dy="4" stdDeviation="4" flood-opacity="0.15"/>
                  </filter>
                  
                  <!-- Selected glow -->
                  <filter id="selectedGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#22c55e" flood-opacity="0.6"/>
                  </filter>
                </defs>

                <!-- Tables (compact name + capacity; tablet floor — no per-chair icons) -->
                @for (table of tablesOnCurrentFloor(); track table.id) {
                  <g
                    class="table-group"
                    [class.selected]="isTableVisualSelected(table)"
                    [class.join-picked]="isTableJoinPicked(table)"
                    [class.join-proximity-hint]="joinProximityTargetId() === table.id"
                    [class.dragging]="isDragging && draggedTable?.id === table.id"
                    [attr.transform]="'translate(' + (table.x_position || 100) + ',' + (table.y_position || 100) + ')'"
                    (mousedown)="onTableMouseDown($event, table)"
                    (dblclick)="onTableDoubleClick($event, table)"
                    (touchstart)="onTableTouchStart($event, table)"
                  >
                    <!-- Table shape with shadow -->
                    <g [attr.filter]="isTableVisualSelected(table) ? 'url(#selectedGlow)' : 'url(#tableShadow)'">
                      @if (table.shape === 'circle') {
                        <ellipse
                          cx="0" cy="0"
                          [attr.rx]="(table.width || 80) / 2"
                          [attr.ry]="(table.height || 80) / 2"
                          [attr.fill]="tableSurfaceFill(table)"
                          [attr.stroke]="tableSurfaceStroke(table)"
                          stroke-width="2"
                        />
                      } @else if (table.shape === 'oval') {
                        <ellipse
                          cx="0" cy="0"
                          [attr.rx]="(table.width || 120) / 2"
                          [attr.ry]="(table.height || 70) / 2"
                          [attr.fill]="tableSurfaceFill(table)"
                          [attr.stroke]="tableSurfaceStroke(table)"
                          stroke-width="2"
                        />
                      } @else if (table.shape === 'booth') {
                        <rect
                          [attr.x]="-((table.width || 100) / 2)"
                          [attr.y]="-((table.height || 80) / 2)"
                          [attr.width]="table.width || 100"
                          [attr.height]="table.height || 80"
                          rx="4"
                          [attr.fill]="tableSurfaceFill(table)"
                          [attr.stroke]="tableSurfaceStroke(table)"
                          stroke-width="2"
                        />
                        <line
                          [attr.x1]="-((table.width || 100) / 2) + 5"
                          [attr.y1]="-((table.height || 80) / 2) + 8"
                          [attr.x2]="((table.width || 100) / 2) - 5"
                          [attr.y2]="-((table.height || 80) / 2) + 8"
                          [attr.stroke]="tableSurfaceStroke(table)"
                          stroke-width="1"
                          opacity="0.45"
                        />
                        <line
                          [attr.x1]="-((table.width || 100) / 2) + 5"
                          [attr.y1]="((table.height || 80) / 2) - 8"
                          [attr.x2]="((table.width || 100) / 2) - 5"
                          [attr.y2]="((table.height || 80) / 2) - 8"
                          [attr.stroke]="tableSurfaceStroke(table)"
                          stroke-width="1"
                          opacity="0.45"
                        />
                      } @else if (table.shape === 'bar') {
                        <rect
                          [attr.x]="-((table.width || 160) / 2)"
                          [attr.y]="-((table.height || 40) / 2)"
                          [attr.width]="table.width || 160"
                          [attr.height]="table.height || 40"
                          rx="4"
                          [attr.fill]="tableSurfaceFill(table)"
                          [attr.stroke]="tableSurfaceStroke(table)"
                          stroke-width="2"
                        />
                        <line
                          [attr.x1]="-((table.width || 160) / 2) + 4"
                          [attr.y1]="-((table.height || 40) / 2) + 4"
                          [attr.x2]="((table.width || 160) / 2) - 4"
                          [attr.y2]="-((table.height || 40) / 2) + 4"
                          [attr.stroke]="tableSurfaceStroke(table)"
                          stroke-width="2"
                          stroke-linecap="round"
                          opacity="0.5"
                        />
                      } @else {
                        <rect
                          [attr.x]="-((table.width || 100) / 2)"
                          [attr.y]="-((table.height || 70) / 2)"
                          [attr.width]="table.width || 100"
                          [attr.height]="table.height || 70"
                          rx="4"
                          [attr.fill]="tableSurfaceFill(table)"
                          [attr.stroke]="tableSurfaceStroke(table)"
                          stroke-width="2"
                        />
                      }
                    </g>
                    <text
                      class="table-caption"
                      text-anchor="middle"
                      [attr.fill]="tableCaptionFill(table)"
                      font-weight="600"
                      font-size="11"
                    >
                      <tspan x="0" dy="-0.2em">{{ tableCaptionName(table) }}</tspan>
                      <tspan x="0" dy="1.15em" font-size="10" font-weight="500" opacity="0.92">— {{ tableSeatLabel(table) }}</tspan>
                    </text>
                    @if (getWaiterInitials(table)) {
                      <g [attr.transform]="'translate(' + ((table.width || 100) / 2 - 10) + ',' + (-((table.height || 70) / 2) - 4) + ')'">
                        <circle r="10" [attr.fill]="getWaiterColor(table)" opacity="0.9"/>
                        <text text-anchor="middle" dominant-baseline="middle" fill="white" font-size="9" font-weight="600">
                          {{ getWaiterInitials(table) }}
                        </text>
                      </g>
                    }
                  </g>
                }

                <!-- Drop preview ghost (while dragging from palette) -->
                @if (dragPreview(); as preview) {
                  <g
                    [attr.transform]="'translate(' + preview.x + ',' + preview.y + ')'"
                    opacity="0.45"
                    style="pointer-events: none;"
                  >
                    @if (preview.shape.shape === 'circle') {
                      <ellipse cx="0" cy="0"
                        [attr.rx]="preview.shape.width / 2"
                        [attr.ry]="preview.shape.height / 2"
                        fill="url(#woodGrain)" stroke="#8b7355" stroke-width="2"/>
                    } @else if (preview.shape.shape === 'oval') {
                      <ellipse cx="0" cy="0"
                        [attr.rx]="preview.shape.width / 2"
                        [attr.ry]="preview.shape.height / 2"
                        fill="url(#woodGrain)" stroke="#8b7355" stroke-width="2"/>
                    } @else if (preview.shape.shape === 'bar') {
                      <rect
                        [attr.x]="-(preview.shape.width / 2)"
                        [attr.y]="-(preview.shape.height / 2)"
                        [attr.width]="preview.shape.width"
                        [attr.height]="preview.shape.height"
                        rx="4" fill="#5c4033" stroke="#3d2817" stroke-width="2"/>
                    } @else {
                      <rect
                        [attr.x]="-(preview.shape.width / 2)"
                        [attr.y]="-(preview.shape.height / 2)"
                        [attr.width]="preview.shape.width"
                        [attr.height]="preview.shape.height"
                        rx="4" fill="url(#woodGrain)" stroke="#8b7355" stroke-width="2"/>
                    }
                  </g>
                }
              </svg>
            }
          </div>

          <!-- Properties Panel (shown when table selected) - Bottom sheet on mobile -->
          @if (selectedTable()) {
            <div class="properties-panel-backdrop" (click)="selectedTable.set(null); joinSelectionIds.set([])"></div>
            <div class="properties-panel" [class.expanded]="propertiesPanelExpanded">
              <!-- Drag handle for mobile -->
              <div class="panel-drag-handle" (click)="propertiesPanelExpanded = !propertiesPanelExpanded">
                <span class="drag-indicator"></span>
              </div>
              <div class="panel-header">
                  <div class="panel-title-row">
                  <h3>{{ selectedTable()?.name }}</h3>
                  <div
                    class="status-badge"
                    [class.op-available]="operationalKey(selectedTable()!) === 'available'"
                    [class.op-reserved]="operationalKey(selectedTable()!) === 'reserved'"
                    [class.op-occupied]="operationalKey(selectedTable()!) === 'occupied'"
                    [class.op-open-order]="operationalKey(selectedTable()!) === 'open_order'"
                    [class.op-bill]="operationalKey(selectedTable()!) === 'bill_issued'">
                    {{ operationalStatusLabelKey(selectedTable()!) | translate }}
                  </div>
                </div>
                <button class="close-btn" (click)="selectedTable.set(null); joinSelectionIds.set([])">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div class="panel-body">
                @if (selectedTable()?.table_group_id) {
                  <p class="panel-group-line">{{ 'TABLES.GROUP_MEMBERS' | translate }}: {{ groupLineForSelected() }}</p>
                }
                <div class="form-row">
                  <div class="form-group">
                    <label>{{ 'TABLES.NAME' | translate }}</label>
                    <input type="text" [(ngModel)]="selectedTableName" (blur)="updateSelectedTable()">
                  </div>
                  <div class="form-group">
                    <label>{{ 'TABLES.SEATS' | translate }}</label>
                    <input type="number" min="1" max="20" [(ngModel)]="selectedTableSeats" (blur)="updateSelectedTable()">
                  </div>
                </div>
                <div class="form-group">
                    <label>{{ 'TABLES.ASSIGNED_WAITER' | translate }}</label>
                  @if (canManageTableAssignments()) {
                    <select class="panel-select" (change)="onCanvasWaiterAssign($event)">
                      <option value="" [selected]="!selectedTable()?.assigned_waiter_id">{{ 'TABLES.UNASSIGNED' | translate }}</option>
                      @for (w of waiters(); track w.id) {
                        <option [value]="w.id" [selected]="selectedTable()?.assigned_waiter_id === w.id">{{ w.full_name || w.email }}</option>
                      }
                    </select>
                    @if (!selectedTable()?.assigned_waiter_id && selectedTable()?.effective_waiter_name) {
                      <div class="waiter-inherited-panel">{{ 'TABLES.SECTION_DEFAULT' | translate }}: {{ selectedTable()?.effective_waiter_name }}</div>
                    }
                  } @else {
                    <div class="panel-waiter-readonly">
                      @if (selectedTable()?.assigned_waiter_id) {
                        {{ selectedTable()?.assigned_waiter_name || selectedTable()?.effective_waiter_name || '—' }}
                      } @else if (selectedTable()?.effective_waiter_name) {
                        {{ 'TABLES.SECTION_DEFAULT' | translate }}: {{ selectedTable()?.effective_waiter_name }}
                      } @else {
                        {{ 'TABLES.UNASSIGNED' | translate }}
                      }
                    </div>
                  }
                </div>
                @if (canOpenStaffOrders() && selectedTable()?.id != null) {
                  <div class="panel-order-link">
                    @if (selectedTable()!.active_order_id) {
                      <a
                        class="btn btn-primary panel-order-btn"
                        routerLink="/staff/orders"
                        [queryParams]="{ focusOrder: selectedTable()!.active_order_id, table: selectedTable()!.id }"
                        data-testid="canvas-open-order-btn">
                        {{ 'TABLES.OPEN_STAFF_ORDER' | translate }}
                      </a>
                    } @else {
                      <a
                        class="btn btn-primary panel-order-btn"
                        routerLink="/staff/orders"
                        [queryParams]="{ focusTableId: selectedTable()!.id, table: selectedTable()!.id }"
                        data-testid="canvas-table-orders-btn">
                        {{ 'TABLES.VIEW_TABLE_ORDERS' | translate }}
                      </a>
                    }
                  </div>
                }
                <button class="delete-btn" (click)="deleteSelectedTable()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3,6 5,6 21,6"/>
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                  </svg>
                  {{ 'TABLES.DELETE' | translate }}
                </button>
              </div>
            </div>
          }

          <!-- Shape Palette (shown when no table selected) -->
          @if (!selectedTable() && floors().length > 0 && selectedFloorId()) {
            <div class="shape-palette" #shapePalette>
              <div class="palette-header">
                <h3>{{ 'TABLES.ADD_TABLE' | translate }}</h3>
                <span class="palette-hint">{{ 'TABLES.DRAG_HINT' | translate }}</span>
              </div>
              <div class="palette-shapes">
                @for (shape of tableShapes; track shape.id) {
                  <div
                    class="palette-shape"
                    [class.active-placement]="pendingPlacementShape?.id === shape.id"
                    draggable="true"
                    (dragstart)="onShapeDragStart($event, shape)"
                    (dragend)="onShapeDragEnd()"
                    (touchstart)="onShapeTouchStart($event, shape)"
                    (click)="onShapeTap(shape)"
                  >
                    <div class="shape-preview">
                      @if (shape.shape === 'rectangle') {
                        <div class="preview-rect"></div>
                      } @else if (shape.shape === 'circle') {
                        <div class="preview-circle"></div>
                      } @else if (shape.shape === 'oval') {
                        <div class="preview-oval"></div>
                      } @else if (shape.shape === 'booth') {
                        <div class="preview-booth"></div>
                      } @else if (shape.shape === 'bar') {
                        <div class="preview-bar"></div>
                      }
                    </div>
                    <span class="palette-shape-name">{{ shape.name }}</span>
                    <small>{{ shape.seats }} {{ 'TABLES.SEATS' | translate | lowercase }}</small>
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- Confirmation Modal -->
        @if (confirmationModal().show) {
          <app-confirmation-modal
            [title]="confirmationModal().title"
            [message]="confirmationModal().message"
            [messageParams]="confirmationModal().messageParams ?? {}"
            [confirmText]="confirmationModal().confirmText"
            [cancelText]="confirmationModal().cancelText"
            [confirmBtnClass]="confirmationModal().confirmBtnClass"
            (confirm)="onConfirmationConfirm()"
            (cancel)="onConfirmationCancel()"
          ></app-confirmation-modal>
        }

        <!-- Reassign orders/reservations to another table before delete -->
        @if (reassignTableModal()) {
          <div class="modal-overlay" (click)="cancelReassign()">
            <div class="modal-content reassign-modal" (click)="$event.stopPropagation()" appFocusFirstInput>
              <div class="modal-header">
                <h3>{{ 'TABLES.REASSIGN_AND_DELETE_TITLE' | translate }}</h3>
                <button type="button" class="close-btn" (click)="cancelReassign()" aria-label="Close">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div class="modal-body">
                <p class="reassign-message">{{ 'TABLES.REASSIGN_AND_DELETE_MESSAGE' | translate }}</p>
                <label class="reassign-label">{{ 'TABLES.REASSIGN_TO_TABLE' | translate }}</label>
                <select class="reassign-select" [ngModel]="reassignTargetTableId()" (ngModelChange)="reassignTargetTableId.set($event)">
                  @for (t of otherTablesForReassign(); track t.id) {
                    <option [ngValue]="t.id">{{ t.name }}</option>
                  }
                </select>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-ghost" (click)="cancelReassign()">{{ 'COMMON.CANCEL' | translate }}</button>
                <button type="button" class="btn btn-primary" (click)="doReassignAndDelete()" [disabled]="!reassignTargetTableId()">
                  {{ 'TABLES.REASSIGN_AND_DELETE' | translate }}
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </app-sidebar>
  `,
  styles: [`
    .join-hint {
      font-size: 12px;
      margin: -4px 0 8px 12px;
      opacity: 0.75;
    }
    .panel-group-line {
      font-size: 13px;
      margin: 0 0 12px;
      color: var(--text-muted, #64748b);
    }
    .canvas-container {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 2rem);
      gap: var(--space-3);
    }

    /* Tablet floor plan: dark canvas + high-contrast status colors */
    .canvas-container.tables-canvas--tablet {
      --tables-canvas-bg: #101318;
      --tables-canvas-grid: rgba(255, 255, 255, 0.06);
    }
    /* Header + floor tabs: keep theme light/neutral; dark styling only on .canvas-area below */
    .canvas-container.tables-canvas--tablet .canvas-area {
      background:
        linear-gradient(var(--tables-canvas-grid) 1px, transparent 1px),
        linear-gradient(90deg, var(--tables-canvas-grid) 1px, transparent 1px),
        var(--tables-canvas-bg);
    }
    .canvas-container.tables-canvas--tablet .empty-state {
      background: var(--tables-canvas-bg);
    }

    .floor-legend {
      position: absolute;
      top: var(--space-3);
      left: var(--space-3);
      z-index: 15;
      background: rgba(16, 19, 24, 0.94);
      border: 1px solid #2d3540;
      border-radius: var(--radius-md);
      padding: var(--space-2) var(--space-3);
      max-width: min(240px, 46vw);
      font-size: 0.75rem;
      color: #e5e7eb;
      box-shadow: var(--shadow-md);
      pointer-events: none;
    }
    .floor-legend-title {
      font-weight: 600;
      margin-bottom: 6px;
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #9ca3af;
    }
    .floor-legend-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 3px 0;
    }
    .floor-legend-swatch {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      flex-shrink: 0;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .floor-legend-label {
      line-height: 1.25;
    }

    .status-badge.op-available {
      background: rgba(75, 85, 99, 0.35);
      color: #e5e7eb;
    }
    .status-badge.op-reserved {
      background: rgba(217, 119, 6, 0.25);
      color: #fcd34d;
    }
    .status-badge.op-occupied {
      background: rgba(5, 150, 105, 0.25);
      color: #6ee7b7;
    }
    .status-badge.op-open-order {
      background: rgba(37, 99, 235, 0.28);
      color: #bfdbfe;
    }
    .status-badge.op-bill {
      background: rgba(124, 58, 237, 0.28);
      color: #ddd6fe;
    }

    .table-caption {
      pointer-events: none;
    }

    /* Page Header - matches app style; sticky so view options stay visible when scrolling to shape palette */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-4);
      position: sticky;
      top: 0;
      z-index: 20;
      background: var(--color-bg);
      padding: var(--space-2) 0;
    }

    .page-header.page-header--staff-flow {
      flex-direction: column;
      align-items: stretch;
      gap: 0;
    }

    .page-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-4);
      flex-wrap: wrap;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }

    .header-left h1 {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0;
    }

    .view-toggle { display: flex; gap: 2px; }
    .view-toggle .btn { display: inline-flex; align-items: center; gap: 6px; text-decoration: none; }
    .header-left .btn.active { background: var(--color-bg); color: var(--color-text); font-weight: 500; cursor: default; }

    .header-actions {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .unsaved-indicator {
      color: var(--color-warning);
      font-size: 0.875rem;
    }

    .error-banner {
      background: rgba(220, 38, 38, 0.1);
      color: var(--color-error);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      margin-bottom: var(--space-3);
      border: 1px solid rgba(220, 38, 38, 0.15);
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
      transition: all 0.15s ease;
      text-decoration: none;
    }
    .btn-primary { background: var(--color-primary); color: white; }
    .btn-primary:hover:not(:disabled) { background: var(--color-primary-hover); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content.reassign-modal { background: var(--color-surface); border-radius: var(--radius-lg); max-width: 400px; width: 90%; box-shadow: var(--shadow-xl); overflow: hidden; }
    .reassign-modal .modal-header { display: flex; justify-content: space-between; align-items: center; padding: var(--space-4); border-bottom: 1px solid var(--color-border); }
    .reassign-modal .modal-header h3 { margin: 0; font-size: 1.125rem; font-weight: 600; }
    .reassign-modal .close-btn { background: none; border: none; color: var(--color-text-muted); cursor: pointer; padding: var(--space-1); border-radius: var(--radius-sm); }
    .reassign-modal .close-btn:hover { color: var(--color-text); background: var(--color-bg); }
    .reassign-modal .modal-body { padding: var(--space-4); }
    .reassign-modal .reassign-message { margin: 0 0 var(--space-4); color: var(--color-text-muted); font-size: 0.9375rem; }
    .reassign-modal .reassign-label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: var(--space-2); }
    .reassign-modal .reassign-select { width: 100%; padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 0.9375rem; background: var(--color-surface); color: var(--color-text); }
    .reassign-modal .modal-footer { display: flex; justify-content: flex-end; gap: var(--space-2); padding: var(--space-4); border-top: 1px solid var(--color-border); }
    .btn-secondary { background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); }
    .btn-secondary:hover:not(:disabled) { background: var(--color-border); }
    .btn-ghost { background: transparent; color: var(--color-text-muted); }
    .btn-ghost:hover { background: var(--color-bg); color: var(--color-text); }
    .btn-sm { padding: var(--space-2) var(--space-3); font-size: 0.8125rem; }

    /* Floor Tabs - matches app style */
    .floor-tabs {
      display: flex;
      gap: var(--space-1);
      padding: var(--space-2);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow-x: auto;
      margin-bottom: var(--space-4);
    }

    .floor-tab {
      padding: var(--space-2) var(--space-4);
      min-height: 44px;
      min-width: 44px;
      border: none;
      background: transparent;
      color: var(--color-text-muted);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.15s ease;
      white-space: nowrap;
      position: relative;
    }
    .floor-tab:hover { background: var(--color-bg); color: var(--color-text); }
    .floor-tab.active {
      background: var(--color-primary);
      color: white;
    }
    .floor-tab.active.editing {
      background: transparent;
      color: var(--color-text);
      border: 1px solid var(--color-primary);
    }
    .floor-tab.add-floor {
      padding: var(--space-2);
      color: var(--color-text-muted);
    }
    .floor-tab.floor-action {
      padding: var(--space-2);
    }
    .floor-tab.floor-action.edit-action {
      /* Position right next to the add-floor button (no margin-left: auto) */
    }
    .floor-tab.floor-action.danger {
      margin-left: auto;
    }
    .floor-tab.floor-action.danger:hover {
      background: rgba(220, 38, 38, 0.1);
      color: var(--color-error);
    }
    .floor-tab.add-table-btn {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      background: var(--color-primary);
      color: white;
    }
    .floor-tab.add-table-btn:hover {
      background: var(--color-primary-hover);
    }

    .floor-name-input {
      width: auto;
      min-width: 60px;
      max-width: 150px;
      padding: var(--space-1) var(--space-2);
      border: none;
      border-bottom: 1px solid var(--color-primary);
      border-radius: 0;
      font-size: 0.875rem;
      font-weight: 500;
      background: transparent;
      color: var(--color-text);
      outline: none;
    }
    .floor-name-input:focus {
      border-bottom-width: 2px;
    }

    /* Canvas Area */
    .canvas-wrapper {
      flex: 1;
      display: flex;
      position: relative;
      min-height: 0;
    }

    .canvas-area {
      flex: 1;
      background:
        linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px),
        var(--color-bg);
      background-size: 48px 48px, 48px 48px, auto;
      overflow: hidden;
      position: relative;
      touch-action: none; /* Prevent browser handling of touch gestures */
      cursor: grab;
    }
    .canvas-area:active {
      cursor: grabbing;
    }

    /* Zoom Controls */
    .zoom-controls {
      position: absolute;
      bottom: var(--space-4);
      right: var(--space-4);
      display: flex;
      align-items: center;
      gap: var(--space-2);
      background: var(--color-surface);
      padding: var(--space-2);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-md);
      z-index: 50;
    }

    .zoom-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border: none;
      background: transparent;
      color: var(--color-text-muted);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.15s;
    }
    .zoom-btn:hover {
      background: var(--color-bg);
      color: var(--color-text);
    }
    .zoom-btn:active {
      transform: scale(0.95);
    }

    .zoom-level {
      min-width: 50px;
      text-align: center;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-muted);
    }

    .empty-state {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      background: var(--color-bg);
      color: var(--color-text);
    }
    .empty-state h3 {
      margin: 1.5rem 0 0.5rem;
      font-size: 1.25rem;
      font-weight: 600;
    }
    .empty-state p {
      margin: 0 0 1.5rem;
      color: var(--color-text-muted);
    }

    .canvas-svg {
      width: 100%;
      height: 100%;
      display: block;
      user-select: none; /* Prevent text selection */
      -webkit-user-select: none;
    }

    .table-group {
      cursor: grab;
      /* No transition - makes dragging instant and smooth */
    }
    .table-group:active {
      cursor: grabbing;
    }
    .table-group:hover {
      filter: brightness(1.05);
    }
    .table-group.selected {
      filter: drop-shadow(0 0 8px rgba(34, 197, 94, 0.6));
    }


    /* Touch/drag state for mobile */
    .table-group.dragging {
      cursor: grabbing;
      filter: brightness(1.1) drop-shadow(0 0 12px rgba(34, 197, 94, 0.8));
    }
    .table-group.join-proximity-hint :is(ellipse, rect) {
      stroke: #c084fc !important;
      stroke-width: 3px;
    }

    /* Properties Panel - Mobile-first (Bottom Sheet) */
    .properties-panel-backdrop {
      display: none;
    }

    .properties-panel {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--color-surface);
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      border: 1px solid var(--color-border);
      border-bottom: none;
      box-shadow: 0 -4px 24px rgba(0,0,0,0.15);
      z-index: 100;
      transform: translateY(0);
      transition: transform 0.3s ease;
      max-height: 50vh;
      overflow-y: auto;
    }

    .panel-drag-handle {
      display: flex;
      justify-content: center;
      padding: var(--space-2) 0;
      cursor: pointer;
    }

    .drag-indicator {
      width: 40px;
      height: 4px;
      background: var(--color-border);
      border-radius: 2px;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 var(--space-4) var(--space-3);
    }

    .panel-title-row {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .panel-header h3 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text);
    }

    .status-badge {
      padding: var(--space-1) var(--space-2);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 600;
      background: #e8dcc8;
      color: #5a4a3a;
    }
    .status-badge.occupied {
      background: var(--color-success-light);
      color: var(--color-success);
    }

    .status-badge.reserved {
      background: #fef3c7;
      color: #b45309;
    }

    .close-btn {
      padding: var(--space-2);
      background: transparent;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      border-radius: var(--radius-sm);
      transition: all 0.15s;
    }
    .close-btn:hover {
      background: var(--color-bg);
      color: var(--color-text);
    }

    .panel-body {
      padding: 0 var(--space-4) var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .form-row {
      display: flex;
      gap: var(--space-3);
    }

    .form-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }
    .form-group label {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .form-group input {
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: 0.9375rem;
      background: var(--color-bg);
    }
    .form-group input:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px var(--color-primary-light);
    }

    .delete-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      background: rgba(220, 38, 38, 0.1);
      color: var(--color-error);
      border: none;
      border-radius: var(--radius-md);
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .delete-btn:hover { background: rgba(220, 38, 38, 0.15); }

    .panel-order-link {
      margin-top: var(--space-1);
    }
    .panel-order-btn {
      width: 100%;
      justify-content: center;
      text-decoration: none;
      box-sizing: border-box;
    }

    .panel-select {
      width: 100%;
      padding: var(--space-2);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
      background: var(--color-surface);
      color: var(--color-text);
    }

    .panel-waiter-readonly {
      width: 100%;
      padding: var(--space-2);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
      background: var(--color-bg);
      color: var(--color-text);
    }

    .waiter-inherited-panel {
      margin-top: var(--space-1);
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    /* Shape Palette - Mobile-first: horizontal strip at bottom of canvas */
    .shape-palette {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--color-surface);
      border-top: 1px solid var(--color-border);
      box-shadow: 0 -2px 12px rgba(0,0,0,0.1);
      z-index: 10;
      padding: var(--space-2) var(--space-3);
    }

    .palette-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-2);
    }
    .palette-header h3 {
      font-size: 0.8125rem;
      font-weight: 600;
      margin: 0;
      color: var(--color-text);
    }
    .palette-hint {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
    }

    .palette-shapes {
      display: flex;
      gap: var(--space-2);
      overflow-x: auto;
      padding-bottom: var(--space-1);
      -webkit-overflow-scrolling: touch;
    }
    .palette-shapes::-webkit-scrollbar { height: 3px; }
    .palette-shapes::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }

    .palette-shape {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: var(--space-2);
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: grab;
      min-width: 64px;
      background: var(--color-surface);
      transition: border-color 0.15s, background 0.15s, transform 0.1s;
      touch-action: none;
    }
    .palette-shape:hover {
      border-color: var(--color-primary);
      background: var(--color-bg);
    }
    .palette-shape:active {
      cursor: grabbing;
      transform: scale(0.95);
    }
    .palette-shape.active-placement {
      border-color: var(--color-primary);
      background: var(--color-primary-light, rgba(211, 82, 51, 0.08));
      box-shadow: 0 0 0 2px var(--color-primary-light, rgba(211, 82, 51, 0.15));
    }

    .palette-shape-name {
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--color-text);
      white-space: nowrap;
    }
    .palette-shape small {
      font-size: 0.5625rem;
      color: var(--color-text-muted);
    }

    .palette-shape-ghost {
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      border-color: var(--color-primary);
      background: var(--color-surface);
      border-radius: var(--radius-md);
    }

    .add-table-btn.active-placement {
      background: var(--color-primary);
      color: white;
      border-color: var(--color-primary);
    }

    .shape-preview {
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .preview-rect {
      width: 40px;
      height: 26px;
      background: #e8dcc8;
      border: 2px solid #d4c4a8;
      border-radius: 4px;
    }
    .preview-circle {
      width: 32px;
      height: 32px;
      background: #e8dcc8;
      border: 2px solid #d4c4a8;
      border-radius: 50%;
    }
    .preview-oval {
      width: 40px;
      height: 26px;
      background: #e8dcc8;
      border: 2px solid #d4c4a8;
      border-radius: 50%;
    }
    .preview-booth {
      width: 36px;
      height: 28px;
      background: #e8dcc8;
      border: 2px solid #d4c4a8;
      border-radius: 4px;
      position: relative;
    }
    .preview-booth::before,
    .preview-booth::after {
      content: '';
      position: absolute;
      left: 3px;
      right: 3px;
      height: 2px;
      background: #c9b896;
      border-radius: 1px;
    }
    .preview-booth::before { top: 3px; }
    .preview-booth::after { bottom: 3px; }
    .preview-bar {
      width: 44px;
      height: 18px;
      background: #5c4033;
      border: 2px solid #3d2817;
      border-radius: 4px;
      position: relative;
    }
    .preview-bar::before {
      content: '';
      position: absolute;
      top: 2px;
      left: 3px;
      right: 3px;
      height: 2px;
      background: #8b6914;
      border-radius: 1px;
    }

    /* ========== DESKTOP STYLES (min-width: 768px) ========== */
    @media (min-width: 768px) {
      .page-header {
        flex-direction: row;
      }

      .header-actions {
        flex-direction: row;
      }

      .floor-tabs {
        padding: var(--space-2);
      }

      .floor-tab {
        padding: var(--space-2) var(--space-4);
      }

      /* Properties Panel - Desktop: Right sidebar */
      .properties-panel-backdrop {
        display: none;
      }

      .properties-panel {
        position: absolute;
        top: 1rem;
        right: 1rem;
        bottom: auto;
        left: auto;
        width: 280px;
        max-height: none;
        border-radius: var(--radius-lg);
        border: 1px solid var(--color-border);
        box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        z-index: 10;
      }

      .panel-drag-handle {
        display: none;
      }

      .panel-header {
        padding: var(--space-4);
        border-bottom: 1px solid var(--color-border);
      }

      .panel-body {
        padding: var(--space-4);
        gap: var(--space-3);
      }

      .form-row {
        flex-direction: column;
        gap: var(--space-3);
      }

      .delete-btn {
        padding: var(--space-3);
        font-size: 0.875rem;
      }

      /* Shape Palette - Desktop: vertical sidebar */
      .shape-palette {
        position: absolute;
        top: 1rem;
        right: 1rem;
        bottom: auto;
        left: auto;
        width: 180px;
        max-height: calc(100% - 2rem);
        border-radius: var(--radius-lg);
        border: 1px solid var(--color-border);
        border-top: none;
        box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        padding: var(--space-3);
        overflow-y: auto;
      }

      .palette-shapes {
        flex-direction: column;
        overflow-x: visible;
      }

      .palette-shape {
        flex-direction: row;
        gap: var(--space-2);
        min-width: unset;
        padding: var(--space-2) var(--space-3);
      }

      .shape-preview {
        width: 36px;
        height: 36px;
      }

      .preview-rect { width: 32px; height: 20px; }
      .preview-circle { width: 28px; height: 28px; }
      .preview-oval { width: 32px; height: 20px; }
      .preview-booth { width: 30px; height: 24px; }
      .preview-booth::before, .preview-booth::after { height: 2px; left: 3px; right: 3px; }
      .preview-booth::before { top: 3px; }
      .preview-booth::after { bottom: 3px; }
      .preview-bar { width: 36px; height: 14px; }
      .preview-bar::before { top: 2px; left: 3px; right: 3px; }
    }
  `]
})
export class TablesCanvasComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private translate = inject(TranslateService);
  private permissions = inject(PermissionService);
  private router = inject(Router);
  private tablesArea = inject(TablesAreaPreferenceService);

  @ViewChild('canvasArea') canvasAreaRef!: ElementRef;
  @ViewChild('canvasSvg') canvasSvgRef!: ElementRef<SVGSVGElement>;
  @ViewChild('shapePalette') shapePaletteRef?: ElementRef<HTMLElement>;

  error = signal('');
  floors = signal<Floor[]>([]);
  tables = signal<CanvasTable[]>([]);
  selectedFloorId = signal<number | null>(null);
  selectedTable = signal<CanvasTable | null>(null);
  /** Ctrl/Cmd+click table ids for Join (same floor, not already grouped). */
  joinSelectionIds = signal<number[]>([]);
  editingFloorId = signal<number | null>(null);
  editingFloorName = '';
  hasUnsavedChanges = signal(false);

  selectedTableName = '';
  selectedTableSeats = 4;
  waiters = signal<User[]>([]);

  // Shape palette drag state
  dragPreview = signal<{ shape: TableShape; x: number; y: number } | null>(null);
  private draggedShapeId: string | null = null;
  private touchDragClone: HTMLElement | null = null;
  pendingPlacementShape: TableShape | null = null;

  // Confirmation Modal State
  confirmationModal = signal<{
    show: boolean;
    title: string;
    message: string;
    messageParams?: Record<string, string>;
    confirmText: string;
    cancelText: string;
    confirmBtnClass: string;
    action: 'deleteFloor' | 'deleteTable' | 'joinTables' | null;
    joinPairIds?: number[];
  }>({
    show: false,
    title: '',
    message: '',
    messageParams: undefined,
    confirmText: 'COMMON.YES',
    cancelText: 'COMMON.NO',
    confirmBtnClass: 'btn-primary',
    action: null,
    joinPairIds: undefined,
  });

  reassignTableModal = signal<CanvasTable | null>(null);
  reassignTargetTableId = signal<number | null>(null);
  otherTablesForReassign = computed(() => {
    const table = this.reassignTableModal();
    if (!table?.id) return [];
    return this.tables().filter(t => t.id !== table.id);
  });

  canvasWidth = 1200;
  canvasHeight = 800;

  // Mobile UI state
  propertiesPanelExpanded = false;
  isDragging = false;
  draggedTable: CanvasTable | null = null;
  private dragOffset = { x: 0, y: 0 };

  // Zoom and pan state
  zoomLevel = 1;
  private panOffset = { x: 0, y: 0 };
  private minZoom = 0.5;
  private maxZoom = 2;
  private lastPinchDistance = 0;
  private isPanning = false;
  private lastPanPosition = { x: 0, y: 0 };
  Math = Math; // Expose Math for template

  /** Target table id while dragging — another table whose footprint overlaps the dragged table in canvas space (join gesture). */
  joinProximityTargetId = signal<number | null>(null);
  /** Require overlap with the same candidate for this long before release opens the join dialog (reduces accidental joins). */
  private readonly joinProximityMinHoldMs = 160;
  private joinProximityCandidateId: number | null = null;
  private joinProximityCandidateSince: number | null = null;

  tableShapes: TableShape[] = [
    { id: 'square4', name: 'Square 4', shape: 'rectangle', width: 80, height: 80, seats: 4 },
    { id: 'rect4', name: 'Rectangle 4', shape: 'rectangle', width: 100, height: 70, seats: 4 },
    { id: 'rect6', name: 'Rectangle 6', shape: 'rectangle', width: 140, height: 70, seats: 6 },
    { id: 'circle4', name: 'Round 4', shape: 'circle', width: 80, height: 80, seats: 4 },
    { id: 'circle6', name: 'Round 6', shape: 'circle', width: 100, height: 100, seats: 6 },
    { id: 'oval6', name: 'Oval 6', shape: 'oval', width: 120, height: 70, seats: 6 },
    { id: 'booth4', name: 'Booth 4', shape: 'booth', width: 100, height: 80, seats: 4 },
    { id: 'bar4', name: 'Bar 4', shape: 'bar', width: 160, height: 50, seats: 4 }
  ];

  ngOnInit() {
    this.tablesArea.setArea('canvas');
    this.loadData();
    this.api.waitForInitialAuthCheck().subscribe(() => {
      if (this.canManageTableAssignments()) {
        this.api.getWaiters().subscribe({
          next: w => this.waiters.set(w),
          error: () => {}
        });
      }
    });
    // Mouse event listeners
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    // Touch event listeners for mobile
    document.addEventListener('touchmove', this.onTouchMove, { passive: false });
    document.addEventListener('touchend', this.onTouchEnd);
    document.addEventListener('touchcancel', this.onTouchEnd);
  }

  ngOnDestroy() {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('touchmove', this.onTouchMove);
    document.removeEventListener('touchend', this.onTouchEnd);
    document.removeEventListener('touchcancel', this.onTouchEnd);
  }

  loadData() {
    this.error.set('');
    this.api.getFloors().subscribe({
      next: floors => {
        this.floors.set(floors);
        if (floors.length > 0 && !this.selectedFloorId()) {
          this.selectedFloorId.set(floors[0].id!);
        }
      },
      error: err => {
        this.error.set(err.error?.detail || 'Failed to load floors');
        this.floors.set([]);
      }
    });

    this.api.getTablesWithStatus().subscribe({
      next: tables => this.tables.set(tables),
      error: err => {
        this.error.set(err.error?.detail || 'Failed to load tables');
        this.tables.set([]);
      }
    });
  }

  tablesOnCurrentFloor() {
    const floorId = this.selectedFloorId();
    return this.tables().filter(t => t.floor_id === floorId || (!t.floor_id && !floorId));
  }

  selectFloor(id: number) {
    this.selectedFloorId.set(id);
    this.selectedTable.set(null);
    this.joinSelectionIds.set([]);
  }

  /** Focus the add-table shape palette (used by header Add Table button). */
  focusAddTablePalette() {
    this.selectedTable.set(null);
    this.joinSelectionIds.set([]);
    if (this.floors().length > 0 && !this.selectedFloorId()) {
      this.selectedFloorId.set(this.floors()[0].id!);
    }
    setTimeout(() => {
      this.shapePaletteRef?.nativeElement?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }

  addFloor() {
    this.error.set('');
    const floorNumber = this.floors().length + 1;
    const name = this.translate.instant('TABLES.DEFAULT_FLOOR_NAME', { number: floorNumber });
    this.api.createFloor(name).subscribe({
      next: floor => {
        this.floors.update(f => [...f, floor]);
        this.selectedFloorId.set(floor.id!);
      },
      error: err => this.error.set(err.error?.detail || 'Failed to create floor')
    });
  }

  editFloor() {
    const floor = this.floors().find(f => f.id === this.selectedFloorId());
    if (floor) {
      this.editingFloorId.set(floor.id!);
      this.editingFloorName = floor.name;
    }
  }

  saveFloorName(floor: Floor) {
    if (this.editingFloorName && this.editingFloorName !== floor.name) {
      this.error.set('');
      this.api.updateFloor(floor.id!, { name: this.editingFloorName }).subscribe({
        next: updated => {
          this.floors.update(floors => floors.map(f => f.id === updated.id ? updated : f));
        },
        error: err => this.error.set(err.error?.detail || 'Failed to rename floor')
      });
    }
    this.editingFloorId.set(null);
  }

  cancelFloorEdit() {
    this.editingFloorId.set(null);
  }

  deleteCurrentFloor() {
    const id = this.selectedFloorId();
    if (!id) return;

    this.confirmationModal.set({
      show: true,
      title: 'TABLES.DELETE_FLOOR',
      message: 'TABLES.DELETE_FLOOR_CONFIRM',
      confirmText: 'COMMON.DELETE',
      cancelText: 'COMMON.CANCEL',
      confirmBtnClass: 'btn-danger',
      action: 'deleteFloor'
    });
  }

  private confirmDeleteFloor() {
    const id = this.selectedFloorId();
    if (!id) return;

    this.error.set('');
    this.api.deleteFloor(id).subscribe({
      next: () => {
        this.floors.update(floors => floors.filter(f => f.id !== id));
        const remaining = this.floors();
        this.selectedFloorId.set(remaining.length > 0 ? remaining[0].id! : null);
      },
      error: err => this.error.set(err.error?.detail || 'Failed to delete floor')
    });
  }

  /** Matches legend swatches and table fills (dark tablet floor). */
  readonly floorLegendItems: { key: TableOperationalStatus; swatch: string; labelKey: string }[] = [
    { key: 'available', swatch: '#4b5563', labelKey: 'TABLES.OP_AVAILABLE' },
    { key: 'reserved', swatch: '#d97706', labelKey: 'TABLES.OP_RESERVED' },
    { key: 'occupied', swatch: '#059669', labelKey: 'TABLES.OP_OCCUPIED' },
    { key: 'open_order', swatch: '#2563eb', labelKey: 'TABLES.OP_OPEN_ORDER' },
    { key: 'bill_issued', swatch: '#7c3aed', labelKey: 'TABLES.OP_BILL_ISSUED' },
  ];

  operationalKey(table: CanvasTable): TableOperationalStatus {
    if (table.operational_status) return table.operational_status;
    if (table.status === 'reserved') return 'reserved';
    if (table.status === 'occupied') return 'occupied';
    return 'available';
  }

  operationalStatusLabelKey(table: CanvasTable): string {
    const m: Record<TableOperationalStatus, string> = {
      available: 'TABLES.OP_AVAILABLE',
      reserved: 'TABLES.OP_RESERVED',
      occupied: 'TABLES.OP_OCCUPIED',
      open_order: 'TABLES.OP_OPEN_ORDER',
      bill_issued: 'TABLES.OP_BILL_ISSUED',
    };
    return m[this.operationalKey(table)];
  }

  private opColors(key: TableOperationalStatus): { fill: string; stroke: string } {
    const map: Record<TableOperationalStatus, { fill: string; stroke: string }> = {
      available: { fill: '#374151', stroke: '#9ca3af' },
      reserved: { fill: '#92400e', stroke: '#fbbf24' },
      occupied: { fill: '#065f46', stroke: '#34d399' },
      open_order: { fill: '#1e40af', stroke: '#93c5fd' },
      bill_issued: { fill: '#5b21b6', stroke: '#c4b5fd' },
    };
    return map[key];
  }

  tableSurfaceFill(table: CanvasTable): string {
    return this.opColors(this.operationalKey(table)).fill;
  }

  tableSurfaceStroke(table: CanvasTable): string {
    if (table.table_group_id) {
      return '#a855f7';
    }
    return this.opColors(this.operationalKey(table)).stroke;
  }

  tableCaptionFill(table: CanvasTable): string {
    const k = this.operationalKey(table);
    return k === 'reserved' ? '#fef3c7' : '#f9fafb';
  }

  /** Short table name for the canvas label (avoid multi-line overflow on small shapes). */
  tableCaptionName(table: CanvasTable): string {
    const raw = (table.name || '').trim();
    if (raw.length <= 14) return raw || '?';
    return raw.slice(0, 12) + '…';
  }

  tableSeatLabel(table: CanvasTable): string {
    const n = table.group_seat_total ?? table.seat_count ?? 0;
    return String(n);
  }

  isTableJoinPicked(table: CanvasTable): boolean {
    const id = table.id;
    if (id == null) return false;
    return this.joinSelectionIds().includes(id);
  }

  isTableVisualSelected(table: CanvasTable): boolean {
    if (this.selectedTable()?.id === table.id) return true;
    return this.isTableJoinPicked(table);
  }

  groupLineForSelected(): string {
    const st = this.selectedTable();
    if (!st?.group_member_ids?.length) return '';
    return st.group_member_ids
      .map(id => this.tables().find(t => t.id === id)?.name || '?')
      .join(' + ');
  }

  canJoinSelection(): boolean {
    const ids = this.joinSelectionIds();
    if (ids.length < 2) return false;
    const floorId = this.selectedFloorId();
    const picked = ids.map(i => this.tables().find(t => t.id === i)).filter((t): t is CanvasTable => !!t);
    if (picked.length !== ids.length) return false;
    if (picked.some(t => t.table_group_id)) return false;
    const floors = new Set(picked.map(t => t.floor_id));
    if (floors.size !== 1) return false;
    if (floors.values().next().value !== floorId) return false;
    return true;
  }

  canUnjoinFromSelection(): boolean {
    return !!this.selectedTable()?.table_group_id;
  }

  joinSelectedTables(): void {
    const ids = [...this.joinSelectionIds()].sort((a, b) => a - b);
    if (ids.length < 2) return;
    this.error.set('');
    this.api.createTableGroup(ids).subscribe({
      next: () => {
        this.joinSelectionIds.set([]);
        this.loadData();
      },
      error: (err: { error?: { detail?: string } }) =>
        this.error.set(err.error?.detail || 'Join failed'),
    });
  }

  unjoinSelectedGroup(): void {
    const gid = this.selectedTable()?.table_group_id;
    if (gid == null) return;
    this.error.set('');
    this.api.deleteTableGroup(gid).subscribe({
      next: () => {
        this.joinSelectionIds.set([]);
        this.loadData();
      },
      error: (err: { error?: { detail?: string } }) =>
        this.error.set(err.error?.detail || 'Unjoin failed'),
    });
  }

  private resetJoinProximityGesture(): void {
    this.joinProximityCandidateId = null;
    this.joinProximityCandidateSince = null;
    this.joinProximityTargetId.set(null);
  }

  /** Axis-aligned bounds of a table in floor canvas (SVG) coordinates; center is x_position/y_position. */
  private tableCanvasBounds(t: CanvasTable): { left: number; right: number; top: number; bottom: number; cx: number; cy: number } {
    const w = t.width || 100;
    const h = t.height || 70;
    const cx = t.x_position || 0;
    const cy = t.y_position || 0;
    return {
      left: cx - w / 2,
      right: cx + w / 2,
      top: cy - h / 2,
      bottom: cy + h / 2,
      cx,
      cy,
    };
  }

  private static readonly joinOverlapEps = 1e-6;

  private isRectLikeTableShape(shape: string | undefined): boolean {
    if (!shape) return true;
    return shape === 'rectangle' || shape === 'booth' || shape === 'bar';
  }

  private isEllipseTableShape(shape: string | undefined): boolean {
    return shape === 'circle' || shape === 'oval';
  }

  /**
   * Join-on-drop: require real overlap in floor SVG space (not proximity / inflated boxes).
   * - Rectangular footprints (rectangle, booth, bar): strict AABB intersection with positive area
   *   (edge-only contact does not count — intersection width and height must exceed eps).
   * - Two ellipses (circle, oval as drawn): overlap if (dx/(rx1+rx2))² + (dy/(ry1+ry2))² < 1
   *   using the same half-axes as the SVG ellipses and tableCanvasBounds.
   * - Mixed rect + ellipse: strict AABB overlap between their axis-aligned bounds (approximation).
   * Zoom/pan only affect the view transform; positions stay in these canvas units.
   */
  private tableShapesOverlapForJoin(a: CanvasTable, b: CanvasTable): boolean {
    const ba = this.tableCanvasBounds(a);
    const bb = this.tableCanvasBounds(b);
    const sa = a.shape;
    const sb = b.shape;
    if (this.isRectLikeTableShape(sa) && this.isRectLikeTableShape(sb)) {
      return this.aabbStrictPositiveOverlap(ba, bb);
    }
    if (this.isEllipseTableShape(sa) && this.isEllipseTableShape(sb)) {
      return this.axisAlignedEllipsesOverlapPositive(ba, bb, a, b);
    }
    return this.aabbStrictPositiveOverlap(ba, bb);
  }

  /** True iff axis-aligned rectangles intersect with interior overlap (not edge-only). */
  private aabbStrictPositiveOverlap(
    a: { left: number; right: number; top: number; bottom: number },
    b: { left: number; right: number; top: number; bottom: number }
  ): boolean {
    const iw = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const ih = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return iw > TablesCanvasComponent.joinOverlapEps && ih > TablesCanvasComponent.joinOverlapEps;
  }

  private axisAlignedEllipsesOverlapPositive(
    ba: { cx: number; cy: number },
    bb: { cx: number; cy: number },
    ta: CanvasTable,
    tb: CanvasTable
  ): boolean {
    const wa = ta.width || 100;
    const ha = ta.height || 70;
    const wb = tb.width || 100;
    const hb = tb.height || 70;
    const rxSum = wa / 2 + wb / 2;
    const rySum = ha / 2 + hb / 2;
    if (rxSum <= 0 || rySum <= 0) return false;
    const dx = ba.cx - bb.cx;
    const dy = ba.cy - bb.cy;
    const metric = (dx / rxSum) * (dx / rxSum) + (dy / rySum) * (dy / rySum);
    return metric < 1 - TablesCanvasComponent.joinOverlapEps;
  }

  /**
   * While dragging `dragged`, find the closest other table on the same floor whose footprint
   * overlaps the dragged table (canvas coordinates only).
   */
  private findJoinProximityTarget(dragged: CanvasTable): CanvasTable | null {
    if (dragged.id == null || dragged.table_group_id) return null;
    const da = this.tableCanvasBounds(dragged);
    let best: CanvasTable | null = null;
    let bestDist = Infinity;
    for (const t of this.tablesOnCurrentFloor()) {
      if (t.id == null || t.id === dragged.id || t.table_group_id) continue;
      if (!this.tableShapesOverlapForJoin(dragged, t)) continue;
      const db = this.tableCanvasBounds(t);
      const dist = Math.hypot(da.cx - db.cx, da.cy - db.cy);
      if (dist < bestDist) {
        bestDist = dist;
        best = t;
      }
    }
    return best;
  }

  private canJoinPair(a: CanvasTable, b: CanvasTable): boolean {
    if (a.id == null || b.id == null || a.id === b.id) return false;
    if (a.table_group_id || b.table_group_id) return false;
    const floorId = this.selectedFloorId();
    if ((a.floor_id ?? null) !== (floorId ?? null) || (b.floor_id ?? null) !== (floorId ?? null)) return false;
    return true;
  }

  private updateJoinProximityDuringDrag(draggedId: number): void {
    const fresh = this.tables().find(t => t.id === draggedId);
    if (!fresh) return;
    const candidate = this.findJoinProximityTarget(fresh);
    const cid = candidate?.id ?? null;
    if (cid !== this.joinProximityCandidateId) {
      this.joinProximityCandidateId = cid;
      this.joinProximityCandidateSince = cid ? Date.now() : null;
    }
    this.joinProximityTargetId.set(cid);
  }

  /** After drag release: if overlap + hold time satisfied, show join confirmation (no API until confirm). */
  private finishTableDragInteraction(): void {
    const dragged = this.draggedTable;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    this.isDragging = false;
    this.draggedTable = null;

    if (!dragged?.id) {
      this.resetJoinProximityGesture();
      return;
    }

    const fresh = this.tables().find(t => t.id === dragged.id);
    const candidate = fresh ? this.findJoinProximityTarget(fresh) : null;
    const heldLongEnough =
      !!candidate &&
      candidate.id === this.joinProximityCandidateId &&
      this.joinProximityCandidateSince != null &&
      Date.now() - this.joinProximityCandidateSince >= this.joinProximityMinHoldMs;

    this.resetJoinProximityGesture();

    if (fresh && candidate && heldLongEnough && this.canJoinPair(fresh, candidate)) {
      this.openJoinTablesModal(fresh, candidate);
    }
  }

  private openJoinTablesModal(a: CanvasTable, b: CanvasTable): void {
    if (a.id == null || b.id == null) return;
    this.confirmationModal.set({
      show: true,
      title: 'TABLES.JOIN_TABLES_CONFIRM_TITLE',
      message: 'TABLES.JOIN_TABLES_CONFIRM_MESSAGE',
      messageParams: { tableA: a.name || '?', tableB: b.name || '?' },
      confirmText: 'TABLES.JOIN_TABLES',
      cancelText: 'COMMON.CANCEL',
      confirmBtnClass: 'btn-primary',
      action: 'joinTables',
      joinPairIds: [a.id, b.id].sort((x, y) => x - y),
    });
  }

  // Waiter assignment helpers
  private waiterColors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];

  /** Owner/admin: can change assignment via user list API (requires user:read). */
  canManageTableAssignments(): boolean {
    return this.permissions.hasPermission(this.api.getCurrentUser(), 'table:write');
  }

  /** Matches `/staff/orders` route guard — show floor-plan → orders shortcuts only when allowed. */
  canOpenStaffOrders(): boolean {
    const role = this.api.getCurrentUser()?.role;
    return role != null && STAFF_ORDERS_ROLES.has(role);
  }

  getWaiterInitials(table: CanvasTable): string | null {
    const name = table.effective_waiter_name || table.assigned_waiter_name;
    if (!name) return null;
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  getWaiterColor(table: CanvasTable): string {
    const id = table.effective_waiter_id || table.assigned_waiter_id || 0;
    return this.waiterColors[id % this.waiterColors.length];
  }

  onCanvasWaiterAssign(event: Event) {
    const select = event.target as HTMLSelectElement;
    const waiterId = select.value ? Number(select.value) : null;
    const table = this.selectedTable();
    if (!table?.id) return;
    this.api.assignWaiterToTable(table.id, waiterId).subscribe({
      next: (res: any) => {
        this.tables.update(tables => tables.map(t =>
          t.id === table.id
            ? { ...t, assigned_waiter_id: res.assigned_waiter_id, assigned_waiter_name: res.assigned_waiter_name, effective_waiter_id: res.assigned_waiter_id, effective_waiter_name: res.assigned_waiter_name }
            : t
        ));
        this.selectedTable.update(st => st ? { ...st, assigned_waiter_id: res.assigned_waiter_id, assigned_waiter_name: res.assigned_waiter_name } : st);
      },
      error: (err: any) => this.error.set(err.error?.detail || 'Failed to assign waiter')
    });
  }

  // Zoom and pan methods
  getViewBox(): string {
    const viewWidth = this.canvasWidth / this.zoomLevel;
    const viewHeight = this.canvasHeight / this.zoomLevel;
    // Center the viewport
    const x = (this.canvasWidth - viewWidth) / 2 + this.panOffset.x;
    const y = (this.canvasHeight - viewHeight) / 2 + this.panOffset.y;
    return `${x} ${y} ${viewWidth} ${viewHeight}`;
  }

  zoomIn() {
    this.setZoom(this.zoomLevel * 1.1);
  }

  zoomOut() {
    this.setZoom(this.zoomLevel / 1.1);
  }

  resetZoom() {
    this.zoomLevel = 1;
    this.panOffset = { x: 0, y: 0 };
  }

  private setZoom(level: number) {
    this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, level));
  }

  onCanvasWheel(event: WheelEvent) {
    // Prevent page zoom, only zoom canvas
    event.preventDefault();

    const zoomFactor = event.deltaY > 0 ? 0.95 : 1.05;
    this.setZoom(this.zoomLevel * zoomFactor);
  }

  // Pinch-to-zoom for touch devices
  onCanvasTouchStart(event: TouchEvent) {
    if (event.touches.length === 2) {
      // Two-finger pinch start
      event.preventDefault();
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      this.lastPinchDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
    }
  }

  private onPinchMove = (event: TouchEvent) => {
    if (event.touches.length !== 2 || this.lastPinchDistance === 0) return;

    event.preventDefault();
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];
    const currentDistance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );

    const scale = currentDistance / this.lastPinchDistance;
    this.setZoom(this.zoomLevel * scale);
    this.lastPinchDistance = currentDistance;
  };

  // Shape palette drag handlers
  onShapeDragStart(event: DragEvent, shape: TableShape) {
    this.draggedShapeId = shape.id;
    event.dataTransfer!.effectAllowed = 'copy';
    event.dataTransfer!.setData('text/plain', shape.id);
    const preview = (event.target as HTMLElement).querySelector('.shape-preview') as HTMLElement;
    if (preview && event.dataTransfer) {
      event.dataTransfer.setDragImage(preview, preview.offsetWidth / 2, preview.offsetHeight / 2);
    }
  }

  onShapeDragEnd() {
    this.draggedShapeId = null;
    this.dragPreview.set(null);
  }

  onCanvasDragOver(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
    if (this.draggedShapeId) {
      const shape = this.tableShapes.find(s => s.id === this.draggedShapeId);
      if (shape) {
        const svgPoint = this.getSvgPoint(event.clientX, event.clientY);
        if (svgPoint) {
          this.dragPreview.set({ shape, x: svgPoint.x, y: svgPoint.y });
        }
      }
    }
  }

  onCanvasDrop(event: DragEvent) {
    event.preventDefault();
    this.dragPreview.set(null);
    const shapeId = event.dataTransfer?.getData('text/plain');
    if (!shapeId || !this.selectedFloorId()) return;
    const shape = this.tableShapes.find(s => s.id === shapeId);
    if (!shape) return;
    const svgPoint = this.getSvgPoint(event.clientX, event.clientY);
    if (!svgPoint) return;
    const x = Math.max(50, Math.min(this.canvasWidth - 50, svgPoint.x));
    const y = Math.max(50, Math.min(this.canvasHeight - 50, svgPoint.y));
    this.addTableAtPosition(shape, x, y);
    this.draggedShapeId = null;
  }

  onShapeTap(shape: TableShape) {
    this.pendingPlacementShape = this.pendingPlacementShape?.id === shape.id ? null : shape;
  }

  onShapeTouchStart(event: TouchEvent, shape: TableShape) {
    if (event.touches.length !== 1) return;
    event.preventDefault();
    const touch = event.touches[0];
    const target = event.currentTarget as HTMLElement;
    const clone = target.cloneNode(true) as HTMLElement;
    clone.classList.add('palette-shape-ghost');
    clone.style.position = 'fixed';
    clone.style.left = `${touch.clientX - 30}px`;
    clone.style.top = `${touch.clientY - 30}px`;
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '9999';
    clone.style.opacity = '0.85';
    document.body.appendChild(clone);
    this.touchDragClone = clone;
    this.draggedShapeId = shape.id;

    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      clone.style.left = `${t.clientX - 30}px`;
      clone.style.top = `${t.clientY - 30}px`;
      const svgPoint = this.getSvgPoint(t.clientX, t.clientY);
      if (svgPoint) {
        this.dragPreview.set({ shape, x: svgPoint.x, y: svgPoint.y });
      }
    };

    const onEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      clone.remove();
      this.touchDragClone = null;
      this.dragPreview.set(null);
      this.draggedShapeId = null;
      const canvasEl = this.canvasAreaRef?.nativeElement as HTMLElement;
      if (canvasEl) {
        const rect = canvasEl.getBoundingClientRect();
        if (t.clientX >= rect.left && t.clientX <= rect.right &&
            t.clientY >= rect.top && t.clientY <= rect.bottom) {
          const svgPoint = this.getSvgPoint(t.clientX, t.clientY);
          if (svgPoint) {
            const x = Math.max(50, Math.min(this.canvasWidth - 50, svgPoint.x));
            const y = Math.max(50, Math.min(this.canvasHeight - 50, svgPoint.y));
            this.addTableAtPosition(shape, x, y);
          }
        }
      }
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onEnd);
    };

    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', onEnd);
  }

  private addTableAtPosition(shape: TableShape, x: number, y: number) {
    this.error.set('');
    if (!this.selectedFloorId() || this.floors().length === 0) return;
    const tableNumber = this.tables().length + 1;
    const tableName = this.translate.instant('TABLES.DEFAULT_TABLE_NAME', { number: tableNumber });
    this.api.createTable(tableName, this.selectedFloorId()!).subscribe({
      next: table => {
        this.api.updateTable(table.id!, {
          x_position: x,
          y_position: y,
          shape: shape.shape,
          width: shape.width,
          height: shape.height,
          seat_count: shape.seats
        }).subscribe({
          next: updated => {
            const canvasTable: CanvasTable = { ...updated, status: 'available' };
            this.tables.update(t => [...t, canvasTable]);
          },
          error: err => this.error.set(err.error?.detail || 'Failed to set table layout')
        });
      },
      error: err => this.error.set(err.error?.detail || 'Failed to create table')
    });
  }

  /** Double-click: open staff orders scoped to this table (same as panel link). */
  onTableDoubleClick(event: MouseEvent, table: CanvasTable) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    this.draggedTable = null;
    this.resetJoinProximityGesture();
    this.isPanning = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    if (!this.canOpenStaffOrders() || table.id == null) return;
    void this.router.navigate(['/staff/orders'], {
      queryParams: { focusTableId: table.id, table: table.id },
    });
  }

  onTableMouseDown(event: MouseEvent, table: CanvasTable) {
    event.preventDefault(); // Prevent text selection
    event.stopPropagation();

    if (event.ctrlKey || event.metaKey) {
      const id = table.id;
      if (id == null) return;
      this.joinSelectionIds.update(ids => {
        const set = new Set(ids);
        if (set.has(id)) set.delete(id);
        else set.add(id);
        return Array.from(set).sort((a, b) => a - b);
      });
      this.selectedTable.set(table);
      this.selectedTableName = table.name;
      this.selectedTableSeats = table.seat_count || 4;
      this.isDragging = false;
      this.draggedTable = null;
      return;
    }

    this.joinSelectionIds.set([]);
    this.selectedTable.set(table);
    this.selectedTableName = table.name;
    this.selectedTableSeats = table.seat_count || 4;

    this.isDragging = true;
    this.draggedTable = table;
    this.resetJoinProximityGesture();
    document.body.style.userSelect = 'none'; // Prevent text selection globally
    document.body.style.cursor = 'grabbing';

    // Get SVG coordinates using native transformation
    const svgPoint = this.getSvgPoint(event.clientX, event.clientY);
    if (svgPoint) {
      this.dragOffset = {
        x: svgPoint.x - (table.x_position || 0),
        y: svgPoint.y - (table.y_position || 0)
      };
    }
  }

  // Touch start handler for mobile
  onTableTouchStart(event: TouchEvent, table: CanvasTable) {
    if (event.touches.length !== 1) return; // Only single touch

    const touch = event.touches[0];
    event.preventDefault(); // Prevent scrolling while dragging

    this.selectedTable.set(table);
    this.selectedTableName = table.name;
    this.selectedTableSeats = table.seat_count || 4;
    this.propertiesPanelExpanded = false; // Start collapsed on mobile

    this.isDragging = true;
    this.draggedTable = table;
    this.resetJoinProximityGesture();

    const svgPoint = this.getSvgPoint(touch.clientX, touch.clientY);
    if (svgPoint) {
      this.dragOffset = {
        x: svgPoint.x - (table.x_position || 0),
        y: svgPoint.y - (table.y_position || 0)
      };
    }
  }

  // Convert screen coordinates to SVG viewBox coordinates
  private getSvgPoint(clientX: number, clientY: number): { x: number; y: number } | null {
    if (!this.canvasSvgRef?.nativeElement) return null;

    const svg = this.canvasSvgRef.nativeElement;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;

    // Get the inverse of the screen CTM to convert screen coords to SVG coords
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;

    const svgPoint = point.matrixTransform(ctm.inverse());
    return { x: svgPoint.x, y: svgPoint.y };
  }

  // Canvas mousedown - start panning if not clicking on a table
  onCanvasMouseDown(event: MouseEvent) {
    // Only pan with left mouse button and when not clicking on a table
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('.table-group')) return;

    // Start panning
    this.isPanning = true;
    this.lastPanPosition = { x: event.clientX, y: event.clientY };
    document.body.style.cursor = 'grabbing';
    event.preventDefault();
  }

  onMouseMove = (event: MouseEvent) => {
    // Handle canvas panning
    if (this.isPanning) {
      const dx = (event.clientX - this.lastPanPosition.x) / this.zoomLevel;
      const dy = (event.clientY - this.lastPanPosition.y) / this.zoomLevel;

      this.panOffset.x -= dx;
      this.panOffset.y -= dy;

      this.lastPanPosition = { x: event.clientX, y: event.clientY };
      return;
    }

    // Handle table dragging
    if (!this.isDragging || !this.draggedTable) return;

    const svgPoint = this.getSvgPoint(event.clientX, event.clientY);
    if (!svgPoint) return;

    const x = svgPoint.x - this.dragOffset.x;
    const y = svgPoint.y - this.dragOffset.y;

    // Clamp to canvas bounds
    const clampedX = Math.max(50, Math.min(this.canvasWidth - 50, x));
    const clampedY = Math.max(50, Math.min(this.canvasHeight - 50, y));

    this.tables.update(tables =>
      tables.map(t =>
        t.id === this.draggedTable?.id
          ? { ...t, x_position: clampedX, y_position: clampedY }
          : t
      )
    );

    this.hasUnsavedChanges.set(true);
    if (this.draggedTable?.id != null) {
      this.updateJoinProximityDuringDrag(this.draggedTable.id);
    }
  };

  onMouseUp = () => {
    // Stop panning
    if (this.isPanning) {
      this.isPanning = false;
      document.body.style.cursor = '';
      return;
    }

    if (this.isDragging && this.draggedTable) {
      this.finishTableDragInteraction();
      return;
    }

    this.isDragging = false;
    this.draggedTable = null;
  };

  // Touch move handler for mobile dragging and pinch-to-zoom
  onTouchMove = (event: TouchEvent) => {
    // Handle pinch-to-zoom with 2 fingers
    if (event.touches.length === 2 && this.lastPinchDistance > 0) {
      event.preventDefault();
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      const scale = currentDistance / this.lastPinchDistance;
      this.setZoom(this.zoomLevel * scale);
      this.lastPinchDistance = currentDistance;
      return;
    }

    // Handle single-finger table drag
    if (!this.isDragging || !this.draggedTable) return;
    if (event.touches.length !== 1) return;

    event.preventDefault(); // Prevent scrolling while dragging

    const touch = event.touches[0];
    const svgPoint = this.getSvgPoint(touch.clientX, touch.clientY);
    if (!svgPoint) return;

    const x = svgPoint.x - this.dragOffset.x;
    const y = svgPoint.y - this.dragOffset.y;

    // Clamp to canvas bounds
    const clampedX = Math.max(50, Math.min(this.canvasWidth - 50, x));
    const clampedY = Math.max(50, Math.min(this.canvasHeight - 50, y));

    this.tables.update(tables =>
      tables.map(t =>
        t.id === this.draggedTable?.id
          ? { ...t, x_position: clampedX, y_position: clampedY }
          : t
      )
    );

    this.hasUnsavedChanges.set(true);
    if (this.draggedTable?.id != null) {
      this.updateJoinProximityDuringDrag(this.draggedTable.id);
    }
  };

  // Touch end handler for mobile
  onTouchEnd = () => {
    if (this.isDragging && this.draggedTable) {
      this.finishTableDragInteraction();
    } else {
      this.isDragging = false;
      this.draggedTable = null;
      this.resetJoinProximityGesture();
    }
    this.lastPinchDistance = 0; // Reset pinch tracking
  };

  onCanvasClick(event: MouseEvent) {
    if ((event.target as HTMLElement).closest('.table-group')) return;
    // Tap-to-place: if a shape is pending, place it at click position
    if (this.pendingPlacementShape) {
      const svgPoint = this.getSvgPoint(event.clientX, event.clientY);
      if (svgPoint) {
        const x = Math.max(50, Math.min(this.canvasWidth - 50, svgPoint.x));
        const y = Math.max(50, Math.min(this.canvasHeight - 50, svgPoint.y));
        this.addTableAtPosition(this.pendingPlacementShape, x, y);
      }
      this.pendingPlacementShape = null;
      return;
    }
    this.selectedTable.set(null);
  }

  updateSelectedTable() {
    const table = this.selectedTable();
    if (!table?.id) return;

    this.error.set('');
    this.api.updateTable(table.id, {
      name: this.selectedTableName,
      seat_count: this.selectedTableSeats
    }).subscribe({
      next: updated => {
        // IMPORTANT:
        // Do not overwrite local layout fields (x/y/shape/etc) with the server response.
        // Otherwise, if the user has unsaved drag changes, editing properties would "jump"
        // back to the DB-stored position (often the initial center).
        this.tables.update(tables =>
          tables.map(t => {
            if (t.id !== updated.id) return t;
            return {
              ...t,
              name: updated.name,
              seat_count: updated.seat_count
            };
          })
        );
        this.selectedTable.update(t => {
          if (!t) return null;
          return {
            ...t,
            name: updated.name,
            seat_count: updated.seat_count
          };
        });
      },
      error: err => this.error.set(err.error?.detail || 'Failed to update table')
    });
  }

  deleteSelectedTable() {
    const table = this.selectedTable();
    if (!table?.id) return;

    this.confirmationModal.set({
      show: true,
      title: 'TABLES.DELETE_TABLE',
      message: 'TABLES.DELETE_TABLE_CONFIRM',
      confirmText: 'COMMON.DELETE',
      cancelText: 'COMMON.CANCEL',
      confirmBtnClass: 'btn-danger',
      action: 'deleteTable'
    });
  }

  private confirmDeleteTable() {
    const table = this.selectedTable();
    if (!table?.id) return;

    this.error.set('');
    this.api.deleteTable(table.id).subscribe({
      next: () => {
        this.tables.update(tables => tables.filter(t => t.id !== table.id));
        this.selectedTable.set(null);
      },
      error: err => {
        const detail = err.error?.detail ?? '';
        if (err.status === 400 && typeof detail === 'string' && detail.includes('has orders')) {
          this.confirmationModal.update(m => ({ ...m, show: false }));
          this.reassignTableModal.set(table);
          const other = this.tables().filter(t => t.id !== table.id);
          this.reassignTargetTableId.set(other.length > 0 ? other[0].id ?? null : null);
        } else {
          this.error.set(detail || 'Failed to delete table');
        }
      }
    });
  }

  cancelReassign() {
    this.reassignTableModal.set(null);
    this.reassignTargetTableId.set(null);
  }

  doReassignAndDelete() {
    const table = this.reassignTableModal();
    const targetId = this.reassignTargetTableId();
    if (!table?.id || targetId == null) return;
    this.api.deleteTable(table.id, targetId).subscribe({
      next: () => {
        this.tables.update(tables => tables.filter(t => t.id !== table.id));
        this.selectedTable.set(null);
        this.cancelReassign();
      },
      error: err => this.error.set(err.error?.detail || 'Failed')
    });
  }

  onConfirmationConfirm() {
    const m = this.confirmationModal();
    const action = m.action;
    if (action === 'deleteFloor') {
      this.confirmDeleteFloor();
    } else if (action === 'deleteTable') {
      this.confirmDeleteTable();
    } else if (action === 'joinTables' && m.joinPairIds && m.joinPairIds.length >= 2) {
      const ids = m.joinPairIds;
      this.error.set('');
      this.api.createTableGroup(ids).subscribe({
        next: () => {
          this.joinSelectionIds.set([]);
          this.loadData();
        },
        error: (err: { error?: { detail?: string } }) =>
          this.error.set(err.error?.detail || 'Join failed'),
      });
    }
    this.onConfirmationCancel();
  }

  onConfirmationCancel() {
    this.confirmationModal.update(m => ({
      ...m,
      show: false,
      action: null,
      joinPairIds: undefined,
      messageParams: undefined,
    }));
  }

  saveAllPositions() {
    const updates = this.tablesOnCurrentFloor().map(table =>
      this.api.updateTable(table.id!, {
        x_position: table.x_position,
        y_position: table.y_position
      }).toPromise()
    );

    Promise.all(updates)
      .then(() => this.hasUnsavedChanges.set(false))
      .catch(() => this.error.set('Failed to save layout'));
  }

}
