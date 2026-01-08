import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { IonicModule, ToastController, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';

import { CourseService } from '../../services/course.service';
import { FileUploadService, UploadedFile } from '../../services/file-upload.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  templateUrl: './upload.page.html',
  styleUrls: ['./upload.page.scss'],
})
export class UploadPage implements OnInit {

  uploadForm!: FormGroup;

  selectedFiles: File[] = [];
  uploadedFiles: UploadedFile[] = [];

  isUploading = false;

  constructor(
    private fb: FormBuilder,
    private courseService: CourseService,
    private uploadService: FileUploadService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private router: Router
  ) {}

  ngOnInit() {
    this.uploadForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      category: ['', Validators.required],
      level: ['beginner', Validators.required],
    });
  }

  /* =====================================================
     FILE SELECTION
     ===================================================== */
  selectFiles() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.mp4,.mov';

    input.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (!target.files) return;

      const files = Array.from(target.files);
      
      // Validation de la taille (max 50MB par fichier)
      const maxSize = 50 * 1024 * 1024; // 50MB
      const invalidFiles = files.filter(f => f.size > maxSize);
      
      if (invalidFiles.length > 0) {
        this.showToast('Some files are too large (max 50MB)', 'warning');
        this.selectedFiles = files.filter(f => f.size <= maxSize);
      } else {
        this.selectedFiles = files;
      }

      console.log('Files selected:', this.selectedFiles.length);
    };

    input.click();
  }

  removeSelectedFile(index: number) {
    this.selectedFiles.splice(index, 1);
  }

  /* =====================================================
     UPLOAD FILES TO LOCAL SERVER
     ===================================================== */
  async uploadSelectedFiles() {
    if (!this.selectedFiles.length) {
      this.showToast('Please select files first', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Uploading files...',
      spinner: 'crescent'
    });
    await loading.present();

    this.isUploading = true;

    try {
      // Upload un fichier à la fois
      const uploadPromises = this.selectedFiles.map(file => 
        this.uploadService.uploadFile(file, 'courses').toPromise()
      );

      const results = await Promise.all(uploadPromises);
      
      this.uploadedFiles = results.filter(r => r !== undefined) as UploadedFile[];
      this.selectedFiles = [];
      
      await loading.dismiss();
      this.showToast(`${this.uploadedFiles.length} files uploaded successfully!`, 'success');
      
    } catch (error: any) {
      console.error('Upload error:', error);
      await loading.dismiss();
      
      // Message d'erreur plus détaillé
      let errorMsg = 'File upload failed';
      if (typeof error === 'string') {
        errorMsg = error;
      } else if (error?.message) {
        errorMsg = error.message;
      }
      
      this.showToast(errorMsg, 'danger');
    } finally {
      this.isUploading = false;
    }
  }

  removeUploadedFile(id: string) {
    const file = this.uploadedFiles.find(f => f.id === id);
    if (file) {
      // Optionnel: supprimer du serveur local
      this.uploadService.deleteFile(file.path).subscribe({
        next: () => {
          this.uploadedFiles = this.uploadedFiles.filter(f => f.id !== id);
          this.showToast('File removed', 'success');
        },
        error: (err) => {
          console.error('Error deleting file:', err);
          this.uploadedFiles = this.uploadedFiles.filter(f => f.id !== id);
        }
      });
    }
  }

  /* =====================================================
     CREATE COURSE (FIRESTORE)
     ===================================================== */
  async uploadCourse() {
    console.log('uploadCourse called');
    console.log('Form valid:', this.uploadForm.valid);
    console.log('Uploaded files:', this.uploadedFiles.length);
    
    if (!this.uploadForm.valid) {
      this.showToast('Please fill all required fields', 'warning');
      return;
    }

    if (!this.uploadedFiles.length) {
      this.showToast('Please upload at least one file', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Creating course...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const courseData = {
        title: this.uploadForm.value.title,
        description: this.uploadForm.value.description,
        price: this.uploadForm.value.price,
        category: this.uploadForm.value.category,
        level: this.uploadForm.value.level,
        coverImage: this.uploadedFiles[0]?.url || '',
        tags: this.uploadedFiles.map(f => f.name),
        files: this.uploadedFiles,
        duration: 0
      };
      
      console.log('Course data to be created:', courseData);
      
      await this.courseService.createCourse(courseData);
      
      console.log('Course created successfully!');
      
      await loading.dismiss();
      this.showToast('Course created successfully!', 'success');

      // Reset form
      this.uploadForm.reset({
        price: 0,
        level: 'beginner'
      });
      this.uploadedFiles = [];

      // Rediriger vers teacher dashboard
      this.router.navigate(['/teacher-dashboard']);

    } catch (error: any) {
      await loading.dismiss();
      console.error('Course creation error:', error);
      this.showToast(error.message || 'Course creation failed', 'danger');
    }
  }

  /* =====================================================
     HELPERS
     ===================================================== */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  getFileIcon(type: string): string {
    if (type.includes('pdf')) return 'document-text-outline';
    if (type.includes('image')) return 'image-outline';
    if (type.includes('video')) return 'videocam-outline';
    if (type.includes('word') || type.includes('document')) return 'document-outline';
    if (type.includes('presentation') || type.includes('powerpoint')) return 'easel-outline';
    return 'document-outline';
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    toast.present();
  }
}