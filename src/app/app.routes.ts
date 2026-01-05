import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then(m => m.HomePage)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'courses',
    loadComponent: () => import('./pages/courses/courses.page').then(m => m.CoursesPage)
  },
  {
    path: 'course/:id',
    loadComponent: () => import('./pages/course-detail/course-detail.page').then(m => m.CourseDetailPage)
  },
  {
    path: 'student-dashboard',
    canActivate: [AuthGuard, RoleGuard],
    data: { role: 'student' },
    loadComponent: () => import('./pages/dashboard/student-dashboard/student-dashboard.page')
      .then(m => m.StudentDashboardPage)
  },
  {
    path: 'teacher-dashboard',
    canActivate: [AuthGuard, RoleGuard],
    data: { role: 'teacher' },
    loadComponent: () => import('./pages/dashboard/teacher-dashboard/teacher-dashboard.page')
      .then(m => m.TeacherDashboardPage)
  },
  {
    path: 'my-courses',
    canActivate: [AuthGuard, RoleGuard],
    data: { role: 'student' },
    loadComponent: () => import('./pages/enrollments/enrollments.page').then(m => m.EnrollmentsPage)
  },
  {
    path: 'upload',
    canActivate: [AuthGuard, RoleGuard],
    data: { role: 'teacher' },
    loadComponent: () => import('./pages/upload/upload.page').then(m => m.UploadPage)
  },
  {
    path: 'quiz/:quizId',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/quiz/quiz.page').then(m => m.QuizPage)
  }
];