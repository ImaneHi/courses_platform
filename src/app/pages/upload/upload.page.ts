import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CourseService } from '../../services/course.service';
import { FileUploadService, UploadedFile } from '../../services/file-upload.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Course } from '../../services/course.model';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.page.html',
  styleUrls: ['./upload.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule]
})
export class UploadPage implements OnInit {
  uploadForm: FormGroup;
  currentTeacherId: number | undefined;
  currentTeacherName: string | undefined;
  selectedFiles: File[] = [];
  uploadedFiles: UploadedFile[] = [];
  isUploading: boolean = false;
  uploadProgress: number = 0;

  constructor(
    private fb: FormBuilder,
    private courseService: CourseService,
    private fileUploadService: FileUploadService,
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    this.uploadForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(0)]],
      category: ['', Validators.required],
      cover: ['assets/icon/favicon.png'] // Default cover for now
    });
  }

  ngOnInit() {
    const currentUser = this.authService.currentUserValue;
    if (currentUser && currentUser.role === 'teacher') {
      this.currentTeacherId = currentUser.id;
      this.currentTeacherName = `${currentUser.firstName} ${currentUser.lastName}`;
    } else {
      // Handle case where non-teacher user tries to access (though RoleGuard should prevent this)
      this.presentToast('You are not authorized to upload courses.', 'danger');
      this.router.navigate(['/home']);
    }
  }

  async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: color
    });
    toast.present();
  }

  // File selection methods
  async selectFiles() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.mp4,.mov,.txt';
    
    input.onchange = (event: any) => {
      const files = Array.from(event.target.files) as File[];
      this.validateAndAddFiles(files);
    };
    
    input.click();
  }

  validateAndAddFiles(files: File[]) {
    const invalidFiles: string[] = [];
    
    files.forEach(file => {
      if (!this.fileUploadService.isValidFileType(file)) {
        invalidFiles.push(`${file.name} (Invalid file type)`);
      } else if (!this.fileUploadService.isValidFileSize(file)) {
        invalidFiles.push(`${file.name} (File too large - max 10MB)`);
      } else {
        this.selectedFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      this.presentToast(`Some files were not added:\n${invalidFiles.join('\n')}`, 'warning');
    }
    
    if (files.length - invalidFiles.length > 0) {
      this.presentToast(`${files.length - invalidFiles.length} file(s) added successfully`, 'success');
    }
  }

  removeSelectedFile(index: number) {
    this.selectedFiles.splice(index, 1);
  }

  async uploadSelectedFiles() {
    if (this.selectedFiles.length === 0) {
      await this.presentToast('No files selected for upload', 'warning');
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;

    for (let i = 0; i < this.selectedFiles.length; i++) {
      const file = this.selectedFiles[i];
      
      try {
        const uploadedFile = await this.fileUploadService.uploadFile(file).toPromise();
        if (uploadedFile) {
          this.uploadedFiles.push(uploadedFile);
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        await this.presentToast(`Failed to upload ${file.name}`, 'danger');
      }

      this.uploadProgress = Math.round(((i + 1) / this.selectedFiles.length) * 100);
    }

    this.selectedFiles = [];
    this.isUploading = false;
    this.uploadProgress = 0;
    
    await this.presentToast(`Successfully uploaded ${this.uploadedFiles.length} file(s)`, 'success');
  }

  removeUploadedFile(fileId: string) {
    this.fileUploadService.deleteFile(fileId).subscribe(async success => {
      if (success) {
        this.uploadedFiles = this.uploadedFiles.filter(file => file.id !== fileId);
        await this.presentToast('File removed successfully', 'success');
      } else {
        await this.presentToast('Failed to remove file', 'danger');
      }
    });
  }

  getFileIcon(type: string): string {
    return this.fileUploadService.getFileIcon(type);
  }

  formatFileSize(bytes: number): string {
    return this.fileUploadService.formatFileSize(bytes);
  }

  async uploadCourse() {
    if (this.uploadForm.valid && this.currentTeacherId && this.currentTeacherName) {
      // Check if at least one file is uploaded
      if (this.uploadedFiles.length === 0) {
        const alert = await this.alertController.create({
          header: 'No Documents',
          message: 'Please upload at least one document for this course.',
          buttons: ['OK']
        });
        await alert.present();
        return;
      }

      const newCourse: Course = {
        id: 0, // ID will be generated by the service
        teacherId: this.currentTeacherId,
        author: this.currentTeacherName,
        rating: 0, // Initial rating
        enrolled: false, // Initial enrollment status
        modules: [], // No modules initially
        createdAt: new Date(),
        updatedAt: new Date(),
        ...this.uploadForm.value
      };

      this.courseService.createCourse(newCourse).subscribe(
        async createdCourse => {
          await this.presentToast('Course uploaded successfully!', 'success');
          this.uploadForm.reset();
          this.uploadedFiles = [];
          this.router.navigate(['/teacher-dashboard']);
        },
        async error => {
          console.error('Error uploading course:', error);
          await this.presentToast('Failed to upload course. Please try again.', 'danger');
        }
      );
    } else {
      await this.presentToast('Please fill all required fields.', 'danger');
    }
  }
}