import { Component, OnInit } from '@angular/core';
import { CourseService } from '../../services/course.service';
import { Course } from '../../services/course.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterLink]
})
export class DashboardPage implements OnInit {
  allCourses: Course[] = [];
  filteredCourses: Course[] = [];
  enrolledCourses: Course[] = [];

  constructor(private courseService: CourseService) { }

  ngOnInit() {
    this.courseService.getCourses().subscribe(courses => {
      this.allCourses = courses;
      this.filteredCourses = this.allCourses;
      this.enrolledCourses = this.allCourses.filter(course => course.enrolled);
    });
  }

  search(event: any) {
    const query = event.target.value.toLowerCase();
    this.filteredCourses = this.allCourses.filter(course =>
      course.title.toLowerCase().includes(query)
    );
  }
}
