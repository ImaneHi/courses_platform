import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController, ModalController } from '@ionic/angular';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Course, Lesson, CourseFile } from '../../services/course.model';
import { CourseService } from '../../services/course.service';
import { LessonService } from '../../services/lesson.service';
import { AuthService, AppUser } from '../../services/auth.service';
import { ProgressService } from '../../services/progress.service';
import { DocumentViewerComponent } from '../../components/document-viewer/document-viewer.component';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  templateUrl: './course-detail.page.html',
  styleUrls: ['./course-detail.page.scss'],
  imports: [CommonModule, IonicModule, RouterModule]
})
export class CourseDetailPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  course: Course | null = null;
  lessons: Lesson[] = [];
  selectedLesson: any = null;
  currentUser: AppUser | null = null;
  isStudent = false;
  isEnrolled = false;
  isLoading = true;
  private completedLessonIds = new Set<string>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    private lessonService: LessonService,
    private authService: AuthService,
    private progressService: ProgressService,
    private toastCtrl: ToastController,
    private modalCtrl: ModalController,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (!id) return;

      this.courseService.getCourseById(id).pipe(takeUntil(this.destroy$)).subscribe({
        next: (c) => {
          this.course = c;
          this.isLoading = false;
          // Load lessons for this course
          this.loadLessons(id);
          // Load progress for this course (used for completed badges + quiz unlocking)
          this.loadCourseProgress(id);
          // Check enrollment if student
          if (this.currentUser && this.currentUser.role === 'student') {
            this.checkEnrollmentStatus(id);
          }
        },
        error: (error) => {
          console.error('Error loading course:', error);
          this.isLoading = false;
        }
      });
    });

    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.currentUser = user;
      this.isStudent = !!user && user.role === 'student';
      if (user && user.role === 'student' && this.course?.id) {
        this.checkEnrollmentStatus(this.course.id);
        this.loadCourseProgress(this.course.id);
      }
    });
  }

  private loadCourseProgress(courseId: string) {
    if (!this.currentUser || this.currentUser.role !== 'student') {
      this.completedLessonIds = new Set();
      return;
    }

    this.progressService
      .getCourseProgress(courseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(progress => {
        const ids = (progress?.completedLessons || []).filter(Boolean);
        this.completedLessonIds = new Set(ids);
      });
  }

  loadLessons(courseId: string) {
    // First, try to load lessons from the separate collection
    this.lessonService.getLessonsByCourse(courseId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (lessons) => {
        if (lessons.length > 0) {
          this.lessons = lessons.sort((a, b) => a.order - b.order);
        } else {
          // If no lessons in separate collection, check embedded lessons in course document
          this.checkEmbeddedLessons();
        }
      },
      error: (error) => {
        console.error('Error loading lessons from collection:', error);
        // Fallback to embedded lessons
        this.checkEmbeddedLessons();
      }
    });
  }

  checkEmbeddedLessons() {
    // Check if lessons are embedded in the course document
    if (this.course?.lessons && this.course.lessons.length > 0) {
      this.lessons = this.course.lessons.sort((a, b) => a.order - b.order);
    } else {
      this.lessons = [];
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openLesson(lesson: any) {
    if (!lesson) {
      this.selectedLesson = null;
      return;
    }

    // Be resilient to older/incorrect lesson.type values.
    // If a file URL exists, prefer rendering that content.
    const normalized = { ...lesson };
    if (normalized.videoUrl) {
      normalized.type = 'video';
    } else if (normalized.documentUrl) {
      normalized.type = 'document';
    }

    this.selectedLesson = normalized;
  }

  closeLesson() {
    this.selectedLesson = null;
  }

  async enroll() {
    if (!this.course || !this.currentUser || this.currentUser.role !== 'student') return;

    try {
      const enrollmentId = await this.courseService.enroll(this.course.id!);

      // Create a progress document for the enrollment (if none exists)
      try {
        await this.progressService.createProgressForEnrollment(this.course.id!, enrollmentId);
      } catch (error) {
        // Enrollment is already created. If progress creation is blocked by rules,
        // don't fail the whole flow.
        console.warn('Could not create progress for enrollment (continuing):', error);
      }

      // Update enrollment status
      this.isEnrolled = true;

      const toast = await this.toastCtrl.create({
        message: 'Enrolled successfully!',
        duration: 2000,
        color: 'success'
      });
      await toast.present();

      // Navigate to student dashboard after a short delay
      setTimeout(() => {
        this.router.navigate(['/student-dashboard']);
      }, 2000);
    } catch (err: any) {
      const isPermissionDenied =
        err?.code === 'permission-denied' ||
        (typeof err?.message === 'string' && err.message.toLowerCase().includes('missing or insufficient permissions'));

      const toast = await this.toastCtrl.create({
        message: isPermissionDenied
          ? 'Enrollment failed due to Firestore permissions. Please deploy/update Firestore rules.'
          : (err.message || 'Enrollment failed'),
        duration: 3000,
        color: 'danger'
      });
      toast.present();
    }
  }

  async markLessonCompleted(id: string) {
    if (!this.course || !this.currentUser) return;
    try {
      await this.progressService.markLessonCompleted(this.course.id!, id);
      this.completedLessonIds.add(id);
    } catch (error) {
      console.error('Error marking lesson completed', error);
    }
  }

  isLessonCompleted(id: string) {
    if (!this.course || !this.currentUser) return false;
    return this.completedLessonIds.has(id);
  }

  isSelectedLessonCompleted(): boolean {
    const lessonId = this.selectedLesson?.id;
    if (!lessonId) return false;
    return this.completedLessonIds.has(lessonId);
  }

  takeQuiz(id: string) {
    if (!this.course || !id) return;
    this.router.navigate(['/quiz', id], { queryParams: { courseId: this.course.id } });
  }

  isTeacher(): boolean {
    return this.currentUser?.role === 'teacher';
  }

  checkEnrollmentStatus(courseId: string) {
    if (!this.currentUser || this.currentUser.role !== 'student') {
      return;
    }

    this.courseService.getStudentCourses()
      .pipe(takeUntil(this.destroy$))
      .subscribe(courses => {
        this.isEnrolled = courses.some(c => c.id === courseId);
      });
  }

  async viewFile(file: CourseFile) {
    if (!file) {
      this.showToast('File information is missing', 'danger');
      return;
    }

    // Get the file URL (might be relative or absolute)
    let fileUrl = file.url || '';
    
    // If URL doesn't start with http, construct server URL
    if (!fileUrl.startsWith('http')) {
      // Use path if available (format: "courses/filename")
      if (file.path) {
        // Remove leading slash if present
        const cleanPath = file.path.startsWith('/') ? file.path.substring(1) : file.path;
        fileUrl = `http://localhost:3001/uploads/${cleanPath}`;
      } else if (fileUrl && fileUrl.includes('/')) {
        // Extract path from URL if it's a relative path
        // Remove leading slash if present
        const cleanPath = fileUrl.startsWith('/') ? fileUrl.substring(1) : fileUrl;
        fileUrl = `http://localhost:3001/uploads/${cleanPath}`;
      } else if (file.name) {
        // Last resort: assume it's in courses folder
        fileUrl = `http://localhost:3001/uploads/courses/${file.name}`;
      } else {
        this.showToast('Unable to determine file location', 'danger');
        return;
      }
    }

    console.log('Opening file:', fileUrl);

    // Sanitize the URL for iframe
    const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(fileUrl);

    // Open document viewer modal
    const modal = await this.modalCtrl.create({
      component: DocumentViewerComponent,
      componentProps: {
        url: safeUrl,
        rawUrl: fileUrl,
        title: file.name || 'Document'
      },
      cssClass: 'document-viewer-modal',
      presentingElement: await this.modalCtrl.getTop()
    });

    await modal.present();
  }

  downloadFile(file: CourseFile) {
    if (!file) {
      this.showToast('File information is missing', 'danger');
      return;
    }

    let fileUrl = file.url || '';
    
    // If URL doesn't start with http, construct server URL
    if (!fileUrl.startsWith('http')) {
      if (file.path) {
        fileUrl = `http://localhost:3001/uploads/${file.path}`;
      } else if (fileUrl) {
        const filename = fileUrl.split('/').pop() || file.name;
        fileUrl = `http://localhost:3001/uploads/courses/${filename}`;
      } else if (file.name) {
        fileUrl = `http://localhost:3001/uploads/courses/${file.name}`;
      } else {
        this.showToast('Unable to determine file location', 'danger');
        return;
      }
    }

    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = file.name || 'download';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getFileIcon(mimeType: string): string {
    if (!mimeType) return 'document-outline';
    
    if (mimeType.includes('pdf')) return 'document-text-outline';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document-outline';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'document-outline';
    if (mimeType.includes('image')) return 'image-outline';
    if (mimeType.includes('video')) return 'videocam-outline';
    return 'document-outline';
  }

  formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color
    });
    toast.present();
  }
}
