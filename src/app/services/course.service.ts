import { Injectable } from '@angular/core';
import { Course, Module, Lesson } from './course.model';
import { HttpClient } from '@angular/common/http'; // For future backend integration
import { Observable, of } from 'rxjs';
import { AuthService } from './auth.service';

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
      teacherId: 1, // Assuming teacher with ID 1
      price: 19.99,
      cover: 'assets/icon/favicon.png',
      rating: 4.5,
      enrolled: false,
      category: 'Web Development',
      modules: [
        {
          id: 101,
          title: 'Introduction to Angular',
          lessons: [
            { id: 1001, title: 'What is Angular?', content: 'This lesson covers the fundamentals of Angular.', type: 'text', duration: 10 },
            { id: 1002, title: 'Setting up Environment', content: 'Video: Setting up your Angular development environment.', type: 'video', duration: 15 }
          ]
        },
        {
          id: 102,
          title: 'Components and Modules',
          lessons: [
            { id: 1003, title: 'Creating Components', content: 'Video: How to create and use Angular components.', type: 'video', duration: 20 }
          ]
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 2,
      title: 'Advanced Angular',
      description: 'Take your Angular skills to the next level.',
      author: 'Jane Smith',
      teacherId: 1, // Assuming teacher with ID 1
      price: 29.99,
      cover: 'assets/icon/favicon.png',
      rating: 4.8,
      enrolled: true,
      category: 'Web Development',
      modules: [
        {
          id: 201,
          title: 'Advanced Concepts',
          lessons: [
            { id: 2001, title: 'RxJS in Depth', content: 'Video: Deep dive into RxJS observables.', type: 'video', duration: 30 },
            { id: 2002, title: 'State Management', content: 'This lesson explains different state management patterns.', type: 'text', duration: 25 }
          ]
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 3,
      title: 'Ionic Fundamentals',
      description: 'Build cross-platform apps with Ionic.',
      author: 'Mike Johnson',
      teacherId: 2, // Assuming teacher with ID 2
      price: 24.99,
      cover: 'assets/icon/favicon.png',
      rating: 4.7,
      enrolled: false,
      category: 'Mobile Development',
      modules: [
        {
          id: 301,
          title: 'Getting Started with Ionic',
          lessons: [
            { id: 3001, title: 'Ionic CLI', content: 'Video: Learn how to use the Ionic CLI.', type: 'video', duration: 15 }
          ]
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  constructor(private http: HttpClient, private authService: AuthService) { } // Inject HttpClient and AuthService

  getCourses(): Observable<Course[]> {
    return of(this.courses); // Simulate HTTP call
  }

  getCourseById(id: number): Observable<Course | undefined> {
    return of(this.courses.find(course => course.id === id));
  }

  getTeacherCourses(teacherId: number): Observable<Course[]> {
    return of(this.courses.filter(course => course.teacherId === teacherId));
  }

  createCourse(course: Course): Observable<Course> {
    const newCourse = { ...course, id: this.generateId(), createdAt: new Date(), updatedAt: new Date() };
    this.courses.push(newCourse);
    return of(newCourse);
  }

  updateCourse(course: Course): Observable<Course | undefined> {
    const index = this.courses.findIndex(c => c.id === course.id);
    if (index > -1) {
      this.courses[index] = { ...course, updatedAt: new Date() };
      return of(this.courses[index]);
    }
    return of(undefined);
  }

  deleteCourse(id: number): Observable<boolean> {
    const initialLength = this.courses.length;
    this.courses = this.courses.filter(course => course.id !== id);
    return of(this.courses.length < initialLength);
  }

  enrollCourse(id: number): Observable<boolean> {
    const course = this.courses.find(c => c.id === id);
    if (course) {
      course.enrolled = true; // Client-side change for now
      return of(true);
    }
    return of(false);
  }

  searchCourses(searchTerm: string): Observable<Course[]> {
    if (!searchTerm) {
      return of(this.courses);
    }
    searchTerm = searchTerm.toLowerCase();
    return of(this.courses.filter(course =>
      course.title.toLowerCase().includes(searchTerm) ||
      course.description.toLowerCase().includes(searchTerm) ||
      course.author.toLowerCase().includes(searchTerm) ||
      course.category.toLowerCase().includes(searchTerm)
    ));
  }

  private generateId(): number {
    return this.courses.length > 0 ? Math.max(...this.courses.map(course => course.id)) + 1 : 1;
  }
}