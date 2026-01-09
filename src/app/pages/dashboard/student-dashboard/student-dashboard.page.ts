import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService, AppUser } from '../../../services/auth.service';
import { CourseService } from '../../../services/course.service';
import { ProgressService } from '../../../services/progress.service';
import { LessonService } from '../../../services/lesson.service';
import { Course } from '../../../services/course.model';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  templateUrl: './student-dashboard.page.html',
  styleUrls: ['./student-dashboard.page.scss'],
  imports: [CommonModule, IonicModule, RouterModule, TitleCasePipe],
})
export class StudentDashboardPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentUser: AppUser | null = null;
  enrolledCourses: Course[] = [];
  courseProgressMap: { [courseId: string]: any } = {};
  isLoading = true;

  constructor(
    private authService: AuthService,
    private courseService: CourseService,
    private progressService: ProgressService,
    private lessonService: LessonService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        if (user) {
          this.loadEnrolledCourses();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEnrolledCourses() {
    this.isLoading = true;
    this.courseService.getStudentCourses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (courses) => {
          this.enrolledCourses = courses;
          this.isLoading = false;
          
          // Load progress for each enrolled course
          courses.forEach(course => {
            const courseId = course.id;
            if (courseId) {
              this.progressService.getCourseProgress(courseId)
                .pipe(takeUntil(this.destroy$))
                .subscribe(progress => {
                  if (progress && courseId) {
                    // Calculate overall progress if not set
                    if (!progress.overallProgress && course.lessons) {
                      const totalLessons = course.lessons.length;
                      const completedLessons = progress.completedLessons?.length || 0;
                      progress.overallProgress = totalLessons > 0 
                        ? Math.round((completedLessons / totalLessons) * 100)
                        : 0;
                    }
                    this.courseProgressMap[courseId] = progress;
                  }
                });
            }
          });
        },
        error: (error) => {
          console.error('Error loading enrolled courses:', error);
          this.isLoading = false;
        }
      });
  }

  viewCourse(courseId: string) {
    if (!courseId) return;
    this.router.navigate(['/course', courseId]);
  }

  getProgressColor(progress: number): string {
    if (progress >= 80) return 'success';
    if (progress >= 50) return 'warning';
    return 'danger';
  }
}