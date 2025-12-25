import { Injectable } from '@angular/core';
import { Course } from './course.model';

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private courses: Course[] = [
    {
      id: 1,
      title: 'Angular Basics',
      description: 'Learn the basics of Angular framework.',
      author: 'John Doe',
      price: 19.99,
      cover: 'assets/icon/favicon.png',
      rating: 4.5,
      enrolled: false
    },
    {
      id: 2,
      title: 'Advanced Angular',
      description: 'Take your Angular skills to the next level.',
      author: 'Jane Smith',
      price: 29.99,
      cover: 'assets/icon/favicon.png',
      rating: 4.8,
      enrolled: true
    },
    {
      id: 3,
      title: 'Ionic Fundamentals',
      description: 'Build cross-platform apps with Ionic.',
      author: 'Mike Johnson',
      price: 24.99,
      cover: 'assets/icon/favicon.png',
      rating: 4.7,
      enrolled: false
    }
  ];

  constructor() { }

  getCourses(): Course[] {
    return this.courses;
  }

  getCourseById(id: number): Course | undefined {
    return this.courses.find(course => course.id === id);
  }

  enrollCourse(id: number): void {
    const course = this.getCourseById(id);
    if (course) {
      course.enrolled = true;
    }
  }
}