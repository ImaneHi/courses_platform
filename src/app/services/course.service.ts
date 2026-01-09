import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  getDoc,
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

import { Course, CourseFile, Enrollment } from '../services/course.model';
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
  // GET ALL COURSES (PUBLISHED ONLY)
  // =========================
  getAllCourses(): Observable<Course[]> {
    // Query without orderBy to avoid index requirement
    // We'll sort in memory instead
    const q = query(
      this.coursesCol,
      where('isPublished', '==', true)
    );
    return (collectionData(q, { idField: 'id' }) as Observable<Course[]>).pipe(
      map(courses => {
        // Sort by createdAt in descending order (newest first)
        return courses.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 
                       (a.createdAt instanceof Date ? a.createdAt.getTime() : 
                       (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : 0));
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 
                       (b.createdAt instanceof Date ? b.createdAt.getTime() : 
                       (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : 0));
          return dateB - dateA; // Descending order
        });
      })
    );
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

        // Query without orderBy to avoid index requirement
        // We'll sort in memory instead
        const q = query(
          this.coursesCol,
          where('teacherId', '==', user.uid)
        );

        return (collectionData(q, { idField: 'id' }) as Observable<Course[]>).pipe(
          map(courses => {
            // Sort by createdAt in descending order (newest first)
            return courses.sort((a, b) => {
              const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 
                           (a.createdAt instanceof Date ? a.createdAt.getTime() : 
                           (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : 0));
              const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 
                           (b.createdAt instanceof Date ? b.createdAt.getTime() : 
                           (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : 0));
              return dateB - dateA; // Descending order
            });
          }),
          catchError(error => {
            console.error('Error fetching teacher courses:', error);
            return of([]);
          })
        );
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
            if (!enrollments || enrollments.length === 0) {
              console.log('No enrollments found for student:', user.uid);
              return of([]);
            }

            console.log('Found enrollments:', enrollments.length, enrollments);
            const ids: string[] = enrollments.map(e => e.courseId).filter(Boolean);

            if (ids.length === 0) {
              return of([]);
            }

            return combineLatest(
              ids.map(id => this.getCourseById(id))
            ).pipe(
              map(courses => {
                const validCourses = courses.filter(Boolean) as Course[];
                console.log('Loaded courses from enrollments:', validCourses.length);
                return validCourses;
              }),
              catchError(error => {
                console.error('Error loading courses from enrollments:', error);
                return of([]);
              })
            );
          }),
          catchError(error => {
            console.error('Error fetching enrollments:', error);
            return of([]);
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
  async enroll(courseId: string): Promise<string> {

    const user = await firstValueFrom(this.authService.currentUser$);

    if (!user || user.role !== 'student') {
      throw new Error('Only students can enroll');
    }

    // Check if already enrolled
    const existingEnrollments = await firstValueFrom(
      collectionData(
        query(
          this.enrollmentsCol,
          where('studentId', '==', user.uid),
          where('courseId', '==', courseId)
        ),
        { idField: 'id' }
      )
    );

    if (existingEnrollments.length > 0) {
      throw new Error('You are already enrolled in this course');
    }

    // Get course data to include teacherId in enrollment
    const courseRef = doc(this.firestore, `courses/${courseId}`);
    const courseSnap = await getDoc(courseRef);

    if (!courseSnap.exists()) {
      throw new Error('Course not found');
    }

    const courseData = courseSnap.data() as any;
    const teacherId = courseData.teacherId || '';

    // Create enrollment document in Firestore with teacherId
    const enrollmentData = {
      studentId: user.uid,
      courseId,
      teacherId: teacherId, // Include teacherId so teachers can query enrollments
      enrolledAt: new Date(),
      status: 'active' as const,
      createdAt: new Date()
    };

    const ref = await addDoc(this.enrollmentsCol, enrollmentData);
    console.log('Enrollment created with ID:', ref.id);

    // Update course totalStudents count
    const currentTotal = courseData.totalStudents || 0;
    try {
      await updateDoc(courseRef, {
        totalStudents: currentTotal + 1,
        updatedAt: new Date()
      });
      console.log('Course student count updated to:', currentTotal + 1);
    } catch (error) {
      // Firestore rules often prevent students from updating course documents.
      // Enrollment is already created; don't fail the whole flow for this.
      console.warn('Could not update course student count (continuing):', error);
    }

    return ref.id;
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

  // =========================
  // GET ENROLLMENTS FOR COURSE
  // =========================
  getCourseEnrollments(courseId: string): Observable<Enrollment[]> {
    const q = query(
      this.enrollmentsCol,
      where('courseId', '==', courseId)
    );
    return collectionData(q, { idField: 'id' }) as Observable<Enrollment[]>;
  }

  // =========================
  // GET ALL ENROLLMENTS FOR TEACHER'S COURSES
  // =========================
  getTeacherEnrollments(): Observable<Enrollment[]> {
    return this.authService.currentUser$.pipe(
      switchMap((user: AppUser | null) => {
        if (!user || user.role !== 'teacher') {
          return of([]);
        }

        // Query enrollments where teacherId matches
        const q = query(
          this.enrollmentsCol,
          where('teacherId', '==', user.uid)
        );

        return collectionData(q, { idField: 'id' }) as Observable<Enrollment[]>;
      })
    );
  }

  // =========================
  // GET ENROLLMENTS FOR A SPECIFIC COURSE
  // =========================
  getCourseEnrollmentsForTeacher(courseId: string): Observable<Enrollment[]> {
    return this.authService.currentUser$.pipe(
      switchMap((user: AppUser | null) => {
        if (!user || user.role !== 'teacher') {
          return of([]);
        }

        const q = query(
          this.enrollmentsCol,
          where('courseId', '==', courseId),
          where('teacherId', '==', user.uid)
        );

        return collectionData(q, { idField: 'id' }) as Observable<Enrollment[]>;
      })
    );
  }
}
