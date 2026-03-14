import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap, Observable, Subject, filter, take } from 'rxjs';
import { ApiService } from '../services/api.service';

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
// Subject that emits when refresh completes (true = success, false = failure)
let refreshResult$ = new Subject<boolean>();

/** Routes that do not require auth; never redirect to login on 401 when on these. */
function isPublicRoute(url: string): boolean {
  const path = (url || '').split('?')[0].replace(/\/$/, '') || '/';
  return (
    path === '/login' ||
    path === '/register' ||
    path.startsWith('/menu/') ||
    path.startsWith('/book/') ||
    path === '/reservation'
  );
}

/** Current browser path (used when router.url not yet updated, e.g. on initial load). */
function getCurrentPath(routerUrl: string): string {
  if (routerUrl && routerUrl.length > 0) return routerUrl;
  if (typeof window !== 'undefined' && window.location?.pathname) {
    return window.location.pathname;
  }
  return '';
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiService = inject(ApiService);
  const router = inject(Router);

  // Ensure cookies are sent with requests
  req = req.clone({
    withCredentials: true
  });

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized errors
      if (error.status === 401) {
        // On public routes, do not redirect or refresh; let the request fail
        const currentPath = getCurrentPath(router.url);
        if (isPublicRoute(currentPath)) {
          return throwError(() => error);
        }

        // CheckAuth (GET /users/me) failing is expected when not logged in; do not redirect or refresh.
        // Let the route guard or component handle it (e.g. authGuard redirects for protected routes).
        if (req.url.includes('/users/me')) {
          return throwError(() => error);
        }

        // Don't try to refresh if the failing request is the refresh or login endpoint
        const isAuthEndpoint = req.url.includes('/refresh') ||
          req.url.includes('/token') ||
          req.url.includes('/logout');

        if (isAuthEndpoint) {
          // Auth endpoint itself failed - logout
          apiService.logout();
          if (!router.url.startsWith('/login')) {
            router.navigate(['/login']);
          }
          return throwError(() => error);
        }

        if (!isRefreshing) {
          // First 401 - initiate token refresh
          isRefreshing = true;
          refreshResult$ = new Subject<boolean>();

          return apiService.refreshToken().pipe(
            switchMap(() => {
              isRefreshing = false;
              refreshResult$.next(true);
              refreshResult$.complete();
              // Retry the original request with fresh token
              return next(req.clone({ withCredentials: true }));
            }),
            catchError((refreshError) => {
              isRefreshing = false;
              refreshResult$.next(false);
              refreshResult$.complete();
              // Refresh failed - logout and redirect to login
              apiService.logout();
              if (!router.url.startsWith('/login')) {
                router.navigate(['/login']);
              }
              return throwError(() => refreshError);
            })
          );
        } else {
          // Another request got 401 while refresh is in progress - wait for it
          return refreshResult$.pipe(
            filter((result) => result !== undefined),
            take(1),
            switchMap((success) => {
              if (success) {
                // Refresh succeeded - retry this request
                return next(req.clone({ withCredentials: true }));
              } else {
                // Refresh failed - propagate the error
                return throwError(() => error);
              }
            })
          );
        }
      }
      return throwError(() => error);
    })
  );
};
