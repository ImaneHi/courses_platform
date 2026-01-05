import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService, AppUser } from '../../../services/auth.service';
import { CourseService } from '../../../services/course.service';
import { ProgressService } from '../../../services/progress.service';
import { Course } from '../../../services/course.model';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  templateUrl: './student-dashboard.page.html',
  styleUrls: ['./student-dashboard.page.scss'],
  imports: [CommonModule, IonicModule, RouterModule],
})
export class StudentDashboardPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentUser: AppUser | null = null;
  enrolledCourses: Course[] = [];
  isLoading = true;

  constructor(
    private authService: AuthService,
    private courseService: CourseService,
    private progressService: ProgressService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        if (user) {
          this.loadEnrolledCourses(user.uid);
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEnrolledCourses(studentId: string) {
    this.isLoading = true;
    this.courseService.getStudentCourses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (courses) => {
          this.enrolledCourses = courses;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading enrolled courses:', error);
          this.isLoading = false;
        }
      });
  }

 viewCourse(courseId?: string) {
  if (!courseId) return;
  this.router.navigate(['/course', courseId]);
}
 takeQuiz(courseId?: string, quizId?: string) {
  if (!courseId || !quizId) return;
  this.router.navigate(['/quiz', quizId], { queryParams: { courseId } });
}

  canTakeQuiz(courseId?: string, quizId?: string): boolean {
  if (!courseId || !quizId) return false;
  return true;
}

  isQuizCompleted(courseId?: string, quizId?: string): boolean {
  if (!courseId || !quizId) return false;
  return false;
}

getQuizScore(courseId?: string, quizId?: string): number {
  if (!courseId || !quizId) return 0;
  return 0;
}

 getProgressForCourse(courseId?: string): any | null {
  if (!courseId) return null;
  return { overallProgress: 0 }; // TODO: remplace par ton vrai service
}

 getProgressForCourseSafe(courseId?: string): any {
  return this.getProgressForCourse(courseId) || { overallProgress: 0 };
}
  getProgressColor(progress: number): string {
    if (progress >= 80) return 'success';
    if (progress >= 50) return 'warning';
    return 'danger';
  }
}