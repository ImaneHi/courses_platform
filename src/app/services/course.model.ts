// src/app/services/course.model.ts
export interface Course {
  id?: string;
  title: string;
  description: string;
  teacherId: string;
  teacherName: string;
  price: number;
  coverImage: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  tags: string[];
  isPublished: boolean;
  rating: number;
  totalStudents: number;
  createdAt: any;
  updatedAt: any;
  
  // Modules et structure du cours
  modules?: Module[];
  finalQuiz?: Quiz;
  
  // Propriétés pour compatibilité (legacy)
  enrolled?: boolean;
  cover?: string;
  author?: string;
}

export interface Module {
  id: string;
  title: string;
  description?: string;
  order: number;
  lessons?: Lesson[];
  quiz?: Quiz;
}

export interface Lesson {
  id: string;
  title: string;
  description?: string;
  content: string;
  type: 'video' | 'text' | 'document' | 'quiz';
  duration: number;
  order: number;
  isFreePreview?: boolean;
  videoUrl?: string;
  documentUrl?: string;
}

export interface Quiz {
  id?: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  passingScore: number;
  timeLimit?: number;
  maxAttempts?: number;
  createdAt: Date;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  points: number;
}

export interface StudentProgress {
  id?: string;
  studentId: string;
  courseId: string;
  enrollmentId: string;
  completedLessons: string[];
  completedQuizzes: Record<string, QuizResult>;
  currentModule?: string;
  currentLesson?: string;
  overallProgress: number;
  timeSpent: number;
  lastUpdated: Date;
}

export interface QuizResult {
  quizId: string;
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  attemptNumber: number;
  completedAt: Date;
  timeTaken: number;
  answers: number[];
}

export interface Enrollment {
  id?: string;
  studentId: string;
  courseId: string;
  enrolledAt: Date;
  status: 'active' | 'completed' | 'cancelled';
}