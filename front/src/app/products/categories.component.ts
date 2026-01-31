import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService, Product } from '../services/api.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="categories-container">
      <!-- Split View Layout -->
      <div class="split-view">
        <!-- Sidebar: Categories List -->
        <div class="category-sidebar">
          <div class="sidebar-header">
            <h3>{{ 'CATALOG.CATEGORY_LABEL' | translate }}</h3>
          </div>
          <div class="sidebar-list">
            @for (category of mainCategories(); track category) {
              <button 
                class="category-item" 
                [class.active]="selectedCategory() === category"
                (click)="selectCategory(category)">
                <span>{{ category }}</span>
                <span class="count">{{ getSubcategoryCount(category) }}</span>
              </button>
            }
          </div>
        </div>

        <!-- Main: Subcategories Management -->
        <div class="subcategory-main">
          @if (selectedCategory()) {
            <div class="main-header">
              <h2>{{ 'PRODUCTS.MANAGE_SUBCATEGORIES_FOR' | translate:{category: selectedCategory()} }}</h2>
              <button class="btn btn-primary btn-sm" (click)="showAddForm.set(true)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                {{ 'PRODUCTS.ADD_SUBCATEGORY' | translate }}
              </button>
            </div>

            @if (showAddForm()) {
              <div class="form-card add-form">
                <div class="form-group">
                  <label>{{ 'PRODUCTS.SUBCATEGORY_NAME' | translate }}</label>
                  <div class="input-row">
                    <input 
                      type="text" 
                      [(ngModel)]="newSubcategoryName" 
                      [placeholder]="'PRODUCTS.ENTER_SUBCATEGORY_NAME' | translate"
                      (keyup.enter)="addSubcategory()">
                    <button class="btn btn-secondary" (click)="showAddForm.set(false)">{{ 'COMMON.CANCEL' | translate }}</button>
                    <button class="btn btn-primary" (click)="addSubcategory()" [disabled]="!newSubcategoryName.trim()">{{ 'COMMON.OK' | translate }}</button>
                  </div>
                </div>
              </div>
            }

            <div class="subcategories-grid">
              @for (subcat of currentSubcategories(); track subcat) {
                <div class="subcat-card">
                  @if (editingSubcategory() === subcat) {
                    <div class="edit-mode">
                      <input 
                        type="text" 
                        [(ngModel)]="editName" 
                        class="edit-input"
                        (keyup.enter)="saveEdit(subcat)"
                        (keyup.escape)="editingSubcategory.set(null)"
                        #editInput
                        autofocus>
                      <div class="edit-actions">
                        <button class="icon-btn success" (click)="saveEdit(subcat)">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </button>
                        <button class="icon-btn" (click)="editingSubcategory.set(null)">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  } @else {
                    <div class="view-mode">
                      <span class="subcat-name">{{ subcat }}</span>
                      <div class="subcat-actions">
                        <button class="icon-btn" (click)="startEdit(subcat)" title="{{ 'COMMON.EDIT' | translate }}">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button class="icon-btn danger" (click)="deleteSubcategory(subcat)" title="{{ 'COMMON.DELETE' | translate }}">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              } @empty {
                <div class="empty-subcategories">
                  <p>{{ 'PRODUCTS.NO_SUBCATEGORIES_FOUND' | translate }}</p>
                </div>
              }
            </div>
          } @else {
            <div class="select-prompt">
              <div class="prompt-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <p>{{ 'PRODUCTS.SELECT_CATEGORY_TO_MANAGE' | translate }}</p>
            </div>
          }
        </div>
      </div>

      <!-- Toasts/Messages -->
      @if (success()) { <div class="toast success">{{ success() }}</div> }
      @if (error()) { <div class="toast error">{{ error() }}</div> }
      @if (loading()) { <div class="loading-overlay"><div class="spinner"></div></div> }
    </div>
  `,
  styles: [`
    .categories-container {
      height: calc(100vh - 250px);
      min-height: 500px;
      position: relative;
    }

    .split-view {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 0;
      height: 100%;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    /* Sidebar */
    .category-sidebar {
      border-right: 1px solid var(--color-border);
      background: var(--color-bg);
      display: flex;
      flex-direction: column;
    }

    .sidebar-header {
      padding: var(--space-4);
      border-bottom: 1px solid var(--color-border);
      background: var(--color-surface);
      h3 { margin: 0; font-size: 0.875rem; text-transform: uppercase; color: var(--color-text-muted); }
    }

    .sidebar-list {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-2);
    }

    .category-item {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-3) var(--space-4);
      background: none;
      border: none;
      border-radius: var(--radius-md);
      color: var(--color-text);
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      transition: all 0.15s ease;
      margin-bottom: 2px;

      &:hover { background: var(--color-surface); }
      &.active { background: var(--color-primary); color: white; .count { background: rgba(255,255,255,0.2); color: white; } }

      .count {
        font-size: 0.75rem;
        background: var(--color-bg);
        color: var(--color-text-muted);
        padding: 2px 8px;
        border-radius: 10px;
      }
    }

    /* Main Area */
    .subcategory-main {
      padding: var(--space-6);
      overflow-y: auto;
      background: var(--color-surface);
    }

    .main-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-6);
      h2 { margin: 0; font-size: 1.25rem; font-weight: 600; }
    }

    .select-prompt {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--color-text-muted);
      text-align: center;
      .prompt-icon { margin-bottom: var(--space-4); opacity: 0.3; }
    }

    .subcategories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: var(--space-4);
    }

    .subcat-card {
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-3) var(--space-4);
      transition: border-color 0.15s;

      &:hover { border-color: var(--color-primary); }
    }

    .view-mode, .edit-mode {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-2);
    }

    .subcat-name { font-weight: 500; }

    .subcat-actions, .edit-actions {
      display: flex;
      gap: var(--space-1);
    }

    .edit-input {
      flex: 1;
      padding: var(--space-1) var(--space-2);
      border: 1px solid var(--color-primary);
      border-radius: var(--radius-sm);
      font-size: 0.9375rem;
      &:focus { outline: none; }
    }

    .icon-btn {
      background: none;
      border: none;
      padding: var(--space-2);
      border-radius: var(--radius-sm);
      color: var(--color-text-muted);
      cursor: pointer;
      &:hover { background: rgba(0,0,0,0.05); color: var(--color-text); }
      &.danger:hover { background: rgba(220, 38, 38, 0.1); color: var(--color-error); }
      &.success:hover { background: rgba(22, 163, 74, 0.1); color: var(--color-success); }
    }

    .btn-sm { padding: var(--space-2) var(--space-3); font-size: 0.8125rem; }

    .add-form {
      margin-bottom: var(--space-6);
      padding: var(--space-4);
      background: var(--color-bg);
      border: 1px dashed var(--color-primary);
    }

    .input-row {
      display: flex;
      gap: var(--space-2);
      input { flex: 1; padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); }
    }

    /* Toasts & Overlay */
    .toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      padding: 1rem 1.5rem;
      border-radius: var(--radius-md);
      color: white;
      z-index: 1000;
      box-shadow: var(--shadow-lg);
      &.success { background: var(--color-success); }
      &.error { background: var(--color-error); }
    }

    .loading-overlay {
      position: absolute;
      inset: 0;
      background: rgba(255,255,255,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 768px) {
      .split-view { grid-template-columns: 1fr; }
      .category-sidebar { border-right: none; border-bottom: 1px solid var(--color-border); max-height: 200px; }
    }
  `]
})
export class CategoriesComponent implements OnInit {
  private api = inject(ApiService);
  private translate = inject(TranslateService);

  products = signal<Product[]>([]);
  categoriesMap = signal<Record<string, string[]>>({});
  selectedCategory = signal<string | null>(null);
  loading = signal(false);
  error = signal('');
  success = signal('');

  // UI State
  showAddForm = signal(false);
  newSubcategoryName = '';
  editingSubcategory = signal<string | null>(null);
  editName = '';

  mainCategories = computed(() => Object.keys(this.categoriesMap()).sort());
  currentSubcategories = computed(() => {
    const cat = this.selectedCategory();
    if (!cat) return [];
    return (this.categoriesMap()[cat] || []).filter(s => !!s).sort();
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    // Load products to know which ones to update when a subcategory changes
    this.api.getProducts().subscribe({
      next: (prods) => {
        this.products.set(prods);
        this.buildCategoriesMap(prods);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load products');
        this.loading.set(false);
      }
    });
  }

  buildCategoriesMap(prods: Product[]) {
    const map: Record<string, Set<string>> = {};
    prods.forEach(p => {
      const cat = p.category || 'Uncategorized';
      if (!map[cat]) map[cat] = new Set();
      if (p.subcategory) map[cat].add(p.subcategory);
    });

    const finalMap: Record<string, string[]> = {};
    Object.keys(map).forEach(cat => {
      finalMap[cat] = Array.from(map[cat]);
    });
    this.categoriesMap.set(finalMap);
  }

  getSubcategoryCount(category: string): number {
    return (this.categoriesMap()[category] || []).length;
  }

  selectCategory(category: string) {
    this.selectedCategory.set(category);
    this.showAddForm.set(false);
    this.editingSubcategory.set(null);
  }

  addSubcategory() {
    const name = this.newSubcategoryName.trim();
    const cat = this.selectedCategory();
    if (!name || !cat) return;

    // Check if exists
    if (this.currentSubcategories().includes(name)) {
      this.error.set('Subcategory already exists');
      setTimeout(() => this.error.set(''), 3000);
      return;
    }

    // Since we don't have a "Subcategories" table, "adding" one is just an UI concept
    // until a product uses it. But we'll add it to our local map.
    this.categoriesMap.update(map => {
      const newMap = { ...map };
      if (!newMap[cat]) newMap[cat] = [];
      newMap[cat] = [...newMap[cat], name];
      return newMap;
    });

    this.newSubcategoryName = '';
    this.showAddForm.set(false);
    this.showSuccess('PRODUCTS.SUBCATEGORY_ADDED');
  }

  startEdit(subcat: string) {
    this.editingSubcategory.set(subcat);
    this.editName = subcat;
  }

  saveEdit(oldName: string) {
    const newName = this.editName.trim();
    const cat = this.selectedCategory();
    if (!newName || !cat || newName === oldName) {
      this.editingSubcategory.set(null);
      return;
    }

    this.loading.set(true);
    
    // Find all products in this category and subcategory
    const productsToUpdate = this.products().filter(p => p.category === cat && p.subcategory === oldName);
    
    if (productsToUpdate.length === 0) {
      // Just update local map if no products use it
      this.updateLocalMap(cat, oldName, newName);
      this.loading.set(false);
      this.editingSubcategory.set(null);
      return;
    }

    // Update all products via API
    const requests = productsToUpdate.map(p => 
      this.api.updateProduct(p.id!, { subcategory: newName })
    );

    forkJoin(requests).subscribe({
      next: () => {
        this.updateLocalMap(cat, oldName, newName);
        // Update local products list too
        this.products.update(list => list.map(p => {
          if (p.category === cat && p.subcategory === oldName) {
            return { ...p, subcategory: newName };
          }
          return p;
        }));
        this.loading.set(false);
        this.editingSubcategory.set(null);
        this.showSuccess('PRODUCTS.SUBCATEGORY_UPDATED');
      },
      error: () => {
        this.error.set('Failed to update products');
        this.loading.set(false);
      }
    });
  }

  deleteSubcategory(name: string) {
    const cat = this.selectedCategory();
    if (!cat) return;

    if (!confirm(this.translate.instant('PRODUCTS.DELETE_SUBCATEGORY_CONFIRM', { name }))) {
      return;
    }

    this.loading.set(true);
    const productsToUpdate = this.products().filter(p => p.category === cat && p.subcategory === name);

    if (productsToUpdate.length === 0) {
      this.removeFromLocalMap(cat, name);
      this.loading.set(false);
      return;
    }

    // Set subcategory to null for all products using it
    const requests = productsToUpdate.map(p => 
      this.api.updateProduct(p.id!, { subcategory: null as any })
    );

    forkJoin(requests).subscribe({
      next: () => {
        this.removeFromLocalMap(cat, name);
        this.products.update(list => list.map(p => {
          if (p.category === cat && p.subcategory === name) {
            return { ...p, subcategory: undefined };
          }
          return p;
        }));
        this.loading.set(false);
        this.showSuccess('PRODUCTS.SUBCATEGORY_DELETED');
      },
      error: () => {
        this.error.set('Failed to update products');
        this.loading.set(false);
      }
    });
  }

  private updateLocalMap(cat: string, oldName: string, newName: string) {
    this.categoriesMap.update(map => {
      const newMap = { ...map };
      newMap[cat] = newMap[cat].map(s => s === oldName ? newName : s);
      return newMap;
    });
  }

  private removeFromLocalMap(cat: string, name: string) {
    this.categoriesMap.update(map => {
      const newMap = { ...map };
      newMap[cat] = newMap[cat].filter(s => s !== name);
      return newMap;
    });
  }

  private showSuccess(key: string) {
    this.success.set(this.translate.instant(key));
    setTimeout(() => this.success.set(''), 3000);
  }
}
