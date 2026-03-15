import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { roleGuard, adminGuard, tableAccessGuard, orderAccessGuard } from './auth/role.guard';
import { reservationAccessGuard } from './auth/reservation-access.guard';
import { providerGuard } from './auth/provider.guard';

export const routes: Routes = [
  // Public routes
  { path: '', loadComponent: () => import('./landing/landing.component').then(m => m.LandingComponent) },
  { path: 'login', loadComponent: () => import('./auth/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./auth/register.component').then(m => m.RegisterComponent) },
  // Provider portal (public auth pages)
  { path: 'provider/login', loadComponent: () => import('./provider/provider-login.component').then(m => m.ProviderLoginComponent) },
  { path: 'provider/register', loadComponent: () => import('./provider/provider-register.component').then(m => m.ProviderRegisterComponent) },
  // Provider portal (protected)
  { path: 'provider', canActivate: [providerGuard], loadComponent: () => import('./provider/provider-dashboard.component').then(m => m.ProviderDashboardComponent) },
  { path: 'menu/:token', loadComponent: () => import('./menu/menu.component').then(m => m.MenuComponent) },
  { path: 'book/:tenantId', loadComponent: () => import('./book/book.component').then(m => m.BookComponent) },
  // Staff reservations (must be before 'reservation' so /reservations matches here, not the public route)
  { path: 'reservations', canActivate: [authGuard, reservationAccessGuard], loadComponent: () => import('./reservations/reservations.component').then(m => m.ReservationsComponent) },
  { path: 'reservation', loadComponent: () => import('./reservation-view/reservation-view.component').then(m => m.ReservationViewComponent) },

  // Protected routes - accessible by all authenticated users
  { path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) },

  // Products - all roles can view, but editing is handled in component
  { path: 'products', canActivate: [authGuard], loadComponent: () => import('./products/products.component').then(m => m.ProductsComponent) },
  { path: 'catalog', canActivate: [authGuard], loadComponent: () => import('./catalog/catalog.component').then(m => m.CatalogComponent) },

  // Tables - owner, admin, waiter, receptionist
  { path: 'tables', canActivate: [authGuard, tableAccessGuard], loadComponent: () => import('./tables/tables.component').then(m => m.TablesComponent) },
  { path: 'tables/canvas', canActivate: [authGuard, adminGuard], loadComponent: () => import('./tables/tables-canvas.component').then(m => m.TablesCanvasComponent) },

  // Orders - all roles can view (but actions are permission-controlled)
  { path: 'orders', canActivate: [authGuard, orderAccessGuard], loadComponent: () => import('./orders/orders.component').then(m => m.OrdersComponent) },
  // Kitchen display - dedicated large view, auto-refresh, optional sound (same access as orders)
  { path: 'kitchen', canActivate: [authGuard, orderAccessGuard], loadComponent: () => import('./kitchen-display/kitchen-display.component').then(m => m.KitchenDisplayComponent) },

  // Admin-only routes
  { path: 'translations', redirectTo: 'settings', pathMatch: 'full' },
  { path: 'settings', canActivate: [authGuard, adminGuard], loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent) },
  { path: 'users', canActivate: [authGuard, adminGuard], loadComponent: () => import('./users/users.component').then(m => m.UsersComponent) },

  // Inventory module (lazy loaded) - admin only
  { path: 'inventory', canActivate: [authGuard, adminGuard], loadChildren: () => import('./inventory/inventory.routes').then(m => m.INVENTORY_ROUTES) },

  // Reports (sales / revenue) - owner & admin
  { path: 'reports', canActivate: [authGuard, adminGuard], loadComponent: () => import('./reports/reports.component').then(m => m.ReportsComponent) },

  { path: '**', redirectTo: '' }
];
