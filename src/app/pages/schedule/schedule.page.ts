/**
 * ============================================================================
 *  PUNTO D — Pantalla "Revisar Horario y Disponibilidad"
 * ============================================================================
 *
 *  Rol dentro del flujo de la app (PAW & BUBBLES):
 *
 *      Punto C (Selección de Servicio)  ──▶  [ ESTA PANTALLA ]  ──▶  Punto E (Agendados)
 *
 *  Qué hace el usuario aquí:
 *    1. Ve el RESUMEN de lo que eligió en el Punto C (servicio, profesional,
 *       duración, precio) — se lee de localStorage["vb_selected_service"].
 *    2. Elige una FECHA de los próximos días.
 *    3. Elige un BLOQUE de horario disponible.
 *    4. Pulsa "Confirmar cita" → se crea la reserva en
 *       localStorage["vb_appointments"], se muestra un Toast nativo
 *       confirmándolo y se navega al Punto E.
 *
 *  Origen y destino de los datos (ver también FLUJO-DE-DATOS.md):
 *
 *    localStorage["vb_current_user"]     ──lee──▶  saludo con el nombre
 *        (lo escribe Login/Registro)
 *
 *    localStorage["vb_selected_service"] ──lee──▶  resumen de la reserva
 *        (lo escribe el Punto C)
 *        Si no existe → no hay nada que agendar → se vuelve al Punto C.
 *
 *    localStorage["vb_appointments"]     ──escribe (append)──▶  ESTA PANTALLA
 *        - se agrega una cita nueva al confirmar
 *        - lo consume el Punto E para pintar la lista de "Activas"
 *
 *  Nota: hoy NO hay backend. El calendario de días/slots está hardcodeado
 *  en este componente. Cuando exista API, `days` vendrá de un servicio
 *  Angular inyectado (p. ej. `AvailabilityService`).
 * ============================================================================
 */

import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// Standalone components de Ionic: solo se importan los usados en el template
// (no se carga IonicModule entero). Mismo criterio que service-selection.page.ts.
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonChip,
  IonContent,
  IonIcon,
  IonLabel,
  IonNote,
  IonText
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  checkmarkCircle,
  checkmarkCircleOutline,
  closeCircleOutline,
  calendarOutline,
  timeOutline
} from 'ionicons/icons';
// Haptics: vibración sutil en cada interacción. En navegador el plugin lanza
// excepción → TODAS las llamadas van en try/catch (mismo patrón que el resto).
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Toast } from '@capacitor/toast';

/** Estado operativo de un bloque de horario. */
type SlotState = 'available' | 'occupied' | 'reserved';

/** Un día del selector superior con sus bloques de horario. */
interface ScheduleDay {
  id: number;
  label: string;
  dateNumber: number;
  slots: TimeSlot[];
}

/** Un bloque de horario concreto dentro de un día. */
interface TimeSlot {
  time: string;
  state: SlotState;
  guestName?: string;
}

/**
 * Resumen de lo elegido en el Punto C. Es la forma "aplanada" que escribe
 * service-selection.page.ts en localStorage["vb_selected_service"].
 */
interface SelectedService {
  serviceId: string;
  stationId: string;
  serviceName: string;
  durationMin: number;
  price: string;
  category: 'hidroterapia' | 'estetica';
  stationName: string;
  professional: string;
}

@Component({
  selector: 'app-schedule',
  templateUrl: './schedule.page.html',
  styleUrls: ['./schedule.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
    IonText,
    IonLabel,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonChip,
    IonNote
  ]
})
export class SchedulePage implements OnInit {
  // ---------------------------------------------------------------------------
  //  ESTADO DE LA VISTA
  // ---------------------------------------------------------------------------

  /** Nombre de pila del usuario para el saludo. Se rellena en ngOnInit. */
  userName = '';

  /** Resumen de la reserva que viene del Punto C. `null` = no hay nada que agendar. */
  selection: SelectedService | null = null;

  /** Índice del día activo dentro de `days`. */
  selectedDate = 0;

  /** Bloque de horario elegido. `null` = paso aún sin completar. */
  selectedSlot: TimeSlot | null = null;

  /** Mensaje de éxito tras confirmar (antes de navegar al Punto E). */
  confirmedAppointment: string | null = null;

  /** Traducción categoría → etiqueta visible (para el resumen). */
  private readonly categoryLabels: Record<SelectedService['category'], string> = {
    hidroterapia: 'Hidroterapia & Baños',
    estetica: 'Estética & Estilismo'
  };

  // ---------------------------------------------------------------------------
  //  DATOS "DE NEGOCIO"  (hardcodeados hoy; futuros candidatos a venir de API)
  // ---------------------------------------------------------------------------

  days: ScheduleDay[] = [
    {
      id: 0,
      label: 'Hoy',
      dateNumber: 29,
      slots: [
        { time: '09:00', state: 'available' },
        { time: '09:45', state: 'occupied' },
        { time: '10:30', state: 'reserved', guestName: 'Ana' },
        { time: '11:15', state: 'available' },
        { time: '12:00', state: 'occupied' },
        { time: '13:30', state: 'available' },
        { time: '15:00', state: 'reserved', guestName: 'Luis' },
        { time: '16:15', state: 'available' }
      ]
    },
    {
      id: 1,
      label: 'Mié',
      dateNumber: 30,
      slots: [
        { time: '09:00', state: 'reserved', guestName: 'Carla' },
        { time: '09:45', state: 'available' },
        { time: '10:30', state: 'available' },
        { time: '11:15', state: 'occupied' },
        { time: '12:00', state: 'available' },
        { time: '13:30', state: 'available' },
        { time: '15:00', state: 'occupied' },
        { time: '16:15', state: 'reserved', guestName: 'Marco' }
      ]
    },
    {
      id: 2,
      label: 'Jue',
      dateNumber: 31,
      slots: [
        { time: '09:00', state: 'available' },
        { time: '09:45', state: 'available' },
        { time: '10:30', state: 'occupied' },
        { time: '11:15', state: 'available' },
        { time: '12:00', state: 'reserved', guestName: 'Sofía' },
        { time: '13:30', state: 'available' },
        { time: '15:00', state: 'occupied' },
        { time: '16:15', state: 'available' }
      ]
    },
    {
      id: 3,
      label: 'Vie',
      dateNumber: 1,
      slots: [
        { time: '09:00', state: 'available' },
        { time: '09:45', state: 'occupied' },
        { time: '10:30', state: 'available' },
        { time: '11:15', state: 'reserved', guestName: 'Diego' },
        { time: '12:00', state: 'available' },
        { time: '13:30', state: 'occupied' },
        { time: '15:00', state: 'available' },
        { time: '16:15', state: 'available' }
      ]
    },
    {
      id: 4,
      label: 'Sáb',
      dateNumber: 2,
      slots: [
        { time: '09:00', state: 'occupied' },
        { time: '09:45', state: 'available' },
        { time: '10:30', state: 'available' },
        { time: '11:15', state: 'reserved', guestName: 'Lucía' },
        { time: '12:00', state: 'available' },
        { time: '13:30', state: 'available' },
        { time: '15:00', state: 'occupied' },
        { time: '16:15', state: 'available' }
      ]
    }
  ];

  constructor(private readonly router: Router) {
    // Registro global de los iconos usados en el template (kebab-case en el HTML).
    addIcons({
      arrowBackOutline,
      checkmarkCircle,
      checkmarkCircleOutline,
      closeCircleOutline,
      calendarOutline,
      timeOutline
    });
  }

  /**
   * Ciclo de vida: se ejecuta una vez al montar la pantalla.
   * Aquí ocurre TODA la LECTURA de datos externos (localStorage):
   *   1. `vb_current_user`     → nombre para el saludo.
   *   2. `vb_selected_service` → resumen de la reserva. Si NO existe, el usuario
   *      llegó aquí sin pasar por el Punto C → se le devuelve a elegir servicio.
   * Ambos bloques van en try/catch (JSON corrupto / localStorage no disponible).
   */
  ngOnInit(): void {
    // --- 1. Nombre del usuario para el saludo -------------------------------
    try {
      const raw = localStorage.getItem('vb_current_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        this.userName = (parsed?.name || '').split(' ')[0] || '';
      }
    } catch { /* sin saludo */ }

    // --- 2. Resumen de lo elegido en el Punto C ---------------------------
    try {
      const raw = localStorage.getItem('vb_selected_service');
      if (raw) {
        this.selection = JSON.parse(raw) as SelectedService;
      }
    } catch { /* selección inválida → se trata como inexistente */ }

    // Sin selección válida no hay nada que agendar: volver al Punto C.
    if (!this.selection?.serviceName) {
      this.router.navigateByUrl('/service-selection');
      return;
    }

    // Preselecciona el primer bloque disponible del día activo (comodidad).
    this.selectedSlot =
      this.getSelectedDay().slots.find((slot) => slot.state === 'available') ?? null;
  }

  // ---------------------------------------------------------------------------
  //  GETTERS DERIVADOS
  // ---------------------------------------------------------------------------

  /** Día actualmente seleccionado en el selector superior. */
  getSelectedDay(): ScheduleDay {
    return this.days[this.selectedDate];
  }

  /** Etiqueta legible de la categoría del servicio elegido (para el resumen). */
  get categoryLabel(): string {
    return this.selection ? this.categoryLabels[this.selection.category] : '';
  }

  // ---------------------------------------------------------------------------
  //  ACCIONES DEL USUARIO
  // ---------------------------------------------------------------------------

  /** Vibración sutil aislada en su propio método. Nunca propaga errores. */
  async triggerHaptic(): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch { /* no-op en web */ }
  }

  /** Vibración más intensa para confirmar la reserva. */
  async triggerConfirmationHaptic(): Promise<void> {
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch { /* no-op en web */ }
  }

  /**
   * Muestra un toast con el texto indicado, usando la API de Capacitor.
   * Requiere: Toast.show({ text, duration?, position? }).
   */
  async showToast(
    text: string,
    duration: 'short' | 'long' = 'short',
    position: 'top' | 'center' | 'bottom' = 'bottom'
  ): Promise<void> {
    try {
      await Toast.show({ text, duration, position });
    } catch { /* no-op en web */ }
  }

  /**
   * Cambia el día activo. Reinicia el bloque elegido (los slots de otro día
   * no son los mismos) y limpia el mensaje de confirmación.
   */
  selectDate(dayIndex: number): void {
    if (this.selectedDate === dayIndex) {
      return;
    }
    this.selectedDate = dayIndex;
    this.selectedSlot =
      this.getSelectedDay().slots.find((slot) => slot.state === 'available') ?? null;
    this.confirmedAppointment = null;
    this.triggerHaptic();
  }

  /**
   * Registra el bloque de horario elegido. Ignora los que no están
   * `available` (el botón ya está `disabled` en el template; esto es la
   * segunda barrera).
   */
  selectSlot(slot: TimeSlot): void {
    if (slot.state !== 'available' || this.selectedSlot?.time === slot.time) {
      return;
    }
    this.selectedSlot = slot;
    this.confirmedAppointment = null;
    this.triggerHaptic();
  }

  /**
   * Paso final: confirmar la cita y avanzar al Punto E.
   *
   * Aquí ocurre la ÚNICA ESCRITURA de esta pantalla: se hace `push` de una
   * cita nueva en localStorage["vb_appointments"] con la forma exacta que el
   * Punto E necesita para pintarla en "Activas" (sin volver a mirar catálogos).
   *
   * Guarda de seguridad: si falta el bloque de horario o el resumen del
   * Punto C, no hace nada (el botón ya está deshabilitado en ese estado).
   */
  async confirmSelection(): Promise<void> {
    if (!this.selectedSlot || !this.selection) {
      return;
    }

    await this.triggerConfirmationHaptic();
    await this.showToast('Reserva confirmada', 'long', 'bottom');

    const day = this.getSelectedDay();
    const confirmationMessage =
      `Cita confirmada para ${day.label} ${day.dateNumber} a las ${this.selectedSlot.time}`;
    this.confirmedAppointment = confirmationMessage;

    try {
      const raw = localStorage.getItem('vb_appointments');
      const list: unknown[] = raw ? JSON.parse(raw) : [];
      list.unshift({
        // --- ids para poder resolver contra catálogos si hiciera falta ---
        id: Date.now(),
        serviceId: this.selection.serviceId,
        stationId: this.selection.stationId,
        // --- datos ya "aplanados" para el Punto E ---
        service: this.selection.serviceName,
        professional: `${this.selection.professional} · ${this.categoryLabel}`,
        date: `${day.label} ${day.dateNumber}`,
        time: this.selectedSlot.time,
        duration: `${this.selection.durationMin} min`,
        price: this.selection.price,
        status: 'Confirmado',
        accent: 'confirmed',
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('vb_appointments', JSON.stringify(list));
    } catch { /* si no se pudo persistir, igualmente se navega */ }

    try {
      await Toast.show({
        text: confirmationMessage,
        duration: 'short',
        position: 'bottom'
      });
    } catch { /* no-op si el toast falla */ }

    // Navegación al Punto E (Servicios Agendados e Historial).
    this.router.navigateByUrl('/appointments');
  }

  /** Volver al Punto C para cambiar el servicio o la estación. */
  goBack(): void {
    this.router.navigateByUrl('/service-selection');
  }
}
