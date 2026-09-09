import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { SchedulePage } from './schedule.page';

describe('SchedulePage', () => {
  let component: SchedulePage;
  let fixture: ComponentFixture<SchedulePage>;
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.setItem('vb_current_user', JSON.stringify({ name: 'Test User' }));
    localStorage.setItem(
      'vb_selected_service',
      JSON.stringify({
        serviceId: 'corte-precision',
        stationId: 'sillon-1',
        serviceName: 'Baño con Hidromasaje',
        durationMin: 45,
        price: '$45.000',
        category: 'hidroterapia',
        stationName: 'Tina 1',
        professional: 'Valentina Ríos',
      })
    );

    TestBed.configureTestingModule({
      imports: [SchedulePage],
      providers: [provideRouter([])],
    });

    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    fixture = TestBed.createComponent(SchedulePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('lee la selección del Punto C desde localStorage', () => {
    expect(component.selection?.serviceName).toBe('Baño con Hidromasaje');
  });

  it('confirmar cita añade un registro a vb_appointments', async () => {
    component.selectedSlot = { time: '11:15', state: 'available' };
    await component.confirmSelection();

    const stored = JSON.parse(localStorage.getItem('vb_appointments') ?? '[]');
    expect(stored.length).toBe(1);
    expect(stored[0].service).toBe('Baño con Hidromasaje');
    expect(stored[0].time).toBe('11:15');
    expect(stored[0].status).toBe('Confirmado');
    expect(navigateSpy).toHaveBeenCalledWith('/appointments');
  });
});
