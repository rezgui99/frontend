import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-email-verification',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8">
        <!-- Header -->
        <div class="text-center">
          <div class="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-blue-100">
            <svg class="h-10 w-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
          </div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Vérifiez votre email
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600">
            Nous avons envoyé un code de vérification à
            <span class="font-medium text-blue-600">{{ email }}</span>
          </p>
        </div>

        <!-- Success Message -->
        <div *ngIf="successMessage" class="rounded-md bg-green-50 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-green-800">{{ successMessage }}</h3>
              <p class="text-sm text-green-700 mt-1">Redirection en cours...</p>
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div *ngIf="errorMessage" class="rounded-md bg-red-50 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">{{ errorMessage }}</h3>
            </div>
          </div>
        </div>

        <!-- Form -->
        <form class="mt-8 space-y-6" [formGroup]="verificationForm" (ngSubmit)="onSubmit()">
          <div>
            <label for="code" class="block text-sm font-medium text-gray-700 mb-2">
              Code de vérification
            </label>
            <input
              id="code"
              name="code"
              type="text"
              maxlength="6"
              formControlName="code"
              class="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl font-mono tracking-widest"
              placeholder="000000"
              (input)="onCodeInput($event)">
            <p *ngIf="getFieldError('code')" class="mt-1 text-sm text-red-600">
              {{ getFieldError('code') }}
            </p>
          </div>

          <!-- Timer -->
          <div *ngIf="timeRemaining > 0" class="text-center">
            <p class="text-sm text-gray-600">
              Code expire dans : 
              <span class="font-medium text-blue-600">{{ formatTime(timeRemaining) }}</span>
            </p>
          </div>

          <!-- Submit button -->
          <div>
            <button
              type="submit"
              [disabled]="loading || verificationForm.invalid"
              class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
              <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                <svg *ngIf="!loading" class="h-5 w-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <svg *ngIf="loading" class="animate-spin h-5 w-5 text-blue-300" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
              {{ loading ? 'Vérification...' : 'Vérifier le code' }}
            </button>
          </div>

          <!-- Resend code -->
          <div class="text-center">
            <p class="text-sm text-gray-600">
              Vous n'avez pas reçu le code ?
              <button type="button" 
                      (click)="resendCode()" 
                      [disabled]="resending || timeRemaining > 0"
                      class="font-medium text-blue-600 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                {{ resending ? 'Envoi...' : 'Renvoyer le code' }}
              </button>
            </p>
          </div>

          <!-- Back to login -->
          <div class="text-center">
            <p class="text-sm text-gray-600">
              <a routerLink="/auth/login" class="font-medium text-blue-600 hover:text-blue-500">
                ← Retour à la connexion
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .animate-spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class EmailVerificationComponent implements OnInit {
  verificationForm: FormGroup;
  loading = false;
  resending = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  email: string = '';
  timeRemaining = 600; // 10 minutes en secondes
  private timer: any;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.verificationForm = this.formBuilder.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });
  }

  ngOnInit(): void {
    // Récupérer l'email depuis les paramètres de requête
    this.email = this.route.snapshot.queryParams['email'] || '';
    
    if (!this.email) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.startTimer();
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  startTimer(): void {
    this.timer = setInterval(() => {
      this.timeRemaining--;
      if (this.timeRemaining <= 0) {
        clearInterval(this.timer);
      }
    }, 1000);
  }

  onCodeInput(event: any): void {
    // Auto-submit quand 6 chiffres sont saisis
    const code = event.target.value;
    if (code.length === 6 && /^\d{6}$/.test(code)) {
      this.onSubmit();
    }
  }

  onSubmit(): void {
    if (this.verificationForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = null;

    const verificationData = {
      email: this.email,
      code: this.verificationForm.value.code
    };

    this.authService.verifyEmail(verificationData).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        
        // Rediriger vers la page de connexion après 3 secondes
        setTimeout(() => {
          this.router.navigate(['/auth/login'], {
            queryParams: { emailVerified: 'true' }
          });
        }, 3000);
      },
      error: (error: any) => {
        this.errorMessage = error.error?.message || error.message || 'Erreur lors de la vérification';
        
        // Si le code a expiré, proposer de renvoyer un nouveau code
        if (this.errorMessage?.includes('expiré')) {
          this.timeRemaining = 0;
        }
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  resendCode(): void {
    this.resending = true;
    this.errorMessage = null;

    this.authService.resendVerificationCode({ email: this.email }).subscribe({
      next: (response) => {
        this.successMessage = 'Nouveau code envoyé ! Vérifiez votre email.';
        this.timeRemaining = 600; // Reset timer à 10 minutes
        this.startTimer();
        this.verificationForm.reset();
        
        // Effacer le message de succès après 5 secondes
        setTimeout(() => {
          this.successMessage = null;
        }, 5000);
      },
      error: (error: any) => {
        this.errorMessage = error.error?.message || error.message || 'Erreur lors du renvoi du code';
      },
      complete: () => {
        this.resending = false;
      }
    });
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.verificationForm.controls).forEach(key => {
      const control = this.verificationForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string | null {
    const field = this.verificationForm.get(fieldName);
    
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return 'Code de vérification requis';
      }
      if (field.errors['pattern']) {
        return 'Le code doit contenir exactement 6 chiffres';
      }
    }
    
    return null;
  }
}