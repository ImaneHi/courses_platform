export interface Lesson {
  id: number;
  title: string;
  content: string; // HTML content, video URL, document URL, etc.
  duration?: number; // in minutes
  type: 'video' | 'text' | 'quiz' | 'document';
}

export interface Module {
  id: number;
  title: string;
  lessons: Lesson[];
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
  createdAt: Date;
  updatedAt: Date;
}
