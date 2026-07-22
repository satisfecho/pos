import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { ApiService, type SaasSubscription } from '../services/api.service';

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

  const afterAuth = (user: { role?: string; provider_id?: number | null; tenant_id?: number | null } | null) => {
    if (!user) {
      return of(router.createUrlTree(['/login']));
    }
    const roleRedirect = redirectForRole(user);
    if (roleRedirect) {
      return of(roleRedirect);
    }
    // Paywall page itself only needs auth
    const url = state.url.split('?')[0];
    if (url === '/paywall' || url.startsWith('/paywall/')) {
      return of(true);
    }
    if (user.tenant_id == null || user.role === 'platform_operator') {
      return of(true);
    }
    return apiService.getSaasSubscription().pipe(
      map((sub: SaasSubscription) => {
        if (!sub.enabled || sub.has_access) {
          return true;
        }
        return router.createUrlTree(['/paywall']);
      }),
      catchError(() => of(true)),
    );
  };

  const cached = apiService.getCurrentUser();
  if (cached) {
    return afterAuth(cached);
  }

  return apiService.checkAuth().pipe(
    switchMap((user) => afterAuth(user)),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
