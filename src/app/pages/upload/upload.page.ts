import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CourseService } from '../../services/course.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.page.html',
  styleUrls: ['./upload.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule]
})
export class UploadPage {
  uploadForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private courseService: CourseService,
    private router: Router
  ) {
    this.uploadForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      author: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(0)]]
    });
  }

  uploadCourse() {
    if (this.uploadForm.valid) {
      // In a real app, you would handle file upload and get the cover URL
      const newCourse = {
        id: Date.now(),
        cover: 'assets/icon/favicon.png',
        rating: 0,
        enrolled: false,
        ...this.uploadForm.value
      };
      // For now, we just add it to the service
      this.courseService.getCourses().push(newCourse);
      this.router.navigate(['/courses']);
    }
  }
}