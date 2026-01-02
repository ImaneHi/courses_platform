import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private uploadedFiles: UploadedFile[] = [];

  constructor() { }

  // Simulate file upload - in a real app, this would upload to a server
  uploadFile(file: File): Observable<UploadedFile> {
    return new Observable(observer => {
      // Simulate upload process
      setTimeout(() => {
        const uploadedFile: UploadedFile = {
          id: this.generateId(),
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file), // In real app, this would be server URL
          uploadedAt: new Date()
        };

        this.uploadedFiles.push(uploadedFile);
        observer.next(uploadedFile);
        observer.complete();
      }, 1000); // Simulate 1 second upload time
    });
  }

  // Get all uploaded files
  getUploadedFiles(): Observable<UploadedFile[]> {
    return of(this.uploadedFiles);
  }

  // Get file by ID
  getFileById(id: string): Observable<UploadedFile | undefined> {
    return of(this.uploadedFiles.find(file => file.id === id));
  }

  // Delete file
  deleteFile(id: string): Observable<boolean> {
    const index = this.uploadedFiles.findIndex(file => file.id === id);
    if (index > -1) {
      this.uploadedFiles.splice(index, 1);
      return of(true);
    }
    return of(false);
  }

  // Validate file type
  isValidFileType(file: File): boolean {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/quicktime',
      'text/plain'
    ];
    return allowedTypes.includes(file.type);
  }

  // Validate file size (max 10MB)
  isValidFileSize(file: File): boolean {
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    return file.size <= maxSize;
  }

  // Get file icon based on type
  getFileIcon(type: string): string {
    if (type.includes('pdf')) return 'document-text-outline';
    if (type.includes('word')) return 'document-outline';
    if (type.includes('powerpoint') || type.includes('presentation')) return 'easel-outline';
    if (type.includes('image')) return 'image-outline';
    if (type.includes('video')) return 'videocam-outline';
    if (type.includes('text')) return 'document-text-outline';
    return 'document-outline';
  }

  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
