import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PetTrackingPage } from './pet-tracking.page';

describe('PetTrackingPage', () => {
  let component: PetTrackingPage;
  let fixture: ComponentFixture<PetTrackingPage>;

  function build(): void {
    TestBed.configureTestingModule({
      imports: [PetTrackingPage],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(PetTrackingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function seedPet(): void {
    localStorage.setItem('vb_tracking_pet', '99');
    localStorage.setItem(
      'vb_pets',
      JSON.stringify([
        { id: 99, ownerEmail: 't@paw.com', name: 'Rocky', breed: 'Beagle', ageApprox: '3 años', size: 'Mediana', weightKg: 12, temperament: 'Tranquilo', careNotes: '', createdAt: '' },
      ]),
    );
  }

  afterEach(() => localStorage.clear());

  it('should create', () => {
    seedPet();
    build();
    expect(component).toBeTruthy();
    expect(component.pet?.name).toBe('Rocky');
  });

  it('siembra un histórico de demo la primera vez', () => {
    seedPet();
    build();
    expect(component.record.history.length).toBeGreaterThan(0);
    const stored = JSON.parse(localStorage.getItem('vb_pet_tracking') ?? '{}');
    expect(stored['99'].history.length).toBeGreaterThan(0);
  });

  it('checkIn coloca al canino en la fase 1 (En Recepción)', () => {
    seedPet();
    build();
    component.checkIn();
    expect(component.record.currentPhase).toBe(0);
    expect(component.inFacility).toBe(true);
  });

  it('advancePhase avanza y se detiene en "Listo para Entrega"', () => {
    seedPet();
    build();
    component.checkIn();
    component.advancePhase();
    component.advancePhase();
    component.advancePhase();
    component.advancePhase();
    expect(component.record.currentPhase).toBe(3);
    expect(component.isReady).toBe(true);
  });

  it('saveVisit agrega la visita al histórico y persiste', () => {
    seedPet();
    build();
    const before = component.record.history.length;
    component.visitForm = { date: '8 sep 2026', service: 'Hidroterapia', price: '$90.000' };
    component.saveVisit(true);
    expect(component.record.history.length).toBe(before + 1);
    expect(component.record.currentPhase).toBe(-1);
  });
});
