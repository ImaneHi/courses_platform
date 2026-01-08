import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit
} from '@angular/fire/firestore';

import { Observable, of, combineLatest, firstValueFrom } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

import { Course, CourseFile } from '../services/course.model';
import { AuthService, AppUser } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class CourseService {

  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  private coursesCol = collection(this.firestore, 'courses');
  private enrollmentsCol = collection(this.firestore, 'enrollments');

  // =========================
  // GET ALL COURSES
  // =========================
  getAllCourses(): Observable<Course[]> {
    const q = query(this.coursesCol, orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Course[]>;
  }

  // =========================
  // GET COURSE BY ID
  // =========================
  getCourseById(courseId: string): Observable<Course | null> {
    const ref = doc(this.firestore, `courses/${courseId}`);
    return docData(ref, { idField: 'id' }).pipe(
      map(data => data as Course),
      catchError(() => of(null))
    );
  }

  // =========================
  // TEACHER COURSES
  // =========================
  getTeacherCourses(): Observable<Course[]> {
    return this.authService.currentUser$.pipe(
      switchMap((user: AppUser | null) => {
        if (!user || user.role !== 'teacher') {
          return of([]);
        }

        const q = query(
          this.coursesCol,
          where('teacherId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        return collectionData(q, { idField: 'id' }) as Observable<Course[]>;
      })
    );
  }

  // =========================
  // STUDENT COURSES
  // =========================
  getStudentCourses(): Observable<Course[]> {
    return this.authService.currentUser$.pipe(
      switchMap((user: AppUser | null) => {
        if (!user || user.role !== 'student') {
          return of([]);
        }

        const q = query(
          this.enrollmentsCol,
          where('studentId', '==', user.uid)
        );

        return collectionData(q, { idField: 'id' }).pipe(
          switchMap((enrollments: any[]) => {
            if (!enrollments.length) return of([]);

            const ids: string[] = enrollments.map(e => e.courseId);

            return combineLatest(
              ids.map(id => this.getCourseById(id))
            ).pipe(
              map(courses => courses.filter(Boolean) as Course[])
            );
          })
        );
      })
    );
  }

  // =========================
  // CREATE COURSE (TEACHER)
  // =========================
  async createCourse(data: Partial<Course>): Promise<string> {
    console.log('createCourse called with data:', data);

    const user = await firstValueFrom(this.authService.currentUser$);
    console.log('Current user:', user);

    if (!user || user.role !== 'teacher') {
      console.error('Unauthorized - user is not a teacher');
      throw new Error('Unauthorized');
    }

    const course: Course = {
      title: data.title ?? '',
      description: data.description ?? '',
      teacherId: user.uid,
      teacherName: `${user.firstName} ${user.lastName}`,
      price: data.price ?? 0,
      coverImage: data.coverImage ?? '',
      category: data.category ?? '',
      level: data.level ?? 'beginner',
      duration: data.duration ?? 0,
      tags: data.tags ?? [],
      files: data.files ?? [],
      lessons: data.lessons ?? [],
      isPublished: true,
      rating: 0,
      totalStudents: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('Final course object to be saved:', course);

    try {
      const ref = await addDoc(this.coursesCol, course);
      console.log('Course saved successfully with ID:', ref.id);
      return ref.id;
    } catch (error) {
      console.error('Error saving course to Firestore:', error);
      throw error;
    }
  }

  // =========================
  // UPDATE COURSE
  // =========================
  async updateCourse(courseId: string, data: Partial<Course>): Promise<void> {
    await updateDoc(doc(this.firestore, `courses/${courseId}`), {
      ...data,
      updatedAt: new Date()
    });
  }

  // =========================
  // DELETE COURSE
  // =========================
  async deleteCourse(courseId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `courses/${courseId}`));
  }

  // =========================
  // ENROLL STUDENT
  // =========================
  async enroll(courseId: string): Promise<void> {

    const user = await firstValueFrom(this.authService.currentUser$);

    if (!user || user.role !== 'student') {
      throw new Error('Only students can enroll');
    }

    await addDoc(this.enrollmentsCol, {
      studentId: user.uid,
      courseId,
      enrolledAt: new Date()
    });
  }

  // =========================
  // POPULAR COURSES
  // =========================
  getPopularCourses(limitCount = 6): Observable<Course[]> {
    const q = query(
      this.coursesCol,
      orderBy('totalStudents', 'desc'),
      limit(limitCount)
    );

    return collectionData(q, { idField: 'id' }) as Observable<Course[]>;
  }
}
