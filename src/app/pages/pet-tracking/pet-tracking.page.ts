/**
 * ============================================================================
 *  BONUS 2 — "Historial y Seguimiento en Vivo del Canino"
 * ============================================================================
 *
 *  Rol dentro del flujo de la app (PAW BUBBLES — spa canino):
 *
 *      Perfil (Bonus 1)  ──"Ver seguimiento en vivo"──▶  [ ESTA PANTALLA ]
 *
 *  Qué ve / hace el tutor aquí:
 *    1. Panel de trazabilidad con las 4 fases del tratamiento y en cuál está
 *       su mascota AHORA:
 *         1) En Recepción      — Espera y pesaje inicial
 *         2) En Hidroterapia   — Tina y ozonoterapia
 *         3) En Estilismo      — Secado y corte de raza
 *         4) Listo para Entrega — En zona lounge
 *    2. Histórico de visitas previas: fecha de visita, servicio tomado y
 *       valor cancelado.
 *
 *  Origen y destino de los datos (ver también FLUJO-DE-DATOS.md):
 *
 *    localStorage["vb_tracking_pet"]  ──lee──▶  id de la mascota a mostrar
 *        (lo escribe el Perfil justo antes de navegar; el router NO transporta
 *         estado, esta pantalla lo relee en ngOnInit).
 *
 *    localStorage["vb_pets"]  ──lee──▶  ficha de la mascota (nombre, raza...).
 *        Si no se encuentra → redirige a /profile.
 *
 *    localStorage["vb_pet_tracking"]  ◀─escribe/lee─▶  ESTA PANTALLA
 *        - objeto { [petId]: TrackingRecord } con la fase actual + histórico.
 *        - la primera vez que se abre una mascota se SIEMBRA un histórico de
 *          demo (no hay backend ni lado de especialista en este alcance).
 *
 *  Simulación del lado del especialista: como la app no tiene todavía el
 *  perfil "especialista", los controles "Avanzar fase" / "Reiniciar" /
 *  "Finalizar y archivar" permiten mover la trazabilidad a mano para
 *  demostrar el seguimiento en vivo.
 * ============================================================================
 */

import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  arrowBackOutline,
  arrowForwardOutline,
  checkmarkOutline,
  closeOutline,
  cutOutline,
  happyOutline,
  pawOutline,
  refreshOutline,
  timeOutline,
  waterOutline,
  archiveOutline,
  calendarOutline,
} from 'ionicons/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Toast } from '@capacitor/toast';
import type { Pet } from '../profile/profile.page';

/** Una visita ya completada del histórico. */
export interface CompletedVisit {
  id: number;
  /** Fecha de la visita, ya formateada para mostrar ("12 ago 2026"). */
  date: string;
  /** Servicio tomado. */
  service: string;
  /** Valor cancelado, ya formateado ("$85.000"). */
  price: string;
}

/** Registro de trazabilidad de una mascota dentro de `vb_pet_tracking`. */
export interface TrackingRecord {
  /** Fase actual: -1 = no está en la sede; 0..3 = índice dentro de `phases`. */
  currentPhase: number;
  /** ISO timestamp de la última actualización de fase (para el "en vivo"). */
  updatedAt: string;
  history: CompletedVisit[];
}

interface Phase {
  key: string;
  title: string;
  detail: string;
  icon: string;
}

const TRACKING_KEY = 'vb_pet_tracking';

@Component({
  selector: 'app-pet-tracking',
  templateUrl: './pet-tracking.page.html',
  styleUrls: ['./pet-tracking.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon],
})
export class PetTrackingPage implements OnInit {
  // ---------------------------------------------------------------------------
  //  ESTADO DE LA VISTA
  // ---------------------------------------------------------------------------

  /** Mascota resuelta desde `vb_tracking_pet` + `vb_pets`. */
  pet: Pet | null = null;

  /** Registro de trazabilidad en memoria (espejo de `vb_pet_tracking[petId]`). */
  record: TrackingRecord = {
    currentPhase: -1,
    updatedAt: new Date().toISOString(),
    history: [],
  };

  /** true → el mini-formulario para añadir una visita al histórico está abierto. */
  visitFormOpen = false;
  visitForm = { date: '', service: '', price: '' };
  visitError = '';

  /** Definición fija de las 4 fases del tratamiento (Bonus 2). */
  readonly phases: Phase[] = [
    { key: 'recepcion', title: 'En Recepción', detail: 'Espera y pesaje inicial', icon: 'time-outline' },
    { key: 'hidroterapia', title: 'En Hidroterapia', detail: 'Tina y ozonoterapia', icon: 'water-outline' },
    { key: 'estilismo', title: 'En Estilismo', detail: 'Secado y corte de raza', icon: 'cut-outline' },
    { key: 'entrega', title: 'Listo para Entrega', detail: 'En zona lounge', icon: 'happy-outline' },
  ];

  constructor(private readonly router: Router) {
    addIcons({
      addOutline,
      arrowBackOutline,
      arrowForwardOutline,
      checkmarkOutline,
      closeOutline,
      cutOutline,
      happyOutline,
      pawOutline,
      refreshOutline,
      timeOutline,
      waterOutline,
      archiveOutline,
      calendarOutline,
    });
  }

  /**
   * Ciclo de vida: resuelve la mascota y su registro de trazabilidad.
   *   1. `vb_tracking_pet` → id; si falta → /profile.
   *   2. `vb_pets`         → ficha; si no está → /profile.
   *   3. `vb_pet_tracking` → registro; si no existe → se siembra demo.
   */
  ngOnInit(): void {
    let petId: number | null = null;
    try {
      const raw = localStorage.getItem('vb_tracking_pet');
      if (raw) {
        petId = Number(raw);
      }
    } catch {
      /* sin id */
    }

    if (petId === null || Number.isNaN(petId)) {
      this.router.navigateByUrl('/profile');
      return;
    }

    try {
      const raw = localStorage.getItem('vb_pets');
      const all = raw ? JSON.parse(raw) : [];
      this.pet = Array.isArray(all)
        ? all.find((p: Pet) => p && p.id === petId) ?? null
        : null;
    } catch {
      this.pet = null;
    }

    if (!this.pet) {
      this.router.navigateByUrl('/profile');
      return;
    }

    this.record = this.readRecord(petId);
  }

  // ---------------------------------------------------------------------------
  //  LECTURA / ESCRITURA DE localStorage["vb_pet_tracking"]
  // ---------------------------------------------------------------------------

  /** Lee (o siembra) el registro de trazabilidad de una mascota. */
  private readRecord(petId: number): TrackingRecord {
    try {
      const raw = localStorage.getItem(TRACKING_KEY);
      const map = raw ? JSON.parse(raw) : {};
      const found = map?.[petId];
      if (found && Array.isArray(found.history)) {
        return {
          currentPhase:
            typeof found.currentPhase === 'number' ? found.currentPhase : -1,
          updatedAt: found.updatedAt || new Date().toISOString(),
          history: found.history,
        };
      }
    } catch {
      /* map corrupto → se siembra abajo */
    }

    const seeded: TrackingRecord = {
      currentPhase: -1,
      updatedAt: new Date().toISOString(),
      history: this.seedHistory(),
    };
    this.persist(petId, seeded);
    return seeded;
  }

  /**
   * Histórico de demo (no hay backend). Dos visitas previas típicas de un
   * spa canino: hidroterapia + estilismo.
   */
  private seedHistory(): CompletedVisit[] {
    return [
      {
        id: 2,
        date: '12 ago 2026',
        service: 'Hidroterapia + Ozonoterapia',
        price: '$85.000',
      },
      {
        id: 1,
        date: '28 jul 2026',
        service: 'Baño medicado y corte de raza',
        price: '$70.000',
      },
    ];
  }

  /** Guarda el registro de una mascota dentro del mapa global. */
  private persist(petId: number, rec: TrackingRecord): void {
    try {
      const raw = localStorage.getItem(TRACKING_KEY);
      const map = raw ? JSON.parse(raw) || {} : {};
      map[petId] = rec;
      localStorage.setItem(TRACKING_KEY, JSON.stringify(map));
    } catch {
      /* si no se pudo persistir, la vista ya quedó actualizada en memoria */
    }
  }

  /** Persiste el `record` actual (cuando hay mascota resuelta). */
  private save(): void {
    if (this.pet) {
      this.persist(this.pet.id, this.record);
    }
  }

  // ---------------------------------------------------------------------------
  //  ACCIONES DEL USUARIO
  // ---------------------------------------------------------------------------

  async triggerHaptic(): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      /* no-op en web */
    }
  }

  private async toast(text: string): Promise<void> {
    try {
      await Toast.show({ text, duration: 'short', position: 'bottom' });
    } catch {
      /* no-op si el toast falla */
    }
  }

  goBack(): void {
    this.triggerHaptic();
    this.router.navigateByUrl('/profile');
  }

  // ---- estado derivado usado por el template ----

  get inFacility(): boolean {
    return this.record.currentPhase >= 0;
  }

  get isReady(): boolean {
    return this.record.currentPhase >= this.phases.length - 1;
  }

  get currentPhaseTitle(): string {
    const p = this.phases[this.record.currentPhase];
    return p ? p.title : 'Fuera de la sede';
  }

  /** 'done' | 'active' | 'pending' para pintar cada nodo del panel. */
  phaseState(index: number): 'done' | 'active' | 'pending' {
    if (index < this.record.currentPhase) {
      return 'done';
    }
    if (index === this.record.currentPhase) {
      return 'active';
    }
    return 'pending';
  }

  /** Etiqueta relativa "hace X min" a partir de `updatedAt`. */
  get lastUpdateLabel(): string {
    const then = new Date(this.record.updatedAt).getTime();
    if (Number.isNaN(then)) {
      return '';
    }
    const diffMin = Math.max(0, Math.round((Date.now() - then) / 60000));
    if (diffMin < 1) {
      return 'hace instantes';
    }
    if (diffMin < 60) {
      return `hace ${diffMin} min`;
    }
    const h = Math.round(diffMin / 60);
    return `hace ${h} h`;
  }

  /** Marca la entrada del canino a la sede (fase 1). */
  checkIn(): void {
    this.triggerHaptic();
    this.record.currentPhase = 0;
    this.record.updatedAt = new Date().toISOString();
    this.save();
    this.toast(`${this.pet?.name ?? 'Tu mascota'} ingresó a Recepción`);
  }

  /** Avanza a la siguiente fase (tope en "Listo para Entrega"). */
  advancePhase(): void {
    if (this.record.currentPhase >= this.phases.length - 1) {
      return;
    }
    this.triggerHaptic();
    this.record.currentPhase += 1;
    this.record.updatedAt = new Date().toISOString();
    this.save();
    this.toast(`Ahora: ${this.currentPhaseTitle}`);
  }

  /** Vuelve la trazabilidad a "Recepción". */
  resetPhase(): void {
    this.triggerHaptic();
    this.record.currentPhase = 0;
    this.record.updatedAt = new Date().toISOString();
    this.save();
  }

  /**
   * Cierra la visita en curso: la agrega al histórico y saca al canino de la
   * sede (currentPhase = -1). El servicio/valor se piden en el mini-formulario.
   */
  openArchiveForm(): void {
    this.triggerHaptic();
    const today = new Date();
    this.visitForm = {
      date: this.formatDate(today),
      service: '',
      price: '',
    };
    this.visitError = '';
    this.visitFormOpen = true;
  }

  closeVisitForm(): void {
    this.triggerHaptic();
    this.visitFormOpen = false;
    this.visitError = '';
  }

  /** Valida y agrega una visita al histórico (desde el mini-formulario). */
  saveVisit(archiveCurrent: boolean): void {
    this.visitError = '';
    const date = this.visitForm.date.trim();
    const service = this.visitForm.service.trim();
    const price = this.visitForm.price.trim();

    if (!date || !service || !price) {
      this.visitError = 'Completa fecha, servicio y valor cancelado.';
      return;
    }

    this.triggerHaptic();
    this.record.history = [
      { id: Date.now(), date, service, price },
      ...this.record.history,
    ];

    if (archiveCurrent) {
      this.record.currentPhase = -1;
      this.record.updatedAt = new Date().toISOString();
    }

    this.save();
    this.visitFormOpen = false;
    this.toast('Visita añadida al histórico');
  }

  get hasHistory(): boolean {
    return this.record.history.length > 0;
  }

  private formatDate(d: Date): string {
    const meses = [
      'ene', 'feb', 'mar', 'abr', 'may', 'jun',
      'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
    ];
    return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
  }
}
