import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AuthService, AppUser } from './services/auth.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, IonicModule],
  templateUrl: 'app.component.html',
})
export class AppComponent {
  user$: Observable<AppUser | null>;

  constructor(
    public auth: AuthService,
    private router: Router
  ) {
    this.user$ = this.auth.currentUser$;
  }

  isStudent(user: AppUser | null): boolean {
    return user?.role === 'student';
  }

  isTeacher(user: AppUser | null): boolean {
    return user?.role === 'teacher';
  }

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}