import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then( m => m.DashboardPage)
  },
  {
    path: 'courses',
    loadComponent: () => import('./pages/courses/courses.page').then( m => m.CoursesPage)
  },
  {
    path: 'course-detail/:id',
    loadComponent: () => import('./pages/course-detail/course-detail.page').then( m => m.CourseDetailPage)
  },
  {
    path: 'upload',
    loadComponent: () => import('./pages/upload/upload.page').then( m => m.UploadPage)
  },
  {
    path: 'enrollments',
    loadComponent: () => import('./pages/enrollments/enrollments.page').then( m => m.EnrollmentsPage)
  },
  {
    path: 'teacher-dashboard',
    loadComponent: () => import('./pages/dashboard/teacher-dashboard/teacher-dashboard.page').then( m => m.TeacherDashboardPage)
  },
  {
    path: 'student-dashboard',
    loadComponent: () => import('./pages/dashboard/student-dashboard/student-dashboard.page').then( m => m.StudentDashboardPage)
  },
];
