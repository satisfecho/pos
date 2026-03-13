import { Injectable, inject } from '@angular/core';
import { ApiService, User, UserRole } from './api.service';

/**
 * Permission types matching the backend Permission enum
 */
export type Permission =
  // User management
  | 'user:create'
  | 'user:read'
  | 'user:update'
  | 'user:delete'
  // Settings
  | 'settings:read'
  | 'settings:update'
  | 'settings:billing'
  // Products
  | 'product:read'
  | 'product:write'
  // Catalog
  | 'catalog:read'
  | 'catalog:write'
  // Tables
  | 'table:read'
  | 'table:write'
  | 'table:activate'
  // Reservations
  | 'reservation:read'
  | 'reservation:write'
  // Floors
  | 'floor:read'
  | 'floor:write'
  // Orders
  | 'order:read'
  | 'order:update_status'
  | 'order:item_status'
  | 'order:mark_paid'
  | 'order:cancel'
  | 'order:remove_item'
  // Inventory
  | 'inventory:read'
  | 'inventory:write'
  // Translations
  | 'translation:read'
  | 'translation:write';

/**
 * Role to permissions mapping (mirrors backend ROLE_PERMISSIONS)
 */
const ROLE_PERMISSIONS: Record<UserRole, Set<Permission | '*'>> = {
  owner: new Set(['*']), // Owner has all permissions

  admin: new Set([
    'user:create', 'user:read', 'user:update',
    'settings:read', 'settings:update',
    'product:read', 'product:write',
    'catalog:read', 'catalog:write',
    'table:read', 'table:write', 'table:activate',
    'reservation:read', 'reservation:write',
    'floor:read', 'floor:write',
    'order:read', 'order:update_status', 'order:item_status',
    'order:mark_paid', 'order:cancel', 'order:remove_item',
    'inventory:read', 'inventory:write',
    'translation:read', 'translation:write',
  ]),

  kitchen: new Set([
    'product:read',
    'catalog:read',
    'order:read', 'order:item_status',
  ]),

  waiter: new Set([
    'product:read',
    'catalog:read',
    'table:read', 'table:activate',
    'reservation:read', 'reservation:write',
    'floor:read',
    'order:read', 'order:update_status', 'order:item_status',
    'order:mark_paid', 'order:remove_item',
  ]),

  receptionist: new Set([
    'product:read',
    'catalog:read',
    'table:read', 'table:activate',
    'reservation:read', 'reservation:write',
    'floor:read',
    'order:read',
  ]),
};

/**
 * Routes and their required roles
 */
const ROUTE_ROLES: Record<string, UserRole[]> = {
  '/': ['owner', 'admin', 'kitchen', 'waiter', 'receptionist'],
  '/products': ['owner', 'admin', 'kitchen', 'waiter', 'receptionist'],
  '/catalog': ['owner', 'admin', 'kitchen', 'waiter', 'receptionist'],
  '/tables': ['owner', 'admin', 'waiter', 'receptionist'],
  '/tables/canvas': ['owner', 'admin'],
  '/reservations': ['owner', 'admin', 'waiter', 'receptionist'],
  '/orders': ['owner', 'admin', 'kitchen', 'waiter', 'receptionist'],
  '/inventory': ['owner', 'admin'],
  '/settings': ['owner', 'admin'],
  '/users': ['owner', 'admin'],
};

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private api = inject(ApiService);

  /**
   * Check if a user has a specific permission
   */
  hasPermission(user: User | null, permission: Permission): boolean {
    if (!user) return false;

    const permissions = ROLE_PERMISSIONS[user.role];
    if (!permissions) return false;

    // Owner has all permissions
    if (permissions.has('*')) return true;

    return permissions.has(permission);
  }

  /**
   * Check if a user has any of the specified permissions
   */
  hasAnyPermission(user: User | null, ...permissions: Permission[]): boolean {
    return permissions.some(p => this.hasPermission(user, p));
  }

  /**
   * Check if a user has all of the specified permissions
   */
  hasAllPermissions(user: User | null, ...permissions: Permission[]): boolean {
    return permissions.every(p => this.hasPermission(user, p));
  }

  /**
   * Check if a user can access a specific route
   */
  canAccessRoute(user: User | null, route: string): boolean {
    if (!user) return false;

    // Normalize route - remove trailing slashes and query params
    const normalizedRoute = route.split('?')[0].replace(/\/$/, '') || '/';

    // Check for exact match first
    if (ROUTE_ROLES[normalizedRoute]) {
      return ROUTE_ROLES[normalizedRoute].includes(user.role);
    }

    // Check for parent route match (e.g., /inventory/items matches /inventory)
    for (const [routePattern, roles] of Object.entries(ROUTE_ROLES)) {
      if (normalizedRoute.startsWith(routePattern + '/') || normalizedRoute === routePattern) {
        return roles.includes(user.role);
      }
    }

    // Default: allow if authenticated (for routes not explicitly defined)
    return true;
  }

  /**
   * Check if current user has a specific role
   */
  hasRole(user: User | null, ...roles: UserRole[]): boolean {
    if (!user) return false;
    return roles.includes(user.role);
  }

  /**
   * Check if current user is an admin (owner or admin role)
   */
  isAdmin(user: User | null): boolean {
    return this.hasRole(user, 'owner', 'admin');
  }

  /**
   * Check if current user is the owner
   */
  isOwner(user: User | null): boolean {
    return this.hasRole(user, 'owner');
  }

  /**
   * Get the current user from the API service
   */
  getCurrentUser(): User | null {
    return this.api.getCurrentUser();
  }

  /**
   * Get allowed roles for a route
   */
  getAllowedRolesForRoute(route: string): UserRole[] {
    const normalizedRoute = route.split('?')[0].replace(/\/$/, '') || '/';

    if (ROUTE_ROLES[normalizedRoute]) {
      return ROUTE_ROLES[normalizedRoute];
    }

    // Check for parent route match
    for (const [routePattern, roles] of Object.entries(ROUTE_ROLES)) {
      if (normalizedRoute.startsWith(routePattern + '/')) {
        return roles;
      }
    }

    // Default: all roles
    return ['owner', 'admin', 'kitchen', 'waiter', 'receptionist'];
  }
}
