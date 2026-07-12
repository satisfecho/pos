import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ApiService } from '../services/api.service';

/** Guard for platform operator routes. Requires role platform_operator. */
export const platformGuard: CanActivateFn = () => {
  const api = inject(ApiService);
  const router = inject(Router);

  const user = api.getCurrentUser();
  if (user?.role === 'platform_operator') {
    return true;
  }

  return api.checkAuth().pipe(
    map(u => {
      if (u?.role === 'platform_operator') return true;
      return router.createUrlTree(['/platform/login']);
    }),
    catchError(() => of(router.createUrlTree(['/platform/login'])))
  );
};
