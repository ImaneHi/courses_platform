import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Course } from '../../services/course.model';
import { CourseService } from '../../services/course.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-course-detail',
  templateUrl: './course-detail.page.html',
  styleUrls: ['./course-detail.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class CourseDetailPage implements OnInit {
  course: Course | undefined;
  isStudent: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    private authService: AuthService,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.isStudent = this.authService.isStudent();
    this.loadCourseDetails();
  }

  loadCourseDetails() {
    const courseId = this.route.snapshot.paramMap.get('id');
    if (courseId) {
      this.courseService.getCourseById(+courseId).subscribe(course => {
        this.course = course;
      });
    }
  }

  async enroll() {
    if (this.course && this.isStudent) {
      this.courseService.enrollCourse(this.course.id).subscribe(async success => {
        if (success) {
          await this.presentToast('Enrolled successfully!', 'success');
          // Optionally update the course object or navigate
          if (this.course) {
            this.course.enrolled = true;
          }
        } else {
          await this.presentToast('Failed to enroll. Please try again.', 'danger');
        }
      });
    } else if (!this.isStudent) {
      await this.presentToast('Only students can enroll in courses.', 'warning');
    }
  }

  async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: color
    });
    toast.present();
  }
}