import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    const expectedRole = route.data['role'];
    const currentUser = this.authService.currentUserValue;

    if (currentUser && currentUser.role === expectedRole) {
      return true;
    } else {
      // Redirect to a forbidden page or login page
      // For now, redirect to dashboard if logged in, otherwise login
      if (this.authService.isLoggedIn()) {
        this.router.navigate(['/dashboard']); // Or a specific 'access denied' page
      } else {
        this.router.navigate(['/login']);
      }
      return false;
    }
  }
}
