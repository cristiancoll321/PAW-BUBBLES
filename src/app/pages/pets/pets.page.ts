import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, arrowBackOutline, createOutline, pawOutline, saveOutline, trashOutline } from 'ionicons/icons';

interface Pet {
  id: number;
  name: string;
  breed: string;
  age: string;
  size: string;
  weight: string;
  temperament: string;
  notes: string;
}

@Component({
  selector: 'app-pets',
  templateUrl: './pets.page.html',
  styleUrls: ['./pets.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonContent, IonIcon]
})
export class PetsPage implements OnInit {
  pets: Pet[] = [];
  editingId: number | null = null;
  form: Omit<Pet, 'id'> = this.emptyForm();
  userName = '';

  constructor(private readonly router: Router) {
    addIcons({ arrowBackOutline, pawOutline, createOutline, trashOutline, addOutline, saveOutline });
  }

  ngOnInit(): void {
    try {
      const user = JSON.parse(localStorage.getItem('vb_current_user') || '{}');
      this.userName = (user?.name || '').split(' ')[0] || '';
      const stored = JSON.parse(localStorage.getItem(this.storageKey(user?.email)) || '[]');
      this.pets = Array.isArray(stored) ? stored : [];
    } catch {
      this.pets = [];
    }
  }

  get storageKey(): (email?: string) => string {
    return (email?: string) => `pb_pets_${email || this.currentUserEmail() || 'guest'}`;
  }

  private currentUserEmail(): string {
    try {
      return JSON.parse(localStorage.getItem('vb_current_user') || '{}')?.email || '';
    } catch {
      return '';
    }
  }

  private emptyForm(): Omit<Pet, 'id'> {
    return { name: '', breed: '', age: '', size: 'Mediana', weight: '', temperament: 'Tranquilo', notes: '' };
  }

  savePet(): void {
    if (!this.form.name.trim() || !this.form.breed.trim() || !this.form.age || !this.form.weight) {
      return;
    }

    if (this.editingId === null) {
      this.pets = [...this.pets, { id: Date.now(), ...this.form, name: this.form.name.trim(), breed: this.form.breed.trim() }];
    } else {
      this.pets = this.pets.map((pet) => pet.id === this.editingId ? { id: pet.id, ...this.form } : pet);
    }
    this.persist();
    this.cancelEdit();
  }

  editPet(pet: Pet): void {
    this.editingId = pet.id;
    const { id: _id, ...details } = pet;
    this.form = { ...details };
  }

  deletePet(pet: Pet): void {
    this.pets = this.pets.filter((item) => item.id !== pet.id);
    this.persist();
    if (this.editingId === pet.id) {
      this.cancelEdit();
    }
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form = this.emptyForm();
  }

  goBack(): void {
    this.router.navigateByUrl('/service-selection');
  }

  private persist(): void {
    try {
      localStorage.setItem(this.storageKey(), JSON.stringify(this.pets));
    } catch {
      // La interfaz sigue funcionando aunque el navegador no permita persistencia.
    }
  }
}
