import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  Observable,
  BehaviorSubject,
  tap,
  Subject,
  catchError,
  of,
  map,
  finalize,
  filter,
  take,
} from 'rxjs';
import { environment } from '../../environments/environment';

// Interfaces
export type UserRole = 'owner' | 'admin' | 'kitchen' | 'bartender' | 'waiter' | 'receptionist' | 'provider';

export interface User {
  id?: number;
  email: string;
  full_name?: string;
  tenant_id?: number | null;
  provider_id?: number | null;
  role: UserRole;
}

export interface UserCreate {
  email: string;
  password: string;
  full_name?: string;
  role: UserRole;
}

export interface UserUpdate {
  email?: string;
  full_name?: string;
  role?: UserRole;
  password?: string;
}

export interface Shift {
  id: number;
  tenant_id: number;
  user_id: number;
  user_name: string;
  user_role: string;
  date: string;
  start_time: string;
  end_time: string;
  label: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ShiftCreate {
  user_id: number;
  date: string;
  start_time: string;
  end_time: string;
  label?: string | null;
}

export interface ShiftUpdate {
  user_id?: number;
  date?: string;
  start_time?: string;
  end_time?: string;
  label?: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterResponse {
  status: string;
  tenant_id?: number;
  provider_id?: number;
  email: string;
}

/** Provider portal types */
export interface ProviderInfo {
  id: number;
  name: string;
  token: string;
  url?: string | null;
  is_active: boolean;
  full_company_name?: string | null;
  address?: string | null;
  tax_number?: string | null;
  phone?: string | null;
  email?: string | null;
  bank_iban?: string | null;
  bank_bic?: string | null;
  bank_name?: string | null;
  bank_account_holder?: string | null;
}

export interface ProviderRegisterData {
  provider_name: string;
  email: string;
  password: string;
  full_name?: string | null;
  full_company_name?: string | null;
  address?: string | null;
  tax_number?: string | null;
  phone?: string | null;
  bank_iban?: string | null;
  bank_bic?: string | null;
  bank_name?: string | null;
  bank_account_holder?: string | null;
}

export interface ProviderUpdateData {
  full_company_name?: string | null;
  address?: string | null;
  tax_number?: string | null;
  phone?: string | null;
  email?: string | null;
  bank_iban?: string | null;
  bank_bic?: string | null;
  bank_name?: string | null;
  bank_account_holder?: string | null;
}

export interface ProviderCatalogItem {
  id: number;
  name: string;
  category?: string | null;
  subcategory?: string | null;
}

export interface ProviderProductItem {
  id: number;
  catalog_id: number;
  catalog_name?: string | null;
  name: string;
  price_cents?: number | null;
  availability: boolean;
  image_url?: string | null;
  external_id: string;
  country?: string | null;
  region?: string | null;
  volume_ml?: number | null;
  unit?: string | null;
  detailed_description?: string | null;
  grape_variety?: string | null;
  wine_style?: string | null;
  vintage?: number | null;
  winery?: string | null;
  aromas?: string | null;
  elaboration?: string | null;
}

export interface ProviderProductCreate {
  catalog_id?: number | null;
  name: string;
  category?: string | null;
  subcategory?: string | null;
  description?: string | null;
  brand?: string | null;
  barcode?: string | null;
  external_id?: string;
  price_cents?: number | null;
  availability?: boolean;
  country?: string | null;
  region?: string | null;
  grape_variety?: string | null;
  volume_ml?: number | null;
  unit?: string | null;
  detailed_description?: string | null;
  wine_style?: string | null;
  vintage?: number | null;
  winery?: string | null;
  aromas?: string | null;
  elaboration?: string | null;
}

export interface ProviderProductUpdate {
  name?: string | null;
  price_cents?: number | null;
  availability?: boolean | null;
  country?: string | null;
  region?: string | null;
  grape_variety?: string | null;
  volume_ml?: number | null;
  unit?: string | null;
  detailed_description?: string | null;
  wine_style?: string | null;
  vintage?: number | null;
  winery?: string | null;
  aromas?: string | null;
  elaboration?: string | null;
}

export interface ProviderProduct {
  id: number;
  catalog_id: number;
  provider_id: number;
  external_id: string;
  name: string;
  price_cents?: number | null;
  availability: boolean;
  image_filename?: string | null;
  country?: string | null;
  region?: string | null;
  volume_ml?: number | null;
  unit?: string | null;
  [key: string]: unknown;
}

/** Public tenant info for landing page / tenant picker / book page. */
export interface TenantSummary {
  id: number;
  name: string;
  logo_filename: string | null;
  header_background_filename?: string | null;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  /** Mailing / street address (shown on public book and reservation pages when set). */
  address?: string | null;
  opening_hours?: string | null;
  /** Background color for public pages (hex, e.g. #1E22AA for RAL5002 Azul). */
  public_background_color?: string | null;
  /** Token for take-away/home ordering menu when a table is configured (e.g. named "Take away"). */
  take_away_table_token?: string | null;
  /** Reservation rules (for book page and reservation view) */
  reservation_prepayment_cents?: number | null;
  reservation_prepayment_text?: string | null;
  reservation_cancellation_policy?: string | null;
  reservation_arrival_tolerance_minutes?: number | null;
  reservation_dress_code?: string | null;
  /** Google Maps / Business Profile "Write a review" URL (thank-you page on public feedback form). */
  public_google_review_url?: string | null;
  /** Google Maps place or directions URL (Share link). */
  public_google_maps_url?: string | null;
}

/** One restaurant when several share the same printed table name. */
export interface PublicTableLookupChoice {
  table_token: string;
  tenant_id: number;
  tenant_name: string;
  table_name: string;
}

/** GET /public/table-lookup — token or printed name (e.g. T01) → menu token. */
export interface PublicTableLookupResponse {
  table_token: string | null;
  ambiguous: boolean;
  choices: PublicTableLookupChoice[];
}

/** Staff list + public submit response context */
export interface GuestFeedback {
  id: number;
  created_at: string | null;
  rating: number;
  comment: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  reservation_id: number | null;
  reservation_date?: string | null;
  reservation_time?: string | null;
  reservation_customer_name?: string | null;
  client_ip?: string | null;
  client_user_agent?: string | null;
}

export interface Product {
  id?: number;
  name: string;
  price_cents: number;
  cost_cents?: number | null;
  tenant_id?: number;
  image_filename?: string;
  ingredients?: string;
  image_size_bytes?: number | null;
  image_size_formatted?: string | null;
  category?: string; // Main category: "Starters", "Main Course", "Desserts", "Beverages", "Sides"
  subcategory?: string; // Subcategory: "Red Wine", "Appetizers", etc.
  tax_id?: number | null; // Override default tax for this product
  available_from?: string | null; // YYYY-MM-DD; customer menu shows from this date
  available_until?: string | null; // YYYY-MM-DD; customer menu shows until this date
  // Legacy fields (for menu products from catalog)
  category_code?: string; // Category code for i18n: "STARTERS", "MAIN_COURSE", "BEVERAGES", etc.
  subcategory_codes?: string[]; // Subcategory codes for i18n: ["WINE_RED", "WINE_BY_GLASS"], etc.
  // Wine details (for catalog products)
  description?: string;
  detailed_description?: string;
  country?: string;
  region?: string;
  wine_type?: string; // "Red Wine", "White Wine", "Sparkling Wine", etc.
  wine_style?: string;
  vintage?: number;
  winery?: string;
  grape_variety?: string;
  aromas?: string;
  elaboration?: string;
  _source?: string; // "tenant_product" or "product" to distinguish between TenantProduct and legacy Product
  /** Optional customization questions (e.g. doneness, spice level) */
  questions?: ProductQuestion[];
}

/** Product customization question (e.g. meat doneness, spice 1–10, multi toppings) */
export interface ProductQuestion {
  id: number;
  type: 'choice' | 'scale' | 'text';
  label: string;
  options?: string[] | { min: number; max: number } | { choices: string[]; multi?: boolean } | null;
  /** True when choice options use multi-select ({ choices, multi: true }) */
  multi?: boolean;
  required?: boolean;
  sort_order?: number;
}

/** Staff list/create response (sort order + required always set). */
export type ProductQuestionStaff = Omit<ProductQuestion, 'sort_order' | 'required'> & {
  sort_order: number;
  required: boolean;
  multi?: boolean;
};

export interface ProductQuestionCreatePayload {
  type: 'choice' | 'scale' | 'text';
  label: string;
  options?: string[] | { min: number; max: number } | { choices: string[]; multi?: boolean } | null;
  sort_order?: number;
  required?: boolean;
}

export interface ProductQuestionUpdatePayload {
  type?: 'choice' | 'scale' | 'text';
  label?: string;
  options?: string[] | { min: number; max: number } | { choices: string[]; multi?: boolean } | null;
  sort_order?: number;
  required?: boolean;
}

export interface CatalogCategories {
  [category: string]: string[]; // category -> list of subcategories
}

export interface Floor {
  id?: number;
  name: string;
  sort_order: number;
  tenant_id?: number;
  default_waiter_id?: number | null;
  default_waiter_name?: string | null;
}

export interface Table {
  id?: number;
  name: string;
  token?: string;
  tenant_id?: number;
  floor_id?: number;
  x_position?: number;
  y_position?: number;
  rotation?: number;
  shape?: 'rectangle' | 'circle' | 'oval' | 'booth' | 'bar';
  width?: number;
  height?: number;
  seat_count?: number;
  // Table session and PIN security
  order_pin?: string | null;
  is_active?: boolean;
  active_order_id?: number | null;
  activated_at?: string | null;
  // Waiter assignment
  assigned_waiter_id?: number | null;
  assigned_waiter_name?: string | null;
  effective_waiter_id?: number | null;
  effective_waiter_name?: string | null;
}

export interface TableActivateResponse {
  id: number;
  name: string;
  pin: string;
  is_active: boolean;
  active_order_id: number;
  activated_at: string | null;
}

export interface TableCloseResponse {
  id: number;
  name: string;
  is_active: boolean;
  message: string;
}

export interface UpcomingReservationOnTable {
  reservation_id: number;
  reservation_time: string;
  customer_name: string;
}

export interface CanvasTable extends Table {
  status?: 'available' | 'occupied' | 'reserved';
  assigned_waiter_id?: number | null;
  assigned_waiter_name?: string | null;
  effective_waiter_id?: number | null;
  effective_waiter_name?: string | null;
  upcoming_reservation?: UpcomingReservationOnTable | null;
}

export interface OverbookingSlot {
  reservation_time: string;
  total_seats: number;
  total_tables: number;
  reserved_guests: number;
  reserved_parties: number;
  over_seats: boolean;
  over_tables: boolean;
}

export interface OverbookingReport {
  date: string;
  total_seats: number;
  total_tables: number;
  slots: OverbookingSlot[];
}

export type ReservationStatus = 'booked' | 'seated' | 'finished' | 'cancelled' | 'no_show';

export interface Reservation {
  id: number;
  tenant_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  status: ReservationStatus;
  table_id?: number | null;
  table_name?: string | null;
  seated_at?: string | null;
  token?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  client_notes?: string | null;
  customer_notes?: string | null;
  owner_notes?: string | null;
  delay_notice?: string | null;
  /** Present only for staff responses */
  client_ip?: string | null;
  client_user_agent?: string | null;
  client_fingerprint?: string | null;
  client_screen_width?: number | null;
  client_screen_height?: number | null;
}

export interface ReservationCreate {
  tenant_id?: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  client_notes?: string | null;
  customer_notes?: string | null;
  client_fingerprint?: string | null;
  client_screen_width?: number | null;
  client_screen_height?: number | null;
}

export interface ReservationUpdate {
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string | null;
  reservation_date?: string;
  reservation_time?: string;
  party_size?: number;
  client_notes?: string | null;
  customer_notes?: string | null;
  owner_notes?: string | null;
  delay_notice?: string | null;
}

/** Public update by token: delay notice, reservation notes, customer notes. */
export interface PublicReservationUpdate {
  delay_notice?: string | null;
  client_notes?: string | null;
  customer_notes?: string | null;
}

export interface OrderItem {
  id?: number;
  product_name: string;
  quantity: number;
  price_cents: number;
  cost_cents?: number | null;
  notes?: string;
  /** Answers to product questions: { question_id: value } */
  customization_answers?: Record<string, string | number | string[]> | null;
  /** Snapshot "Label: value · …" at order time */
  customization_summary?: string | null;
  status?: string;  // pending, preparing, ready, delivered, cancelled
  removed_by_customer?: boolean;
  removed_at?: string;
  removed_reason?: string;
  tax_id?: number | null;
  tax_rate_percent?: number | null;
  tax_amount_cents?: number | null;
  /** Product category for kitchen/bar display filtering: "Beverages", "Main Course", etc. */
  category?: string | null;
}

/** Billing customer for Factura (tax invoice) */
export interface BillingCustomer {
  id: number;
  name: string;
  company_name?: string | null;
  tax_id?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  /** ISO date YYYY-MM-DD; optional CRM / occasions */
  birth_date?: string | null;
  created_at: string;
}

export interface Order {
  id: number;
  table_name: string;
  table_id?: number | null;
  table_token?: string | null;
  status: string;
  notes?: string;
  session_id?: string;
  customer_name?: string;
  billing_customer_id?: number | null;
  billing_customer?: BillingCustomer | null;
  created_at: string;
  items: OrderItem[];
  total_cents: number;
  removed_items_count?: number;
  paid_at?: string | null;
  payment_method?: string | null;
}

export interface MenuResponse {
  table_name: string;
  table_id: number;
  tenant_id: number;
  tenant_name: string;
  tenant_logo?: string | null;
  tenant_description?: string | null;
  tenant_phone?: string | null;
  tenant_whatsapp?: string | null;
  tenant_address?: string | null;
  tenant_website?: string | null;
  tenant_currency?: string | null;
  tenant_currency_code?: string | null;
  tenant_stripe_publishable_key?: string | null;
  tenant_revolut_configured?: boolean;
  tenant_immediate_payment_required?: boolean;
  tenant_public_background_color?: string | null;
  tenant_header_background_filename?: string | null;
  // Table session status
  table_is_active?: boolean;
  table_requires_pin?: boolean;
  active_order_id?: number | null;
  products: Product[];
}

/** Tax (IVA) rate with validity period */
export interface Tax {
  id: number;
  tenant_id: number;
  name: string;
  rate_percent: number;
  valid_from: string;
  valid_to: string | null;
  created_at?: string;
}

export interface TenantSettings {
  id?: number;
  name: string;
  business_type?: string | null;
  description?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  website?: string | null;
  tax_id?: string | null;
  cif?: string | null;
  default_tax_id?: number | null;
  logo_filename?: string | null;
  header_background_filename?: string | null;
  opening_hours?: string | null;
  immediate_payment_required?: boolean;
  currency?: string | null;
  currency_code?: string | null;
  default_language?: string | null;
  timezone?: string | null;
  stripe_secret_key?: string | null;
  stripe_publishable_key?: string | null;
  revolut_merchant_secret?: string | null;
  logo_size_bytes?: number | null;
  logo_size_formatted?: string | null;
  // Location verification settings
  latitude?: number | null;
  longitude?: number | null;
  location_radius_meters?: number | null;
  location_check_enabled?: boolean;
  // Per-tenant SMTP / email (optional; fallback to global config)
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_use_tls?: boolean | null;
  smtp_user?: string | null;
  smtp_password?: string | null;
  email_from?: string | null;
  email_from_name?: string | null;
  /** Plain-text subject/body with {{placeholders}} for reservation confirmations */
  reservation_confirmation_email_subject?: string | null;
  reservation_confirmation_email_body?: string | null;
  /** Background color for public-facing pages (hex, e.g. #1E22AA for RAL5002 Azul). */
  public_background_color?: string | null;
  /** Reservation options (pre-payment, policies, reminders) */
  reservation_prepayment_cents?: number | null;
  reservation_prepayment_text?: string | null;
  reservation_cancellation_policy?: string | null;
  reservation_arrival_tolerance_minutes?: number | null;
  /** Average seated session length (minutes); null = same-day block without turn window */
  reservation_average_table_turn_minutes?: number | null;
  /** Tables kept out of the reservation pool for walk-ins (smallest tables first) */
  reservation_walk_in_tables_reserved?: number | null;
  reservation_dress_code?: string | null;
  reservation_reminder_24h_enabled?: boolean | null;
  reservation_reminder_2h_enabled?: boolean | null;
  public_google_review_url?: string | null;
  public_google_maps_url?: string | null;
}

export interface OrderItemCreate {
  product_id: number;
  quantity: number;
  notes?: string;
  source?: string; // "tenant_product" or "product" to distinguish between TenantProduct and legacy Product
  /** Answers: string | number | string[] (multi choice) per question id */
  customization_answers?: Record<string, string | number | string[]>;
}

export interface OrderCreate {
  items: OrderItemCreate[];
  notes?: string;
  session_id?: string;  // Session identifier for order isolation
  customer_name?: string;  // Optional customer name
  pin?: string;  // Required PIN for table ordering
  staff_access?: string;  // Staff link token: when valid, PIN is not required
  latitude?: number | null;  // Optional GPS latitude for location verification
  longitude?: number | null;  // Optional GPS longitude for location verification
}

export interface OrderHistoryItem {
  id: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  items: { id: number; product_name: string; quantity: number; price_cents: number }[];
  total_cents: number;
}

/** Sales report payload from GET /reports/sales */
export interface SalesReport {
  from_date: string;
  to_date: string;
  summary: {
    total_revenue_cents: number;
    total_cost_cents?: number;
    total_profit_cents?: number;
    total_orders: number;
    average_revenue_per_order_cents: number;
    daily: { date: string; revenue_cents: number; cost_cents?: number; profit_cents?: number; order_count: number }[];
  };
  by_product: { product_id: number; product_name: string; category?: string; quantity: number; revenue_cents: number; cost_cents?: number; profit_cents?: number }[];
  by_category: { category: string; quantity: number; revenue_cents: number; cost_cents?: number; profit_cents?: number }[];
  by_table: { table_name: string; revenue_cents: number; cost_cents?: number; profit_cents?: number; order_count: number }[];
  by_waiter: { waiter_name: string; revenue_cents: number; cost_cents?: number; profit_cents?: number; order_count: number }[];
  reservations?: {
    total: number;
    by_source: { source: string; count: number }[];
    by_status?: { status: string; count: number }[];
    overbooking_slots_count?: number;
  };
}

// Provider & Catalog Interfaces
export interface Provider {
  id?: number;
  tenant_id?: number | null; // If set, tenant-owned (personal) provider; only that tenant can add products
  name: string;
  url?: string | null;
  api_endpoint?: string | null;
  is_active?: boolean;
  created_at?: string;
  full_company_name?: string | null;
  address?: string | null;
  tax_number?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface ProviderCreate {
  name: string;
  url?: string | null;
  full_company_name?: string | null;
  address?: string | null;
  tax_number?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface CatalogItem {
  id: number;
  name: string;
  description?: string | null;
  detailed_description?: string | null;
  category?: string | null;
  subcategory?: string | null;
  barcode?: string | null;
  brand?: string | null;
  image_url?: string | null;
  country?: string | null;
  region?: string | null;
  wine_style?: string | null;
  vintage?: number | null;
  winery?: string | null;
  grape_variety?: string | null;
  aromas?: string | null;
  elaboration?: string | null;
  providers: ProviderInfo[];
  min_price_cents?: number | null;
  max_price_cents?: number | null;
}

export interface ProviderInfo {
  provider_id: number;
  provider_name: string;
  provider_product_id?: number;
  price_cents?: number | null;
  image_url?: string | null;
  country?: string | null;
  region?: string | null;
  grape_variety?: string | null;
  volume_ml?: number | null;
  unit?: string | null;
}

export interface TenantProductUpdate {
  name?: string;
  price_cents?: number;
  cost_cents?: number | null;
  is_active?: boolean;
  available_from?: string | null;
  available_until?: string | null;
}

export interface TenantProduct {
  id?: number;
  tenant_id?: number;
  catalog_id: number;
  provider_product_id?: number | null;
  product_id?: number | null;
  name: string;
  price_cents: number;
  cost_cents?: number | null;
  image_filename?: string | null;
  ingredients?: string | null;
  is_active?: boolean;
  tax_id?: number | null; // Override default tax for this product
  available_from?: string | null;
  available_until?: string | null;
  catalog_name?: string | null;
  provider_info?: {
    provider_id: number;
    provider_name: string;
    provider_price_cents?: number | null;
  } | null;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private wsUrl = environment.wsUrl;


  private userSubject = new BehaviorSubject<User | null>(null);
  /** Set true after the constructor's first `checkAuth()` completes (used to avoid duplicate `/users/me` on landing). */
  private authInitialCheckDone$ = new BehaviorSubject<boolean>(false);

  /** True when current user is owner and working plan was updated by someone else (show '*' in nav). */
  workingPlanHasUpdates = signal(false);
  private orderUpdates = new Subject<any>();
  private reservationUpdates = new Subject<any>();
  private ws: WebSocket | null = null;

  user$ = this.userSubject.asObservable();
  orderUpdates$ = this.orderUpdates.asObservable();
  reservationUpdates$ = this.reservationUpdates.asObservable();

  constructor() {
    this.checkAuth()
      .pipe(finalize(() => this.authInitialCheckDone$.next(true)))
      .subscribe();
  }

  /** One emission after the app bootstrap `checkAuth()` finishes (logged in or not). */
  waitForInitialAuthCheck(): Observable<void> {
    return this.authInitialCheckDone$.pipe(
      filter((done) => done),
      take(1),
      map(() => void 0),
    );
  }

  // Check authentication status with backend (cookies)
  checkAuth(): Observable<User | null> {
    return this.http.get<User | null>(`${this.apiUrl}/users/me`).pipe(
      tap((user) => {
        // Normalize role to lowercase so guards work regardless of API serialization
        const normalized = user?.role
          ? { ...user, role: String(user.role).toLowerCase() as UserRole }
          : user;
        this.userSubject.next(normalized ?? null);
      }),
      catchError(() => {
        this.userSubject.next(null);
        return of(null); // Return null on error
      })
    );
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

  /** Login: sends username/password as application/x-www-form-urlencoded (required by backend OAuth2PasswordRequestForm). May return 403 with require_otp + temp_token when OTP is enabled. */
  login(username: string, password: string, tenantId?: number, scope?: 'tenant' | 'provider'): Observable<any> {
    let queryParams = new HttpParams();
    if (scope === 'provider') {
      queryParams = queryParams.set('scope', 'provider');
    } else if (tenantId != null) {
      queryParams = queryParams.set('tenant_id', tenantId.toString());
    }
    const body = new HttpParams().set('username', username).set('password', password).toString();
    return this.http.post<any>(`${this.apiUrl}/token`, body, {
      params: queryParams,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }).pipe(
      tap(() => {
        this.checkAuth().subscribe();
      })
    );
  }

  /** After login returned 403 with require_otp, submit OTP code to get tokens. */
  loginWithOtp(tempToken: string, code: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/token/otp`, { temp_token: tempToken, code }).pipe(
      tap(() => {
        this.checkAuth().subscribe();
      })
    );
  }

  getOtpStatus(): Observable<{ otp_enabled: boolean }> {
    return this.http.get<{ otp_enabled: boolean }>(`${this.apiUrl}/users/me/otp/status`);
  }

  setupOtp(): Observable<{ secret: string; provisioning_uri: string }> {
    return this.http.post<{ secret: string; provisioning_uri: string }>(`${this.apiUrl}/users/me/otp/setup`, {});
  }

  confirmOtp(code: string): Observable<{ status: string; otp_enabled: boolean }> {
    return this.http.post<{ status: string; otp_enabled: boolean }>(`${this.apiUrl}/users/me/otp/confirm`, { code });
  }

  disableOtp(code: string): Observable<{ status: string; otp_enabled: boolean }> {
    return this.http.post<{ status: string; otp_enabled: boolean }>(`${this.apiUrl}/users/me/otp/disable`, { code });
  }

  registerProvider(data: ProviderRegisterData): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/register/provider`, data);
  }

  updateProviderMe(data: ProviderUpdateData): Observable<ProviderInfo> {
    return this.http.put<ProviderInfo>(`${this.apiUrl}/provider/me`, data);
  }

  /** Clears local state immediately and returns an Observable that completes when the server has processed logout. Callers should navigate after subscribe. */
  logout(): Observable<unknown> {
    this.userSubject.next(null);
    this.disconnectWebSocket();
    return this.http.post(`${this.apiUrl}/logout`, {}).pipe(
      catchError(() => of(undefined))
    );
  }

  // Refresh token - exchange valid refresh token for new access token
  refreshToken(): Observable<any> {
    return this.http.post(`${this.apiUrl}/refresh`, {}, { withCredentials: true }).pipe(
      tap(() => {
        // Re-check auth to update user state with new token
        this.checkAuth().subscribe();
      })
    );
  }

  // Provider portal (provider-scoped auth)
  getProviderMe(): Observable<ProviderInfo> {
    return this.http.get<ProviderInfo>(`${this.apiUrl}/provider/me`);
  }

  getProviderCatalog(search?: string): Observable<ProviderCatalogItem[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    return this.http.get<ProviderCatalogItem[]>(`${this.apiUrl}/provider/catalog`, { params });
  }

  getProviderProducts(): Observable<ProviderProductItem[]> {
    return this.http.get<ProviderProductItem[]>(`${this.apiUrl}/provider/products`);
  }

  createProviderProduct(data: ProviderProductCreate): Observable<ProviderProduct> {
    return this.http.post<ProviderProduct>(`${this.apiUrl}/provider/products`, data);
  }

  updateProviderProduct(id: number, data: Partial<ProviderProductUpdate>): Observable<ProviderProduct> {
    return this.http.put<ProviderProduct>(`${this.apiUrl}/provider/products/${id}`, data);
  }

  deleteProviderProduct(id: number): Observable<{ status: string }> {
    return this.http.delete<{ status: string }>(`${this.apiUrl}/provider/products/${id}`);
  }

  uploadProviderProductImage(productId: number, file: File): Observable<{ id: number; image_filename: string; image_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ id: number; image_filename: string; image_url: string }>(
      `${this.apiUrl}/provider/products/${productId}/image`,
      formData
    );
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

  getProductQuestions(productId: number): Observable<ProductQuestionStaff[]> {
    return this.http.get<ProductQuestionStaff[]>(`${this.apiUrl}/products/${productId}/questions`);
  }

  createProductQuestion(
    productId: number,
    body: ProductQuestionCreatePayload
  ): Observable<ProductQuestionStaff> {
    return this.http.post<ProductQuestionStaff>(`${this.apiUrl}/products/${productId}/questions`, body);
  }

  updateProductQuestion(
    productId: number,
    questionId: number,
    body: ProductQuestionUpdatePayload
  ): Observable<ProductQuestionStaff> {
    return this.http.patch<ProductQuestionStaff>(
      `${this.apiUrl}/products/${productId}/questions/${questionId}`,
      body
    );
  }

  deleteProductQuestion(productId: number, questionId: number): Observable<{ status: string; id: number }> {
    return this.http.delete<{ status: string; id: number }>(
      `${this.apiUrl}/products/${productId}/questions/${questionId}`
    );
  }

  reorderProductQuestions(productId: number, questionIds: number[]): Observable<ProductQuestionStaff[]> {
    return this.http.put<ProductQuestionStaff[]>(`${this.apiUrl}/products/${productId}/questions/reorder`, {
      question_ids: questionIds,
    });
  }

  getProductImageUrl(product: Product): string | null {
    if (!product.image_filename) return null;
    // Provider images have full path like "providers/{token}/products/{filename}"
    if (product.image_filename.startsWith('providers/')) {
      return `${this.apiUrl}/uploads/${product.image_filename}`;
    }
    // Regular product images are in tenant folder
    if (!product.tenant_id) return null;
    return `${this.apiUrl}/uploads/${product.tenant_id}/products/${product.image_filename}`;
  }

  // Floors
  getFloors(): Observable<Floor[]> {
    return this.http.get<Floor[]>(`${this.apiUrl}/floors`);
  }

  createFloor(name: string, sortOrder?: number): Observable<Floor> {
    const body: { name: string; sort_order?: number } = { name };
    if (sortOrder !== undefined) body.sort_order = sortOrder;
    return this.http.post<Floor>(`${this.apiUrl}/floors`, body);
  }

  updateFloor(id: number, data: Partial<Floor>): Observable<Floor> {
    return this.http.put<Floor>(`${this.apiUrl}/floors/${id}`, data);
  }

  deleteFloor(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/floors/${id}`);
  }

  // Tables
  getTables(): Observable<Table[]> {
    return this.http.get<Table[]>(`${this.apiUrl}/tables`);
  }

  getTablesWithStatus(): Observable<CanvasTable[]> {
    return this.http.get<CanvasTable[]>(`${this.apiUrl}/tables/with-status`);
  }

  // Reservations (staff)
  getReservations(params?: { date?: string; status?: string; phone?: string }): Observable<Reservation[]> {
    let httpParams = new HttpParams();
    if (params?.date) httpParams = httpParams.set('reservation_date', params.date);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.phone) httpParams = httpParams.set('phone', params.phone);
    return this.http.get<Reservation[]>(`${this.apiUrl}/reservations`, { params: httpParams });
  }

  /** Get most recent reservation by phone for pre-filling new reservation form. Returns null if none found. */
  getReservationPrefillByPhone(phone: string): Observable<Reservation | null> {
    const trimmed = phone?.trim();
    if (!trimmed) return of(null);
    return this.http.get<Reservation>(`${this.apiUrl}/reservations/prefill-by-phone`, {
      params: { phone: trimmed },
    }).pipe(
      catchError(() => of(null)),
    );
  }

  getReservation(id: number): Observable<Reservation> {
    return this.http.get<Reservation>(`${this.apiUrl}/reservations/${id}`);
  }

  getOverbookingReport(date: string, timeFrom?: string, timeTo?: string): Observable<OverbookingReport> {
    let params = new HttpParams().set('date_str', date);
    if (timeFrom) params = params.set('time_from', timeFrom);
    if (timeTo) params = params.set('time_to', timeTo);
    return this.http.get<OverbookingReport>(`${this.apiUrl}/reservations/overbooking-report`, { params });
  }

  getUpcomingNoTableCount(date: string, reservationId?: number): Observable<{ count: number }> {
    let params = new HttpParams().set('date_str', date);
    if (reservationId != null) params = params.set('reservation_id', reservationId.toString());
    return this.http.get<{ count: number }>(`${this.apiUrl}/reservations/upcoming-no-table-count`, { params });
  }

  getSlotCapacity(date: string, time: string, excludeReservationId?: number): Observable<{
    total_seats: number;
    total_tables: number;
    reserved_guests: number;
    reserved_parties: number;
    seats_left: number;
    tables_left: number;
  }> {
    let params = new HttpParams().set('date_str', date).set('time_str', time);
    if (excludeReservationId != null) params = params.set('exclude_reservation_id', excludeReservationId.toString());
    return this.http.get<{
      total_seats: number;
      total_tables: number;
      reserved_guests: number;
      reserved_parties: number;
      seats_left: number;
      tables_left: number;
    }>(`${this.apiUrl}/reservations/slot-capacity`, { params });
  }

  createReservation(data: ReservationCreate): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.apiUrl}/reservations`, data);
  }

  updateReservation(id: number, data: ReservationUpdate): Observable<Reservation> {
    return this.http.put<Reservation>(`${this.apiUrl}/reservations/${id}`, data);
  }

  updateReservationStatus(id: number, status: ReservationStatus): Observable<Reservation> {
    return this.http.put<Reservation>(`${this.apiUrl}/reservations/${id}/status`, { status });
  }

  seatReservation(id: number, tableId: number): Observable<Reservation> {
    return this.http.put<Reservation>(`${this.apiUrl}/reservations/${id}/seat`, { table_id: tableId });
  }

  finishReservation(id: number): Observable<Reservation> {
    return this.http.put<Reservation>(`${this.apiUrl}/reservations/${id}/finish`, {});
  }

  /** Response indicates which channel(s) were used. */
  sendReservationReminder(id: number): Observable<{
    email_sent: boolean;
    whatsapp_sent: boolean;
    to_email?: string | null;
    to_phone?: string | null;
  }> {
    return this.http.post<{
      email_sent: boolean;
      whatsapp_sent: boolean;
      to_email?: string | null;
      to_phone?: string | null;
    }>(`${this.apiUrl}/reservations/${id}/send-reminder`, {});
  }

  // Reservations (public - no auth)
  getReservationByToken(token: string): Observable<Reservation> {
    return this.http.get<Reservation>(`${this.apiUrl}/reservations/by-token`, { params: { token } });
  }

  createReservationPublic(data: ReservationCreate): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.apiUrl}/reservations`, data);
  }

  getNextAvailableReservation(tenantId: number, date: string, partySize?: number): Observable<{ date: string; time: string }> {
    let params: Record<string, string> = { tenant_id: tenantId.toString(), date };
    if (partySize != null && partySize > 0) params['party_size'] = String(partySize);
    return this.http.get<{ date: string; time: string }>(`${this.apiUrl}/reservations/next-available`, { params });
  }

  cancelReservationPublic(id: number, token: string): Observable<Reservation> {
    return this.http.put<Reservation>(`${this.apiUrl}/reservations/${id}/cancel`, {}, { params: { token } });
  }

  /** Public: update reservation by token (delay notice, reservation notes, customer notes). */
  updateReservationPublic(id: number, token: string, body: PublicReservationUpdate): Observable<Reservation> {
    return this.http.put<Reservation>(`${this.apiUrl}/reservations/${id}/public`, body ?? {}, { params: { token } });
  }

  createTable(name: string, floorId?: number): Observable<Table> {
    const body: { name: string; floor_id?: number } = { name };
    if (floorId !== undefined) body.floor_id = floorId;
    return this.http.post<Table>(`${this.apiUrl}/tables`, body);
  }

  updateTable(id: number, data: Partial<Table>): Observable<Table> {
    return this.http.put<Table>(`${this.apiUrl}/tables/${id}`, data);
  }

  deleteTable(id: number, reassignToTableId?: number): Observable<{ status: string; id: number }> {
    let url = `${this.apiUrl}/tables/${id}`;
    if (reassignToTableId != null) {
      url += `?reassign_to_table_id=${reassignToTableId}`;
    }
    return this.http.delete<{ status: string; id: number }>(url);
  }

  // Table Session Management
  activateTable(tableId: number): Observable<TableActivateResponse> {
    return this.http.post<TableActivateResponse>(`${this.apiUrl}/tables/${tableId}/activate`, {});
  }

  closeTable(tableId: number): Observable<TableCloseResponse> {
    return this.http.post<TableCloseResponse>(`${this.apiUrl}/tables/${tableId}/close`, {});
  }

  regenerateTablePin(tableId: number): Observable<TableActivateResponse> {
    return this.http.post<TableActivateResponse>(`${this.apiUrl}/tables/${tableId}/regenerate-pin`, {});
  }

  assignWaiterToTable(tableId: number, waiterId: number | null): Observable<any> {
    return this.http.put(`${this.apiUrl}/tables/${tableId}/assign-waiter`, { waiter_id: waiterId });
  }

  assignWaiterToFloor(floorId: number, waiterId: number | null): Observable<any> {
    return this.http.put(`${this.apiUrl}/floors/${floorId}/assign-waiter`, { waiter_id: waiterId });
  }

  getWaiters(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`).pipe(
      map((users: User[]) => users.filter(u => u.role === 'waiter'))
    );
  }

  // Orders
  getOrders(includeRemoved: boolean = false): Observable<Order[]> {
    const params = includeRemoved ? { params: { include_removed: 'true' } } : {};
    return this.http.get<Order[]>(`${this.apiUrl}/orders`, params);
  }

  /** Staff-only: get a short-lived token to open the public menu for a table without PIN. */
  getStaffMenuToken(tableId: number): Observable<{ token: string; table_token: string; expires_in: number }> {
    return this.http.get<{ token: string; table_token: string; expires_in: number }>(
      `${this.apiUrl}/tables/${tableId}/staff-menu-token`
    );
  }

  updateOrderStatus(orderId: number, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/orders/${orderId}/status`, { status });
  }

  updateOrderItemStatus(orderId: number, itemId: number, status: string, userId?: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/orders/${orderId}/items/${itemId}/status`, {
      status,
      user_id: userId
    });
  }

  removeOrderItem(tableToken: string, orderId: number, itemId: number, sessionId?: string, reason?: string): Observable<any> {
    let url = `${this.apiUrl}/menu/${tableToken}/order/${orderId}/items/${itemId}`;
    const params: string[] = [];
    if (sessionId) {
      params.push(`session_id=${encodeURIComponent(sessionId)}`);
    }
    if (reason) {
      params.push(`reason=${encodeURIComponent(reason)}`);
    }
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    return this.http.delete(url);
  }

  updateOrderItemQuantity(tableToken: string, orderId: number, itemId: number, quantity: number, sessionId?: string): Observable<any> {
    let url = `${this.apiUrl}/menu/${tableToken}/order/${orderId}/items/${itemId}`;
    if (sessionId) {
      url += `?session_id=${encodeURIComponent(sessionId)}`;
    }
    return this.http.put(url, { quantity });
  }

  cancelOrder(tableToken: string, orderId: number, sessionId?: string): Observable<any> {
    let url = `${this.apiUrl}/menu/${tableToken}/order/${orderId}`;
    if (sessionId) {
      url += `?session_id=${encodeURIComponent(sessionId)}`;
    }
    return this.http.delete(url);
  }

  // Restaurant staff endpoints
  markOrderPaid(orderId: number, paymentMethod: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/orders/${orderId}/mark-paid`, { payment_method: paymentMethod });
  }

  /** Deliver all active items and mark order paid in one request (staff fast checkout). */
  finishOrder(orderId: number, paymentMethod: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/orders/${orderId}/finish`, { payment_method: paymentMethod });
  }

  unmarkOrderPaid(orderId: number): Observable<{ status: string; order_id: number; new_status: string }> {
    return this.http.put<{ status: string; order_id: number; new_status: string }>(
      `${this.apiUrl}/orders/${orderId}/unmark-paid`,
      {}
    );
  }

  deleteOrder(orderId: number): Observable<{ status: string; order_id: number }> {
    return this.http.delete<{ status: string; order_id: number }>(`${this.apiUrl}/orders/${orderId}`);
  }

  setOrderBillingCustomer(orderId: number, billingCustomerId: number | null): Observable<{ order_id: number; billing_customer_id: number | null }> {
    return this.http.put<{ order_id: number; billing_customer_id: number | null }>(
      `${this.apiUrl}/orders/${orderId}/billing-customer`,
      { billing_customer_id: billingCustomerId }
    );
  }

  // Billing customers (Factura)
  getBillingCustomers(search?: string): Observable<BillingCustomer[]> {
    const params = search != null && search.trim() !== '' ? { params: { search: search.trim() } } : {};
    return this.http.get<BillingCustomer[]>(`${this.apiUrl}/billing-customers`, params);
  }

  getBillingCustomer(id: number): Observable<BillingCustomer> {
    return this.http.get<BillingCustomer>(`${this.apiUrl}/billing-customers/${id}`);
  }

  createBillingCustomer(data: {
    name: string;
    company_name?: string;
    tax_id?: string;
    address?: string;
    email?: string;
    phone?: string;
    birth_date?: string | null;
  }): Observable<BillingCustomer> {
    return this.http.post<BillingCustomer>(`${this.apiUrl}/billing-customers`, data);
  }

  updateBillingCustomer(id: number, data: Partial<BillingCustomer>): Observable<BillingCustomer> {
    return this.http.put<BillingCustomer>(`${this.apiUrl}/billing-customers/${id}`, data);
  }

  deleteBillingCustomer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/billing-customers/${id}`);
  }

  resetItemStatus(orderId: number, itemId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/orders/${orderId}/items/${itemId}/reset-status`, {});
  }

  cancelOrderItemStaff(orderId: number, itemId: number, reason: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/orders/${orderId}/items/${itemId}/cancel`, { reason });
  }

  updateOrderItemQuantityStaff(orderId: number, itemId: number, quantity: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/orders/${orderId}/items/${itemId}`, { quantity });
  }

  removeOrderItemStaff(orderId: number, itemId: number, reason?: string): Observable<any> {
    let url = `${this.apiUrl}/orders/${orderId}/items/${itemId}`;
    const params: string[] = [];
    if (reason) {
      params.push(`reason=${encodeURIComponent(reason)}`);
    }
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    return this.http.delete(url);
  }

  // Reports (sales / revenue analysis)
  getSalesReports(fromDate: string, toDate: string): Observable<SalesReport> {
    const params = { from_date: fromDate, to_date: toDate };
    return this.http.get<SalesReport>(`${this.apiUrl}/reports/sales`, { params });
  }

  getReportsExport(
    fromDate: string,
    toDate: string,
    format: 'csv' | 'xlsx',
    report: string,
    lang?: string | null,
  ): Observable<Blob> {
    const params: Record<string, string> = { from_date: fromDate, to_date: toDate, format, report };
    if (lang && lang.trim()) {
      params['lang'] = lang.trim();
    }
    return this.http.get(`${this.apiUrl}/reports/export`, {
      params,
      responseType: 'blob',
    });
  }

  // Public Menu (no auth). staffAccess: when set (from staff link), backend returns table_requires_pin false.
  getMenu(tableToken: string, staffAccess?: string): Observable<MenuResponse> {
    let params = new HttpParams();
    if (staffAccess) {
      params = params.set('staff_access', staffAccess);
    }
    return this.http.get<MenuResponse>(`${this.apiUrl}/menu/${tableToken}`, { params });
  }

  submitOrder(tableToken: string, order: OrderCreate): Observable<any> {
    return this.http.post(`${this.apiUrl}/menu/${tableToken}/order`, order);
  }

  getCurrentOrder(tableToken: string, sessionId?: string): Observable<any> {
    let params = new HttpParams();
    if (sessionId) {
      params = params.set('session_id', sessionId);
    }
    return this.http.get(`${this.apiUrl}/menu/${tableToken}/order`, { params });
  }

  getOrderHistory(tableToken: string, limit = 10): Observable<OrderHistoryItem[]> {
    return this.http.get<OrderHistoryItem[]>(`${this.apiUrl}/menu/${tableToken}/order-history`, {
      params: { limit }
    });
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

  createRevolutOrder(orderId: number, tableToken: string): Observable<{ checkout_url: string; revolut_order_id: string; order_id: number }> {
    return this.http.post<{ checkout_url: string; revolut_order_id: string; order_id: number }>(
      `${this.apiUrl}/orders/${orderId}/create-revolut-order?table_token=${tableToken}`,
      {}
    );
  }

  confirmRevolutPayment(orderId: number, tableToken: string): Observable<{ status: string; order_id: number }> {
    return this.http.post<{ status: string; order_id: number }>(
      `${this.apiUrl}/orders/${orderId}/confirm-revolut-payment?table_token=${tableToken}`,
      {}
    );
  }

  requestPayment(tableToken: string, orderId: number, paymentMethod: string, message?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/menu/${tableToken}/order/${orderId}/request-payment`, {
      payment_method: paymentMethod,
      message: message || null,
    });
  }

  callWaiter(tableToken: string, message?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/menu/${tableToken}/call-waiter`, {
      message: message || null,
    });
  }

  private tenantStripeKey = signal<string | null>(null);

  getStripePublishableKey(): string {
    // Use tenant-specific key if available, otherwise fallback to environment
    return this.tenantStripeKey() || environment.stripePublishableKey || '';
  }

  setTenantStripeKey(key: string | null): void {
    this.tenantStripeKey.set(key);
  }

  loadTenantStripeKey(): void {
    // Load tenant settings to get Stripe publishable key
    this.getTenantSettings().subscribe({
      next: (settings) => {
        this.tenantStripeKey.set(settings.stripe_publishable_key || null);
      },
      error: (err) => {
        console.error('Failed to load tenant Stripe key:', err);
        // Fallback to environment key
        this.tenantStripeKey.set(null);
      }
    });
  }

  // Tenant Settings
  getTenantSettings(): Observable<TenantSettings> {
    return this.http.get<TenantSettings>(`${this.apiUrl}/tenant/settings`);
  }

  updateTenantSettings(settings: Partial<TenantSettings>): Observable<TenantSettings> {
    return this.http.put<TenantSettings>(`${this.apiUrl}/tenant/settings`, settings);
  }

  /** Kitchen/Bar display: wait-time thresholds (minutes) for card color. */
  getKitchenDisplaySettings(): Observable<{ yellow_minutes: number; orange_minutes: number; red_minutes: number }> {
    return this.http.get<{ yellow_minutes: number; orange_minutes: number; red_minutes: number }>(
      `${this.apiUrl}/tenant/kitchen-display-settings`
    );
  }

  updateKitchenDisplaySettings(settings: {
    yellow_minutes: number;
    orange_minutes: number;
    red_minutes: number;
  }): Observable<{ yellow_minutes: number; orange_minutes: number; red_minutes: number }> {
    return this.http.put<{ yellow_minutes: number; orange_minutes: number; red_minutes: number }>(
      `${this.apiUrl}/tenant/kitchen-display-settings`,
      settings
    );
  }

  getTaxes(currentOnly = true): Observable<Tax[]> {
    return this.http.get<Tax[]>(`${this.apiUrl}/taxes`, {
      params: { current_only: currentOnly }
    });
  }

  createTax(data: { name: string; rate_percent: number; valid_from: string; valid_to?: string | null }): Observable<Tax> {
    return this.http.post<Tax>(`${this.apiUrl}/taxes`, data);
  }

  updateTax(id: number, data: Partial<{ name: string; rate_percent: number; valid_from: string; valid_to: string | null }>): Observable<Tax> {
    return this.http.put<Tax>(`${this.apiUrl}/taxes/${id}`, data);
  }

  deleteTax(id: number): Observable<{ status: string; id: number }> {
    return this.http.delete<{ status: string; id: number }>(`${this.apiUrl}/taxes/${id}`);
  }

  uploadTenantLogo(file: File): Observable<TenantSettings> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<TenantSettings>(`${this.apiUrl}/tenant/logo`, formData);
  }

  getTenantLogoUrl(logoFilename: string | null | undefined, tenantId: number | null | undefined): string | null {
    if (!logoFilename || !tenantId) return null;
    return `${this.apiUrl}/uploads/${tenantId}/logo/${logoFilename}`;
  }

  getTenantHeaderBackgroundUrl(filename: string | null | undefined, tenantId: number | null | undefined): string | null {
    if (!filename || !tenantId) return null;
    return `${this.apiUrl}/uploads/${tenantId}/header/${filename}`;
  }

  uploadTenantHeaderBackground(file: File): Observable<TenantSettings> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<TenantSettings>(`${this.apiUrl}/tenant/header-background`, formData);
  }

  deleteTenantHeaderBackground(): Observable<TenantSettings> {
    return this.http.delete<TenantSettings>(`${this.apiUrl}/tenant/header-background`);
  }

  /** List all tenants (public, no auth). For landing page tenant picker. */
  getPublicTenants(): Observable<TenantSummary[]> {
    return this.http.get<TenantSummary[]>(`${this.apiUrl}/public/tenants`);
  }

  /** Resolve QR/menu token or printed table name (e.g. T01) to menu token. Public, no auth. */
  lookupPublicTable(q: string): Observable<PublicTableLookupResponse> {
    return this.http.get<PublicTableLookupResponse>(`${this.apiUrl}/public/table-lookup`, {
      params: { q },
    });
  }

  /** Get one tenant's public info (for book/menu branding). Public, no auth. */
  getPublicTenant(tenantId: number): Observable<TenantSummary> {
    return this.http.get<TenantSummary>(`${this.apiUrl}/public/tenants/${tenantId}`);
  }

  submitPublicGuestFeedback(
    tenantId: number,
    body: {
      rating: number;
      comment?: string | null;
      contact_name?: string | null;
      contact_email?: string | null;
      contact_phone?: string | null;
      reservation_token?: string | null;
    },
  ): Observable<{ ok: boolean; id: number }> {
    return this.http.post<{ ok: boolean; id: number }>(
      `${this.apiUrl}/public/tenants/${tenantId}/guest-feedback`,
      body,
    );
  }

  listGuestFeedback(limit = 200): Observable<GuestFeedback[]> {
    return this.http.get<GuestFeedback[]>(`${this.apiUrl}/tenant/guest-feedback`, {
      params: { limit: String(limit) },
    });
  }

  /** Get token for WebSocket auth (cookie may not be sent on WS upgrade from some origins). */
  getWsToken(): Observable<{ access_token: string }> {
    return this.http.get<{ access_token: string }>(`${this.apiUrl}/ws-token`, {
      withCredentials: true,
    });
  }

  // WebSocket for real-time updates (restaurant owners only)
  connectWebSocket(): void {
    const user = this.getCurrentUser();
    if (!user || this.ws) return;

    // Fetch token so we can pass it in the URL; cookie may not be sent on WebSocket upgrade (e.g. cross-origin)
    this.getWsToken().subscribe({
      next: (res) => { if (user.tenant_id != null) this.connectWebSocketWithToken(user.tenant_id, res.access_token); },
      error: (err) => {
        console.warn('Could not get WebSocket token, connection may fail:', err?.status ?? err);
        if (user.tenant_id != null) this.connectWebSocketWithToken(user.tenant_id, null);
      },
    });
  }

  private connectWebSocketWithToken(tenantId: number, token: string | null): void {
    if (this.ws) return;

    let wsUrl = this.wsUrl;
    
    // Handle relative URLs (e.g. '/ws')
    if (wsUrl.startsWith('/')) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}${wsUrl}`;
    }
    // Handle absolute HTTP URLs
    else if (wsUrl.startsWith('http://')) {
      wsUrl = wsUrl.replace('http://', 'ws://');
    } else if (wsUrl.startsWith('https://')) {
      wsUrl = wsUrl.replace('https://', 'wss://');
    }
    // Handle implicit protocol
    else if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
      wsUrl = `ws://${wsUrl}`;
    }

    const base = `${wsUrl}/tenant/${tenantId}`;
    const wsEndpoint = token ? `${base}?token=${encodeURIComponent(token)}` : base;

    try {
      this.ws = new WebSocket(wsEndpoint);

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const isReservation = data?.type && [
            'new_reservation', 'reservation_updated', 'reservation_status',
            'reservation_seated', 'reservation_finished', 'reservation_cancelled'
          ].includes(data.type);
          if (isReservation) {
            this.reservationUpdates.next(data);
          } else {
            this.orderUpdates.next(data);
          }
        } catch (e) {
          console.error('WebSocket parse error:', e);
        }
      };

      this.ws.onclose = (event) => {
        this.ws = null;
        if (!environment.production) {
          console.log(`WebSocket closed: code=${event.code}, reason="${event.reason || 'none'}", wasClean=${event.wasClean}`);
        }

        // Only reconnect if it wasn't a normal closure (code 1000)
        // Don't reconnect on authentication errors (code 1008)
        if (event.code !== 1000 && event.code !== 1008) {
          if (!environment.production) {
            console.log('WebSocket will reconnect in 3 seconds...');
          }
          // Reconnect after 3 seconds
          setTimeout(() => this.connectWebSocket(), 3000);
        } else if (event.code === 1008) {
          console.warn('WebSocket connection closed due to authentication error:', event.reason);
        } else if (event.code === 1000) {
          if (!environment.production) {
            console.log('WebSocket closed normally');
          }
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        console.error('WebSocket URL attempted:', wsEndpoint);
        console.error('Tenant id:', tenantId);
        // Try to get more error details
        if (this.ws) {
          console.error('WebSocket readyState:', this.ws.readyState);
          console.error('WebSocket protocol:', this.ws.protocol);
          console.error('WebSocket url:', this.ws.url);
        }
        this.ws?.close();
      };

      this.ws.onopen = () => {
        if (!environment.production) {
          console.log('WebSocket connection opened successfully');
          console.log('WebSocket URL:', wsEndpoint);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      console.error('WebSocket URL attempted:', wsEndpoint);
    }
  }

  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Providers
  getProviders(activeOnly: boolean = true): Observable<Provider[]> {
    const params = new HttpParams().set('active_only', activeOnly.toString());
    return this.http.get<Provider[]>(`${this.apiUrl}/providers`, { params });
  }

  getProvider(id: number): Observable<Provider> {
    return this.http.get<Provider>(`${this.apiUrl}/providers/${id}`);
  }

  createProvider(body: ProviderCreate): Observable<Provider> {
    return this.http.post<Provider>(`${this.apiUrl}/providers`, body);
  }

  /** Create a product on a tenant-owned (personal) provider (admin/settings). */
  createProductForProvider(providerId: number, body: ProviderProductCreate): Observable<ProviderProduct> {
    return this.http.post<ProviderProduct>(`${this.apiUrl}/providers/${providerId}/products`, body);
  }

  // Catalog
  getCatalog(category?: string, subcategory?: string, search?: string): Observable<CatalogItem[]> {
    let params = new HttpParams();
    if (category) params = params.set('category', category);
    if (subcategory) params = params.set('subcategory', subcategory);
    if (search) params = params.set('search', search);
    return this.http.get<CatalogItem[]>(`${this.apiUrl}/catalog`, { params });
  }

  getCatalogItem(id: number): Observable<CatalogItem> {
    return this.http.get<CatalogItem>(`${this.apiUrl}/catalog/${id}`);
  }

  getCatalogCategories(): Observable<Record<string, string[]>> {
    return this.http.get<Record<string, string[]>>(`${this.apiUrl}/catalog/categories`);
  }

  // Provider Products
  /** List products for a given provider (admin/catalog). For provider-portal "my products" use getProviderProducts(). */
  listProviderProducts(providerId: number): Observable<ProviderProduct[]> {
    return this.http.get<ProviderProduct[]>(`${this.apiUrl}/providers/${providerId}/products`);
  }

  // Tenant Products
  getTenantProducts(activeOnly: boolean = true): Observable<TenantProduct[]> {
    const params = new HttpParams().set('active_only', activeOnly.toString());
    return this.http.get<TenantProduct[]>(`${this.apiUrl}/tenant-products`, { params });
  }

  createTenantProduct(catalogId: number, providerProductId?: number, name?: string, priceCents?: number, costCents?: number | null): Observable<TenantProduct> {
    const body: Record<string, unknown> = { catalog_id: catalogId };
    if (providerProductId) body['provider_product_id'] = providerProductId;
    if (name) body['name'] = name;
    if (priceCents !== undefined) body['price_cents'] = priceCents;
    if (costCents !== undefined && costCents !== null) body['cost_cents'] = costCents;
    return this.http.post<TenantProduct>(`${this.apiUrl}/tenant-products`, body);
  }

  updateTenantProduct(id: number, updates: TenantProductUpdate): Observable<TenantProduct> {
    return this.http.put<TenantProduct>(`${this.apiUrl}/tenant-products/${id}`, updates);
  }

  deleteTenantProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tenant-products/${id}`);
  }

  // Translations
  getTranslations(entityType: string, entityId: number): Observable<{ entity_type: string; entity_id: number; translations: any }> {
    return this.http.get<{ entity_type: string; entity_id: number; translations: any }>(`${this.apiUrl}/i18n/${entityType}/${entityId}`);
  }

  updateTranslations(entityType: string, entityId: number, translations: any): Observable<{ message: string; updated: string[] }> {
    return this.http.put<{ message: string; updated: string[] }>(`${this.apiUrl}/i18n/${entityType}/${entityId}`, translations);
  }

  // User Management
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`);
  }

  createUser(userData: UserCreate): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users`, userData);
  }

  updateUser(userId: number, userData: UserUpdate): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${userId}`, userData);
  }

  deleteUser(userId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/users/${userId}`);
  }

  // Working plan (schedule)
  getSchedule(fromDate: string, toDate: string): Observable<Shift[]> {
    const params = new HttpParams().set('from_date', fromDate).set('to_date', toDate);
    return this.http.get<Shift[]>(`${this.apiUrl}/schedule`, { params });
  }

  /** Whether the owner has unseen working plan updates (for '*' in sidebar). */
  getScheduleNotification(): Observable<{ has_updates: boolean }> {
    return this.http.get<{ has_updates: boolean }>(`${this.apiUrl}/schedule/notification`);
  }

  getShift(shiftId: number): Observable<Shift> {
    return this.http.get<Shift>(`${this.apiUrl}/schedule/${shiftId}`);
  }

  createShift(data: ShiftCreate): Observable<Shift> {
    return this.http.post<Shift>(`${this.apiUrl}/schedule`, data);
  }

  updateShift(shiftId: number, data: ShiftUpdate): Observable<Shift> {
    return this.http.put<Shift>(`${this.apiUrl}/schedule/${shiftId}`, data);
  }

  deleteShift(shiftId: number): Observable<{ deleted: boolean; id: number }> {
    return this.http.delete<{ deleted: boolean; id: number }>(`${this.apiUrl}/schedule/${shiftId}`);
  }

  getUsersForSchedule(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`).pipe(
      map((users: User[]) => users.filter(u => {
        const r = (u.role ?? '').toLowerCase();
        return r === 'owner' || r === 'admin' || r === 'kitchen' || r === 'bartender' || r === 'waiter' || r === 'receptionist';
      }))
    );
  }

  /** Changelog (CHANGELOG.md from project root, served by backend). */
  getChangelog(): Observable<string> {
    return this.http.get(`${this.apiUrl}/changelog`, { responseType: 'text' });
  }
}
