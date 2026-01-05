import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Course } from '../../services/course.model';
import { CourseService } from '../../services/course.service';

@Component({
  selector: 'app-enrollments',
  templateUrl: './enrollments.page.html',
  styleUrls: ['./enrollments.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule]
})
export class EnrollmentsPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  enrolledCourses: Course[] = [];
  isLoading = true;

  constructor(private courseService: CourseService) { }

  ngOnInit() {
    this.loadEnrolledCourses();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEnrolledCourses() {
    this.isLoading = true;
    this.courseService.getStudentCourses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (courses: Course[]) => {
          this.enrolledCourses = courses;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading enrolled courses:', error);
          this.isLoading = false;
        }
      });
  }
}