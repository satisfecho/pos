import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService, TenantSettings } from '../services/api.service';
import { SidebarComponent } from '../shared/sidebar.component';
import { TranslationsComponent } from '../translations/translations.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TranslateModule, TranslationsComponent],
  template: `
    <app-sidebar>
      <div class="page-header">
        <h1>{{ 'SETTINGS.TITLE' | translate }}</h1>
      </div>

      <!-- Tab Navigation - Mobile First (horizontal scrollable tabs) -->
      <div class="tabs-container">
        <div class="tabs">
          <button 
            type="button" 
            class="tab" 
            [class.active]="activeSection() === 'general'"
            (click)="activeSection.set('general')">
            <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            <span>{{ 'SETTINGS.BUSINESS_PROFILE' | translate }}</span>
          </button>
          
          <button 
            type="button" 
            class="tab" 
            [class.active]="activeSection() === 'contact'"
            (click)="activeSection.set('contact')">
            <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
            </svg>
            <span>{{ 'SETTINGS.CONTACT_INFO' | translate }}</span>
          </button>
          
          <button 
            type="button" 
            class="tab" 
            [class.active]="activeSection() === 'hours'"
            (click)="activeSection.set('hours')">
            <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>{{ 'SETTINGS.OPENING_HOURS' | translate }}</span>
          </button>
          
          <button 
            type="button" 
            class="tab" 
            [class.active]="activeSection() === 'payments'"
            (click)="activeSection.set('payments')">
            <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            <span>{{ 'SETTINGS.PAYMENT_SETTINGS' | translate }}</span>
          </button>
          
          <button 
            type="button" 
            class="tab" 
            [class.active]="activeSection() === 'email'"
            (click)="activeSection.set('email')">
            <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <span>{{ 'SETTINGS.EMAIL_SETTINGS' | translate }}</span>
          </button>
          
          <button 
            type="button" 
            class="tab" 
            [class.active]="activeSection() === 'translations'"
            (click)="activeSection.set('translations')">
            <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
            </svg>
            <span>{{ 'SETTINGS.TRANSLATIONS_TITLE' | translate }}</span>
          </button>
        </div>
      </div>

      <div class="content">
        @if (loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>{{ 'SETTINGS.LOADING_SETTINGS' | translate }}</p>
          </div>
        } @else {
          <!-- Translations Section (Independent) -->
          @if (activeSection() === 'translations') {
            <div class="section">
              <div class="section-header">
                <h2>{{ 'SETTINGS.TRANSLATIONS_TITLE' | translate }}</h2>
                <p>{{ 'SETTINGS.TRANSLATIONS_SUBTITLE' | translate }}</p>
              </div>
              <app-translations></app-translations>
            </div>
          } @else {
            <!-- Tenant Settings Sections (Shared Form) -->
            <form (ngSubmit)="saveSettings()" class="settings-form">

              <!-- General Section -->
              @if (activeSection() === 'general') {
                <div class="section">
                  <div class="section-header">
                    <h2>{{ 'SETTINGS.BUSINESS_PROFILE' | translate }}</h2>
                    <p>{{ 'SETTINGS.SUBTITLE' | translate }}</p>
                  </div>
                  
                  <!-- Logo -->
                  <div class="form-group">
                    <label>{{ 'SETTINGS.LOGO' | translate }}</label>
                    <div class="logo-upload-wrapper">
                      @if (logoPreview() || settings()?.logo_filename) {
                        <div class="current-logo">
                          <img [src]="getDisplayLogoSrc()" alt="Logo" />
                          <button type="button" class="btn-icon-danger" (click)="removeLogo()" title="{{ 'SETTINGS.REMOVE_LOGO' | translate }}">✕</button>
                        </div>
                      }
                      <div class="upload-controls">
                        <input
                          type="file"
                          id="logo-upload"
                          accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml,.svg"
                          (change)="onLogoSelected($event)"
                          hidden
                        />
                        <label for="logo-upload" class="btn btn-secondary">
                          {{ 'SETTINGS.UPLOAD_LOGO' | translate }}
                        </label>
                        <span class="hint">{{ 'SETTINGS.UPLOAD_LOGO_HINT' | translate }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Basic Info -->
                  <div class="form-row">
                    <div class="form-group">
                      <label for="name">{{ 'SETTINGS.BUSINESS_NAME' | translate }} *</label>
                      <input type="text" id="name" [(ngModel)]="formData.name" name="name" required />
                    </div>

                    <div class="form-group">
                      <label for="business_type">{{ 'SETTINGS.BUSINESS_TYPE' | translate }}</label>
                      <select id="business_type" [(ngModel)]="formData.business_type" name="business_type">
                        <option [value]="null">{{ 'SETTINGS.SELECT_BUSINESS_TYPE' | translate }}</option>
                        <option value="restaurant">{{ 'SETTINGS.BUSINESS_TYPE_RESTAURANT' | translate }}</option>
                        <option value="bar">{{ 'SETTINGS.BUSINESS_TYPE_BAR' | translate }}</option>
                        <option value="cafe">{{ 'SETTINGS.BUSINESS_TYPE_CAFE' | translate }}</option>
                        <option value="retail">{{ 'SETTINGS.BUSINESS_TYPE_RETAIL' | translate }}</option>
                      </select>
                    </div>
                  </div>

                  <div class="form-group">
                    <label for="description">{{ 'SETTINGS.DESCRIPTION' | translate }}</label>
                    <textarea id="description" [(ngModel)]="formData.description" name="description" rows="3"></textarea>
                  </div>

                  <div class="form-group">
                    <label for="timezone">{{ 'SETTINGS.TIMEZONE' | translate }}</label>
                    <div class="timezone-select-wrapper">
                      <input
                        type="text"
                        id="timezone-search"
                        [(ngModel)]="timezoneSearch"
                        name="timezoneSearch"
                        [placeholder]="'SETTINGS.SEARCH_TIMEZONE' | translate"
                        (focus)="timezoneDropdownOpen = true"
                        (blur)="timezoneDropdownOpen = false"
                        (input)="filterTimezones()"
                        autocomplete="off"
                      />
                      @if (timezoneDropdownOpen && filteredTimezones.length > 0) {
                        <div class="timezone-dropdown">
                          @for (tz of filteredTimezones; track tz) {
                            <div
                              class="timezone-option"
                              [class.selected]="formData.timezone === tz"
                              (mousedown)="selectTimezone(tz)">
                              {{ tz }}
                            </div>
                          }
                        </div>
                      }
                    </div>
                    @if (formData.timezone) {
                      <small class="field-hint">{{ formData.timezone }}</small>
                    } @else {
                      <small class="field-hint field-warning">{{ 'SETTINGS.TIMEZONE_NOT_SET' | translate }}</small>
                    }
                  </div>
                </div>
              }

              <!-- Contact Section -->
              @if (activeSection() === 'contact') {
                <div class="section">
                  <div class="section-header">
                    <h2>{{ 'SETTINGS.CONTACT_INFO' | translate }}</h2>
                    <p>{{ 'SETTINGS.CONTACT_INFO_SUBTITLE' | translate }}</p>
                  </div>
                  
                  <div class="form-row">
                    <div class="form-group">
                      <label for="phone">{{ 'SETTINGS.PHONE' | translate }}</label>
                      <input type="tel" id="phone" [(ngModel)]="formData.phone" name="phone" />
                    </div>
                    <div class="form-group">
                      <label for="whatsapp">{{ 'SETTINGS.WHATSAPP' | translate }}</label>
                      <input type="tel" id="whatsapp" [(ngModel)]="formData.whatsapp" name="whatsapp" />
                    </div>
                  </div>
                  
                  <div class="form-group">
                    <label for="email">{{ 'SETTINGS.EMAIL' | translate }}</label>
                    <input type="email" id="email" [(ngModel)]="formData.email" name="email" />
                  </div>
                  
                  <div class="form-group">
                    <label for="address">{{ 'SETTINGS.ADDRESS' | translate }}</label>
                    <input type="text" id="address" [(ngModel)]="formData.address" name="address" />
                  </div>
                  
                  <div class="form-group">
                    <label for="website">{{ 'SETTINGS.WEBSITE' | translate }}</label>
                    <input type="url" id="website" [(ngModel)]="formData.website" name="website" />
                  </div>

                  <div class="form-row">
                    <div class="form-group">
                      <label for="tax_id">{{ 'SETTINGS.TAX_ID' | translate }}</label>
                      <input type="text" id="tax_id" [(ngModel)]="formData.tax_id" name="tax_id" [placeholder]="'SETTINGS.TAX_ID_PLACEHOLDER' | translate" />
                    </div>
                    <div class="form-group">
                      <label for="cif">{{ 'SETTINGS.CIF' | translate }}</label>
                      <input type="text" id="cif" [(ngModel)]="formData.cif" name="cif" [placeholder]="'SETTINGS.CIF_PLACEHOLDER' | translate" />
                    </div>
                  </div>
                </div>
              }

              <!-- Hours Section -->
              @if (activeSection() === 'hours') {
                <div class="section">
                  <div class="section-header">
                    <h2>{{ 'SETTINGS.OPENING_HOURS' | translate }}</h2>
                    <p>{{ 'SETTINGS.OPENING_HOURS_SUBTITLE' | translate }}</p>
                  </div>
                  @if (getOpeningHoursSummary()) {
                    <div class="opening-hours-summary">
                      <span class="summary-label">{{ 'SETTINGS.OPENING_HOURS' | translate }}:</span>
                      <span class="summary-text">{{ getOpeningHoursSummary() }}</span>
                    </div>
                  }
                  <div class="copy-to-other-days">
                    <label>{{ 'SETTINGS.COPY_FROM_DAY' | translate }}</label>
                    <select [(ngModel)]="copyFromDayKey" name="copyFromDay">
                      @for (day of daysOfWeek; track day.key) {
                        <option [value]="day.key">{{ day.label | translate }}</option>
                      }
                    </select>
                    <button type="button" class="btn btn-secondary btn-sm" (click)="copyDayToOtherDays(copyFromDayKey)">
                      {{ 'SETTINGS.COPY_TO_OTHER_DAYS' | translate }}
                    </button>
                  </div>
                  <div class="hours-grid">
                    @for (day of daysOfWeek; track day.key) {
                      <div class="day-row" [class.closed]="openingHours[day.key]?.closed">
                        <div class="day-header">
                          <label class="switch">
                            <input
                              type="checkbox"
                              [checked]="!openingHours[day.key]?.closed"
                              (change)="toggleDayClosed(day.key, $event)"
                            />
                            <span class="slider round"></span>
                          </label>
                          <span class="day-name">{{ day.label | translate }}</span>
                        </div>

                        @if (!openingHours[day.key]?.closed) {
                          <div class="hours-inputs">
                            @if (!openingHours[day.key]?.hasBreak) {
                              <div class="time-range">
                                <select [ngModel]="openingHours[day.key]?.open || '09:00'" (ngModelChange)="setOpeningHourValue(day.key, 'open', $event)" [name]="'open-' + day.key">
                                  @for (t of timeOptions; track t) {
                                    <option [value]="t">{{ t }}</option>
                                  }
                                </select>
                                <span>–</span>
                                <select [ngModel]="openingHours[day.key]?.close || '22:00'" (ngModelChange)="setOpeningHourValue(day.key, 'close', $event)" [name]="'close-' + day.key">
                                  @for (t of timeOptions; track t) {
                                    <option [value]="t">{{ t }}</option>
                                  }
                                </select>
                              </div>
                            } @else {
                              <div class="split-shifts">
                                <div class="shift">
                                  <span class="shift-label">{{ 'SETTINGS.MORNING_SHIFT' | translate }}</span>
                                  <select [ngModel]="openingHours[day.key]?.morningOpen" (ngModelChange)="setOpeningHourValue(day.key, 'morningOpen', $event)" [name]="'mo-' + day.key">
                                    @for (t of timeOptions; track t) {
                                      <option [value]="t">{{ t }}</option>
                                    }
                                  </select>
                                  <span>–</span>
                                  <select [ngModel]="openingHours[day.key]?.morningClose" (ngModelChange)="setOpeningHourValue(day.key, 'morningClose', $event)" [name]="'mc-' + day.key">
                                    @for (t of timeOptions; track t) {
                                      <option [value]="t">{{ t }}</option>
                                    }
                                  </select>
                                </div>
                                <div class="shift">
                                  <span class="shift-label">{{ 'SETTINGS.EVENING_SHIFT' | translate }}</span>
                                  <select [ngModel]="openingHours[day.key]?.eveningOpen" (ngModelChange)="setOpeningHourValue(day.key, 'eveningOpen', $event)" [name]="'eo-' + day.key">
                                    @for (t of timeOptions; track t) {
                                      <option [value]="t">{{ t }}</option>
                                    }
                                  </select>
                                  <span>–</span>
                                  <select [ngModel]="openingHours[day.key]?.eveningClose" (ngModelChange)="setOpeningHourValue(day.key, 'eveningClose', $event)" [name]="'ec-' + day.key">
                                    @for (t of timeOptions; track t) {
                                      <option [value]="t">{{ t }}</option>
                                    }
                                  </select>
                                </div>
                              </div>
                            }
                            <div class="break-option">
                              <label class="checkbox-small">
                                <input type="checkbox" [checked]="openingHours[day.key]?.hasBreak" (change)="toggleBreak(day.key, $event)">
                                {{ 'SETTINGS.HAS_BREAK' | translate }}
                              </label>
                            </div>
                            <div class="personnel-per-shift">
                              <span class="personnel-label">{{ 'SETTINGS.PERSONNEL_PER_SHIFT' | translate }}</span>
                              <div class="personnel-inputs">
                                @for (role of staffRoleKeys; track role.key) {
                                  <div class="personnel-field">
                                    <label [for]="'staff-' + day.key + '-' + role.key">{{ role.labelKey | translate }}</label>
                                    <input type="number" [id]="'staff-' + day.key + '-' + role.key"
                                      [value]="getStaffRequired(day.key, role.key)"
                                      (input)="setStaffRequired(day.key, role.key, $any($event.target).value)"
                                      min="0" max="99" class="input-number" />
                                  </div>
                                }
                              </div>
                            </div>
                          </div>
                        } @else {
                          <span class="closed-badge">{{ 'SETTINGS.CLOSED' | translate }}</span>
                        }
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Payments Section -->
              @if (activeSection() === 'payments') {
                <div class="section">
                  <div class="section-header">
                    <h2>{{ 'SETTINGS.PAYMENT_SETTINGS' | translate }}</h2>
                    <p>{{ 'SETTINGS.PAYMENT_SETTINGS_SUBTITLE' | translate }}</p>
                  </div>
                  
                  <div class="form-group">
                    <label for="currency">{{ 'SETTINGS.CURRENCY' | translate }}</label>
                    <input type="text" id="currency" [(ngModel)]="formData.currency" name="currency" placeholder="€" class="input-short" />
                  </div>
                  
                  <div class="divider"></div>
                  
                  <h3>Stripe Integration</h3>
                  <div class="form-group">
                    <label>{{ 'SETTINGS.STRIPE_PUBLISHABLE_KEY' | translate }}</label>
                    <input type="text" [(ngModel)]="formData.stripe_publishable_key" name="stripe_publishable_key" class="code-input" />
                  </div>
                  <div class="form-group">
                    <label>{{ 'SETTINGS.STRIPE_SECRET_KEY' | translate }}</label>
                    <input type="password" [(ngModel)]="formData.stripe_secret_key" name="stripe_secret_key" placeholder="••••••••••••••••" />
                  </div>
                  
                  <div class="form-group checkbox-row">
                    <label class="switch">
                      <input type="checkbox" [(ngModel)]="formData.immediate_payment_required" name="immediate_payment_required">
                      <span class="slider round"></span>
                    </label>
                    <div>
                      <label class="check-label">{{ 'SETTINGS.IMMEDIATE_PAYMENT' | translate }}</label>
                      <p class="hint">{{ 'SETTINGS.IMMEDIATE_PAYMENT_HINT' | translate }}</p>
                    </div>
                  </div>
                  
                  <div class="divider"></div>
                  
                  <h3>{{ 'SETTINGS.LOCATION_VERIFICATION' | translate }}</h3>
                  <p class="section-desc">{{ 'SETTINGS.LOCATION_VERIFICATION_DESC' | translate }}</p>
                  
                  <div class="form-group checkbox-row">
                    <label class="switch">
                      <input type="checkbox" [(ngModel)]="formData.location_check_enabled" name="location_check_enabled">
                      <span class="slider round"></span>
                    </label>
                    <div>
                      <label class="check-label">{{ 'SETTINGS.ENABLE_LOCATION_CHECK' | translate }}</label>
                      <p class="hint">{{ 'SETTINGS.ENABLE_LOCATION_CHECK_HINT' | translate }}</p>
                    </div>
                  </div>
                  
                  @if (formData.location_check_enabled) {
                    <div class="location-settings">
                      <div class="form-row">
                        <div class="form-group">
                          <label>{{ 'SETTINGS.LATITUDE' | translate }}</label>
                          <input type="number" step="0.000001" [(ngModel)]="formData.latitude" name="latitude" placeholder="e.g. 41.385064" />
                        </div>
                        <div class="form-group">
                          <label>{{ 'SETTINGS.LONGITUDE' | translate }}</label>
                          <input type="number" step="0.000001" [(ngModel)]="formData.longitude" name="longitude" placeholder="e.g. 2.173404" />
                        </div>
                      </div>
                      <div class="form-group">
                        <label>{{ 'SETTINGS.LOCATION_RADIUS' | translate }}</label>
                        <input type="number" [(ngModel)]="formData.location_radius_meters" name="location_radius_meters" placeholder="100" />
                        <p class="hint">{{ 'SETTINGS.LOCATION_RADIUS_HINT' | translate }}</p>
                      </div>
                      <button type="button" class="btn btn-secondary btn-sm" (click)="useCurrentLocation()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        {{ 'SETTINGS.USE_CURRENT_LOCATION' | translate }}
                      </button>
                    </div>
                  }
                </div>
              }

              <!-- Email (SMTP) Section -->
              @if (activeSection() === 'email') {
                <div class="section">
                  <div class="section-header">
                    <h2>{{ 'SETTINGS.EMAIL_SETTINGS' | translate }}</h2>
                    <p>{{ 'SETTINGS.EMAIL_SETTINGS_SUBTITLE' | translate }}</p>
                  </div>
                  <div class="form-group">
                    <label for="smtp_host">{{ 'SETTINGS.SMTP_HOST' | translate }}</label>
                    <input type="text" id="smtp_host" [(ngModel)]="formData.smtp_host" name="smtp_host" [placeholder]="'SETTINGS.SMTP_HOST_PLACEHOLDER' | translate" />
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label for="smtp_port">{{ 'SETTINGS.SMTP_PORT' | translate }}</label>
                      <input type="number" id="smtp_port" [(ngModel)]="formData.smtp_port" name="smtp_port" placeholder="587" min="1" max="65535" />
                    </div>
                    <div class="form-group checkbox-row">
                      <label class="switch">
                        <input type="checkbox" [(ngModel)]="formData.smtp_use_tls" name="smtp_use_tls">
                        <span class="slider round"></span>
                      </label>
                      <div>
                        <label class="check-label">{{ 'SETTINGS.SMTP_USE_TLS' | translate }}</label>
                      </div>
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="smtp_user">{{ 'SETTINGS.SMTP_USER' | translate }}</label>
                    <input type="text" id="smtp_user" [(ngModel)]="formData.smtp_user" name="smtp_user" placeholder="user@example.com" />
                  </div>
                  <div class="form-group">
                    <label for="smtp_password">{{ 'SETTINGS.SMTP_PASSWORD' | translate }}</label>
                    <input type="password" id="smtp_password" [(ngModel)]="formData.smtp_password" name="smtp_password" [placeholder]="'SETTINGS.SMTP_PASSWORD_PLACEHOLDER' | translate" />
                  </div>
                  <div class="form-group">
                    <label for="email_from">{{ 'SETTINGS.EMAIL_FROM' | translate }}</label>
                    <input type="email" id="email_from" [(ngModel)]="formData.email_from" name="email_from" [placeholder]="'SETTINGS.EMAIL_PLACEHOLDER' | translate" />
                  </div>
                  <div class="form-group">
                    <label for="email_from_name">{{ 'SETTINGS.EMAIL_FROM_NAME' | translate }}</label>
                    <input type="text" id="email_from_name" [(ngModel)]="formData.email_from_name" name="email_from_name" [placeholder]="'SETTINGS.EMAIL_FROM_PLACEHOLDER' | translate" />
                  </div>
                </div>
              }

              <!-- Form Actions -->
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="cancel()">{{ 'SETTINGS.CANCEL' | translate }}</button>
                <button type="submit" class="btn btn-primary" [disabled]="saving()">
                  {{ saving() ? ('SETTINGS.SAVING' | translate) : ('SETTINGS.SAVE_CHANGES' | translate) }}
                </button>
              </div>
              
              @if (error()) { <div class="toast error">{{ error() }}</div> }
              @if (success()) { <div class="toast success">{{ success() }}</div> }
              
            </form>
          }
        }
      </div>
    </app-sidebar>
  `,
  styles: [`
    /* ==========================================
       MOBILE-FIRST RESPONSIVE SETTINGS STYLES
       ========================================== */
    
    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-4);

      h1 {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--color-text);
        margin: 0;
      }
    }
    
    @media (min-width: 640px) {
      .page-header h1 {
        font-size: 1.5rem;
      }
    }

    /* ==========================================
       TABS - Mobile First (Horizontal Scroll)
       ========================================== */
    .tabs-container {
      margin-bottom: var(--space-4);
      margin-left: calc(-1 * var(--space-4));
      margin-right: calc(-1 * var(--space-4));
      padding: 0 var(--space-4);
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      display: block;
      max-width: calc(100% + (2 * var(--space-4)));
    }

    .tabs {
      display: flex;
      gap: var(--space-2);
      padding-bottom: var(--space-3);
      width: max-content;
      min-width: 100%;
    }

    /* Mobile: Icon-only tabs with smaller padding */
    .tab {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      padding: var(--space-3);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      color: var(--color-text-muted);
      font-size: 0.875rem;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.15s ease;
      min-height: 44px; /* Touch-friendly minimum */
      min-width: 44px;
      flex-shrink: 0;
    }

    /* Hide text on small screens */
    .tab span {
      display: none;
    }

    .tab:hover {
      color: var(--color-text);
      border-color: var(--color-primary);
    }

    .tab.active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: white;
    }

    .tab-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    /* Tablet+: Show text labels */
    @media (min-width: 480px) {
      .tab {
        padding: var(--space-3) var(--space-4);
      }
      
      .tab span {
        display: inline;
      }
      
      .tab-icon {
        width: 18px;
        height: 18px;
      }
    }

    /* ==========================================
       SECTION STYLING
       ========================================== */
    .content {
      /* Full width container */
    }

    .section {
      margin-bottom: var(--space-5);
    }
    
    @media (min-width: 640px) {
      .section {
        margin-bottom: var(--space-6);
      }
    }

    .section-header {
      margin-bottom: var(--space-4);
      padding-bottom: var(--space-3);
      border-bottom: 1px solid var(--color-border);

      h2 {
        font-size: 1.125rem;
        font-weight: 600;
        margin: 0 0 var(--space-1) 0;
        color: var(--color-text);
      }

      p {
        color: var(--color-text-muted);
        font-size: 0.8125rem;
        margin: 0;
      }
    }
    
    @media (min-width: 640px) {
      .section-header {
        margin-bottom: var(--space-5);
        padding-bottom: var(--space-4);
      }
      
      .section-header h2 {
        font-size: 1.25rem;
      }
      
      .section-header p {
        font-size: 0.875rem;
      }
    }

    /* ==========================================
       FORM ELEMENTS - Mobile First
       ========================================== */
    .form-row {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    @media (min-width: 640px) {
      .form-row {
        flex-direction: row;
        gap: var(--space-4);
      }
      
      .form-row .form-group {
        flex: 1;
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      margin-bottom: var(--space-3);

      label {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--color-text);
      }

      input, select, textarea {
        width: 100%;
        padding: var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        font-size: 1rem; /* 16px prevents zoom on iOS */
        background: var(--color-surface);
        color: var(--color-text);
        min-height: 44px; /* Touch-friendly */

        &:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px var(--color-primary-light);
        }
      }

      textarea {
        resize: vertical;
        min-height: 100px;
      }

      .input-short {
        max-width: 100%;
      }

      .code-input {
        font-family: monospace;
        font-size: 0.875rem;
      }
    }

    @media (min-width: 640px) {
      .form-group {
        margin-bottom: var(--space-4);
      }
      
      .form-group input,
      .form-group select,
      .form-group textarea {
        font-size: 0.9375rem;
      }
      
      .form-group .input-short {
        max-width: 120px;
      }
    }

    .hint {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      line-height: 1.4;
    }
    
    @media (min-width: 640px) {
      .hint {
        font-size: 0.8125rem;
      }
    }

    /* ==========================================
       LOGO UPLOAD - Mobile First
       ========================================== */
    .logo-upload-wrapper {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      align-items: center;
    }
    
    @media (min-width: 480px) {
      .logo-upload-wrapper {
        flex-direction: row;
        align-items: flex-start;
      }
    }

    .current-logo {
      position: relative;
      width: 120px;
      height: 120px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-2);
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-surface);
      flex-shrink: 0;

      img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }

      .btn-icon-danger {
        position: absolute;
        top: -10px;
        right: -10px;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--color-error);
        color: white;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        touch-action: manipulation;
      }
    }
    
    @media (min-width: 640px) {
      .current-logo {
        width: 100px;
        height: 100px;
      }
      
      .current-logo .btn-icon-danger {
        width: 24px;
        height: 24px;
        top: -8px;
        right: -8px;
        font-size: 12px;
      }
    }

    .upload-controls {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      align-items: center;
      text-align: center;
    }
    
    @media (min-width: 480px) {
      .upload-controls {
        align-items: flex-start;
        text-align: left;
      }
    }

    /* ==========================================
       OPENING HOURS - Mobile First
       ========================================== */
    .opening-hours-summary {
      background: var(--color-bg);
      border-radius: var(--radius-md);
      padding: var(--space-3) var(--space-4);
      margin-bottom: var(--space-4);
      border: 1px solid var(--color-border);
      .summary-label { font-weight: 600; color: var(--color-text-muted); font-size: 0.875rem; margin-right: var(--space-2); }
      .summary-text { font-size: 0.9375rem; color: var(--color-text); }
    }
    .copy-to-other-days {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      margin-bottom: var(--space-4);
      label { font-weight: 500; font-size: 0.875rem; }
      select { padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); border: 1px solid var(--color-border); min-width: 120px; }
      .btn-sm { padding: var(--space-2) var(--space-3); font-size: 0.875rem; }
    }
    .hours-grid {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .day-row {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-3);

      &.closed {
        opacity: 0.7;
      }
    }
    
    @media (min-width: 640px) {
      .day-row {
        padding: var(--space-4);
      }
    }

    .day-header {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-bottom: var(--space-2);
    }

    .day-name {
      font-weight: 500;
      font-size: 0.9375rem;
    }

    /* Mobile: Stack hours below header */
    .hours-inputs {
      padding-left: 0;
      margin-top: var(--space-3);
    }
    
    @media (min-width: 480px) {
      .hours-inputs {
        padding-left: 52px; /* Switch width + gap */
        margin-top: 0;
      }
    }

    /* Mobile: Full-width time inputs / selects (0, 15, 30, 45 min options) */
    .time-range {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex-wrap: wrap;

      input, select {
        flex: 1;
        min-width: 90px;
        max-width: 120px;
        padding: var(--space-2) var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        font-size: 1rem;
        min-height: 40px;
        text-align: center;
        background: var(--color-bg);
        color: var(--color-text);
      }
      
      span {
        color: var(--color-text-muted);
        font-weight: 500;
      }
    }
    
    @media (min-width: 480px) {
      .time-range input, .time-range select {
        flex: 0 0 auto;
        width: 110px;
        min-width: unset;
      }
    }

    /* Split Shifts - Mobile First (Stacked) */
    .split-shifts {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);

      .shift {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        padding: var(--space-3);
        background: var(--color-bg);
        border-radius: var(--radius-sm);

        .shift-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .shift-times {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          flex-wrap: wrap;
        }

        input, select {
          flex: 1;
          min-width: 80px;
          max-width: 110px;
          padding: var(--space-2) var(--space-3);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-size: 1rem;
          min-height: 40px;
          text-align: center;
          background: var(--color-bg);
          color: var(--color-text);
        }
      }
    }
    
    @media (min-width: 480px) {
      .split-shifts .shift {
        flex-direction: row;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-2);
        background: transparent;
        
        .shift-label {
          width: 60px;
          text-transform: none;
          font-weight: 500;
        }
        
        .shift-times {
          flex-wrap: nowrap;
        }
        
        input {
          flex: 0 0 auto;
          width: 100px;
          min-width: unset;
        }
      }
    }

    .break-option {
      margin-top: var(--space-3);
      padding-top: var(--space-3);
      border-top: 1px dashed var(--color-border);
    }
    
    .checkbox-small {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: 0.875rem;
      cursor: pointer;
      min-height: 44px; /* Touch target */
      
      input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }
    }

    .personnel-per-shift {
      margin-top: var(--space-3);
      padding-top: var(--space-3);
      border-top: 1px dashed var(--color-border);
    }
    .personnel-label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-muted);
      margin-bottom: var(--space-2);
    }
    .personnel-inputs {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-4);
    }
    .personnel-field {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      label { font-size: 0.8125rem; color: var(--color-text-muted); white-space: nowrap; }
    }
    .personnel-field .input-number {
      width: 3rem;
      padding: var(--space-1) var(--space-2);
      font-size: 0.875rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      text-align: center;
    }

    .closed-badge {
      display: inline-block;
      padding: var(--space-2) var(--space-3);
      background: var(--color-bg);
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      margin-left: auto;
    }

    /* ==========================================
       SWITCHES - Touch-Friendly
       ========================================== */
    .switch {
      position: relative;
      display: inline-block;
      width: 48px;
      height: 28px;
      flex-shrink: 0;
      touch-action: manipulation;

      input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #cbd5e1;
        transition: .3s;

        &:before {
          position: absolute;
          content: "";
          height: 22px;
          width: 22px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .3s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
      }

      input:checked + .slider {
        background-color: var(--color-primary);
      }

      input:checked + .slider:before {
        transform: translateX(20px);
      }

      .slider.round {
        border-radius: 34px;
      }

      .slider.round:before {
        border-radius: 50%;
      }
    }
    
    @media (min-width: 640px) {
      .switch {
        width: 40px;
        height: 24px;
      }
      
      .switch .slider:before {
        height: 18px;
        width: 18px;
      }
      
      .switch input:checked + .slider:before {
        transform: translateX(16px);
      }
    }

    .checkbox-row {
      flex-direction: column;
      gap: var(--space-3);
    }
    
    @media (min-width: 480px) {
      .checkbox-row {
        flex-direction: row;
        align-items: flex-start;
      }
    }

    .check-label {
      font-weight: 500;
    }

    /* ==========================================
       DIVIDERS & HEADINGS
       ========================================== */
    .divider {
      height: 1px;
      background: var(--color-border);
      margin: var(--space-4) 0;
    }
    
    @media (min-width: 640px) {
      .divider {
        margin: var(--space-5) 0;
      }
    }
    
    .section-desc {
      color: var(--color-text-muted);
      font-size: 0.875rem;
      margin-bottom: var(--space-4);
    }
    
    .location-settings {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      padding: var(--space-4);
      background: var(--color-bg);
      border-radius: var(--radius-md);
      margin-top: var(--space-3);
    }

    h3 {
      font-size: 0.9375rem;
      font-weight: 600;
      margin: 0 0 var(--space-3) 0;
    }
    
    @media (min-width: 640px) {
      h3 {
        font-size: 1rem;
        margin: 0 0 var(--space-4) 0;
      }
    }

    /* ==========================================
       BUTTONS - Touch-Friendly
       ========================================== */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-5);
      border: none;
      border-radius: var(--radius-md);
      font-size: 0.9375rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      min-height: 48px; /* Touch-friendly */
      touch-action: manipulation;
      width: 100%;

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }
    
    @media (min-width: 640px) {
      .btn {
        min-height: 44px;
        padding: var(--space-3) var(--space-4);
        font-size: 0.875rem;
        width: auto;
      }
    }

    .btn-primary {
      background: var(--color-primary);
      color: white;

      &:hover:not(:disabled) {
        background: var(--color-primary-hover);
      }
      
      &:active:not(:disabled) {
        transform: scale(0.98);
      }
    }

    .btn-secondary {
      background: var(--color-surface);
      color: var(--color-text);
      border: 1px solid var(--color-border);

      &:hover:not(:disabled) {
        background: var(--color-bg);
      }
      
      &:active:not(:disabled) {
        transform: scale(0.98);
      }
    }

    /* ==========================================
       FORM ACTIONS - Mobile First
       ========================================== */
    .form-actions {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      padding-top: var(--space-4);
      border-top: 1px solid var(--color-border);
      margin-top: var(--space-4);
    }

    @media (min-width: 640px) {
      .form-actions {
        flex-direction: row;
        justify-content: flex-end;
        padding-top: var(--space-5);
        margin-top: var(--space-5);
      }
    }

    /* ==========================================
       LOADING STATE
       ========================================== */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-6);
      color: var(--color-text-muted);
    }
    
    @media (min-width: 640px) {
      .loading-state {
        padding: var(--space-8);
      }
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: var(--space-4);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ==========================================
       TOASTS - Mobile First
       ========================================== */
    .toast {
      position: fixed;
      bottom: env(safe-area-inset-bottom, 16px);
      right: var(--space-4);
      left: var(--space-4);
      padding: var(--space-4);
      border-radius: var(--radius-md);
      color: white;
      font-weight: 500;
      animation: slideUp 0.3s ease;
      z-index: 100;
      text-align: center;

      &.success {
        background: var(--color-success);
      }

      &.error {
        background: var(--color-error);
      }
    }

    @media (min-width: 640px) {
      .toast {
        left: auto;
        max-width: 400px;
      }
    }

    .timezone-select-wrapper {
      position: relative;
    }

    .timezone-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      max-height: 200px;
      overflow-y: auto;
      background: var(--color-bg, #fff);
      border: 1px solid var(--color-border, #ddd);
      border-radius: 0 0 8px 8px;
      z-index: 10;
    }

    .timezone-option {
      padding: 8px 12px;
      cursor: pointer;
      font-size: 0.9rem;
    }

    .timezone-option:hover,
    .timezone-option.selected {
      background: var(--color-primary-light, #f0e6e0);
    }

    .field-hint {
      display: block;
      margin-top: 4px;
      font-size: 0.8rem;
      color: var(--color-text-secondary, #666);
    }

    .field-warning {
      color: var(--color-warning, #e67e22);
    }

    @keyframes slideUp {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `]
})
export class SettingsComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private sanitizer = inject(DomSanitizer);

  settings = signal<TenantSettings | null>(null);
  activeSection = signal<'general' | 'contact' | 'hours' | 'payments' | 'email' | 'translations'>('general');
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  logoPreview = signal<string | null>(null);
  logoFile: File | null = null;

  daysOfWeek = [
    { key: 'monday', label: 'SETTINGS.DAY_MONDAY' },
    { key: 'tuesday', label: 'SETTINGS.DAY_TUESDAY' },
    { key: 'wednesday', label: 'SETTINGS.DAY_WEDNESDAY' },
    { key: 'thursday', label: 'SETTINGS.DAY_THURSDAY' },
    { key: 'friday', label: 'SETTINGS.DAY_FRIDAY' },
    { key: 'saturday', label: 'SETTINGS.DAY_SATURDAY' },
    { key: 'sunday', label: 'SETTINGS.DAY_SUNDAY' }
  ];

  /** Time options for opening hours: 00:00, 00:15, 00:30, 00:45, ... 23:45 (European 24h). */
  timeOptions: string[] = (() => {
    const opts: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (const m of [0, 15, 30, 45]) {
        opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return opts;
  })();

  copyFromDayKey = 'monday';

  /** Role keys for personnel-per-shift (stored in opening_hours JSON per day). */
  readonly staffRoleKeys: { key: string; labelKey: string }[] = [
    { key: 'bar', labelKey: 'SETTINGS.STAFF_BAR' },
    { key: 'waiter', labelKey: 'SETTINGS.STAFF_WAITER' },
    { key: 'kitchen', labelKey: 'SETTINGS.STAFF_KITCHEN' },
    { key: 'receptionist', labelKey: 'SETTINGS.STAFF_RECEPTIONIST' },
  ];

  openingHours: Record<string, {
    open: string;
    close: string;
    closed: boolean;
    hasBreak?: boolean;
    morningOpen?: string;
    morningClose?: string;
    eveningOpen?: string;
    eveningClose?: string;
    bar?: number;
    waiter?: number;
    kitchen?: number;
    receptionist?: number;
  }> = {};

  formData: Partial<TenantSettings> = {
    name: '',
    business_type: null,
    description: null,
    phone: null,
    whatsapp: null,
    email: null,
    address: null,
    website: null,
    tax_id: null,
    cif: null,
    opening_hours: null,
    currency: null,
    stripe_secret_key: null,
    stripe_publishable_key: null,
    immediate_payment_required: false,
    timezone: null,
    smtp_host: null,
    smtp_port: null,
    smtp_use_tls: null,
    smtp_user: null,
    smtp_password: null,
    email_from: null,
    email_from_name: null,
  };

  allTimezones: string[] = [];
  filteredTimezones: string[] = [];
  timezoneSearch = '';
  timezoneDropdownOpen = false;

  ngOnInit() {
    try {
      this.allTimezones = (Intl as any).supportedValuesOf('timeZone');
    } catch {
      this.allTimezones = [];
    }
    this.filteredTimezones = this.allTimezones;
    this.loadSettings();
  }

  loadSettings() {
    this.loading.set(true);
    this.api.getTenantSettings().subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.formData = {
          name: settings.name || '',
          business_type: settings.business_type || null,
          description: settings.description || null,
          phone: settings.phone || null,
          whatsapp: settings.whatsapp || null,
          email: settings.email || null,
          address: settings.address || null,
          website: settings.website || null,
          tax_id: settings.tax_id || null,
          cif: settings.cif || null,
          opening_hours: settings.opening_hours || null,
          currency: settings.currency || null,
          stripe_secret_key: null,
          stripe_publishable_key: settings.stripe_publishable_key || null,
          immediate_payment_required: settings.immediate_payment_required || false,
          timezone: settings.timezone || null,
          smtp_host: settings.smtp_host ?? null,
          smtp_port: settings.smtp_port ?? null,
          smtp_use_tls: settings.smtp_use_tls ?? null,
          smtp_user: settings.smtp_user ?? null,
          smtp_password: null,
          email_from: settings.email_from ?? null,
          email_from_name: settings.email_from_name ?? null,
        };
        this.timezoneSearch = settings.timezone || '';
        this.parseOpeningHours(settings.opening_hours);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load settings. Please try again.');
        this.loading.set(false);
        console.error('Error loading settings:', err);
      }
    });
  }

  filterTimezones() {
    const q = this.timezoneSearch.toLowerCase();
    this.filteredTimezones = q
      ? this.allTimezones.filter(tz => tz.toLowerCase().includes(q))
      : this.allTimezones;
  }

  selectTimezone(tz: string) {
    this.formData.timezone = tz;
    this.timezoneSearch = tz;
    this.timezoneDropdownOpen = false;
  }

  parseOpeningHours(jsonString: string | null | undefined) {
    // Initialize all days with default values
    this.daysOfWeek.forEach(day => {
      this.openingHours[day.key] = {
        open: '09:00',
        close: '22:00',
        closed: false,
        hasBreak: false,
        morningOpen: '09:00',
        morningClose: '14:00',
        eveningOpen: '17:00',
        eveningClose: '22:00',
        bar: 0,
        waiter: 0,
        kitchen: 0,
        receptionist: 0,
      };
    });

    // Parse JSON if provided; round all times to :00, :15, :30, :45
    if (jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        this.daysOfWeek.forEach(day => {
          if (parsed[day.key]) {
            const dayData = parsed[day.key];
            const num = (v: unknown) => (typeof v === 'number' && v >= 0 && Number.isInteger(v) ? v : 0);
            this.openingHours[day.key] = {
              open: this.roundTimeToQuarter(dayData.open || '09:00'),
              close: this.roundTimeToQuarter(dayData.close || '22:00'),
              closed: dayData.closed === true,
              hasBreak: dayData.hasBreak === true,
              morningOpen: this.roundTimeToQuarter(dayData.morningOpen || dayData.open || '09:00'),
              morningClose: this.roundTimeToQuarter(dayData.morningClose || '14:00'),
              eveningOpen: this.roundTimeToQuarter(dayData.eveningOpen || '17:00'),
              eveningClose: this.roundTimeToQuarter(dayData.eveningClose || dayData.close || '22:00'),
              bar: num(dayData.bar),
              waiter: num(dayData.waiter),
              kitchen: num(dayData.kitchen),
              receptionist: num(dayData.receptionist),
            };
          }
        });
      } catch (e) {
        console.error('Error parsing opening hours JSON:', e);
      }
    }
  }

  toggleDayClosed(dayKey: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.openingHours[dayKey].closed = !checked;
    this.serializeOpeningHours();
  }

  toggleBreak(dayKey: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.openingHours[dayKey].hasBreak = checked;
    // If enabling break, initialize with default values if not set
    if (checked) {
      if (!this.openingHours[dayKey].morningOpen) {
        this.openingHours[dayKey].morningOpen = this.openingHours[dayKey].open || '09:00';
      }
      if (!this.openingHours[dayKey].morningClose) {
        this.openingHours[dayKey].morningClose = '14:00';
      }
      if (!this.openingHours[dayKey].eveningOpen) {
        this.openingHours[dayKey].eveningOpen = '17:00';
      }
      if (!this.openingHours[dayKey].eveningClose) {
        this.openingHours[dayKey].eveningClose = this.openingHours[dayKey].close || '22:00';
      }
    }
    this.serializeOpeningHours();
  }

  /** Round time string to nearest 15 minutes (00, 15, 30, 45). European 24h. */
  roundTimeToQuarter(t: string | undefined): string {
    if (!t) return '09:00';
    const [h, m] = t.split(':').map(Number);
    const quarter = Math.round((h * 60 + (m || 0)) / 15) * 15;
    const nh = Math.floor(quarter / 60) % 24;
    const nm = quarter % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
  }

  updateOpeningHours(dayKey: string, field: 'open' | 'close' | 'morningOpen' | 'morningClose' | 'eveningOpen' | 'eveningClose', event: Event) {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.setOpeningHourValue(dayKey, field, value);
  }

  setOpeningHourValue(dayKey: string, field: 'open' | 'close' | 'morningOpen' | 'morningClose' | 'eveningOpen' | 'eveningClose', value: string) {
    (this.openingHours[dayKey] as any)[field] = this.roundTimeToQuarter(value);
    this.serializeOpeningHours();
  }

  copyDayToOtherDays(sourceKey: string) {
    const source = this.openingHours[sourceKey];
    if (!source) return;
    this.daysOfWeek.forEach(day => {
      if (day.key === sourceKey) return;
      this.openingHours[day.key] = {
        ...source,
        open: source.open,
        close: source.close,
        closed: source.closed,
        hasBreak: source.hasBreak,
        morningOpen: source.morningOpen,
        morningClose: source.morningClose,
        eveningOpen: source.eveningOpen,
        eveningClose: source.eveningClose,
        bar: source.bar ?? 0,
        waiter: source.waiter ?? 0,
        kitchen: source.kitchen ?? 0,
        receptionist: source.receptionist ?? 0,
      };
    });
    this.serializeOpeningHours();
  }

  /** Formatted opening hours summary in current locale, e.g. "Mon–Fri 09:00–22:00, Sat 10:00–20:00, Sun closed". */
  getOpeningHoursSummary(): string {
    const locale = this.translate.currentLang || this.translate.defaultLang || 'en';
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const dayShort = (key: string) => {
      const i = this.daysOfWeek.findIndex(d => d.key === key);
      if (i < 0) return key;
      return formatter.format(new Date(2024, 0, 1 + i));
    };
    const closedLabel = this.translate.instant('SETTINGS.CLOSED');
    const parts: string[] = [];
    let i = 0;
    while (i < this.daysOfWeek.length) {
      const day = this.daysOfWeek[i];
      const d = this.openingHours[day.key];
      if (!d) {
        i++;
        continue;
      }
      if (d.closed) {
        parts.push(`${dayShort(day.key)} ${closedLabel}`);
        i++;
        continue;
      }
      const range = d.hasBreak
        ? `${d.morningOpen}–${d.morningClose}, ${d.eveningOpen}–${d.eveningClose}`
        : `${d.open}–${d.close}`;
      let j = i + 1;
      while (j < this.daysOfWeek.length) {
        const next = this.openingHours[this.daysOfWeek[j].key];
        if (!next || next.closed !== d.closed || next.hasBreak !== d.hasBreak) break;
        if (d.hasBreak) {
          if (next.morningOpen !== d.morningOpen || next.morningClose !== d.morningClose ||
              next.eveningOpen !== d.eveningOpen || next.eveningClose !== d.eveningClose) break;
        } else {
          if (next.open !== d.open || next.close !== d.close) break;
        }
        j++;
      }
      if (j > i + 1) {
        parts.push(`${dayShort(day.key)}–${dayShort(this.daysOfWeek[j - 1].key)} ${range}`);
      } else {
        parts.push(`${dayShort(day.key)} ${range}`);
      }
      i = j;
    }
    return parts.join(', ');
  }

  serializeOpeningHours() {
    const serialized: Record<string, any> = {};
    this.daysOfWeek.forEach(day => {
      const dayData = this.openingHours[day.key];
      const staff = {
        bar: dayData.bar ?? 0,
        waiter: dayData.waiter ?? 0,
        kitchen: dayData.kitchen ?? 0,
        receptionist: dayData.receptionist ?? 0,
      };
      if (dayData.hasBreak) {
        serialized[day.key] = {
          closed: dayData.closed,
          hasBreak: true,
          morningOpen: dayData.morningOpen,
          morningClose: dayData.morningClose,
          eveningOpen: dayData.eveningOpen,
          eveningClose: dayData.eveningClose,
          open: dayData.morningOpen,
          close: dayData.eveningClose,
          ...staff,
        };
      } else {
        serialized[day.key] = {
          closed: dayData.closed,
          open: dayData.open,
          close: dayData.close,
          ...staff,
        };
      }
    });
    this.formData.opening_hours = JSON.stringify(serialized);
  }

  getStaffRequired(dayKey: string, roleKey: string): number {
    const day = this.openingHours[dayKey];
    return day && typeof (day as any)[roleKey] === 'number' ? (day as any)[roleKey] : 0;
  }

  setStaffRequired(dayKey: string, roleKey: string, value: number): void {
    const role = roleKey as 'bar' | 'waiter' | 'kitchen' | 'receptionist';
    const n = Math.max(0, Math.min(99, Math.floor(Number(value)) || 0));
    (this.openingHours[dayKey] as any)[role] = n;
    this.serializeOpeningHours();
  }

  onLogoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 2 * 1024 * 1024) {
        this.error.set('File size must be less than 2MB');
        return;
      }
      this.logoFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.logoPreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      this.error.set(null);
    }
  }

  removeLogo() {
    this.logoFile = null;
    this.logoPreview.set(null);
    // Note: To actually remove from server, we'd need a DELETE endpoint
    // For now, just clear the preview
  }

  getLogoUrl(): string | null {
    const settings = this.settings();
    if (!settings?.logo_filename || !settings.id) return null;
    return this.api.getTenantLogoUrl(settings.logo_filename, settings.id);
  }

  /** Safe URL for logo img (avoids Angular stripping API URL). Use for server logo; data URL from preview is used as-is. */
  getDisplayLogoSrc(): string | SafeResourceUrl | null {
    const preview = this.logoPreview();
    if (preview) return preview;
    const url = this.getLogoUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  }

  saveSettings() {
    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);

    // First upload logo if selected
    if (this.logoFile) {
      this.api.uploadTenantLogo(this.logoFile).subscribe({
        next: (updatedSettings) => {
          this.settings.set(updatedSettings);
          this.logoFile = null;
          this.logoPreview.set(null);
          // Then update other settings
          this.updateSettings();
        },
        error: (err) => {
          this.error.set('Failed to upload logo. Please try again.');
          this.saving.set(false);
          console.error('Error uploading logo:', err);
        }
      });
    } else {
      this.updateSettings();
    }
  }

  private updateSettings() {
    // Ensure opening hours are serialized before saving
    this.serializeOpeningHours();

    // Prepare update data - only include stripe_secret_key if it was actually changed
    const updateData = { ...this.formData };

    if (updateData.stripe_secret_key === '') {
      delete updateData.stripe_secret_key;
    }
    if (updateData.smtp_password === '') {
      delete updateData.smtp_password;
    }

    this.api.updateTenantSettings(updateData).subscribe({
      next: (updatedSettings) => {
        this.settings.set(updatedSettings);
        this.success.set('Settings saved successfully!');
        this.saving.set(false);
        setTimeout(() => this.success.set(null), 3000);
      },
      error: (err) => {
        this.error.set('Failed to save settings. Please try again.');
        this.saving.set(false);
        console.error('Error updating settings:', err);
      }
    });
  }

  cancel() {
    this.router.navigate(['/dashboard']);
  }

  useCurrentLocation() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.formData.latitude = position.coords.latitude;
          this.formData.longitude = position.coords.longitude;
        },
        (error) => {
          console.error('Error getting location:', error);
          this.error.set('Could not get your location. Please enter coordinates manually.');
          setTimeout(() => this.error.set(null), 3000);
        },
        { timeout: 10000, maximumAge: 60000 }
      );
    } else {
      this.error.set('Geolocation is not supported by your browser.');
      setTimeout(() => this.error.set(null), 3000);
    }
  }
}
