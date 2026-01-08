import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Quiz, QuizQuestion } from './course.model';

export interface QuizGenerationRequest {
  lessonTitle: string;
  lessonContent: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount: number;
  questionType: 'multiple-choice' | 'true-false' | 'mixed';
}

export interface QuizGenerationResponse {
  success: boolean;
  quiz?: Quiz;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiQuizService {
  private readonly API_URL = 'https://api.openai.com/v1/chat/completions';
  private readonly API_KEY = 'YOUR_OPENAI_API_KEY'; // Replace with actual API key

  constructor(private http: HttpClient) {}

  // =========================
  // GENERATE QUIZ FROM LESSON
  // =========================
  generateQuiz(request: QuizGenerationRequest): Observable<QuizGenerationResponse> {
    const prompt = this.buildQuizPrompt(request);
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.API_KEY}`
    });

    const body = {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an educational assistant that creates high-quality quizzes based on lesson content. Always return valid JSON format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    };

    return this.http.post<any>(this.API_URL, body, { headers }).pipe(
      map(response => {
        try {
          const quizData = JSON.parse(response.choices[0].message.content);
          return {
            success: true,
            quiz: this.formatQuiz(quizData, request.lessonTitle)
          };
        } catch (error) {
          return {
            success: false,
            error: 'Failed to parse AI response'
          };
        }
      }),
      catchError(error => {
        console.error('AI Quiz Generation Error:', error);
        return of({
          success: false,
          error: 'Failed to generate quiz. Please try again.'
        });
      })
    );
  }

  // =========================
  // BUILD QUIZ PROMPT
  // =========================
  private buildQuizPrompt(request: QuizGenerationRequest): string {
    return `
Generate a quiz for the following lesson:

Title: ${request.lessonTitle}
Content: ${request.lessonContent}
Difficulty: ${request.difficulty}
Number of questions: ${request.questionCount}
Question type: ${request.questionType}

Requirements:
1. Create ${request.questionCount} multiple-choice questions
2. Each question should have 4 options (A, B, C, D)
3. Include the correct answer (0, 1, 2, 3 corresponding to A, B, C, D)
4. Add a brief explanation for why the correct answer is right
5. Assign points based on difficulty (easy: 1 point, medium: 2 points, hard: 3 points)
6. Questions should be relevant to the lesson content
7. Set appropriate passing score (70% of total points)

Return the response in this exact JSON format:
{
  "title": "Quiz for [Lesson Title]",
  "description": "Test your knowledge of [Lesson Title]",
  "passingScore": [calculated passing score],
  "timeLimit": [time in minutes],
  "questions": [
    {
      "id": "q1",
      "question": "[Question text]",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": [0-3],
      "explanation": "[Explanation]",
      "points": [1-3]
    }
  ]
}
    `;
  }

  // =========================
  // FORMAT QUIZ RESPONSE
  // =========================
  private formatQuiz(quizData: any, lessonTitle: string): Quiz {
    return {
      id: `quiz_${Date.now()}`,
      title: quizData.title || `Quiz for ${lessonTitle}`,
      description: quizData.description || `Test your knowledge of ${lessonTitle}`,
      questions: quizData.questions?.map((q: any, index: number) => ({
        id: q.id || `q${index + 1}`,
        question: q.question,
        options: Array.isArray(q.options) ? q.options : [q.optionA, q.optionB, q.optionC, q.optionD],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        points: q.points || 1
      })) || [],
      passingScore: quizData.passingScore || 70,
      timeLimit: quizData.timeLimit || 30,
      maxAttempts: 3,
      createdAt: new Date()
    };
  }

  // =========================
  // GENERATE MOCK QUIZ (for testing without API key)
  // =========================
  generateMockQuiz(request: QuizGenerationRequest): Observable<QuizGenerationResponse> {
    const mockQuiz: Quiz = {
      id: `quiz_${Date.now()}`,
      title: `Quiz for ${request.lessonTitle}`,
      description: `Test your knowledge of ${request.lessonTitle}`,
      passingScore: request.questionCount * 2 * 0.7, // 70% of total points
      timeLimit: Math.max(10, request.questionCount * 2), // 2 minutes per question minimum
      maxAttempts: 3,
      createdAt: new Date(),
      questions: this.generateMockQuestions(request.questionCount, request.difficulty)
    };

    return of({
      success: true,
      quiz: mockQuiz
    });
  }

  // =========================
  // GENERATE MOCK QUESTIONS
  // =========================
  private generateMockQuestions(count: number, difficulty: string): QuizQuestion[] {
    const questions: QuizQuestion[] = [];
    const points = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;

    for (let i = 1; i <= count; i++) {
      questions.push({
        id: `q${i}`,
        question: `Sample question ${i} for ${difficulty} difficulty level?`,
        options: [
          'Option A - Correct answer',
          'Option B - Wrong answer',
          'Option C - Wrong answer', 
          'Option D - Wrong answer'
        ],
        correctAnswer: 0,
        explanation: `Explanation for why option A is correct for question ${i}`,
        points
      });
    }

    return questions;
  }

  // =========================
  // VALIDATE QUIZ
  // =========================
  validateQuiz(quiz: Quiz): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!quiz.title || quiz.title.trim() === '') {
      errors.push('Quiz title is required');
    }

    if (!quiz.questions || quiz.questions.length === 0) {
      errors.push('Quiz must have at least one question');
    }

    if (quiz.questions) {
      quiz.questions.forEach((question, index) => {
        if (!question.question || question.question.trim() === '') {
          errors.push(`Question ${index + 1} is missing text`);
        }

        if (!question.options || question.options.length !== 4) {
          errors.push(`Question ${index + 1} must have exactly 4 options`);
        }

        if (question.correctAnswer < 0 || question.correctAnswer > 3) {
          errors.push(`Question ${index + 1} has invalid correct answer`);
        }

        if (!question.points || question.points < 1) {
          errors.push(`Question ${index + 1} must have valid points`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
