import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { CourseService } from 'src/app/services/course.service';
import { Course } from 'src/app/services/course.model';
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

  constructor(
    private courseService: CourseService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadEnrolledCourses();
  }

  loadEnrolledCourses() {
    this.courseService.getCourses().subscribe(allCourses => {
      // For now, filtering client-side. In a real app, backend would provide enrolled courses.
      this.enrolledCourses = allCourses.filter(course => course.enrolled);
    });
  }

  viewCourse(id: number) {
    this.router.navigate(['/course-detail', id]);
  }
}