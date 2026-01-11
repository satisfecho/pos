import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

// Interfaces
export interface User {
  email: string;
  tenant_id: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterResponse {
  status: string;
  tenant_id: number;
  email: string;
}

export interface Product {
  id?: number;
  name: string;
  price_cents: number;
  tenant_id?: number;
  image_filename?: string;
  ingredients?: string;
}

export interface Table {
  id?: number;
  name: string;
  token?: string;
  tenant_id?: number;
}

export interface OrderItem {
  id?: number;
  product_name: string;
  quantity: number;
  price_cents: number;
  notes?: string;
}

export interface Order {
  id: number;
  table_name: string;
  status: string;
  notes?: string;
  created_at: string;
  items: OrderItem[];
  total_cents: number;
}

export interface MenuResponse {
  table_name: string;
  table_id: number;
  tenant_id: number;
  tenant_name: string;
  products: Product[];
}

export interface OrderItemCreate {
  product_id: number;
  quantity: number;
  notes?: string;
}

export interface OrderCreate {
  items: OrderItemCreate[];
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private wsUrl = environment.wsUrl;

  private tokenKey = 'pos_token';
  private userSubject = new BehaviorSubject<User | null>(null);
  private orderUpdates = new Subject<any>();
  private ws: WebSocket | null = null;

  user$ = this.userSubject.asObservable();
  orderUpdates$ = this.orderUpdates.asObservable();

  constructor() {
    this.loadToken();
  }

  private loadToken() {
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem(this.tokenKey);
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          this.userSubject.next({
            email: payload.sub,
            tenant_id: payload.tenant_id
          });
        } catch (e) {
          this.logout();
        }
      }
    }
  }

  getToken(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(this.tokenKey);
    }
    return null;
  }

  getCurrentUser(): User | null {
    return this.userSubject.value;
  }

  // Auth
  register(data: any): Observable<RegisterResponse> {
    let params = new HttpParams();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        params = params.set(key, data[key]);
      }
    });
    return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, null, { params });
  }

  login(credentials: FormData): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/token`, credentials).pipe(
      tap(res => {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(this.tokenKey, res.access_token);
        }
        this.loadToken();
      })
    );
  }

  logout() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.tokenKey);
    }
    this.userSubject.next(null);
    this.disconnectWebSocket();
  }

  // Products
  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/products`);
  }

  createProduct(product: Product): Observable<Product> {
    return this.http.post<Product>(`${this.apiUrl}/products`, product);
  }

  updateProduct(id: number, product: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/products/${id}`, product);
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/products/${id}`);
  }

  uploadProductImage(productId: number, file: File): Observable<Product> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Product>(`${this.apiUrl}/products/${productId}/image`, formData);
  }

  getProductImageUrl(product: Product): string | null {
    if (!product.image_filename || !product.tenant_id) return null;
    return `${this.apiUrl}/uploads/${product.tenant_id}/products/${product.image_filename}`;
  }

  // Tables
  getTables(): Observable<Table[]> {
    return this.http.get<Table[]>(`${this.apiUrl}/tables`);
  }

  createTable(name: string): Observable<Table> {
    return this.http.post<Table>(`${this.apiUrl}/tables`, { name });
  }

  deleteTable(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tables/${id}`);
  }

  // Orders
  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/orders`);
  }

  updateOrderStatus(orderId: number, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/orders/${orderId}/status`, { status });
  }

  // Public Menu (no auth)
  getMenu(tableToken: string): Observable<MenuResponse> {
    return this.http.get<MenuResponse>(`${this.apiUrl}/menu/${tableToken}`);
  }

  submitOrder(tableToken: string, order: OrderCreate): Observable<any> {
    return this.http.post(`${this.apiUrl}/menu/${tableToken}/order`, order);
  }

  getCurrentOrder(tableToken: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/menu/${tableToken}/order`);
  }

  // Payments
  createPaymentIntent(orderId: number, tableToken: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/orders/${orderId}/create-payment-intent?table_token=${tableToken}`, {});
  }

  confirmPayment(orderId: number, tableToken: string, paymentIntentId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/orders/${orderId}/confirm-payment?table_token=${tableToken}&payment_intent_id=${paymentIntentId}`,
      {}
    );
  }

  getStripePublishableKey(): string {
    return 'pk_test_51SjyYeC5b7HsHF8lLQmByWhJbPSroVBO2Q39x64b8QD4ixNlBolibtxXTHCk9ZFQe1vS0ZPXBYj4HvbNmFESLSsC00bd6v2sOS';
  }

  // WebSocket for real-time updates
  connectWebSocket(): void {
    const user = this.getCurrentUser();
    if (!user || this.ws) return;

    this.ws = new WebSocket(`${this.wsUrl}/ws/${user.tenant_id}`);

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.orderUpdates.next(data);
      } catch (e) {
        console.error('WebSocket parse error:', e);
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      // Reconnect after 3 seconds
      setTimeout(() => this.connectWebSocket(), 3000);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
