import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, calendarOutline, checkmarkCircleOutline, cutOutline, pawOutline, timeOutline, waterOutline } from 'ionicons/icons';

interface Pet { id: number; name: string; breed: string; age: string; size: string; weight: string; temperament: string; notes: string; }
interface Visit { date: string; service: string; value: string; }
interface TreatmentStage { title: string; detail: string; icon: string; color: string; }

@Component({
  selector: 'app-tracking',
  templateUrl: './tracking.page.html',
  styleUrls: ['./tracking.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonContent, IonIcon]
})
export class TrackingPage implements OnInit {
  pets: Pet[] = [];
  selectedPetId: number | null = null;
  activeStage = 1;
  userName = '';
  readonly stages: TreatmentStage[] = [
    { title: 'En Recepción', detail: 'Espera y pesaje inicial', icon: 'paw-outline', color: 'teal' },
    { title: 'En Hidroterapia', detail: 'Tina y ozonoterapia', icon: 'water-outline', color: 'blue' },
    { title: 'En Estilismo', detail: 'Secado y corte de raza', icon: 'cut-outline', color: 'amber' },
    { title: 'Listo para Entrega', detail: 'En zona lounge', icon: 'checkmark-circle-outline', color: 'green' }
  ];
  readonly visits: Visit[] = [
    { date: '12 de agosto de 2026', service: 'Baño hipoalergénico + deslanado', value: '$95.000' },
    { date: '26 de julio de 2026', service: 'Limado de uñas y limpieza ótica', value: '$38.000' }
  ];

  constructor(private readonly router: Router) {
    addIcons({ arrowBackOutline, calendarOutline, checkmarkCircleOutline, cutOutline, pawOutline, timeOutline, waterOutline });
  }

  ngOnInit(): void {
    try {
      const user = JSON.parse(localStorage.getItem('vb_current_user') || '{}');
      this.userName = (user?.name || '').split(' ')[0] || '';
      const pets = JSON.parse(localStorage.getItem(`pb_pets_${user?.email || 'guest'}`) || '[]');
      this.pets = Array.isArray(pets) ? pets : [];
      this.selectedPetId = this.pets[0]?.id ?? null;
    } catch {
      this.pets = [];
    }
  }

  get selectedPet(): Pet | undefined {
    return this.pets.find((pet) => pet.id === this.selectedPetId);
  }

  get currentStage(): TreatmentStage {
    return this.stages[this.activeStage];
  }

  setPet(id: number): void {
    this.selectedPetId = id;
  }

  advanceStage(): void {
    if (this.activeStage < this.stages.length - 1) {
      this.activeStage += 1;
    }
  }

  goBack(): void {
    this.router.navigateByUrl('/appointments');
  }

  goToPets(): void {
    this.router.navigateByUrl('/pets');
  }
}
