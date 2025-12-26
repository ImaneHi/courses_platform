import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
    canActivate: [AuthGuard] // Protect home page
  },
  {
    path: '',
    redirectTo: 'login', // Always redirect to login if not authenticated, AuthGuard handles further redirection
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then( m => m.DashboardPage),
    canActivate: [AuthGuard] // Protect dashboard
  },
  {
    path: 'courses',
    loadComponent: () => import('./pages/courses/courses.page').then( m => m.CoursesPage),
    canActivate: [AuthGuard] // Protect courses page
  },
  {
    path: 'course-detail/:id',
    loadComponent: () => import('./pages/course-detail/course-detail.page').then( m => m.CourseDetailPage),
    canActivate: [AuthGuard] // Protect course detail page
  },
  {
    path: 'upload',
    loadComponent: () => import('./pages/upload/upload.page').then( m => m.UploadPage),
    canActivate: [AuthGuard, RoleGuard], // Only teachers can upload
    data: { role: 'teacher' }
  },
  {
    path: 'enrollments',
    loadComponent: () => import('./pages/enrollments/enrollments.page').then( m => m.EnrollmentsPage),
    canActivate: [AuthGuard, RoleGuard], // Only students can view their enrollments
    data: { role: 'student' }
  },
  {
    path: 'teacher-dashboard',
    loadComponent: () => import('./pages/dashboard/teacher-dashboard/teacher-dashboard.page').then( m => m.TeacherDashboardPage),
    canActivate: [AuthGuard, RoleGuard],
    data: { role: 'teacher' }
  },
  {
    path: 'student-dashboard',
    loadComponent: () => import('./pages/dashboard/student-dashboard/student-dashboard.page').then( m => m.StudentDashboardPage),
    canActivate: [AuthGuard, RoleGuard],
    data: { role: 'student' }
  },
];

