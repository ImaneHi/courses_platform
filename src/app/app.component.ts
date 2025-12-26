import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { AuthService } from './services/auth.service';
import { Subscription } from 'rxjs';
import { User } from './services/user.model';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, RouterLink],
})
export class AppComponent implements OnInit {
  private userSubscription: Subscription | undefined;
  currentUser: User | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  isTeacher(): boolean {
    return this.authService.isTeacher();
  }

  isStudent(): boolean {
    return this.authService.isStudent();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  ngOnDestroy() {
    this.userSubscription?.unsubscribe();
  }
}
