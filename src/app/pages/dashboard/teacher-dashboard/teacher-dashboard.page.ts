import { Component, OnInit } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { CourseService } from 'src/app/services/course.service';
import { AuthService } from 'src/app/services/auth.service';
import { Course } from 'src/app/services/course.model';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule],
  templateUrl: './teacher-dashboard.page.html',
  styleUrls: ['./teacher-dashboard.page.scss'],
})
export class TeacherDashboardPage implements OnInit {
  teacherCourses: Course[] = [];
  currentTeacherId: number | undefined;

  constructor(
    private courseService: CourseService,
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.currentTeacherId = this.authService.currentUserValue?.id;
    if (this.currentTeacherId) {
      this.loadTeacherCourses();
    }
  }

  loadTeacherCourses() {
    if (this.currentTeacherId) {
      this.courseService.getTeacherCourses(this.currentTeacherId).subscribe(courses => {
        this.teacherCourses = courses;
      });
    }
  }

  viewCourse(id: number) {
    this.router.navigate(['/course-detail', id]);
  }

  editCourse(id: number) {
    // Navigate to a dedicated edit course page or a modal
    // For now, let's just log it
    console.log('Edit course:', id);
    // this.router.navigate(['/edit-course', id]);
  }

  async deleteCourse(id: number) {
    const toast = await this.toastController.create({
      message: 'Course deleted successfully!',
      duration: 2000,
      color: 'success'
    });
    this.courseService.deleteCourse(id).subscribe(success => {
      if (success) {
        toast.present();
        this.loadTeacherCourses(); // Reload courses after deletion
      } else {
        toast.message = 'Failed to delete course.';
        toast.color = 'danger';
        toast.present();
      }
    });
  }

  navigateToUpload() {
    this.router.navigate(['/upload']);
  }
}