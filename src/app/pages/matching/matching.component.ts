import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { JobDescriptionService } from '../../services/job-description.service';
import { EmployeeService } from '../../services/employee.service';
import { MatchingService } from '../../services/matching.service';
import { JobDescription } from '../../models/job-description.model';
import { Employee } from '../../models/employee.model';
import { MatchingResult } from '../../models/matching.model';
import { AnalyticsService } from '../../services/analytics.service';
import { ApplicationSuccessPrediction } from '../../models/analytics.model';

@Component({
  selector: 'app-matching',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './matching.component.html',
  styleUrls: ['./matching.component.css']
})
export class MatchingComponent implements OnInit {
  jobDescriptions: JobDescription[] = [];
  employees: Employee[] = [];
  selectedJobId: number | null = null;
  selectedEmployeeId: number | null = null;
  matchingResults: MatchingResult[] = [];
  inverseMatchingResults: MatchingResult[] = [];

  loadingJobDescriptions: boolean = true;
  loadingEmployees: boolean = true;
  loadingMatching: boolean = false;
  loadingInverseMatching: boolean = false;
  loadingAutoAssignment: boolean = false;

  matchingErrorMessage: string | null = null;
  inverseMatchingErrorMessage: string | null = null;
  autoAssignmentMessage: string | null = null;

  // Prédictions de succès
  successPredictions: ApplicationSuccessPrediction[] = [];
  loadingPredictions: boolean = false;
  predictionsMessage: string | null = null;

  // Paramètres d'affectation automatique
  minScoreForAssignment: number = 70;
  maxAssignments: number = 5;

  // Getter pour les candidats éligibles
  get eligibleCandidates(): MatchingResult[] {
    return this.matchingResults.filter(result => result.score >= this.minScoreForAssignment);
  }

  constructor(
    private jobDescriptionService: JobDescriptionService,
    private employeeService: EmployeeService,
    private matchingService: MatchingService,
    private analyticsService: AnalyticsService
  ) { }

  ngOnInit(): void {
    this.loadJobDescriptions();
    this.loadEmployees();
  }

  loadJobDescriptions(): void {
    this.loadingJobDescriptions = true;
    this.jobDescriptionService.getJobDescriptions().subscribe({
      next: (data) => {
        this.jobDescriptions = data;
        this.loadingJobDescriptions = false;
      },
      error: (err) => {
        console.error('Error loading job descriptions:', err);
        this.matchingErrorMessage = 'Erreur lors du chargement des fiches de poste.';
        this.loadingJobDescriptions = false;
      }
    });
  }

  loadEmployees(): void {
    this.loadingEmployees = true;
    this.employeeService.getEmployees().subscribe({
      next: (data) => {
        this.employees = data;
        this.loadingEmployees = false;
      },
      error: (err) => {
        console.error('Error loading employees:', err);
        this.inverseMatchingErrorMessage = 'Erreur lors du chargement des employés.';
        this.loadingEmployees = false;
      }
    });
  }

  onJobSelect(): void {
    this.matchingResults = [];
    this.matchingErrorMessage = null;
    this.successPredictions = [];
  }

  onEmployeeSelect(): void {
    this.inverseMatchingResults = [];
    this.inverseMatchingErrorMessage = null;
  }

  performMatching(): void {
    if (!this.selectedJobId) {
      this.matchingErrorMessage = 'Veuillez sélectionner une fiche de poste.';
      return;
    }

    this.loadingMatching = true;
    this.matchingErrorMessage = null;
    this.matchingResults = [];
    this.successPredictions = [];

    this.matchingService.getJobEmployeeSkillMatch(this.selectedJobId).subscribe({
      next: (results) => {
        this.matchingResults = results.sort((a, b) => b.score - a.score);
        this.calculateSuccessPredictions();
        this.loadingMatching = false;
      },
      error: (err) => {
        console.error('Error performing matching:', err);
        this.matchingErrorMessage = 'Erreur lors du calcul du matching. Vérifiez que le backend et FastAPI sont en cours d\'exécution.';
        this.loadingMatching = false;
      }
    });
  }

  calculateSuccessPredictions(): void {
    if (!this.selectedJobId || this.matchingResults.length === 0) return;

    this.loadingPredictions = true;
    this.predictionsMessage = null;
    this.successPredictions = [];

    const predictions = this.matchingResults.slice(0, 5).map(result => ({
      employee_id: result.employee_id,
      job_description_id: this.selectedJobId!
    }));

    this.analyticsService.predictMultipleApplications(predictions).subscribe({
      next: (predictions) => {
        this.successPredictions = predictions;
        this.loadingPredictions = false;
      },
      error: (err) => {
        console.error('Error calculating predictions:', err);
        this.predictionsMessage = 'Erreur lors du calcul des prédictions.';
        this.loadingPredictions = false;
      }
    });
  }

  performInverseMatching(): void {
    if (!this.selectedEmployeeId) {
      this.inverseMatchingErrorMessage = 'Veuillez sélectionner un employé.';
      return;
    }

    this.loadingInverseMatching = true;
    this.inverseMatchingErrorMessage = null;
    this.inverseMatchingResults = [];

    const promises: Observable<MatchingResult[]>[] = [];
    this.jobDescriptions.forEach(job => {
      if (job.id) {
        promises.push(this.matchingService.getMatchingResults(job.id));
      }
    });

    Promise.all(promises.map(p => p.toPromise())).then(allResultsArrays => {
      const allResults: MatchingResult[] = [].concat(...allResultsArrays.filter(r => r !== undefined) as any);
      this.inverseMatchingResults = allResults.filter(result => result.employee_id === this.selectedEmployeeId)
                                              .sort((a, b) => b.score - a.score);
      this.loadingInverseMatching = false;
    }).catch(err => {
      console.error('Error performing inverse matching:', err);
      this.inverseMatchingErrorMessage = 'Erreur lors du calcul du matching inverse. Assurez-vous que le service FastAPI est en cours d\'exécution.';
      this.loadingInverseMatching = false;
    });
  }

  performAutoAssignment(): void {
    if (!this.selectedJobId) {
      this.autoAssignmentMessage = 'Veuillez sélectionner une fiche de poste.';
      return;
    }

    if (this.matchingResults.length === 0) {
      this.autoAssignmentMessage = 'Veuillez d\'abord effectuer un matching.';
      return;
    }

    const eligibleCandidates = this.matchingResults
      .filter(result => result.score >= this.minScoreForAssignment)
      .slice(0, this.maxAssignments);

    if (eligibleCandidates.length === 0) {
      this.autoAssignmentMessage = `Aucun candidat n'atteint le score minimum de ${this.minScoreForAssignment}%.`;
      return;
    }

    const confirmMessage = `Voulez-vous affecter automatiquement ${eligibleCandidates.length} employé(s) à cette fiche de poste ?\n\nCandidats sélectionnés :\n${eligibleCandidates.map(c => `• ${c.name} (${c.score.toFixed(1)}%)`).join('\n')}`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    this.loadingAutoAssignment = true;
    this.autoAssignmentMessage = null;

    const assignmentPromises = eligibleCandidates.map(candidate => {
      return this.employeeService.assignEmployeeToJobDescription(candidate.employee_id, this.selectedJobId!)
        .toPromise()
        .then(() => ({ success: true, candidate }))
        .catch(error => ({ success: false, candidate, error }));
    });

    Promise.all(assignmentPromises).then(results => {
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      let message = '';
      if (successful.length > 0) {
        message += `✅ ${successful.length} employé(s) affecté(s) avec succès :\n`;
        message += successful.map(r => `• ${r.candidate.name} (${r.candidate.score.toFixed(1)}%)`).join('\n');
      }

      if (failed.length > 0) {
        message += `\n\n❌ ${failed.length} affectation(s) échouée(s) :\n`;
        message += failed.map(r => {
          const failedResult = r as { success: false; candidate: MatchingResult; error: any };
          return `• ${failedResult.candidate.name} : ${failedResult.error?.error?.message || 'Erreur inconnue'}`;
        }).join('\n');
      }

      this.autoAssignmentMessage = message;
      this.loadingAutoAssignment = false;
      this.loadEmployees();
    }).catch(error => {
      console.error('Error during auto assignment:', error);
      this.autoAssignmentMessage = '❌ Erreur lors de l\'affectation automatique.';
      this.loadingAutoAssignment = false;
    });
  }

  // Méthodes utilitaires
  getEmployeeFromResult(result: MatchingResult): Employee {
    return this.employees.find(emp => emp.id === result.employee_id) || { 
      id: result.employee_id, 
      name: result.name, 
      position: result.position, 
      email: '', 
      hire_date: '' 
    };
  }

  getJobDescriptionFromResult(result: MatchingResult): JobDescription | undefined {
    return this.jobDescriptions.find(job => job.id === result.job_description_id);
  }

  getPredictionForEmployee(employeeId: number): ApplicationSuccessPrediction | undefined {
    return this.successPredictions.find((p: ApplicationSuccessPrediction) => p.employee_id === employeeId);
  }

  getEmployeeNameFromPrediction(prediction: ApplicationSuccessPrediction): string {
    const result = this.matchingResults.find(r => r.employee_id === prediction.employee_id);
    return result ? this.getEmployeeFromResult(result).name : 'Employé inconnu';
  }

  getPredictionClass(probability: number): string {
    if (probability >= 80) return 'text-green-600';
    if (probability >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  getConfidenceClass(level: string): string {
    switch (level) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getConfidenceLabel(level: string): string {
    switch (level) {
      case 'high': return 'Confiance élevée';
      case 'medium': return 'Confiance moyenne';
      case 'low': return 'Confiance faible';
      default: return 'Confiance inconnue';
    }
  }
}