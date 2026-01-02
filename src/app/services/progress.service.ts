import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { CourseEnrollment, StudentProgress, Course, Lesson, Quiz } from './course.model';
import { AuthService } from './auth.service';
import { CourseService } from './course.service';
import { HttpClient } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { apiConfig } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProgressService {
  private enrollments: CourseEnrollment[] = [];
  private enrollmentsSubject = new BehaviorSubject<CourseEnrollment[]>([]);

  constructor(private authService: AuthService, private http: HttpClient, private courseService: CourseService) {
    // Initialize with mock data
    this.initializeMockData();
  }

  private initializeMockData() {
    // Mock enrollment data for demonstration
    this.enrollments = [
      {
        id: 1,
        studentId: 2, // Student user ID
        courseId: 1,  // Angular Basics course
        enrolledAt: new Date('2024-01-15'),
        progress: {
          id: 1,
          studentId: 2,
          courseId: 1,
          lessonsCompleted: [1001], // Completed first lesson
          quizzesCompleted: [],
          quizScores: {},
          overallProgress: 25,
          courseCompleted: false
        }
      }
    ];
    this.enrollmentsSubject.next(this.enrollments);
  }

  getEnrollments(): Observable<CourseEnrollment[]> {
    const apiUrl = apiConfig.apiUrl;
    if (apiUrl) {
      return this.http.get<CourseEnrollment[]>(`${apiUrl}/enrollments`).pipe(
        map(list => {
          // update local store
          this.enrollments = list;
          this.enrollmentsSubject.next(this.enrollments);
          return list;
        }),
        catchError(() => this.enrollmentsSubject.asObservable())
      );
    }

    return this.enrollmentsSubject.asObservable();
  }

  enrollStudent(studentId: number, courseId: number): Observable<CourseEnrollment> {
    const apiUrl = apiConfig.apiUrl;
    const existing = this.enrollments.find(e => e.studentId === studentId && e.courseId === courseId);
    if (existing) {
      return of(existing);
    }

    if (apiUrl) {
      return this.http.post<CourseEnrollment>(`${apiUrl}/enrollments`, { studentId, courseId }).pipe(
        map(enrollment => {
          this.enrollments.push(enrollment);
          this.enrollmentsSubject.next([...this.enrollments]);
          return enrollment;
        }),
        catchError(() => {
          // fallback to mock
          const newEnrollment = this.createEnrollment(studentId, courseId);
          // ensure the course shows as enrolled in course list UI
          this.courseService.setEnrolled(courseId, true);
          this.enrollments.push(newEnrollment);
          this.enrollmentsSubject.next([...this.enrollments]);
          return of(newEnrollment);
        })
      );
    }

    const newEnrollment = this.createEnrollment(studentId, courseId);
    this.courseService.setEnrolled(courseId, true);
    this.enrollments.push(newEnrollment);
    this.enrollmentsSubject.next([...this.enrollments]);
    return of(newEnrollment);
  }

  getStudentProgress(studentId: number, courseId: number): Observable<StudentProgress | undefined> {
    const apiUrl = apiConfig.apiUrl;
    if (apiUrl) {
      return this.http.get<CourseEnrollment[]>(`${apiUrl}/enrollments?studentId=${studentId}&courseId=${courseId}`).pipe(
        map(list => list[0]?.progress),
        catchError(() => {
          const enrollment = this.enrollments.find(e => e.studentId === studentId && e.courseId === courseId);
          return of(enrollment?.progress);
        })
      );
    }

    const enrollment = this.enrollments.find(
      e => e.studentId === studentId && e.courseId === courseId
    );
    return of(enrollment?.progress);
  }

  getCourseProgress(courseId: number): Observable<StudentProgress[]> {
    const courseProgress = this.enrollments
      .filter(e => e.courseId === courseId)
      .map(e => e.progress);
    return of(courseProgress);
  }

  markLessonCompleted(studentId: number, courseId: number, lessonId: number): Observable<StudentProgress> {
    const apiUrl = apiConfig.apiUrl;
    if (apiUrl) {
      return this.http.post<StudentProgress>(`${apiUrl}/progress/lesson`, { studentId, courseId, lessonId }).pipe(
        catchError(() => {
          // Fallback to mock behavior
          return this.markLessonCompletedMock(studentId, courseId, lessonId);
        })
      );
    }

    return this.markLessonCompletedMock(studentId, courseId, lessonId);
  }

  submitQuiz(studentId: number, courseId: number, quizId: number, score: number, passingScore: number): Observable<StudentProgress> {
    const apiUrl = apiConfig.apiUrl;
    if (apiUrl) {
      return this.http.post<StudentProgress>(`${apiUrl}/progress/quiz`, { studentId, courseId, quizId, score, passingScore }).pipe(
        catchError(() => {
          return this.submitQuizMock(studentId, courseId, quizId, score, passingScore);
        })
      );
    }

    return this.submitQuizMock(studentId, courseId, quizId, score, passingScore);
  }

  private createEnrollment(studentId: number, courseId: number): CourseEnrollment {
    return {
      id: this.enrollments.length + 1,
      studentId,
      courseId,
      enrolledAt: new Date(),
      progress: {
        id: this.enrollments.length + 1,
        studentId,
        courseId,
        lessonsCompleted: [],
        quizzesCompleted: [],
        quizScores: {},
        overallProgress: 0,
        courseCompleted: false
      }
    };
  }

  private markLessonCompletedMock(studentId: number, courseId: number, lessonId: number): Observable<StudentProgress> {
    const enrollment = this.enrollments.find(
      e => e.studentId === studentId && e.courseId === courseId
    );

    if (enrollment) {
      if (!enrollment.progress.lessonsCompleted.includes(lessonId)) {
        enrollment.progress.lessonsCompleted.push(lessonId);
        this.updateOverallProgress(enrollment.progress);
      }
      this.enrollmentsSubject.next([...this.enrollments]);
      return of(enrollment.progress);
    }

    const newEnrollment = this.createEnrollment(studentId, courseId);
    newEnrollment.progress.lessonsCompleted.push(lessonId);
    this.updateOverallProgress(newEnrollment.progress);
    this.enrollments.push(newEnrollment);
    this.enrollmentsSubject.next([...this.enrollments]);
    return of(newEnrollment.progress);
  }

  private submitQuizMock(studentId: number, courseId: number, quizId: number, score: number, passingScore: number): Observable<StudentProgress> {
    const enrollment = this.enrollments.find(
      e => e.studentId === studentId && e.courseId === courseId
    );

    if (enrollment) {
      enrollment.progress.quizzesCompleted.push(quizId);
      enrollment.progress.quizScores[quizId] = score;
      if (score >= passingScore) {
        this.updateOverallProgress(enrollment.progress);
      }
      this.enrollmentsSubject.next([...this.enrollments]);
      return of(enrollment.progress);
    }

    const newEnrollment = this.createEnrollment(studentId, courseId);
    newEnrollment.progress.quizzesCompleted.push(quizId);
    newEnrollment.progress.quizScores[quizId] = score;
    this.updateOverallProgress(newEnrollment.progress);
    this.enrollments.push(newEnrollment);
    this.enrollmentsSubject.next([...this.enrollments]);
    return of(newEnrollment.progress);
  }

  private updateOverallProgress(progress: StudentProgress) {
    // This is a simplified calculation
    // In a real app, you'd calculate based on total lessons and quizzes in the course
    const totalItems = progress.lessonsCompleted.length + progress.quizzesCompleted.length;
    progress.overallProgress = Math.min(totalItems * 25, 100); // Simple calculation
    
    if (progress.overallProgress >= 100) {
      progress.courseCompleted = true;
      progress.completedAt = new Date();
    }
  }

  isLessonCompleted(studentId: number, courseId: number, lessonId: number): boolean {
    const enrollment = this.enrollments.find(
      e => e.studentId === studentId && e.courseId === courseId
    );
    return enrollment?.progress.lessonsCompleted.includes(lessonId) || false;
  }

  isQuizCompleted(studentId: number, courseId: number, quizId: number): boolean {
    const enrollment = this.enrollments.find(
      e => e.studentId === studentId && e.courseId === courseId
    );
    return enrollment?.progress.quizzesCompleted.includes(quizId) || false;
  }

  getQuizScore(studentId: number, courseId: number, quizId: number): number {
    const enrollment = this.enrollments.find(
      e => e.studentId === studentId && e.courseId === courseId
    );
    return enrollment?.progress.quizScores[quizId] || 0;
  }
}
