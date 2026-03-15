import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, ProviderInfo, ProviderProductItem, ProviderProductCreate, ProviderUpdateData } from '../services/api.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="provider-portal">
      <header class="portal-header">
        <div class="header-inner">
          <h1>{{ provider()?.name ?? 'My catalog' }}</h1>
          <div class="header-actions">
            <span class="provider-email">{{ userEmail() }}</span>
            <button type="button" class="btn-logout" (click)="logout()">Log out</button>
          </div>
        </div>
      </header>

      <main class="portal-main">
        <div class="toolbar">
          <div class="toolbar-left">
            <button type="button" class="btn-primary" (click)="openAddModal()">Add product</button>
            <button type="button" class="btn-secondary" (click)="openCompanyModal()">Company details</button>
          </div>
          <div class="toolbar-right">
            <input
              type="search"
              class="search-input"
              placeholder="Search products…"
              [value]="searchQuery()"
              (input)="searchQuery.set($any($event.target).value)"
            >
            <div class="view-toggle" role="group" aria-label="View">
              <button type="button" class="btn-view" [class.active]="viewMode() === 'tile'" (click)="viewMode.set('tile')" title="Tile view">▦</button>
              <button type="button" class="btn-view" [class.active]="viewMode() === 'list'" (click)="viewMode.set('list')" title="List view">≡</button>
            </div>
          </div>
        </div>

        @if (provider(); as p) {
          @if (hasCompanyDetails(p)) {
            <section class="company-card">
              <h2 class="company-card-title">Company</h2>
              <dl class="company-dl">
                @if (p.full_company_name) { <dt>Legal name</dt><dd>{{ p.full_company_name }}</dd> }
                @if (p.address) { <dt>Address</dt><dd>{{ p.address }}</dd> }
                @if (p.tax_number) { <dt>Tax / VAT</dt><dd>{{ p.tax_number }}</dd> }
                @if (p.phone) { <dt>Phone</dt><dd>{{ p.phone }}</dd> }
                @if (p.email) { <dt>Email</dt><dd>{{ p.email }}</dd> }
                @if (p.bank_iban || p.bank_name) {
                  <dt>Bank</dt>
                  <dd>{{ p.bank_name }}{{ p.bank_iban ? ' · ' + p.bank_iban : '' }}</dd>
                }
              </dl>
            </section>
          }
        }

        @if (loading()) {
          <p class="loading">Loading products…</p>
        }
        @if (error()) {
          <div class="error-banner">{{ error() }}</div>
        }
        @if (!loading() && products().length === 0) {
          <p class="empty">No products yet. Click "Add product" to add your first item.</p>
        }
        @if (!loading() && products().length > 0 && filteredProducts().length === 0) {
          <p class="empty">No products match "{{ searchQuery() }}".</p>
        }
        @if (!loading() && filteredProducts().length > 0 && viewMode() === 'tile') {
          <div class="product-list product-list-tiles">
            @for (p of filteredProducts(); track p.id) {
              <div class="product-card">
                <div class="product-image">
                  @if (p.image_url) {
                    <img [src]="imageUrl(p.image_url)" [alt]="p.name" (error)="$event.target.style.display='none'">
                  } @else {
                    <span class="no-image">No image</span>
                  }
                  <div class="image-actions">
                    <label class="btn-upload">Upload
                      <input type="file" accept="image/*" (change)="onImageSelect($event, p.id)" hidden>
                    </label>
                  </div>
                </div>
                <div class="product-body">
                  <h3>{{ p.name }}</h3>
                  @if (p.catalog_name && p.catalog_name !== p.name) {
                    <p class="catalog-ref">{{ p.catalog_name }}</p>
                  }
                  <p class="price">{{ p.price_cents != null ? (p.price_cents / 100 | number:'1.2-2') + ' €' : '—' }}</p>
                  <span class="badge" [class.available]="p.availability" [class.unavailable]="!p.availability">
                    {{ p.availability ? 'Available' : 'Unavailable' }}
                  </span>
                </div>
                <div class="product-actions">
                  <button type="button" class="btn-sm" (click)="openEditModal(p)">Edit</button>
                  <button type="button" class="btn-sm btn-danger" (click)="confirmDelete(p)">Delete</button>
                </div>
              </div>
            }
          </div>
        }
        @if (!loading() && filteredProducts().length > 0 && viewMode() === 'list') {
          <div class="product-list product-list-rows">
            <table class="product-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Availability</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (p of filteredProducts(); track p.id) {
                  <tr>
                    <td>
                      <div class="list-product-cell">
                        @if (p.image_url) {
                          <img class="list-thumb" [src]="imageUrl(p.image_url)" [alt]="p.name" (error)="$event.target.style.display='none'">
                        } @else {
                          <span class="list-thumb list-thumb-empty">—</span>
                        }
                        <div>
                          <strong>{{ p.name }}</strong>
                          @if (p.catalog_name && p.catalog_name !== p.name) {
                            <span class="list-catalog-ref">{{ p.catalog_name }}</span>
                          }
                        </div>
                      </div>
                    </td>
                    <td>{{ p.price_cents != null ? (p.price_cents / 100 | number:'1.2-2') + ' €' : '—' }}</td>
                    <td>
                      <span class="badge" [class.available]="p.availability" [class.unavailable]="!p.availability">
                        {{ p.availability ? 'Available' : 'Unavailable' }}
                      </span>
                    </td>
                    <td class="list-actions">
                      <label class="btn-upload btn-upload-sm">Upload
                        <input type="file" accept="image/*" (change)="onImageSelect($event, p.id)" hidden>
                      </label>
                      <button type="button" class="btn-sm" (click)="openEditModal(p)">Edit</button>
                      <button type="button" class="btn-sm btn-danger" (click)="confirmDelete(p)">Delete</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </main>
    </div>

    @if (showModal()) {
      <div class="modal-backdrop" (click)="closeModal()"></div>
      <div class="modal" role="dialog">
        <div class="modal-header">
          <h2>{{ editingId() != null ? 'Edit product' : 'Add product' }}</h2>
          <button type="button" class="btn-close" (click)="closeModal()" aria-label="Close">&times;</button>
        </div>
        <form class="modal-form modal-form-scroll" (ngSubmit)="saveProduct()">
          <div class="form-row">
            <label>Name</label>
            <input type="text" [(ngModel)]="formName" name="name" required>
          </div>
          <div class="form-row">
            <label>Description</label>
            <textarea [(ngModel)]="formDetailedDescription" name="detailed_description" rows="4" placeholder="Product description"></textarea>
          </div>
          <div class="form-row">
            <label>Price (cents)</label>
            <input type="number" [(ngModel)]="formPriceCents" name="price_cents" min="0" placeholder="e.g. 1250">
          </div>
          <div class="form-row">
            <label>
              <input type="checkbox" [(ngModel)]="formAvailability" name="availability"> Available
            </label>
          </div>
          <div class="form-row form-row-half">
            <label>Country</label>
            <input type="text" [(ngModel)]="formCountry" name="country" placeholder="e.g. Spain">
          </div>
          <div class="form-row form-row-half">
            <label>Region</label>
            <input type="text" [(ngModel)]="formRegion" name="region" placeholder="e.g. Rioja">
          </div>
          <div class="form-row form-row-half">
            <label>Unit</label>
            <input type="text" [(ngModel)]="formUnit" name="unit" placeholder="e.g. bottle">
          </div>
          <div class="form-row form-row-half">
            <label>Volume (ml)</label>
            <input type="number" [(ngModel)]="formVolumeMl" name="volume_ml" min="0" placeholder="750">
          </div>
          <div class="form-row form-row-half">
            <label>Wine style</label>
            <input type="text" [(ngModel)]="formWineStyle" name="wine_style" placeholder="e.g. Crianza">
          </div>
          <div class="form-row form-row-half">
            <label>Vintage</label>
            <input type="number" [(ngModel)]="formVintage" name="vintage" min="1900" max="2100" placeholder="2020">
          </div>
          <div class="form-row">
            <label>Winery</label>
            <input type="text" [(ngModel)]="formWinery" name="winery" placeholder="Winery name">
          </div>
          <div class="form-row">
            <label>Grape variety</label>
            <input type="text" [(ngModel)]="formGrapeVariety" name="grape_variety" placeholder="e.g. Tempranillo">
          </div>
          <div class="form-row">
            <label>Aromas</label>
            <input type="text" [(ngModel)]="formAromas" name="aromas" placeholder="e.g. red fruit, spice">
          </div>
          <div class="form-row">
            <label>Elaboration</label>
            <input type="text" [(ngModel)]="formElaboration" name="elaboration" placeholder="e.g. 12 months in oak">
          </div>
          @if (editingId() == null) {
            <div class="form-row">
              <label>Category</label>
              <input type="text" [(ngModel)]="formCategory" name="category" placeholder="e.g. Wine">
            </div>
            <div class="form-row">
              <label>Subcategory</label>
              <input type="text" [(ngModel)]="formSubcategory" name="subcategory" placeholder="e.g. Red Wine">
            </div>
          }
          <div class="modal-actions">
            <button type="button" class="btn-secondary" (click)="closeModal()">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="saving()">Save</button>
          </div>
        </form>
      </div>
    }

    @if (deleteTarget()) {
      <div class="modal-backdrop" (click)="cancelDelete()"></div>
      <div class="modal modal-sm">
        <p>Delete "{{ deleteTarget()?.name }}"?</p>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" (click)="cancelDelete()">Cancel</button>
          <button type="button" class="btn-danger" (click)="doDelete()">Delete</button>
        </div>
      </div>
    }

    @if (showCompanyModal()) {
      <div class="modal-backdrop" (click)="closeCompanyModal()"></div>
      <div class="modal modal-company" role="dialog">
        <div class="modal-header">
          <h2>Company details</h2>
          <button type="button" class="btn-close" (click)="closeCompanyModal()" aria-label="Close">&times;</button>
        </div>
        <form class="company-form" (ngSubmit)="saveCompany()">
          <div class="company-form-body">
            <div class="company-form-section">
              <h3 class="company-form-section-title">Company</h3>
              <div class="company-field">
                <label for="company_full_company_name">Full legal company name</label>
                <input id="company_full_company_name" type="text" [(ngModel)]="companyFullCompanyName" name="company_full_company_name" placeholder="e.g. My Company GmbH">
              </div>
              <div class="company-field">
                <label for="company_address">Address</label>
                <textarea id="company_address" [(ngModel)]="companyAddress" name="company_address" rows="3" placeholder="Street, postal code, city, country"></textarea>
              </div>
              <div class="company-field">
                <label for="company_tax_number">Tax number / VAT ID</label>
                <input id="company_tax_number" type="text" [(ngModel)]="companyTaxNumber" name="company_tax_number" placeholder="e.g. DE123456789">
              </div>
            </div>
            <div class="company-form-section">
              <h3 class="company-form-section-title">Contact</h3>
              <div class="company-field">
                <label for="company_phone">Phone</label>
                <input id="company_phone" type="tel" [(ngModel)]="companyPhone" name="company_phone" placeholder="+49 123 456789">
              </div>
              <div class="company-field">
                <label for="company_email">Company email</label>
                <input id="company_email" type="email" [(ngModel)]="companyEmail" name="company_email" placeholder="contact@company.com">
              </div>
            </div>
            <div class="company-form-section">
              <h3 class="company-form-section-title">Bank details</h3>
              <div class="company-field">
                <label for="company_bank_account_holder">Account holder</label>
                <input id="company_bank_account_holder" type="text" [(ngModel)]="companyBankAccountHolder" name="company_bank_account_holder" placeholder="Company or person name">
              </div>
              <div class="company-field">
                <label for="company_bank_iban">IBAN</label>
                <input id="company_bank_iban" type="text" [(ngModel)]="companyBankIban" name="company_bank_iban" placeholder="e.g. DE89 3704 0044 0532 0130 00">
              </div>
              <div class="company-field">
                <label for="company_bank_bic">BIC / SWIFT</label>
                <input id="company_bank_bic" type="text" [(ngModel)]="companyBankBic" name="company_bank_bic" placeholder="e.g. COBADEFFXXX">
              </div>
              <div class="company-field">
                <label for="company_bank_name">Bank name</label>
                <input id="company_bank_name" type="text" [(ngModel)]="companyBankName" name="company_bank_name" placeholder="Name of bank">
              </div>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" (click)="closeCompanyModal()">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="savingCompany()">{{ savingCompany() ? 'Saving…' : 'Save' }}</button>
          </div>
        </form>
      </div>
    }

    @if (toast()) {
      <div class="toast" [class]="toast()!.type">
        <span>{{ toast()!.message }}</span>
        <button type="button" class="toast-close" (click)="dismissToast()" aria-label="Dismiss">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    }
  `,
  styles: [`
    .provider-portal { min-height: 100vh; background: var(--color-bg); }
    .portal-header {
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      padding: var(--space-4);
    }
    .header-inner {
      max-width: 960px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--space-4);
    }
    .portal-header h1 { font-size: 1.25rem; font-weight: 600; margin: 0; color: var(--color-text); }
    .header-actions { display: flex; align-items: center; gap: var(--space-4); }
    .provider-email { font-size: 0.875rem; color: var(--color-text-muted); }
    .btn-logout { background: none; border: none; color: var(--color-primary); font-weight: 500; cursor: pointer; font-size: 1rem; padding: 0; }
    .btn-logout:hover { text-decoration: underline; }
    .portal-main { max-width: 960px; margin: 0 auto; padding: var(--space-6); }
    .toolbar { margin-bottom: var(--space-6); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-4); }
    .toolbar-left { display: flex; gap: var(--space-3); flex-wrap: wrap; }
    .toolbar-right { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
    .search-input {
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: 0.9375rem;
      min-width: 180px;
    }
    .view-toggle { display: flex; }
    .btn-view {
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      border-radius: 0;
      cursor: pointer;
      font-size: 1.1rem;
      line-height: 1;
    }
    .btn-view:first-child { border-radius: var(--radius-md) 0 0 var(--radius-md); }
    .btn-view:last-child { border-radius: 0 var(--radius-md) var(--radius-md) 0; border-left: none; }
    .btn-view.active { background: var(--color-primary); color: white; border-color: var(--color-primary); }
    .company-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-4);
      margin-bottom: var(--space-6);
    }
    .company-card-title { font-size: 1rem; font-weight: 600; margin: 0 0 var(--space-3); color: var(--color-text); }
    .company-dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: var(--space-2) var(--space-4); }
    .company-dl dt { color: var(--color-text-muted); font-weight: 500; }
    .company-dl dd { margin: 0; }
    .btn-primary { padding: var(--space-3) var(--space-4); background: var(--color-primary); color: white; border: none; border-radius: var(--radius-md); font-weight: 500; cursor: pointer; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-secondary { padding: var(--space-3) var(--space-4); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); cursor: pointer; }
    .btn-danger { padding: var(--space-3) var(--space-4); background: #dc2626; color: white; border: none; border-radius: var(--radius-md); cursor: pointer; }
    .btn-sm { padding: var(--space-2) var(--space-3); font-size: 0.875rem; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); cursor: pointer; }
    .btn-sm.btn-danger { border-color: #dc2626; color: #dc2626; background: transparent; }
    .loading, .empty { color: var(--color-text-muted); }
    .error-banner { background: rgba(220,38,38,0.1); color: var(--color-error); padding: var(--space-3); border-radius: var(--radius-md); margin-bottom: var(--space-4); }
    .product-list { display: grid; gap: var(--space-4); }
    .product-list-tiles { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
    .product-list-rows { overflow-x: auto; }
    .product-table { width: 100%; border-collapse: collapse; background: var(--color-surface); border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--color-border); }
    .product-table th, .product-table td { padding: var(--space-3) var(--space-4); text-align: left; border-bottom: 1px solid var(--color-border); }
    .product-table th { background: var(--color-bg); font-weight: 600; font-size: 0.875rem; color: var(--color-text-muted); }
    .product-table tbody tr:last-child td { border-bottom: none; }
    .list-product-cell { display: flex; align-items: center; gap: var(--space-3); }
    .list-thumb { width: 40px; height: 40px; object-fit: cover; border-radius: var(--radius-md); flex-shrink: 0; }
    .list-thumb-empty { display: inline-flex; align-items: center; justify-content: center; background: var(--color-bg); color: var(--color-text-muted); font-size: 0.75rem; }
    .list-catalog-ref { display: block; font-size: 0.8125rem; color: var(--color-text-muted); font-weight: normal; }
    .list-actions { display: flex; align-items: center; gap: var(--space-2); }
    .btn-upload-sm { font-size: 0.75rem; padding: var(--space-1) var(--space-2); }
    .product-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .product-image {
      position: relative;
      aspect-ratio: 1;
      background: var(--color-bg);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .product-image img { width: 100%; height: 100%; object-fit: cover; }
    .product-image .no-image { color: var(--color-text-muted); font-size: 0.875rem; }
    .image-actions { position: absolute; bottom: var(--space-2); right: var(--space-2); }
    .btn-upload { font-size: 0.75rem; padding: var(--space-2); background: rgba(0,0,0,0.6); color: white; border-radius: var(--radius-md); cursor: pointer; }
    .product-body { padding: var(--space-4); flex: 1; }
    .product-body h3 { margin: 0 0 var(--space-2); font-size: 1rem; font-weight: 600; }
    .product-body .catalog-ref { font-size: 0.8125rem; color: var(--color-text-muted); margin: 0 0 var(--space-2); }
    .product-body .price { margin: 0 0 var(--space-2); font-weight: 500; }
    .badge { font-size: 0.75rem; padding: 2px 6px; border-radius: var(--radius-md); }
    .badge.available { background: #dcfce7; color: #166534; }
    .badge.unavailable { background: #fee2e2; color: #991b1b; }
    .product-actions { padding: var(--space-3) var(--space-4); border-top: 1px solid var(--color-border); display: flex; gap: var(--space-2); }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; }
    .modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      padding: var(--space-6);
      z-index: 1001;
      min-width: 320px;
      max-width: 90vw;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); flex-shrink: 0; }
    .modal-header h2 { margin: 0; font-size: 1.25rem; }
    .btn-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--color-text-muted); line-height: 1; }
    .modal-form-scroll { max-height: 60vh; overflow-y: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 0 var(--space-4); }
    .modal-form-scroll .form-row { grid-column: 1 / -1; margin-bottom: var(--space-4); }
    .modal-form-scroll .form-row-half { grid-column: span 1; margin-bottom: var(--space-4); }
    .form-row label, .form-row-half label { display: block; margin-bottom: var(--space-2); font-weight: 500; }
    .form-row input[type="text"], .form-row input[type="number"], .form-row-half input[type="text"], .form-row-half input[type="number"] {
      width: 100%;
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }
    .form-row textarea {
      width: 100%;
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: 1rem;
      font-family: inherit;
      resize: vertical;
      min-height: 4em;
    }
    .modal-actions { display: flex; gap: var(--space-3); justify-content: flex-end; margin-top: var(--space-6); flex-shrink: 0; grid-column: 1 / -1; }
    .modal-sm .modal-actions { margin-top: var(--space-4); }
    .modal-company { display: flex; flex-direction: column; max-height: 85vh; width: 100%; max-width: 480px; }
    .modal-company .modal-header { flex-shrink: 0; }
    .company-form { display: flex; flex-direction: column; flex: 1; min-height: 0; }
    .company-form-body { overflow-y: auto; flex: 1; padding-right: var(--space-2); }
    .company-form-section { margin-bottom: var(--space-6); }
    .company-form-section:last-child { margin-bottom: 0; }
    .company-form-section-title { font-size: 0.875rem; font-weight: 600; color: var(--color-text-muted); margin: 0 0 var(--space-3); padding-bottom: var(--space-2); border-bottom: 1px solid var(--color-border); }
    .company-field { margin-bottom: var(--space-4); }
    .company-field:last-child { margin-bottom: 0; }
    .company-field label { display: block; font-size: 0.875rem; font-weight: 500; color: var(--color-text); margin-bottom: var(--space-1); }
    .company-field input, .company-field textarea { width: 100%; padding: var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 1rem; font-family: inherit; }
    .company-field textarea { resize: vertical; min-height: 4em; }
    .modal-company .modal-actions { flex-shrink: 0; margin-top: var(--space-6); padding-top: var(--space-4); border-top: 1px solid var(--color-border); }
    .toast {
      position: fixed;
      bottom: var(--space-6);
      right: var(--space-6);
      padding: var(--space-4) var(--space-5);
      background: var(--color-surface);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      display: flex;
      align-items: center;
      gap: var(--space-3);
      z-index: 1100;
      animation: toastSlideIn 0.3s ease;
      max-width: 320px;
      border-left: 4px solid var(--color-text-muted);
    }
    .toast.success { border-left-color: var(--color-success, #16a34a); }
    .toast.error { border-left-color: var(--color-error, #dc2626); }
    .toast-close { background: none; border: none; color: var(--color-text-muted); cursor: pointer; padding: 4px; font-size: 1.25rem; line-height: 1; }
    .toast-close:hover { color: var(--color-text); }
    @keyframes toastSlideIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ProviderDashboardComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  provider = signal<ProviderInfo | null>(null);
  products = signal<ProviderProductItem[]>([]);
  searchQuery = signal('');
  viewMode = signal<'tile' | 'list'>('tile');
  loading = signal(true);
  error = signal('');
  showModal = signal(false);
  showCompanyModal = signal(false);
  saving = signal(false);
  savingCompany = signal(false);
  editingId = signal<number | null>(null);
  deleteTarget = signal<ProviderProductItem | null>(null);

  filteredProducts = computed(() => {
    const list = this.products();
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.catalog_name?.toLowerCase().includes(q)) ||
        (p.external_id?.toLowerCase().includes(q))
    );
  });

  companyFullCompanyName = '';
  companyAddress = '';
  companyTaxNumber = '';
  companyPhone = '';
  companyEmail = '';
  companyBankAccountHolder = '';
  companyBankIban = '';
  companyBankBic = '';
  companyBankName = '';

  formName = '';
  formPriceCents: number | null = null;
  formAvailability = true;
  formCategory = '';
  formSubcategory = '';
  formDetailedDescription = '';
  formCountry = '';
  formRegion = '';
  formUnit = '';
  formVolumeMl: number | null = null;
  formWineStyle = '';
  formVintage: number | null = null;
  formWinery = '';
  formGrapeVariety = '';
  formAromas = '';
  formElaboration = '';

  userEmail(): string {
    return this.api.getCurrentUser()?.email ?? '';
  }

  hasCompanyDetails(p: ProviderInfo): boolean {
    return !!(p.full_company_name || p.address || p.tax_number || p.phone || p.email || p.bank_iban || p.bank_name);
  }

  openCompanyModal() {
    const p = this.provider();
    if (p) {
      this.companyFullCompanyName = p.full_company_name ?? '';
      this.companyAddress = p.address ?? '';
      this.companyTaxNumber = p.tax_number ?? '';
      this.companyPhone = p.phone ?? '';
      this.companyEmail = p.email ?? '';
      this.companyBankAccountHolder = p.bank_account_holder ?? '';
      this.companyBankIban = p.bank_iban ?? '';
      this.companyBankBic = p.bank_bic ?? '';
      this.companyBankName = p.bank_name ?? '';
    }
    this.showCompanyModal.set(true);
  }

  closeCompanyModal() {
    this.showCompanyModal.set(false);
  }

  private toastTimeout?: ReturnType<typeof setTimeout>;

  toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  dismissToast() {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = undefined;
    this.toast.set(null);
  }

  private showToast(message: string, type: 'success' | 'error' = 'success') {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toast.set({ message, type });
    this.toastTimeout = setTimeout(() => this.dismissToast(), 4000);
  }

  saveCompany() {
    const data: ProviderUpdateData = {
      full_company_name: this.companyFullCompanyName || undefined,
      address: this.companyAddress || undefined,
      tax_number: this.companyTaxNumber || undefined,
      phone: this.companyPhone || undefined,
      email: this.companyEmail || undefined,
      bank_account_holder: this.companyBankAccountHolder || undefined,
      bank_iban: this.companyBankIban || undefined,
      bank_bic: this.companyBankBic || undefined,
      bank_name: this.companyBankName || undefined,
    };
    this.savingCompany.set(true);
    this.api.updateProviderMe(data).subscribe({
      next: (updated) => {
        this.provider.set(updated);
        this.savingCompany.set(false);
        this.closeCompanyModal();
        this.showToast('Company details saved.');
      },
      error: () => this.savingCompany.set(false),
    });
  }

  ngOnInit() {
    this.api.getProviderMe().subscribe({
      next: (p) => this.provider.set(p),
      error: () => this.error.set('Failed to load provider')
    });
    this.loadProducts();
  }

  imageUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const base = environment.apiUrl.replace(/\/$/, '');
    return url.startsWith('/') ? base + url : base + '/' + url;
  }

  loadProducts() {
    this.loading.set(true);
    this.api.getProviderProducts().subscribe({
      next: (list) => {
        this.products.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load products');
        this.loading.set(false);
      }
    });
  }

  openAddModal() {
    this.editingId.set(null);
    this.formName = '';
    this.formPriceCents = null;
    this.formAvailability = true;
    this.formCategory = '';
    this.formSubcategory = '';
    this.formDetailedDescription = '';
    this.formCountry = '';
    this.formRegion = '';
    this.formUnit = '';
    this.formVolumeMl = null;
    this.formWineStyle = '';
    this.formVintage = null;
    this.formWinery = '';
    this.formGrapeVariety = '';
    this.formAromas = '';
    this.formElaboration = '';
    this.showModal.set(true);
  }

  openEditModal(p: ProviderProductItem) {
    this.editingId.set(p.id);
    this.formName = p.name;
    this.formPriceCents = p.price_cents ?? null;
    this.formAvailability = p.availability;
    this.formCategory = '';
    this.formSubcategory = '';
    this.formDetailedDescription = p.detailed_description ?? '';
    this.formCountry = p.country ?? '';
    this.formRegion = p.region ?? '';
    this.formUnit = p.unit ?? '';
    this.formVolumeMl = p.volume_ml ?? null;
    this.formWineStyle = p.wine_style ?? '';
    this.formVintage = p.vintage ?? null;
    this.formWinery = p.winery ?? '';
    this.formGrapeVariety = p.grape_variety ?? '';
    this.formAromas = p.aromas ?? '';
    this.formElaboration = p.elaboration ?? '';
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingId.set(null);
  }

  saveProduct() {
    const id = this.editingId();
    if (id != null) {
      this.saving.set(true);
      this.api.updateProviderProduct(id, {
        name: this.formName,
        price_cents: this.formPriceCents ?? undefined,
        availability: this.formAvailability,
        detailed_description: this.formDetailedDescription || undefined,
        country: this.formCountry || undefined,
        region: this.formRegion || undefined,
        unit: this.formUnit || undefined,
        volume_ml: this.formVolumeMl ?? undefined,
        wine_style: this.formWineStyle || undefined,
        vintage: this.formVintage ?? undefined,
        winery: this.formWinery || undefined,
        grape_variety: this.formGrapeVariety || undefined,
        aromas: this.formAromas || undefined,
        elaboration: this.formElaboration || undefined,
      }).subscribe({
        next: () => { this.saving.set(false); this.closeModal(); this.loadProducts(); },
        error: (err) => {
          this.saving.set(false);
          const detail = err.error?.detail;
          const msg = Array.isArray(detail)
            ? detail.map((e: { msg?: string }) => e.msg || e).join('; ')
            : (typeof detail === 'string' ? detail : err.message) || 'Failed to update product';
          this.error.set(msg);
        }
      });
    } else {
      const data: ProviderProductCreate = {
        name: this.formName.trim(),
        external_id: '', // backend generates if empty
        price_cents: this.formPriceCents ?? undefined,
        availability: this.formAvailability,
        category: this.formCategory || undefined,
        subcategory: this.formSubcategory || undefined,
        detailed_description: this.formDetailedDescription || undefined,
        country: this.formCountry || undefined,
        region: this.formRegion || undefined,
        unit: this.formUnit || undefined,
        volume_ml: this.formVolumeMl ?? undefined,
        wine_style: this.formWineStyle || undefined,
        vintage: this.formVintage ?? undefined,
        winery: this.formWinery || undefined,
        grape_variety: this.formGrapeVariety || undefined,
        aromas: this.formAromas || undefined,
        elaboration: this.formElaboration || undefined,
      };
      this.saving.set(true);
      this.error.set('');
      this.api.createProviderProduct(data).subscribe({
        next: () => { this.saving.set(false); this.closeModal(); this.loadProducts(); },
        error: (err) => {
          this.saving.set(false);
          const detail = err.error?.detail;
          const msg = Array.isArray(detail)
            ? detail.map((e: { msg?: string; loc?: unknown[] }) => e.msg || e).join('; ')
            : (typeof detail === 'string' ? detail : err.message) || 'Failed to save product';
          this.error.set(msg);
        }
      });
    }
  }

  onImageSelect(event: Event, productId: number) {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    this.api.uploadProviderProductImage(productId, file).subscribe({
      next: () => { this.loadProducts(); input.value = ''; },
      error: () => this.error.set('Upload failed')
    });
  }

  confirmDelete(p: ProviderProductItem) {
    this.deleteTarget.set(p);
  }

  cancelDelete() {
    this.deleteTarget.set(null);
  }

  doDelete() {
    const p = this.deleteTarget();
    if (!p) return;
    this.api.deleteProviderProduct(p.id).subscribe({
      next: () => { this.cancelDelete(); this.loadProducts(); },
      error: () => this.error.set('Delete failed')
    });
  }

  logout() {
    this.api.logout();
    this.router.navigate(['/provider/login']);
  }
}
