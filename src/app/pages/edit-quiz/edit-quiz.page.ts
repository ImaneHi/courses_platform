import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { IonicModule, ToastController, LoadingController, AlertController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { LessonService } from '../../services/lesson.service';
import { Lesson, Quiz, QuizQuestion } from '../../services/course.model';

@Component({
  selector: 'app-edit-quiz',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule],
  templateUrl: './edit-quiz.page.html',
  styleUrls: ['./edit-quiz.page.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class EditQuizPage implements OnInit {
  
  lessonId: string = '';
  courseId: string = '';
  lessonTitle: string = '';
  lesson: Lesson | null = null;
  quiz: Quiz | null = null;
  
  quizForm!: FormGroup;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private lessonService: LessonService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    this.lessonId = this.route.snapshot.queryParamMap.get('lessonId') || '';
    this.courseId = this.route.snapshot.queryParamMap.get('courseId') || '';
    this.lessonTitle = this.route.snapshot.queryParamMap.get('lessonTitle') || '';
    
    this.initQuizForm();
    this.loadLesson();
  }

  // =========================
  // INITIALIZATION
  // =========================
  initQuizForm() {
    this.quizForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      passingScore: [70, [Validators.required, Validators.min(1), Validators.max(100)]],
      timeLimit: [30, [Validators.required, Validators.min(1)]],
      maxAttempts: [3, [Validators.required, Validators.min(1)]],
      questions: this.fb.array([])
    });
  }

  loadLesson() {
    this.lessonService.getLessonById(this.lessonId).subscribe(lesson => {
      if (lesson) {
        this.lesson = lesson;
        this.quiz = lesson.quiz || null;
        
        if (this.quiz) {
          this.populateQuizForm();
        }
      } else {
        this.showToast('Lesson not found', 'danger');
        this.goBack();
      }
    });
  }

  populateQuizForm() {
    if (!this.quiz) return;

    this.quizForm.patchValue({
      title: this.quiz.title,
      description: this.quiz.description,
      passingScore: this.quiz.passingScore,
      timeLimit: this.quiz.timeLimit,
      maxAttempts: this.quiz.maxAttempts
    });

    // Clear existing questions
    this.questionsArray.clear();

    // Add questions
    this.quiz.questions.forEach(question => {
      this.questionsArray.push(this.createQuestionGroup(question));
    });
  }

  // =========================
  // FORM ACCESSORS
  // =========================
  get questionsArray(): FormArray {
    return this.quizForm.get('questions') as FormArray;
  }

  createQuestionGroup(question?: QuizQuestion): FormGroup {
    return this.fb.group({
      id: [question?.id || `q${Date.now()}`],
      question: [question?.question || '', Validators.required],
      options: this.fb.array(question?.options || ['', '', '', ''], Validators.required),
      correctAnswer: [question?.correctAnswer || 0, Validators.required],
      explanation: [question?.explanation || ''],
      points: [question?.points || 1, [Validators.required, Validators.min(1)]]
    });
  }

  getOptionsArray(questionIndex: number): FormArray {
    return this.questionsArray.at(questionIndex).get('options') as FormArray;
  }

  getQuestionControl(questionIndex: number): FormControl {
    return this.questionsArray.at(questionIndex).get('question') as FormControl;
  }

  getPointsControl(questionIndex: number): FormControl {
    return this.questionsArray.at(questionIndex).get('points') as FormControl;
  }

  getCorrectAnswerControl(questionIndex: number): FormControl {
    return this.questionsArray.at(questionIndex).get('correctAnswer') as FormControl;
  }

  getExplanationControl(questionIndex: number): FormControl {
    return this.questionsArray.at(questionIndex).get('explanation') as FormControl;
  }

  // =========================
  // QUESTION MANAGEMENT
  // =========================
  addQuestion() {
    this.questionsArray.push(this.createQuestionGroup());
  }

  removeQuestion(index: number) {
    this.questionsArray.removeAt(index);
  }

  addOption(questionIndex: number) {
    const optionsArray = this.getOptionsArray(questionIndex);
    if (optionsArray.length < 6) { // Limit to 6 options
      optionsArray.push(this.fb.control(''));
    }
  }

  removeOption(questionIndex: number, optionIndex: number) {
    const optionsArray = this.getOptionsArray(questionIndex);
    if (optionsArray.length > 4) { // Minimum 4 options
      optionsArray.removeAt(optionIndex);
    }
  }

  // =========================
  // QUIZ MANAGEMENT
  // =========================
  async saveQuiz() {
    if (!this.quizForm.valid) {
      this.showToast('Please fill all required fields', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Saving quiz...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const quizData: Quiz = {
        id: this.quiz?.id || `quiz_${Date.now()}`,
        title: this.quizForm.value.title,
        description: this.quizForm.value.description,
        passingScore: this.quizForm.value.passingScore,
        timeLimit: this.quizForm.value.timeLimit,
        maxAttempts: this.quizForm.value.maxAttempts,
        questions: this.quizForm.value.questions.map((q: any, index: number) => ({
          id: q.id || `q${index + 1}`,
          question: q.question,
          options: q.options.filter((opt: string) => opt.trim() !== ''),
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          points: q.points
        })).filter((q: QuizQuestion) => q.question && q.options.length >= 4),
        createdAt: this.quiz?.createdAt || new Date()
      };

      await this.lessonService.updateLessonQuiz(this.lessonId, quizData);
      
      this.showToast('Quiz saved successfully!', 'success');
      this.goBack();
      
    } catch (error: any) {
      console.error('Quiz save error:', error);
      this.showToast(error.message || 'Failed to save quiz', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  async deleteQuiz() {
    if (!this.quiz) return;

    const alert = await this.alertCtrl.create({
      header: 'Delete Quiz',
      message: 'Are you sure you want to delete this quiz? This action cannot be undone.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            await this.performDeleteQuiz();
          }
        }
      ]
    });

    await alert.present();
  }

  async performDeleteQuiz() {
    const loading = await this.loadingCtrl.create({
      message: 'Deleting quiz...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.lessonService.removeQuizFromLesson(this.lessonId);
      this.showToast('Quiz deleted successfully!', 'success');
      this.goBack();
    } catch (error: any) {
      console.error('Delete error:', error);
      this.showToast(error.message || 'Failed to delete quiz', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // =========================
  // VALIDATION
  // =========================
  validateQuiz(): boolean {
    const questions = this.quizForm.value.questions;
    
    if (!questions || questions.length === 0) {
      this.showToast('Quiz must have at least one question', 'warning');
      return false;
    }

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      
      if (!question.question || question.question.trim() === '') {
        this.showToast(`Question ${i + 1} is missing text`, 'warning');
        return false;
      }

      if (!question.options || question.options.length < 4) {
        this.showToast(`Question ${i + 1} must have at least 4 options`, 'warning');
        return false;
      }

      const validOptions = question.options.filter((opt: string) => opt.trim() !== '');
      if (validOptions.length < 4) {
        this.showToast(`Question ${i + 1} must have at least 4 valid options`, 'warning');
        return false;
      }

      if (question.correctAnswer < 0 || question.correctAnswer >= validOptions.length) {
        this.showToast(`Question ${i + 1} has invalid correct answer`, 'warning');
        return false;
      }
    }

    return true;
  }

  // =========================
  // HELPERS
  // =========================
  goBack() {
    this.router.navigate(['/manage-lessons'], {
      queryParams: {
        courseId: this.courseId,
        courseTitle: this.lessonTitle
      }
    });
  }

  getTotalPoints(): number {
    return this.quizForm.value.questions.reduce((total: number, q: any) => total + (q.points || 0), 0);
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
