import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap, Observable, Subject, filter, take } from 'rxjs';
import { ApiService } from '../services/api.service';

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
// Subject that emits when refresh completes (true = success, false = failure)
let refreshResult$ = new Subject<boolean>();

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
