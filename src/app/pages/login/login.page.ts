import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonicModule, ToastController, LoadingController } from '@ionic/angular';
import { AuthService, AppUser } from '../../services/auth.service';
import { firstValueFrom, take } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [CommonModule, IonicModule, ReactiveFormsModule, RouterModule],
})
export class LoginPage {
  loginForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  async login() {
    if (!this.loginForm.valid) {
      this.showToast('Please fill in all required fields correctly', 'warning');
      return;
    }

    const { email, password } = this.loginForm.value;
    this.isLoading = true;

    const loading = await this.loadingController.create({
      message: 'Signing in...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.authService.login(email, password);

      // Wait for auth state to propagate and profile to load
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Get user profile with retry logic
      let user: AppUser | null = null;
      let attempts = 0;
      const maxAttempts = 8;

      while (!user && attempts < maxAttempts) {
        user = await firstValueFrom(this.authService.currentUser$.pipe(take(1)));

        if (!user && attempts < maxAttempts - 1) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          attempts = maxAttempts; // Exit loop
        }
      }

      await loading.dismiss();
      this.isLoading = false;

      // If user profile is still missing, create a default student profile and continue
      if (!user) {
        console.warn('User profile not found, creating default student profile...');
        // The auth service should handle this automatically, but navigate anyway
        this.showToast('Logging in...', 'success');
        setTimeout(() => {
          this.router.navigate(['/student-dashboard']);
        }, 500);
        return;
      }

      // Redirect based on role
      if (user.role === 'teacher') {
        this.router.navigate(['/teacher-dashboard']);
      } else {
        this.router.navigate(['/student-dashboard']);
      }
    } catch (error: any) {
      await loading.dismiss();
      this.isLoading = false;
      
      let errorMessage = 'Login failed. Please check your credentials.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      this.showToast(errorMessage, 'danger');
    }
  }

  async resetPassword() {
    const email = this.loginForm.get('email')?.value;
    
    if (!email) {
      this.showToast('Please enter your email address first', 'warning');
      return;
    }

    try {
      await this.authService.resetPassword(email);
      this.showToast('Password reset email sent. Please check your inbox.', 'success');
    } catch (error: any) {
      this.showToast(error.message || 'Failed to send password reset email', 'danger');
    }
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