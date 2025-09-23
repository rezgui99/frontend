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
        this.employees = employees || [];
        this.loadingEmployees = false;
      },
      error: (error) => {
        console.error('Error loading employees:', error);
        this.errorMessage = 'Erreur lors du chargement des employés.';
        this.employees = [];
        this.loadingEmployees = false;
      }
    });
  }

  loadJobDescriptions(): void {
    this.loadingJobs = true;
    this.jobDescriptionService.getJobDescriptions().subscribe({
      next: (jobs) => {
        this.jobDescriptions = jobs || [];
        // Extraire les départements uniques
        this.departments = [...new Set((jobs || []).map(j => j.filiere_activite).filter(d => d))];
        this.loadingJobs = false;
      },
      error: (error) => {
        console.error('Error loading jobs:', error);
        this.errorMessage = 'Erreur lors du chargement des postes.';
        this.jobDescriptions = [];
        this.departments = [];
        this.loadingJobs = false;
      }
    });
  }

// Méthodes corrigées pour recommendations.component.ts

getTrainingRecommendations(): void {
  if (!this.selectedEmployeeId || !this.selectedTargetJobId) {
    this.errorMessage = 'Veuillez sélectionner un employé et un poste cible.';
    return;
  }

  this.loadingTraining = true;
  this.errorMessage = null;
  this.successMessage = null;
  this.trainingRecommendations = [];

  console.log('🎓 Getting training recommendations for:', {
    employeeId: this.selectedEmployeeId,
    targetJobId: this.selectedTargetJobId,
    maxRecommendations: this.maxTrainingRecommendations,
    priorityThreshold: this.priorityThreshold
  });

  this.recommendationService.getTrainingRecommendations(
    this.selectedEmployeeId,
    this.selectedTargetJobId,
    this.maxTrainingRecommendations,
    this.priorityThreshold
  ).subscribe({
    next: (response) => {
      console.log('✅ Training recommendations response:', response);

      // 1) Toujours prendre un tableau
      const recs = Array.isArray(response?.recommendations) ? response.recommendations : [];

      // 2) Assigner au state
      this.trainingRecommendations = recs;

      // 3) Message avec détails de la méthode de calcul
      const total = (response as any)?.total || recs.length;
      const method = recs[0]?.calculation_method || 'unknown';
      const methodLabel = method === 'hybrid_ml_heuristic' ? 'ML + Heuristique' : 
                          method === 'heuristic_fallback' ? 'Heuristique (fallback)' : 
                          method === 'heuristic' ? 'Heuristique' : 'Méthode inconnue';
      
      this.successMessage = `${total} recommandation(s) de formation générée(s) via ${methodLabel}. ` +
                           `Calculs alignés sur les formules documentées (probabilité hybride, ROI dynamique, durée/écart cohérents).`;
      this.loadingTraining = false;
    },
    error: (error) => {
      console.error('❌ Error getting training recommendations:', error);
      this.errorMessage = `Erreur API ML: ${error?.error?.error || error?.message}. ` +
                          `Le système a basculé automatiquement sur le calcul heuristique de fallback.`;
      this.trainingRecommendations = [];
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
  this.successMessage = null;
  this.jobRecommendations = [];

  console.log('💼 Getting job recommendations for:', {
    employeeId: this.selectedEmployeeId,
    department: this.selectedDepartment,
    maxRecommendations: this.maxJobRecommendations,
    minCompatibilityScore: this.minCompatibilityScore
  });

  this.recommendationService.getJobRecommendations(
    this.selectedEmployeeId,
    this.selectedDepartment || undefined,
    this.maxJobRecommendations,
    this.minCompatibilityScore
  ).subscribe({
    next: (response) => {
      console.log('✅ Job recommendations response:', response);

      // 1) Toujours prendre un tableau
      const recs = Array.isArray(response?.recommendations) ? response.recommendations : [];

      // 2) Assigner au state
      this.jobRecommendations = recs;

      // 3) Message avec détails de la méthode et validation
      const total = (response as any)?.total || recs.length;
      const method = recs[0]?.calculation_method || 'unknown';
      const methodLabel = method === 'weighted_compatibility' ? 'Pondération documentée' : 
                          method === 'heuristic_fallback' ? 'Heuristique (fallback)' : 
                          method === 'heuristic' ? 'Heuristique' : 'Méthode inconnue';
      
      this.successMessage = `${total} poste(s) recommandé(s) via ${methodLabel}. ` +
                           `Scores calculés avec pondération: 70% compétences + 20% expérience + 10% certifications.`;
      this.loadingJobRecs = false;
    },
    error: (error) => {
      console.error('❌ Error getting job recommendations:', error);
      this.errorMessage = `Erreur API ML: ${error?.error?.error || error?.message}. ` +
                          `Le système a basculé automatiquement sur le calcul heuristique de fallback.`;
      this.jobRecommendations = [];
      this.loadingJobRecs = false;
    }
  });
}

  // Méthodes utilitaires
  getSelectedEmployee(): Employee | undefined {
    return this.employees?.find(e => e.id === this.selectedEmployeeId);
  }

  getSelectedTargetJob(): JobDescription | undefined {
    return this.jobDescriptions?.find(j => j.id === this.selectedTargetJobId);
  }

  getPriorityColor(priority: string): string {
    return this.recommendationService.getPriorityColor(priority);
  }

  getCompatibilityColor(score: number): string {
    return this.recommendationService.getCompatibilityColor(score);
  }

  getSuccessProbabilityColor(probability: number): string {
    // Seuils alignés sur la documentation
    if (probability >= 0.75) return 'text-green-600 font-bold';
    if (probability >= 0.55) return 'text-yellow-600 font-bold';
    if (probability >= 0.35) return 'text-orange-600 font-bold';
    return 'text-red-600 font-bold';
  }

  switchTab(tab: 'training' | 'jobs'): void {
    this.activeTab = tab;
    this.errorMessage = null;
    this.successMessage = null;
  }

  /**
   * Obtenir le label de priorité avec couleur
   */
  getPriorityLabel(priority: string): string {
    const labels = {
      'Critique': '🔴 Critique',
      'Élevée': '🟠 Élevée', 
      'Moyenne': '🟡 Moyenne',
      'Faible': '🟢 Faible'
    };
    return labels[priority as keyof typeof labels] || priority;
  }

  /**
   * Obtenir la classe CSS pour le niveau de préparation
   */
  getReadinessClass(readinessLevel: string): string {
    if (readinessLevel === 'Prêt') return 'text-green-600 bg-green-50';
    if (readinessLevel === 'Formation courte nécessaire') return 'text-yellow-600 bg-yellow-50';
    return 'text-orange-600 bg-orange-50';
  }

  /**
   * Formater le ROI avec précision
   */
  formatROI(roi: number): string {
    if (roi < 0) return `${roi.toFixed(2)}x (perte)`;
    if (roi < 1) return `${roi.toFixed(2)}x (faible)`;
    if (roi < 2) return `${roi.toFixed(2)}x (correct)`;
    return `${roi.toFixed(2)}x (excellent)`;
  }

  /**
   * Obtenir l'icône selon la méthode de calcul
   */
  getCalculationMethodIcon(method: string): string {
    const icons = {
      'hybrid_ml_heuristic': '🤖',
      'weighted_compatibility': '⚖️',
      'heuristic_fallback': '🔄',
      'heuristic': '📊'
    };
    return icons[method as keyof typeof icons] || '❓';
  }
}