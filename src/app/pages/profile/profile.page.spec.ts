import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProfilePage } from './profile.page';

describe('ProfilePage', () => {
  let component: ProfilePage;
  let fixture: ComponentFixture<ProfilePage>;

  function build(): void {
    TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(ProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    localStorage.setItem(
      'vb_current_user',
      JSON.stringify({ email: 'tutor@paw.com', name: 'Ana María', userType: 'cliente' }),
    );
  });

  afterEach(() => localStorage.clear());

  it('should create', () => {
    build();
    expect(component).toBeTruthy();
  });

  it('sin vb_pets la lista de mascotas queda vacía', () => {
    build();
    expect(component.hasPets).toBe(false);
  });

  it('registra una mascota y la persiste en vb_pets con el ownerEmail del tutor', () => {
    build();
    component.openNewForm();
    component.form = {
      name: 'Rocky',
      breed: 'Golden Retriever',
      ageApprox: '3 años',
      size: 'Grande',
      weightKg: 28,
      temperament: 'Tranquilo',
      careNotes: 'Piel sensible en el lomo',
    };
    component.savePet();

    expect(component.pets.length).toBe(1);
    const stored = JSON.parse(localStorage.getItem('vb_pets') ?? '[]');
    expect(stored[0].name).toBe('Rocky');
    expect(stored[0].ownerEmail).toBe('tutor@paw.com');
  });

  it('no guarda si faltan campos obligatorios', () => {
    build();
    component.openNewForm();
    component.form = {
      name: 'Rocky',
      breed: '',
      ageApprox: '',
      size: '',
      weightKg: null,
      temperament: '',
      careNotes: '',
    };
    component.savePet();

    expect(component.formError).not.toBe('');
    expect(component.pets.length).toBe(0);
  });

  it('solo muestra las mascotas del tutor autenticado', () => {
    localStorage.setItem(
      'vb_pets',
      JSON.stringify([
        { id: 1, ownerEmail: 'tutor@paw.com', name: 'Rocky', breed: 'Beagle', ageApprox: '', size: 'Mediana', weightKg: 12, temperament: 'Enérgico', careNotes: '', createdAt: '' },
        { id: 2, ownerEmail: 'otro@paw.com', name: 'Luna', breed: 'Poodle', ageApprox: '', size: 'Pequeña', weightKg: 6, temperament: 'Ansioso', careNotes: '', createdAt: '' },
      ]),
    );
    build();
    expect(component.pets.length).toBe(1);
    expect(component.pets[0].name).toBe('Rocky');
  });
});
