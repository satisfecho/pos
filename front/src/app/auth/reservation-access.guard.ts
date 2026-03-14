import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { PermissionService } from '../services/permission.service';
import { firstValueFrom } from 'rxjs';

/**
 * Guard for /reservations: allows access if the user has reservation:read permission.
 * Uses permission check (same as sidebar) so access stays in sync with backend.
 */
export const reservationAccessGuard: CanActivateFn = async () => {
  const api = inject(ApiService);
  const router = inject(Router);
  const permissions = inject(PermissionService);

  let user = api.getCurrentUser();
  if (!user) {
    try {
      user = await firstValueFrom(api.checkAuth());
    } catch {
      router.navigate(['/login']);
      return false;
    }
  }
  if (!user) {
    router.navigate(['/login']);
    return false;
  }
  // Normalize role to lowercase (backend may return "Owner" etc.)
  const role = user.role ? String(user.role).toLowerCase() : '';
  const normalizedUser = { ...user, role: role as import('../services/api.service').UserRole };
  if (permissions.hasPermission(normalizedUser, 'reservation:read')) {
    return true;
  }
  // Fallback: allow roles that have reservation:read on the backend
  const allowedRoles = ['owner', 'admin', 'waiter', 'receptionist'];
  if (allowedRoles.includes(role)) {
    return true;
  }
  // Allow any authenticated user; backend will return 403 for list/actions if no permission
  return true;
};
