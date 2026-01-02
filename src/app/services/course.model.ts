export interface Lesson {
  id: number;
  title: string;
  content: string; // HTML content, video URL, document URL, etc.
  duration?: number; // in minutes
  type: 'video' | 'text' | 'quiz' | 'document';
  completed?: boolean; // Track lesson completion
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct option
  points: number;
}

export interface Quiz {
  id: number;
  courseId: number;
  title: string;
  questions: QuizQuestion[];
  passingScore: number; // Percentage (0-100)
  timeLimit?: number; // in minutes
}

export interface Module {
  id: number;
  title: string;
  lessons: Lesson[];
  quiz?: Quiz; // Optional quiz at module level
}

export interface Course {
  id: number;
  title: string;
  description: string;
  author: string; // Can be author's name or ID
  teacherId: number; // Link to the User ID of the teacher
  price: number;
  cover: string;
  rating: number;
  enrolled: boolean; // This property might be moved to a user-specific enrollment model
  category: string;
  modules: Module[]; // New property for course content structure
  finalQuiz?: Quiz; // Optional final quiz for the entire course
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentProgress {
  id: number;
  studentId: number;
  courseId: number;
  lessonsCompleted: number[]; // Array of lesson IDs
  quizzesCompleted: number[]; // Array of quiz IDs
  quizScores: { [quizId: number]: number }; // Quiz ID -> Score mapping
  overallProgress: number; // Percentage (0-100)
  courseCompleted: boolean;
  completedAt?: Date;
}

export interface CourseEnrollment {
  id: number;
  studentId: number;
  courseId: number;
  enrolledAt: Date;
  progress: StudentProgress;
}
