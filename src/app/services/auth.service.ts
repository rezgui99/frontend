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

  constructor(private http: HttpClient, private router: Router) {
    this.loadTokenFromStorage();
  }

  private loadTokenFromStorage(): void {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('current_user');

    console.log('🔍 AuthService - Loading from storage - Token:', token ? 'Found' : 'Not found');
    console.log('🔍 AuthService - Loading from storage - User:', user ? 'Found' : 'Not found');
    
    if (token && user) {
      try {
        const parsedUser = JSON.parse(user);
        this.tokenSubject.next(token);
        this.currentUserSubject.next(parsedUser);
        console.log('✅ AuthService - Token and user loaded successfully');
        console.log('📧 AuthService - Email verified:', parsedUser.emailVerified);
      } catch {
        console.error('❌ AuthService - Error parsing stored data, clearing');
        this.clearAuthData();
      }
    } else {
      console.log('⚠️ AuthService - No token or user in storage');
    }
  }

  private setAuthData(token: string, user: User): void {
    console.log('💾 AuthService - Setting auth data');
    console.log('🔑 Token:', token ? 'Present' : 'Missing');
    console.log('👤 User:', user.email);
    console.log('📧 Email verified:', user.emailVerified);
   
    localStorage.setItem('auth_token', token);
    localStorage.setItem('current_user', JSON.stringify(user));
    this.tokenSubject.next(token);
    this.currentUserSubject.next(user);
  }

  private clearAuthData(): void {
    console.log('🗑️ AuthService - Clearing auth data');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('🚨 AuthService - HTTP Error:', error);
    
    let errorMessage = 'Une erreur inattendue s\'est produite';
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    const apiError: ApiError = {
      error: error.error?.error || 'Unknown error',
      message: errorMessage,
      details: error.error?.details || []
    };

    console.error('📝 AuthService - Formatted error:', apiError);
    return throwError(() => apiError);
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get token(): string | null {
    return this.tokenSubject.value;
  }

  get isAuthenticated(): boolean {
    const hasToken = !!this.token;
    const hasUser = !!this.currentUser;
    const isEmailVerified = !!this.currentUser?.emailVerified;
    
    console.log('🔐 AuthService - Authentication check:');
    console.log('  - Has token:', hasToken);
    console.log('  - Has user:', hasUser);
    console.log('  - Email verified:', isEmailVerified);
    console.log('  - Is authenticated:', hasToken && hasUser && isEmailVerified);
    
    return hasToken && hasUser && isEmailVerified;
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    console.log('📝 AuthService - Registering user:', data.email);
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data)
      .pipe(
        tap(res => {
          console.log('✅ Registration response received:', res);
          console.log('📧 Email verification required:', res.emailVerificationRequired);
          
          // Ne pas connecter automatiquement lors de l'inscription
          // L'utilisateur doit d'abord vérifier son email
          if (res.token) {
            console.log('⚠️ Token received but email verification required - not logging in');
          }
        }),
        catchError(err => this.handleError(err))
      );
  }

  login(data: LoginRequest): Observable<AuthResponse> {
    console.log('🔑 AuthService - Logging in user:', data.email);
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, data)
      .pipe(
        tap(res => {
          console.log('✅ Login response received:', res);
          
          // Vérifier si la vérification email est requise
          if (res.emailVerificationRequired) {
            console.log('📧 Email verification required - not logging in');
            // Ne pas connecter l'utilisateur, rediriger vers vérification
            return;
          }
          
          if (res.token && res.user) {
            console.log('👤 User roles:', res.user.roles);
            console.log('🎭 Primary role:', res.user.role);
            console.log('📧 Email verified:', res.user.emailVerified);
            this.setAuthData(res.token, res.user);
          } else {
            console.log('⚠️ Login response missing token or user data');
          }
        }),
        catchError(err => this.handleError(err))
      );
  }

  logout(): Observable<void> {
    console.log('👋 AuthService - Logging out user');
    this.clearAuthData();
    this.router.navigate(['/auth/login']);
    return of();
  }

  forceLogout(): void {
    console.log('🚨 AuthService - Force logout');
    this.clearAuthData();
    this.router.navigate(['/auth/login']);
  }

  forgotPassword(data: ForgotPasswordRequest): Observable<any> {
    console.log('🔑 AuthService - Forgot password for:', data.email);
    
    return this.http.post(`${this.apiUrl}/forgot-password`, data)
      .pipe(catchError(err => this.handleError(err)));
  }

  resetPassword(data: ResetPasswordRequest): Observable<any> {
    console.log('🔄 AuthService - Resetting password');
    
    return this.http.post(`${this.apiUrl}/reset-password`, data)
      .pipe(catchError(err => this.handleError(err)));
  }

  verifyEmail(data: { email: string; code: string }): Observable<any> {
    console.log('📧 AuthService - Verifying email:', data.email);
    console.log('🔢 AuthService - Verification code:', data.code);
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/verify-email`, data)
      .pipe(
        tap(res => {
          console.log('✅ Email verification response received:', res);
          
          // Si un token est retourné, connecter automatiquement l'utilisateur
          if (res.token && res.user) {
            console.log('🔐 Auto-login after email verification');
            console.log('👤 Verified user:', res.user.email);
            console.log('📧 Email verified status:', res.user.emailVerified);
            this.setAuthData(res.token, res.user);
          } else {
            console.log('⚠️ Email verification response missing token or user');
          }
        }),
        catchError(err => this.handleError(err))
      );
  }

  resendVerificationCode(data: { email: string }): Observable<any> {
    console.log('📮 AuthService - Resending verification code to:', data.email);
    
    return this.http.post(`${this.apiUrl}/resend-verification`, data)
      .pipe(catchError(err => this.handleError(err)));
  }

  getProfile(): Observable<{ user: User }> {
    console.log('👤 AuthService - Getting user profile');
    
    return this.http.get<{ user: User }>(`${this.apiUrl}/profile`)
      .pipe(
        tap(res => {
          console.log('✅ Profile received:', res.user.email);
          this.currentUserSubject.next(res.user);
          localStorage.setItem('current_user', JSON.stringify(res.user));
        }),
        catchError(err => this.handleError(err))
      );
  }

  updateProfile(data: UpdateProfileRequest): Observable<{ message: string; user: User }> {
    console.log('📝 AuthService - Updating profile');
    
    return this.http.put<{ message: string; user: User }>(`${this.apiUrl}/profile`, data)
      .pipe(
        tap(res => {
          console.log('✅ Profile updated:', res.user.email);
          this.currentUserSubject.next(res.user);
          localStorage.setItem('current_user', JSON.stringify(res.user));
        }),
        catchError(err => this.handleError(err))
      );
  }

  hasRole(role: string): boolean {
    const user = this.currentUser;
    if (!user) {
      console.log('🔒 AuthService - No user for role check');
      return false;
    }
    
    // Vérifier dans le tableau des rôles
    if (user.roles && Array.isArray(user.roles)) {
      const hasRole = user.roles.includes(role);
      console.log(`🔒 AuthService - Role check (${role}):`, hasRole, '- User roles:', user.roles);
      return hasRole;
    }
    
    // Si l'utilisateur a un rôle simple
    const hasRole = user.role === role;
    console.log(`🔒 AuthService - Simple role check (${role}):`, hasRole, '- User role:', user.role);
    return hasRole;
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.currentUser;
    if (!user) {
      console.log('🔒 AuthService - No user for role check');
      return false;
    }
    
    // Vérifier dans le tableau des rôles
    if (user.roles && Array.isArray(user.roles)) {
      const hasAnyRole = roles.some(role => user.roles.includes(role));
      console.log(`🔒 AuthService - Any role check (${roles.join(', ')}):`, hasAnyRole, '- User roles:', user.roles);
      return hasAnyRole;
    }
    
    // Si l'utilisateur a un rôle simple
    const hasAnyRole = roles.includes(user.role);
    console.log(`🔒 AuthService - Simple any role check (${roles.join(', ')}):`, hasAnyRole, '- User role:', user.role);
    return hasAnyRole;
  }

  get isAdmin(): boolean {
    return this.hasRole('admin');
  }

  get isHR(): boolean {
    return this.hasRole('hr') || this.hasRole('admin');
  }

  // Méthode utilitaire pour vérifier si l'utilisateur a un email vérifié
  get hasVerifiedEmail(): boolean {
    return !!this.currentUser?.emailVerified;
  }

  // Méthode pour obtenir l'email de l'utilisateur actuel
  get userEmail(): string | null {
    return this.currentUser?.email || null;
  }

  // Méthode pour rafraîchir les données utilisateur
  refreshUser(): Observable<{ user: User }> {
    console.log('🔄 AuthService - Refreshing user data');
    return this.getProfile();
  }

  // Méthode pour vérifier si le token est expiré
  isTokenExpired(): boolean {
    // Cette méthode pourrait être étendue pour décoder et vérifier l'expiration du JWT
    const token = this.token;
    if (!token) return true;
    
    try {
      // Décoder la partie payload du JWT (base64)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convertir en millisecondes
      const now = Date.now();
      
      const isExpired = now >= exp;
      console.log('🕐 AuthService - Token expiration check:', isExpired ? 'EXPIRED' : 'VALID');
      return isExpired;
    } catch (error) {
      console.error('❌ AuthService - Error checking token expiration:', error);
      return true; // En cas d'erreur, considérer le token comme expiré
    }
  }
}