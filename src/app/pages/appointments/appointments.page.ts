import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonText,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  calendarOutline,
  closeCircleOutline,
  hourglassOutline,
  pawOutline,
  timeOutline, logOutOutline } from 'ionicons/icons';
// Haptics + Toast: misma pareja de feedback nativo que usa el Punto D al
// confirmar una cita — aquí se dispara al cancelarla. Ambos van en
// try/catch: Haptics lanza en navegador, Toast no pero se protege igual.
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Toast } from '@capacitor/toast';

type AppointmentStatus = 'Confirmado' | 'En Atención' | 'Completado' | 'Cancelado';

interface Appointment {
  id: number;
  service: string;
  professional: string;
  date: string;
  time: string;
  duration: string;
  status: AppointmentStatus;
  accent: string;
  price?: string;
}

@Component({
  selector: 'app-appointments',
  templateUrl: './appointments.page.html',
  styleUrls: ['./appointments.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonCardTitle,
    IonChip,
    IonIcon,
    IonItem,
    IonLabel,
    IonText,
  ],
})
export class AppointmentsPage implements OnInit {
  userName = '';
  activeAppointments: Appointment[] = [];
  historyAppointments: Appointment[] = [
    {
      id: 3,
      service: 'Baño con Hidromasaje',
      professional: 'Valentina · Hidroterapia',
      date: 'Lunes 26',
      time: '9:00 AM',
      duration: '30 min',
      status: 'Completado',
      accent: 'completed',
    },
    {
      id: 4,
      service: 'Corte de Raza',
      professional: 'Camila · Estética',
      date: 'Miércoles 21',
      time: '4:00 PM',
      duration: '50 min',
      status: 'Cancelado',
      accent: 'cancelled',
    },
  ];

  constructor(private readonly router: Router) {
    addIcons({logOutOutline,addOutline,calendarOutline,timeOutline,hourglassOutline,closeCircleOutline,pawOutline});
  }

  ngOnInit(): void {
    try {
      const raw = localStorage.getItem('vb_current_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        this.userName = (parsed?.name || '').split(' ')[0] || '';
      }
    } catch {
      // sin saludo
    }

    try {
      const raw = localStorage.getItem('vb_appointments');
      if (raw) {
        const list = JSON.parse(raw);
        this.activeAppointments = Array.isArray(list)
          ? list.filter((a: Appointment) => a && a.service && a.time)
          : [];
      }
    } catch {
      // sin citas activas
    }
  }

  get hasActive(): boolean {
    return this.activeAppointments.length > 0;
  }

  newBooking(): void {
    this.router.navigateByUrl('/service-selection');
  }

  /** Abre el perfil del tutor y la gestión de mascotas (Bonus 1). */
  goToProfile(): void {
    this.router.navigateByUrl('/profile');
  }

  /** Vibración sutil aislada en su propio método. Nunca propaga errores. */
  private async triggerHaptic(): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch { /* no-op en web */ }
  }

  /**
   * Cancela una cita activa: la saca de "Activas" y la marca 'Cancelado' en
   * localStorage["vb_appointments"] (persiste, no se borra del arreglo) para
   * que quede como registro. Única acción de "modificar el estado" del
   * cliente hoy — no hay flujo de especialista en este alcance.
   */
  async cancelAppointment(appointment: Appointment): Promise<void> {
    this.triggerHaptic();

    this.activeAppointments = this.activeAppointments.filter(
      (a) => a.id !== appointment.id
    );

    try {
      const raw = localStorage.getItem('vb_appointments');
      const list: Appointment[] = raw ? JSON.parse(raw) : [];
      const target = list.find((a) => a?.id === appointment.id);
      if (target) {
        target.status = 'Cancelado';
        target.accent = 'cancelled';
      }
      localStorage.setItem('vb_appointments', JSON.stringify(list));
    } catch { /* si no se pudo persistir, la vista ya se actualizó igual */ }

    try {
      await Toast.show({
        text: `Cita de ${appointment.service} cancelada`,
        duration: 'short',
        position: 'bottom'
      });
    } catch { /* no-op si el toast falla */ }
  }

  logout(): void {
    localStorage.removeItem('vb_current_user');
    localStorage.removeItem('vb_selected_service');
    localStorage.removeItem('vb_appointments');
    this.router.navigateByUrl('/login');
  }

  getStatusClass(status: AppointmentStatus): string {
    switch (status) {
      case 'Confirmado':
        return 'confirmed';
      case 'En Atención':
        return 'in-progress';
      case 'Completado':
        return 'completed';
      case 'Cancelado':
        return 'cancelled';
      default:
        return '';
    }
  }
}

