import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ApiService } from '../services/api.service';

/**
 * Guard for courier portal routes. Requires authenticated user with courier role.
 * Redirects to /courier/login if not a courier.
 */
export const courierGuard: CanActivateFn = () => {
  const api = inject(ApiService);
  const router = inject(Router);

  const user = api.getCurrentUser();
  if (user?.role === 'courier') {
    return true;
  }

  return api.checkAuth().pipe(
    map(u => {
      if (u?.role === 'courier') return true;
      return router.createUrlTree(['/courier/login']);
    }),
    catchError(() => of(router.createUrlTree(['/courier/login'])))
  );
};
