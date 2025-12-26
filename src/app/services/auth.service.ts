import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { User } from './user.model';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  constructor(private router: Router) {
    this.currentUserSubject = new BehaviorSubject<User | null>(JSON.parse(localStorage.getItem('currentUser') || 'null'));
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  login(email: string, password: string): Observable<any> {
    // This is a mock authentication. In a real application, you would
    // make an HTTP request to your backend authentication API.

    // For demonstration purposes, let's assume valid credentials
    // and assign a role based on the email.
    if (email === 'teacher@example.com' && password === 'password') {
      const teacher: User = {
        id: 1,
        email: 'teacher@example.com',
        firstName: 'Teach',
        lastName: 'Er',
        role: 'teacher'
      };
      localStorage.setItem('currentUser', JSON.stringify(teacher));
      this.currentUserSubject.next(teacher);
      return of({ success: true, user: teacher });
    } else if (email === 'student@example.com' && password === 'password') {
      const student: User = {
        id: 2,
        email: 'student@example.com',
        firstName: 'Stu',
        lastName: 'Dent',
        role: 'student'
      };
      localStorage.setItem('currentUser', JSON.stringify(student));
      this.currentUserSubject.next(student);
      return of({ success: true, user: student });
    } else {
      return of({ success: false, message: 'Invalid credentials' });
    }
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null;
  }

  isTeacher(): boolean {
    return this.currentUserSubject.value?.role === 'teacher';
  }

  isStudent(): boolean {
    return this.currentUserSubject.value?.role === 'student';
  }
}
