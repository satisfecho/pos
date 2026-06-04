/**
 * Events module routes (staff): list, detail (guest list), door check-in.
 */

import { Routes } from '@angular/router';

export const EVENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./events-list.component').then((m) => m.EventsListComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./event-detail.component').then((m) => m.EventDetailComponent),
  },
  {
    path: ':id/checkin',
    loadComponent: () => import('./event-checkin.component').then((m) => m.EventCheckinComponent),
  },
];
