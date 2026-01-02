import { Injectable } from '@angular/core';
import { Course, Module, Lesson, Quiz, QuizQuestion } from './course.model';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { AuthService } from './auth.service';
import { catchError, map } from 'rxjs/operators';
import { apiConfig } from 'src/environments/environment';

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
          ],
          quiz: {
            id: 1001,
            courseId: 1,
            title: 'Angular Basics Quiz',
            passingScore: 70,
            timeLimit: 15,
            questions: [
              {
                id: 1,
                question: 'What is Angular?',
                options: ['A CSS framework', 'A JavaScript framework', 'A database', 'An operating system'],
                correctAnswer: 1,
                points: 10
              },
              {
                id: 2,
                question: 'What is the CLI command to create a new Angular component?',
                options: ['ng generate component', 'ng create component', 'ng make component', 'ng build component'],
                correctAnswer: 0,
                points: 10
              }
            ]
          }
        },
        {
          id: 102,
          title: 'Components and Modules',
          lessons: [
            { id: 1003, title: 'Creating Components', content: 'Video: How to create and use Angular components.', type: 'video', duration: 20 }
          ]
        }
      ],
      finalQuiz: {
        id: 1002,
        courseId: 1,
        title: 'Angular Basics Final Exam',
        passingScore: 80,
        timeLimit: 30,
        questions: [
          {
            id: 3,
            question: 'What is the purpose of Angular modules?',
            options: ['To organize components and services', 'To style the application', 'To handle routing only', 'To connect to databases'],
            correctAnswer: 0,
            points: 15
          },
          {
            id: 4,
            question: 'Which decorator is used to define a component?',
            options: ['@Service', '@Module', '@Component', '@Directive'],
            correctAnswer: 2,
            points: 15
          }
        ]
      },
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

  // Ensure client-side enrolled flag is set (used by UI to show enrolled courses)
  setEnrolled(courseId: number, enrolled: boolean) {
    const course = this.courses.find(c => c.id === courseId);
    if (course) {
      course.enrolled = enrolled;
    }
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
    const apiUrl = apiConfig.apiUrl;
    const course = this.courses.find(c => c.id === id);

    if (apiUrl) {
      // If backend available, call enroll endpoint
      return this.http.post<any>(`${apiUrl}/enrollments`, { courseId: id }).pipe(
        map(() => {
          if (course) course.enrolled = true;
          return true;
        }),
        catchError(() => {
          // Fallback to client-side change
          if (course) course.enrolled = true;
          return of(true);
        })
      );
    }

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

  getQuizById(quizId: number): Observable<Quiz | undefined> {
    for (const course of this.courses) {
      // Check module quizzes
      for (const module of course.modules) {
        if (module.quiz?.id === quizId) {
          return of(module.quiz);
        }
      }
      // Check final quiz
      if (course.finalQuiz?.id === quizId) {
        return of(course.finalQuiz);
      }
    }
    return of(undefined);
  }

  getQuizzesByCourse(courseId: number): Observable<Quiz[]> {
    const course = this.courses.find(c => c.id === courseId);
    if (!course) return of([]);

    const quizzes: Quiz[] = [];
    
    // Add module quizzes
    course.modules.forEach(module => {
      if (module.quiz) {
        quizzes.push(module.quiz);
      }
    });
    
    // Add final quiz if exists
    if (course.finalQuiz) {
      quizzes.push(course.finalQuiz);
    }
    
    return of(quizzes);
  }

  calculateQuizScore(quiz: Quiz, answers: number[]): { score: number; passed: boolean; totalPoints: number } {
    let correctAnswers = 0;
    let totalPoints = 0;
    
    quiz.questions.forEach((question, index) => {
      totalPoints += question.points;
      if (answers[index] === question.correctAnswer) {
        correctAnswers += question.points;
      }
    });
    
    const score = totalPoints > 0 ? Math.round((correctAnswers / totalPoints) * 100) : 0;
    const passed = score >= quiz.passingScore;
    
    return { score, passed, totalPoints };
  }

  getCourseCompletionStatus(courseId: number, studentId: number): Observable<{
    totalLessons: number;
    completedLessons: number;
    totalQuizzes: number;
    completedQuizzes: number;
    overallProgress: number;
  }> {
    const course = this.courses.find(c => c.id === courseId);
    if (!course) return of({ totalLessons: 0, completedLessons: 0, totalQuizzes: 0, completedQuizzes: 0, overallProgress: 0 });

    let totalLessons = 0;
    course.modules.forEach(module => {
      totalLessons += module.lessons.length;
    });

    let totalQuizzes = 0;
    course.modules.forEach(module => {
      if (module.quiz) totalQuizzes++;
    });
    if (course.finalQuiz) totalQuizzes++;

    // For now, return mock completion data
    // In a real app, you'd fetch this from the progress service
    return of({
      totalLessons,
      completedLessons: Math.floor(totalLessons * 0.3), // Mock: 30% completed
      totalQuizzes,
      completedQuizzes: Math.floor(totalQuizzes * 0.2), // Mock: 20% completed
      overallProgress: 25 // Mock: 25% overall progress
    });
  }
}