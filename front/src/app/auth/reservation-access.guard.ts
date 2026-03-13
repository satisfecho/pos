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
  if (!permissions.hasPermission(user, 'reservation:read')) {
    console.warn('[reservationAccessGuard] Access denied. User role:', user.role, '– needs reservation:read');
    router.navigate(['/']);
    return false;
  }
  return true;
};
