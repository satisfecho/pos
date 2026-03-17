import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { LanguageService } from './services/language.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('front');
  private router = inject(Router);
  private routerSub?: Subscription;

  /** Inject so LanguageService initializes at bootstrap and applies browser default language everywhere from first load. */
  private languageService = inject(LanguageService);

  ngOnInit() {
    // Set initial favicon based on current route
    this.updateFavicon(this.router.url);

    // Listen to route changes and update favicon
    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.updateFavicon(event.urlAfterRedirects);
        }
      });
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
  }

  private updateFavicon(_url: string) {
    // Dev: white | Staging: blue | Production: orange (all routes)
    if (!environment.production) {
      this.setFavicon('/favicon-dev.svg');
      return;
    }
    if (environment.staging) {
      this.setFavicon('/favicon-admin.svg');
      return;
    }
    this.setFavicon('/favicon.svg');
  }

  private setFavicon(path: string) {
    // Remove existing favicon links
    const existingLinks = document.querySelectorAll('link[rel*="icon"]');
    existingLinks.forEach(link => link.remove());

    // Create new favicon link
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = `${path}?v=2.0.0`;
    document.head.appendChild(link);

    // Also update apple-touch-icon
    const appleLink = document.createElement('link');
    appleLink.rel = 'apple-touch-icon';
    appleLink.href = path;
    document.head.appendChild(appleLink);
  }
}
