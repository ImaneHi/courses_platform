import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService, AppUser } from '../../services/auth.service';
import { CourseService } from '../../services/course.service';
import { Course, Enrollment } from '../../services/course.model';

@Component({
  selector: 'app-teacher-enrollments',
  standalone: true,
  templateUrl: './teacher-enrollments.page.html',
  styleUrls: ['./teacher-enrollments.page.scss'],
  imports: [CommonModule, IonicModule, RouterModule, TitleCasePipe]
})
export class TeacherEnrollmentsPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentUser: AppUser | null = null;
  enrollments: Enrollment[] = [];
  courseId: string | null = null;
  course: Course | null = null;
  isLoading = true;
  selectedCourseId: string | null = null;

  constructor(
    private authService: AuthService,
    private courseService: CourseService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });

    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.selectedCourseId = params['courseId'] || null;
        this.loadEnrollments();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEnrollments() {
    this.isLoading = true;

    if (this.selectedCourseId) {
      // Load enrollments for a specific course
      this.courseService.getCourseById(this.selectedCourseId)
        .pipe(takeUntil(this.destroy$))
        .subscribe(course => {
          this.course = course;
        });

      this.courseService.getCourseEnrollments(this.selectedCourseId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (enrollments) => {
            this.enrollments = enrollments;
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Error loading enrollments:', error);
            this.isLoading = false;
          }
        });
    } else {
      // Load all enrollments for teacher's courses
      this.courseService.getTeacherEnrollments()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (enrollments) => {
            this.enrollments = enrollments;
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Error loading enrollments:', error);
            this.isLoading = false;
          }
        });
    }
  }

  getEnrollmentDate(enrollment: Enrollment): string {
    if (!enrollment.enrolledAt) return 'Unknown';
    const date = enrollment.enrolledAt instanceof Date 
      ? enrollment.enrolledAt 
      : (enrollment.enrolledAt as any)?.toDate 
        ? (enrollment.enrolledAt as any).toDate()
        : new Date(enrollment.enrolledAt);
    return date.toLocaleDateString();
  }

  getEnrollmentStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'primary';
      case 'cancelled': return 'danger';
      default: return 'medium';
    }
  }

  getActiveEnrollmentsCount(): number {
    if (!this.enrollments || this.enrollments.length === 0) return 0;
    return this.enrollments.filter(e => (e.status || 'active') === 'active').length;
  }

  getCompletedEnrollmentsCount(): number {
    if (!this.enrollments || this.enrollments.length === 0) return 0;
    return this.enrollments.filter(e => e.status === 'completed').length;
  }
}

