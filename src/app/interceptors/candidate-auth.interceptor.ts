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
    if (req.url.includes('/candidate/')) {
      const token = this.candidateAuthService.token;

      if (token) {
        const cloned = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
        return next.handle(cloned).pipe(
          catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
              console.error('Candidate token expired or invalid, logging out...');
              this.candidateAuthService.forceLogout();
            }
            return throwError(() => error);
          })
        );
      }
    }

    return next.handle(req);
  }
}