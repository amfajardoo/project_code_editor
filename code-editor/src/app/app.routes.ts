import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'editor/:roomId',
    loadComponent: () => import('./editor-view/editor-view'),
    title: 'Collab room',
  },
  {
    path: '',
    loadComponent: () => import('./home/home'),
    title: 'Choose your destiny',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
