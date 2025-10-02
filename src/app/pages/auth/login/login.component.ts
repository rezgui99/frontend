import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ApiError } from '../../../models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null; // Ajouté pour le message de succès
  returnUrl: string = '/home';
  showPassword = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {
    // Get return url from route parameters or default to '/home'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
    
    // Afficher un message si l'email vient d'être vérifié
    if (this.route.snapshot.queryParams['emailVerified'] === 'true') {
      this.successMessage = 'Email vérifié avec succès ! Vous pouvez maintenant vous connecter.';
      
      // Masquer le message après 5 secondes
      setTimeout(() => {
        this.successMessage = null;
      }, 5000);
    }
    
    // Redirect if already logged in
    if (this.authService.isAuthenticated) {
      this.router.navigate([this.returnUrl]);
    }
  }

  get f() {
    return this.loginForm.controls;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = null;

    const loginData = {
      email: this.loginForm.value.email,
      password: this.loginForm.value.password
    };

    this.authService.login(loginData).subscribe({
      next: (response) => {
        console.log('Login successful:', response);
        
        // NOUVEAU: Vérifier si la vérification email est requise
        if (response.emailVerificationRequired) {
          console.log('Email verification required - redirecting to verify-email');
          this.router.navigate(['/auth/verify-email'], {
            queryParams: { email: loginData.email }
          });
          return;
        }
        
        // Afficher un message si il y avait des activités suspectes
        if (response.hadSuspiciousActivity === true) {
          console.log('Connexion réussie après activité suspecte détectée');
        }
        
        // Redirection normale vers l'application
        this.router.navigate([this.returnUrl]);
      },
      error: (error: ApiError) => {
        console.error('Login error:', error);
        
        // NOUVEAU: Gestion spéciale pour email non vérifié
        if (error.error === 'Email non vérifié' || 
            error.message?.includes('vérifier votre email') ||
            error.message?.includes('Email non vérifié')) {
          console.log('Email not verified - redirecting to verify-email');
          this.router.navigate(['/auth/verify-email'], {
            queryParams: { email: loginData.email }
          });
          return;
        }
        
        this.errorMessage = error.message || 'Erreur lors de la connexion';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string | null {
    const field = this.loginForm.get(fieldName);
    
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} est requis`;
      }
      if (field.errors['email']) {
        return 'Format d\'email invalide';
      }
      if (field.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} doit contenir au moins ${field.errors['minlength'].requiredLength} caractères`;
      }
    }
    
    return null;
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      email: 'L\'email',
      password: 'Le mot de passe'
    };
    return labels[fieldName] || fieldName;
  }
}