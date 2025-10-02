import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
      <div class="max-w-md w-full text-center">
        <div class="mb-8">
          <svg class="mx-auto h-24 w-24 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        </div>
        
        <h1 class="text-3xl font-bold text-gray-900 mb-4">Accès non autorisé</h1>
        <p class="text-gray-600 mb-8">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page.
        </p>
        
        <div class="space-y-4">
          <button routerLink="/home" class="btn btn-primary w-full">
            Retour à l'accueil
          </button>
          
          <div class="text-sm text-gray-500">
            <p>Votre rôle actuel : <span class="font-semibold">{{ currentUser?.role || 'Non défini' }}</span></p>
            <p class="mt-2">
              Contactez votre administrateur si vous pensez que c'est une erreur.
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class UnauthorizedComponent {
  currentUser = this.authService.currentUser;

  constructor(private authService: AuthService) {}
}