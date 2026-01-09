import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';

import { AuthService, AppUser } from '../../../services/auth.service';
import { CourseService } from '../../../services/course.service';
import { StatisticsService, TeacherStatistics } from '../../../services/statistics.service';
import { ProgressService } from '../../../services/progress.service';
import { LessonService } from '../../../services/lesson.service';
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
  statistics: TeacherStatistics = {
    totalStudents: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    totalLessons: 0
  };
  currentUser: AppUser | null = null;
  isLoading = true;
  
  // Add lesson counts map for tracking
  private lessonCounts: Map<string, number> = new Map();

  constructor(
    private authService: AuthService,
    private courseService: CourseService,
    private statisticsService: StatisticsService,
    private progressService: ProgressService,
    private lessonService: LessonService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    // Load current user
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });

    // Load statistics
    this.statisticsService.getTeacherStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.statistics = stats;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading statistics:', error);
          this.statistics = {
            totalStudents: 0,
            totalCourses: 0,
            totalEnrollments: 0,
            totalLessons: 0
          };
          this.isLoading = false;
        }
      });

    // Load courses
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
        // Load lesson counts for all courses
        this.loadLessonCounts();
      });

    // Check for courseId query parameter
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['courseId']) {
          this.viewStudentProgress(params['courseId']);
        }
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

  viewEnrollments(courseId: string) {
    // Show enrollments for this course in the same view
    this.viewStudentProgress(courseId);
  }

  viewStudentProgress(courseId: string) {
    this.selectedCourseId = courseId;
    this.isLoadingProgress = true;
    this.studentProgress = [];

    if (!courseId) {
      this.isLoadingProgress = false;
      return;
    }

    this.progressService.getCourseStudentProgress(courseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (progress) => {
          this.studentProgress = progress;
          this.isLoadingProgress = false;
        },
        error: (error) => {
          console.error('Error loading student progress:', error);
          this.isLoadingProgress = false;
        }
      });
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

  getLessonCount(courseId: string): number {
    return this.lessonCounts.get(courseId) || 0;
  }
  
  private loadLessonCounts() {
    if (this.teacherCourses.length === 0) return;
    
    this.teacherCourses.forEach(course => {
      if (course.id!) {
        this.lessonService.getLessonsByCourse(course.id!).subscribe(lessons => {
          this.lessonCounts.set(course.id!, lessons.length);
        });
      }
    });
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

  getCompletedQuizzesCount(progress: any): number {
    if (!progress.completedQuizzes) return 0;
    return Object.keys(progress.completedQuizzes).length;
  }
}
