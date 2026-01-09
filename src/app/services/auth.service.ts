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
import { BehaviorSubject, Observable, of, from, firstValueFrom, defer } from 'rxjs';
import { switchMap, map, tap, catchError, take, shareReplay } from 'rxjs/operators';

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
      // Use defer to ensure lazy evaluation and proper injection context
      // This creates the observable only when subscribed to
      const userRef = doc(this.firestore, `users/${user.uid}`);
      return defer(() => from(getDoc(userRef))).pipe(
        map((snap) => {
          const data = snap.data();
          
          if (!data) {
            // Create default profile if none exists
            const defaultProfile: AppUser = {
              uid: user.uid,
              email: user.email,
              firstName: '',
              lastName: '',
              role: 'student' as UserRole,
              avatar: `https://ui-avatars.com/api/?name=User`,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            // Create profile in Firestore asynchronously (don't wait)
            setDoc(userRef, {
              email: user.email,
              firstName: '',
              lastName: '',
              role: 'student',
              avatar: defaultProfile.avatar,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            }).catch(err => console.error('Error creating default profile:', err));
            
            this.userProfileSubject.next(defaultProfile);
            return defaultProfile;
          }
          
          const profile: AppUser = {
            uid: user.uid,
            email: data.email || null,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            role: data.role || 'student',
            avatar: data.avatar,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          };
          
          this.userProfileSubject.next(profile);
          return profile;
        }),
        catchError(error => {
          console.error('Error loading user profile:', error);
          // Return a default student profile if loading fails
          const defaultProfile: AppUser = {
            uid: user.uid,
            email: user.email,
            firstName: '',
            lastName: '',
            role: 'student' as UserRole,
            avatar: `https://ui-avatars.com/api/?name=User`,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          this.userProfileSubject.next(defaultProfile);
          return of(defaultProfile);
        })
      );
    }),
    shareReplay(1) // Share the result so multiple subscribers get the same value
  );

  // Authentication status should be based on Firebase auth state
  // so missing Firestore profiles don't mark users as unauthenticated.
  isAuthenticated$ = authState(this.auth).pipe(
    map(user => !!user)
  );

  constructor() {
    // Subscribe to ensure the observable is active
    // This helps with initial auth state detection
    this.currentUser$.subscribe(user => {
      console.log('AuthService - Current user updated:', user?.email, user?.role);
    });
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
  // LOAD USER PROFILE (kept for backward compatibility but not used in currentUser$)
  // =====================
  private async loadUserProfile(uid: string, email: string | null = null): Promise<AppUser | null> {
    try {
      const ref = doc(this.firestore, `users/${uid}`);
      const snap = await getDoc(ref);
      const data = snap.data();
      
      if (!data) {
        const defaultProfile = {
          email: email,
          firstName: '',
          lastName: '',
          role: 'student' as UserRole,
          avatar: `https://ui-avatars.com/api/?name=User`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        await setDoc(ref, defaultProfile);

        return {
          uid,
          email: defaultProfile.email || null,
          firstName: defaultProfile.firstName,
          lastName: defaultProfile.lastName,
          role: defaultProfile.role,
          avatar: defaultProfile.avatar,
          createdAt: defaultProfile.createdAt,
          updatedAt: defaultProfile.updatedAt
        };
      }

      return {
        uid,
        email: data.email || null,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        role: data.role || 'student',
        avatar: data.avatar,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
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
