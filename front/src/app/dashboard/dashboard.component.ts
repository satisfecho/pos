import { Component, inject, signal, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, Product, User } from '../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, DecimalPipe, RouterLink],
  template: `
    <div class="layout" [class.sidebar-open]="sidebarOpen()">
      <!-- Mobile Header -->
      <header class="mobile-header">
        <button class="menu-btn" (click)="toggleSidebar()">
          <span class="menu-icon">☰</span>
        </button>
        <h1>POS System</h1>
      </header>

      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <h2>POS System</h2>
          <button class="close-btn" (click)="toggleSidebar()">×</button>
        </div>
        
        <nav class="nav-menu">
          <a routerLink="/" class="nav-item active">
            <span class="nav-icon">🏠</span>
            <span class="nav-text">Home</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="user-info">
            @if (user()) {
              <span class="user-email">{{ user()?.email }}</span>
              <span class="user-tenant">Tenant #{{ user()?.tenant_id }}</span>
            }
          </div>
          <button class="logout-btn" (click)="logout()">
            <span class="nav-icon">🚪</span>
            <span class="nav-text">Logout</span>
          </button>
        </div>
      </aside>

      <!-- Overlay for mobile -->
      <div class="overlay" (click)="closeSidebar()"></div>

      <!-- Main Content -->
      <main class="main-content">
        <div class="content-header">
          <h1>Dashboard</h1>
        </div>

        <div class="content-body">
          <section class="products-section">
            <div class="section-header">
              <h2>Products</h2>
              <button class="btn btn-primary" (click)="showAddForm.set(!showAddForm())">
                {{ showAddForm() ? 'Cancel' : '+ Add Product' }}
              </button>
            </div>

            @if (showAddForm()) {
              <form class="add-form card" (submit)="addProduct($event)">
                <div class="form-row">
                  <div class="form-group">
                    <label for="name">Product Name</label>
                    <input id="name" type="text" [(ngModel)]="newProduct.name" name="name" required>
                  </div>
                  <div class="form-group">
                    <label for="price">Price (cents)</label>
                    <input id="price" type="number" [(ngModel)]="newProduct.price_cents" name="price" required>
                  </div>
                  <button type="submit" class="btn btn-primary">Save</button>
                </div>
              </form>
            }

            @if (loading()) {
              <div class="loading-state">
                <p>Loading products...</p>
              </div>
            } @else if (products().length === 0) {
              <div class="empty-state card">
                <p>No products yet. Add your first product!</p>
              </div>
            } @else {
              <div class="products-grid">
                @for (product of products(); track product.id) {
                  <div class="card product-card">
                    <h3>{{ product.name }}</h3>
                    <p class="price">\${{ (product.price_cents / 100) | number:'1.2-2' }}</p>
                  </div>
                }
              </div>
            }
          </section>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .layout {
      display: flex;
      min-height: 100vh;
      background: linear-gradient(135deg, #1e1e2f 0%, #2d2d44 100%);
    }

    /* Sidebar */
    .sidebar {
      width: 260px;
      background: linear-gradient(180deg, #252542 0%, #1a1a2e 100%);
      color: white;
      display: flex;
      flex-direction: column;
      position: fixed;
      height: 100vh;
      left: 0;
      top: 0;
      z-index: 1000;
      box-shadow: 4px 0 15px rgba(0, 0, 0, 0.3);
      transition: transform 0.3s ease;
    }

    .sidebar-header {
      padding: 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .sidebar-header h2 {
      margin: 0;
      font-size: 1.25rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .close-btn {
      display: none;
      background: none;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
    }

    .nav-menu {
      flex: 1;
      padding: 1rem 0;
    }

    .nav-item {
      display: flex;
      align-items: center;
      padding: 0.875rem 1.5rem;
      color: rgba(255, 255, 255, 0.7);
      text-decoration: none;
      transition: all 0.2s ease;
      border-left: 3px solid transparent;
    }

    .nav-item:hover {
      background: rgba(255, 255, 255, 0.05);
      color: white;
    }

    .nav-item.active {
      background: rgba(102, 126, 234, 0.15);
      color: #667eea;
      border-left-color: #667eea;
    }

    .nav-icon {
      margin-right: 0.75rem;
      font-size: 1.25rem;
    }

    .nav-text {
      font-size: 0.95rem;
    }

    .sidebar-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .user-info {
      margin-bottom: 1rem;
    }

    .user-email {
      display: block;
      font-size: 0.9rem;
      color: white;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .user-tenant {
      display: block;
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
    }

    .logout-btn {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 0.75rem 1rem;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      color: #ef4444;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .logout-btn:hover {
      background: rgba(239, 68, 68, 0.2);
    }

    /* Main Content */
    .main-content {
      flex: 1;
      margin-left: 260px;
      padding: 2rem;
    }

    .content-header {
      margin-bottom: 2rem;
    }

    .content-header h1 {
      margin: 0;
      color: white;
      font-size: 1.75rem;
    }

    .content-body {
      background: rgba(255, 255, 255, 0.03);
      border-radius: 16px;
      padding: 1.5rem;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .section-header h2 {
      margin: 0;
      color: white;
      font-size: 1.25rem;
    }

    /* Cards & Products */
    .card {
      background: rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 1.5rem;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
    }

    .product-card h3 {
      margin: 0 0 0.5rem 0;
      color: white;
      font-size: 1.1rem;
    }

    .price {
      font-size: 1.5rem;
      font-weight: bold;
      color: #10b981;
      margin: 0;
    }

    .empty-state {
      text-align: center;
      color: rgba(255, 255, 255, 0.6);
      padding: 3rem;
    }

    .loading-state {
      text-align: center;
      color: rgba(255, 255, 255, 0.6);
      padding: 2rem;
    }

    /* Form */
    .add-form {
      margin-bottom: 1.5rem;
    }

    .form-row {
      display: flex;
      gap: 1rem;
      align-items: flex-end;
      flex-wrap: wrap;
    }

    .form-group {
      flex: 1;
      min-width: 150px;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.875rem;
    }

    .form-group input {
      width: 100%;
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      color: white;
      font-size: 1rem;
    }

    .form-group input:focus {
      outline: none;
      border-color: #667eea;
    }

    /* Buttons */
    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.9rem;
      transition: all 0.2s ease;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }

    /* Mobile Header */
    .mobile-header {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: #1a1a2e;
      padding: 0 1rem;
      align-items: center;
      z-index: 999;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .mobile-header h1 {
      margin: 0;
      font-size: 1.25rem;
      color: white;
    }

    .menu-btn {
      background: none;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.5rem;
      margin-right: 1rem;
    }

    .overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .mobile-header {
        display: flex;
      }

      .sidebar {
        transform: translateX(-100%);
      }

      .sidebar-open .sidebar {
        transform: translateX(0);
      }

      .sidebar-open .overlay {
        display: block;
      }

      .close-btn {
        display: block;
      }

      .main-content {
        margin-left: 0;
        padding: 80px 1rem 1rem;
      }

      .products-grid {
        grid-template-columns: 1fr;
      }

      .form-row {
        flex-direction: column;
      }

      .form-group {
        width: 100%;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  products = signal<Product[]>([]);
  loading = signal(true);
  user = signal<User | null>(null);
  showAddForm = signal(false);
  sidebarOpen = signal(false);

  newProduct = { name: '', price_cents: 0 };

  ngOnInit() {
    this.api.user$.subscribe(user => this.user.set(user));
    this.loadProducts();
  }

  toggleSidebar() {
    this.sidebarOpen.update(v => !v);
  }

  closeSidebar() {
    this.sidebarOpen.set(false);
  }

  loadProducts() {
    this.loading.set(true);
    this.api.getProducts().subscribe({
      next: (products) => {
        this.products.set(products);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  addProduct(event: Event) {
    event.preventDefault();
    if (!this.newProduct.name || this.newProduct.price_cents <= 0) return;

    this.api.createProduct(this.newProduct).subscribe({
      next: (product) => {
        this.products.update(list => [...list, product]);
        this.newProduct = { name: '', price_cents: 0 };
        this.showAddForm.set(false);
      }
    });
  }

  logout() {
    this.api.logout();
    this.router.navigate(['/login']);
  }
}
