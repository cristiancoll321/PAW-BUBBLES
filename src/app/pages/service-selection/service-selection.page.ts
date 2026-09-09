/**
 * ============================================================================
 *  PUNTO C — Pantalla "Selección de Servicio y Estación"
 * ============================================================================
 *
 *  Rol dentro del flujo de la app (PAW & BUBBLES — spa & estética canina):
 *
 *      Login / Registro  ──▶  [ ESTA PANTALLA ]  ──▶  Punto D (Horario)
 *
 *  Qué hace el usuario aquí:
 *    1. Elige una CATEGORÍA  ("Hidroterapia & Baños" | "Estética & Estilismo").
 *    2. Elige un SERVICIO dentro de esa categoría (define duración y precio).
 *    3. Elige una ESTACIÓN / PROFESIONAL disponible para ese servicio
 *       (tinas de hidroterapia o mesas de estética, con su groomer).
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
  waterOutline,
  sparklesOutline,
  happyOutline,
  bandageOutline,
  heartOutline,
  brushOutline,
  timeOutline,
  arrowForwardOutline,
  checkmarkCircle,
  checkmarkOutline,
  personOutline,
  star,
  calendarOutline,
  pawOutline
} from 'ionicons/icons';
// Haptics: vibración sutil en cada interacción. En navegador el plugin lanza
// excepción → por eso TODAS las llamadas van envueltas en try/catch y nunca
// bloquean el flujo (mismo patrón que login.page.ts y register.page.ts).
import { Haptics, ImpactStyle } from '@capacitor/haptics';

/** Las dos líneas de servicio del spa. Se usa como clave de filtrado. */
type Category = 'hidroterapia' | 'estetica';

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
 * Una estación física (tina / mesa) y el groomer asignado a ella.
 * Solo se pueden seleccionar las que tienen `status === 'disponible'`.
 */
interface Station {
  id: string;
  /** Etiqueta visible del puesto: "Tina 1", "Mesa 2"... */
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

  /** Categoría actualmente activa en el selector superior. Arranca en "hidroterapia". */
  activeCategory: Category = 'hidroterapia';

  /** Servicio elegido por el usuario. `null` = paso 1 aún sin completar. */
  selectedService: Service | null = null;

  /** Estación elegida. `null` = paso 2 aún sin completar. Se resetea al cambiar de servicio. */
  selectedStation: Station | null = null;

  // ---------------------------------------------------------------------------
  //  DATOS "DE NEGOCIO"  (hardcodeados hoy; futuros candidatos a venir de API)
  // ---------------------------------------------------------------------------

  /** Traducción Category → etiqueta visible. Evita repetir strings en el template. */
  readonly categoryLabels: Record<Category, string> = {
    hidroterapia: 'Hidroterapia & Baños',
    estetica: 'Estética & Estilismo'
  };

  /**
   * Catálogo completo de servicios (ambas categorías).
   * El template nunca itera este arreglo directo: usa el getter `filteredServices`,
   * que aplica el filtro por `activeCategory`.
   */
  readonly services: Service[] = [
    {
      id: 'bano-hidromasaje',
      name: 'Baño con Hidromasaje',
      description: 'Tina de hidroterapia con sales minerales, masaje circulatorio y secado suave.',
      durationMin: 45,
      price: '$55.000',
      category: 'hidroterapia',
      icon: 'water-outline'
    },
    {
      id: 'ozonoterapia',
      name: 'Ozonoterapia',
      description: 'Baño con agua ozonizada para piel sensible, dermatitis y control de olores.',
      durationMin: 40,
      price: '$65.000',
      category: 'hidroterapia',
      icon: 'sparkles-outline'
    },
    {
      id: 'bano-medicado',
      name: 'Baño Medicado',
      description: 'Champú dermatológico para alergias y hongos, con enjuague acondicionador.',
      durationMin: 35,
      price: '$48.000',
      category: 'hidroterapia',
      icon: 'bandage-outline'
    },
    {
      id: 'spa-relajante',
      name: 'Spa Relajante',
      description: 'Aromaterapia, masaje de patas y secado en camilla tibia para canes ansiosos.',
      durationMin: 50,
      price: '$60.000',
      category: 'hidroterapia',
      icon: 'heart-outline'
    },
    {
      id: 'corte-raza',
      name: 'Corte de Raza',
      description: 'Corte a tijera y máquina según el estándar de la raza, con perfilado final.',
      durationMin: 60,
      price: '$70.000',
      category: 'estetica',
      icon: 'cut-outline'
    },
    {
      id: 'deslanado',
      name: 'Deslanado / Stripping',
      description: 'Retiro de subpelo muerto en mantos dobles; reduce la muda en casa.',
      durationMin: 70,
      price: '$75.000',
      category: 'estetica',
      icon: 'brush-outline'
    },
    {
      id: 'higienico-full',
      name: 'Higiénico Full',
      description: 'Corte higiénico, corte de uñas, limpieza de oídos y glándulas.',
      durationMin: 30,
      price: '$35.000',
      category: 'estetica',
      icon: 'paw-outline'
    }
  ];

  /**
   * Estaciones y sus groomers.
   * Regla de emparejamiento: una estación aparece para un servicio solo si
   * comparten `category`. Las "ocupado" se muestran pero quedan deshabilitadas.
   */
  readonly stations: Station[] = [
    {
      id: 'tina-1',
      name: 'Tina 1',
      professional: 'Valentina Ríos',
      initials: 'VR',
      role: 'Hidroterapeuta Canina',
      category: 'hidroterapia',
      status: 'disponible',
      rating: 4.9
    },
    {
      id: 'tina-2',
      name: 'Tina 2',
      professional: 'Mateo Salas',
      initials: 'MS',
      role: 'Especialista en Piel',
      category: 'hidroterapia',
      status: 'disponible',
      rating: 4.8
    },
    {
      id: 'tina-3',
      name: 'Tina 3',
      professional: 'Andrés Kuan',
      initials: 'AK',
      role: 'Terapeuta de Ozono',
      category: 'hidroterapia',
      status: 'ocupado',
      rating: 4.7
    },
    {
      id: 'mesa-1',
      name: 'Mesa 1',
      professional: 'Camila Prieto',
      initials: 'CP',
      role: 'Groomer Master',
      category: 'estetica',
      status: 'disponible',
      rating: 5.0
    },
    {
      id: 'mesa-2',
      name: 'Mesa 2',
      professional: 'Daniel Ortiz',
      initials: 'DO',
      role: 'Estilista de Razas',
      category: 'estetica',
      status: 'ocupado',
      rating: 4.8
    },
    {
      id: 'mesa-3',
      name: 'Mesa 3',
      professional: 'Laura Méndez',
      initials: 'LM',
      role: 'Estilista Canina',
      category: 'estetica',
      status: 'disponible',
      rating: 4.9
    }
  ];

  constructor(private readonly router: Router) {
    // Registro global de los iconos usados en el template. `addIcons` recibe un
    // objeto {claveCamelCase: valor}; en el HTML se referencian en kebab-case
    // (p. ej. `cutOutline` aquí ↔ name="cut-outline" en el template).
    addIcons({
      cutOutline,
      waterOutline,
      sparklesOutline,
      happyOutline,
      bandageOutline,
      heartOutline,
      brushOutline,
      timeOutline,
      arrowForwardOutline,
      checkmarkCircle,
      checkmarkOutline,
      personOutline,
      star,
      calendarOutline,
      pawOutline
    });
  }

  /** Abre el perfil del tutor y la gestión de mascotas (Bonus 1). */
  goToProfile(): void {
    this.triggerHaptic();
    this.router.navigateByUrl('/profile');
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
    this.router.navigateByUrl('/schedule');
  }
}
