import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Course, Lesson } from '../../services/course.model';
import { CourseService } from '../../services/course.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth.service';
import { ProgressService } from 'src/app/services/progress.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ModalController } from '@ionic/angular';
import { DocumentViewerComponent } from 'src/app/components/document-viewer/document-viewer.component';

@Component({
  selector: 'app-course-detail',
  templateUrl: './course-detail.page.html',
  styleUrls: ['./course-detail.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class CourseDetailPage implements OnInit {
  course: Course | undefined;
  isStudent: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    private authService: AuthService,
    private toastController: ToastController
    ,
    private progressService: ProgressService,
    private sanitizer: DomSanitizer
    ,
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {
    this.isStudent = this.authService.isStudent();
    this.loadCourseDetails();
  }

  loadCourseDetails() {
    const courseId = this.route.snapshot.paramMap.get('id');
    if (courseId) {
      this.courseService.getCourseById(+courseId).subscribe(course => {
        this.course = course;
      });
    }
  }

  // For rendering selected lesson content (video iframe, document link, etc.)
  selectedLesson: Lesson | null = null;
  videoUrlSafe: SafeResourceUrl | null = null;

  openLesson(lesson: Lesson) {
    // If lesson content is a URL (video or document), handle accordingly
    this.selectedLesson = lesson;

    if (lesson.type === 'video') {
      // Assume lesson.content is a video URL (YouTube/embed link). Sanitize for iframe.
      this.videoUrlSafe = this.sanitizer.bypassSecurityTrustResourceUrl(lesson.content);
    } else {
      this.videoUrlSafe = null;
      // For documents, open in new tab
      if (lesson.type === 'document') {
        // Open modal viewer
        const raw = lesson.content;
        const safe = this.sanitizer.bypassSecurityTrustResourceUrl(raw);
        this.presentDocumentModal(safe, raw, lesson.title);
      }
    }
  }

  async presentDocumentModal(url: SafeResourceUrl | string, rawUrl: string, title?: string) {
    const modal = await this.modalCtrl.create({
      component: DocumentViewerComponent,
      componentProps: { url, rawUrl, title }
    });
    await modal.present();
  }

  closeLesson() {
    this.selectedLesson = null;
    this.videoUrlSafe = null;
  }

  async markLessonCompleted(lessonId: number) {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser || !this.course) return;

    this.progressService.markLessonCompleted(currentUser.id, this.course.id, lessonId).subscribe(async progress => {
      const toast = await this.toastController.create({ message: 'Lesson marked completed', duration: 1500, color: 'success' });
      toast.present();
    });
  }

  isLessonCompleted(lessonId: number): boolean {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser || !this.course) return false;
    return this.progressService.isLessonCompleted(currentUser.id, this.course.id, lessonId);
  }

  takeQuiz(quizId: number) {
    if (!quizId || !this.course) return;
    this.router.navigate(['/quiz', quizId], { queryParams: { courseId: this.course.id } });
  }

  async enroll() {
    if (this.course && this.isStudent) {
      this.courseService.enrollCourse(this.course.id).subscribe(async success => {
        if (success) {
          await this.presentToast('Enrolled successfully!', 'success');
          // Optionally update the course object or navigate
          if (this.course) {
            this.course.enrolled = true;
            const currentUser = this.authService.currentUserValue;
            if (currentUser) {
              this.progressService.enrollStudent(currentUser.id, this.course.id).subscribe();
            }
          }
        } else {
          await this.presentToast('Failed to enroll. Please try again.', 'danger');
        }
      });
    } else if (!this.isStudent) {
      await this.presentToast('Only students can enroll in courses.', 'warning');
    }
  }

  async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: color
    });
    toast.present();
  }
}