import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from '@angular/fire/firestore';

import { Observable, of, firstValueFrom } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { Lesson, Quiz } from './course.model';
import { AuthService, AppUser } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class LessonService {

  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  private lessonsCol = collection(this.firestore, 'lessons');

  // =========================
  // GET LESSONS BY COURSE
  // =========================
  getLessonsByCourse(courseId: string): Observable<Lesson[]> {
    const q = query(
      this.lessonsCol,
      where('courseId', '==', courseId),
      orderBy('order', 'asc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<Lesson[]>;
  }

  // =========================
  // GET LESSON BY ID
  // =========================
  getLessonById(lessonId: string): Observable<Lesson | null> {
    const ref = doc(this.firestore, `lessons/${lessonId}`);
    return docData(ref, { idField: 'id' }).pipe(
      map(data => data as Lesson),
      catchError(() => of(null))
    );
  }

  // =========================
  // CREATE LESSON
  // =========================
  async createLesson(data: Partial<Lesson>): Promise<string> {
    const user = await firstValueFrom(this.authService.currentUser$);

    if (!user || user.role !== 'teacher') {
      throw new Error('Unauthorized');
    }

    const lessonId = `lesson_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const lesson: Lesson = {
      id: lessonId,
      title: data.title ?? '',
      description: data.description ?? '',
      content: data.content ?? '',
      type: data.type ?? 'text',
      duration: data.duration ?? 0,
      order: data.order ?? 0,
      isFreePreview: data.isFreePreview ?? false,
      videoUrl: data.videoUrl ?? '',
      documentUrl: data.documentUrl ?? '',
      courseId: data.courseId ?? '',
      quiz: data.quiz,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const ref = await addDoc(this.lessonsCol, lesson);
    return ref.id;
  }

  // =========================
  // UPDATE LESSON
  // =========================
  async updateLesson(lessonId: string, data: Partial<Lesson>): Promise<void> {
    await updateDoc(doc(this.firestore, `lessons/${lessonId}`), {
      ...data,
      updatedAt: new Date()
    });
  }

  // =========================
  // DELETE LESSON
  // =========================
  async deleteLesson(lessonId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `lessons/${lessonId}`));
  }

  // =========================
  // UPDATE LESSON ORDER
  // =========================
  async updateLessonOrder(lessonIds: string[]): Promise<void> {
    const batch: Promise<void>[] = [];
    
    lessonIds.forEach((id, index) => {
      const lessonRef = doc(this.firestore, `lessons/${id}`);
      batch.push(updateDoc(lessonRef, { order: index, updatedAt: new Date() }));
    });

    await Promise.all(batch);
  }

  // =========================
  // ADD QUIZ TO LESSON
  // =========================
  async addQuizToLesson(lessonId: string, quiz: Quiz): Promise<void> {
    // Validate quiz data before saving
    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
      throw new Error('Quiz must have at least one question');
    }

    // Validate each question
    const validQuestions = quiz.questions.filter(q => 
      q.question && q.question.trim() !== '' && 
      q.options && q.options.length >= 4
    );

    if (validQuestions.length === 0) {
      throw new Error('Quiz must have at least one valid question with 4+ options');
    }

    const validatedQuiz: Quiz = {
      ...quiz,
      questions: validQuestions
    };

    const lessonRef = doc(this.firestore, `lessons/${lessonId}`);
    await updateDoc(lessonRef, { 
      quiz: validatedQuiz,
      updatedAt: new Date()
    });
  }

  // =========================
  // UPDATE LESSON QUIZ
  // =========================
  async updateLessonQuiz(lessonId: string, quiz: Quiz): Promise<void> {
    await updateDoc(doc(this.firestore, `lessons/${lessonId}`), {
      quiz: quiz,
      updatedAt: new Date()
    });
  }

  // =========================
  // REMOVE QUIZ FROM LESSON
  // =========================
  async removeQuizFromLesson(lessonId: string): Promise<void> {
    await updateDoc(doc(this.firestore, `lessons/${lessonId}`), {
      quiz: null,
      updatedAt: new Date()
    });
  }
}
