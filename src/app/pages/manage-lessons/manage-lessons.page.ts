import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, ToastController, LoadingController, AlertController, ModalController } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { LessonService } from '../../services/lesson.service';
import { AiQuizService, QuizGenerationRequest } from '../../services/ai-quiz.service';
import { FileUploadService } from '../../services/file-upload.service';
import { Lesson, Quiz } from '../../services/course.model';

@Component({
  selector: 'app-manage-lessons',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule],
  templateUrl: './manage-lessons.page.html',
  styleUrls: ['./manage-lessons.page.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ManageLessonsPage implements OnInit {
  
  courseId: string = '';
  courseTitle: string = '';
  lessons: Lesson[] = [];
  
  isCreatingLesson = false;
  selectedLesson: Lesson | null = null;
  
  lessonForm!: FormGroup;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private lessonService: LessonService,
    private aiQuizService: AiQuizService,
    private fileUploadService: FileUploadService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    this.courseId = this.route.snapshot.paramMap.get('courseId') || '';
    this.courseTitle = this.route.snapshot.queryParamMap.get('courseTitle') || '';
    
    this.initLessonForm();
    this.loadLessons();
  }

  // =========================
  // INITIALIZATION
  // =========================
  initLessonForm() {
    this.lessonForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      content: ['', Validators.required],
      type: ['text', Validators.required],
      duration: [0, [Validators.required, Validators.min(1)]],
      order: [0],
      isFreePreview: [false],
      videoUrl: [''],
      documentUrl: ['']
    });
  }

  loadLessons() {
    this.lessonService.getLessonsByCourse(this.courseId).subscribe(lessons => {
      this.lessons = lessons.sort((a, b) => a.order - b.order);
    });
  }

  // =========================
  // LESSON MANAGEMENT
  // =========================
  startCreatingLesson() {
    this.isCreatingLesson = true;
    this.selectedLesson = null;
    this.initLessonForm();
  }

  editLesson(lesson: Lesson) {
    this.selectedLesson = lesson;
    this.isCreatingLesson = false;
    this.lessonForm.patchValue({
      title: lesson.title,
      description: lesson.description,
      content: lesson.content,
      type: lesson.type,
      duration: lesson.duration,
      order: lesson.order,
      isFreePreview: lesson.isFreePreview,
      videoUrl: lesson.videoUrl,
      documentUrl: lesson.documentUrl
    });
  }

  async saveLesson() {
    if (!this.lessonForm.valid) {
      this.showToast('Please fill all required fields', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: this.selectedLesson ? 'Updating lesson...' : 'Creating lesson...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const lessonData = {
        ...this.lessonForm.value,
        courseId: this.courseId,
        order: this.selectedLesson ? this.selectedLesson.order : this.lessons.length
      };

      if (this.selectedLesson) {
        await this.lessonService.updateLesson(this.selectedLesson.id!, lessonData);
        this.showToast('Lesson updated successfully!', 'success');
      } else {
        await this.lessonService.createLesson(lessonData);
        this.showToast('Lesson created successfully!', 'success');
      }

      this.cancelLessonEdit();
      this.loadLessons();
      
    } catch (error: any) {
      console.error('Lesson save error:', error);
      this.showToast(error.message || 'Failed to save lesson', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  cancelLessonEdit() {
    this.isCreatingLesson = false;
    this.selectedLesson = null;
    this.initLessonForm();
  }

  async deleteLesson(lesson: Lesson) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Lesson',
      message: `Are you sure you want to delete "${lesson.title}"? This action cannot be undone.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            await this.performDeleteLesson(lesson);
          }
        }
      ]
    });

    await alert.present();
  }

  async performDeleteLesson(lesson: Lesson) {
    const loading = await this.loadingCtrl.create({
      message: 'Deleting lesson...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.lessonService.deleteLesson(lesson.id!);
      this.showToast('Lesson deleted successfully!', 'success');
      this.loadLessons();
    } catch (error: any) {
      console.error('Delete error:', error);
      this.showToast(error.message || 'Failed to delete lesson', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // =========================
  // QUIZ MANAGEMENT
  // =========================
  async generateQuiz(lesson: Lesson) {
    if (!lesson.content) {
      this.showToast('Lesson content is required to generate quiz', 'warning');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Generate Quiz',
      inputs: [
        {
          name: 'questionCount',
          type: 'number',
          placeholder: 'Number of questions',
          value: 5,
          min: 1,
          max: 20
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Generate',
          handler: (data) => {
            const request: QuizGenerationRequest = {
              lessonTitle: lesson.title,
              lessonContent: lesson.content,
              difficulty: 'medium',
              questionCount: data.questionCount || 5,
              questionType: 'multiple-choice'
            };
            this.performQuizGeneration(lesson, request);
          }
        }
      ]
    });

    await alert.present();
  }

  async performQuizGeneration(lesson: Lesson, options: any) {
    const loading = await this.loadingCtrl.create({
      message: 'Generating quiz with AI...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const request: QuizGenerationRequest = {
        lessonTitle: lesson.title,
        lessonContent: lesson.content,
        difficulty: options.difficulty,
        questionCount: options.questionCount,
        questionType: 'multiple-choice'
      };

      // Use mock quiz generation for testing (replace with real AI call when API key is available)
      const response = await firstValueFrom(this.aiQuizService.generateMockQuiz(request));
      
      if (response.success && response.quiz) {
        await this.lessonService.addQuizToLesson(lesson.id!, response.quiz);
        this.showToast('Quiz generated successfully!', 'success');
        this.loadLessons();
      } else {
        this.showToast(response.error || 'Failed to generate quiz', 'danger');
      }
      
    } catch (error: any) {
      console.error('Quiz generation error:', error);
      this.showToast(error.message || 'Failed to generate quiz', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  editQuiz(lesson: Lesson) {
    // Navigate to quiz editing page
    this.router.navigate(['/edit-quiz'], {
      queryParams: {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        courseId: this.courseId
      }
    });
  }

  async removeQuiz(lesson: Lesson) {
    const alert = await this.alertCtrl.create({
      header: 'Remove Quiz',
      message: 'Are you sure you want to remove the quiz from this lesson?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Remove',
          role: 'destructive',
          handler: async () => {
            await this.performRemoveQuiz(lesson);
          }
        }
      ]
    });

    await alert.present();
  }

  async performRemoveQuiz(lesson: Lesson) {
    const loading = await this.loadingCtrl.create({
      message: 'Removing quiz...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.lessonService.removeQuizFromLesson(lesson.id!);
      this.showToast('Quiz removed successfully!', 'success');
      this.loadLessons();
    } catch (error: any) {
      console.error('Remove quiz error:', error);
      this.showToast(error.message || 'Failed to remove quiz', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // =========================
  // FILE UPLOAD
  // =========================
  async uploadFile(lesson: Lesson) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.mp4,.mov';

    input.onchange = async (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (!target.files || target.files.length === 0) return;

      const file = target.files[0];
      const loading = await this.loadingCtrl.create({
        message: 'Uploading file...',
        spinner: 'crescent'
      });
      await loading.present();

      try {
        const uploadedFile = await firstValueFrom(
          this.fileUploadService.uploadFile(file, 'lessons')
        );

        const updateData = {
          videoUrl: file.type.startsWith('video/') ? uploadedFile.url : lesson.videoUrl,
          documentUrl: !file.type.startsWith('video/') ? uploadedFile.url : lesson.documentUrl,
          type: file.type.startsWith('video/') ? 'video' : 
                file.type.includes('pdf') || file.type.includes('document') ? 'document' : lesson.type
        };

        await this.lessonService.updateLesson(lesson.id!, updateData);
        this.showToast('File uploaded successfully!', 'success');
        this.loadLessons();
        
      } catch (error: any) {
        console.error('File upload error:', error);
        this.showToast(error.message || 'Failed to upload file', 'danger');
      } finally {
        await loading.dismiss();
      }
    };

    input.click();
  }

  // =========================
  // HELPERS
  // =========================
  getLessonIcon(type: string): string {
    switch (type) {
      case 'video': return 'videocam-outline';
      case 'document': return 'document-text-outline';
      case 'text': return 'book-outline';
      case 'quiz': return 'help-circle-outline';
      default: return 'book-outline';
    }
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    toast.present();
  }
}
