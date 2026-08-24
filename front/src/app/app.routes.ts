import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { roleGuard, adminGuard, tableAccessGuard, orderAccessGuard, scheduleGuard, workingPlanViewRedirectGuard } from './auth/role.guard';
import { uiModuleGuard } from './auth/ui-module.guard';
import { reservationAccessGuard } from './auth/reservation-access.guard';
import { providerGuard } from './auth/provider.guard';
import { courierGuard } from './auth/courier.guard';
import { customerGuard } from './auth/customer.guard';
import { platformGuard } from './auth/platform.guard';
import { permissionGuard } from './auth/permission.guard';
import { tablesCanvasCanDeactivate } from './tables/tables-canvas-deactivate.guard';

export const routes: Routes = [
  // Public routes
  { path: '', loadComponent: () => import('./landing/landing.component').then(m => m.LandingComponent) },
  { path: 'features/:slug', loadComponent: () => import('./features/feature-detail.component').then(m => m.FeatureDetailComponent) },
  { path: 'features', loadComponent: () => import('./features/features.component').then(m => m.FeaturesComponent) },
  { path: 'pricing', loadComponent: () => import('./pricing/pricing-page.component').then(m => m.PricingPageComponent) },
  { path: 'about', loadComponent: () => import('./about/about-page.component').then(m => m.AboutPageComponent) },
  {
    path: 'manual-usuario',
    loadComponent: () => import('./user-manual/user-manual-page.component').then((m) => m.UserManualPageComponent),
  },
  { path: 'login', loadComponent: () => import('./auth/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./auth/register.component').then(m => m.RegisterComponent) },
  { path: 'signup', loadComponent: () => import('./auth/register.component').then(m => m.RegisterComponent) },
  {
    path: 'terms',
    loadComponent: () => import('./legal/legal-document.component').then(m => m.LegalDocumentComponent),
    data: { legalDoc: 'terms' },
  },
  {
    path: 'privacy',
    loadComponent: () => import('./legal/legal-document.component').then(m => m.LegalDocumentComponent),
    data: { legalDoc: 'privacy' },
  },
  { path: 'forgot-password', loadComponent: () => import('./auth/forgot-password.component').then(m => m.ForgotPasswordComponent) },
  { path: 'reset-password', loadComponent: () => import('./auth/reset-password.component').then(m => m.ResetPasswordComponent) },
  {
    path: 'paywall',
    canActivate: [authGuard],
    loadComponent: () => import('./auth/paywall.component').then(m => m.PaywallComponent),
  },
  // Provider portal (public auth pages)
  { path: 'provider/login', loadComponent: () => import('./provider/provider-login.component').then(m => m.ProviderLoginComponent) },
  { path: 'provider/register', loadComponent: () => import('./provider/provider-register.component').then(m => m.ProviderRegisterComponent) },
  {
    path: 'provider/forgot-password',
    loadComponent: () => import('./auth/forgot-password.component').then(m => m.ForgotPasswordComponent),
    data: { passwordResetScope: 'provider' },
  },
  // Provider portal (protected)
  { path: 'provider', canActivate: [providerGuard], loadComponent: () => import('./provider/provider-dashboard.component').then(m => m.ProviderDashboardComponent) },
  // Courier portal (public auth + protected home)
  { path: 'courier/login', loadComponent: () => import('./courier/courier-login.component').then(m => m.CourierLoginComponent) },
  { path: 'courier/orders/:id', canActivate: [courierGuard], loadComponent: () => import('./courier/courier-order-detail.component').then(m => m.CourierOrderDetailComponent) },
  { path: 'courier', canActivate: [courierGuard], loadComponent: () => import('./courier/courier-home.component').then(m => m.CourierHomeComponent) },
  // End-user customer portal (separate from staff User and Factura /customers)
  { path: 'customer/login', loadComponent: () => import('./customer/customer-login.component').then(m => m.CustomerLoginComponent) },
  { path: 'customer/register', loadComponent: () => import('./customer/customer-register.component').then(m => m.CustomerRegisterComponent) },
  { path: 'customer/verify-email', loadComponent: () => import('./customer/customer-verify-email.component').then(m => m.CustomerVerifyEmailComponent) },
  { path: 'customer', canActivate: [customerGuard], loadComponent: () => import('./customer/customer-home.component').then(m => m.CustomerHomeComponent) },
  // Platform operator portal (public auth + protected dashboard)
  { path: 'platform/login', loadComponent: () => import('./platform/platform-login.component').then(m => m.PlatformLoginComponent) },
  { path: 'platform/tenants/:tenantId', canActivate: [platformGuard], loadComponent: () => import('./platform/platform-tenant-detail.component').then(m => m.PlatformTenantDetailComponent) },
  { path: 'platform', canActivate: [platformGuard], loadComponent: () => import('./platform/platform-dashboard.component').then(m => m.PlatformDashboardComponent) },
  { path: 'menu/:token', loadComponent: () => import('./menu/menu.component').then(m => m.MenuComponent) },
  { path: 'menu/:token/payment-success', loadComponent: () => import('./menu/payment-success.component').then(m => m.PaymentSuccessComponent) },
  { path: 'public-menu/:tenantId', loadComponent: () => import('./public-menu/public-menu.component').then(m => m.PublicMenuComponent) },
  {
    path: 'delivery/:tenantId/payment-success',
    loadComponent: () =>
      import('./delivery/delivery-payment-success.component').then((m) => m.DeliveryPaymentSuccessComponent),
  },
  {
    path: 'delivery/:tenantId/track',
    loadComponent: () =>
      import('./delivery/delivery-track.component').then((m) => m.DeliveryTrackComponent),
  },
  {
    path: 'delivery/:tenantId',
    loadComponent: () =>
      import('./delivery/delivery-checkout.component').then((m) => m.DeliveryCheckoutComponent),
  },
  { path: 'book/:tenantId', loadComponent: () => import('./book/book.component').then(m => m.BookComponent) },
  { path: 'waitlist/:tenantId', loadComponent: () => import('./waitlist-public/waitlist-public.component').then(m => m.WaitlistPublicComponent) },
  { path: 'feedback/:tenantId', loadComponent: () => import('./feedback-public/feedback-public.component').then(m => m.FeedbackPublicComponent) },
  { path: 'loyalty/card/:memberToken', loadComponent: () => import('./loyalty-public/loyalty-card-public.component').then(m => m.LoyaltyCardPublicComponent) },
  { path: 'loyalty/:tenantId', loadComponent: () => import('./loyalty-public/loyalty-public.component').then(m => m.LoyaltyPublicComponent) },
  // Public take-away / home ordering: list tenants with ordering link
  { path: 'orders', loadComponent: () => import('./orders-public/orders-public.component').then(m => m.OrdersPublicComponent) },
  // Staff reservations (must be before 'reservation' so /reservations matches here, not the public route)
  { path: 'reservations', canActivate: [authGuard, uiModuleGuard('reservations'), reservationAccessGuard], loadComponent: () => import('./reservations/reservations.component').then(m => m.ReservationsComponent) },
  { path: 'guest-feedback', canActivate: [authGuard, uiModuleGuard('reservations'), reservationAccessGuard], loadComponent: () => import('./guest-feedback/guest-feedback.component').then(m => m.GuestFeedbackComponent) },
  { path: 'reservation', loadComponent: () => import('./reservation-view/reservation-view.component').then(m => m.ReservationViewComponent) },

  // Protected routes - accessible by all authenticated users
  { path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'my-shift', canActivate: [authGuard], loadComponent: () => import('./my-shift/my-shift.component').then(m => m.MyShiftComponent) },
  // Talk to POS (#344): staff voice/text navigation shortcuts (no mutations)
  { path: 'talk', canActivate: [authGuard], loadComponent: () => import('./talk/talk.component').then(m => m.TalkComponent) },

  // Products - all roles can view, but editing is handled in component
  { path: 'products', canActivate: [authGuard], loadComponent: () => import('./products/products.component').then(m => m.ProductsComponent) },
  { path: 'catalog', canActivate: [authGuard, uiModuleGuard('providers')], loadComponent: () => import('./catalog/catalog.component').then(m => m.CatalogComponent) },

  // Register `tables/canvas` before `tables` (prefix matching would otherwise match `/tables/canvas` as `/tables`).
  {
    path: 'tables/canvas',
    canActivate: [authGuard, uiModuleGuard('tables'), tableAccessGuard],
    canDeactivate: [tablesCanvasCanDeactivate],
    loadComponent: () => import('./tables/tables-canvas.component').then(m => m.TablesCanvasComponent),
  },
  { path: 'tables', canActivate: [authGuard, uiModuleGuard('tables'), tableAccessGuard], loadComponent: () => import('./tables/tables.component').then(m => m.TablesComponent) },

  // Staff orders (list and manage orders)
  { path: 'staff/orders', canActivate: [authGuard, orderAccessGuard], loadComponent: () => import('./orders/orders.component').then(m => m.OrdersComponent) },
  // Billing customers (Factura)
  { path: 'customers', canActivate: [authGuard, orderAccessGuard], loadComponent: () => import('./customers/customers.component').then(m => m.CustomersComponent) },
  // Kitchen display (cocina: main course) and Bar display (beverages only) - same component, filtered by category
  { path: 'kitchen', canActivate: [authGuard, uiModuleGuard('kitchen_bar'), orderAccessGuard], loadComponent: () => import('./kitchen-display/kitchen-display.component').then(m => m.KitchenDisplayComponent), data: { view: 'kitchen' } },
  { path: 'bar', canActivate: [authGuard, uiModuleGuard('kitchen_bar'), orderAccessGuard], loadComponent: () => import('./kitchen-display/kitchen-display.component').then(m => m.KitchenDisplayComponent), data: { view: 'bar' } },

  // Admin-only routes
  { path: 'translations', redirectTo: 'settings', pathMatch: 'full' },
  { path: 'settings', canActivate: [authGuard, adminGuard], loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent) },
  { path: 'users', canActivate: [authGuard, adminGuard, uiModuleGuard('users')], loadComponent: () => import('./users/users.component').then(m => m.UsersComponent) },
  {
    path: 'contracts',
    canActivate: [authGuard, uiModuleGuard('contracts'), permissionGuard('staff_contract:read')],
    loadComponent: () => import('./staff-contracts/staff-contracts.component').then(m => m.StaffContractsComponent),
  },

  // Inventory module (lazy loaded) - admin only
  { path: 'inventory', canActivate: [authGuard, adminGuard, uiModuleGuard('inventory')], loadChildren: () => import('./inventory/inventory.routes').then(m => m.INVENTORY_ROUTES) },

  // Reports (sales / revenue) - owner & admin
  { path: 'reports', canActivate: [authGuard, adminGuard], loadComponent: () => import('./reports/reports.component').then(m => m.ReportsComponent) },

  // Working plan (shift schedule) - all staff can add/edit; owner sees '*' when updated by others
  // pathMatch full + guard: redirect to /working-plan/week or /working-plan/calendar (guard runs first; loadComponent satisfies route config)
  { path: 'working-plan', pathMatch: 'full', canActivate: [authGuard, uiModuleGuard('working_plan'), scheduleGuard, workingPlanViewRedirectGuard], loadComponent: () => import('./working-plan/working-plan.component').then(m => m.WorkingPlanComponent) },
  { path: 'working-plan/:view', canActivate: [authGuard, uiModuleGuard('working_plan'), scheduleGuard], loadComponent: () => import('./working-plan/working-plan.component').then(m => m.WorkingPlanComponent) },

  { path: '**', redirectTo: '' }
];
