import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Subject, of } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';

import { AuthService, AppUser } from '../../services/auth.service';
import { CourseService } from '../../services/course.service';
import { ProgressService } from '../../services/progress.service';
import { Course } from '../../services/course.model';

@Component({
  selector: 'app-teacher-courses',
  standalone: true,
  templateUrl: './teacher-courses.page.html',
  styleUrls: ['./teacher-courses.page.scss'],
  imports: [CommonModule, IonicModule, RouterModule]
})
export class TeacherCoursesPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  courses: Course[] = [];
  isLoading = true;
  currentUser: AppUser | null = null;

  constructor(
    private authService: AuthService,
    private courseService: CourseService,
    private progressService: ProgressService,
    private alertController: AlertController,
    private router: Router
  ) {}

  ngOnInit() {
    // Load current user
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
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
      .subscribe({
        next: (courses) => {
          this.courses = courses;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading courses:', error);
          this.isLoading = false;
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

  async viewCourse(courseId: string) {
    // Navigation handled by routerLink
  }

  async viewLessons(courseId: string, courseTitle: string) {
    // Navigate to manage lessons page
    this.router.navigate(['/manage-lessons'], {
      queryParams: { courseId, courseTitle }
    });
  }

  async viewProgress(courseId: string) {
    // Navigate to teacher dashboard with course selected
    this.router.navigate(['/teacher-dashboard'], {
      queryParams: { courseId }
    });
  }

  async editCourse(courseId: string) {
    // For now, navigate to course detail page
    // In the future, this could be a dedicated edit page
    this.router.navigate(['/course', courseId]);
  }

  async deleteCourse(courseId: string) {
    const alert = await this.alertController.create({
      header: 'Delete Course',
      message: 'Are you sure you want to delete this course? This action cannot be undone.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              await this.courseService.deleteCourse(courseId);
              this.courses = this.courses.filter(c => c.id !== courseId);
            } catch (error) {
              console.error('Error deleting course:', error);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  getCourseImage(course: Course): string {
    return course.coverImage || 'assets/icon/favicon.png';
  }
}

