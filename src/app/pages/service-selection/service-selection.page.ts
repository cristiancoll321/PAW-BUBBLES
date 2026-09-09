/**
 * ============================================================================
 *  PUNTO C — Pantalla "Selección de Servicio y Estación"
 * ============================================================================
 *
 *  Rol dentro del flujo de la app (Velvet & Blade):
 *
 *      Login / Registro  ──▶  [ ESTA PANTALLA ]  ──▶  Punto D (Horario)
 *
 *  Qué hace el usuario aquí:
 *    1. Elige una CATEGORÍA  ("Barbería de Autor" | "Spa de Uñas").
 *    2. Elige un SERVICIO dentro de esa categoría (define duración y precio).
 *    3. Elige una ESTACIÓN / PROFESIONAL disponible para ese servicio.
 *    4. Pulsa "Continuar a Horario" → se persiste la selección y se navega
 *       a /schedule (Punto D).
 *
 *  Origen y destino de los datos (ver también FLUJO-DE-DATOS.md):
 *
 *    localStorage["vb_current_user"]     ──lee──▶  saludo con el nombre
 *        (lo escribe Login/Registro)
 *
 *    localStorage["vb_selected_service"] ◀─escribe/lee─▶  ESTA PANTALLA
 *        - se escribe al pulsar "Continuar a Horario"
 *        - se vuelve a leer en ngOnInit() para restaurar la selección
 *          si el usuario regresa desde el Punto D
 *        - lo consumirá el Punto D para saber qué se está agendando
 *
 *  Nota: hoy NO hay backend. Todo el "estado de negocio" (catálogo de
 *  servicios y estaciones) está hardcodeado en este componente como
 *  arreglos `readonly`. Cuando exista API, `services` y `stations`
 *  pasarán a venir de un servicio Angular inyectado.
 * ============================================================================
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
// Solo se importan los componentes de Ionic realmente usados en el template
// (standalone components → no se carga todo IonicModule).
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cutOutline,
  colorPaletteOutline,
  waterOutline,
  pawOutline,
  earOutline,
  medkitOutline,
  sparklesOutline,
  happyOutline,
  flameOutline,
  handLeftOutline,
  footstepsOutline,
  brushOutline,
  timeOutline,
  arrowForwardOutline,
  checkmarkCircle,
  checkmarkOutline,
  personOutline,
  star,
  calendarOutline
} from 'ionicons/icons';
// Haptics: vibración sutil en cada interacción. En navegador el plugin lanza
// excepción → por eso TODAS las llamadas van envueltas en try/catch y nunca
// bloquean el flujo (mismo patrón que login.page.ts y register.page.ts).
import { Haptics, ImpactStyle } from '@capacitor/haptics';

/** Las dos líneas de negocio del local. Se usa como clave de filtrado. */
type Category = 'grooming' | 'terapeutico' | 'integral';

/** Estado operativo de una estación en este momento. */
type StationStatus = 'disponible' | 'ocupado';

/**
 * Un servicio del catálogo.
 * `durationMin` y `price` son los datos que viajan al Punto D dentro de
 * `vb_selected_service` para calcular slots de horario y el total a cobrar.
 */
interface Service {
  /** Identificador estable; es lo que se guarda en localStorage, no el nombre. */
  id: string;
  name: string;
  description: string;
  /** Duración en minutos — la usa el Punto D para dimensionar el bloque de agenda. */
  durationMin: number;
  /** Precio ya formateado como texto ("$45.000"). No es número: es solo display. */
  price: string;
  /** Categoría a la que pertenece; enlaza servicio ↔ estaciones compatibles. */
  category: Category;
  /** Nombre del icono de ionicons (debe estar registrado en addIcons más abajo). */
  icon: string;
}

/**
 * Una estación física (sillón / mesa) y el profesional asignado a ella.
 * Solo se pueden seleccionar las que tienen `status === 'disponible'`.
 */
interface Station {
  id: string;
  /** Etiqueta visible del puesto: "Sillón 1", "Mesa 2"... */
  name: string;
  professional: string;
  /** Iniciales para el avatar circular cuando no hay foto. */
  initials: string;
  role: string;
  /** Debe coincidir con la categoría del servicio elegido para aparecer en la lista. */
  category: Category;
  status: StationStatus;
  /** Valoración media (0–5); solo informativo en la tarjeta. */
  rating: number;
}

@Component({
  selector: 'app-service-selection',
  templateUrl: './service-selection.page.html',
  styleUrls: ['./service-selection.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon]
})
export class ServiceSelectionPage implements OnInit {
  // ---------------------------------------------------------------------------
  //  ESTADO DE LA VISTA  (todo lo que el template lee/escribe)
  // ---------------------------------------------------------------------------

  /** Nombre de pila del usuario para el saludo. Se rellena en ngOnInit desde localStorage. */
  userName = '';

  /** Categoría actualmente activa en el selector superior. Arranca en grooming. */
  activeCategory: Category = 'grooming';

  /** Servicio elegido por el usuario. `null` = paso 1 aún sin completar. */
  selectedService: Service | null = null;

  /** Estación elegida. `null` = paso 2 aún sin completar. Se resetea al cambiar de servicio. */
  selectedStation: Station | null = null;

  // ---------------------------------------------------------------------------
  //  DATOS "DE NEGOCIO"  (hardcodeados hoy; futuros candidatos a venir de API)
  // ---------------------------------------------------------------------------

  /** Traducción Category → etiqueta visible. Evita repetir strings en el template. */
  readonly categoryLabels: Record<Category, string> = {
    grooming: 'Grooming & Estilismo',
    terapeutico: 'Spa Terapéutico',
    integral: 'Cuidado Integral'
  };

  /**
   * Catálogo completo de servicios (ambas categorías).
   * El template nunca itera este arreglo directo: usa el getter `filteredServices`,
   * que aplica el filtro por `activeCategory`.
   */
  readonly services: Service[] = [
    {
      id: 'bano-hipoalergenico',
      name: 'Baño hipoalergénico',
      description: 'Limpieza suave con productos dermatológicamente amigables para piel sensible.',
      durationMin: 60,
      price: '$55.000',
      category: 'grooming',
      icon: 'cut-outline'
    },
    {
      id: 'corte-raza',
      name: 'Corte según estándar de raza',
      description: 'Estilismo personalizado que respeta el manto, la silueta y las necesidades de cada raza.',
      durationMin: 90,
      price: '$85.000',
      category: 'grooming',
      icon: 'sparkles-outline'
    },
    {
      id: 'deslanado',
      name: 'Deslanado',
      description: 'Retiro cuidadoso del subpelo y cepillado profundo para un manto más sano.',
      durationMin: 75,
      price: '$70.000',
      category: 'grooming',
      icon: 'brush-outline'
    },
    {
      id: 'tina-ozonoterapia',
      name: 'Tina de ozonoterapia',
      description: 'Baño terapéutico con ozono para relajar, limpiar y revitalizar la piel.',
      durationMin: 50,
      price: '$65.000',
      category: 'terapeutico',
      icon: 'sparkles-outline'
    },
    {
      id: 'hidromasaje',
      name: 'Hidromasaje relajante',
      description: 'Sesión de agua tibia para favorecer la relajación muscular y el bienestar.',
      durationMin: 45,
      price: '$60.000',
      category: 'terapeutico',
      icon: 'water-outline'
    },
    {
      id: 'mascarilla-hidratacion',
      name: 'Mascarilla de hidratación dérmica',
      description: 'Tratamiento calmante para hidratar profundamente y cuidar la barrera de la piel.',
      durationMin: 40,
      price: '$48.000',
      category: 'terapeutico',
      icon: 'happy-outline'
    },
    {
      id: 'limado-unas',
      name: 'Limado de uñas',
      description: 'Corte y limado cuidadoso para mantener las uñas cómodas y saludables.',
      durationMin: 20,
      price: '$18.000',
      category: 'integral',
      icon: 'paw-outline'
    },
    {
      id: 'limpieza-oidos',
      name: 'Limpieza del canal ótico',
      description: 'Higiene externa delicada para prevenir acumulación y molestias.',
      durationMin: 20,
      price: '$20.000',
      category: 'integral',
      icon: 'ear-outline'
    },
    {
      id: 'profilaxis-superficial',
      name: 'Profilaxis preventiva superficial',
      description: 'Cuidado preventivo de la higiene oral sin sustituir la valoración veterinaria.',
      durationMin: 25,
      price: '$25.000',
      category: 'integral',
      icon: 'medkit-outline'
    }
  ];

  /**
   * Estaciones y sus profesionales.
   * Regla de emparejamiento: una estación aparece para un servicio solo si
   * comparten `category`. Las "ocupado" se muestran pero quedan deshabilitadas.
   */
  readonly stations: Station[] = [
    {
      id: 'sillon-1',
      name: 'Sillón 1',
      professional: 'Mateo Rivas',
      initials: 'MR',
      role: 'Especialista en Grooming',
      category: 'grooming',
      status: 'disponible',
      rating: 4.9
    },
    {
      id: 'sillon-2',
      name: 'Sillón 2',
      professional: 'Julián Ossa',
      initials: 'JO',
      role: 'Estilista de raza',
      category: 'grooming',
      status: 'disponible',
      rating: 4.8
    },
    {
      id: 'sillon-3',
      name: 'Sillón 3',
      professional: 'Andrés Kem',
      initials: 'AK',
      role: 'Baño y deslanado',
      category: 'grooming',
      status: 'ocupado',
      rating: 4.7
    },
    {
      id: 'cabina-1',
      name: 'Cabina húmeda 1',
      professional: 'Valentina Ruiz',
      initials: 'VR',
      role: 'Hidroterapia canina',
      category: 'terapeutico',
      status: 'disponible',
      rating: 5.0
    },
    {
      id: 'cabina-2',
      name: 'Cabina húmeda 2',
      professional: 'Camila Soto',
      initials: 'CS',
      role: 'Spa terapéutico',
      category: 'terapeutico',
      status: 'ocupado',
      rating: 4.8
    },
    {
      id: 'estacion-1',
      name: 'Estación de cuidado 1',
      professional: 'Daniela Franco',
      initials: 'DF',
      role: 'Higiene integral',
      category: 'integral',
      status: 'disponible',
      rating: 4.9
    }
  ];

  constructor(public readonly router: Router) {
    // Registro global de los iconos usados en el template. `addIcons` recibe un
    // objeto {claveCamelCase: valor}; en el HTML se referencian en kebab-case
    // (p. ej. `cutOutline` aquí ↔ name="cut-outline" en el template).
    addIcons({
      cutOutline,
      colorPaletteOutline,
      waterOutline,
      pawOutline,
      earOutline,
      medkitOutline,
      sparklesOutline,
      happyOutline,
      flameOutline,
      handLeftOutline,
      footstepsOutline,
      brushOutline,
      timeOutline,
      arrowForwardOutline,
      checkmarkCircle,
      checkmarkOutline,
      personOutline,
      star,
      calendarOutline
    });
  }

  /**
   * Ciclo de vida: se ejecuta una vez al montar la pantalla.
   * Aquí ocurre TODA la LECTURA de datos externos (localStorage):
   *   1. `vb_current_user`     → nombre para el saludo.
   *   2. `vb_selected_service` → si existe, rehidrata la selección previa
   *      (caso: el usuario fue al Punto D y volvió atrás).
   * Ambos bloques van en try/catch porque el JSON puede estar corrupto o
   * localStorage puede no estar disponible (modo incógnito, etc.).
   */
  ngOnInit(): void {
    // --- 1. Nombre del usuario para el saludo -------------------------------
    try {
      const raw = localStorage.getItem('vb_current_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        // Solo el primer token del nombre completo ("Ana María López" → "Ana").
        this.userName = (parsed?.name || '').split(' ')[0] || '';
      }
    } catch { /* localStorage no disponible o JSON inválido → sin saludo */ }

    // --- 2. Restaurar una selección previa si el usuario regresa -----------
    try {
      const raw = localStorage.getItem('vb_selected_service');
      if (raw) {
        const saved = JSON.parse(raw);
        // Se busca por id (no se confía en el objeto guardado: puede estar
        // desactualizado respecto al catálogo actual).
        const svc = this.services.find(s => s.id === saved?.serviceId);
        const st = this.stations.find(x => x.id === saved?.stationId);
        if (svc) {
          this.selectedService = svc;
          this.activeCategory = svc.category; // deja la vista en la categoría correcta
        }
        // La estación solo se rehidrata si SIGUE disponible (pudo ocuparse mientras tanto).
        if (st && st.status === 'disponible') {
          this.selectedStation = st;
        }
      }
    } catch { /* sin selección previa válida → se empieza desde cero */ }
  }

  // ---------------------------------------------------------------------------
  //  GETTERS DERIVADOS  (el template los usa; se recalculan en cada CD)
  // ---------------------------------------------------------------------------

  /** Servicios visibles = catálogo filtrado por la categoría activa. */
  get filteredServices(): Service[] {
    return this.services.filter(s => s.category === this.activeCategory);
  }

  /**
   * Estaciones visibles. Se emparejan con la categoría del SERVICIO elegido;
   * si aún no hay servicio, se usa la categoría activa como respaldo.
   */
  get filteredStations(): Station[] {
    const cat = this.selectedService?.category ?? this.activeCategory;
    return this.stations.filter(s => s.category === cat);
  }

  /** Nº de estaciones libres dentro de las visibles (se muestra en el encabezado del bloque). */
  get availableStationsCount(): number {
    return this.filteredStations.filter(s => s.status === 'disponible').length;
  }

  // ---------------------------------------------------------------------------
  //  ACCIONES DEL USUARIO  (handlers del template)
  // ---------------------------------------------------------------------------

  /** Traduce una Category a su etiqueta legible. Usado en los chips del template. */
  categoryLabel(cat: Category): string {
    return this.categoryLabels[cat];
  }

  /**
   * Dispara la vibración sutil. Aislada en su propio método porque se llama
   * desde casi todos los handlers. Nunca propaga errores (navegador sin plugin).
   */
  async triggerHaptic(): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch { /* no-op en web */ }
  }

  /**
   * Cambia la categoría activa (selector superior).
   * Ojo: NO borra el servicio ya elegido a propósito — el usuario puede estar
   * solo "ojeando" la otra categoría. El servicio se limpia únicamente cuando
   * elige otro servicio (ver `selectService`).
   */
  setCategory(cat: Category): void {
    if (this.activeCategory === cat) {
      return; // sin cambios → no vibrar ni re-renderizar
    }
    this.activeCategory = cat;
    this.triggerHaptic();
  }

  /**
   * Registra el servicio elegido (paso 1 → hecho).
   * Efecto colateral importante: RESETEA `selectedStation`, porque la estación
   * anterior podría pertenecer a otra categoría / no ser válida para el nuevo
   * servicio. Además sincroniza la categoría activa con la del servicio.
   */
  selectService(service: Service): void {
    if (this.selectedService?.id === service.id) {
      return; // ya estaba elegido
    }
    this.selectedService = service;
    this.selectedStation = null;            // fuerza a re-elegir estación
    this.activeCategory = service.category; // mantiene la vista coherente
    this.triggerHaptic();
  }

  /**
   * Registra la estación elegida (paso 2 → hecho).
   * Ignora el clic si la estación está ocupada (el botón ya está `disabled`
   * en el template, esto es una segunda barrera) o si ya estaba seleccionada.
   */
  selectStation(station: Station): void {
    if (station.status === 'ocupado' || this.selectedStation?.id === station.id) {
      return;
    }
    this.selectedStation = station;
    this.triggerHaptic();
  }

  /**
   * Paso 3: confirmar y avanzar al Punto D.
   *
   * Aquí ocurre la ÚNICA ESCRITURA de datos de esta pantalla:
   * se serializa la selección en `localStorage["vb_selected_service"]` con la
   * forma mínima que el Punto D necesita (ids + datos ya "aplanados" para no
   * obligar al Punto D a volver a buscar en el catálogo).
   *
   * Guarda de seguridad: si falta servicio o estación, no hace nada (el botón
   * ya está deshabilitado en ese estado, pero se valida igual).
   */
  continue(): void {
    if (!this.selectedService || !this.selectedStation) {
      return;
    }
    this.triggerHaptic();
    try {
      localStorage.setItem('vb_selected_service', JSON.stringify({
        // --- claves para volver a resolver contra el catálogo si hiciera falta ---
        serviceId: this.selectedService.id,
        stationId: this.selectedStation.id,
        // --- datos ya listos para mostrar/usar en el Punto D ---
        serviceName: this.selectedService.name,
        durationMin: this.selectedService.durationMin, // dimensiona el bloque de agenda
        price: this.selectedService.price,
        category: this.selectedService.category,
        stationName: this.selectedStation.name,
        professional: this.selectedStation.professional
      }));
    } catch { /* si no se pudo persistir, igualmente se navega */ }

    // Navegación al Punto D (Revisar Horario y Disponibilidad).
    // HOY /schedule es un placeholder en app.routes.ts que redirige de vuelta
    // a esta pantalla; al integrar la rama desarrollo-cristian apuntará a la
    // pantalla real de horario.
    this.router.navigateByUrl('/schedule');
  }
}
