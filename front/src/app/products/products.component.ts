import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, Product } from '../services/api.service';
import { SidebarComponent } from '../shared/sidebar.component';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { CategoriesComponent } from './categories.component';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [FormsModule, SidebarComponent, CommonModule, TranslateModule, CategoriesComponent],
  template: `
    <app-sidebar>
        <div class="page-header">
           <h1>{{ 'PRODUCTS.TITLE' | translate }}</h1>
           @if (activeTab() === 'products' && !showAddForm() && !editingProduct()) {
             <button class="btn btn-primary" (click)="showAddForm.set(true)">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
               </svg>
               {{ 'PRODUCTS.ADD_PRODUCT' | translate }}
             </button>
           }
         </div>

        <!-- Main Tab Navigation (Button Style like Settings) -->
        <div class="main-tabs-container">
          <div class="main-tabs">
            <button 
              type="button" 
              class="main-tab" 
              [class.active]="activeTab() === 'products'"
              (click)="activeTab.set('products')">
              <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
              <span>{{ 'NAV.PRODUCTS' | translate }}</span>
            </button>
            
            <button 
              type="button" 
              class="main-tab" 
              [class.active]="activeTab() === 'categories'"
              (click)="activeTab.set('categories')">
              <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              <span>{{ 'PRODUCTS.PRODUCT_CATEGORIES' | translate }}</span>
            </button>
          </div>
        </div>

        <div class="content">
          @if (activeTab() === 'categories') {
            <app-categories></app-categories>
          } @else {
            @if (showAddForm() || editingProduct()) {
              <div class="form-card">
                 <div class="form-header">
                   <h3>{{ editingProduct() ? ('PRODUCTS.EDIT_PRODUCT' | translate) : ('PRODUCTS.NEW_PRODUCT' | translate) }}</h3>
                   <button class="icon-btn" (click)="cancelForm()">
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                       <path d="M18 6L6 18M6 6l12 12"/>
                     </svg>
                   </button>
                 </div>
                <form (submit)="saveProduct($event)">
                   <div class="form-row">
                     <div class="form-group">
                       <label for="name">{{ 'PRODUCTS.PRODUCT_NAME' | translate }}</label>
                       <input id="name" type="text" [(ngModel)]="formData.name" name="name" required [placeholder]="'PRODUCTS.NAME_PLACEHOLDER' | translate">
                     </div>
                     <div class="form-group form-group-sm">
                       <label for="price">{{ 'PRODUCTS.PRODUCT_PRICE' | translate }}</label>
                       <div class="price-input">
                         <span class="currency">{{ currency() }}</span>
                         <input id="price" type="number" step="0.01" [(ngModel)]="formData.price" name="price" required [placeholder]="'PRODUCTS.PRICE_PLACEHOLDER' | translate">
                       </div>
                     </div>
                   </div>
                   <div class="form-group">
                     <label for="ingredients">{{ 'PRODUCTS.INGREDIENTS_LABEL' | translate }}</label>
                     <input id="ingredients" type="text" [(ngModel)]="formData.ingredients" name="ingredients" [placeholder]="'PRODUCTS.INGREDIENTS_PLACEHOLDER' | translate">
                   </div>
                   <div class="form-group">
                     <label for="description">{{ 'PRODUCTS.DESCRIPTION_LABEL' | translate }}</label>
                     <textarea id="description" [(ngModel)]="formData.description" name="description" [placeholder]="'PRODUCTS.DESCRIPTION_PLACEHOLDER' | translate" rows="3"></textarea>
                   </div>
                   <div class="form-row">
                     <div class="form-group">
                       <label for="category">{{ 'PRODUCTS.CATEGORY_LABEL' | translate }}</label>
                       <select id="category" [(ngModel)]="formData.category" name="category" (change)="onCategoryChange()">
                         <option value="">{{ 'PRODUCTS.SELECT_CATEGORY' | translate }}</option>
                         @for (category of getCategoryKeys(); track category) {
                           <option [value]="category">{{ category }}</option>
                         }
                       </select>
                     </div>
                     <div class="form-group">
                       <label for="subcategory">{{ 'PRODUCTS.SUBCATEGORY_LABEL' | translate }}</label>
                       <select id="subcategory" [(ngModel)]="formData.subcategory" name="subcategory" [disabled]="!formData.category || availableSubcategories().length === 0">
                         <option value="">{{ 'PRODUCTS.SELECT_SUBCATEGORY' | translate }}</option>
                         @for (subcat of availableSubcategories(); track subcat) {
                           <option [value]="subcat">{{ subcat }}</option>
                         }
                       </select>
                     </div>
                   </div>
                   <div class="form-group">
                     <label>{{ 'PRODUCTS.PRODUCT_IMAGE' | translate }}</label>
                     <div class="image-upload-row">
                       @if (editingProduct()?.image_filename) {
                         <div class="image-preview-wrapper">
                           <img [src]="getImageUrl(editingProduct()!)" class="product-thumb" alt="">
                           @if (editingProduct()?.image_size_formatted) {
                             <div class="file-size">{{ editingProduct()!.image_size_formatted }}</div>
                           }
                         </div>
                       } @else if (pendingImagePreview()) {
                         <div class="image-preview-wrapper">
                           <img [src]="pendingImagePreview()" class="product-thumb" alt="">
                           @if (pendingImageFile()?.size) {
                             <div class="file-size">{{ formatFileSize(pendingImageFile()!.size) }}</div>
                           }
                         </div>
                       }
                       <input type="file" #fileInput accept="image/jpeg,image/png,image/webp" (change)="handleImageSelect($event)" style="display:none">
                       <button type="button" class="btn btn-secondary" (click)="fileInput.click()" [disabled]="uploading()">
                         {{ uploading() ? ('PRODUCTS.UPLOADING' | translate) : (pendingImageFile() ? ('PRODUCTS.CHANGE_IMAGE' | translate) : ('PRODUCTS.UPLOAD_IMAGE' | translate)) }}
                       </button>
                       @if (pendingImageFile()) {
                         <span class="pending-file-name">{{ pendingImageFile()?.name }}</span>
                       }
                     </div>
                   </div>
                   <div class="form-actions">
                     <button type="button" class="btn btn-secondary" (click)="cancelForm()">{{ 'PRODUCTS.CANCEL' | translate }}</button>
                     <button type="submit" class="btn btn-primary" [disabled]="saving()">
                       {{ saving() ? ('PRODUCTS.SAVING' | translate) : (editingProduct() ? ('PRODUCTS.UPDATE' | translate) : ('PRODUCTS.ADD_PRODUCT_BUTTON' | translate)) }}
                     </button>
                   </div>
                </form>
              </div>
            }

            @if (error()) {
              <div class="error-banner">
                <span>{{ error() }}</span>
                <button class="icon-btn" (click)="error.set('')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            }

             @if (loading()) {
               <div class="empty-state">
                 <p>{{ 'PRODUCTS.LOADING_PRODUCTS' | translate }}</p>
               </div>
             } @else if (products().length === 0) {
               <div class="empty-state">
                 <div class="empty-icon">
                   <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                     <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                   </svg>
                 </div>
                 <h3>{{ 'PRODUCTS.NO_PRODUCTS' | translate }}</h3>
                 <p>{{ 'PRODUCTS.NO_PRODUCTS_DESC' | translate }}</p>
                 <button class="btn btn-primary" (click)="showAddForm.set(true)">{{ 'PRODUCTS.ADD_PRODUCT' | translate }}</button>
               </div>
            } @else {
              <!-- Category Filters (Ribbon Style) -->
              <div class="filters-section">
                @if (availableCategories().length > 0) {
                  <div class="ribbon-container">
                    <div class="ribbon">
                      <button 
                        class="ribbon-tab" 
                        [class.active]="selectedCategory() === null"
                        (click)="selectCategory(null)">
                        {{ 'CATALOG.ALL_CATEGORIES' | translate }}
                      </button>
                      @for (category of availableCategories(); track category) {
                        <button 
                          class="ribbon-tab" 
                          [class.active]="selectedCategory() === category"
                          (click)="selectCategory(category)">
                          {{ category }}
                        </button>
                      }
                    </div>
                  </div>
                }
                
                <!-- Subcategory Filters (Ribbon Style - Smaller) -->
                @if (selectedCategory() && availableSubcategoriesForFilter().length > 0) {
                  <div class="ribbon-container subribbon">
                    <div class="ribbon">
                      <button 
                        class="ribbon-tab tab-sm" 
                        [class.active]="selectedSubcategory() === null"
                        (click)="selectSubcategory(null)">
                        {{ 'PRODUCTS.ALL_ITEMS_IN' | translate:{category: selectedCategory()} }}
                      </button>
                      @for (subcategory of availableSubcategoriesForFilter(); track subcategory) {
                        <button 
                          class="ribbon-tab tab-sm" 
                          [class.active]="selectedSubcategory() === subcategory"
                          (click)="selectSubcategory(subcategory)">
                          {{ subcategory }}
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>

              <div class="table-card">
                 <table>
                   <thead>
                     <tr>
                       <th style="width:60px"></th>
                       <th>{{ 'PRODUCTS.NAME_HEADER' | translate }}</th>
                       <th>{{ 'PRODUCTS.CATEGORY_HEADER' | translate }}</th>
                       <th>{{ 'PRODUCTS.SUBCATEGORY_HEADER' | translate }}</th>
                       <th>{{ 'PRODUCTS.PRICE_HEADER' | translate }}</th>
                       <th></th>
                     </tr>
                   </thead>
                  <tbody>
                    @for (product of filteredProducts(); track product.id) {
                      <tr>
                        <td>
                          @if (product.image_filename) {
                            <div class="image-preview-wrapper">
                              <img [src]="getImageUrl(product)" class="table-thumb" alt="" (error)="handleImageError($event)">
                              @if (product.image_size_formatted) {
                                <div class="file-size">{{ product.image_size_formatted }}</div>
                              }
                            </div>
                          } @else {
                            <div class="no-image"></div>
                          }
                        </td>
                        <td>
                          <div>{{ product.name }}</div>
                          @if (product.ingredients) {
                            <small class="ingredients">{{ product.ingredients }}</small>
                          }
                        </td>
                        <td>
                          @if (editingCategoryProductId() === product.id) {
                            <select 
                              class="inline-select" 
                              [(ngModel)]="editingCategory" 
                              (change)="onCategoryChangeInline()"
                              (blur)="saveCategoryInline(product)"
                              (keydown.escape)="cancelCategoryEdit()"
                              [attr.data-product-id]="product.id">
                              <option value="">None</option>
                              @for (category of getCategoryKeys(); track category) {
                                <option [value]="category">{{ category }}</option>
                              }
                            </select>
                          } @else {
                            <span class="category-cell" (click)="startCategoryEdit(product, $event)">
                              {{ product.category || '—' }}
                            </span>
                          }
                        </td>
                        <td>
                          @if (editingCategoryProductId() === product.id) {
                            <select 
                              class="inline-select" 
                              [(ngModel)]="editingSubcategory" 
                              [disabled]="!editingCategory || getSubcategoriesForCategory(editingCategory || '').length === 0"
                              (blur)="saveCategoryInline(product)"
                              (keydown.escape)="cancelCategoryEdit()">
                              <option value="">None</option>
                              @for (subcat of getSubcategoriesForCategory(editingCategory); track subcat) {
                                <option [value]="subcat">{{ subcat }}</option>
                              }
                            </select>
                          } @else {
                            <span class="category-cell" (click)="startCategoryEdit(product, $event)">
                              {{ product.subcategory || '—' }}
                            </span>
                          }
                        </td>
                        <td class="price">{{ formatPrice(product.price_cents) }}</td>
                        <td class="actions">
                          <button class="icon-btn" (click)="startEdit(product)" title="Edit">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button class="icon-btn icon-btn-danger" (click)="confirmDelete(product)" title="Delete" [disabled]="deleting() === product.id">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }

           @if (productToDelete()) {
             <div class="modal-overlay" (click)="productToDelete.set(null)">
               <div class="modal" (click)="$event.stopPropagation()">
                 <h3>{{ 'PRODUCTS.DELETE_PRODUCT_TITLE' | translate }}</h3>
                 <p>{{ 'PRODUCTS.DELETE_PRODUCT_CONFIRM' | translate:{name: productToDelete()?.name} }}</p>
                 <div class="modal-actions">
                   <button class="btn btn-secondary" (click)="productToDelete.set(null)">{{ 'PRODUCTS.CANCEL' | translate }}</button>
                   <button class="btn btn-danger" (click)="deleteProduct()">{{ 'PRODUCTS.DELETE_PRODUCT' | translate }}</button>
                 </div>
               </div>
             </div>
           }
        </div>
    </app-sidebar>
  `,
  styleUrl: './products.component.scss'
})
export class ProductsComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  activeTab = signal<'products' | 'categories'>('products');
  products = signal<Product[]>([]);
  filteredProducts = signal<Product[]>([]);
  loading = signal(true);
  saving = signal(false);
  deleting = signal<number | null>(null);
  showAddForm = signal(false);
  editingProduct = signal<Product | null>(null);
  productToDelete = signal<Product | null>(null);
  error = signal('');
  formData = { name: '', price: 0, ingredients: '', description: '', category: '', subcategory: '' };
  uploading = signal(false);
  pendingImageFile = signal<File | null>(null);
  pendingImagePreview = signal<string | null>(null);
  currency = signal<string>('$');
  currencyCode = signal<string | null>(null);
  categories = signal<Record<string, string[]>>({});
  availableSubcategories = signal<string[]>([]);
  editingCategoryProductId = signal<number | null>(null);
  editingCategory: string = '';
  editingSubcategory: string = '';
  // Filter state
  selectedCategory = signal<string | null>(null);
  selectedSubcategory = signal<string | null>(null);
  availableCategories = signal<string[]>([]);
  availableSubcategoriesForFilter = signal<string[]>([]);

  ngOnInit() {
    this.loadTenantSettings();
    this.loadProducts();
    this.loadCategories();
  }

  loadCategories() {
    this.api.getCatalogCategories().subscribe({
      next: (cats) => {
        this.categories.set(cats);
      },
      error: (err) => {
        console.error('Failed to load categories:', err);
      }
    });
  }

  getCategoryKeys(): string[] {
    return Object.keys(this.categories());
  }

  getSubcategoriesForCategory(category: string): string[] {
    return this.categories()[category] || [];
  }

  onCategoryChange() {
    // Update available subcategories when category changes
    const selectedCategory = this.formData.category;
    if (selectedCategory && this.categories()[selectedCategory]) {
      this.availableSubcategories.set(this.categories()[selectedCategory]);
    } else {
      this.availableSubcategories.set([]);
      this.formData.subcategory = '';
    }
  }

  onCategoryChangeInline() {
    // Update subcategory when category changes inline
    const selectedCategory = this.editingCategory;
    if (selectedCategory && this.categories()[selectedCategory]) {
      // Keep subcategory if it's still valid, otherwise clear it
      const validSubcats = this.categories()[selectedCategory];
      if (this.editingSubcategory && !validSubcats.includes(this.editingSubcategory)) {
        this.editingSubcategory = '';
      }
    } else {
      this.editingSubcategory = '';
    }
  }

  startCategoryEdit(product: Product, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (!product.id) return;
    // Don't start editing if already editing this product or another product
    if (this.editingCategoryProductId() === product.id) return;
    if (this.editingCategoryProductId() !== null) {
      // Save current edit first
      const currentProduct = this.products().find(p => p.id === this.editingCategoryProductId());
      if (currentProduct) {
        this.saveCategoryInline(currentProduct);
      }
    }
    this.editingCategoryProductId.set(product.id);
    this.editingCategory = product.category || '';
    this.editingSubcategory = product.subcategory || '';
    // Focus the category select after a brief delay
    setTimeout(() => {
      const select = document.querySelector(`[data-product-id="${product.id}"]`) as HTMLSelectElement;
      if (select) select.focus();
    }, 10);
  }

  cancelCategoryEdit() {
    this.editingCategoryProductId.set(null);
    this.editingCategory = '';
    this.editingSubcategory = '';
  }

  saveCategoryInline(product: Product) {
    if (!product.id || this.editingCategoryProductId() !== product.id) return;

    const category = this.editingCategory || undefined;
    const subcategory = this.editingSubcategory || undefined;

    // Only update if changed
    if (category === product.category && subcategory === product.subcategory) {
      this.cancelCategoryEdit();
      return;
    }

    this.saving.set(true);
    this.api.updateProduct(product.id, { category, subcategory }).subscribe({
      next: (updated) => {
        this.products.update(list => list.map(p => p.id === updated.id ? updated : p));
        this.updateAvailableCategories();
        this.updateAvailableSubcategories(this.selectedCategory());
        this.applyFilters();
        this.cancelCategoryEdit();
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.detail || 'Failed to update category');
        this.cancelCategoryEdit();
        this.saving.set(false);
      }
    });
  }

  loadTenantSettings() {
    this.api.getTenantSettings().subscribe({
      next: (settings) => {
        const code = settings.currency_code || null;
        this.currencyCode.set(code);
        this.currency.set(settings.currency || (code ? this.getCurrencySymbol(code) : '$'));
      },
      error: (err) => {
        console.error('Failed to load tenant settings:', err);
        // Default to $ if settings can't be loaded
      }
    });
  }

  private getCurrencySymbol(code: string): string {
    const locale = navigator.language || 'en-US';
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'symbol'
    }).formatToParts(0);
    return parts.find(part => part.type === 'currency')?.value || code;
  }

  formatPrice(priceCents: number): string {
    const currencyCode = this.currencyCode();
    const locale = navigator.language || 'en-US';
    if (currencyCode) {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        currencyDisplay: 'symbol'
      }).format(priceCents / 100);
    }
    const currencySymbol = this.currency();
    return `${currencySymbol}${(priceCents / 100).toFixed(2)}`;
  }

  loadProducts() {
    this.loading.set(true);
    this.api.getProducts().subscribe({
      next: (products) => {
        this.products.set(products);
        this.updateAvailableCategories();
        this.applyFilters();
        this.loading.set(false);
      },
      error: (err) => {
        if (err.status === 401) { this.router.navigate(['/login']); }
        else { this.error.set(err.error?.detail || 'Failed to load products'); }
        this.loading.set(false);
      }
    });
  }

  updateAvailableCategories() {
    const categories = new Set<string>();
    this.products().forEach((product: Product) => {
      if (product.category) {
        categories.add(product.category);
      }
    });
    this.availableCategories.set(Array.from(categories).sort());
  }

  selectCategory(category: string | null) {
    this.selectedCategory.set(category);
    this.selectedSubcategory.set(null);
    this.updateAvailableSubcategories(category);
    this.applyFilters();
  }

  selectSubcategory(subcategory: string | null) {
    this.selectedSubcategory.set(subcategory);
    this.applyFilters();
  }

  updateAvailableSubcategories(category: string | null) {
    if (!category) {
      this.availableSubcategoriesForFilter.set([]);
      return;
    }

    const subcategories = new Set<string>();
    this.products().forEach((product: Product) => {
      if (product.category === category && product.subcategory) {
        subcategories.add(product.subcategory);
      }
    });
    this.availableSubcategoriesForFilter.set(Array.from(subcategories).sort());
  }

  applyFilters() {
    let filtered = this.products();

    // Filter by category
    if (this.selectedCategory()) {
      filtered = filtered.filter(p => p.category === this.selectedCategory());
    }

    // Filter by subcategory
    if (this.selectedSubcategory()) {
      filtered = filtered.filter(p => p.subcategory === this.selectedSubcategory());
    }

    this.filteredProducts.set(filtered);
  }

  startEdit(product: Product) {
    // Cancel any inline category editing
    if (this.editingCategoryProductId() === product.id) {
      this.cancelCategoryEdit();
    }
    this.editingProduct.set(product);
    this.formData = {
      name: product.name,
      price: product.price_cents / 100,
      ingredients: product.ingredients || '',
      description: product.description || '',
      category: product.category || '',
      subcategory: product.subcategory || ''
    };
    this.onCategoryChange(); // Update available subcategories
    this.showAddForm.set(false);
  }

  cancelForm() {
    this.showAddForm.set(false);
    this.editingProduct.set(null);
    this.formData = { name: '', price: 0, ingredients: '', description: '', category: '', subcategory: '' };
    this.availableSubcategories.set([]);
    this.clearPendingImage();
  }

  clearPendingImage() {
    this.pendingImageFile.set(null);
    if (this.pendingImagePreview()) {
      URL.revokeObjectURL(this.pendingImagePreview()!);
      this.pendingImagePreview.set(null);
    }
  }

  saveProduct(event: Event) {
    event.preventDefault();
    if (!this.formData.name || this.formData.price <= 0) return;

    this.saving.set(true);
    const productData = {
      name: this.formData.name,
      price_cents: Math.round(this.formData.price * 100),
      ingredients: this.formData.ingredients || undefined,
      description: this.formData.description || undefined,
      category: this.formData.category || undefined,
      subcategory: this.formData.subcategory || undefined
    };

    const editing = this.editingProduct();
    if (editing?.id) {
      this.api.updateProduct(editing.id, productData).subscribe({
        next: (updated) => {
          this.products.update(list => list.map(p => p.id === updated.id ? updated : p));
          this.updateAvailableCategories();
          this.applyFilters();
          this.cancelForm();
          this.saving.set(false);
        },
        error: (err) => { this.error.set(err.error?.detail || 'Failed to update'); this.saving.set(false); }
      });
    } else {
      this.api.createProduct(productData as Product).subscribe({
        next: (product) => {
          this.products.update(list => [...list, product]);
          this.updateAvailableCategories();
          this.applyFilters();
          // Upload pending image if one was selected
          const pendingFile = this.pendingImageFile();
          if (pendingFile && product.id) {
            this.uploading.set(true);
            this.api.uploadProductImage(product.id, pendingFile).subscribe({
              next: (updated) => {
                this.products.update(list => list.map(p => p.id === updated.id ? updated : p));
                this.clearPendingImage();
                this.uploading.set(false);
              },
              error: (err) => {
                this.error.set(err.error?.detail || 'Product created but image upload failed');
                this.clearPendingImage();
                this.uploading.set(false);
              }
            });
          } else {
            this.clearPendingImage();
          }
          this.cancelForm();
          this.saving.set(false);
        },
        error: (err) => { this.error.set(err.error?.detail || 'Failed to create'); this.saving.set(false); }
      });
    }
  }

  confirmDelete(product: Product) { this.productToDelete.set(product); }

  deleteProduct() {
    const product = this.productToDelete();
    if (!product?.id) return;
    this.deleting.set(product.id);
    this.productToDelete.set(null);
    this.api.deleteProduct(product.id).subscribe({
      next: () => {
        this.products.update(list => list.filter(p => p.id !== product.id));
        this.updateAvailableCategories();
        this.applyFilters();
        this.deleting.set(null);
      },
      error: (err) => { this.error.set(err.error?.detail || 'Failed to delete'); this.deleting.set(null); }
    });
  }

  getImageUrl(product: Product): string | null {
    return this.api.getProductImageUrl(product);
  }

  handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    // Show placeholder if parent has no-image div
    const wrapper = img.closest('.image-preview-wrapper');
    if (wrapper) {
      const placeholder = wrapper.querySelector('.no-image') as HTMLElement;
      if (!placeholder) {
        const noImageDiv = document.createElement('div');
        noImageDiv.className = 'no-image';
        wrapper.insertBefore(noImageDiv, img);
      } else {
        placeholder.style.display = 'block';
      }
    }
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

  handleImageSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const editing = this.editingProduct();
    if (editing?.id) {
      // Direct upload for existing products
      this.uploading.set(true);
      this.api.uploadProductImage(editing.id, file).subscribe({
        next: (updated) => {
          this.products.update(list => list.map(p => p.id === updated.id ? updated : p));
          this.editingProduct.set(updated);
          this.uploading.set(false);
        },
        error: (err) => {
          this.error.set(err.error?.detail || 'Failed to upload image');
          this.uploading.set(false);
        }
      });
    } else {
      // Store file for upload after product creation
      this.clearPendingImage();
      this.pendingImageFile.set(file);
      this.pendingImagePreview.set(URL.createObjectURL(file));
    }
    // Reset input to allow selecting the same file again
    input.value = '';
  }
}