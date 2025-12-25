import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudentDashboardPage } from './student-dashboard.page';

describe('StudentDashboardPage', () => {
  let component: StudentDashboardPage;
  let fixture: ComponentFixture<StudentDashboardPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(StudentDashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
