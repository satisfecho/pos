import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ApiService, TenantUiModuleKey } from '../services/api.service';

/** Redirect to dashboard when the tenant has disabled this staff UI module (Settings). */
export function uiModuleGuard(moduleKey: TenantUiModuleKey): CanActivateFn {
  return () => {
    const api = inject(ApiService);
    const router = inject(Router);
    return api.ensureTenantUiModulesLoaded().pipe(
      map(() =>
        api.isUiModuleEnabled(moduleKey) ? true : router.createUrlTree(['/dashboard'])
      ),
      catchError(() => of(router.createUrlTree(['/dashboard'])))
    );
  };
}
