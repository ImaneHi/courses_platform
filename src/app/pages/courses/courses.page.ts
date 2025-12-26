import { Component, OnInit } from '@angular/core';
import { Course } from '../../services/course.model';
import { CourseService } from '../../services/course.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-courses',
  templateUrl: './courses.page.html',
  styleUrls: ['./courses.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterLink]
})
export class CoursesPage implements OnInit {
  courses: Course[] = [];
  searchTerm: string = '';
  private searchTerms = new Subject<string>();

  constructor(private courseService: CourseService) { }

  ngOnInit() {
    this.loadCourses();

    this.searchTerms.pipe(
      debounceTime(300), // wait 300ms after each keystroke before considering the term
      distinctUntilChanged(), // ignore if next search term is same as previous
      switchMap((term: string) => this.courseService.searchCourses(term)) // switch to new observable each time
    ).subscribe(courses => {
      this.courses = courses;
    });
  }

  loadCourses() {
    this.courseService.getCourses().subscribe(courses => {
      this.courses = courses;
    });
  }

  onSearchChange(event: any) {
    this.searchTerms.next(event.detail.value);
  }
}