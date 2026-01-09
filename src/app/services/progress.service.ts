// src/app/services/progress.service.ts
import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  updateDoc,
  addDoc,
  query,
  where,
  serverTimestamp,
  arrayUnion,
  DocumentData
} from '@angular/fire/firestore';
import { Observable, of, combineLatest, firstValueFrom } from 'rxjs';
import { map, switchMap, take, catchError } from 'rxjs/operators';
import { StudentProgress, QuizResult } from '../services/course.model'; // IMPORT CORRECT
import { AuthService } from './auth.service';
import { CourseService } from './course.service';
import { LessonService } from './lesson.service';

@Injectable({
  providedIn: 'root'
})
export class ProgressService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private courseService = inject(CourseService);
  private lessonService = inject(LessonService);

  private progressCollection = collection(this.firestore, 'progress');
  getCourseProgress(courseId: string): Observable<StudentProgress | null> {
    return this.authService.currentUser$.pipe(
      switchMap(user => {
        if (!user) return of(null);

        const q = query(
          this.progressCollection,
          where('studentId', '==', user.uid),
          where('courseId', '==', courseId)
        );

        return collectionData(q, { idField: 'id' }).pipe(
          switchMap(progresses => {
            if (progresses.length === 0) return of(null);
            
            const progress = progresses[0] as StudentProgress;
            
            // Calculate overall progress if needed
            return this.courseService.getCourseById(courseId).pipe(
              switchMap(course => {
                if (course) {
                  // Try to get lessons count
                  return this.lessonService.getLessonsByCourse(courseId).pipe(
                    map(lessons => {
                      const totalLessons = lessons.length || (course.lessons?.length || 0);
                      const completedLessons = progress.completedLessons?.length || 0;
                      
                      if (totalLessons > 0 && progress.overallProgress === 0) {
                        progress.overallProgress = Math.round((completedLessons / totalLessons) * 100);
                      }
                      
                      return progress;
                    })
                  );
                }
                return of(progress);
              }),
              catchError(() => of(progress))
            );
          })
        );
      })
    );
  }

  async createProgressForEnrollment(courseId: string, enrollmentId: string): Promise<void> {
    const user = await firstValueFrom(this.authService.currentUser$);
    if (!user) return;

    const q = query(
      this.progressCollection,
      where('studentId', '==', user.uid),
      where('courseId', '==', courseId)
    );

    const existing = await firstValueFrom(collectionData(q, { idField: 'id' }));
    if (existing && existing.length > 0) return; // already exists

    await addDoc(this.progressCollection, {
      studentId: user.uid,
      courseId,
      enrollmentId,
      completedLessons: [],
      completedQuizzes: {},
      overallProgress: 0,
      timeSpent: 0,
      lastUpdated: serverTimestamp()
    });
  }

  async markLessonCompleted(courseId: string, lessonId: string): Promise<void> {
    const user = await firstValueFrom(this.authService.currentUser$);
    if (!user) return;

    const q = query(
      this.progressCollection,
      where('studentId', '==', user.uid),
      where('courseId', '==', courseId)
    );

    const progresses: any[] = await firstValueFrom(collectionData(q, { idField: 'id' }));
    if (!progresses || progresses.length === 0) return;

    const progress = progresses[0];
    const ref = doc(this.firestore, `progress/${progress.id}`);

    // Prevent duplicates
    if ((progress.completedLessons || []).includes(lessonId)) return;

    // Get total lessons count to calculate progress
    const course = await firstValueFrom(this.courseService.getCourseById(courseId));
    let totalLessons = 0;
    if (course?.lessons && course.lessons.length > 0) {
      totalLessons = course.lessons.length;
    } else {
      // Try to get lessons from lesson service
      const courseLessons = await firstValueFrom(this.lessonService.getLessonsByCourse(courseId));
      totalLessons = courseLessons.length;
    }

    const completedLessons = [...(progress.completedLessons || []), lessonId];
    const overallProgress = totalLessons > 0 
      ? Math.round((completedLessons.length / totalLessons) * 100)
      : progress.overallProgress || 0;

    await updateDoc(ref, {
      completedLessons: arrayUnion(lessonId),
      overallProgress: overallProgress,
      lastUpdated: serverTimestamp()
    });
  }

  isLessonCompleted(courseId: string, lessonId: string): boolean {
    // Keep simple: encourage using `getCourseProgress` observable for reactive checks.
    return false;
  }

  // =========================
  // GET ALL STUDENT PROGRESS FOR A COURSE (TEACHER VIEW)
  // =========================
  getCourseStudentProgress(courseId: string): Observable<any[]> {
    const q = query(
      this.progressCollection,
      where('courseId', '==', courseId)
    );

    return collectionData(q, { idField: 'id' }).pipe(
      switchMap((progresses: any[]) => {
        if (progresses.length === 0) return of([]);

        // Get student user data for each progress
        const studentQueries = progresses.map(progress => {
          const studentRef = doc(this.firestore, `users/${progress.studentId}`);
          return docData(studentRef).pipe(
            map(studentData => ({
              ...progress,
              studentName: studentData ? `${studentData['firstName'] || ''} ${studentData['lastName'] || ''}`.trim() : 'Unknown Student',
              studentEmail: studentData?.['email'] || ''
            }))
          );
        });

        return combineLatest(studentQueries);
      }),
      catchError(() => of([]))
    );
  }
}