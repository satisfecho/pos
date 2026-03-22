import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService, Provider, ProviderCreate, ProviderProduct, ProviderProductCreate, Tax, TenantSettings } from '../services/api.service';
import { SidebarComponent } from '../shared/sidebar.component';
import { FocusFirstInputDirective } from '../shared/focus-first-input.directive';
import { TranslationsComponent } from '../translations/translations.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, FocusFirstInputDirective, TranslateModule, TranslationsComponent],
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
            [class.active]="activeSection() === 'reservations'"
            (click)="activeSection.set('reservations')">
            <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>{{ 'SETTINGS.RESERVATIONS' | translate }}</span>
          </button>
          
          <button 
            type="button" 
            class="tab" 
            [class.active]="activeSection() === 'taxes'"
            (click)="activeSection.set('taxes'); loadTaxesAll()">
            <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
            <span>{{ 'SETTINGS.TAXES' | translate }}</span>
          </button>
          <button 
            type="button" 
            class="tab" 
            data-testid="settings-providers-tab"
            [class.active]="activeSection() === 'providers'"
            (click)="activeSection.set('providers'); loadProviders()">
            <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>{{ 'SETTINGS.PROVIDERS' | translate }}</span>
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
          <button 
            type="button" 
            class="tab" 
            [class.active]="activeSection() === 'security'"
            (click)="activeSection.set('security'); loadOtpStatus()">
            <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            <span>{{ 'SETTINGS.SECURITY' | translate }}</span>
          </button>
        </div>
      </div>

      <div class="content">
        @if (loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>{{ 'SETTINGS.LOADING_SETTINGS' | translate }}</p>
          </div>
        } @else if (activeSection() === 'taxes') {
          <!-- Taxes (IVA) Section -->
          <div class="section">
            <div class="section-header">
              <h2>{{ 'SETTINGS.TAXES' | translate }}</h2>
              <p>{{ 'SETTINGS.TAXES_SUBTITLE' | translate }}</p>
            </div>
            <div class="taxes-list">
              <table class="settings-table">
                <thead>
                  <tr>
                    <th>{{ 'SETTINGS.TAX_NAME' | translate }}</th>
                    <th>{{ 'SETTINGS.TAX_RATE' | translate }}</th>
                    <th>{{ 'SETTINGS.TAX_VALID_FROM' | translate }}</th>
                    <th>{{ 'SETTINGS.TAX_VALID_TO' | translate }}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (t of taxes(); track t.id) {
                    <tr>
                      <td>{{ t.name }}</td>
                      <td>{{ t.rate_percent }}%</td>
                      <td>{{ t.valid_from }}</td>
                      <td>{{ t.valid_to || '—' }}</td>
                      <td>
                        <button type="button" class="btn btn-sm btn-secondary" (click)="deleteTax(t.id)" [disabled]="settings()?.default_tax_id === t.id">
                          {{ 'COMMON.DELETE' | translate }}
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="form-card" style="margin-top: 1rem;">
              <h3>{{ 'SETTINGS.ADD_TAX' | translate }}</h3>
              <form (ngSubmit)="addTax()" class="form-inline">
                <input type="text" [(ngModel)]="newTaxName" name="newTaxName" [placeholder]="'SETTINGS.TAX_NAME_PLACEHOLDER' | translate" required />
                <input type="number" min="0" max="100" [(ngModel)]="newTaxRate" name="newTaxRate" placeholder="10" style="width: 4rem;" />
                <span>%</span>
                <input type="date" [(ngModel)]="newTaxValidFrom" name="newTaxValidFrom" required />
                <input type="date" [(ngModel)]="newTaxValidTo" name="newTaxValidTo" placeholder="Optional" />
                <button type="submit" class="btn btn-primary">{{ 'SETTINGS.ADD_TAX_BUTTON' | translate }}</button>
              </form>
              @if (taxError()) {
                <p class="field-error">{{ taxError() }}</p>
              }
            </div>
          </div>
        } @else if (activeSection() === 'providers') {
          <!-- Providers Section -->
          <div class="section" data-testid="settings-providers-section">
            <div class="section-header">
              <h2>{{ 'SETTINGS.PROVIDERS' | translate }}</h2>
              <p>{{ 'SETTINGS.PROVIDERS_SUBTITLE' | translate }}</p>
            </div>
            @if (providersLoading()) {
              <div class="loading-state"><div class="spinner"></div><p>{{ 'SETTINGS.LOADING_SETTINGS' | translate }}</p></div>
            } @else {
              <div class="form-card" style="margin-bottom: 1rem;">
                <button type="button" class="btn btn-primary" data-testid="settings-add-provider-btn" (click)="openAddProviderModal()">{{ 'SETTINGS.ADD_PROVIDER' | translate }}</button>
              </div>
              <table class="settings-table">
                <thead>
                  <tr>
                    <th>{{ 'SETTINGS.PROVIDER_NAME' | translate }}</th>
                    <th>{{ 'SETTINGS.PROVIDER_TYPE' | translate }}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of providers(); track p.id) {
                    <tr>
                      <td>{{ p.name }}</td>
                      <td>{{ isOwnProvider(p) ? ('SETTINGS.PROVIDER_PERSONAL' | translate) : ('SETTINGS.PROVIDER_CATALOG' | translate) }}</td>
                      <td>
                        @if (isOwnProvider(p)) {
                          <button type="button" class="btn btn-sm btn-secondary" (click)="openAddProductModal(p)">{{ 'SETTINGS.ADD_PRODUCT_TO_PROVIDER' | translate }}</button>
                          <button type="button" class="btn btn-sm btn-secondary" (click)="toggleProviderProducts(p)" style="margin-left: 0.25rem;">
                            {{ (p.id != null && providerProductsExpanded().has(p.id)) ? ('SETTINGS.HIDE_PRODUCTS' | translate) : ('SETTINGS.SHOW_PRODUCTS' | translate) }}
                          </button>
                        }
                      </td>
                    </tr>
                    @if (isOwnProvider(p) && p.id != null && providerProductsExpanded().has(p.id)) {
                      <tr>
                        <td colspan="3" style="padding-left: 1.5rem;">
                          @if ((providerProductsMap()[p.id] || []).length === 0) {
                            <span class="hint">{{ 'SETTINGS.NO_PRODUCTS_YET' | translate }}</span>
                          } @else {
                            <ul class="provider-products-list">
                              @for (prod of providerProductsMap()[p.id] || []; track prod.id) {
                                <li>{{ prod.name }} – {{ formatProviderPrice(prod.price_cents) }}</li>
                              }
                            </ul>
                          }
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
              @if (providersError()) {
                <p class="field-error">{{ providersError() }}</p>
              }
            }
          </div>
          <!-- Add Provider Modal -->
          @if (showAddProviderModal()) {
            <div class="modal-overlay" (click)="closeAddProviderModal()">
              <div class="modal-content" (click)="$event.stopPropagation()" appFocusFirstInput>
                <div class="modal-header">
                  <h3>{{ 'SETTINGS.ADD_PROVIDER' | translate }}</h3>
                  <button type="button" class="btn-icon" (click)="closeAddProviderModal()">×</button>
                </div>
                <form (ngSubmit)="saveProvider()">
                  <div class="modal-body">
                    <div class="form-group">
                      <label for="newProviderName">{{ 'SETTINGS.PROVIDER_NAME' | translate }} *</label>
                      <input id="newProviderName" type="text" [(ngModel)]="newProviderName" name="newProviderName" required />
                    </div>
                    <div class="form-group">
                      <label for="newProviderPhone">{{ 'SETTINGS.PROVIDER_PHONE' | translate }}</label>
                      <input id="newProviderPhone" type="text" [(ngModel)]="newProviderPhone" name="newProviderPhone" />
                    </div>
                    <div class="form-group">
                      <label for="newProviderEmail">{{ 'SETTINGS.PROVIDER_EMAIL' | translate }}</label>
                      <input id="newProviderEmail" type="email" [(ngModel)]="newProviderEmail" name="newProviderEmail" />
                    </div>
                    @if (providerError()) {
                      <p class="field-error">{{ providerError() }}</p>
                    }
                  </div>
                  <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" (click)="closeAddProviderModal()">{{ 'COMMON.CANCEL' | translate }}</button>
                    <button type="submit" class="btn btn-primary">{{ 'COMMON.SAVE' | translate }}</button>
                  </div>
                </form>
              </div>
            </div>
          }
          <!-- Add Product to Provider Modal -->
          @if (showAddProductModal()) {
            <div class="modal-overlay" (click)="closeAddProductModal()">
              <div class="modal-content" (click)="$event.stopPropagation()" appFocusFirstInput>
                <div class="modal-header">
                  <h3>{{ 'SETTINGS.ADD_PRODUCT_TO_PROVIDER' | translate }} – {{ selectedProviderForProduct()?.name }}</h3>
                  <button type="button" class="btn-icon" (click)="closeAddProductModal()">×</button>
                </div>
                <form (ngSubmit)="saveProviderProduct()">
                  <div class="modal-body">
                    <div class="form-group">
                      <label for="newProductName">{{ 'SETTINGS.PRODUCT_NAME' | translate }} *</label>
                      <input id="newProductName" type="text" [(ngModel)]="newProductName" name="newProductName" required />
                    </div>
                    <div class="form-group">
                      <label for="newProductPrice">{{ 'SETTINGS.PRODUCT_PRICE_CENTS' | translate }}</label>
                      <input id="newProductPrice" type="number" min="0" [(ngModel)]="newProductPrice" name="newProductPrice" placeholder="0" />
                    </div>
                    <div class="form-group">
                      <label for="newProductCategory">{{ 'SETTINGS.PRODUCT_CATEGORY_OPTIONAL' | translate }}</label>
                      <input id="newProductCategory" type="text" [(ngModel)]="newProductCategory" name="newProductCategory" placeholder="e.g. Supplies" />
                    </div>
                    <div class="form-group checkbox-small">
                      <input id="newProductOnSale" type="checkbox" [(ngModel)]="newProductOnSale" name="newProductOnSale" />
                      <label for="newProductOnSale">{{ 'SETTINGS.PRODUCT_ON_SALE' | translate }}</label>
                    </div>
                    @if (providerProductError()) {
                      <p class="field-error">{{ providerProductError() }}</p>
                    }
                  </div>
                  <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" (click)="closeAddProductModal()">{{ 'COMMON.CANCEL' | translate }}</button>
                    <button type="submit" class="btn btn-primary">{{ 'COMMON.SAVE' | translate }}</button>
                  </div>
                </form>
              </div>
            </div>
          }
        } @else if (activeSection() === 'translations') {
          <!-- Translations Section (Independent) -->
            <div class="section">
              <div class="section-header">
                <h2>{{ 'SETTINGS.TRANSLATIONS_TITLE' | translate }}</h2>
                <p>{{ 'SETTINGS.TRANSLATIONS_SUBTITLE' | translate }}</p>
              </div>
              <app-translations></app-translations>
            </div>
          } @else if (activeSection() === 'security') {
          <!-- Security (OTP) Section -->
          <div class="section" data-testid="settings-security-section">
            <div class="section-header">
              <h2>{{ 'SETTINGS.SECURITY' | translate }}</h2>
              <p>{{ 'SETTINGS.SECURITY_SUBTITLE' | translate }}</p>
            </div>
            @if (otpStatusLoading()) {
              <div class="loading-state"><div class="spinner"></div><p>{{ 'SETTINGS.LOADING_SETTINGS' | translate }}</p></div>
            } @else if (otpSetupResult()) {
              <div class="form-card">
                <h3>{{ 'SETTINGS.OTP_SCAN_OR_ENTER' | translate }}</h3>
                <p class="hint">{{ 'SETTINGS.OTP_ADD_TO_APP' | translate }}</p>
                <div class="otp-secret-row">
                  <code class="otp-secret">{{ otpSetupResult()?.secret }}</code>
                  <button type="button" class="btn btn-secondary btn-sm" (click)="copyOtpSecret()">{{ 'COMMON.COPY' | translate }}</button>
                </div>
                <div class="form-group" style="margin-top: 1rem;">
                  <label for="otp-confirm-code">{{ 'SETTINGS.OTP_ENTER_CODE' | translate }}</label>
                  <input id="otp-confirm-code" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" [(ngModel)]="otpConfirmCode" name="otpConfirmCode" [placeholder]="'SETTINGS.OTP_CODE_PLACEHOLDER' | translate" />
                  <button type="button" class="btn btn-primary" (click)="confirmOtpEnable()" [disabled]="!otpConfirmCode || otpConfirmCode.length !== 6 || otpConfirming()">
                    {{ otpConfirming() ? ('SETTINGS.OTP_CONFIRMING' | translate) : ('SETTINGS.OTP_ENABLE' | translate) }}
                  </button>
                  <button type="button" class="btn btn-secondary" (click)="cancelOtpSetup()">{{ 'COMMON.CANCEL' | translate }}</button>
                </div>
                @if (otpError()) {
                  <p class="field-error">{{ otpError() }}</p>
                }
              </div>
            } @else if (otpStatus()?.otp_enabled) {
              <div class="form-card">
                <p class="otp-enabled-msg">{{ 'SETTINGS.OTP_ENABLED' | translate }}</p>
                <div class="form-group">
                  <label for="otp-disable-code">{{ 'SETTINGS.OTP_DISABLE_ENTER_CODE' | translate }}</label>
                  <input id="otp-disable-code" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" [(ngModel)]="otpDisableCode" name="otpDisableCode" [placeholder]="'SETTINGS.OTP_CODE_PLACEHOLDER' | translate" />
                  <button type="button" class="btn btn-secondary" (click)="disableOtp()" [disabled]="!otpDisableCode || otpDisableCode.length !== 6 || otpDisabling()">
                    {{ otpDisabling() ? ('SETTINGS.OTP_DISABLING' | translate) : ('SETTINGS.OTP_DISABLE' | translate) }}
                  </button>
                </div>
                @if (otpError()) {
                  <p class="field-error">{{ otpError() }}</p>
                }
              </div>
            } @else {
              <div class="form-card">
                <p class="hint">{{ 'SETTINGS.OTP_DESCRIPTION' | translate }}</p>
                <button type="button" class="btn btn-primary" (click)="startOtpSetup()" [disabled]="otpSettingUp()">
                  {{ otpSettingUp() ? ('SETTINGS.OTP_SETTING_UP' | translate) : ('SETTINGS.OTP_ENABLE_BUTTON' | translate) }}
                </button>
                @if (otpError()) {
                  <p class="field-error">{{ otpError() }}</p>
                }
              </div>
            }
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

                  <!-- Header background image -->
                  <div class="form-group">
                    <label>{{ 'SETTINGS.HEADER_BACKGROUND' | translate }}</label>
                    <div class="logo-upload-wrapper">
                      @if (headerBackgroundPreview() || settings()?.header_background_filename) {
                        <div class="current-logo header-bg-preview">
                          <img [src]="getHeaderBackgroundDisplaySrc()" alt="Header background" />
                          <button type="button" class="btn-icon-danger" (click)="removeHeaderBackground()" title="{{ 'SETTINGS.REMOVE_HEADER_BACKGROUND' | translate }}">✕</button>
                        </div>
                      }
                      <div class="upload-controls">
                        <input
                          type="file"
                          id="header-bg-upload"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          (change)="onHeaderBackgroundSelected($event)"
                          hidden
                        />
                        <label for="header-bg-upload" class="btn btn-secondary">
                          {{ 'SETTINGS.UPLOAD_HEADER_BACKGROUND' | translate }}
                        </label>
                        <span class="hint">{{ 'SETTINGS.HEADER_BACKGROUND_HINT' | translate }}</span>
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
                    <label for="public_background_color">{{ 'SETTINGS.PUBLIC_BACKGROUND_COLOR' | translate }}</label>
                    <div class="background-color-row">
                      <input
                        type="color"
                        id="public_background_color"
                        [value]="formData.public_background_color || '#f5f5f5'"
                        (input)="formData.public_background_color = $any($event.target).value"
                        class="color-input"
                      />
                      <input
                        type="text"
                        [(ngModel)]="formData.public_background_color"
                        name="public_background_color_hex"
                        placeholder="#1E22AA"
                        class="hex-input"
                      />
                      <button type="button" class="btn btn-secondary btn-sm" (click)="formData.public_background_color = '#1E22AA'" title="RAL5002 Azul">
                        {{ 'SETTINGS.PRESET_RAL5002' | translate }}
                      </button>
                    </div>
                    <small class="field-hint">{{ 'SETTINGS.PUBLIC_BACKGROUND_COLOR_HINT' | translate }}</small>
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

                  <div class="form-group">
                    <label for="public_google_review_url">{{ 'SETTINGS.PUBLIC_GOOGLE_REVIEW_URL' | translate }}</label>
                    <input
                      type="url"
                      id="public_google_review_url"
                      [(ngModel)]="formData.public_google_review_url"
                      name="public_google_review_url"
                      [placeholder]="'SETTINGS.PUBLIC_GOOGLE_REVIEW_PLACEHOLDER' | translate"
                    />
                    <small class="field-hint">{{ 'SETTINGS.PUBLIC_GOOGLE_REVIEW_HINT' | translate }}</small>
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
                  <div class="form-group">
                    <label for="default_tax_id">{{ 'SETTINGS.DEFAULT_TAX' | translate }}</label>
                    <select id="default_tax_id" [(ngModel)]="formData.default_tax_id" name="default_tax_id">
                      <option [ngValue]="null">{{ 'SETTINGS.NO_DEFAULT_TAX' | translate }}</option>
                      @for (t of taxes(); track t.id) {
                        <option [ngValue]="t.id">{{ t.name }} ({{ t.rate_percent }}%)</option>
                      }
                    </select>
                    <small class="field-hint">{{ 'SETTINGS.DEFAULT_TAX_HINT' | translate }}</small>
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

                  <h3>{{ 'SETTINGS.REVOLUT_INTEGRATION' | translate }}</h3>
                  <div class="form-group">
                    <label>{{ 'SETTINGS.REVOLUT_MERCHANT_SECRET' | translate }}</label>
                    <input type="password" [(ngModel)]="formData.revolut_merchant_secret" name="revolut_merchant_secret" placeholder="••••••••••••••••" />
                    <p class="hint">{{ 'SETTINGS.REVOLUT_MERCHANT_SECRET_HINT' | translate }}</p>
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

              <!-- Reservations Section -->
              @if (activeSection() === 'reservations') {
                <div class="section">
                  <div class="section-header">
                    <h2>{{ 'SETTINGS.RESERVATIONS' | translate }}</h2>
                    <p>{{ 'SETTINGS.RESERVATIONS_SUBTITLE' | translate }}</p>
                  </div>
                  <div class="form-group">
                    <label for="reservation_prepayment_cents">{{ 'SETTINGS.RESERVATION_PREPAYMENT' | translate }}</label>
                    <input type="number" id="reservation_prepayment_cents" min="0" step="1" [(ngModel)]="formData.reservation_prepayment_cents" name="reservation_prepayment_cents" [placeholder]="'SETTINGS.RESERVATION_PREPAYMENT_PLACEHOLDER' | translate" />
                    <small class="field-hint">{{ 'SETTINGS.RESERVATION_PREPAYMENT_HINT' | translate }}</small>
                  </div>
                  <div class="form-group">
                    <label for="reservation_prepayment_text">{{ 'SETTINGS.RESERVATION_PREPAYMENT_TEXT' | translate }}</label>
                    <textarea id="reservation_prepayment_text" [(ngModel)]="formData.reservation_prepayment_text" name="reservation_prepayment_text" rows="3" [placeholder]="'SETTINGS.RESERVATION_PREPAYMENT_TEXT_PLACEHOLDER' | translate"></textarea>
                    <small class="field-hint">{{ 'SETTINGS.RESERVATION_PREPAYMENT_TEXT_HINT' | translate }}</small>
                  </div>
                  <div class="form-group">
                    <label for="reservation_cancellation_policy">{{ 'SETTINGS.RESERVATION_CANCELLATION_POLICY' | translate }}</label>
                    <textarea id="reservation_cancellation_policy" [(ngModel)]="formData.reservation_cancellation_policy" name="reservation_cancellation_policy" rows="2" [placeholder]="'SETTINGS.RESERVATION_CANCELLATION_POLICY_PLACEHOLDER' | translate"></textarea>
                  </div>
                  <div class="form-group">
                    <label for="reservation_arrival_tolerance_minutes">{{ 'SETTINGS.RESERVATION_ARRIVAL_TOLERANCE' | translate }}</label>
                    <input type="number" id="reservation_arrival_tolerance_minutes" min="0" max="120" [(ngModel)]="formData.reservation_arrival_tolerance_minutes" name="reservation_arrival_tolerance_minutes" placeholder="15" />
                    <small class="field-hint">{{ 'SETTINGS.RESERVATION_ARRIVAL_TOLERANCE_HINT' | translate }}</small>
                  </div>
                  <div class="form-group">
                    <label for="reservation_average_table_turn_minutes">{{ 'SETTINGS.RESERVATION_AVG_TABLE_TURN' | translate }}</label>
                    <input type="number" id="reservation_average_table_turn_minutes" min="0" max="1440" [(ngModel)]="formData.reservation_average_table_turn_minutes" name="reservation_average_table_turn_minutes" placeholder="60" />
                    <small class="field-hint">{{ 'SETTINGS.RESERVATION_AVG_TABLE_TURN_HINT' | translate }}</small>
                  </div>
                  <div class="form-group">
                    <label for="reservation_walk_in_tables_reserved">{{ 'SETTINGS.RESERVATION_WALK_IN_TABLES' | translate }}</label>
                    <input type="number" id="reservation_walk_in_tables_reserved" min="0" max="99" [(ngModel)]="formData.reservation_walk_in_tables_reserved" name="reservation_walk_in_tables_reserved" placeholder="0" />
                    <small class="field-hint">{{ 'SETTINGS.RESERVATION_WALK_IN_TABLES_HINT' | translate }}</small>
                  </div>
                  <div class="form-group">
                    <label for="reservation_dress_code">{{ 'SETTINGS.RESERVATION_DRESS_CODE' | translate }}</label>
                    <input type="text" id="reservation_dress_code" [(ngModel)]="formData.reservation_dress_code" name="reservation_dress_code" [placeholder]="'SETTINGS.RESERVATION_DRESS_CODE_PLACEHOLDER' | translate" />
                  </div>
                  <h3 class="subsection-title">{{ 'SETTINGS.REMINDER_SCHEDULE' | translate }}</h3>
                  <p class="subsection-desc">{{ 'SETTINGS.REMINDER_SCHEDULE_DESC' | translate }}</p>
                  <div class="form-group checkbox-row">
                    <label class="switch">
                      <input type="checkbox" [(ngModel)]="formData.reservation_reminder_24h_enabled" name="reservation_reminder_24h_enabled">
                      <span class="slider round"></span>
                    </label>
                    <div>
                      <label class="check-label">{{ 'SETTINGS.RESERVATION_REMINDER_24H' | translate }}</label>
                      <p class="hint">{{ 'SETTINGS.RESERVATION_REMINDER_24H_HINT' | translate }}</p>
                    </div>
                  </div>
                  <div class="form-group checkbox-row">
                    <label class="switch">
                      <input type="checkbox" [(ngModel)]="formData.reservation_reminder_2h_enabled" name="reservation_reminder_2h_enabled">
                      <span class="slider round"></span>
                    </label>
                    <div>
                      <label class="check-label">{{ 'SETTINGS.RESERVATION_REMINDER_2H' | translate }}</label>
                      <p class="hint">{{ 'SETTINGS.RESERVATION_REMINDER_2H_HINT' | translate }}</p>
                    </div>
                  </div>
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
                    <input type="text" id="smtp_user" [(ngModel)]="formData.smtp_user" name="smtp_user" placeholder="you@your-mail.com" />
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
                  <div class="section-header" style="margin-top: 1.5rem;">
                    <h3>{{ 'SETTINGS.RESERVATION_CONFIRMATION_EMAIL_TITLE' | translate }}</h3>
                    <p>{{ 'SETTINGS.RESERVATION_CONFIRMATION_EMAIL_DESC' | translate }}</p>
                  </div>
                  <div class="form-group">
                    <label for="reservation_confirmation_email_subject">{{ 'SETTINGS.RESERVATION_CONFIRMATION_SUBJECT' | translate }}</label>
                    <input type="text" id="reservation_confirmation_email_subject" [(ngModel)]="formData.reservation_confirmation_email_subject" name="reservation_confirmation_email_subject" [placeholder]="'SETTINGS.RESERVATION_CONFIRMATION_SUBJECT_PLACEHOLDER' | translate" />
                  </div>
                  <div class="form-group">
                    <label for="reservation_confirmation_email_body">{{ 'SETTINGS.RESERVATION_CONFIRMATION_BODY' | translate }}</label>
                    <textarea id="reservation_confirmation_email_body" [(ngModel)]="formData.reservation_confirmation_email_body" name="reservation_confirmation_email_body" rows="14"></textarea>
                    <p class="hint">{{ 'SETTINGS.RESERVATION_CONFIRMATION_BODY_HINT' | translate }}</p>
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
              
              @if (error()) {
                <div class="toast error">
                  <span>{{ error() }}</span>
                  <button type="button" class="toast-close" (click)="error.set(null)" aria-label="Dismiss">×</button>
                </div>
              }
              @if (success()) {
                <div class="toast success">
                  <span>{{ success() }}</span>
                  <button type="button" class="toast-close" (click)="success.set(null)" aria-label="Dismiss">×</button>
                </div>
              }
              
            </form>
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

    .background-color-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
    }
    .background-color-row .color-input {
      width: 44px;
      height: 44px;
      padding: 2px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
    }
    .background-color-row .hex-input {
      flex: 1;
      min-width: 100px;
      font-family: monospace;
    }

    .header-bg-preview {
      max-width: 320px;
    }
    .header-bg-preview img {
      width: 100%;
      height: auto;
      max-height: 120px;
      object-fit: cover;
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
    .subsection-title {
      margin-top: var(--space-4);
      padding-top: var(--space-4);
      border-top: 1px solid var(--color-border);
    }
    .subsection-desc {
      color: var(--color-text-muted);
      font-size: 0.8125rem;
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
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);

      &.success {
        background: var(--color-success);
      }

      &.error {
        background: var(--color-error);
      }
    }

    .toast-close {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.9);
      cursor: pointer;
      padding: var(--space-1);
      font-size: 1.25rem;
      line-height: 1;
    }

    .toast-close:hover {
      color: white;
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

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-content {
      background: var(--color-surface, #fff);
      border-radius: var(--radius-lg, 12px);
      max-width: 420px;
      width: 90%;
      max-height: 90vh;
      overflow: auto;
      box-shadow: var(--shadow-xl, 0 20px 25px -5px rgba(0,0,0,0.1));
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-4);
      border-bottom: 1px solid var(--color-border);
    }
    .modal-header h3 { margin: 0; font-size: 1.125rem; }
    .modal-body { padding: var(--space-4); }
    .modal-actions {
      display: flex;
      gap: var(--space-3);
      justify-content: flex-end;
      padding: var(--space-4);
      border-top: 1px solid var(--color-border);
    }
    .btn-icon {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: var(--color-text-muted);
      padding: 0 var(--space-2);
      line-height: 1;
    }
    .provider-products-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .provider-products-list li {
      padding: var(--space-1) 0;
      font-size: 0.875rem;
    }

    .otp-secret-row {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      flex-wrap: wrap;
    }
    .otp-secret {
      font-family: monospace;
      font-size: 0.875rem;
      padding: var(--space-2) var(--space-3);
      background: var(--color-bg);
      border-radius: var(--radius-sm);
      word-break: break-all;
    }
    .otp-enabled-msg {
      margin-bottom: var(--space-4);
      color: var(--color-text);
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
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);
  private sanitizer = inject(DomSanitizer);

  settings = signal<TenantSettings | null>(null);
  taxes = signal<Tax[]>([]);
  taxError = signal('');
  newTaxName = '';
  newTaxRate = 10;
  newTaxValidFrom = new Date().toISOString().slice(0, 10);
  newTaxValidTo = '';
  activeSection = signal<'general' | 'contact' | 'hours' | 'payments' | 'email' | 'reservations' | 'taxes' | 'providers' | 'translations' | 'security'>('general');
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  logoPreview = signal<string | null>(null);
  logoFile: File | null = null;
  headerBackgroundPreview = signal<string | null>(null);
  headerBackgroundFile: File | null = null;

  providers = signal<Provider[]>([]);
  providersLoading = signal(false);
  providersError = signal('');
  providerProductsMap = signal<Record<number, ProviderProduct[]>>({});
  providerProductsExpanded = signal<Set<number>>(new Set());
  showAddProviderModal = signal(false);
  showAddProductModal = signal(false);
  selectedProviderForProduct = signal<Provider | null>(null);
  newProviderName = '';
  newProviderPhone = '';
  newProviderEmail = '';
  providerError = signal('');
  newProductName = '';
  newProductPrice: number | null = null;
  newProductCategory = '';
  newProductOnSale = true;
  providerProductError = signal('');

  otpStatus = signal<{ otp_enabled: boolean } | null>(null);
  otpStatusLoading = signal(false);
  otpSetupResult = signal<{ secret: string; provisioning_uri: string } | null>(null);
  otpConfirmCode = '';
  otpError = signal<string | null>(null);
  otpConfirming = signal(false);
  otpDisableCode = '';
  otpDisabling = signal(false);
  otpSettingUp = signal(false);

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
    default_tax_id: null,
    opening_hours: null,
    currency: null,
    stripe_secret_key: null,
    stripe_publishable_key: null,
    revolut_merchant_secret: null,
    immediate_payment_required: false,
    timezone: null,
    smtp_host: null,
    smtp_port: null,
    smtp_use_tls: null,
    smtp_user: null,
    smtp_password: null,
    email_from: null,
    email_from_name: null,
    reservation_confirmation_email_subject: null,
    reservation_confirmation_email_body: null,
    public_background_color: null,
    reservation_prepayment_cents: null,
    reservation_prepayment_text: null,
    reservation_cancellation_policy: null,
    reservation_arrival_tolerance_minutes: null,
    reservation_average_table_turn_minutes: null,
    reservation_walk_in_tables_reserved: 0,
    reservation_dress_code: null,
    reservation_reminder_24h_enabled: false,
    reservation_reminder_2h_enabled: false,
    public_google_review_url: null,
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
    const section = this.route.snapshot.queryParams['section'];
    if (section === 'reservations') {
      this.activeSection.set('reservations');
    }
    this.route.queryParams.subscribe((params) => {
      const s = params['section'];
      if (s === 'reservations') {
        this.activeSection.set('reservations');
      }
    });
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
          default_tax_id: settings.default_tax_id ?? null,
          opening_hours: settings.opening_hours || null,
          currency: settings.currency || null,
          stripe_secret_key: null,
          stripe_publishable_key: settings.stripe_publishable_key || null,
          revolut_merchant_secret: null,
          immediate_payment_required: settings.immediate_payment_required || false,
          timezone: settings.timezone || null,
          smtp_host: settings.smtp_host ?? null,
          smtp_port: settings.smtp_port ?? null,
          smtp_use_tls: settings.smtp_use_tls ?? null,
          smtp_user: settings.smtp_user ?? null,
          smtp_password: null,
          email_from: settings.email_from ?? null,
          email_from_name: settings.email_from_name ?? null,
          reservation_confirmation_email_subject: settings.reservation_confirmation_email_subject ?? null,
          reservation_confirmation_email_body: settings.reservation_confirmation_email_body ?? null,
          public_background_color: settings.public_background_color ?? null,
          reservation_prepayment_cents: settings.reservation_prepayment_cents ?? null,
          reservation_prepayment_text: settings.reservation_prepayment_text ?? null,
          reservation_cancellation_policy: settings.reservation_cancellation_policy ?? null,
          reservation_arrival_tolerance_minutes: settings.reservation_arrival_tolerance_minutes ?? null,
          reservation_average_table_turn_minutes: settings.reservation_average_table_turn_minutes ?? null,
          reservation_walk_in_tables_reserved: settings.reservation_walk_in_tables_reserved ?? 0,
          reservation_dress_code: settings.reservation_dress_code ?? null,
          reservation_reminder_24h_enabled: settings.reservation_reminder_24h_enabled ?? false,
          reservation_reminder_2h_enabled: settings.reservation_reminder_2h_enabled ?? false,
          public_google_review_url: settings.public_google_review_url ?? null,
        };
        this.timezoneSearch = settings.timezone || '';
        this.parseOpeningHours(settings.opening_hours);
        this.loadTaxes();
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load settings. Please try again.');
        this.loading.set(false);
        console.error('Error loading settings:', err);
      }
    });
  }

  loadTaxes() {
    this.api.getTaxes(true).subscribe({
      next: (list) => this.taxes.set(list),
      error: () => this.taxes.set([]),
    });
  }

  loadTaxesAll() {
    this.api.getTaxes(false).subscribe({
      next: (list) => this.taxes.set(list),
      error: () => this.taxes.set([]),
    });
  }

  addTax() {
    this.taxError.set('');
    const validFrom = this.newTaxValidFrom || new Date().toISOString().slice(0, 10);
    const validTo = this.newTaxValidTo?.trim() || null;
    this.api.createTax({
      name: this.newTaxName.trim(),
      rate_percent: this.newTaxRate,
      valid_from: validFrom,
      valid_to: validTo ?? undefined,
    }).subscribe({
      next: () => {
        this.newTaxName = '';
        this.newTaxRate = 10;
        this.newTaxValidFrom = new Date().toISOString().slice(0, 10);
        this.newTaxValidTo = '';
        this.loadTaxesAll();
        this.loadTaxes();
      },
      error: (err) => this.taxError.set(err?.error?.detail || 'Failed to add tax'),
    });
  }

  deleteTax(id: number) {
    if (!confirm(this.translate.instant('SETTINGS.CONFIRM_DELETE_TAX'))) return;
    this.taxError.set('');
    this.api.deleteTax(id).subscribe({
      next: () => {
        this.loadTaxesAll();
        this.loadTaxes();
      },
      error: (err) => this.taxError.set(err?.error?.detail || 'Failed to delete tax'),
    });
  }

  loadProviders() {
    this.providersLoading.set(true);
    this.providersError.set('');
    this.api.getProviders(true).subscribe({
      next: (list) => {
        this.providers.set(list);
        this.providersLoading.set(false);
      },
      error: (err) => {
        this.providersError.set(err?.error?.detail || 'Failed to load providers');
        this.providersLoading.set(false);
      },
    });
  }

  isOwnProvider(p: Provider): boolean {
    const tenantId = this.api.getCurrentUser()?.tenant_id;
    return p.tenant_id != null && tenantId != null && p.tenant_id === tenantId;
  }

  toggleProviderProducts(p: Provider) {
    const id = p.id!;
    const expanded = new Set(this.providerProductsExpanded());
    if (expanded.has(id)) {
      expanded.delete(id);
    } else {
      expanded.add(id);
      this.api.listProviderProducts(id).subscribe({
        next: (products) => {
          this.providerProductsMap.update((m) => ({ ...m, [id]: products }));
        },
      });
    }
    this.providerProductsExpanded.set(expanded);
  }

  formatProviderPrice(cents: number | null | undefined): string {
    if (cents == null) return '—';
    return (cents / 100).toFixed(2) + ' €';
  }

  openAddProviderModal() {
    this.newProviderName = '';
    this.newProviderPhone = '';
    this.newProviderEmail = '';
    this.providerError.set('');
    this.showAddProviderModal.set(true);
  }

  closeAddProviderModal() {
    this.showAddProviderModal.set(false);
  }

  saveProvider() {
    this.providerError.set('');
    const name = this.newProviderName?.trim();
    if (!name) {
      this.providerError.set(this.translate.instant('SETTINGS.PROVIDER_NAME_REQUIRED'));
      return;
    }
    const body: ProviderCreate = {
      name,
      phone: this.newProviderPhone?.trim() || undefined,
      email: this.newProviderEmail?.trim() || undefined,
    };
    this.api.createProvider(body).subscribe({
      next: () => {
        this.closeAddProviderModal();
        this.loadProviders();
      },
      error: (err) => this.providerError.set(err?.error?.detail || 'Failed to add provider'),
    });
  }

  openAddProductModal(p: Provider) {
    this.selectedProviderForProduct.set(p);
    this.newProductName = '';
    this.newProductPrice = null;
    this.newProductCategory = '';
    this.newProductOnSale = true;
    this.providerProductError.set('');
    this.showAddProductModal.set(true);
  }

  closeAddProductModal() {
    this.showAddProductModal.set(false);
    this.selectedProviderForProduct.set(null);
  }

  saveProviderProduct() {
    const provider = this.selectedProviderForProduct();
    const providerId = provider?.id;
    if (providerId == null) return;
    this.providerProductError.set('');
    const name = this.newProductName?.trim();
    if (!name) {
      this.providerProductError.set(this.translate.instant('SETTINGS.PRODUCT_NAME_REQUIRED'));
      return;
    }
    const body: ProviderProductCreate = {
      name,
      price_cents: this.newProductPrice ?? undefined,
      category: this.newProductCategory?.trim() || undefined,
      availability: this.newProductOnSale,
    };
    this.api.createProductForProvider(providerId, body).subscribe({
      next: () => {
        this.closeAddProductModal();
        this.api.listProviderProducts(providerId).subscribe({
          next: (products) => {
            this.providerProductsMap.update((m) => ({ ...m, [providerId]: products }));
          },
        });
      },
      error: (err) => this.providerProductError.set(err?.error?.detail || 'Failed to add product'),
    });
  }

  loadOtpStatus() {
    this.otpStatusLoading.set(true);
    this.otpError.set(null);
    this.api.getOtpStatus().subscribe({
      next: (status) => {
        this.otpStatus.set(status);
        this.otpStatusLoading.set(false);
      },
      error: () => {
        this.otpStatus.set(null);
        this.otpStatusLoading.set(false);
      },
    });
  }

  startOtpSetup() {
    this.otpError.set(null);
    this.otpSettingUp.set(true);
    this.api.setupOtp().subscribe({
      next: (result) => {
        this.otpSetupResult.set(result);
        this.otpSettingUp.set(false);
      },
      error: (err) => {
        this.otpError.set(err?.error?.detail || 'Failed to setup OTP');
        this.otpSettingUp.set(false);
      },
    });
  }

  copyOtpSecret() {
    const secret = this.otpSetupResult()?.secret;
    if (secret && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(secret);
    }
  }

  confirmOtpEnable() {
    if (!this.otpConfirmCode || this.otpConfirmCode.length !== 6) return;
    this.otpError.set(null);
    this.otpConfirming.set(true);
    this.api.confirmOtp(this.otpConfirmCode).subscribe({
      next: () => {
        this.otpStatus.set({ otp_enabled: true });
        this.otpSetupResult.set(null);
        this.otpConfirmCode = '';
        this.otpConfirming.set(false);
      },
      error: (err) => {
        this.otpError.set(err?.error?.detail || 'Invalid code');
        this.otpConfirming.set(false);
      },
    });
  }

  cancelOtpSetup() {
    this.otpSetupResult.set(null);
    this.otpConfirmCode = '';
    this.otpError.set(null);
    this.loadOtpStatus();
  }

  disableOtp() {
    if (!this.otpDisableCode || this.otpDisableCode.length !== 6) return;
    this.otpError.set(null);
    this.otpDisabling.set(true);
    this.api.disableOtp(this.otpDisableCode).subscribe({
      next: () => {
        this.otpStatus.set({ otp_enabled: false });
        this.otpDisableCode = '';
        this.otpDisabling.set(false);
      },
      error: (err) => {
        this.otpError.set(err?.error?.detail || 'Invalid code');
        this.otpDisabling.set(false);
      },
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

  onHeaderBackgroundSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
      this.error.set('Please select a JPG, PNG, WebP or AVIF image.');
      return;
    }
    this.headerBackgroundFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.headerBackgroundPreview.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    this.error.set(null);
  }

  removeHeaderBackground() {
    this.headerBackgroundFile = null;
    this.headerBackgroundPreview.set(null);
    this.api.deleteTenantHeaderBackground().subscribe({
      next: (updated) => {
        this.settings.set(updated);
      },
      error: () => {},
    });
  }

  getHeaderBackgroundUrl(): string | null {
    const s = this.settings();
    if (!s?.header_background_filename || !s.id) return null;
    return this.api.getTenantHeaderBackgroundUrl(s.header_background_filename, s.id);
  }

  getHeaderBackgroundDisplaySrc(): SafeResourceUrl | null {
    const preview = this.headerBackgroundPreview();
    if (preview) return preview;
    const url = this.getHeaderBackgroundUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
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

    const doLogoUpload = () => {
      if (this.logoFile) {
        this.api.uploadTenantLogo(this.logoFile).subscribe({
          next: (updatedSettings) => {
            this.settings.set(updatedSettings);
            this.logoFile = null;
            this.logoPreview.set(null);
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
    };

    if (this.headerBackgroundFile) {
      this.api.uploadTenantHeaderBackground(this.headerBackgroundFile).subscribe({
        next: (updatedSettings) => {
          this.settings.set(updatedSettings);
          this.headerBackgroundFile = null;
          this.headerBackgroundPreview.set(null);
          doLogoUpload();
        },
        error: (err) => {
          this.error.set('Failed to upload header background. Please try again.');
          this.saving.set(false);
          console.error('Error uploading header background:', err);
        }
      });
    } else {
      doLogoUpload();
    }
  }

  private updateSettings() {
    // Ensure opening hours are serialized before saving
    this.serializeOpeningHours();

    // Prepare update data - only include stripe_secret_key if it was actually changed
    const updateData = { ...this.formData };

    // Always send reminder options so they are persisted (default false if unset)
    updateData.reservation_reminder_24h_enabled = this.formData.reservation_reminder_24h_enabled ?? false;
    updateData.reservation_reminder_2h_enabled = this.formData.reservation_reminder_2h_enabled ?? false;

    if (updateData.stripe_secret_key === '') {
      delete updateData.stripe_secret_key;
    }
    if (updateData.revolut_merchant_secret === '') {
      delete updateData.revolut_merchant_secret;
    }
    if (updateData.smtp_password === '') {
      delete updateData.smtp_password;
    }

    this.api.updateTenantSettings(updateData).subscribe({
      next: (updatedSettings) => {
        this.settings.set(updatedSettings);
        this.success.set('Settings saved successfully!');
        this.saving.set(false);
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
        },
        { timeout: 10000, maximumAge: 60000 }
      );
    } else {
      this.error.set('Geolocation is not supported by your browser.');
    }
  }
}
