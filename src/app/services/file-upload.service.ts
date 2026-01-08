import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  path: string;
  uploadedAt: Date;
}

export interface UploadResponse {
  message: string;
  files: UploadedFile[];
}

@Injectable({ providedIn: 'root' })
export class FileUploadService {
  private readonly SERVER_URL = 'http://localhost:3001';

  constructor(private http: HttpClient) {}

  uploadFile(file: File, folder = 'courses'): Observable<UploadedFile> {
    const formData = new FormData();
    formData.append('files', file);
    formData.append('folder', folder);

    return this.http.post<UploadResponse>(`${this.SERVER_URL}/upload`, formData).pipe(
      map(response => response.files[0]),
      catchError(this.handleError)
    );
  }

  uploadMultipleFiles(files: File[], folder = 'courses'): Observable<UploadedFile[]> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('folder', folder);

    return this.http.post<UploadResponse>(`${this.SERVER_URL}/upload`, formData).pipe(
      map(response => response.files),
      catchError(this.handleError)
    );
  }

  deleteFile(path: string): Observable<any> {
    const [folder, filename] = path.split('/');
    return this.http.delete(`${this.SERVER_URL}/upload/${folder}/${filename}`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    
    return throwError(() => errorMessage);
  }
}
