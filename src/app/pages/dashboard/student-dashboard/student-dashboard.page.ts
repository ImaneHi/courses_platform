import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { CourseService } from 'src/app/services/course.service';
import { ProgressService } from 'src/app/services/progress.service';
import { AuthService } from 'src/app/services/auth.service';
import { Course, StudentProgress } from 'src/app/services/course.model';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule],
  templateUrl: './student-dashboard.page.html',
  styleUrls: ['./student-dashboard.page.scss'],
})
export class StudentDashboardPage implements OnInit {
  enrolledCourses: Course[] = [];
  studentProgress: { [courseId: number]: StudentProgress } = {};
  currentStudentId: number | undefined;

  constructor(
    private courseService: CourseService,
    private progressService: ProgressService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.currentStudentId = this.authService.currentUserValue?.id;
    this.loadEnrolledCourses();
    this.loadStudentProgress();
  }

  loadEnrolledCourses() {
    this.courseService.getCourses().subscribe(allCourses => {
      // For now, filtering client-side. In a real app, backend would provide enrolled courses.
      this.enrolledCourses = allCourses.filter(course => course.enrolled);
    });
  }

  loadStudentProgress() {
    if (this.currentStudentId) {
      this.progressService.getEnrollments().subscribe(enrollments => {
        const studentEnrollments = enrollments.filter(e => e.studentId === this.currentStudentId);
        studentEnrollments.forEach(enrollment => {
          this.studentProgress[enrollment.courseId] = enrollment.progress;
        });
      });
    }
  }

  viewCourse(id: number) {
    this.router.navigate(['/course-detail', id]);
  }

  takeQuiz(courseId: number, quizId: number) {
    this.router.navigate(['/quiz', quizId], { queryParams: { courseId } });
  }

  getProgressForCourse(courseId: number): StudentProgress | undefined {
    return this.studentProgress[courseId];
  }

  getProgressForCourseSafe(courseId: number): StudentProgress {
    return this.studentProgress[courseId] || { 
      id: 0, 
      studentId: 0, 
      courseId: 0, 
      lessonsCompleted: [], 
      quizzesCompleted: [], 
      quizScores: {}, 
      overallProgress: 0, 
      courseCompleted: false 
    };
  }

  getProgressColor(progress: number): string {
    if (progress >= 80) return 'success';
    if (progress >= 50) return 'warning';
    return 'danger';
  }

  canTakeQuiz(courseId: number, quizId: number): boolean {
    const progress = this.getProgressForCourse(courseId);
    if (!progress) return false;
    
    // Check if quiz is already completed
    if (progress.quizzesCompleted.includes(quizId)) return false;
    
    // Prefer module-level rule: if quiz belongs to a module, require all lessons in that module completed
    const course = this.enrolledCourses.find(c => c.id === courseId);
    if (!course) return false;

    // Find module that has this quiz
    const moduleWithQuiz = course.modules.find(m => m.quiz?.id === quizId);
    if (moduleWithQuiz) {
      const moduleLessonIds = moduleWithQuiz.lessons.map(l => l.id);
      const allDone = moduleLessonIds.every(id => progress.lessonsCompleted.includes(id));
      return allDone;
    }

    // If not a module quiz, it might be the final quiz. Require course completion.
    if (course.finalQuiz?.id === quizId) {
      return progress.courseCompleted || progress.overallProgress >= 100;
    }

    return false;
  }

  isQuizCompleted(courseId: number, quizId: number): boolean {
    const progress = this.getProgressForCourse(courseId);
    return progress?.quizzesCompleted.includes(quizId) || false;
  }

  getQuizScore(courseId: number, quizId: number): number {
    const progress = this.getProgressForCourse(courseId);
    return progress?.quizScores[quizId] || 0;
  }

  private getTotalLessonsForCourse(courseId: number): number {
    const course = this.enrolledCourses.find(c => c.id === courseId);
    if (!course) return 0;
    
    return course.modules.reduce((total, module) => total + module.lessons.length, 0);
  }
}