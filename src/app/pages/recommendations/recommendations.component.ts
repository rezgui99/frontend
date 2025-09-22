import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecommendationService } from '../../services/recommendation.service';
import { EmployeeService } from '../../services/employee.service';
import { JobDescriptionService } from '../../services/job-description.service';
import { 
  TrainingRecommendation, 
  JobRecommendation,
  TrainingRecommendationResponse,
  JobRecommendationResponse
} from '../../models/recommendation.model';
import { Employee } from '../../models/employee.model';
import { JobDescription } from '../../models/job-description.model';

@Component({
  selector: 'app-recommendations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recommendations.component.html',
  styleUrls: ['./recommendations.component.css']
})
export class RecommendationsComponent implements OnInit {
  // Listes de sélection
  employees: Employee[] = [];
  jobDescriptions: JobDescription[] = [];
  departments: string[] = [];

  // Sélections
  selectedEmployeeId: number | null = null;
  selectedTargetJobId: number | null = null;
  selectedDepartment: string = '';

  // Résultats de recommandations
  trainingRecommendations: TrainingRecommendation[] = [];
  jobRecommendations: JobRecommendation[] = [];
  
  // États de chargement
  loadingEmployees = false;
  loadingJobs = false;
  loadingTraining = false;
  loadingJobRecs = false;
  apiHealthy = false;
  
  // Messages
  errorMessage: string | null = null;
  successMessage: string | null = null;

  // Paramètres
  maxTrainingRecommendations = 5;
  priorityThreshold = 0.6;
  maxJobRecommendations = 10;
  minCompatibilityScore = 0.5;

  // Onglet actif
  activeTab: 'training' | 'jobs' = 'training';

  constructor(
    private recommendationService: RecommendationService,
    private employeeService: EmployeeService,
    private jobDescriptionService: JobDescriptionService
  ) {}

  ngOnInit(): void {
    this.checkAPIHealth();
    this.loadEmployees();
    this.loadJobDescriptions();
  }

  checkAPIHealth(): void {
    this.recommendationService.checkAPIHealth().subscribe({
      next: (health) => {
        this.apiHealthy = health.status === 'healthy';
        if (!this.apiHealthy) {
          this.errorMessage = 'L\'API de recommandation n\'est pas disponible. Vérifiez que le service est en cours d\'exécution.';
        }
      },
      error: () => {
        this.apiHealthy = false;
        this.errorMessage = 'Impossible de se connecter à l\'API de recommandation.';
      }
    });
  }

  loadEmployees(): void {
    this.loadingEmployees = true;
    this.employeeService.getEmployees().subscribe({
      next: (employees) => {
        this.employees = employees;
        this.loadingEmployees = false;
      },
      error: (error) => {
        console.error('Error loading employees:', error);
        this.errorMessage = 'Erreur lors du chargement des employés.';
        this.loadingEmployees = false;
      }
    });
  }

  loadJobDescriptions(): void {
    this.loadingJobs = true;
    this.jobDescriptionService.getJobDescriptions().subscribe({
      next: (jobs) => {
        this.jobDescriptions = jobs;
        // Extraire les départements uniques
        this.departments = [...new Set(jobs.map(j => j.filiere_activite).filter(d => d))];
        this.loadingJobs = false;
      },
      error: (error) => {
        console.error('Error loading jobs:', error);
        this.errorMessage = 'Erreur lors du chargement des postes.';
        this.loadingJobs = false;
      }
    });
  }

  getTrainingRecommendations(): void {
    if (!this.selectedEmployeeId || !this.selectedTargetJobId) {
      this.errorMessage = 'Veuillez sélectionner un employé et un poste cible.';
      return;
    }

    this.loadingTraining = true;
    this.errorMessage = null;
    this.trainingRecommendations = [];

    this.recommendationService.getTrainingRecommendations(
      this.selectedEmployeeId,
      this.selectedTargetJobId,
      this.maxTrainingRecommendations,
      this.priorityThreshold
    ).subscribe({
      next: (response) => {
        this.trainingRecommendations = response.recommendations;
        this.successMessage = `${response.total} recommandation(s) de formation trouvée(s).`;
        this.loadingTraining = false;
      },
      error: (error) => {
        console.error('Error getting training recommendations:', error);
        this.errorMessage = error.error?.error || 'Erreur lors de la récupération des recommandations de formation.';
        this.loadingTraining = false;
      }
    });
  }

  getJobRecommendations(): void {
    if (!this.selectedEmployeeId) {
      this.errorMessage = 'Veuillez sélectionner un employé.';
      return;
    }

    this.loadingJobRecs = true;
    this.errorMessage = null;
    this.jobRecommendations = [];

    this.recommendationService.getJobRecommendations(
      this.selectedEmployeeId,
      this.selectedDepartment || undefined,
      this.maxJobRecommendations,
      this.minCompatibilityScore
    ).subscribe({
      next: (response) => {
        this.jobRecommendations = response.recommendations;
        this.successMessage = `${response.total} poste(s) recommandé(s) trouvé(s).`;
        this.loadingJobRecs = false;
      },
      error: (error) => {
        console.error('Error getting job recommendations:', error);
        this.errorMessage = error.error?.error || 'Erreur lors de la récupération des recommandations de poste.';
        this.loadingJobRecs = false;
      }
    });
  }

  // Méthodes utilitaires
  getSelectedEmployee(): Employee | undefined {
    return this.employees.find(e => e.id === this.selectedEmployeeId);
  }

  getSelectedTargetJob(): JobDescription | undefined {
    return this.jobDescriptions.find(j => j.id === this.selectedTargetJobId);
  }

  getPriorityColor(priority: string): string {
    return this.recommendationService.getPriorityColor(priority);
  }

  getCompatibilityColor(score: number): string {
    return this.recommendationService.getCompatibilityColor(score);
  }

  getSuccessProbabilityColor(probability: number): string {
    if (probability >= 0.8) return 'text-green-600';
    if (probability >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  }

  switchTab(tab: 'training' | 'jobs'): void {
    this.activeTab = tab;
    this.errorMessage = null;
    this.successMessage = null;
  }
}