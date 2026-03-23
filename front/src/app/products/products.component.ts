import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, Product, ProductQuestionStaff, Tax } from '../services/api.service';
import { PermissionService } from '../services/permission.service';
import { SidebarComponent } from '../shared/sidebar.component';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { intlLocaleFromTranslate } from '../shared/intl-locale';
import { currencySymbolFromIsoCode } from '../shared/currency-symbol';
import { CategoriesComponent } from './categories.component';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [FormsModule, SidebarComponent, CommonModule, TranslateModule, CategoriesComponent],
  template: `
    <app-sidebar>
        <div class="page-header">
           <h1>{{ 'PRODUCTS.TITLE' | translate }}</h1>
           @if (activeTab() === 'products' && !showAddForm() && !editingProduct() && canEditProducts()) {
             <button class="btn btn-primary" (click)="openAddForm()">
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
                 @if (!canEditProducts()) {
                   <p class="form-readonly-hint">{{ 'PRODUCTS.ONLY_OWNERS_CAN_EDIT' | translate }}</p>
                 }
                <form (submit)="saveProduct($event)">
                   <div class="form-row">
                     <div class="form-group">
                       <label for="name">{{ 'PRODUCTS.PRODUCT_NAME' | translate }} <span class="required" aria-hidden="true">*</span></label>
                       <input id="name" type="text" [(ngModel)]="formData.name" name="name" required [placeholder]="'PRODUCTS.NAME_PLACEHOLDER' | translate" [readonly]="!canEditProducts()" [class.input-error]="productFormErrors()?.name" (ngModelChange)="clearProductFormError('name')">
                       @if (productFormErrors()?.name) {
                         <span class="field-error" role="alert">{{ 'PRODUCTS.NAME_REQUIRED' | translate }}</span>
                       }
                     </div>
                     <div class="form-group form-group-sm">
                       <label for="price">{{ 'PRODUCTS.PRODUCT_PRICE' | translate }} <span class="required" aria-hidden="true">*</span></label>
                       <div class="price-input">
                         <span class="currency">{{ currency() }}</span>
                         <input id="price" type="number" step="0.01" [(ngModel)]="formData.price" name="price" required [placeholder]="'PRODUCTS.PRICE_PLACEHOLDER' | translate" [readonly]="!canEditProducts()" [class.input-error]="productFormErrors()?.price" (ngModelChange)="clearProductFormError('price')">
                       </div>
                       @if (productFormErrors()?.price) {
                         <span class="field-error" role="alert">{{ 'PRODUCTS.PRICE_REQUIRED' | translate }}</span>
                       }
                     </div>
                     <div class="form-group form-group-sm">
                       <label for="cost">{{ 'PRODUCTS.COST_PRICE' | translate }}</label>
                       <div class="price-input">
                         <span class="currency">{{ currency() }}</span>
                         <input id="cost" type="number" step="0.01" [(ngModel)]="formData.cost" name="cost" [placeholder]="'PRODUCTS.COST_PLACEHOLDER' | translate" [readonly]="!canEditProducts()">
                       </div>
                       <small class="field-hint">{{ 'PRODUCTS.COST_HINT' | translate }}</small>
                     </div>
                   </div>
                   <div class="form-group">
                     <label for="ingredients">{{ 'PRODUCTS.INGREDIENTS_LABEL' | translate }}</label>
                     <input id="ingredients" type="text" [(ngModel)]="formData.ingredients" name="ingredients" [placeholder]="'PRODUCTS.INGREDIENTS_PLACEHOLDER' | translate" [readonly]="!canEditProducts()">
                   </div>
                   <div class="form-group">
                     <label for="description">{{ 'PRODUCTS.DESCRIPTION_LABEL' | translate }}</label>
                     <textarea id="description" [(ngModel)]="formData.description" name="description" [placeholder]="'PRODUCTS.DESCRIPTION_PLACEHOLDER' | translate" rows="3" [readonly]="!canEditProducts()"></textarea>
                   </div>
                   <div class="form-row">
                     <div class="form-group">
                       <label for="category">{{ 'PRODUCTS.CATEGORY_LABEL' | translate }}</label>
                       <select id="category" [(ngModel)]="formData.category" name="category" (change)="onCategoryChange()" [disabled]="!canEditProducts()">
                         <option value="">{{ 'PRODUCTS.SELECT_CATEGORY' | translate }}</option>
                         @for (category of getCategoryKeys(); track category) {
                           <option [value]="category">{{ getCategoryLabel(category) }}</option>
                         }
                       </select>
                     </div>
                     <div class="form-group">
                       <label for="subcategory">{{ 'PRODUCTS.SUBCATEGORY_LABEL' | translate }}</label>
                       <select id="subcategory" [(ngModel)]="formData.subcategory" name="subcategory" [disabled]="!canEditProducts() || !formData.category || availableSubcategories().length === 0">
                         <option value="">{{ 'PRODUCTS.SELECT_SUBCATEGORY' | translate }}</option>
                         @for (subcat of availableSubcategories(); track subcat) {
                           <option [value]="subcat">{{ subcat }}</option>
                         }
                       </select>
                     </div>
                   </div>
                   <div class="form-group">
                     <label for="product_tax_id">{{ 'PRODUCTS.TAX_OVERRIDE' | translate }}</label>
                     <select id="product_tax_id" [(ngModel)]="formData.tax_id" name="tax_id" [disabled]="!canEditProducts()">
                       <option [ngValue]="null">{{ 'PRODUCTS.USE_DEFAULT_TAX' | translate }}</option>
                       @for (t of productTaxes(); track t.id) {
                         <option [ngValue]="t.id">{{ t.name }} ({{ t.rate_percent }}%)</option>
                       }
                     </select>
                     <small class="field-hint">{{ 'PRODUCTS.TAX_OVERRIDE_HINT' | translate }}</small>
                   </div>
                   <div class="form-row">
                     <div class="form-group">
                       <label for="available_from">{{ 'PRODUCTS.AVAILABLE_FROM' | translate }}</label>
                       <input id="available_from" type="date" [(ngModel)]="formData.available_from" name="available_from" [readonly]="!canEditProducts()">
                       <small class="field-hint">{{ 'PRODUCTS.AVAILABLE_FROM_HINT' | translate }}</small>
                     </div>
                     <div class="form-group">
                       <label for="available_until">{{ 'PRODUCTS.AVAILABLE_UNTIL' | translate }}</label>
                       <input id="available_until" type="date" [(ngModel)]="formData.available_until" name="available_until" [readonly]="!canEditProducts()">
                       <small class="field-hint">{{ 'PRODUCTS.AVAILABLE_UNTIL_HINT' | translate }}</small>
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
                       @if (canEditProducts()) {
                         <input type="file" #fileInput accept="image/jpeg,image/png,image/webp,image/avif" (change)="handleImageSelect($event)" style="display:none">
                         <button type="button" class="btn btn-secondary" (click)="fileInput.click()" [disabled]="uploading()">
                           {{ uploading() ? ('PRODUCTS.UPLOADING' | translate) : (pendingImageFile() ? ('PRODUCTS.CHANGE_IMAGE' | translate) : ('PRODUCTS.UPLOAD_IMAGE' | translate)) }}
                         </button>
                         @if (pendingImageFile()) {
                           <span class="pending-file-name">{{ pendingImageFile()?.name }}</span>
                         }
                       }
                     </div>
                   </div>

                   @if (canEditProducts() && editingProduct()?.id) {
                     <div class="form-group product-questions-section">
                       <label>{{ 'PRODUCTS.CUSTOMIZATIONS_TITLE' | translate }}</label>
                       <p class="field-hint">{{ 'PRODUCTS.CUSTOMIZATIONS_HINT' | translate }}</p>
                       @if (questionsLoading()) {
                         <p class="questions-loading">{{ 'PRODUCTS.QUESTIONS_LOADING' | translate }}</p>
                       } @else if (questionEditorMode() === null) {
                         @if (sortedProductQuestions().length === 0) {
                           <p class="questions-empty">{{ 'PRODUCTS.QUESTIONS_NONE' | translate }}</p>
                         } @else {
                           <ul class="question-list" role="list">
                             @for (q of sortedProductQuestions(); track q.id; let idx = $index) {
                               <li class="question-row">
                                 <div class="question-row-main">
                                   <span class="question-type-badge">{{ ('PRODUCTS.QUESTION_BADGE_' + q.type.toUpperCase()) | translate }}</span>
                                   @if (q.multi && q.type === 'choice') {
                                   <span class="question-type-badge question-multi-badge">{{ 'PRODUCTS.QUESTION_BADGE_MULTI' | translate }}</span>
                                   }
                                   <span class="question-label-text">{{ q.label }}</span>
                                   @if (q.required) {
                                     <span class="question-required-badge">{{ 'PRODUCTS.QUESTION_REQUIRED_BADGE' | translate }}</span>
                                   }
                                 </div>
                                 <div class="question-row-actions">
                                   <button type="button" class="btn btn-ghost btn-sm" (click)="moveQuestion(idx, -1)" [disabled]="questionSaving() || idx === 0" [title]="'PRODUCTS.QUESTION_MOVE_UP' | translate">↑</button>
                                   <button type="button" class="btn btn-ghost btn-sm" (click)="moveQuestion(idx, 1)" [disabled]="questionSaving() || idx === sortedProductQuestions().length - 1" [title]="'PRODUCTS.QUESTION_MOVE_DOWN' | translate">↓</button>
                                   <button type="button" class="btn btn-ghost btn-sm" (click)="openQuestionEditor(q.id)" [disabled]="questionSaving()">{{ 'PRODUCTS.QUESTION_EDIT' | translate }}</button>
                                   <button type="button" class="btn btn-ghost btn-sm btn-danger-ghost" (click)="confirmDeleteQuestion(q)" [disabled]="questionSaving()">{{ 'PRODUCTS.QUESTION_DELETE' | translate }}</button>
                                 </div>
                               </li>
                             }
                           </ul>
                         }
                         <button type="button" class="btn btn-secondary btn-sm" (click)="openQuestionEditor('new')" [disabled]="questionSaving()">{{ 'PRODUCTS.QUESTION_ADD' | translate }}</button>
                       } @else {
                         <div class="question-editor-card">
                           <h4 class="question-editor-title">{{ questionEditorMode() === 'new' ? ('PRODUCTS.QUESTION_NEW' | translate) : ('PRODUCTS.QUESTION_EDIT_TITLE' | translate) }}</h4>
                           <div class="form-row">
                             <div class="form-group">
                               <label for="q-type">{{ 'PRODUCTS.QUESTION_FIELD_TYPE' | translate }}</label>
                               <select id="q-type" name="q-type" [(ngModel)]="questionDraft.type" [disabled]="questionSaving()">
                                 <option value="choice">{{ 'PRODUCTS.QUESTION_TYPE_CHOICE' | translate }}</option>
                                 <option value="scale">{{ 'PRODUCTS.QUESTION_TYPE_SCALE' | translate }}</option>
                                 <option value="text">{{ 'PRODUCTS.QUESTION_TYPE_TEXT' | translate }}</option>
                               </select>
                             </div>
                             <div class="form-group flex-grow">
                               <label for="q-label">{{ 'PRODUCTS.QUESTION_FIELD_LABEL' | translate }}</label>
                               <input id="q-label" type="text" name="q-label" [(ngModel)]="questionDraft.label" [disabled]="questionSaving()" [placeholder]="'PRODUCTS.QUESTION_LABEL_PLACEHOLDER' | translate">
                             </div>
                           </div>
                           @if (questionDraft.type === 'choice') {
                             <div class="form-group">
                               <label for="q-options">{{ 'PRODUCTS.QUESTION_FIELD_OPTIONS' | translate }}</label>
                               <textarea id="q-options" name="q-options" rows="4" [(ngModel)]="questionDraft.choiceLines" [disabled]="questionSaving()" [placeholder]="'PRODUCTS.QUESTION_OPTIONS_PLACEHOLDER' | translate"></textarea>
                             </div>
                             <div class="form-group checkbox-row">
                               <label>
                                 <input type="checkbox" name="q-multi" [(ngModel)]="questionDraft.choiceMulti" [disabled]="questionSaving()">
                                 {{ 'PRODUCTS.QUESTION_CHOICE_MULTI' | translate }}
                               </label>
                             </div>
                           }
                           @if (questionDraft.type === 'scale') {
                             <div class="form-row">
                               <div class="form-group form-group-sm">
                                 <label for="q-min">{{ 'PRODUCTS.QUESTION_SCALE_MIN' | translate }}</label>
                                 <input id="q-min" type="number" name="q-min" [(ngModel)]="questionDraft.scaleMin" [disabled]="questionSaving()">
                               </div>
                               <div class="form-group form-group-sm">
                                 <label for="q-max">{{ 'PRODUCTS.QUESTION_SCALE_MAX' | translate }}</label>
                                 <input id="q-max" type="number" name="q-max" [(ngModel)]="questionDraft.scaleMax" [disabled]="questionSaving()">
                               </div>
                             </div>
                           }
                           <div class="form-group checkbox-row">
                             <label>
                               <input type="checkbox" name="q-req" [(ngModel)]="questionDraft.required" [disabled]="questionSaving()">
                               {{ 'PRODUCTS.QUESTION_FIELD_REQUIRED' | translate }}
                             </label>
                           </div>
                           <div class="question-editor-actions">
                             <button type="button" class="btn btn-secondary btn-sm" (click)="cancelQuestionEditor()" [disabled]="questionSaving()">{{ 'PRODUCTS.CANCEL' | translate }}</button>
                             <button type="button" class="btn btn-primary btn-sm" (click)="saveQuestionEditor()" [disabled]="questionSaving()">{{ 'PRODUCTS.QUESTION_SAVE' | translate }}</button>
                           </div>
                         </div>
                       }
                     </div>
                   }
                   @if (canEditProducts() && showAddForm() && !editingProduct()?.id) {
                     <p class="field-hint product-questions-hint-new">{{ 'PRODUCTS.CUSTOMIZATIONS_AFTER_SAVE' | translate }}</p>
                   }

                   <div class="form-actions">
                     <button type="button" class="btn btn-secondary" (click)="cancelForm()">{{ 'PRODUCTS.CANCEL' | translate }}</button>
                     <button type="submit" class="btn btn-primary" [disabled]="saving() || !canEditProducts()">
                       {{ saving() ? ('PRODUCTS.SAVING' | translate) : (editingProduct() ? ('PRODUCTS.UPDATE' | translate) : ('PRODUCTS.ADD_PRODUCT_BUTTON' | translate)) }}
                     </button>
                   </div>
                </form>
              </div>
            } @else {

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
                 @if (canEditProducts()) {
                 <button class="btn btn-primary" (click)="openAddForm()">{{ 'PRODUCTS.ADD_PRODUCT' | translate }}</button>
               }
               </div>
            } @else {
              <!-- Search -->
              <div class="search-row">
                <label for="products-search" class="visually-hidden">{{ 'PRODUCTS.SEARCH_PLACEHOLDER' | translate }}</label>
                <input
                  id="products-search"
                  type="search"
                  class="search-input"
                  [value]="searchQuery()"
                  (input)="onSearchChange($event)"
                  [placeholder]="'PRODUCTS.SEARCH_PLACEHOLDER' | translate"
                  autocomplete="off"
                />
              </div>
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
                          {{ getCategoryLabel(category) }}
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
                        {{ 'PRODUCTS.ALL_ITEMS_IN' | translate:{category: getCategoryLabel(selectedCategory()!) } }}
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

              <div class="table-card products-data-table">
                <div class="products-table-scroll">
                 <table>
                   <thead>
                     <tr>
                       <th style="width:60px"></th>
                       <th>{{ 'PRODUCTS.NAME_HEADER' | translate }}</th>
                       <th>{{ 'PRODUCTS.CATEGORY_HEADER' | translate }}</th>
                       <th>{{ 'PRODUCTS.SUBCATEGORY_HEADER' | translate }}</th>
                       <th>{{ 'PRODUCTS.PRICE_HEADER' | translate }}</th>
                       <th>{{ 'PRODUCTS.COST_HEADER' | translate }}</th>
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
                            <div class="no-image" title="No image">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <rect x="3" y="3" width="18" height="18" rx="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <path d="M21 15l-5-5L5 21"/>
                              </svg>
                            </div>
                          }
                        </td>
                        <td>
                          <div>{{ product.name }}</div>
                          @if (product.ingredients) {
                            <small class="ingredients">{{ product.ingredients }}</small>
                          }
                        </td>
                        <td>
                          @if (editingCategoryProductId() === product.id && canEditProducts()) {
                            <select 
                              class="inline-select" 
                              [(ngModel)]="editingCategory" 
                              (change)="onCategoryChangeInline()"
                              (blur)="saveCategoryInline(product)"
                              (keydown.escape)="cancelCategoryEdit()"
                              [attr.data-product-id]="product.id">
                              <option value="">None</option>
                              @for (category of getCategoryKeys(); track category) {
                                <option [value]="category">{{ getCategoryLabel(category) }}</option>
                              }
                            </select>
                          } @else {
                            <span class="category-cell" [class.clickable]="canEditProducts()" (click)="canEditProducts() && startCategoryEdit(product, $event)">
                              {{ product.category ? getCategoryLabel(product.category) : '—' }}
                            </span>
                          }
                        </td>
                        <td>
                          @if (editingCategoryProductId() === product.id && canEditProducts()) {
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
                            <span class="category-cell" [class.clickable]="canEditProducts()" (click)="canEditProducts() && startCategoryEdit(product, $event)">
                              {{ product.subcategory || '—' }}
                            </span>
                          }
                        </td>
                        <td class="price">{{ formatPrice(product.price_cents) }}</td>
                        <td class="price">{{ product.cost_cents != null ? formatPrice(product.cost_cents) : '—' }}</td>
                        <td class="actions">
                          <div class="actions-inner">
                          <button class="icon-btn" (click)="startEdit(product)" [attr.title]="'PRODUCTS.EDIT_TOOLTIP' | translate">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          @if (canEditProducts()) {
                            <button class="icon-btn icon-btn-danger" (click)="confirmDelete(product)" [attr.title]="'PRODUCTS.DELETE_TOOLTIP' | translate" [disabled]="deleting() === product.id">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                              </svg>
                            </button>
                          }
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
                </div>
              </div>
            }
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
  private permissions = inject(PermissionService);
  private translate = inject(TranslateService);

  canEditProducts = computed(() => this.permissions.hasPermission(this.permissions.getCurrentUser(), 'product:write'));

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
  /** Set when submit was attempted with invalid required fields; cleared on edit or cancel */
  productFormErrors = signal<{ name?: boolean; price?: boolean } | null>(null);
  formData: { name: string; price: number; cost: number | null; ingredients: string; description: string; category: string; subcategory: string; tax_id?: number | null; available_from?: string; available_until?: string } = { name: '', price: 0, cost: null, ingredients: '', description: '', category: '', subcategory: '' };
  productTaxes = signal<Tax[]>([]);
  uploading = signal(false);
  pendingImageFile = signal<File | null>(null);
  pendingImagePreview = signal<string | null>(null);
  currency = signal<string>('€');
  currencyCode = signal<string | null>(null);
  /** Bumps when UI language changes so price formatting refreshes in the template. */
  private intlRevision = signal(0);
  categories = signal<Record<string, string[]>>({});
  availableSubcategories = signal<string[]>([]);
  editingCategoryProductId = signal<number | null>(null);
  editingCategory: string = '';
  editingSubcategory: string = '';
  // Filter state
  searchQuery = signal('');
  selectedCategory = signal<string | null>(null);
  selectedSubcategory = signal<string | null>(null);
  availableCategories = signal<string[]>([]);
  availableSubcategoriesForFilter = signal<string[]>([]);

  /** Menu customization questions for the product being edited (existing products only). */
  productQuestions = signal<ProductQuestionStaff[]>([]);
  questionsLoading = signal(false);
  questionEditorMode = signal<null | 'new' | number>(null);
  questionSaving = signal(false);
  questionDraft: {
    type: 'choice' | 'scale' | 'text';
    label: string;
    choiceLines: string;
    /** When true, choice options are stored as { choices, multi: true } (guest picks several). */
    choiceMulti: boolean;
    scaleMin: number;
    scaleMax: number;
    required: boolean;
  } = {
    type: 'choice',
    label: '',
    choiceLines: '',
    choiceMulti: false,
    scaleMin: 1,
    scaleMax: 10,
    required: false,
  };

  sortedProductQuestions = computed(() =>
    [...this.productQuestions()].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
  );

  ngOnInit() {
    this.loadTenantSettingsThenProducts();
    this.loadCategories();
    this.api.getTaxes(true).subscribe({ next: (list) => this.productTaxes.set(list), error: () => this.productTaxes.set([]) });
    this.translate.onLangChange.subscribe(() => this.intlRevision.update((n) => n + 1));
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

  /** Translation key for known categories; falls back to raw value for custom categories. */
  getCategoryLabel(category: string): string {
    const keyMap: Record<string, string> = {
      'Starters': 'PRODUCTS.CATEGORY_STARTERS',
      'Main Course': 'PRODUCTS.CATEGORY_MAIN_COURSE',
      'Desserts': 'PRODUCTS.CATEGORY_DESSERTS',
      'Beverages': 'PRODUCTS.CATEGORY_BEVERAGES',
      'Sides': 'PRODUCTS.CATEGORY_SIDES',
    };
    const key = keyMap[category];
    if (key) return this.translate.instant(key);
    return category;
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

  loadTenantSettingsThenProducts() {
    this.api.getTenantSettings().subscribe({
      next: (settings) => {
        const code = settings.currency_code || null;
        this.currencyCode.set(code);
        if (code) {
          this.currency.set(currencySymbolFromIsoCode(this.translate, code));
        } else {
          this.currency.set(settings.currency || '€');
        }
        this.loadProducts();
      },
      error: (err) => {
        console.error('Failed to load tenant settings:', err);
        this.currency.set('€');
        this.loadProducts();
      },
    });
  }

  formatPrice(priceCents: number): string {
    void this.intlRevision();
    const currencyCode = this.currencyCode();
    const locale = intlLocaleFromTranslate(this.translate);
    if (currencyCode) {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        currencyDisplay: 'symbol',
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

  onSearchChange(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.applyFilters();
  }

  applyFilters() {
    let filtered = this.products();

    // Filter by search (name, ingredients, description, category, subcategory)
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(p => {
        const name = (p.name || '').toLowerCase();
        const ingredients = (p.ingredients || '').toLowerCase();
        const description = (p.description || '').toLowerCase();
        const category = (p.category || '').toLowerCase();
        const subcategory = (p.subcategory || '').toLowerCase();
        return name.includes(q) || ingredients.includes(q) || description.includes(q) || category.includes(q) || subcategory.includes(q);
      });
    }

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
    this.productFormErrors.set(null);
    this.editingProduct.set(product);
    this.formData = {
      name: product.name,
      price: product.price_cents / 100,
      cost: product.cost_cents != null ? product.cost_cents / 100 : null,
      ingredients: product.ingredients || '',
      description: product.description || '',
      category: product.category || '',
      subcategory: product.subcategory || '',
      tax_id: product.tax_id ?? null,
      available_from: product.available_from || '',
      available_until: product.available_until || '',
    };
    this.onCategoryChange(); // Update available subcategories
    this.showAddForm.set(false);
    if (product.id) {
      this.loadProductQuestions(product.id);
    } else {
      this.clearQuestionsState();
    }
  }

  openAddForm() {
    this.productFormErrors.set(null);
    this.formData = { name: '', price: 0, cost: null, ingredients: '', description: '', category: '', subcategory: '', tax_id: null, available_from: '', available_until: '' };
    this.showAddForm.set(true);
    this.clearQuestionsState();
  }

  cancelForm() {
    this.showAddForm.set(false);
    this.editingProduct.set(null);
    this.formData = { name: '', price: 0, cost: null, ingredients: '', description: '', category: '', subcategory: '', tax_id: null, available_from: '', available_until: '' };
    this.availableSubcategories.set([]);
    this.productFormErrors.set(null);
    this.clearPendingImage();
    this.clearQuestionsState();
  }

  private clearQuestionsState() {
    this.productQuestions.set([]);
    this.questionsLoading.set(false);
    this.questionEditorMode.set(null);
    this.questionSaving.set(false);
    this.resetQuestionDraft();
  }

  private resetQuestionDraft() {
    this.questionDraft = {
      type: 'choice',
      label: '',
      choiceLines: '',
      choiceMulti: false,
      scaleMin: 1,
      scaleMax: 10,
      required: false,
    };
  }

  loadProductQuestions(productId: number) {
    this.questionsLoading.set(true);
    this.questionEditorMode.set(null);
    this.resetQuestionDraft();
    this.api.getProductQuestions(productId).subscribe({
      next: (list) => {
        this.productQuestions.set(list);
        this.questionsLoading.set(false);
      },
      error: () => {
        this.productQuestions.set([]);
        this.questionsLoading.set(false);
      },
    });
  }

  openQuestionEditor(mode: 'new' | number) {
    this.questionEditorMode.set(mode);
    if (mode === 'new') {
      this.resetQuestionDraft();
      return;
    }
    const q = this.productQuestions().find((x) => x.id === mode);
    if (!q) {
      this.questionEditorMode.set(null);
      return;
    }
    this.questionDraft.type = q.type;
    this.questionDraft.label = q.label;
    this.questionDraft.required = q.required;
    if (q.type === 'choice' && Array.isArray(q.options)) {
      this.questionDraft.choiceLines = q.options.join('\n');
      this.questionDraft.choiceMulti = false;
    } else if (
      q.type === 'choice' &&
      q.options &&
      typeof q.options === 'object' &&
      !Array.isArray(q.options) &&
      'choices' in q.options
    ) {
      const o = q.options as { choices: string[]; multi?: boolean };
      this.questionDraft.choiceLines = (o.choices || []).join('\n');
      this.questionDraft.choiceMulti = !!o.multi;
    } else {
      this.questionDraft.choiceLines = '';
      this.questionDraft.choiceMulti = false;
    }
    if (q.type === 'scale' && q.options && typeof q.options === 'object' && !Array.isArray(q.options)) {
      this.questionDraft.scaleMin = (q.options as { min: number; max: number }).min;
      this.questionDraft.scaleMax = (q.options as { min: number; max: number }).max;
    } else {
      this.questionDraft.scaleMin = 1;
      this.questionDraft.scaleMax = 10;
    }
  }

  cancelQuestionEditor() {
    this.questionEditorMode.set(null);
    this.resetQuestionDraft();
  }

  saveQuestionEditor() {
    const pid = this.editingProduct()?.id;
    if (!pid) return;
    const mode = this.questionEditorMode();
    if (mode === null) return;
    const label = this.questionDraft.label.trim();
    if (!label) {
      this.error.set(this.translate.instant('PRODUCTS.QUESTION_LABEL_REQUIRED'));
      return;
    }
    let options: string[] | { min: number; max: number } | { choices: string[]; multi: boolean } | null | undefined;
    if (this.questionDraft.type === 'choice') {
      const opts = this.questionDraft.choiceLines
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      if (opts.length === 0) {
        this.error.set(this.translate.instant('PRODUCTS.QUESTION_OPTIONS_REQUIRED'));
        return;
      }
      options = this.questionDraft.choiceMulti ? { choices: opts, multi: true } : opts;
    } else if (this.questionDraft.type === 'scale') {
      if (this.questionDraft.scaleMin >= this.questionDraft.scaleMax) {
        this.error.set(this.translate.instant('PRODUCTS.QUESTION_SCALE_INVALID'));
        return;
      }
      options = { min: this.questionDraft.scaleMin, max: this.questionDraft.scaleMax };
    } else {
      options = null;
    }
    this.error.set('');
    this.questionSaving.set(true);
    if (mode === 'new') {
      const list = this.productQuestions();
      const nextOrder =
        list.length === 0 ? 0 : Math.max(...list.map((q) => q.sort_order), 0) + 1;
      this.api
        .createProductQuestion(pid, {
          type: this.questionDraft.type,
          label,
          options: this.questionDraft.type === 'text' ? null : options,
          required: this.questionDraft.required,
          sort_order: nextOrder,
        })
        .subscribe({
          next: (q) => {
            this.productQuestions.update((arr) => [...arr, q]);
            this.cancelQuestionEditor();
            this.questionSaving.set(false);
          },
          error: (err) => {
            this.error.set(err.error?.detail || this.translate.instant('PRODUCTS.QUESTION_SAVE_FAILED'));
            this.questionSaving.set(false);
          },
        });
    } else {
      this.api
        .updateProductQuestion(pid, mode, {
          type: this.questionDraft.type,
          label,
          options: this.questionDraft.type === 'text' ? null : options,
          required: this.questionDraft.required,
        })
        .subscribe({
          next: (q) => {
            this.productQuestions.update((arr) => arr.map((x) => (x.id === q.id ? q : x)));
            this.cancelQuestionEditor();
            this.questionSaving.set(false);
          },
          error: (err) => {
            this.error.set(err.error?.detail || this.translate.instant('PRODUCTS.QUESTION_SAVE_FAILED'));
            this.questionSaving.set(false);
          },
        });
    }
  }

  moveQuestion(index: number, dir: -1 | 1) {
    const pid = this.editingProduct()?.id;
    if (!pid) return;
    const list = [...this.sortedProductQuestions()];
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    const a = list[index]!;
    const b = list[j]!;
    list[index] = b;
    list[j] = a;
    const ids = list.map((q) => q.id);
    this.questionSaving.set(true);
    this.api.reorderProductQuestions(pid, ids).subscribe({
      next: (updated) => {
        this.productQuestions.set(updated);
        this.questionSaving.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.detail || this.translate.instant('PRODUCTS.QUESTION_REORDER_FAILED'));
        this.questionSaving.set(false);
      },
    });
  }

  confirmDeleteQuestion(q: ProductQuestionStaff) {
    const pid = this.editingProduct()?.id;
    if (!pid) return;
    const msg = this.translate.instant('PRODUCTS.QUESTION_DELETE_CONFIRM', { label: q.label });
    if (!globalThis.confirm?.(msg)) return;
    this.questionSaving.set(true);
    this.api.deleteProductQuestion(pid, q.id).subscribe({
      next: () => {
        this.productQuestions.update((arr) => arr.filter((x) => x.id !== q.id));
        if (this.questionEditorMode() === q.id) {
          this.cancelQuestionEditor();
        }
        this.questionSaving.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.detail || this.translate.instant('PRODUCTS.QUESTION_DELETE_FAILED'));
        this.questionSaving.set(false);
      },
    });
  }

  clearProductFormError(field: 'name' | 'price') {
    const current = this.productFormErrors();
    if (!current) return;
    const next = { ...current };
    delete next[field];
    const nextState = Object.keys(next).length ? next : null;
    this.productFormErrors.set(nextState);
    if (!nextState) this.error.set('');
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
    if (!this.canEditProducts()) return;

    const nameInvalid = !this.formData.name?.trim();
    const priceInvalid = this.formData.price == null || Number(this.formData.price) <= 0;
    if (nameInvalid || priceInvalid) {
      this.productFormErrors.set({ name: nameInvalid, price: priceInvalid });
      this.error.set(this.translate.instant('PRODUCTS.FILL_REQUIRED_FIELDS'));
      return;
    }

    this.productFormErrors.set(null);
    this.error.set('');
    this.saving.set(true);
    const productData = {
      name: this.formData.name,
      price_cents: Math.round(this.formData.price * 100),
      cost_cents: this.formData.cost != null && this.formData.cost >= 0 ? Math.round(this.formData.cost * 100) : undefined,
      ingredients: this.formData.ingredients || undefined,
      description: this.formData.description || undefined,
      category: this.formData.category || undefined,
      subcategory: this.formData.subcategory || undefined,
      tax_id: this.formData.tax_id,
      available_from: this.formData.available_from?.trim() || null,
      available_until: this.formData.available_until?.trim() || null,
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
    const wrapper = img.closest('.image-preview-wrapper');
    if (wrapper) {
      let placeholder = wrapper.querySelector('.no-image') as HTMLElement;
      if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.className = 'no-image';
        placeholder.title = 'No image';
        placeholder.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
        wrapper.insertBefore(placeholder, img);
      } else {
        placeholder.style.display = 'flex';
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