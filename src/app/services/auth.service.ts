import { Injectable, inject } from '@angular/core';
import {
  Auth,
  authState,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  UserCredential,
  sendEmailVerification,
  sendPasswordResetEmail
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  getDoc
} from '@angular/fire/firestore';
import { BehaviorSubject, Observable, of, from } from 'rxjs';
import { switchMap, map, tap, catchError } from 'rxjs/operators';

export type UserRole = 'student' | 'teacher';

export interface AppUser {
  uid: string;
  email: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  createdAt?: any;
  updatedAt?: any;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private auth = inject(Auth);
  private firestore = inject(Firestore);

  private userProfileSubject = new BehaviorSubject<AppUser | null>(null);
  userProfile$ = this.userProfileSubject.asObservable();

  currentUser$ = authState(this.auth).pipe(
    switchMap(user => {
      if (!user) {
        this.userProfileSubject.next(null);
        return of(null);
      }
      return from(this.loadUserProfile(user.uid));
    }),
    tap(profile => this.userProfileSubject.next(profile))
  );

  isAuthenticated$ = this.currentUser$.pipe(
    map(user => !!user)
  );

  constructor() {
    this.currentUser$.subscribe();
  }

  // =====================
  // REGISTER
  // =====================
  async register(
    email: string,
    password: string,
    userData: { firstName: string; lastName: string; role: UserRole }
  ): Promise<UserCredential> {

    const credential = await createUserWithEmailAndPassword(
      this.auth,
      email,
      password
    );

    await setDoc(doc(this.firestore, `users/${credential.user.uid}`), {
      email,
      ...userData,
      avatar: `https://ui-avatars.com/api/?name=${userData.firstName}+${userData.lastName}`,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await sendEmailVerification(credential.user);
    return credential;
  }

  // =====================
  // LOGIN / LOGOUT
  // =====================
  login(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.userProfileSubject.next(null);
  }

  // =====================
  // LOAD USER PROFILE (🔥 FIX FINAL)
  // =====================
  private async loadUserProfile(uid: string): Promise<AppUser | null> {
    try {
      const ref = doc(this.firestore, `users/${uid}`);
      const snap = await getDoc(ref);

      if (!snap.exists()) return null;

      const data = snap.data();

      return {
        uid,
        email: data['email'] || null,
        firstName: data['firstName'] || '',
        lastName: data['lastName'] || '',
        role: data['role'] || 'student',
        avatar: data['avatar'],
        createdAt: data['createdAt'],
        updatedAt: data['updatedAt']
      };
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  }

  // =====================
  // UPDATE PROFILE
  // =====================
  async updateUserProfile(uid: string, data: Partial<AppUser>): Promise<void> {
    await updateDoc(doc(this.firestore, `users/${uid}`), {
      ...data,
      updatedAt: serverTimestamp()
    });

    const current = this.userProfileSubject.value;
    if (current) {
      this.userProfileSubject.next({ ...current, ...data });
    }
  }

  // =====================
  // RESET PASSWORD
  // =====================
  resetPassword(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email);
  }

  // =====================
  // ROLE CHECK
  // =====================
  hasRole(role: UserRole): Observable<boolean> {
    return this.userProfile$.pipe(
      map(profile => profile?.role === role)
    );
  }

  getCurrentUser(): AppUser | null {
    return this.userProfileSubject.value;
  }
}
