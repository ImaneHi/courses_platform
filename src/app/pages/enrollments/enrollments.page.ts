import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Course } from '../../services/course.model';
import { CourseService } from '../../services/course.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-enrollments',
  templateUrl: './enrollments.page.html',
  styleUrls: ['./enrollments.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterLink]
})
export class EnrollmentsPage implements OnInit {
  enrolledCourses: Course[] = [];

  constructor(private courseService: CourseService) { }

  ngOnInit() {
    this.enrolledCourses = this.courseService.getCourses().filter(course => course.enrolled);
  }
}