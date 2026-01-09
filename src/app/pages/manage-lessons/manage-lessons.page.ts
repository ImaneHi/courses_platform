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
import { Lesson, Quiz, QuizQuestion } from '../../services/course.model';

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
  
  // File upload properties
  uploadedFile: File | null = null;
  fileUploadUrl: string = '';
  
  // Quiz properties
  generatedQuiz: Quiz | null = null;
  isQuizModalOpen = false;
  validationResult: { isValid: boolean; message: string } | null = null;
  
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
    
    // Validate that courseId is provided
    if (!this.courseId) {
      console.error('No courseId provided to manage-lessons page');
      // Optionally redirect back to dashboard or show error
      return;
    }
    
    this.initLessonForm();
    this.loadLessons();
    
    // Clean up any lessons with empty courseId
    this.cleanupOrphanedLessons();
  }

  // =========================
  // INITIALIZATION
  // =========================
  initLessonForm() {
    this.lessonForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      content: [''],
      type: ['text', Validators.required],
      duration: [0, [Validators.required, Validators.min(1)]],
      order: [0],
      isFreePreview: [false],
      videoUrl: [''],
      documentUrl: ['']
    });

    // Update validation based on type
    this.lessonForm.get('type')?.valueChanges.subscribe(type => {
      const contentControl = this.lessonForm.get('content');
      const videoUrlControl = this.lessonForm.get('videoUrl');
      const documentUrlControl = this.lessonForm.get('documentUrl');
      
      if (type === 'text') {
        contentControl?.setValidators([Validators.required]);
        videoUrlControl?.clearValidators();
        documentUrlControl?.clearValidators();
      } else if (type === 'video') {
        contentControl?.clearValidators();
        videoUrlControl?.setValidators([Validators.required]);
        documentUrlControl?.clearValidators();
      } else if (type === 'document') {
        contentControl?.clearValidators();
        videoUrlControl?.clearValidators();
        documentUrlControl?.setValidators([Validators.required]);
      }
      
      contentControl?.updateValueAndValidity();
      videoUrlControl?.updateValueAndValidity();
      documentUrlControl?.updateValueAndValidity();
    });
  }

  loadLessons() {
    this.lessonService.getLessonsByCourse(this.courseId).subscribe({
      next: (lessons) => {
        this.lessons = lessons.sort((a, b) => a.order - b.order);
      },
      error: (error) => {
        console.error('Error loading lessons:', error);
        this.lessons = [];
      }
    });
  }

  private cleanupOrphanedLessons() {
    // Find and delete lessons with empty courseId
    this.lessonService.getLessonsByCourse('').subscribe(lessons => {
      if (lessons.length > 0) {
        console.log('Found orphaned lessons:', lessons.length);
        lessons.forEach(lesson => {
          if (lesson.id) {
            this.lessonService.deleteLesson(lesson.id).then(() => {
              console.log('Deleted orphaned lesson:', lesson.id);
            }).catch(error => {
              console.error('Error deleting orphaned lesson:', error);
            });
          }
        });
      }
    });
  }
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

    // Validate that courseId is provided
    if (!this.courseId) {
      this.showToast('Course ID is missing. Please navigate to this page from a course.', 'danger');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: this.selectedLesson ? 'Updating lesson...' : 'Creating lesson...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const lessonData: any = {
        ...this.lessonForm.value,
        courseId: this.courseId,
        order: this.selectedLesson ? this.selectedLesson.order : this.lessons.length
      };

      // Include generated quiz if it exists and was validated
      if (this.generatedQuiz) {
        lessonData.quiz = this.generatedQuiz;
      }

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
    const lessonContent = (lesson.content || lesson.description || lesson.title || '').trim();
    if (!lessonContent) {
      this.showToast('Please add lesson content or description before generating quiz', 'warning');
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
              lessonContent,
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

      // Try AI generation first, then fall back to mock if AI fails.
      const aiResponse = await firstValueFrom(this.aiQuizService.generateQuiz(request));

      if (aiResponse.success && aiResponse.quiz) {
        await this.lessonService.addQuizToLesson(lesson.id!, aiResponse.quiz);
        this.showToast('Quiz generated successfully!', 'success');
        this.loadLessons();
        return;
      }

      console.warn('AI quiz generation failed, falling back to mock:', aiResponse.error);
      const mockResponse = await firstValueFrom(this.aiQuizService.generateMockQuiz(request));

      if (mockResponse.success && mockResponse.quiz) {
        await this.lessonService.addQuizToLesson(lesson.id!, mockResponse.quiz);
        this.showToast('Quiz generated (fallback mode)', 'warning');
        this.loadLessons();
        return;
      }

      this.showToast(aiResponse.error || mockResponse.error || 'Failed to generate quiz', 'danger');
      
    } catch (error: any) {
      console.error('Quiz generation error:', error);

      // Last-resort fallback to mock on unexpected exceptions
      try {
        const request: QuizGenerationRequest = {
          lessonTitle: lesson.title,
          lessonContent: lesson.content || lesson.description || lesson.title,
          difficulty: options.difficulty,
          questionCount: options.questionCount,
          questionType: 'multiple-choice'
        };

        const mockResponse = await firstValueFrom(this.aiQuizService.generateMockQuiz(request));
        if (mockResponse.success && mockResponse.quiz) {
          await this.lessonService.addQuizToLesson(lesson.id!, mockResponse.quiz);
          this.showToast('Quiz generated (fallback mode)', 'warning');
          this.loadLessons();
        } else {
          this.showToast(error.message || 'Failed to generate quiz', 'danger');
        }
      } catch (fallbackError) {
        console.error('Fallback quiz generation also failed:', fallbackError);
        this.showToast(error.message || 'Failed to generate quiz', 'danger');
      }
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
        const uploadFolder = file.type.startsWith('video/') ? 'lessons/videos' : 'lessons/documents';
        const uploadedFile = await firstValueFrom(
          this.fileUploadService.uploadFile(file, uploadFolder)
        );

        const updateData: Partial<Lesson> = {
          videoUrl: file.type.startsWith('video/') ? uploadedFile.url : lesson.videoUrl,
          documentUrl: !file.type.startsWith('video/') ? uploadedFile.url : lesson.documentUrl,
          type: (file.type.startsWith('video/') ? 'video' : 'document') as 'video' | 'document'
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

  // =========================
  // FILE UPLOAD METHODS
  // =========================
  selectFile() {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    input?.click();
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const lessonType = this.lessonForm.value.type;
    if (lessonType === 'video' && !file.type.startsWith('video/')) {
      this.showToast('Please select a video file', 'danger');
      return;
    }
    if (lessonType === 'document' && file.type !== 'application/pdf') {
      this.showToast('Please select a PDF file', 'danger');
      return;
    }

    this.uploadedFile = file;
    
    // Upload file to server
    try {
      const loading = await this.loadingCtrl.create({
        message: 'Uploading file...',
        spinner: 'crescent'
      });
      await loading.present();

      const uploadPath = lessonType === 'video' ? 'lessons/videos' : 'lessons/documents';
      const result = await firstValueFrom(this.fileUploadService.uploadFile(file, uploadPath));
      
      this.fileUploadUrl = result.url;
      
      // Update form with file URL
      if (lessonType === 'video') {
        this.lessonForm.patchValue({ videoUrl: result.url });
      } else {
        this.lessonForm.patchValue({ documentUrl: result.url });
      }
      
      this.showToast('File uploaded successfully!', 'success');
      loading.dismiss();
    } catch (error) {
      console.error('File upload error:', error);
      this.showToast('Failed to upload file', 'danger');
    }
  }

  removeFile() {
    this.uploadedFile = null;
    this.fileUploadUrl = '';
    // Clear the file input
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (input) input.value = '';
    
    // Clear form URLs
    const lessonType = this.lessonForm.value.type;
    if (lessonType === 'video') {
      this.lessonForm.patchValue({ videoUrl: '' });
    } else {
      this.lessonForm.patchValue({ documentUrl: '' });
    }
  }

  // =========================
  // QUIZ METHODS
  // =========================
  async generateQuizForLesson() {
    const lessonTitle = this.lessonForm.value.title;
    const lessonContent = this.lessonForm.value.content || this.lessonForm.value.description || '';
    
    if (!lessonTitle && !lessonContent) {
      this.showToast('Please add lesson title or content before generating quiz', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Generating quiz with AI...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const quizRequest: QuizGenerationRequest = {
        lessonTitle,
        lessonContent: lessonContent || lessonTitle,
        difficulty: 'medium',
        questionCount: 5,
        questionType: 'multiple-choice'
      };

      // Try AI generation first
      const quizResponse = await firstValueFrom(this.aiQuizService.generateQuiz(quizRequest));

      if (quizResponse.success && quizResponse.quiz) {
        this.generatedQuiz = quizResponse.quiz;

        // If we're editing an existing lesson, persist immediately so students see it.
        if (this.selectedLesson?.id) {
          await this.lessonService.addQuizToLesson(this.selectedLesson.id, this.generatedQuiz);
          this.loadLessons();
        }

        await loading.dismiss();
        this.showToast(this.selectedLesson?.id ? 'Quiz generated and saved!' : 'Quiz generated successfully!', 'success');
        return;
      }

      // Any AI failure (403 forbidden, 401, 429, etc.) should fall back to mock.
      console.warn('AI quiz generation failed, falling back to mock:', quizResponse.error);
      const mockResponse = await firstValueFrom(this.aiQuizService.generateMockQuiz(quizRequest));

      if (mockResponse.success && mockResponse.quiz) {
        this.generatedQuiz = mockResponse.quiz;

        // If we're editing an existing lesson, persist immediately so students see it.
        if (this.selectedLesson?.id) {
          await this.lessonService.addQuizToLesson(this.selectedLesson.id, this.generatedQuiz);
          this.loadLessons();
        }

        await loading.dismiss();
        this.showToast(this.selectedLesson?.id ? 'Fallback quiz generated and saved!' : 'AI quiz unavailable — generated a fallback quiz instead.', 'warning');
        return;
      }

      await loading.dismiss();
      this.showToast(quizResponse.error || mockResponse.error || 'Failed to generate quiz. Please try again later.', 'danger');
      
    } catch (error: any) {
      console.error('Quiz generation error:', error);
      await loading.dismiss();
      
      // Fallback to mock quiz on any error
      try {
        const quizRequest: QuizGenerationRequest = {
          lessonTitle: this.lessonForm.value.title,
          lessonContent: this.lessonForm.value.content || this.lessonForm.value.title,
          difficulty: 'medium',
          questionCount: 5,
          questionType: 'multiple-choice'
        };
        
        const mockResponse = await firstValueFrom(this.aiQuizService.generateMockQuiz(quizRequest));
        if (mockResponse.success && mockResponse.quiz) {
          this.generatedQuiz = mockResponse.quiz;
          this.showToast('Quiz generated (using fallback mode)', 'warning');
          return;
        }
      } catch (fallbackError) {
        console.error('Fallback quiz generation also failed:', fallbackError);
      }
      
      this.showToast('Failed to generate quiz. Please try again later or create quiz manually.', 'danger');
    }
  }

  reviewQuiz() {
    this.isQuizModalOpen = true;
  }

  closeQuizModal() {
    this.isQuizModalOpen = false;
    this.validationResult = null;
  }

  addQuestion() {
    if (!this.generatedQuiz) {
      this.generatedQuiz = {
        id: '',
        title: 'Lesson Quiz',
        questions: [],
        passingScore: 70,
        createdAt: new Date()
      };
    }

    const newQuestion: QuizQuestion = {
      id: `q_${Date.now()}`,
      question: '',
      options: ['', '', '', '', ''],
      correctAnswer: 0,
      explanation: '',
      points: 1
    };

    this.generatedQuiz.questions.push(newQuestion);
  }

  editQuestion(index: number) {
    // Could open inline editing or a separate modal
    console.log('Edit question:', index);
  }

  deleteQuestion(index: number) {
    if (this.generatedQuiz?.questions) {
      this.generatedQuiz.questions.splice(index, 1);
    }
  }

  updateCorrectAnswer(questionIndex: number, event: any) {
    if (this.generatedQuiz?.questions && this.generatedQuiz.questions[questionIndex]) {
      // Find which option index this event refers to
      const optionIndex = Array.from(this.generatedQuiz.questions[questionIndex].options.entries()).findIndex(
        ([index, option]) => option === event.target.value
      );
      
      if (optionIndex !== -1) {
        this.generatedQuiz.questions[questionIndex].correctAnswer = optionIndex;
      }
    }
  }

  validateQuiz() {
    if (!this.generatedQuiz?.questions || this.generatedQuiz.questions.length === 0) {
      this.validationResult = {
        isValid: false,
        message: 'Quiz must have at least one question'
      };
      return;
    }

    let validQuestions = 0;
    const errors: string[] = [];

    this.generatedQuiz.questions.forEach((question, index) => {
      // Check if question has text
      if (!question.question.trim()) {
        errors.push(`Question ${index + 1} is missing text`);
        return;
      }

      // Check if question has at least 2 options
      const validOptions = question.options.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        errors.push(`Question ${index + 1} needs at least 2 options`);
        return;
      }

      // Check if correct answer is valid
      if (question.correctAnswer < 0 || question.correctAnswer >= question.options.length) {
        errors.push(`Question ${index + 1} must have a valid correct answer`);
        return;
      }

      validQuestions++;
    });

    if (errors.length > 0) {
      this.validationResult = {
        isValid: false,
        message: `Validation errors:\n${errors.join('\n')}`
      };
    } else {
      this.validationResult = {
        isValid: true,
        message: `Quiz is valid! ${validQuestions} questions validated successfully.`
      };
      
      // Attach quiz to lesson form
      this.lessonForm.patchValue({ quiz: this.generatedQuiz });
      this.showToast('Quiz validated and attached to lesson!', 'success');
    }
  }
}
