import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  query,
  where
} from '@angular/fire/firestore';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService, AppUser } from './auth.service';
import { CourseService } from './course.service';

export interface TeacherStatistics {
  totalStudents: number;
  totalCourses: number;
  totalEnrollments: number;
  totalLessons: number;
}

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private courseService = inject(CourseService);

  private enrollmentsCol = collection(this.firestore, 'enrollments');
  private coursesCol = collection(this.firestore, 'courses');

  // =========================
  // GET TEACHER STATISTICS
  // =========================
  getTeacherStatistics(): Observable<TeacherStatistics> {
    return this.authService.currentUser$.pipe(
      switchMap((user: AppUser | null) => {
        if (!user || user.role !== 'teacher') {
          return of({
            totalStudents: 0,
            totalCourses: 0,
            totalEnrollments: 0,
            totalLessons: 0
          });
        }

        return combineLatest([
          this.getTotalCourses(user.uid),
          this.getTotalEnrollments(user.uid),
          this.getTotalStudents(user.uid),
          this.getTotalLessons(user.uid)
        ]).pipe(
          map(([courses, enrollments, students, lessons]) => ({
            totalCourses: courses,
            totalEnrollments: enrollments,
            totalStudents: students,
            totalLessons: lessons
          }))
        );
      })
    );
  }

  // =========================
  // GET TOTAL COURSES
  // =========================
  private getTotalCourses(teacherId: string): Observable<number> {
    const q = query(
      this.coursesCol,
      where('teacherId', '==', teacherId)
    );
    
    return collectionData(q, { idField: 'id' }).pipe(
      map(courses => courses.length)
    );
  }

  // =========================
  // GET TOTAL ENROLLMENTS
  // =========================
  private getTotalEnrollments(teacherId: string): Observable<number> {
    // Firestore rules for enrollments allow teachers to read only documents where
    // resource.data.teacherId == request.auth.uid, so queries must include teacherId.
    const q = query(this.enrollmentsCol, where('teacherId', '==', teacherId));
    return collectionData(q, { idField: 'id' }).pipe(map(enrollments => enrollments.length));
  }

  // =========================
  // GET TOTAL STUDENTS (unique)
  // =========================
  private getTotalStudents(teacherId: string): Observable<number> {
    const q = query(this.enrollmentsCol, where('teacherId', '==', teacherId));
    return collectionData(q, { idField: 'id' }).pipe(
      map(enrollments => {
        const uniqueStudentIds = new Set(enrollments.map((e: any) => e.studentId));
        return uniqueStudentIds.size;
      })
    );
  }

  // =========================
  // GET TOTAL LESSONS
  // =========================
  private getTotalLessons(teacherId: string): Observable<number> {
    const lessonsCol = collection(this.firestore, 'lessons');
    
    return this.courseService.getTeacherCourses().pipe(
      switchMap(courses => {
        if (courses.length === 0) return of(0);
        
        const courseIds = courses.map(c => c.id!).filter(Boolean);
        if (courseIds.length === 0) return of(0);

        const lessonQueries = courseIds.map(courseId => {
          const q = query(
            lessonsCol,
            where('courseId', '==', courseId)
          );
          return collectionData(q, { idField: 'id' });
        });

        return combineLatest(lessonQueries).pipe(
          map(lessonArrays => {
            const allLessons = lessonArrays.flat();
            return allLessons.length;
          })
        );
      })
    );
  }
}

