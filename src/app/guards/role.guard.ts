import { inject } from '@angular/core';
import { 
  CanActivateFn, 
  ActivatedRouteSnapshot, 
  Router, 
  UrlTree 
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

export const RoleGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot
): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const requiredRole = route.data['role'] as string;

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      if (!user) {
        return router.createUrlTree(['/login'], {
          queryParams: { returnUrl: router.url }
        });
      }

      if (user.role === requiredRole) {
        return true;
      }

      // Rediriger vers la page d'accueil appropriée
      if (user.role === 'teacher') {
        return router.createUrlTree(['/teacher-dashboard']);
      } else {
        return router.createUrlTree(['/student-dashboard']);
      }
    })
  );
};