import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { CourseService } from 'src/app/services/course.service';
import { AuthService } from 'src/app/services/auth.service';
import { ProgressService } from 'src/app/services/progress.service';
import { Course, StudentProgress } from 'src/app/services/course.model';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule],
  templateUrl: './teacher-dashboard.page.html',
  styleUrls: ['./teacher-dashboard.page.scss'],
})
export class TeacherDashboardPage implements OnInit {
  teacherCourses: Course[] = [];
  currentTeacherId: number | undefined;
  studentProgress: StudentProgress[] = [];
  selectedCourseId: number | null = null;
  isLoadingProgress: boolean = false;
  // Chart instances
  private studentsChart: Chart | null = null;
  private distributionChart: Chart | null = null;

  @ViewChild('studentsCanvas') studentsCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('distributionCanvas') distributionCanvas!: ElementRef<HTMLCanvasElement>;

  constructor(
    private courseService: CourseService,
    private authService: AuthService,
    private progressService: ProgressService,
    private router: Router,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.currentTeacherId = this.authService.currentUserValue?.id;
    if (this.currentTeacherId) {
      this.loadTeacherCourses();
    }
  }

  loadTeacherCourses() {
    if (this.currentTeacherId) {
      this.courseService.getTeacherCourses(this.currentTeacherId).subscribe(courses => {
        this.teacherCourses = courses;
      });
    }
  }

  viewCourse(id: number) {
    this.router.navigate(['/course-detail', id]);
  }

  editCourse(id: number) {
    // Navigate to a dedicated edit course page or a modal
    // For now, let's just log it
    console.log('Edit course:', id);
    // this.router.navigate(['/edit-course', id]);
  }

  async deleteCourse(id: number) {
    const toast = await this.toastController.create({
      message: 'Course deleted successfully!',
      duration: 2000,
      color: 'success'
    });
    this.courseService.deleteCourse(id).subscribe(success => {
      if (success) {
        toast.present();
        this.loadTeacherCourses(); // Reload courses after deletion
      } else {
        toast.message = 'Failed to delete course.';
        toast.color = 'danger';
        toast.present();
      }
    });
  }

  navigateToUpload() {
    this.router.navigate(['/upload']);
  }

  viewStudentProgress(courseId: number) {
    this.selectedCourseId = courseId;
    this.isLoadingProgress = true;
    this.progressService.getCourseProgress(courseId).subscribe(progress => {
      this.studentProgress = progress;
      this.isLoadingProgress = false;
      // Render charts after data available
      setTimeout(() => this.renderCharts(), 0);
    });
  }

  private renderCharts() {
    const labels = this.studentProgress.map((p, idx) => `Student ${p.studentId}`);
    const data = this.studentProgress.map(p => p.overallProgress);

    // Destroy existing charts
    this.studentsChart?.destroy();
    this.distributionChart?.destroy();

    // Students progress bar chart
    if (this.studentsCanvas) {
      this.studentsChart = new Chart(this.studentsCanvas.nativeElement.getContext('2d')!, {
        type: 'bar',
        data: {
          labels,
          datasets: [{ label: 'Progress %', data, backgroundColor: labels.map(l => this.getChartColor()) }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } } }
      });
    }

    // Distribution chart: Completed / In Progress / Just Started
    const completed = this.studentProgress.filter(p => p.overallProgress >= 100).length;
    const inProgress = this.studentProgress.filter(p => p.overallProgress >= 50 && p.overallProgress < 100).length;
    const started = this.studentProgress.length - completed - inProgress;

    if (this.distributionCanvas) {
      this.distributionChart = new Chart(this.distributionCanvas.nativeElement.getContext('2d')!, {
        type: 'doughnut',
        data: {
          labels: ['Completed', 'In Progress', 'Just Started'],
          datasets: [{ data: [completed, inProgress, started], backgroundColor: ['#2ecc71', '#f1c40f', '#e74c3c'] }]
        },
        options: { responsive: true }
      });
    }
  }

  private getChartColor(): string {
    // Simple color selection; could be improved
    return '#3880ff';
  }

  getProgressColor(progress: number): string {
    if (progress >= 80) return 'success';
    if (progress >= 50) return 'warning';
    return 'danger';
  }

  getProgressStatus(progress: number): string {
    if (progress >= 100) return 'Completed';
    if (progress >= 50) return 'In Progress';
    return 'Just Started';
  }

  getAverageProgress(): number {
    if (this.studentProgress.length === 0) return 0;
    const total = this.studentProgress.reduce((sum, p) => sum + p.overallProgress, 0);
    return Math.round(total / this.studentProgress.length);
  }

  getCompletedCount(): number {
    return this.studentProgress.filter(p => p.courseCompleted).length;
  }

  getEnrolledCount(): number {
    return this.studentProgress.length;
  }
}