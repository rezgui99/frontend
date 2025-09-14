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
    // Ignorer les requêtes candidat - elles sont gérées par CandidateAuthInterceptor
    if (req.url.includes('/candidate/') || req.url.includes('/api/candidate/')) {
      console.log('🔄 AuthInterceptor - Skipping candidate request:', req.url);
      return next.handle(req);
    }

    const token = this.authService.token;

    console.log('🏢 AuthInterceptor - Request URL:', req.url);
    console.log('🔐 AuthInterceptor - Token:', token ? 'Present' : 'Missing');
    console.log('🔍 AuthInterceptor - Request method:', req.method);

    // Vérifier si c'est une requête vers l'API backend (non candidat)
    const isApiRequest = req.url.includes('/api/');
    console.log('🎯 AuthInterceptor - Is API request:', isApiRequest);

    if (token && isApiRequest) {
      const cloned = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('✅ AuthInterceptor - Added Authorization header:', cloned.headers.get('Authorization'));
      
      return next.handle(cloned).pipe(
        catchError((error: HttpErrorResponse) => {
          console.group('❌ AuthInterceptor - HTTP Error Details');
          console.error('Status:', error.status);
          console.error('Status Text:', error.statusText);
          console.error('URL:', req.url);
          console.error('Method:', req.method);
          console.error('Error Message:', error.message);
          console.error('Error Body:', error.error);
          console.error('Headers:', error.headers);
          console.groupEnd();
          
          if (error.status === 401) {
            console.error('User token expired or invalid, logging out...');
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