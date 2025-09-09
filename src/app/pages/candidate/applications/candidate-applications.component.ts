import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CandidateAuthService } from '../../../services/candidate-auth.service';
import { CandidateService } from '../../../services/candidate.service';
import { Candidate, Application, CandidateFavorite } from '../../../models/candidate.model';

@Component({
  selector: 'app-candidate-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16">
            <div class="flex items-center">
              <h1 class="text-2xl font-bold text-gray-900">SmartHire</h1>
              <span class="ml-2 text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">Candidat</span>
            </div>
            
            <div class="flex items-center space-x-4">
              <div class="flex items-center" *ngIf="currentCandidate">
                <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-2">
                  {{ currentCandidate.firstName.charAt(0).toUpperCase() }}{{ currentCandidate.lastName.charAt(0).toUpperCase() }}
                </div>
                <span class="text-sm text-gray-700">{{ currentCandidate.firstName }} {{ currentCandidate.lastName }}</span>
              </div>
              
              <button (click)="logout()" class="text-gray-500 hover:text-gray-700">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <!-- Welcome Section -->
        <div class="px-4 py-6 sm:px-0">
          <div class="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-6 text-white mb-8">
            <h2 class="text-2xl font-bold mb-2">
              Bienvenue {{ currentCandidate?.firstName }} ! 👋
            </h2>
            <p class="text-blue-100">
              Découvrez les meilleures opportunités d'emploi et gérez vos candidatures en toute simplicité.
            </p>
          </div>

          <!-- Quick Stats -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="p-5">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2H6a2 2 0 00-2 2v2m16 0a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h16z"></path>
                    </svg>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-medium text-gray-500 truncate">Mes candidatures</dt>
                      <dd class="text-lg font-medium text-gray-900">{{ stats.totalApplications }}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="p-5">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-medium text-gray-500 truncate">Entretiens programmés</dt>
                      <dd class="text-lg font-medium text-gray-900">{{ stats.interviewsScheduled }}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="p-5">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                    </svg>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-medium text-gray-500 truncate">Offres favorites</dt>
                      <dd class="text-lg font-medium text-gray-900">{{ stats.totalFavorites }}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="p-5">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <svg class="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-medium text-gray-500 truncate">CVs uploadés</dt>
                      <dd class="text-lg font-medium text-gray-900">{{ stats.totalCVs }}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <a routerLink="/candidate/job-offers" 
               class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200 block">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2H6a2 2 0 00-2 2v2m16 0a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h16z"></path>
                    </svg>
                  </div>
                </div>
                <div class="ml-4">
                  <h3 class="text-lg font-medium text-gray-900">Parcourir les offres</h3>
                  <p class="text-sm text-gray-500">Découvrez {{ jobOfferStats.activeOffers }} offres disponibles</p>
                </div>
              </div>
            </a>

            <a routerLink="/candidate/applications" 
               class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200 block">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                  </div>
                </div>
                <div class="ml-4">
                  <h3 class="text-lg font-medium text-gray-900">Mes candidatures</h3>
                  <p class="text-sm text-gray-500">Suivez l'état de vos {{ stats.totalApplications }} candidature(s)</p>
                </div>
              </div>
            </a>

            <a routerLink="/candidate/cvs" 
               class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200 block">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                  </div>
                </div>
                <div class="ml-4">
                  <h3 class="text-lg font-medium text-gray-900">Gérer mes CVs</h3>
                  <p class="text-sm text-gray-500">{{ stats.totalCVs }} CV(s) dans votre CVthèque</p>
                </div>
              </div>
            </a>
          </div>

          <!-- Recent Applications -->
          <div class="bg-white shadow rounded-lg mb-8">
            <div class="px-6 py-4 border-b border-gray-200">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-medium text-gray-900">Candidatures récentes</h3>
                <a routerLink="/candidate/applications" class="text-sm text-blue-600 hover:text-blue-500">
                  Voir toutes →
                </a>
              </div>
            </div>
            
            <div *ngIf="loading" class="p-6 text-center">
              <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p class="mt-2 text-sm text-gray-500">Chargement...</p>
            </div>

            <div *ngIf="!loading && recentApplications.length === 0" class="p-6 text-center text-gray-500">
              <svg class="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              <p>Aucune candidature pour le moment</p>
              <p class="text-sm text-gray-400 mt-1">Commencez par parcourir nos offres d'emploi</p>
              <a routerLink="/candidate/job-offers" class="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                Voir les offres
              </a>
            </div>

            <div *ngIf="!loading && recentApplications.length > 0" class="divide-y divide-gray-200">
              <div *ngFor="let application of recentApplications" class="p-6 hover:bg-gray-50">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <h4 class="text-lg font-medium text-gray-900">{{ application.jobOffer?.title }}</h4>
                    <p class="text-sm text-gray-600">{{ application.jobOffer?.company }} • {{ application.jobOffer?.location }}</p>
                    <p class="text-xs text-gray-500 mt-1">Postulé le {{ formatDate(application.applied_at) }}</p>
                  </div>
                  <div class="flex items-center space-x-3">
                    <span [class]="'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ' + getStatusClass(application.status)">
                      {{ getStatusLabel(application.status) }}
                    </span>
                    <a [routerLink]="['/candidate/applications', application.id]" 
                       class="text-blue-600 hover:text-blue-500 text-sm font-medium">
                      Voir détails →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Favorites Section -->
          <div class="bg-white shadow rounded-lg">
            <div class="px-6 py-4 border-b border-gray-200">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-medium text-gray-900">Offres favorites</h3>
                <a routerLink="/candidate/favorites" class="text-sm text-blue-600 hover:text-blue-500">
                  Voir toutes →
                </a>
              </div>
            </div>
            
            <div *ngIf="loadingFavorites" class="p-6 text-center">
              <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p class="mt-2 text-sm text-gray-500">Chargement...</p>
            </div>

            <div *ngIf="!loadingFavorites && recentFavorites.length === 0" class="p-6 text-center text-gray-500">
              <svg class="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
              </svg>
              <p>Aucune offre favorite</p>
              <p class="text-sm text-gray-400 mt-1">Sauvegardez vos offres préférées pour les retrouver facilement</p>
            </div>

            <div *ngIf="!loadingFavorites && recentFavorites.length > 0" class="divide-y divide-gray-200">
              <div *ngFor="let favorite of recentFavorites" class="p-6 hover:bg-gray-50">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <h4 class="text-lg font-medium text-gray-900">{{ favorite.jobOffer?.title }}</h4>
                    <p class="text-sm text-gray-600">{{ favorite.jobOffer?.company }} • {{ favorite.jobOffer?.location }}</p>
                    <p class="text-xs text-gray-500 mt-1">Ajouté aux favoris le {{ formatDate(favorite.createdAt!) }}</p>
                  </div>
                  <div class="flex items-center space-x-3">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {{ favorite.jobOffer?.contract_type }}
                    </span>
                    <a [routerLink]="['/candidate/job-offers', favorite.job_offer_id]" 
                       class="text-blue-600 hover:text-blue-500 text-sm font-medium">
                      Voir l'offre →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
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
export class CandidateDashboardComponent implements OnInit {
  currentCandidate: Candidate | null = null;
  recentApplications: Application[] = [];
  recentFavorites: CandidateFavorite[] = [];
  loading = false;
  loadingFavorites = false;
  
  stats = {
    totalApplications: 0,
    interviewsScheduled: 0,
    totalFavorites: 0,
    totalCVs: 0
  };

  jobOfferStats = {
    activeOffers: 0
  };

  constructor(
    private candidateAuthService: CandidateAuthService,
    private candidateService: CandidateService
  ) {}

  ngOnInit(): void {
    this.candidateAuthService.currentCandidate$.subscribe(candidate => {
      this.currentCandidate = candidate;
    });

    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;
    this.loadingFavorites = true;

    // Charger les candidatures récentes
    this.candidateService.getMyApplications().subscribe({
      next: (applications) => {
        this.recentApplications = applications.slice(0, 5);
        this.stats.totalApplications = applications.length;
        this.stats.interviewsScheduled = applications.filter(app => 
          app.status === 'interview_scheduled'
        ).length;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading applications:', error);
        this.loading = false;
      }
    });

    // Charger les favoris récents
    this.candidateService.getFavorites().subscribe({
      next: (favorites) => {
        this.recentFavorites = favorites.slice(0, 5);
        this.stats.totalFavorites = favorites.length;
        this.loadingFavorites = false;
      },
      error: (error) => {
        console.error('Error loading favorites:', error);
        this.loadingFavorites = false;
      }
    });
    
    this.candidateService.getCVs().subscribe({
      next: (cvs) => {
        this.stats.totalCVs = cvs.length;
      },
      error: (error) => {
        console.error('Error loading CVs:', error);
      }
    });
    
    // Charger les stats des offres d'emploi
    this.candidateService.getJobOfferStats().subscribe({
      next: (stats) => {
        this.jobOfferStats = stats;
      },
      error: (error) => {
        console.error('Error loading job offer stats:', error);
      }
    });
  }

  logout(): void {
    this.candidateAuthService.logout().subscribe();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  getStatusClass(status: string): string {
    const classes = {
      'applied': 'bg-blue-100 text-blue-800',
      'under_review': 'bg-yellow-100 text-yellow-800',
      'interview_scheduled': 'bg-green-100 text-green-800',
      'interview_completed': 'bg-purple-100 text-purple-800',
      'accepted': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800'
    };
    return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  }

  getStatusLabel(status: string): string {
    const labels = {
      'applied': 'Postulé',
      'under_review': 'En examen',
      'interview_scheduled': 'Entretien programmé',
      'interview_completed': 'Entretien terminé',
      'accepted': 'Accepté',
      'rejected': 'Rejeté'
    };
    return labels[status as keyof typeof labels] || status;
  }
}