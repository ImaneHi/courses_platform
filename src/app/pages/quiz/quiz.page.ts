import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { LessonService } from '../../services/lesson.service';
import { Quiz } from '../../services/course.model';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './quiz.page.html',
  styleUrls: ['./quiz.page.scss'],
})
export class QuizPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  quiz: Quiz | null = null;
  lessonId: string = '';
  courseId: string = '';

  isLoading = true;
  quizCompleted = false;
  currentQuestionIndex = 0;
  answers: number[] = [];
  timeRemaining = 0;
  private timer: any;
  score = 0;
  passed = false;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private lessonService: LessonService
  ) {}

  ngOnInit() {
    // Route param currently represents the lesson id (the quiz is stored under lesson.quiz)
    this.lessonId = this.route.snapshot.paramMap.get('quizId') || '';
    this.courseId = this.route.snapshot.queryParamMap.get('courseId') || '';

    if (!this.lessonId) {
      this.router.navigate(['/courses']);
      return;
    }

    this.loadQuiz();
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadQuiz() {
    this.isLoading = true;
    this.lessonService
      .getLessonById(this.lessonId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (lesson) => {
          const quiz = (lesson as any)?.quiz as Quiz | undefined | null;

          if (!quiz || !quiz.questions || quiz.questions.length === 0) {
            this.quiz = null;
            this.isLoading = false;
            // No quiz found for this lesson; go back to course.
            this.router.navigate(['/courses', this.courseId]);
            return;
          }

          // Ensure required fields exist
          this.quiz = {
            ...quiz,
            id: quiz.id || this.lessonId,
            title: quiz.title || 'Quiz',
            passingScore: quiz.passingScore ?? 70,
            createdAt: quiz.createdAt ? new Date(quiz.createdAt as any) : new Date()
          };

          this.answers = new Array(this.quiz.questions.length).fill(-1);
          this.timeRemaining = (this.quiz.timeLimit || 30) * 60;
          this.startTimer();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load quiz from lesson:', err);
          this.quiz = null;
          this.isLoading = false;
          this.router.navigate(['/courses', this.courseId]);
        }
      });
  }

  startTimer() {
    this.timer = setInterval(() => {
      if (this.timeRemaining > 0) {
        this.timeRemaining--;
      } else {
        this.submitQuiz();
      }
    }, 1000);
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  nextQuestion() {
    if (this.quiz && this.currentQuestionIndex < this.quiz.questions.length - 1) {
      this.currentQuestionIndex++;
    }
  }

  previousQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }
  }

  selectAnswer(questionIndex: number, answerIndex: number) {
    // ion-radio values can come through as strings; normalize to number
    const normalized = typeof answerIndex === 'string' ? parseInt(answerIndex as any, 10) : answerIndex;
    this.answers[questionIndex] = Number.isFinite(normalized as any) ? (normalized as any) : -1;
  }

  getProgress(): number {
    if (!this.quiz) return 0;
    const answered = this.answers.filter(a => a !== -1).length;
    return answered / this.quiz.questions.length;
  }

  submitQuiz() {
    if (this.answers.includes(-1)) {
      alert('Please answer all questions');
      return;
    }

    if (this.timer) clearInterval(this.timer);

    if (this.quiz) {
      let correct = 0;
      this.quiz.questions.forEach((q, i) => {
        const correctAnswer = typeof (q as any).correctAnswer === 'string'
          ? parseInt((q as any).correctAnswer, 10)
          : Number((q as any).correctAnswer);
        const chosen = typeof (this.answers[i] as any) === 'string'
          ? parseInt(this.answers[i] as any, 10)
          : Number(this.answers[i]);

        if (Number.isFinite(correctAnswer) && Number.isFinite(chosen) && correctAnswer === chosen) {
          correct++;
        }
      });
      this.score = (correct / this.quiz.questions.length) * 100;
      this.passed = this.score >= this.quiz.passingScore;
      this.quizCompleted = true;
    }
  }

  isAnswerCorrect(index: number): boolean {
    if (!this.quiz) return false;
    const correctAnswer = typeof (this.quiz.questions[index] as any).correctAnswer === 'string'
      ? parseInt((this.quiz.questions[index] as any).correctAnswer, 10)
      : Number((this.quiz.questions[index] as any).correctAnswer);
    const chosen = typeof (this.answers[index] as any) === 'string'
      ? parseInt(this.answers[index] as any, 10)
      : Number(this.answers[index]);

    return Number.isFinite(correctAnswer) && Number.isFinite(chosen) && correctAnswer === chosen;
  }
}