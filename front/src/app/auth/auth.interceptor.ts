import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap, ReplaySubject, take } from 'rxjs';
import { ApiService } from '../services/api.service';

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
// Replay last refresh outcome so subscribers that attach after refresh finishes still retry or fail (avoids hang)
let refreshResult$ = new ReplaySubject<boolean>(1);

/** Routes that do not require auth; never redirect to login on 401 when on these. */
function isPublicRoute(url: string): boolean {
  const path = (url || '').split('?')[0].replace(/\/$/, '') || '/';
  return (
    path === '/login' ||
    path === '/register' ||
    path === '/courier/login' ||
    path.startsWith('/provider/login') ||
    path.startsWith('/provider/register') ||
    path.startsWith('/provider/forgot-password') ||
    path.startsWith('/menu/') ||
    path.startsWith('/book/') ||
    path.startsWith('/feedback/') ||
    path === '/reservation'
  );
}

/** Login path for the current portal (staff vs courier vs provider). */
function loginPathForCurrentRoute(routerUrl: string): string {
  const path = getCurrentPath(routerUrl);
  if (path.startsWith('/courier')) return '/courier/login';
  if (path.startsWith('/provider')) return '/provider/login';
  return '/login';
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
  // Do not inject ApiService here: HttpClient creation runs interceptors while ApiService is still
  // constructing (NG0200). Resolve ApiService lazily inside error handling via Injector.
  const injector = inject(Injector);
  const router = inject(Router);

  // Ensure cookies are sent with requests
  req = req.clone({
    withCredentials: true
  });

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const apiService = injector.get(ApiService);
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
          const loginPath = loginPathForCurrentRoute(router.url);
          apiService.logout().subscribe(() => {
            if (!router.url.startsWith(loginPath)) {
              router.navigate([loginPath]);
            }
          });
          return throwError(() => error);
        }

        if (!isRefreshing) {
          // First 401 - initiate token refresh
          isRefreshing = true;
          refreshResult$ = new ReplaySubject<boolean>(1);

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
              const loginPath = loginPathForCurrentRoute(router.url);
              apiService.logout().subscribe(() => {
                if (!router.url.startsWith(loginPath)) {
                  router.navigate([loginPath]);
                }
              });
              return throwError(() => refreshError);
            })
          );
        } else {
          // Another request got 401 while refresh is in progress - wait for it
          return refreshResult$.pipe(
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
