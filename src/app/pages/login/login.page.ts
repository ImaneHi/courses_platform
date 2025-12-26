import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular'; // Import ToastController
import { AuthService } from '../../services/auth.service'; // Import AuthService

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule]
})
export class LoginPage {
  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService, // Inject AuthService
    private toastController: ToastController // Inject ToastController
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async login() { // Make login an async function
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      this.authService.login(email, password).subscribe(async res => { // Use subscribe for Observable
        if (res.success) {
          // Navigate based on user role
          const user = this.authService.currentUserValue;
          if (user?.role === 'teacher') {
            this.router.navigate(['/teacher-dashboard']);
          } else if (user?.role === 'student') {
            this.router.navigate(['/student-dashboard']);
          } else {
            this.router.navigate(['/dashboard']); // Fallback or general dashboard
          }
        } else {
          const toast = await this.toastController.create({
            message: res.message || 'Login failed. Please try again.',
            duration: 2000,
            color: 'danger'
          });
          toast.present();
        }
      });
    } else {
      const toast = await this.toastController.create({
        message: 'Please enter valid email and password.',
        duration: 2000,
        color: 'danger'
      });
      toast.present();
    }
  }
}