import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CourseDetailPage } from './course-detail.page';

describe('CourseDetailPage', () => {
  let component: CourseDetailPage;
  let fixture: ComponentFixture<CourseDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CourseDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
