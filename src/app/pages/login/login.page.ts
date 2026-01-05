import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { AuthService, AppUser } from '../../services/auth.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
})
export class LoginPage {
  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  async login() {
    if (!this.loginForm.valid) return;

    const { email, password } = this.loginForm.value;

    try {
      await this.authService.login(email, password);

      this.authService.currentUser$
        .pipe(take(1))
        .subscribe((user: AppUser | null) => {
          if (!user) return;

          if (user.role === 'teacher') {
            this.router.navigate(['/teacher-dashboard']);
          } else {
            this.router.navigate(['/student-dashboard']);
          }
        });
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: error.message || 'Erreur de connexion',
        duration: 2000,
        color: 'danger',
      });
      toast.present();
    }
  }
}