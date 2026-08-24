import { Component, DestroyRef, ViewEncapsulation, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, of, switchMap, tap } from 'rxjs';
import { LanguagePickerComponent } from '../shared/language-picker.component';
import { LandingSiteFooterComponent } from '../shared/landing-site-footer.component';
import { LanguageCode, LanguageService } from '../services/language.service';

/** Public marketing shell for the user manual (locale HTML under /manual-usuario/content/). */
@Component({
  selector: 'app-user-manual-page',
  standalone: true,
  imports: [RouterLink, TranslateModule, LanguagePickerComponent, LandingSiteFooterComponent],
  templateUrl: './user-manual-page.component.html',
  styleUrl: './user-manual-page.component.css',
  // Styles must reach [innerHTML] locale content; all rules are scoped under .user-manual-page.
  encapsulation: ViewEncapsulation.None,
})
export class UserManualPageComponent {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly languageService = inject(LanguageService);
  private readonly title = inject(Title);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly contentHtml = signal<SafeHtml | null>(null);

  constructor() {
    toObservable(this.languageService.currentLanguage)
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(false);
        }),
        switchMap((lang) => {
          const code = this.contentLocale(lang);
          return this.http.get(`/manual-usuario/content/${code}.html`, { responseType: 'text' }).pipe(
            catchError(() => {
              this.error.set(true);
              this.loading.set(false);
              this.contentHtml.set(null);
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((html) => {
        if (html == null) {
          return;
        }
        // Fragment-only hrefs resolve against <base href="/">; pin them to this route.
        const fixed = html.replace(/href="#([^"]+)"/g, 'href="/manual-usuario#$1"');
        this.contentHtml.set(this.sanitizer.bypassSecurityTrustHtml(fixed));
        this.loading.set(false);
        this.title.setTitle(this.translate.instant('USER_MANUAL_PAGE.DOC_TITLE'));
      });

    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.title.setTitle(this.translate.instant('USER_MANUAL_PAGE.DOC_TITLE'));
    });
  }

  /** Full manual body exists for es + en; other UI locales use English content. */
  private contentLocale(lang: LanguageCode): 'en' | 'es' {
    return lang === 'es' ? 'es' : 'en';
  }
}
