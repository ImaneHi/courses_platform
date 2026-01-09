import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonicModule, ToastController, LoadingController } from '@ionic/angular';
import { AuthService, UserRole } from '../../services/auth.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  imports: [CommonModule, IonicModule, ReactiveFormsModule, RouterModule],
})
export class RegisterPage {
  registerForm: FormGroup;
  isLoading = false;
  selectedRole: UserRole = 'student';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      role: ['student', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (!password || !confirmPassword) return null;
    
    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  async register() {
    if (!this.registerForm.valid) {
      this.showToast('Please fill in all required fields correctly', 'warning');
      return;
    }

    const { firstName, lastName, email, password, role } = this.registerForm.value;
    this.isLoading = true;

    const loading = await this.loadingController.create({
      message: 'Creating account...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.authService.register(email, password, {
        firstName,
        lastName,
        role: role as UserRole
      });

      await loading.dismiss();
      this.isLoading = false;

      this.showToast('Account created successfully! Please verify your email.', 'success');

      // Wait a bit then navigate
      setTimeout(() => {
        this.authService.currentUser$
          .pipe(take(1))
          .subscribe((user) => {
            if (user?.role === 'teacher') {
              this.router.navigate(['/teacher-dashboard']);
            } else {
              this.router.navigate(['/student-dashboard']);
            }
          });
      }, 1500);
    } catch (error: any) {
      await loading.dismiss();
      this.isLoading = false;

      let errorMessage = 'Registration failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please login instead.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      this.showToast(errorMessage, 'danger');
    }
  }

  onRoleChange(event: any) {
    this.selectedRole = event.detail.value;
    this.registerForm.patchValue({ role: this.selectedRole });
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    toast.present();
  }
}

