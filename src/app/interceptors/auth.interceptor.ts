import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Récupérer le token depuis localStorage directement pour être sûr
    const token = localStorage.getItem('auth_token') || this.authService.token;

    console.log('🔐 AuthInterceptor - Token:', token ? 'Present' : 'Missing');
    console.log('🌐 AuthInterceptor - Request URL:', req.url);
    console.log('🔍 AuthInterceptor - Request method:', req.method);
    console.log('🔑 AuthInterceptor - Token value:', token ? token.substring(0, 20) + '...' : 'NULL');

    // Vérifier si c'est une requête vers l'API backend (plus strict)
    const isApiRequest = req.url.includes('/api/') || 
                        req.url.startsWith('http://localhost:3000/api/') ||
                        req.url.startsWith('http://localhost:3000/');
    console.log('🎯 AuthInterceptor - Is API request:', isApiRequest);

    if (token && isApiRequest) {
      const cloned = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('✅ AuthInterceptor - Added Authorization header:', cloned.headers.get('Authorization')?.substring(0, 30) + '...');
      console.log('✅ AuthInterceptor - Full headers:', cloned.headers.keys());
      
      return next.handle(cloned).pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('❌ AuthInterceptor - HTTP Error:', error.status, error.message);
          console.error('❌ AuthInterceptor - Error details:', error.error);
          if (error.status === 401) {
            console.error('Token expired or invalid, logging out...');
            this.authService.forceLogout();
          }
          return throwError(() => error);
        })
      );
    }

    console.log('⚠️ AuthInterceptor - No token or not API request, proceeding without Authorization header');
    return next.handle(req);
  }
}
