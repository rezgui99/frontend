import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { 
  User, 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  ForgotPasswordRequest, 
  ResetPasswordRequest,
  UpdateProfileRequest,
  ApiError 
} from '../models/auth.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.backendUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);

  public currentUser$ = this.currentUserSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();
   isAdmin: boolean = false; 

  constructor(private http: HttpClient, private router: Router) {
    this.loadTokenFromStorage();
  }

  private loadTokenFromStorage(): void {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('current_user');

    if (token && user) {
      try {
        this.tokenSubject.next(token);
        this.currentUserSubject.next(JSON.parse(user));
      } catch {
        this.clearAuthData();
      }
    }
  }

  private setAuthData(token: string, user: User): void {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('current_user', JSON.stringify(user));
    this.tokenSubject.next(token);
    this.currentUserSubject.next(user);
  }

  private clearAuthData(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Une erreur inattendue s\'est produite';
    if (error.error?.message) errorMessage = error.error.message;
    else if (error.message) errorMessage = error.message;

    return throwError(() => ({
      error: error.error?.error || 'Unknown error',
      message: errorMessage,
      details: error.error?.details || []
    } as ApiError));
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get token(): string | null {
    return this.tokenSubject.value;
  }

  get isAuthenticated(): boolean {
    return !!this.token && !!this.currentUser;
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data)
      .pipe(
        tap(res => this.setAuthData(res.token, res.user)),
        catchError(err => this.handleError(err))
      );
  }

  login(data: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, data)
      .pipe(
        tap(res => this.setAuthData(res.token, res.user)),
        catchError(err => this.handleError(err))
      );
  }

  logout(): Observable<void> {
    this.clearAuthData();
    this.router.navigate(['/auth/login']);
    return of();
  }

  forceLogout(): void {
    this.clearAuthData();
    this.router.navigate(['/auth/login']);
  }

  forgotPassword(data: ForgotPasswordRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, data)
      .pipe(catchError(err => this.handleError(err)));
  }

  resetPassword(data: ResetPasswordRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, data)
      .pipe(catchError(err => this.handleError(err)));
  }

  getProfile(): Observable<{ user: User }> {
    return this.http.get<{ user: User }>(`${this.apiUrl}/profile`)
      .pipe(
        tap(res => {
          this.currentUserSubject.next(res.user);
          localStorage.setItem('current_user', JSON.stringify(res.user));
        }),
        catchError(err => this.handleError(err))
      );
  }

  updateProfile(data: UpdateProfileRequest): Observable<{ message: string; user: User }> {
    return this.http.put<{ message: string; user: User }>(`${this.apiUrl}/profile`, data)
      .pipe(
        tap(res => {
          this.currentUserSubject.next(res.user);
          localStorage.setItem('current_user', JSON.stringify(res.user));
        }),
        catchError(err => this.handleError(err))
      );
  }

  hasRole(role: string): boolean {
    return this.currentUser?.role === role;
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.includes(this.currentUser?.role || '');
  }
}
