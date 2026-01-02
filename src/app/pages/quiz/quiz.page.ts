import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { CourseService } from '../../services/course.service';
import { Quiz } from '../../services/course.model';
import { ProgressService } from '../../services/progress.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-quiz',
  templateUrl: './quiz.page.html',
  styleUrls: ['./quiz.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class QuizPage implements OnInit {
  quiz: Quiz | undefined;
  courseId: number = 0;
  currentQuestionIndex: number = 0;
  answers: number[] = [];
  timeRemaining: number = 0;
  quizCompleted: boolean = false;
  score: number = 0;
  passed: boolean = false;
  timer: any;
  isLoading: boolean = true;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private courseService: CourseService,
    private progressService: ProgressService,
    private authService: AuthService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    const quizId = Number(this.route.snapshot.paramMap.get('quizId'));
    // courseId might be passed as a route param or a query param
    const courseIdParam = this.route.snapshot.paramMap.get('courseId');
    const courseIdQuery = this.route.snapshot.queryParamMap.get('courseId');
    this.courseId = Number(courseIdParam || courseIdQuery || 0);

    if (quizId && this.courseId) {
      this.loadQuiz(quizId);
    } else if (quizId) {
      // allow quiz page to load without courseId (some usages)
      this.loadQuiz(quizId);
    } else {
      this.showError('Invalid quiz ID');
    }
  }

  loadQuiz(quizId: number) {
    this.courseService.getQuizById(quizId).subscribe(quiz => {
      if (quiz) {
        this.quiz = quiz;
        this.answers = new Array(quiz.questions.length).fill(-1);
        this.timeRemaining = (quiz.timeLimit || 30) * 60; // Convert to seconds
        this.startTimer();
        this.isLoading = false;
      } else {
        this.showError('Quiz not found');
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

  selectAnswer(questionIndex: number, answerIndex: number) {
    this.answers[questionIndex] = answerIndex;
  }

  nextQuestion() {
    if (this.currentQuestionIndex < (this.quiz?.questions.length || 0) - 1) {
      this.currentQuestionIndex++;
    }
  }

  previousQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }
  }

  async submitQuiz() {
    if (!this.quiz) return;

    clearInterval(this.timer);

    // Check if all questions are answered
    const unansweredQuestions = this.answers.filter(answer => answer === -1).length;
    if (unansweredQuestions > 0) {
      const alert = await this.alertController.create({
        header: 'Unanswered Questions',
        message: `You have ${unansweredQuestions} unanswered questions. Are you sure you want to submit?`,
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Submit Anyway',
            handler: () => this.completeQuiz()
          }
        ]
      });
      await alert.present();
    } else {
      await this.completeQuiz();
    }
  }

  async completeQuiz() {
    if (!this.quiz) return;

    const result = this.courseService.calculateQuizScore(this.quiz, this.answers);
    this.score = result.score;
    this.passed = result.passed;
    this.quizCompleted = true;

    // Save progress
    const currentUser = this.authService.currentUserValue;
    if (currentUser) {
      this.progressService.submitQuiz(
        currentUser.id,
        this.courseId,
        this.quiz.id,
        this.score,
        this.quiz.passingScore
      ).subscribe();

      // Show result
      await this.showQuizResult();
    }
  }

  async showQuizResult() {
    const message = this.passed 
      ? `Congratulations! You passed with a score of ${this.score}%.`
      : `You scored ${this.score}%. You need ${this.quiz?.passingScore}% to pass.`;

    const alert = await this.alertController.create({
      header: this.passed ? 'Quiz Passed!' : 'Quiz Failed',
      message,
      buttons: [
        {
          text: 'Review Answers',
          handler: () => {
            // Stay on the page to review answers
          }
        },
        {
          text: 'Back to Course',
          handler: () => {
            this.router.navigate(['/course-detail', this.courseId]);
          }
        }
      ]
    });
    await alert.present();
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getProgress(): number {
    if (!this.quiz) return 0;
    const answered = this.answers.filter(answer => answer !== -1).length;
    return (answered / this.quiz.questions.length) * 100;
  }

  isAnswerCorrect(questionIndex: number): boolean {
    if (!this.quiz) return false;
    return this.answers[questionIndex] === this.quiz.questions[questionIndex].correctAnswer;
  }

  async showError(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger'
    });
    await toast.present();
    this.router.navigate(['/courses']);
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}
