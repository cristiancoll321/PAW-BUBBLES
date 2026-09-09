import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppointmentsPage } from './appointments.page';

describe('AppointmentsPage', () => {
  let component: AppointmentsPage;
  let fixture: ComponentFixture<AppointmentsPage>;

  function build(): void {
    TestBed.configureTestingModule({
      imports: [AppointmentsPage],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(AppointmentsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => localStorage.clear());

  it('should create', () => {
    build();
    expect(component).toBeTruthy();
  });

  it('sin vb_appointments la lista de activas queda vacía', () => {
    build();
    expect(component.hasActive).toBe(false);
  });

  it('lee las citas activas escritas por el Punto D', () => {
    localStorage.setItem(
      'vb_appointments',
      JSON.stringify([
        {
          id: 1,
          service: 'Baño con Hidromasaje',
          professional: 'Valentina Ríos · Hidroterapia & Baños',
          date: 'Hoy 29',
          time: '11:15',
          duration: '45 min',
          status: 'Confirmado',
          accent: 'confirmed',
        },
      ])
    );
    build();
    expect(component.activeAppointments.length).toBe(1);
    expect(component.activeAppointments[0].service).toBe('Baño con Hidromasaje');
  });

  it('cancelar una cita la saca de "Activas" y la marca Cancelado en localStorage', async () => {
    localStorage.setItem(
      'vb_appointments',
      JSON.stringify([
        {
          id: 1,
          service: 'Baño con Hidromasaje',
          professional: 'Valentina Ríos · Hidroterapia & Baños',
          date: 'Hoy 29',
          time: '11:15',
          duration: '45 min',
          status: 'Confirmado',
          accent: 'confirmed',
        },
      ])
    );
    build();

    await component.cancelAppointment(component.activeAppointments[0]);

    expect(component.activeAppointments.length).toBe(0);
    const stored = JSON.parse(localStorage.getItem('vb_appointments') ?? '[]');
    expect(stored[0].status).toBe('Cancelado');
  });
});
