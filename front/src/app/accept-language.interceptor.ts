import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../environments/environment';
import { LanguageService } from './services/language.service';

/** Sends the UI language to the API so localized error messages match the user's locale. */
export const acceptLanguageInterceptor: HttpInterceptorFn = (req, next) => {
  const base = environment.apiUrl;
  if (!req.url.startsWith(base)) {
    return next(req);
  }
  if (req.headers.has('Accept-Language')) {
    return next(req);
  }
  // Defer inject: i18n loads via HttpClient during LanguageService construction (avoid circular DI).
  const languageService = inject(LanguageService);
  return next(
    req.clone({
      setHeaders: { 'Accept-Language': languageService.getAcceptLanguageHeader() },
    }),
  );
};
