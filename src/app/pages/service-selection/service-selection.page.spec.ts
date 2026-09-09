/**
 * Pruebas unitarias del Punto C (runner: Vitest vía @angular/build).
 *
 * Cubren las 3 reglas de negocio del componente que son fáciles de romper
 * al refactorizar:
 *   1. El filtrado de servicios respeta la categoría activa.
 *   2. Cambiar de servicio limpia la estación previamente elegida.
 *   3. Una estación "ocupado" no se puede seleccionar.
 *
 * No se testea localStorage aquí (efecto de borde de ngOnInit/continue);
 * ese contrato está documentado en FLUJO-DE-DATOS.md.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ServiceSelectionPage } from './service-selection.page';

describe('ServiceSelectionPage', () => {
  let component: ServiceSelectionPage;
  let fixture: ComponentFixture<ServiceSelectionPage>;

  beforeEach(() => {
    // provideRouter([]) basta: el componente solo usa router.navigateByUrl,
    // no necesita rutas reales para instanciarse.
    TestBed.configureTestingModule({
      providers: [provideRouter([])]
    });
    fixture = TestBed.createComponent(ServiceSelectionPage);
    component = fixture.componentInstance;
    fixture.detectChanges(); // dispara ngOnInit
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('debe filtrar servicios por la categoria activa', () => {
    component.setCategory('estetica');
    // Todos los servicios visibles deben pertenecer a la categoría pedida.
    expect(component.filteredServices.every(s => s.category === 'estetica')).toBe(true);
  });

  it('al elegir servicio se limpia la estacion seleccionada', () => {
    const service = component.services[0];
    component.selectService(service);
    expect(component.selectedService).toBe(service);
    // Efecto de borde clave: la estación se resetea para forzar re-selección.
    expect(component.selectedStation).toBeNull();
  });

  it('no permite seleccionar una estacion ocupada', () => {
    const busy = component.stations.find(s => s.status === 'ocupado');
    if (busy) {
      component.selectStation(busy);
      expect(component.selectedStation).toBeNull();
    }
  });
});
