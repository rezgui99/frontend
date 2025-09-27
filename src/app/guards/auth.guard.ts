import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    
    console.log('🛡️ AuthGuard - Checking authentication for:', state.url);
    console.log('🛡️ AuthGuard - User authenticated:', this.authService.isAuthenticated);
    
    if (this.authService.isAuthenticated) {
      const currentUser = this.authService.currentUser;
      console.log('🛡️ AuthGuard - Current user:', currentUser);
      
      // NOUVEAU: Vérifier si l'email est vérifié pour les routes protégées
      if (currentUser && !currentUser.emailVerified) {
        console.log('⚠️ AuthGuard - Email not verified, redirecting to verify-email');
        // Rediriger vers la vérification email si pas vérifié
        this.router.navigate(['/auth/verify-email'], {
          queryParams: { email: currentUser.email }
        });
        return false;
      }
      
      // Check for required roles if specified in route data
      const requiredRoles = route.data['roles'] as string[];
      
      if (requiredRoles && requiredRoles.length > 0) {
        console.log('🛡️ AuthGuard - Required roles:', requiredRoles);
        console.log('🛡️ AuthGuard - User role:', currentUser?.role);
        console.log('🛡️ AuthGuard - User roles array:', currentUser?.roles);
        
        if (!currentUser) {
          console.log('❌ AuthGuard - No current user');
          this.router.navigate(['/unauthorized']);
          return false;
        }
        
        // Vérifier si l'utilisateur a l'un des rôles requis
        // Supporter à la fois le rôle simple et le tableau de rôles
        let hasRequiredRole = false;
        
        if (currentUser.roles && Array.isArray(currentUser.roles)) {
          // Si l'utilisateur a un tableau de rôles
          hasRequiredRole = requiredRoles.some(role => currentUser.roles.includes(role));
        } else if (currentUser.role) {
          // Si l'utilisateur a un rôle simple
          hasRequiredRole = requiredRoles.includes(currentUser.role);
        }
        
        if (!hasRequiredRole) {
          console.log('❌ AuthGuard - Insufficient permissions');
          console.log('Required:', requiredRoles, 'User has role:', currentUser.role, 'User roles:', currentUser.roles);
          this.router.navigate(['/unauthorized']);
          return false;
        }
      }
      
      console.log('✅ AuthGuard - Access granted');
      return true;
    }

    console.log('❌ AuthGuard - Not authenticated, redirecting to login');
    // Store the attempted URL for redirecting after login
    this.router.navigate(['/auth/login'], { 
      queryParams: { returnUrl: state.url } 
    });
    
    return false;
  }
}