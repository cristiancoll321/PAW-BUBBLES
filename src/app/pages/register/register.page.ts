import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonIcon
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  personOutline,
  callOutline,
  mailOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
  sparklesOutline,
  checkmarkCircleOutline,
  cutOutline,
  colorPaletteOutline,
  arrowForwardOutline,
  shieldCheckmarkOutline,
  starOutline
} from 'ionicons/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [IonIcon, 
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon
  ]
})
export class RegisterPage {
  userType: 'cliente' | 'especialista' = 'cliente';
  fullName: string = '';
  phone: string = '';
  email: string = '';
  password: string = '';
  showPassword: boolean = false;
  acceptedTerms: boolean = false;
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(private readonly router: Router) {
    addIcons({sparklesOutline,checkmarkCircleOutline,starOutline,personOutline,cutOutline,callOutline,mailOutline,lockClosedOutline,shieldCheckmarkOutline,arrowForwardOutline,eyeOutline,eyeOffOutline,colorPaletteOutline});
  }

  async triggerHaptic() {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
    }
  }

  selectUserType(type: 'cliente' | 'especialista') {
    this.userType = type;
    this.triggerHaptic();
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
    this.triggerHaptic();
  }

  async onRegister() {
    this.errorMessage = '';

    if (!this.fullName || !this.phone || !this.email || !this.password) {
      this.errorMessage = 'Por favor completa todos los campos para crear tu cuenta';
      try {
        await Haptics.notification({ type: undefined as any });
      } catch { }
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.errorMessage = 'Ingresa un formato de correo electrónico válido';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    if (!this.acceptedTerms) {
      this.errorMessage = 'Debes aceptar los términos y condiciones para continuar';
      return;
    }

    const defaultAccounts: string[] = [
      'tutor.demo@pawandbubbles.com',
      'recepcion@pawandbubbles.com'
    ];

    let localUsers: Array<{ email: string; password: string; fullName: string; phone: string; userType: string }> = [];
    try {
      const stored = localStorage.getItem('vb_users');
      if (stored) {
        localUsers = JSON.parse(stored);
      }
    } catch { }

    const inputEmail = this.email.trim().toLowerCase();
    const isDuplicate = defaultAccounts.includes(inputEmail) || localUsers.some(u => u.email.trim().toLowerCase() === inputEmail);

    if (isDuplicate) {
      this.errorMessage = 'Este correo electrónico ya está registrado. Inicia sesión con tus credenciales.';
      try {
        await Haptics.notification({ type: undefined as any });
      } catch { }
      return;
    }

    const newUser = {
      fullName: this.fullName.trim(),
      phone: this.phone.trim(),
      email: inputEmail,
      password: this.password,
      userType: this.userType
    };

    localUsers.push(newUser);
    try {
      localStorage.setItem('vb_users', JSON.stringify(localUsers));
      localStorage.setItem('vb_current_user', JSON.stringify({
        email: newUser.email,
        name: newUser.fullName,
        userType: newUser.userType
      }));
    } catch { }

    this.isLoading = true;
    this.triggerHaptic();

    setTimeout(() => {
      this.isLoading = false;
      const destination = this.userType === 'especialista' ? '/specialist-home' : '/service-selection';
      this.router.navigateByUrl(destination);
    }, 450);
  }

  goToLogin() {
    this.triggerHaptic();
    this.router.navigateByUrl('/login');
  }
}
