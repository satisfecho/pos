import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ApiService } from '../services/api.service';

/**
 * Guard for provider portal routes. Requires authenticated user with provider_id.
 * Redirects to /provider/login if not a provider.
 */
export const providerGuard: CanActivateFn = (route, state) => {
  const api = inject(ApiService);
  const router = inject(Router);

  const user = api.getCurrentUser();
  if (user?.provider_id != null) {
    return true;
  }

  return api.checkAuth().pipe(
    map(u => {
      if (u?.provider_id != null) return true;
      return router.createUrlTree(['/provider/login']);
    }),
    catchError(() => of(router.createUrlTree(['/provider/login'])))
  );
};
