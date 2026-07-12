import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService, RestaurantGroup } from '../services/api.service';

@Component({
  selector: 'app-restaurant-group-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="section" data-testid="settings-restaurant-group-section">
      <div class="section-header">
        <h2>{{ 'SETTINGS.RESTAURANT_GROUP_TITLE' | translate }}</h2>
        <p>{{ 'SETTINGS.RESTAURANT_GROUP_SUBTITLE' | translate }}</p>
      </div>

      @if (loading()) {
        <p class="hint">{{ 'COMMON.LOADING' | translate }}</p>
      } @else if (error()) {
        <p class="error-text">{{ error() }}</p>
      } @else if (!group()) {
        <div class="card-block">
          <h3>{{ 'SETTINGS.RESTAURANT_GROUP_CREATE' | translate }}</h3>
          <label>
            <span>{{ 'SETTINGS.RESTAURANT_GROUP_NAME' | translate }}</span>
            <input type="text" [(ngModel)]="createName" [placeholder]="'SETTINGS.RESTAURANT_GROUP_NAME_PLACEHOLDER' | translate" />
          </label>
          <label class="checkbox-row">
            <input type="checkbox" [(ngModel)]="createShareProducts" />
            <span>{{ 'SETTINGS.RESTAURANT_GROUP_SHARE_PRODUCTS' | translate }}</span>
          </label>
          <label class="checkbox-row">
            <input type="checkbox" [(ngModel)]="createShareCustomers" />
            <span>{{ 'SETTINGS.RESTAURANT_GROUP_SHARE_CUSTOMERS' | translate }}</span>
          </label>
          <button type="button" class="btn btn-primary" [disabled]="creating() || !createName.trim()" (click)="createGroup()">
            {{ creating() ? ('COMMON.SAVING' | translate) : ('SETTINGS.RESTAURANT_GROUP_CREATE_BTN' | translate) }}
          </button>

          <hr />

          <h3>{{ 'SETTINGS.RESTAURANT_GROUP_JOIN' | translate }}</h3>
          <p class="hint">{{ 'SETTINGS.RESTAURANT_GROUP_JOIN_HINT' | translate }}</p>
          <label>
            <span>{{ 'SETTINGS.RESTAURANT_GROUP_JOIN_CODE' | translate }}</span>
            <input type="text" [(ngModel)]="joinCode" [placeholder]="'SETTINGS.RESTAURANT_GROUP_JOIN_CODE_PLACEHOLDER' | translate" />
          </label>
          <button type="button" class="btn btn-secondary" [disabled]="joining() || !joinCode.trim()" (click)="joinGroup()">
            {{ joining() ? ('COMMON.SAVING' | translate) : ('SETTINGS.RESTAURANT_GROUP_JOIN_BTN' | translate) }}
          </button>
        </div>
      } @else {
        <div class="card-block">
          <label>
            <span>{{ 'SETTINGS.RESTAURANT_GROUP_NAME' | translate }}</span>
            <input type="text" [(ngModel)]="editName" (ngModelChange)="dirty.set(true)" />
          </label>
          <label class="checkbox-row">
            <input type="checkbox" [(ngModel)]="editShareProducts" (ngModelChange)="dirty.set(true)" />
            <span>{{ 'SETTINGS.RESTAURANT_GROUP_SHARE_PRODUCTS' | translate }}</span>
          </label>
          <label class="checkbox-row">
            <input type="checkbox" [(ngModel)]="editShareCustomers" (ngModelChange)="dirty.set(true)" />
            <span>{{ 'SETTINGS.RESTAURANT_GROUP_SHARE_CUSTOMERS' | translate }}</span>
          </label>
          <button type="button" class="btn btn-primary" [disabled]="!dirty() || saving()" (click)="saveGroup()">
            {{ saving() ? ('COMMON.SAVING' | translate) : ('COMMON.SAVE' | translate) }}
          </button>

          <div class="join-code-row">
            <label>
              <span>{{ 'SETTINGS.RESTAURANT_GROUP_JOIN_CODE' | translate }}</span>
              <input type="text" [value]="group()!.join_code" readonly />
            </label>
            <p class="hint">{{ 'SETTINGS.RESTAURANT_GROUP_JOIN_CODE_HINT' | translate }}</p>
          </div>

          <h3>{{ 'SETTINGS.RESTAURANT_GROUP_MEMBERS' | translate }}</h3>
          <ul class="member-list">
            @for (m of group()!.members; track m.tenant_id) {
              <li [class.current]="m.is_current">
                {{ m.tenant_name }}
                @if (m.is_current) {
                  <span class="badge">{{ 'SETTINGS.RESTAURANT_GROUP_THIS_LOCATION' | translate }}</span>
                }
              </li>
            }
          </ul>

          <button type="button" class="btn btn-secondary danger-outline" [disabled]="leaving()" (click)="leaveGroup()">
            {{ leaving() ? ('COMMON.SAVING' | translate) : ('SETTINGS.RESTAURANT_GROUP_LEAVE' | translate) }}
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .card-block {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        max-width: 32rem;
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .checkbox-row {
        flex-direction: row;
        align-items: center;
        gap: 0.5rem;
      }
      .member-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .member-list li {
        padding: 0.35rem 0;
      }
      .member-list li.current {
        font-weight: 600;
      }
      .badge {
        margin-left: 0.5rem;
        font-size: 0.75rem;
        font-weight: normal;
        opacity: 0.8;
      }
      .join-code-row {
        margin-top: 0.5rem;
      }
      hr {
        margin: 1rem 0;
        border: none;
        border-top: 1px solid var(--border-color, #ddd);
      }
      .error-text {
        color: var(--danger-color, #c0392b);
      }
      .danger-outline {
        margin-top: 1rem;
      }
    `,
  ],
})
export class RestaurantGroupSettingsComponent implements OnInit {
  private api = inject(ApiService);

  loading = signal(true);
  error = signal<string | null>(null);
  group = signal<RestaurantGroup | null>(null);
  creating = signal(false);
  joining = signal(false);
  saving = signal(false);
  leaving = signal(false);
  dirty = signal(false);

  createName = '';
  createShareProducts = false;
  createShareCustomers = false;
  joinCode = '';

  editName = '';
  editShareProducts = false;
  editShareCustomers = false;

  ngOnInit(): void {
    this.reload();
  }

  private reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getRestaurantGroup().subscribe({
      next: (g) => {
        this.group.set(g);
        if (g) {
          this.editName = g.name;
          this.editShareProducts = g.share_products;
          this.editShareCustomers = g.share_customers;
          this.dirty.set(false);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load restaurant group');
        this.loading.set(false);
      },
    });
  }

  createGroup(): void {
    this.creating.set(true);
    this.error.set(null);
    this.api
      .createRestaurantGroup({
        name: this.createName.trim(),
        share_products: this.createShareProducts,
        share_customers: this.createShareCustomers,
      })
      .subscribe({
        next: (g) => {
          this.group.set(g);
          this.editName = g.name;
          this.editShareProducts = g.share_products;
          this.editShareCustomers = g.share_customers;
          this.dirty.set(false);
          this.creating.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.detail ?? 'Failed to create group');
          this.creating.set(false);
        },
      });
  }

  joinGroup(): void {
    this.joining.set(true);
    this.error.set(null);
    this.api.joinRestaurantGroup(this.joinCode.trim()).subscribe({
      next: (g) => {
        this.group.set(g);
        this.editName = g.name;
        this.editShareProducts = g.share_products;
        this.editShareCustomers = g.share_customers;
        this.dirty.set(false);
        this.joining.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.detail ?? 'Failed to join group');
        this.joining.set(false);
      },
    });
  }

  saveGroup(): void {
    this.saving.set(true);
    this.error.set(null);
    this.api
      .updateRestaurantGroup({
        name: this.editName.trim(),
        share_products: this.editShareProducts,
        share_customers: this.editShareCustomers,
      })
      .subscribe({
        next: (g) => {
          this.group.set(g);
          this.dirty.set(false);
          this.saving.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.detail ?? 'Failed to save group');
          this.saving.set(false);
        },
      });
  }

  leaveGroup(): void {
    this.leaving.set(true);
    this.error.set(null);
    this.api.leaveRestaurantGroup().subscribe({
      next: () => {
        this.group.set(null);
        this.createName = '';
        this.joinCode = '';
        this.leaving.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.detail ?? 'Failed to leave group');
        this.leaving.set(false);
      },
    });
  }
}
