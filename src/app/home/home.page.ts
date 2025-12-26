import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import {IonButtons,IonMenuButton,IonGrid,IonRow,IonCol,IonButton,IonIcon,} from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { User } from '../services/user.model';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common'; // Import CommonModule

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    IonButtons,
    IonMenuButton,
    IonGrid,
    IonRow,
    IonCol,
    IonButton,
    IonIcon,
    RouterLink
  ],
})
export class HomePage implements OnInit, OnDestroy {
  private userSubscription: Subscription | undefined;
  currentUser: User | null = null;

  constructor(private authService: AuthService) { }

  ngOnInit() {
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
  }

  isTeacher(): boolean {
    return this.authService.isTeacher();
  }

  isStudent(): boolean {
    return this.authService.isStudent();
  }

  ngOnDestroy() {
    this.userSubscription?.unsubscribe();
  }
}
