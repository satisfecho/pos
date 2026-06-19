import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ApiService } from '../services/api.service';

export const authGuard: CanActivateFn = (route, state) => {
  const apiService = inject(ApiService);
  const router = inject(Router);

  const redirectForRole = (user: { role?: string; provider_id?: number | null } | null) => {
    if (user?.role === 'courier') {
      return router.createUrlTree(['/courier']);
    }
    if (user?.provider_id != null) {
      return router.createUrlTree(['/provider']);
    }
    return null;
  };

  // Check if we already have a user in memory
  const cached = apiService.getCurrentUser();
  if (cached) {
    const roleRedirect = redirectForRole(cached);
    if (roleRedirect) return roleRedirect;
    return true;
  }

  // If not, verify with backend
  return apiService.checkAuth().pipe(
    map(user => {
      if (user) {
        const roleRedirect = redirectForRole(user);
        if (roleRedirect) return roleRedirect;
        return true;
      } else {
        return router.createUrlTree(['/login']);
      }
    }),
    catchError(() => {
      // Logic error or network error during check
      return of(router.createUrlTree(['/login']));
    })
  );
};
