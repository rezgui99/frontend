export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'hr';
  roles: string[];
  isActive: boolean;
  isVerified: boolean;
  lastLogin?: string;
  emailVerified: boolean; // Cette propriété est cruciale
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  emailVerificationRequired?: boolean; // Ajouté comme optionnel pour compatibilité
  message: string;
  user?: User; // Optionnel car pas toujours présent
  token?: string; // Optionnel car pas toujours présent
  hadSuspiciousActivity?: boolean;
  isVerified?: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface ApiError {
  error: string;
  message: string;
  details?: string[];
}