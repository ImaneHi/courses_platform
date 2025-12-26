export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'teacher'; // Role-based access control
  // Add other user-related properties as needed
}
