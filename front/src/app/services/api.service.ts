import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';

// Define interfaces for API interactions
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
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  // Assuming backend is on localhost:8020 as per context
  private apiUrl = 'http://localhost:8020';

  private tokenKey = 'pos_token';
  private userSubject = new BehaviorSubject<User | null>(null);

  user$ = this.userSubject.asObservable();

  constructor() {
    this.loadToken();
  }

  private loadToken() {
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem(this.tokenKey);
      if (token) {
        // Decode token to get user info (simplified, normally use a helper)
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
  }

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/products`);
  }

  createProduct(product: Product): Observable<Product> {
    return this.http.post<Product>(`${this.apiUrl}/products`, product);
  }
}
