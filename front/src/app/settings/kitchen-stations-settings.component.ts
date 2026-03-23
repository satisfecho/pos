import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService, KitchenStation } from '../services/api.service';

@Component({
  selector: 'app-kitchen-stations-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="section" data-testid="settings-kitchen-stations-section">
      <div class="section-header">
        <h2>{{ 'SETTINGS.KITCHEN_STATIONS_TITLE' | translate }}</h2>
        <p>{{ 'SETTINGS.KITCHEN_STATIONS_SUBTITLE' | translate }}</p>
      </div>
      @if (loading()) {
        <p class="hint">{{ 'COMMON.LOADING' | translate }}</p>
      } @else {
        <div class="defaults-row">
          <label>
            <span>{{ 'SETTINGS.KITCHEN_STATIONS_DEFAULT_KITCHEN' | translate }}</span>
            <select [(ngModel)]="defaultKitchenId" (ngModelChange)="defaultsDirty.set(true)">
              <option [ngValue]="null">{{ 'COMMON.NONE' | translate }}</option>
              @for (s of kitchenRouteStations(); track s.id) {
                <option [ngValue]="s.id">{{ s.name }}</option>
              }
            </select>
          </label>
          <label>
            <span>{{ 'SETTINGS.KITCHEN_STATIONS_DEFAULT_BAR' | translate }}</span>
            <select [(ngModel)]="defaultBarId" (ngModelChange)="defaultsDirty.set(true)">
              <option [ngValue]="null">{{ 'COMMON.NONE' | translate }}</option>
              @for (s of barRouteStations(); track s.id) {
                <option [ngValue]="s.id">{{ s.name }}</option>
              }
            </select>
          </label>
          <button
            type="button"
            class="btn btn-primary"
            [disabled]="!defaultsDirty() || savingDefaults()"
            (click)="saveDefaults()"
          >
            {{ savingDefaults() ? ('COMMON.SAVING' | translate) : ('COMMON.SAVE' | translate) }}
          </button>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ 'COMMON.NAME' | translate }}</th>
              <th>{{ 'SETTINGS.KITCHEN_STATIONS_ROUTE' | translate }}</th>
              <th>{{ 'SETTINGS.KITCHEN_STATIONS_SORT' | translate }}</th>
              <th>{{ 'COMMON.ACTIONS' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            @for (s of stations(); track s.id) {
              <tr>
                <td>
                  @if (editingId() === s.id) {
                    <input type="text" [(ngModel)]="editName" class="inline-input" />
                  } @else {
                    {{ s.name }}
                  }
                </td>
                <td>
                  @if (editingId() === s.id) {
                    <select [(ngModel)]="editRoute">
                      <option value="kitchen">{{ 'SETTINGS.KITCHEN_STATIONS_ROUTE_KITCHEN' | translate }}</option>
                      <option value="bar">{{ 'SETTINGS.KITCHEN_STATIONS_ROUTE_BAR' | translate }}</option>
                    </select>
                  } @else {
                    {{
                      s.display_route === 'bar'
                        ? ('SETTINGS.KITCHEN_STATIONS_ROUTE_BAR' | translate)
                        : ('SETTINGS.KITCHEN_STATIONS_ROUTE_KITCHEN' | translate)
                    }}
                  }
                </td>
                <td>
                  @if (editingId() === s.id) {
                    <input type="number" [(ngModel)]="editSort" class="inline-input narrow" />
                  } @else {
                    {{ s.sort_order }}
                  }
                </td>
                <td class="actions">
                  @if (editingId() === s.id) {
                    <button type="button" class="btn btn-sm btn-primary" (click)="saveEdit(s.id)">
                      {{ 'COMMON.SAVE' | translate }}
                    </button>
                    <button type="button" class="btn btn-sm btn-secondary" (click)="cancelEdit()">
                      {{ 'COMMON.CANCEL' | translate }}
                    </button>
                  } @else {
                    <button type="button" class="btn btn-sm btn-secondary" (click)="startEdit(s)">
                      {{ 'COMMON.EDIT' | translate }}
                    </button>
                    <button type="button" class="btn btn-sm btn-secondary" (click)="deleteStation(s)">
                      {{ 'COMMON.DELETE' | translate }}
                    </button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
        <div class="add-block">
          <h3>{{ 'SETTINGS.KITCHEN_STATIONS_ADD' | translate }}</h3>
          <div class="add-row">
            <input type="text" [(ngModel)]="newName" [placeholder]="'SETTINGS.KITCHEN_STATIONS_NAME_PLACEHOLDER' | translate" />
            <select [(ngModel)]="newRoute">
              <option value="kitchen">{{ 'SETTINGS.KITCHEN_STATIONS_ROUTE_KITCHEN' | translate }}</option>
              <option value="bar">{{ 'SETTINGS.KITCHEN_STATIONS_ROUTE_BAR' | translate }}</option>
            </select>
            <button type="button" class="btn btn-primary" [disabled]="adding() || !newName.trim()" (click)="addStation()">
              {{ adding() ? ('COMMON.SAVING' | translate) : ('COMMON.ADD' | translate) }}
            </button>
          </div>
        </div>
        @if (message()) {
          <p class="hint">{{ message() }}</p>
        }
      }
    </div>
  `,
  styles: [
    `
      .defaults-row {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        align-items: flex-end;
        margin-bottom: 1.5rem;
      }
      .defaults-row label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-weight: 500;
      }
      .defaults-row select {
        min-width: 200px;
        padding: 0.5rem;
      }
      .inline-input {
        width: 100%;
        max-width: 220px;
        padding: 0.35rem 0.5rem;
      }
      .inline-input.narrow {
        max-width: 80px;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
      }
      .add-block {
        margin-top: 1.5rem;
        padding-top: 1rem;
        border-top: 1px solid var(--color-border, #e5e7eb);
      }
      .add-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
      }
      .add-row input {
        min-width: 200px;
        padding: 0.5rem;
      }
      .add-row select {
        padding: 0.5rem;
      }
    `,
  ],
})
export class KitchenStationsSettingsComponent implements OnInit {
  private api = inject(ApiService);

  loading = signal(true);
  stations = signal<KitchenStation[]>([]);
  defaultKitchenId: number | null = null;
  defaultBarId: number | null = null;
  defaultsDirty = signal(false);
  savingDefaults = signal(false);
  adding = signal(false);
  message = signal('');

  newName = '';
  newRoute: 'kitchen' | 'bar' = 'kitchen';

  editingId = signal<number | null>(null);
  editName = '';
  editRoute: 'kitchen' | 'bar' = 'kitchen';
  editSort = 0;

  kitchenRouteStations = () => this.stations().filter((s) => s.display_route === 'kitchen');
  barRouteStations = () => this.stations().filter((s) => s.display_route === 'bar');

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.message.set('');
    this.api.getKitchenStations().subscribe({
      next: (list) => {
        this.stations.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.message.set('Failed to load stations');
      },
    });
    this.api.getKitchenStationDefaults().subscribe({
      next: (d) => {
        this.defaultKitchenId = d.default_kitchen_station_id;
        this.defaultBarId = d.default_bar_station_id;
        this.defaultsDirty.set(false);
      },
      error: () => {},
    });
  }

  saveDefaults(): void {
    this.savingDefaults.set(true);
    this.message.set('');
    this.api
      .updateKitchenStationDefaults({
        default_kitchen_station_id: this.defaultKitchenId,
        default_bar_station_id: this.defaultBarId,
      })
      .subscribe({
        next: () => {
          this.defaultsDirty.set(false);
          this.savingDefaults.set(false);
        },
        error: (err) => {
          this.message.set(err.error?.detail || 'Save failed');
          this.savingDefaults.set(false);
        },
      });
  }

  addStation(): void {
    const name = this.newName.trim();
    if (!name) return;
    this.adding.set(true);
    this.message.set('');
    this.api
      .createKitchenStation({
        name,
        display_route: this.newRoute,
        sort_order: this.stations().length,
      })
      .subscribe({
        next: () => {
          this.newName = '';
          this.adding.set(false);
          this.reload();
        },
        error: (err) => {
          this.message.set(err.error?.detail || 'Add failed');
          this.adding.set(false);
        },
      });
  }

  startEdit(s: KitchenStation): void {
    this.editingId.set(s.id);
    this.editName = s.name;
    this.editRoute = s.display_route === 'bar' ? 'bar' : 'kitchen';
    this.editSort = s.sort_order;
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  saveEdit(id: number): void {
    this.message.set('');
    this.api
      .updateKitchenStation(id, {
        name: this.editName.trim() || undefined,
        display_route: this.editRoute,
        sort_order: this.editSort,
      })
      .subscribe({
        next: () => {
          this.editingId.set(null);
          this.reload();
        },
        error: (err) => {
          this.message.set(err.error?.detail || 'Update failed');
        },
      });
  }

  deleteStation(s: KitchenStation): void {
    const msg = `Delete station "${s.name}"?`;
    if (!globalThis.confirm?.(msg)) return;
    this.message.set('');
    this.api.deleteKitchenStation(s.id).subscribe({
      next: () => this.reload(),
      error: (err) => {
        this.message.set(err.error?.detail || 'Delete failed');
      },
    });
  }
}
