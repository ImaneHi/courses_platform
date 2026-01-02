import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonApp, IonHeader, IonToolbar, IonTitle, IonContent, IonLabel, IonRouterOutlet, IonIcon, IonMenuToggle, IonItem, IonMenu, IonList } from '@ionic/angular/standalone';
import { AuthService } from './services/auth.service';
import { Subscription } from 'rxjs';
import { User } from './services/user.model';
import { Router, RouterLink } from '@angular/router';
import { PushNotificationsService } from './services/push-notifications.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [CommonModule, IonApp, IonHeader, IonToolbar, IonTitle, IonContent, IonLabel, IonRouterOutlet, IonIcon, IonMenuToggle, IonItem, IonMenu, IonList, RouterLink],
})
export class AppComponent implements OnInit {
  private userSubscription: Subscription | undefined;
  currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private pushNotificationsService: PushNotificationsService
  ) {}

  ngOnInit() {
    void this.pushNotificationsService.init();
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
