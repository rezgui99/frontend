import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { 
  Candidate,
  CandidateRegisterRequest,
  CandidateLoginRequest,
  CandidateAuthResponse
} from '../models/candidate.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CandidateAuthService {
  private apiUrl = `${environment.backendUrl}/candidate/auth`;
  private currentCandidateSubject = new BehaviorSubject<Candidate | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);

  public currentCandidate$ = this.currentCandidateSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.loadTokenFromStorage();
  }

  private loadTokenFromStorage(): void {
    const token = localStorage.getItem('candidate_auth_token');
    const candidate = localStorage.getItem('current_candidate');

    if (token && candidate) {
      try {
        this.tokenSubject.next(token);
        this.currentCandidateSubject.next(JSON.parse(candidate));
      } catch {
        this.clearAuthData();
      }
    }
  }

  private setAuthData(token: string, candidate: Candidate): void {
    localStorage.setItem('candidate_auth_token', token);
    localStorage.setItem('current_candidate', JSON.stringify(candidate));
    this.tokenSubject.next(token);
    this.currentCandidateSubject.next(candidate);
  }

  private clearAuthData(): void {
    localStorage.removeItem('candidate_auth_token');
    localStorage.removeItem('current_candidate');
    this.tokenSubject.next(null);
    this.currentCandidateSubject.next(null);
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Une erreur inattendue s\'est produite';
    if (error.error?.message) errorMessage = error.error.message;
    else if (error.message) errorMessage = error.message;

    return throwError(() => ({
      error: error.error?.error || 'Unknown error',
      message: errorMessage,
      details: error.error?.details || []
    }));
  }

  get currentCandidate(): Candidate | null {
    return this.currentCandidateSubject.value;
  }

  get token(): string | null {
    return this.tokenSubject.value;
  }

  get isAuthenticated(): boolean {
    return !!this.token && !!this.currentCandidate;
  }

  register(data: CandidateRegisterRequest): Observable<CandidateAuthResponse> {
    return this.http.post<CandidateAuthResponse>(`${this.apiUrl}/register`, data)
      .pipe(
        tap(res => this.setAuthData(res.token, res.candidate)),
        catchError(err => this.handleError(err))
      );
  }

  login(data: CandidateLoginRequest): Observable<CandidateAuthResponse> {
    return this.http.post<CandidateAuthResponse>(`${this.apiUrl}/login`, data)
      .pipe(
        tap(res => this.setAuthData(res.token, res.candidate)),
        catchError(err => this.handleError(err))
      );
  }

  logout(): Observable<void> {
    this.clearAuthData();
    this.router.navigate(['/candidate/login']);
    return of();
  }

  forceLogout(): void {
    this.clearAuthData();
    this.router.navigate(['/candidate/login']);
  }

  getProfile(): Observable<{ candidate: Candidate }> {
    return this.http.get<{ candidate: Candidate }>(`${this.apiUrl}/profile`)
      .pipe(
        tap(res => {
          this.currentCandidateSubject.next(res.candidate);
          localStorage.setItem('current_candidate', JSON.stringify(res.candidate));
        }),
        catchError(err => this.handleError(err))
      );
  }

  updateProfile(data: Partial<Candidate>): Observable<{ message: string; candidate: Candidate }> {
    return this.http.put<{ message: string; candidate: Candidate }>(`${this.apiUrl}/profile`, data)
      .pipe(
        tap(res => {
          this.currentCandidateSubject.next(res.candidate);
          localStorage.setItem('current_candidate', JSON.stringify(res.candidate));
        }),
        catchError(err => this.handleError(err))
      );
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email })
      .pipe(catchError(err => this.handleError(err)));
  }

  resetPassword(data: { token: string; newPassword: string; confirmPassword: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, data)
      .pipe(catchError(err => this.handleError(err)));
  }
}