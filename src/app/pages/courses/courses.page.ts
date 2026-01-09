  import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CourseService } from '../../services/course.service';
import { Course } from '../../services/course.model';
import { AuthService, AppUser } from '../../services/auth.service';

@Component({
  selector: 'app-courses',
  templateUrl: './courses.page.html',
  styleUrls: ['./courses.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule]
})
export class CoursesPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  courses: Course[] = [];
  filteredCourses: Course[] = [];
  currentUser: AppUser | null = null;
  isStudent = false;
  categories: string[] = [
    'Web Development',
    'Mobile Development',
    'Data Science',
    'Programming',
    'Design',
    'Business',
    'Marketing',
    'Photography'
  ];
  
  selectedCategory: string = 'all';
  searchTerm: string = '';
  levels = ['all', 'beginner', 'intermediate', 'advanced'];
  selectedLevel: string = 'all';
  
  sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' }
  ];
  selectedSort: string = 'newest';
  
  isLoading = true;
  currentPage = 1;
  itemsPerPage = 12;
  hasMoreItems = true;

  constructor(
    private courseService: CourseService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        this.isStudent = !!user && user.role === 'student';
      });

    this.loadCourses();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCourses() {
    this.isLoading = true;
    this.courseService.getAllCourses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (courses) => {
          this.courses = courses;
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading courses:', error);
          this.isLoading = false;
        }
      });
  }

  applyFilters() {
    let filtered = [...this.courses];

    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(course => course.category === this.selectedCategory);
    }

    if (this.selectedLevel !== 'all') {
      filtered = filtered.filter(course => course.level === this.selectedLevel);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(term) ||
        course.description.toLowerCase().includes(term) ||
        course.tags.some((tag: string) => tag.toLowerCase().includes(term))
      );
    }

    filtered = this.sortCourses(filtered);

    this.filteredCourses = filtered;
    this.hasMoreItems = this.filteredCourses.length > this.currentPage * this.itemsPerPage;
  }

  sortCourses(courses: Course[]): Course[] {
    switch (this.selectedSort) {
      case 'popular':
        return courses.sort((a, b) => (b.totalStudents || 0) - (a.totalStudents || 0));
      case 'rating':
        return courses.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'price-low':
        return courses.sort((a, b) => a.price - b.price);
      case 'price-high':
        return courses.sort((a, b) => b.price - a.price);
      case 'newest':
      default:
        return courses.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
  }

  onSearchChange(event: any) {
    this.searchTerm = event.detail.value || '';
    this.applyFilters();
  }

  onCategoryChange(category: string) {
    this.selectedCategory = category;
    this.applyFilters();
  }

  onLevelChange(level: string) {
    this.selectedLevel = level;
    this.applyFilters();
  }

  onSortChange(event: any) {
    this.selectedSort = event.detail.value;
    this.applyFilters();
  }

  loadMore() {
    this.currentPage++;
    this.hasMoreItems = this.filteredCourses.length > this.currentPage * this.itemsPerPage;
  }

  getPaginatedCourses(): Course[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredCourses.slice(0, endIndex);
  }

  resetFilters() {
    this.selectedCategory = 'all';
    this.selectedLevel = 'all';
    this.searchTerm = '';
    this.selectedSort = 'newest';
    this.currentPage = 1;
    this.applyFilters();
  }

  getCourseDuration(course: Course): string {
    const hours = Math.floor(course.duration);
    const minutes = Math.round((course.duration - hours) * 60);

    if (hours === 0) return `${minutes}min`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}min`;
  }
}