export class CourseDetailPage {

  course: any = {};
  selectedLesson: any = null;
  videoUrlSafe: any = null;
  isStudent = true;

  openLesson(lesson: any) {
    this.selectedLesson = lesson;
  }

  closeLesson() {
    this.selectedLesson = null;
  }

  enroll() {}

  markLessonCompleted(id: string) {}

  isLessonCompleted(id: string) {
    return false;
  }

  takeQuiz(id: string) {}
}
