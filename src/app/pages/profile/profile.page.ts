/**
 * ============================================================================
 *  BONUS 1 — "Perfil del Tutor + Registro y Gestión de Mascotas"
 * ============================================================================
 *
 *  Rol dentro del flujo de la app (PAW BUBBLES — spa canino):
 *
 *      Login / Registro  ──▶  ...  ──▶  [ ESTA PANTALLA ]  ──▶  Seguimiento en vivo
 *
 *  Qué hace el tutor aquí:
 *    1. Consulta sus datos de cuenta (nombre + correo, de `vb_current_user`).
 *    2. Registra UNA o VARIAS mascotas con su ficha completa:
 *         - Nombre del canino, raza y edad aproximada.
 *         - Talla corporal (Pequeña | Mediana | Grande | Gigante) y peso (kg).
 *         - Temperamento (Tranquilo | Ansioso | Enérgico | Reactivo con otros canes).
 *         - Observaciones especiales de cuidado (alergias a fragancias,
 *           sensibilidad en piel o articulaciones, etc.).
 *    3. Edita o elimina una ficha.
 *    4. Abre el panel de "Seguimiento en vivo" de una mascota (Bonus 2).
 *
 *  Origen y destino de los datos (ver también FLUJO-DE-DATOS.md):
 *
 *    localStorage["vb_current_user"] ──lee──▶  nombre + correo del tutor
 *        (lo escribe Login / Registro)
 *
 *    localStorage["vb_pets"]  ◀─escribe/lee─▶  ESTA PANTALLA
 *        - arreglo global de mascotas de TODOS los tutores del dispositivo;
 *          esta pantalla filtra por `ownerEmail === tutor.email`.
 *
 *    localStorage["vb_tracking_pet"]  ──escribe──▶  id de la mascota cuyo
 *        panel de seguimiento se va a abrir (el router no transporta estado;
 *        /pet-tracking lo relee en su ngOnInit).
 *
 *  Nota: hoy NO hay backend. Toda la persistencia vive en `localStorage` del
 *  navegador / WebView (mismo patrón que el resto de la app).
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
  closeOutline,
  createOutline,
  pawOutline,
  pulseOutline,
  trashOutline,
  saveOutline,
  alertCircleOutline,
} from 'ionicons/icons';
// Haptics: vibración sutil en cada interacción. En navegador el plugin lanza
// excepción → TODAS las llamadas van envueltas en try/catch (mismo patrón que
// login.page.ts / register.page.ts / service-selection.page.ts).
import { Haptics, ImpactStyle } from '@capacitor/haptics';

/** Talla corporal del canino. Fija por requerimiento del Bonus 1. */
export type PetSize = 'Pequeña' | 'Mediana' | 'Grande' | 'Gigante';

/** Temperamento del canino. Fijo por requerimiento del Bonus 1. */
export type PetTemperament =
  | 'Tranquilo'
  | 'Ansioso'
  | 'Enérgico'
  | 'Reactivo con otros canes';

/**
 * Ficha de una mascota. Es lo que se guarda dentro del arreglo
 * `localStorage["vb_pets"]`. `ownerEmail` la ata a la cuenta del tutor.
 */
export interface Pet {
  /** id local estable (Date.now()); es la "PK" para editar / borrar / trazar. */
  id: number;
  /** correo del tutor dueño — enlaza con `vb_current_user.email`. */
  ownerEmail: string;
  name: string;
  breed: string;
  /** Edad aproximada como texto libre: "3 años", "8 meses"... */
  ageApprox: string;
  size: PetSize;
  /** Peso aproximado en kg. `null` mientras el tutor no lo informa. */
  weightKg: number | null;
  temperament: PetTemperament;
  /** Observaciones especiales de cuidado (alergias, sensibilidades...). */
  careNotes: string;
  createdAt: string;
}

/** Forma del formulario en memoria (antes de convertirse en `Pet`). */
interface PetForm {
  name: string;
  breed: string;
  ageApprox: string;
  size: PetSize | '';
  weightKg: number | null;
  temperament: PetTemperament | '';
  careNotes: string;
}

const STORAGE_KEY = 'vb_pets';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon],
})
export class ProfilePage implements OnInit {
  // ---------------------------------------------------------------------------
  //  ESTADO DE LA VISTA
  // ---------------------------------------------------------------------------

  /** Nombre de pila del tutor para el encabezado. */
  tutorName = '';
  /** Correo del tutor — es la clave con la que se filtran / etiquetan mascotas. */
  tutorEmail = '';

  /** Mascotas del tutor actual (ya filtradas de `vb_pets`). */
  pets: Pet[] = [];

  /** true → el formulario de alta/edición está visible. */
  formOpen = false;
  /** id de la mascota en edición; `null` = alta nueva. */
  editingId: number | null = null;
  /** Mensaje de validación del formulario. Vacío = sin error. */
  formError = '';

  /** Opciones fijas para los selectores del formulario. */
  readonly sizeOptions: PetSize[] = ['Pequeña', 'Mediana', 'Grande', 'Gigante'];
  readonly temperamentOptions: PetTemperament[] = [
    'Tranquilo',
    'Ansioso',
    'Enérgico',
    'Reactivo con otros canes',
  ];

  /** Modelo del formulario. Se reinicia con `blankForm()`. */
  form: PetForm = this.blankForm();

  constructor(private readonly router: Router) {
    addIcons({
      addOutline,
      arrowBackOutline,
      closeOutline,
      createOutline,
      pawOutline,
      pulseOutline,
      trashOutline,
      saveOutline,
      alertCircleOutline,
    });
  }

  /**
   * Ciclo de vida: LECTURA de datos externos (localStorage).
   *   1. `vb_current_user` → nombre + correo del tutor.
   *   2. `vb_pets`         → mascotas, filtradas por `ownerEmail`.
   * Ambos bloques en try/catch: el JSON puede estar corrupto o localStorage
   * puede no estar disponible (incógnito / WebView restringido).
   */
  ngOnInit(): void {
    try {
      const raw = localStorage.getItem('vb_current_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        this.tutorName = (parsed?.name || '').split(' ')[0] || '';
        this.tutorEmail = (parsed?.email || '').trim().toLowerCase();
      }
    } catch {
      /* sin datos de tutor → encabezado genérico */
    }

    this.pets = this.readPets();
  }

  // ---------------------------------------------------------------------------
  //  LECTURA / ESCRITURA DE localStorage["vb_pets"]
  // ---------------------------------------------------------------------------

  /** Lee el arreglo global y devuelve solo las mascotas del tutor actual. */
  private readPets(): Pet[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const all = JSON.parse(raw);
      if (!Array.isArray(all)) {
        return [];
      }
      return all
        .filter(
          (p: Pet) =>
            p &&
            typeof p.id === 'number' &&
            p.name &&
            // Si aún no hay tutor identificado, no se muestra nada ajeno.
            (!this.tutorEmail || p.ownerEmail === this.tutorEmail),
        )
        .sort((a: Pet, b: Pet) => b.id - a.id);
    } catch {
      return [];
    }
  }

  /**
   * Persiste `this.pets` (mascotas del tutor) dentro del arreglo global
   * `vb_pets`, respetando las mascotas de otros tutores del dispositivo.
   */
  private writePets(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const all: Pet[] = raw ? JSON.parse(raw) : [];
      const others = Array.isArray(all)
        ? all.filter((p) => p && p.ownerEmail !== this.tutorEmail)
        : [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...others, ...this.pets]));
    } catch {
      /* si no se pudo persistir, la vista ya quedó actualizada en memoria */
    }
  }

  // ---------------------------------------------------------------------------
  //  ACCIONES DEL USUARIO
  // ---------------------------------------------------------------------------

  /** Vibración sutil aislada. Nunca propaga errores (navegador sin plugin). */
  async triggerHaptic(): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      /* no-op en web */
    }
  }

  goBack(): void {
    this.triggerHaptic();
    this.router.navigateByUrl('/service-selection');
  }

  /** Formulario vacío (valores por defecto para un alta nueva). */
  private blankForm(): PetForm {
    return {
      name: '',
      breed: '',
      ageApprox: '',
      size: '',
      weightKg: null,
      temperament: '',
      careNotes: '',
    };
  }

  /** Abre el formulario en modo "alta nueva". */
  openNewForm(): void {
    this.triggerHaptic();
    this.editingId = null;
    this.formError = '';
    this.form = this.blankForm();
    this.formOpen = true;
  }

  /** Abre el formulario precargado con los datos de una ficha existente. */
  editPet(pet: Pet): void {
    this.triggerHaptic();
    this.editingId = pet.id;
    this.formError = '';
    this.form = {
      name: pet.name,
      breed: pet.breed,
      ageApprox: pet.ageApprox,
      size: pet.size,
      weightKg: pet.weightKg,
      temperament: pet.temperament,
      careNotes: pet.careNotes,
    };
    this.formOpen = true;
  }

  /** Cierra el formulario sin guardar. */
  closeForm(): void {
    this.triggerHaptic();
    this.formOpen = false;
    this.editingId = null;
    this.formError = '';
  }

  /**
   * Valida y guarda el formulario (alta o edición).
   * Reglas: nombre, raza, talla y temperamento son obligatorios; el peso, si
   * se informa, debe ser un número positivo.
   */
  savePet(): void {
    this.formError = '';

    const name = this.form.name.trim();
    const breed = this.form.breed.trim();

    if (!name || !breed || !this.form.size || !this.form.temperament) {
      this.formError =
        'Completa nombre, raza, talla corporal y temperamento para guardar la ficha.';
      return;
    }

    let weight: number | null = null;
    if (this.form.weightKg !== null && `${this.form.weightKg}` !== '') {
      const parsed = Number(this.form.weightKg);
      if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 120) {
        this.formError = 'Ingresa un peso aproximado válido en kilogramos.';
        return;
      }
      weight = Math.round(parsed * 10) / 10;
    }

    this.triggerHaptic();

    if (this.editingId !== null) {
      // --- Edición: se conserva id / ownerEmail / createdAt ---
      this.pets = this.pets.map((p) =>
        p.id === this.editingId
          ? {
              ...p,
              name,
              breed,
              ageApprox: this.form.ageApprox.trim(),
              size: this.form.size as PetSize,
              weightKg: weight,
              temperament: this.form.temperament as PetTemperament,
              careNotes: this.form.careNotes.trim(),
            }
          : p,
      );
    } else {
      // --- Alta nueva ---
      const nuevo: Pet = {
        id: Date.now(),
        ownerEmail: this.tutorEmail,
        name,
        breed,
        ageApprox: this.form.ageApprox.trim(),
        size: this.form.size as PetSize,
        weightKg: weight,
        temperament: this.form.temperament as PetTemperament,
        careNotes: this.form.careNotes.trim(),
        createdAt: new Date().toISOString(),
      };
      this.pets = [nuevo, ...this.pets];
    }

    this.writePets();
    this.formOpen = false;
    this.editingId = null;
    this.form = this.blankForm();
  }

  /**
   * Elimina una ficha. También limpia su panel de seguimiento en
   * `vb_pet_tracking` para no dejar registros huérfanos.
   */
  deletePet(pet: Pet): void {
    this.triggerHaptic();
    this.pets = this.pets.filter((p) => p.id !== pet.id);
    this.writePets();

    try {
      const raw = localStorage.getItem('vb_pet_tracking');
      if (raw) {
        const map = JSON.parse(raw) || {};
        delete map[pet.id];
        localStorage.setItem('vb_pet_tracking', JSON.stringify(map));
      }
    } catch {
      /* si no se pudo limpiar el seguimiento, no es crítico */
    }

    if (this.editingId === pet.id) {
      this.closeForm();
    }
  }

  /**
   * Abre el panel de "Seguimiento en vivo" (Bonus 2) para esta mascota.
   * El router no transporta estado → se deja el id en `vb_tracking_pet` y
   * la pantalla destino lo relee en su ngOnInit.
   */
  openTracking(pet: Pet): void {
    this.triggerHaptic();
    try {
      localStorage.setItem('vb_tracking_pet', String(pet.id));
    } catch {
      /* si falla, /pet-tracking mostrará el estado "sin mascota seleccionada" */
    }
    this.router.navigateByUrl('/pet-tracking');
  }

  // ---------------------------------------------------------------------------
  //  HELPERS DE PRESENTACIÓN
  // ---------------------------------------------------------------------------

  get hasPets(): boolean {
    return this.pets.length > 0;
  }

  /** Clase CSS del badge de talla (color por tamaño). */
  sizeClass(size: PetSize): string {
    switch (size) {
      case 'Pequeña':
        return 'size-xs';
      case 'Mediana':
        return 'size-sm';
      case 'Grande':
        return 'size-lg';
      case 'Gigante':
        return 'size-xl';
      default:
        return '';
    }
  }

  /** Clase CSS del badge de temperamento (verde → rojo según manejo). */
  temperamentClass(t: PetTemperament): string {
    switch (t) {
      case 'Tranquilo':
        return 'temp-calm';
      case 'Enérgico':
        return 'temp-energetic';
      case 'Ansioso':
        return 'temp-anxious';
      case 'Reactivo con otros canes':
        return 'temp-reactive';
      default:
        return '';
    }
  }
}
