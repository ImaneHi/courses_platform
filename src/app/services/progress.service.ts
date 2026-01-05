// src/app/services/progress.service.ts
import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  updateDoc,
  query,
  where,
  serverTimestamp,
  arrayUnion,
  DocumentData
} from '@angular/fire/firestore';
import { Observable, of, combineLatest } from 'rxjs';
import { map, switchMap, take, catchError } from 'rxjs/operators';
import { StudentProgress, QuizResult } from '../services/course.model'; // IMPORT CORRECT
import { AuthService } from './auth.service';
import { CourseService } from './course.service';

@Injectable({
  providedIn: 'root'
})
export class ProgressService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private courseService = inject(CourseService);

  private progressCollection = collection(this.firestore, 'progress');

  getCourseProgress(courseId: string): Observable<StudentProgress | null> {
    return this.authService.userProfile$.pipe(
      switchMap(user => {
        if (!user) return of(null);
        
        const q = query(
          this.progressCollection,
          where('studentId', '==', user.uid),
          where('courseId', '==', courseId)
        );
        
        return collectionData(q, { idField: 'id' }).pipe(
          map(progresses => {
            if (progresses.length === 0) return null;
            return progresses[0] as StudentProgress;
          })
        );
      })
    );
  }

  // ... garder le reste du code existant mais avec StudentProgress
}