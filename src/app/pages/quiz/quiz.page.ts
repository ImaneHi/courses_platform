import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CourseService } from '../../services/course.service';
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
  quizId: string = '';
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
    private courseService: CourseService
  ) {}

  ngOnInit() {
    this.quizId = this.route.snapshot.paramMap.get('quizId') || '';
    this.courseId = this.route.snapshot.queryParamMap.get('courseId') || '';

    if (!this.quizId) {
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
    // Pour l'instant, créer un quiz mocké
    this.quiz = {
      id: this.quizId,
      title: 'Sample Quiz',
      description: 'This is a sample quiz',
      questions: [
        {
          id: '1',
          question: 'What is Angular?',
          options: ['A framework', 'A library', 'A programming language', 'An IDE'],
          correctAnswer: 0,
          points: 10
        },
        {
          id: '2',
          question: 'What is TypeScript?',
          options: ['A superset of JavaScript', 'A CSS framework', 'A database', 'A testing tool'],
          correctAnswer: 0,
          points: 10
        }
      ],
      passingScore: 70,
      timeLimit: 30,
      maxAttempts: 3,
      createdAt: new Date()
    };

    this.answers = new Array(this.quiz.questions.length).fill(-1);
    this.timeRemaining = (this.quiz.timeLimit || 30) * 60;
    this.startTimer();
    this.isLoading = false;
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
    this.answers[questionIndex] = answerIndex;
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
        if (q.correctAnswer === this.answers[i]) correct++;
      });
      this.score = (correct / this.quiz.questions.length) * 100;
      this.passed = this.score >= this.quiz.passingScore;
      this.quizCompleted = true;
    }
  }

  isAnswerCorrect(index: number): boolean {
    if (!this.quiz) return false;
    return this.answers[index] === this.quiz.questions[index].correctAnswer;
  }
}