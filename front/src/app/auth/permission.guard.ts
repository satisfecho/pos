import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../services/api.service';
import { PermissionService, Permission } from '../services/permission.service';

/** Require at least one of the given permissions (mirrors backend RBAC). */
export function permissionGuard(...permissions: Permission[]): CanActivateFn {
  return async () => {
    const api = inject(ApiService);
    const router = inject(Router);
    const ps = inject(PermissionService);
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
    if (!ps.hasAnyPermission(user, ...permissions)) {
      router.navigate(['/dashboard']);
      return false;
    }
    return true;
  };
}
