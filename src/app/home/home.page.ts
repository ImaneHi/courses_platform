import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AuthService, AppUser } from '../services/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule]
})
export class HomePage {
  currentUser: AppUser | null = null;

  constructor(public auth: AuthService) {
    this.auth.currentUser$.subscribe((user: AppUser | null) => {
      this.currentUser = user;
    });
  }

  isTeacher(): boolean {
    return this.currentUser?.role === 'teacher';
  }

  isStudent(): boolean {
    return this.currentUser?.role === 'student';
  }
}