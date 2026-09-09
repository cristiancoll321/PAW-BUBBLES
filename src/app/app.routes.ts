/**
 * Tabla de rutas de la app (router standalone de Angular).
 *
 * Flujo previsto de pantallas:
 *
 *   ''  ─redirect─▶  /login  ──▶  /register
 *                       │             │
 *                       └──────┬──────┘
 *                              ▼   (userType === 'cliente')
 *                     /service-selection   ← PUNTO C (implementado)
 *                              ▼
 *                        /schedule         ← PUNTO D (implementado)
 *                              ▼
 *                     /appointments        ← PUNTO E (implementado)
 *
 * Todas las páginas se cargan con loadComponent (lazy) → cada una es su
 * propio chunk. El estado entre pantallas NO viaja por el router: se pasa
 * vía localStorage (ver FLUJO-DE-DATOS.md).
 */
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    // Arranque de la app → pantalla de login.
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage)
  },
  {
    // PUNTO C — destino de login/registro cuando el usuario es 'cliente'.
    path: 'service-selection',
    loadComponent: () => import('./pages/service-selection/service-selection.page').then(m => m.ServiceSelectionPage)
  },
  {
    // PUNTO D — Revisar Horario y Disponibilidad.
    // Origen: el botón "Continuar a Horario" del Punto C.
    // Lee vb_selected_service; al confirmar escribe vb_appointments y navega a
    // /appointments. Portado desde la rama `desarrollo-cristian` y adaptado a
    // standalone + al flujo de datos de esta rama (ver FLUJO-DE-DATOS.md).
    path: 'schedule',
    loadComponent: () => import('./pages/schedule/schedule.page').then(m => m.SchedulePage)
  },
  {
    // PUNTO E — Servicios Agendados e Historial.
    // Lee vb_appointments (lo escribe el Punto D). "Nueva" vuelve al Punto C.
    path: 'appointments',
    loadComponent: () => import('./pages/appointments/appointments.page').then(m => m.AppointmentsPage)
  },
  {
    path: 'pets',
    loadComponent: () => import('./pages/pets/pets.page').then(m => m.PetsPage)
  },
  {
    path: 'tracking',
    loadComponent: () => import('./pages/tracking/tracking.page').then(m => m.TrackingPage)
  },
  {
    // Home del perfil "Especialista" — pantalla no incluida en el alcance actual.
    // login/registro redirigen aquí cuando userType === 'especialista'.
    path: 'specialist-home',
    redirectTo: 'service-selection',
    pathMatch: 'full'
  },
  {
    path: 'test-standalone',
    loadComponent: () => import('./pages/test-standalone/test-standalone.page').then( m => m.TestStandalonePage)
  },

];
