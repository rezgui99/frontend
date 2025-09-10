import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InterviewService } from '../../../services/interview.service';
import { 
  Interview, 
  InterviewFilters, 
  InterviewStatistics,
  InterviewType,
  InterviewStatus 
} from '../../../models/interview.model';

@Component({
  selector: 'app-recruiter-interviews',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="p-6">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-3xl font-bold text-primary">📅 Gestion des Entretiens</h2>
          <p class="text-gray-600 mt-2">Planifiez et gérez tous vos entretiens de recrutement</p>
        </div>
        <button (click)="showScheduleModal = true" class="btn btn-primary">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          Programmer un entretien
        </button>
      </div>

      <!-- Statistiques rapides -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div class="bg-blue-50 p-4 rounded-lg text-center">
          <div class="text-2xl font-bold text-blue-600">{{ statistics.totalInterviews || 0 }}</div>
          <div class="text-sm text-gray-600">Total entretiens</div>
        </div>
        <div class="bg-green-50 p-4 rounded-lg text-center">
          <div class="text-2xl font-bold text-green-600">{{ statistics.statusBreakdown.scheduled || 0 }}</div>
          <div class="text-sm text-gray-600">Programmés</div>
        </div>
        <div class="bg-yellow-50 p-4 rounded-lg text-center">
          <div class="text-2xl font-bold text-yellow-600">{{ statistics.statusBreakdown.completed || 0 }}</div>
          <div class="text-sm text-gray-600">Terminés</div>
        </div>
        <div class="bg-purple-50 p-4 rounded-lg text-center">
          <div class="text-2xl font-bold text-purple-600">{{ statistics.averageScore || 0 | number:'1.0-0' }}</div>
          <div class="text-sm text-gray-600">Score moyen</div>
        </div>
        <div class="bg-indigo-50 p-4 rounded-lg text-center">
          <div class="text-2xl font-bold text-indigo-600">{{ statistics.upcomingInterviews || 0 }}</div>
          <div class="text-sm text-gray-600">Cette semaine</div>
        </div>
      </div>

      <!-- Filtres -->
      <div class="card mb-6">
        <h3 class="text-lg font-semibold text-dark mb-4">🔍 Filtres</h3>
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label class="block text-gray-700 text-sm font-bold mb-2">Statut</label>
            <select [(ngModel)]="filters.status" (change)="onFilterChange()" 
                    class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Tous les statuts</option>
              <option *ngFor="let status of statusOptions" [value]="status.value">{{ status.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-gray-700 text-sm font-bold mb-2">Type</label>
            <select [(ngModel)]="filters.interview_type" (change)="onFilterChange()" 
                    class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Tous les types</option>
              <option *ngFor="let type of typeOptions" [value]="type.value">{{ type.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-gray-700 text-sm font-bold mb-2">Date début</label>
            <input type="date" [(ngModel)]="filters.date_from" (change)="onFilterChange()" 
                   class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
          </div>
          <div>
            <label class="block text-gray-700 text-sm font-bold mb-2">Date fin</label>
            <input type="date" [(ngModel)]="filters.date_to" (change)="onFilterChange()" 
                   class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
          </div>
          <div class="flex items-end">
            <button (click)="clearFilters()" class="btn btn-secondary w-full">
              Effacer filtres
            </button>
          </div>
        </div>
      </div>

      <!-- Liste des entretiens -->
      <div class="card">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-semibold text-dark">
            📋 Entretiens ({{ pagination.total }})
          </h3>
        </div>

        <div *ngIf="loading" class="text-center py-8">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p class="mt-2 text-gray-600">Chargement des entretiens...</p>
        </div>

        <div *ngIf="!loading && interviews.length === 0" class="text-center py-8 text-gray-500">
          <svg class="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6m-6 0l-1 1m7-1l1 1m-6 0v6a2 2 0 002 2h2a2 2 0 002-2v-6"></path>
          </svg>
          <p>Aucun entretien trouvé</p>
        </div>

        <div *ngIf="!loading && interviews.length > 0" class="space-y-4">
          <div *ngFor="let interview of interviews" 
               class="border rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
            
            <div class="flex justify-between items-start mb-4">
              <div class="flex-1">
                <h4 class="text-lg font-semibold text-gray-900">
                  {{ interview.application?.candidate?.firstName }} {{ interview.application?.candidate?.lastName }}
                </h4>
                <p class="text-sm text-gray-600">{{ interview.application?.jobOffer?.title }}</p>
                <p class="text-sm text-gray-500">{{ interview.application?.jobOffer?.company }}</p>
              </div>
              <div class="text-right">
                <span [class]="'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ' + getStatusClass(interview.status)">
                  {{ getStatusLabel(interview.status) }}
                </span>
                <p class="text-xs text-gray-500 mt-1">{{ getTypeLabel(interview.interview_type) }}</p>
              </div>
            </div>

            <!-- Détails de l'entretien -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p class="text-sm font-medium text-gray-700">📅 Date et heure</p>
                <p class="text-sm text-gray-900">{{ formatDateTime(interview.scheduled_date) }}</p>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-700">⏱️ Durée</p>
                <p class="text-sm text-gray-900">{{ interview.duration_minutes }} minutes</p>
              </div>
              <div *ngIf="interview.score">
                <p class="text-sm font-medium text-gray-700">📊 Score</p>
                <p class="text-sm font-bold" [class]="getScoreClass(interview.score)">{{ interview.score }}/100</p>
              </div>
            </div>

            <!-- Lien de réunion -->
            <div *ngIf="interview.meeting_link" class="mb-4 p-3 bg-blue-50 rounded-lg">
              <p class="text-sm font-medium text-blue-800 mb-1">🔗 Lien de l'entretien</p>
              <a [href]="interview.meeting_link" target="_blank" 
                 class="text-sm text-blue-600 hover:text-blue-800 underline">
                {{ interview.meeting_link }}
              </a>
            </div>

            <!-- Notes -->
            <div *ngIf="interview.notes" class="mb-4">
              <p class="text-sm font-medium text-gray-700 mb-1">📝 Notes</p>
              <p class="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{{ interview.notes }}</p>
            </div>

            <!-- Feedback -->
            <div *ngIf="interview.feedback" class="mb-4">
              <p class="text-sm font-medium text-gray-700 mb-1">💬 Feedback</p>
              <p class="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">{{ interview.feedback }}</p>
            </div>

            <!-- Actions -->
            <div class="flex flex-wrap gap-2 pt-3 border-t">
              <button *ngIf="interview.status === 'scheduled'" 
                      (click)="confirmInterview(interview)"
                      class="btn btn-primary text-sm">
                ✅ Confirmer
              </button>
              
              <button *ngIf="['scheduled', 'confirmed'].includes(interview.status)" 
                      (click)="showRescheduleModal(interview)"
                      class="btn btn-secondary text-sm">
                📅 Reprogrammer
              </button>
              
              <button *ngIf="['confirmed', 'in_progress'].includes(interview.status)" 
                      (click)="showCompleteModal(interview)"
                      class="btn bg-green-600 text-white hover:bg-green-700 text-sm">
                ✅ Terminer
              </button>
              
              <button *ngIf="!['completed', 'cancelled'].includes(interview.status)" 
                      (click)="cancelInterview(interview)"
                      class="btn bg-red-600 text-white hover:bg-red-700 text-sm">
                ❌ Annuler
              </button>
              
              <button (click)="showEditModal(interview)" 
                      class="btn btn-secondary text-sm">
                📝 Modifier
              </button>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div *ngIf="pagination.totalPages > 1" class="flex items-center justify-between mt-6 p-4 bg-gray-50 rounded-lg">
          <div class="text-sm text-gray-700">
            Affichage de {{ getStartIndex() }} à {{ getEndIndex() }} sur {{ pagination.total }} entretiens
          </div>
          <div class="flex items-center space-x-2">
            <button (click)="goToPage(pagination.page - 1)" 
                    [disabled]="pagination.page === 1"
                    class="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed">
              Précédent
            </button>
            <span class="text-sm text-gray-600">
              Page {{ pagination.page }} sur {{ pagination.totalPages }}
            </span>
            <button (click)="goToPage(pagination.page + 1)" 
                    [disabled]="pagination.page === pagination.totalPages"
                    class="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed">
              Suivant
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de programmation d'entretien -->
    <div *ngIf="showScheduleModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium text-gray-900">📅 Programmer un entretien</h3>
            <button (click)="closeScheduleModal()" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <form [formGroup]="scheduleForm" (ngSubmit)="onScheduleSubmit()">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-gray-700 text-sm font-bold mb-2">Date et heure *</label>
                <input type="datetime-local" 
                       formControlName="scheduled_date"
                       [min]="getMinDateTime()"
                       class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
              </div>

              <div>
                <label class="block text-gray-700 text-sm font-bold mb-2">Durée (minutes) *</label>
                <select formControlName="duration_minutes" 
                        class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 heure</option>
                  <option value="90">1h30</option>
                  <option value="120">2 heures</option>
                </select>
              </div>

              <div>
                <label class="block text-gray-700 text-sm font-bold mb-2">Type d'entretien *</label>
                <select formControlName="interview_type" 
                        class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                  <option *ngFor="let type of typeOptions" [value]="type.value">{{ type.label }}</option>
                </select>
              </div>

              <div>
                <label class="block text-gray-700 text-sm font-bold mb-2">Lieu (si présentiel)</label>
                <input type="text" 
                       formControlName="location"
                       placeholder="Adresse du bureau..."
                       class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
              </div>

              <div class="md:col-span-2">
                <label class="block text-gray-700 text-sm font-bold mb-2">Lien de réunion</label>
                <input type="url" 
                       formControlName="meeting_link"
                       placeholder="https://meet.google.com/..."
                       class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                <p class="text-xs text-gray-500 mt-1">Un lien sera généré automatiquement si vide</p>
              </div>

              <div class="md:col-span-2">
                <label class="block text-gray-700 text-sm font-bold mb-2">Notes</label>
                <textarea formControlName="notes" 
                          rows="3"
                          placeholder="Instructions ou informations importantes..."
                          class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"></textarea>
              </div>
            </div>

            <div class="flex justify-end space-x-2 mt-6">
              <button type="button" (click)="closeScheduleModal()" class="btn btn-secondary">
                Annuler
              </button>
              <button type="submit" 
                      [disabled]="scheduleForm.invalid || scheduling"
                      class="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                {{ scheduling ? 'Programmation...' : 'Programmer l\'entretien' }}
              </button>
            </div>
          </form>
        </div>
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

    .btn {
      @apply px-4 py-2 rounded-md font-semibold transition-colors duration-200;
    }

    .btn-primary {
      @apply bg-blue-600 text-white hover:bg-blue-700;
    }

    .btn-secondary {
      @apply bg-gray-200 text-gray-700 hover:bg-gray-300;
    }

    .card {
      @apply bg-white shadow-md rounded-lg p-6;
    }
  `]
})
export class RecruiterInterviewsComponent implements OnInit {
  interviews: Interview[] = [];
  statistics: InterviewStatistics = {
    totalInterviews: 0,
    statusBreakdown: {} as any,
    typeBreakdown: {} as any,
    averageScore: 0,
    upcomingInterviews: 0
  };
  
  loading = false;
  scheduling = false;
  
  filters: InterviewFilters = {
    page: 1,
    limit: 20
  };

  pagination = {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  };

  // Modal states
  showScheduleModal = false;
  scheduleForm: FormGroup;

  // Options
  statusOptions = [
    { value: 'scheduled', label: 'Programmé' },
    { value: 'confirmed', label: 'Confirmé' },
    { value: 'in_progress', label: 'En cours' },
    { value: 'completed', label: 'Terminé' },
    { value: 'cancelled', label: 'Annulé' },
    { value: 'rescheduled', label: 'Reprogrammé' }
  ];

  typeOptions = [
    { value: 'phone', label: 'Téléphonique' },
    { value: 'video', label: 'Vidéo' },
    { value: 'in_person', label: 'En personne' },
    { value: 'technical', label: 'Technique' },
    { value: 'hr', label: 'RH' },
    { value: 'final', label: 'Final' }
  ];

  constructor(
    private interviewService: InterviewService,
    private formBuilder: FormBuilder
  ) {
    this.scheduleForm = this.formBuilder.group({
      application_id: ['', Validators.required],
      scheduled_date: ['', Validators.required],
      duration_minutes: [60, [Validators.required, Validators.min(15), Validators.max(240)]],
      interview_type: ['video', Validators.required],
      location: [''],
      meeting_link: [''],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadInterviews();
    this.loadStatistics();
  }

  loadInterviews(): void {
    this.loading = true;
    
    console.log('🔍 Component - Loading interviews with filters:', this.filters);
    
    this.interviewService.getInterviews(this.filters).subscribe({
      next: (response) => {
        console.log('✅ Component - Interviews loaded:', response);
        this.interviews = response.interviews || [];
        this.pagination = response.pagination || {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0
        };
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading interviews:', error);
        console.error('Error details:', error.error);
        // Afficher des données de démonstration en cas d'erreur
        this.interviews = this.getMockInterviews();
        this.pagination = {
          total: this.interviews.length,
          page: 1,
          limit: 20,
          totalPages: 1
        };
        this.loading = false;
      }
    });
  }

  getMockInterviews(): Interview[] {
    return [
      {
        id: 1,
        application_id: 1,
        interviewer_id: 1,
        scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        duration_minutes: 60,
        interview_type: 'video',
        status: 'scheduled',
        meeting_link: 'https://meet.google.com/abc-defg-hij',
        notes: 'Entretien technique avec focus sur React/Node.js',
        decision: 'pending',
        reminder_sent: false,
        application: {
          id: 1,
          candidate: {
            id: 1,
            firstName: 'Jean',
            lastName: 'Dupont',
            email: 'jean.dupont@email.com',
            phone: '+33 1 23 45 67 89'
          },
          jobOffer: {
            id: 1,
            title: 'Développeur Full Stack',
            company: 'TechCorp'
          }
        },
        interviewer: {
          id: 1,
          firstName: 'Marie',
          lastName: 'Martin',
          email: 'marie.martin@company.com'
        }
      }
    ];
  }
  loadStatistics(): void {
    console.log('🔍 Component - Loading interview statistics...');
    this.interviewService.getStatistics().subscribe({
      next: (stats) => {
        console.log('✅ Component - Statistics loaded:', stats);
        this.statistics = stats;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
        console.error('Error details:', error.error);
      }
    });
  }

  onFilterChange(): void {
    this.filters.page = 1;
    this.loadInterviews();
  }

  clearFilters(): void {
    this.filters = {
      page: 1,
      limit: 20
    };
    this.loadInterviews();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.pagination.totalPages) {
      this.filters.page = page;
      this.loadInterviews();
    }
  }

  getStartIndex(): number {
    return (this.pagination.page - 1) * this.pagination.limit + 1;
  }

  getEndIndex(): number {
    return Math.min(this.pagination.page * this.pagination.limit, this.pagination.total);
  }

  // Modal methods
  closeScheduleModal(): void {
    this.showScheduleModal = false;
    this.scheduleForm.reset({
      duration_minutes: 60,
      interview_type: 'video'
    });
  }

  onScheduleSubmit(): void {
    if (this.scheduleForm.valid) {
      this.scheduling = true;
      
      this.interviewService.scheduleInterview(this.scheduleForm.value).subscribe({
        next: () => {
          this.closeScheduleModal();
          this.loadInterviews();
          this.loadStatistics();
          this.scheduling = false;
        },
        error: (error) => {
          console.error('Error scheduling interview:', error);
          this.scheduling = false;
        }
      });
    }
  }

  // Interview actions
  confirmInterview(interview: Interview): void {
    this.interviewService.updateInterview(interview.id!, { status: 'confirmed' }).subscribe({
      next: () => {
        this.loadInterviews();
      },
      error: (error) => {
        console.error('Error confirming interview:', error);
      }
    });
  }

  cancelInterview(interview: Interview): void {
    const reason = prompt('Raison de l\'annulation:');
    if (reason) {
      this.interviewService.cancelInterview(interview.id!, reason).subscribe({
        next: () => {
          this.loadInterviews();
          this.loadStatistics();
        },
        error: (error) => {
          console.error('Error cancelling interview:', error);
        }
      });
    }
  }

  showRescheduleModal(interview: Interview): void {
    const newDate = prompt('Nouvelle date et heure (YYYY-MM-DD HH:MM):');
    const reason = prompt('Raison de la reprogrammation:');
    
    if (newDate && reason) {
      this.interviewService.rescheduleInterview(interview.id!, {
        new_scheduled_date: newDate,
        reason
      }).subscribe({
        next: () => {
          this.loadInterviews();
        },
        error: (error) => {
          console.error('Error rescheduling interview:', error);
        }
      });
    }
  }

  showCompleteModal(interview: Interview): void {
    const score = prompt('Score de l\'entretien (0-100):');
    const feedback = prompt('Feedback pour le candidat:');
    const decision = confirm('Candidat retenu ?') ? 'pass' : 'fail';
    
    if (score && feedback) {
      this.interviewService.completeInterview(interview.id!, {
        score: parseInt(score),
        feedback,
        decision
      }).subscribe({
        next: () => {
          this.loadInterviews();
          this.loadStatistics();
        },
        error: (error) => {
          console.error('Error completing interview:', error);
        }
      });
    }
  }

  showEditModal(interview: Interview): void {
    // TODO: Implémenter modal d'édition complet
    console.log('Edit interview:', interview);
  }

  // Utility methods
  getStatusClass(status: string): string {
    const classes = {
      'scheduled': 'bg-blue-100 text-blue-800',
      'confirmed': 'bg-green-100 text-green-800',
      'in_progress': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-purple-100 text-purple-800',
      'cancelled': 'bg-red-100 text-red-800',
      'rescheduled': 'bg-orange-100 text-orange-800'
    };
    return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  }

  getStatusLabel(status: string): string {
    const labels = {
      'scheduled': 'Programmé',
      'confirmed': 'Confirmé',
      'in_progress': 'En cours',
      'completed': 'Terminé',
      'cancelled': 'Annulé',
      'rescheduled': 'Reprogrammé'
    };
    return labels[status as keyof typeof labels] || status;
  }

  getTypeLabel(type: string): string {
    const labels = {
      'phone': 'Téléphonique',
      'video': 'Vidéo',
      'in_person': 'En personne',
      'technical': 'Technique',
      'hr': 'RH',
      'final': 'Final'
    };
    return labels[type as keyof typeof labels] || type;
  }

  getScoreClass(score: number): string {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('fr-FR');
  }

  getMinDateTime(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  }
}