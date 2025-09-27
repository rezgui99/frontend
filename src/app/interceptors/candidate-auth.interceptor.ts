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
import { CandidateAuthService } from '../services/candidate-auth.service';

@Injectable()
export class CandidateAuthInterceptor implements HttpInterceptor {

  constructor(private candidateAuthService: CandidateAuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Vérifier si c'est une requête pour l'API candidat
    if (req.url.includes('/candidate/') || req.url.includes('/api/candidate/')) {
      const token = this.candidateAuthService.token;

      console.log('👤 CandidateAuthInterceptor - Request URL:', req.url);
      console.log('🔑 CandidateAuthInterceptor - Token:', token ? 'Present' : 'Missing');

      if (token) {
        const cloned = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });

        console.log('✅ CandidateAuthInterceptor - Added Authorization header');

        return next.handle(cloned).pipe(
          catchError((error: HttpErrorResponse) => {
            console.error('❌ CandidateAuthInterceptor - HTTP Error:', error.status, error.message);
            if (error.status === 401) {
              console.error('Candidate token expired or invalid, logging out...');
              this.candidateAuthService.forceLogout();
            } else if (error.status === 500) {
              console.error('Server error detected, showing user-friendly message');
              // Modifier l'erreur pour afficher un message utilisateur
              const userFriendlyError = {
                ...error,
                error: {
                  ...error.error,
                  message: 'Erreur serveur interne, veuillez réessayer dans quelques instants'
                }
              };
              return throwError(() => userFriendlyError);
            }
            return throwError(() => error);
          })
        );
      } else {
        console.log('⚠️ CandidateAuthInterceptor - No token available');
      }
    }

    return next.handle(req);
  }
}