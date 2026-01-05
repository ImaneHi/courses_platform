import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { Subject, of } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';

import { AuthService, AppUser } from '../../../services/auth.service';
import { CourseService } from '../../../services/course.service';
import { Course } from '../../../services/course.model';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  templateUrl: './teacher-dashboard.page.html',
  styleUrls: ['./teacher-dashboard.page.scss'],
  imports: [CommonModule, IonicModule, RouterModule]
})
export class TeacherDashboardPage implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // ✅ variables utilisées 
  teacherCourses: Course[] = [];
  selectedCourseId: string | null = null;
  studentProgress: any[] = [];
  isLoadingProgress = false;

  constructor(
    private authService: AuthService,
    private courseService: CourseService
  ) {}

  ngOnInit() {
    this.authService.currentUser$
      .pipe(
        takeUntil(this.destroy$),
        switchMap((user: AppUser | null) => {
          if (user && user.role === 'teacher') {
           
            return this.courseService.getTeacherCourses();
          }
          return of([]);
        })
      )
      .subscribe(courses => {
        this.teacherCourses = courses;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =======================
  // ACTIONS
  // =======================

  viewCourse(courseId: string) {
    // navigation via routerLink
  }

  viewStudentProgress(courseId: string) {
    this.selectedCourseId = courseId;
    this.isLoadingProgress = true;

   
    setTimeout(() => {
      this.studentProgress = [];
      this.isLoadingProgress = false;
    }, 800);
  }

  deleteCourse(courseId: string) {
    if (!confirm('Are you sure you want to delete this course?')) return;

    this.courseService.deleteCourse(courseId)
      .then(() => {
        this.teacherCourses =
          this.teacherCourses.filter(c => c.id !== courseId);
      })
      .catch(err => console.error(err));
  }

  // =======================
  // STATS (TEMP)
  // =======================

  getEnrolledCount(): number {
    return this.studentProgress.length;
  }

  getCompletedCount(): number {
    return this.studentProgress.filter(p => p.overallProgress === 100).length;
  }

  getAverageProgress(): number {
    if (!this.studentProgress.length) return 0;
    const total = this.studentProgress.reduce(
      (sum, p) => sum + p.overallProgress, 0
    );
    return Math.round(total / this.studentProgress.length);
  }

  getProgressStatus(progress: number): string {
    if (progress >= 80) return 'Excellent';
    if (progress >= 50) return 'Good';
    return 'Needs Improvement';
  }

  getProgressColor(progress: number): string {
    if (progress >= 80) return 'success';
    if (progress >= 50) return 'warning';
    return 'danger';
  }
}
