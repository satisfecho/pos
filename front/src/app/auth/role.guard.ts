import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ApiService, UserRole } from '../services/api.service';
import { PermissionService } from '../services/permission.service';
import { firstValueFrom } from 'rxjs';

/**
 * Route guard factory that checks if the user has one of the allowed roles.
 *
 * Usage in routes:
 * ```typescript
 * {
 *   path: 'settings',
 *   loadComponent: () => import('./settings/settings.component'),
 *   canActivate: [authGuard, roleGuard(['owner', 'admin'])]
 * }
 * ```
 */
export function roleGuard(allowedRoles: UserRole[]): CanActivateFn {
  return async (route, state) => {
    const api = inject(ApiService);
    const router = inject(Router);
    const permissionService = inject(PermissionService);

    // First check if user is authenticated
    let user = api.getCurrentUser();

    // If no user in memory, try to fetch from backend
    if (!user) {
      try {
        user = await firstValueFrom(api.checkAuth());
      } catch {
        // Not authenticated - redirect to login
        router.navigate(['/login']);
        return false;
      }
    }

    // Check if user is authenticated
    if (!user) {
      router.navigate(['/login']);
      return false;
    }

    // Check if user has one of the allowed roles
    if (!permissionService.hasRole(user, ...allowedRoles)) {
      // User doesn't have permission - redirect to dashboard
      // Could also show an access denied page
      console.warn(`Access denied to ${state.url}. User role: ${user.role}, Required: ${allowedRoles.join(', ')}`);
      router.navigate(['/dashboard']);
      return false;
    }

    return true;
  };
}

/**
 * Route guard that only allows owners
 */
export const ownerGuard: CanActivateFn = roleGuard(['owner']);

/**
 * Route guard that allows owners and admins
 */
export const adminGuard: CanActivateFn = roleGuard(['owner', 'admin']);

/**
 * Route guard that allows staff with table access (owner, admin, waiter, receptionist)
 */
export const tableAccessGuard: CanActivateFn = roleGuard(['owner', 'admin', 'waiter', 'receptionist']);

/**
 * Route guard that allows staff with order access (owner, admin, kitchen, waiter, receptionist)
 */
export const orderAccessGuard: CanActivateFn = roleGuard(['owner', 'admin', 'kitchen', 'bartender', 'waiter', 'receptionist']);

/**
 * Route guard that allows all staff who can add/edit the working plan (schedule)
 */
export const scheduleGuard: CanActivateFn = roleGuard(['owner', 'admin', 'kitchen', 'bartender', 'waiter', 'receptionist']);
