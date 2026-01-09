import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError, timer } from 'rxjs';
import { catchError, map, retryWhen, mergeMap, scan } from 'rxjs/operators';
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
  private readonly GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  private readonly API_KEY = 'AIzaSyCBrmyWGdwU9RXtiBIeovu_TZyNqiZAKzk'; // Google Gemini API Key

  constructor(private http: HttpClient) {}

  // =========================
  // GENERATE QUIZ FROM LESSON
  // =========================
  generateQuiz(request: QuizGenerationRequest): Observable<QuizGenerationResponse> {
    const prompt = this.buildQuizPrompt(request);
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    const body = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 1,
        topP: 0.95,
        maxOutputTokens: 2048,
        responseMimeType: "application/json"
      }
    };

    return this.http.post<any>(`${this.GEMINI_API_URL}?key=${this.API_KEY}`, body, { headers }).pipe(
      // Retry logic for rate limiting (429 errors)
      retryWhen(errors =>
        errors.pipe(
          scan((acc: { count: number; error: HttpErrorResponse }, error: HttpErrorResponse) => {
            return { count: acc.count + 1, error };
          }, { count: 0, error: null as any }),
          mergeMap(({ count, error }) => {
            // Only retry on 429 (Too Many Requests) errors, up to 3 retries
            if (error.status === 429 && count <= 3) {
              // Exponential backoff: 2s, 4s, 8s (for retry attempts 1, 2, 3)
              const delayMs = Math.pow(2, count) * 1000;
              console.warn(`Rate limited (429). Retrying in ${delayMs}ms... (retry attempt ${count}/3)`);
              return timer(delayMs);
            }
            // For other errors or max retries reached, throw error
            return throwError(() => error);
          })
        )
      ),
      map(response => {
        try {
          const generatedContent = response.candidates?.[0]?.content?.parts?.[0]?.text;
          const quizData = JSON.parse(generatedContent || '{}');
          
          return {
            success: true,
            quiz: {
              id: `quiz_${Date.now()}`,
              title: `${request.lessonTitle} Quiz`,
              questions: quizData.questions || [],
              passingScore: 70,
              createdAt: new Date()
            }
          };
        } catch (parseError) {
          const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
          return {
            success: false,
            error: 'Failed to parse AI response: ' + errorMessage
          };
        }
      }),
      catchError((error: HttpErrorResponse | any) => {
        let errorMessage = 'Unknown AI service error';
        
        if (error instanceof HttpErrorResponse) {
          // Handle HTTP errors
          switch (error.status) {
            case 429:
              errorMessage = 'API rate limit exceeded. Please wait a moment and try again.';
              break;
            case 400:
              errorMessage = 'Invalid request. Please check your input and try again.';
              break;
            case 401:
              errorMessage = 'API authentication failed. Please check your API key.';
              break;
            case 403:
              errorMessage = 'API access forbidden. Please check your API permissions.';
              break;
            case 500:
            case 502:
            case 503:
              errorMessage = 'AI service is temporarily unavailable. Please try again later.';
              break;
            default:
              errorMessage = error.error?.error?.message || error.message || `HTTP ${error.status}: ${error.statusText}`;
          }
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        console.error('AI Quiz Generation Error:', error);
        
        return of({
          success: false,
          error: errorMessage
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
